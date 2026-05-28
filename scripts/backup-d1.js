#!/usr/bin/env node
/**
 * 7.20 D1 数据定期备份到 R2
 * 
 * 功能：
 *   1. 读取 D1 所有表的全量数据（JSON 格式）
 *   2. 打包成一个 JSON 文件上传到 R2 bucket
 *   3. 保留最近 30 天，自动删除更旧的备份
 *   4. 备份结果写日志到 logs/backup.log
 *
 * 使用方式：
 *   手动：  node scripts/backup-d1.js
 *   自动：  PM2 定时任务（见 ecosystem.config.js）
 *
 * 需要 .env 变量：
 *   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT
 */

require('dotenv').config();
const fetch  = require('node-fetch');
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const fs   = require('fs');
const path = require('path');

// ── 环境变量 ──────────────────────────────────────────────────────────────────
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_DB_ID      = process.env.CLOUDFLARE_D1_DATABASE_ID;
const CF_API_TOKEN  = process.env.CLOUDFLARE_API_TOKEN;

const R2_ENDPOINT   = process.env.R2_ENDPOINT; // https://<account_id>.r2.cloudflarestorage.com
const R2_BUCKET     = process.env.R2_BUCKET_NAME || 'pcbaforge-files';
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;

const BACKUP_RETAIN_DAYS = parseInt(process.env.BACKUP_RETAIN_DAYS || '30', 10);
const LOG_FILE = path.join(__dirname, '../logs/backup.log');

// 需要备份的表
const TABLES = ['users', 'admin_users', 'orders', 'settings', 'addresses', 'posts'];

// ── 日志 ──────────────────────────────────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    const dir = path.dirname(LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (_) {}
}

// ── D1 查询 ───────────────────────────────────────────────────────────────────
async function d1Query(sql, params = []) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DB_ID}/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.errors?.[0]?.message || JSON.stringify(data.errors));
  return data.result?.[0]?.results || [];
}

// ── R2 客户端 ─────────────────────────────────────────────────────────────────
function getR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId:     R2_ACCESS_KEY,
      secretAccessKey: R2_SECRET_KEY,
    },
  });
}

// ── 主备份逻辑 ────────────────────────────────────────────────────────────────
async function runBackup() {
  log('=== 开始 D1 备份 ===');

  // 1. 校验环境变量
  const missing = [];
  if (!CF_ACCOUNT_ID)  missing.push('CLOUDFLARE_ACCOUNT_ID');
  if (!CF_DB_ID)       missing.push('CLOUDFLARE_D1_DATABASE_ID');
  if (!CF_API_TOKEN)   missing.push('CLOUDFLARE_API_TOKEN');
  if (!R2_ENDPOINT)    missing.push('R2_ENDPOINT');
  if (!R2_ACCESS_KEY)  missing.push('R2_ACCESS_KEY_ID');
  if (!R2_SECRET_KEY)  missing.push('R2_SECRET_ACCESS_KEY');
  if (missing.length) {
    log(`❌ 缺少环境变量：${missing.join(', ')}`);
    process.exit(1);
  }

  // 2. 从 D1 拉取各表数据
  const snapshot = {
    backup_time: new Date().toISOString(),
    tables: {},
  };

  for (const table of TABLES) {
    try {
      const rows = await d1Query(`SELECT * FROM ${table}`);
      snapshot.tables[table] = rows;
      log(`  ✅ ${table}: ${rows.length} 条`);
    } catch (err) {
      // 表不存在时跳过（兼容旧版本）
      log(`  ⚠️  ${table} 跳过: ${err.message}`);
      snapshot.tables[table] = [];
    }
  }

  // 3. 序列化
  const json    = JSON.stringify(snapshot, null, 2);
  const now     = new Date();
  const datePart = now.toISOString().slice(0, 10); // 2026-05-29
  const timePart = now.toISOString().slice(11, 19).replace(/:/g, '-'); // 12-00-00
  const key     = `backups/d1/${datePart}/backup_${datePart}_${timePart}.json`;

  // 4. 上传到 R2
  const r2 = getR2Client();
  await r2.send(new PutObjectCommand({
    Bucket:      R2_BUCKET,
    Key:         key,
    Body:        Buffer.from(json, 'utf-8'),
    ContentType: 'application/json',
  }));
  log(`✅ 已上传备份：${key} (${(Buffer.byteLength(json) / 1024).toFixed(1)} KB)`);

  // 5. 清理 BACKUP_RETAIN_DAYS 天之前的旧备份
  await cleanOldBackups(r2, now);

  log('=== 备份完成 ===\n');
}

async function cleanOldBackups(r2, now) {
  const cutoff = new Date(now.getTime() - BACKUP_RETAIN_DAYS * 24 * 60 * 60 * 1000);

  const listed = await r2.send(new ListObjectsV2Command({
    Bucket: R2_BUCKET,
    Prefix: 'backups/d1/',
  }));

  const toDelete = (listed.Contents || []).filter(obj => {
    return obj.LastModified && new Date(obj.LastModified) < cutoff;
  });

  if (!toDelete.length) {
    log(`🧹 无需清理（保留天数：${BACKUP_RETAIN_DAYS} 天）`);
    return;
  }

  await r2.send(new DeleteObjectsCommand({
    Bucket: R2_BUCKET,
    Delete: { Objects: toDelete.map(o => ({ Key: o.Key })) },
  }));
  log(`🧹 已清理 ${toDelete.length} 个旧备份`);
}

// ── 入口 ──────────────────────────────────────────────────────────────────────
runBackup().catch(err => {
  log(`❌ 备份失败：${err.message}`);
  process.exit(1);
});
