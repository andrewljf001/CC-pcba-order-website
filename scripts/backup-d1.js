#!/usr/bin/env node
/**
 * backup-d1.js
 * 将 Cloudflare D1 所有业务表数据备份为 JSON，压缩后上传到 R2
 *
 * 用法：
 *   node scripts/backup-d1.js
 *
 * 依赖环境变量（与主项目共用 .env）：
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_D1_DATABASE_ID
 *   CLOUDFLARE_API_TOKEN
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET           （默认 pcbaforge-files）
 */

require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const zlib = require('zlib');
const { promisify } = require('util');
const gzip = promisify(zlib.gzip);

// ── 配置 ──────────────────────────────────────────────
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_DB_ID      = process.env.CLOUDFLARE_D1_DATABASE_ID;
const CF_API_TOKEN  = process.env.CLOUDFLARE_API_TOKEN;
const R2_BUCKET     = process.env.R2_BUCKET || 'pcbaforge-files';

// 备份到 R2 的子目录
const BACKUP_PREFIX = 'backups/d1';

// 需要备份的表（不备份 settings，其中含加密凭证）
const TABLES = ['users', 'admin_users', 'orders', 'addresses', 'posts'];

// ── D1 查询 ───────────────────────────────────────────
const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DB_ID}/query`;

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

// ── R2 客户端 ─────────────────────────────────────────
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID     || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

async function uploadToR2(key, body, contentType) {
  await r2.send(new PutObjectCommand({
    Bucket:      R2_BUCKET,
    Key:         key,
    Body:        body,
    ContentType: contentType,
  }));
}

// ── 主流程 ────────────────────────────────────────────
async function main() {
  const startedAt = new Date();
  const timestamp = startedAt.toISOString().replace(/[:.]/g, '-').slice(0, 19); // e.g. 2026-05-29T14-30-00
  const dateDir   = startedAt.toISOString().slice(0, 10); // e.g. 2026-05-29

  console.log(`\n🗄  PCBAForge D1 Backup — ${startedAt.toISOString()}`);
  console.log(`   Bucket : ${R2_BUCKET}`);
  console.log(`   Prefix : ${BACKUP_PREFIX}/${dateDir}/\n`);

  const backup = {
    meta: {
      created_at:  startedAt.toISOString(),
      db_id:       CF_DB_ID,
      tables:      TABLES,
    },
    data: {},
  };

  // 逐表读取
  for (const table of TABLES) {
    try {
      console.log(`   ⏳ Reading table: ${table}`);
      const rows = await d1Query(`SELECT * FROM ${table}`);
      backup.data[table] = rows;
      console.log(`   ✅ ${table}: ${rows.length} rows`);
    } catch (err) {
      console.error(`   ❌ ${table}: ${err.message}`);
      backup.data[table] = { error: err.message };
    }
  }

  // 序列化 + gzip
  const json    = JSON.stringify(backup, null, 2);
  const gzipped = await gzip(Buffer.from(json, 'utf8'));
  const sizeKB  = (gzipped.length / 1024).toFixed(1);

  // 上传完整备份（带时间戳）
  const fullKey = `${BACKUP_PREFIX}/${dateDir}/backup-${timestamp}.json.gz`;
  console.log(`\n   📤 Uploading → ${fullKey}  (${sizeKB} KB)`);
  await uploadToR2(fullKey, gzipped, 'application/gzip');

  // 同时覆盖 latest.json.gz（方便快速恢复最新版本）
  const latestKey = `${BACKUP_PREFIX}/latest.json.gz`;
  console.log(`   📤 Updating  → ${latestKey}`);
  await uploadToR2(latestKey, gzipped, 'application/gzip');

  // 上传一份纯文本 manifest（记录最近一次备份信息，便于监控）
  const manifest = JSON.stringify({
    last_backup:  startedAt.toISOString(),
    file:         fullKey,
    size_bytes:   gzipped.length,
    rows_summary: Object.fromEntries(
      TABLES.map(t => [t, Array.isArray(backup.data[t]) ? backup.data[t].length : 'error'])
    ),
  }, null, 2);
  await uploadToR2(`${BACKUP_PREFIX}/manifest.json`, Buffer.from(manifest, 'utf8'), 'application/json');

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n✅ Backup complete in ${elapsed}s — ${sizeKB} KB uploaded to R2\n`);
}

main().catch(err => {
  console.error('❌ Backup failed:', err.message);
  process.exit(1);
});
