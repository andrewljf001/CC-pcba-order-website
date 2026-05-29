/**
 * PCBAForge — D1 → R2 Daily Backup (Phase 7.20)
 *
 * 做的事：
 *   1. 导出 D1 所有表的全部数据为一个 JSON 文件
 *   2. 上传到 R2 的 backups/ 目录，文件名带日期
 *   3. 删除 30 天前的旧备份
 *   4. 发邮件通知备份结果（成功/失败）
 *
 * 用法：
 *   node backup.js
 *
 * 通过 cron 每天凌晨自动运行（见 docs 部署说明）。
 * 复用 .env 里现有的 Cloudflare D1 / R2 / 邮件配置，无需新增环境变量。
 */
require('dotenv').config();
const fetch = require('node-fetch');
const crypto = require('crypto');
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require('@aws-sdk/client-s3');

// ── 配置 ────────────────────────────────────────────────
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_DB_ID      = process.env.CLOUDFLARE_D1_DATABASE_ID;
const CF_API_TOKEN  = process.env.CLOUDFLARE_API_TOKEN;
const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DB_ID}/query`;

const R2_BUCKET     = process.env.R2_BUCKET || 'pcbaforge-files';
const BACKUP_PREFIX = 'backups/';
const RETENTION_DAYS = 30;

// 需要备份的表（与 database.js 保持一致）
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

// ── 邮件通知（Zoho SMTP，复用现有配置）────────────────────
async function sendNotification(subject, html) {
  try {
    const rows = await d1Query(
      `SELECT key, value FROM settings WHERE key IN ('mail_from','mail_from_name','smtp_host','smtp_port','smtp_secure','smtp_user','smtp_pass_enc','contact_email')`
    );
    const cfg = {};
    rows.forEach(r => { cfg[r.key] = r.value; });

    const to = cfg.contact_email;
    if (!to) { console.log('[BACKUP] No contact_email set, skipping notification'); return; }

    // 解密 SMTP 密码（AES-256-GCM，与 server.js 同算法）
    const keyRaw = process.env.SETTINGS_ENCRYPT_KEY || '';
    const encKey = keyRaw ? crypto.createHash('sha256').update(keyRaw).digest() : null;
    function decrypt(ct) {
      if (!encKey || !ct) return ct || '';
      try {
        const [ivHex, tagHex, encHex] = ct.split(':');
        if (!ivHex || !tagHex || !encHex) return '';
        const decipher = crypto.createDecipheriv('aes-256-gcm', encKey, Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
        return decipher.update(Buffer.from(encHex, 'hex'), null, 'utf8') + decipher.final('utf8');
      } catch { return ''; }
    }

    const smtpPass = decrypt(cfg.smtp_pass_enc) || process.env.SMTP_PASS || '';
    const host     = cfg.smtp_host || process.env.SMTP_HOST || '';
    const user     = cfg.smtp_user || process.env.SMTP_USER || '';
    if (!host || !user || !smtpPass) { console.log('[BACKUP] SMTP not configured, skipping notification'); return; }

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(cfg.smtp_port || '587'),
      secure: cfg.smtp_secure === 'true',
      auth: { user, pass: smtpPass },
    });
    const fromAddr = cfg.mail_from || process.env.MAIL_FROM || 'noreply@pcbaforge.com';
    const fromName = cfg.mail_from_name || 'PCBAForge Backup';
    await transporter.sendMail({ from: `${fromName} <${fromAddr}>`, to, subject, html });
    console.log('[BACKUP] Notification sent to', to);
  } catch (err) {
    console.error('[BACKUP] Notification failed:', err.message);
  }
}

// ── 清理旧备份 ──────────────────────────────────────────
async function cleanOldBackups() {
  const list = await r2.send(new ListObjectsV2Command({
    Bucket: R2_BUCKET,
    Prefix: BACKUP_PREFIX,
  }));
  if (!list.Contents || list.Contents.length === 0) return 0;

  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const toDelete = list.Contents
    .filter(obj => new Date(obj.LastModified).getTime() < cutoff)
    .map(obj => ({ Key: obj.Key }));

  if (toDelete.length === 0) return 0;

  await r2.send(new DeleteObjectsCommand({
    Bucket: R2_BUCKET,
    Delete: { Objects: toDelete },
  }));
  console.log(`[BACKUP] Deleted ${toDelete.length} old backup(s)`);
  return toDelete.length;
}

// ── 主流程 ──────────────────────────────────────────────
async function runBackup() {
  const startedAt = new Date();
  const dateStr = startedAt.toISOString().slice(0, 10); // YYYY-MM-DD
  const timeStr = startedAt.toISOString().replace(/[:.]/g, '-');
  const fileName = `${BACKUP_PREFIX}backup-${timeStr}.json`;

  console.log(`[BACKUP] Starting backup at ${startedAt.toISOString()}`);

  try {
    // 1. 导出所有表
    const dump = {
      meta: {
        created_at: startedAt.toISOString(),
        database_id: CF_DB_ID,
        tables: TABLES,
        version: '1.0',
      },
      data: {},
    };

    const counts = {};
    for (const table of TABLES) {
      const rows = await d1Query(`SELECT * FROM ${table}`);
      dump.data[table] = rows;
      counts[table] = rows.length;
      console.log(`[BACKUP]   ${table}: ${rows.length} rows`);
    }

    // 2. 上传到 R2
    const json = JSON.stringify(dump, null, 2);
    const sizeKB = (Buffer.byteLength(json) / 1024).toFixed(1);
    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: fileName,
      Body: json,
      ContentType: 'application/json',
    }));
    console.log(`[BACKUP] Uploaded ${fileName} (${sizeKB} KB)`);

    // 3. 清理旧备份
    const deleted = await cleanOldBackups();

    // 4. 成功通知
    const rowsHtml = TABLES.map(t => `<tr><td style="padding:4px 12px">${t}</td><td style="padding:4px 12px;text-align:right"><b>${counts[t]}</b></td></tr>`).join('');
    await sendNotification(
      `[PCBAForge] ✅ Backup OK — ${dateStr}`,
      `<h2 style="color:#00C832">✅ Daily Backup Successful</h2>
       <p>Backup file: <code>${fileName}</code></p>
       <p>Size: <b>${sizeKB} KB</b></p>
       <table style="border-collapse:collapse;border:1px solid #ddd">
         <tr style="background:#f5f5f5"><th style="padding:4px 12px;text-align:left">Table</th><th style="padding:4px 12px">Rows</th></tr>
         ${rowsHtml}
       </table>
       <p style="color:#999;font-size:12px">Old backups removed: ${deleted} · Retention: ${RETENTION_DAYS} days</p>
       <p style="color:#999;font-size:12px">Completed at ${new Date().toISOString()}</p>`
    );

    console.log('[BACKUP] ✅ Done.');
    process.exit(0);

  } catch (err) {
    console.error('[BACKUP] ❌ FAILED:', err.message);
    await sendNotification(
      `[PCBAForge] ❌ Backup FAILED — ${dateStr}`,
      `<h2 style="color:#FF4444">❌ Daily Backup Failed</h2>
       <p>The automatic D1 backup did not complete.</p>
       <p><b>Error:</b> ${err.message}</p>
       <p style="color:#999;font-size:12px">Failed at ${new Date().toISOString()}. Please check the server logs.</p>`
    );
    process.exit(1);
  }
}

runBackup();
