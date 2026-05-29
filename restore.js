/**
 * PCBAForge — R2 → D1 Restore (Phase 7.20)
 *
 * 从 R2 备份恢复数据到 D1。这是危险操作，必须手动执行并二次确认。
 *
 * 用法：
 *   node restore.js --list
 *       列出 R2 中所有可用的备份文件
 *
 *   node restore.js --file backups/backup-XXXX.json --dry-run
 *       预览备份内容（只读，不写入数据库）
 *
 *   node restore.js --file backups/backup-XXXX.json --confirm
 *       真正执行恢复。恢复策略：INSERT OR REPLACE
 *         - 备份里的行会写回/覆盖数据库（按主键）
 *         - 当前库里多出来的行【保留不动】（不删除）
 *       恢复前会自动把当前数据库存一份「恢复前快照」到 R2，便于反悔。
 *
 * 复用 .env 里现有的 Cloudflare D1 / R2 配置。
 */
require('dotenv').config();
const fetch = require('node-fetch');
const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} = require('@aws-sdk/client-s3');

// ── 配置 ────────────────────────────────────────────────
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_DB_ID      = process.env.CLOUDFLARE_D1_DATABASE_ID;
const CF_API_TOKEN  = process.env.CLOUDFLARE_API_TOKEN;
const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DB_ID}/query`;

const R2_BUCKET     = process.env.R2_BUCKET || 'pcbaforge-files';
const BACKUP_PREFIX = 'backups/';

// 每张表的主键列（用于 INSERT OR REPLACE 冲突判断）
const TABLES = ['users', 'admin_users', 'orders', 'settings', 'addresses', 'posts'];

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID     || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

// ── D1 查询 ─────────────────────────────────────────────
async function d1Query(sql, params = []) {
  const res = await fetch(D1_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || JSON.stringify(data.errors));
  }
  return data.result?.[0]?.results || [];
}

// ── R2 工具 ─────────────────────────────────────────────
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function listBackups() {
  const list = await r2.send(new ListObjectsV2Command({
    Bucket: R2_BUCKET,
    Prefix: BACKUP_PREFIX,
  }));
  return (list.Contents || [])
    .filter(o => o.Key.endsWith('.json'))
    .sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified)); // 新→旧
}

async function downloadBackup(key) {
  const obj = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
  const text = await streamToString(obj.Body);
  return JSON.parse(text);
}

// ── 恢复前快照（保命）───────────────────────────────────
async function snapshotCurrent() {
  const dump = { meta: { created_at: new Date().toISOString(), reason: 'pre-restore-snapshot' }, data: {} };
  for (const table of TABLES) {
    dump.data[table] = await d1Query(`SELECT * FROM ${table}`);
  }
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const key = `${BACKUP_PREFIX}pre-restore-${ts}.json`;
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET, Key: key,
    Body: JSON.stringify(dump, null, 2),
    ContentType: 'application/json',
  }));
  return key;
}

// ── INSERT OR REPLACE 写回 ──────────────────────────────
async function restoreTable(table, rows) {
  if (!rows || rows.length === 0) return 0;
  let count = 0;
  for (const row of rows) {
    const cols = Object.keys(row);
    const placeholders = cols.map(() => '?').join(',');
    const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`;
    const params = cols.map(c => row[c]);
    await d1Query(sql, params);
    count++;
  }
  return count;
}

// ── 参数解析 ────────────────────────────────────────────
function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  const next = process.argv[idx + 1];
  return (next && !next.startsWith('--')) ? next : true;
}

// ── 主流程 ──────────────────────────────────────────────
async function main() {
  const doList    = getArg('--list');
  const file      = getArg('--file');
  const dryRun    = getArg('--dry-run');
  const confirm   = getArg('--confirm');

  // 模式 1：列出备份
  if (doList) {
    const backups = await listBackups();
    if (backups.length === 0) {
      console.log('No backups found in R2.');
      return;
    }
    console.log(`\nAvailable backups (newest first):\n`);
    backups.forEach(b => {
      const sizeKB = (b.Size / 1024).toFixed(1);
      console.log(`  ${b.Key}`);
      console.log(`      ${new Date(b.LastModified).toISOString()}  ·  ${sizeKB} KB`);
    });
    console.log(`\nTo restore:  node restore.js --file <key> --dry-run`);
    console.log(`Then:        node restore.js --file <key> --confirm\n`);
    return;
  }

  if (!file || file === true) {
    console.log('Error: --file <backup-key> required.');
    console.log('Run "node restore.js --list" to see available backups.');
    process.exit(1);
  }

  // 下载并解析备份
  console.log(`[RESTORE] Downloading ${file} ...`);
  const dump = await downloadBackup(file);
  console.log(`[RESTORE] Backup created at: ${dump.meta?.created_at || 'unknown'}`);
  console.log(`[RESTORE] Contents:`);
  for (const table of TABLES) {
    const n = (dump.data[table] || []).length;
    console.log(`            ${table}: ${n} rows`);
  }

  // 模式 2：dry-run 预览
  if (dryRun) {
    console.log(`\n[RESTORE] DRY RUN — nothing was written to the database.`);
    console.log(`[RESTORE] To actually restore, re-run with --confirm instead of --dry-run.\n`);
    return;
  }

  // 模式 3：真正恢复，需要 --confirm
  if (!confirm) {
    console.log(`\n⚠ This will OVERWRITE current data with the backup (INSERT OR REPLACE).`);
    console.log(`⚠ Rows that exist now but not in the backup will be KEPT (not deleted).`);
    console.log(`\nTo proceed, re-run with --confirm:`);
    console.log(`   node restore.js --file ${file} --confirm\n`);
    return;
  }

  // 先存恢复前快照
  console.log(`\n[RESTORE] Saving pre-restore snapshot of current DB...`);
  const snapKey = await snapshotCurrent();
  console.log(`[RESTORE] Snapshot saved: ${snapKey}`);
  console.log(`[RESTORE] (If this restore goes wrong, you can restore THAT snapshot to undo.)`);

  // 逐表写回
  console.log(`\n[RESTORE] Restoring data...`);
  for (const table of TABLES) {
    const n = await restoreTable(table, dump.data[table]);
    console.log(`            ${table}: ${n} rows restored`);
  }

  console.log(`\n[RESTORE] ✅ Restore complete.`);
  console.log(`[RESTORE] Pre-restore snapshot is at: ${snapKey}\n`);
}

main().catch(err => {
  console.error('[RESTORE] ❌ FAILED:', err.message);
  process.exit(1);
});
