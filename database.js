/**
 * database.js — Cloudflare D1 HTTP API 封装
 * 替代原有的 pg (PostgreSQL) 连接池
 * D1 使用 SQLite 语法
 */

require('dotenv').config();

const ACCOUNT_ID  = process.env.CLOUDFLARE_ACCOUNT_ID;
const DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID;
const API_TOKEN   = process.env.CLOUDFLARE_API_TOKEN;
const D1_URL      = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

/**
 * 执行 D1 SQL 查询
 * 兼容 pg 的 pool.query(sql, params) 接口：
 *   返回 { rows: [...] }
 * D1 用 ? 占位符（SQLite 风格），pg 用 $1/$2
 * 本函数自动把 $1/$2 转成 ?
 */
async function query(sql, params = []) {
  const d1sql = sql.replace(/\$(\d+)/g, '?');

  const res = await fetch(D1_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ sql: d1sql, params }),
  });

  const data = await res.json();

  if (!data.success) {
    const errMsg = data.errors?.map(e => e.message).join(', ') || 'D1 query failed';
    throw new Error(errMsg);
  }

  const rows = data.result?.[0]?.results ?? [];
  return { rows };
}

/**
 * 初始化数据库表（SQLite 语法）
 */
async function init() {
  // ── users ──────────────────────────────────────────────
  await query(`CREATE TABLE IF NOT EXISTS users (
    id               TEXT PRIMARY KEY,
    email            TEXT UNIQUE NOT NULL,
    password_hash    TEXT,
    name             TEXT NOT NULL DEFAULT '',
    company          TEXT,
    whatsapp         TEXT,
    customer_type    TEXT NOT NULL DEFAULT 'normal',
    note             TEXT,
    google_id        TEXT UNIQUE,
    github_id        TEXT UNIQUE,
    email_verified   INTEGER NOT NULL DEFAULT 0,
    verify_token     TEXT,
    reset_token      TEXT,
    reset_expires    TEXT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at    TEXT
  )`);

  // ── addresses ──────────────────────────────────────────
  await query(`CREATE TABLE IF NOT EXISTS addresses (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label        TEXT NOT NULL DEFAULT 'Home',
    recipient    TEXT NOT NULL,
    phone        TEXT,
    address_line TEXT NOT NULL,
    city         TEXT NOT NULL,
    country      TEXT NOT NULL DEFAULT 'US',
    is_default   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  // ── orders ─────────────────────────────────────────────
  await query(`CREATE TABLE IF NOT EXISTS orders (
    id             TEXT PRIMARY KEY,
    order_no       TEXT UNIQUE NOT NULL,
    user_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
    guest_email    TEXT,
    mode           TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'pending',
    params         TEXT NOT NULL DEFAULT '{}',
    estimate       REAL,
    quoted_price   REAL,
    shipping_fee   REAL,
    total_paid     REAL,
    payment_method TEXT,
    payment_ref    TEXT,
    tracking_no    TEXT,
    notes          TEXT,
    admin_note     TEXT,
    files          TEXT NOT NULL DEFAULT '[]',
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  // ── settings ───────────────────────────────────────────
  await query(`CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL DEFAULT '',
    description TEXT,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  // ── admin_users ────────────────────────────────────────
  await query(`CREATE TABLE IF NOT EXISTS admin_users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL DEFAULT 'Admin',
    role          TEXT NOT NULL DEFAULT 'admin',
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT
  )`);

  // ── posts（博客文章）──────────────────────────────────
  await query(`CREATE TABLE IF NOT EXISTS posts (
    id           TEXT PRIMARY KEY,
    slug         TEXT UNIQUE NOT NULL,
    title        TEXT NOT NULL,
    excerpt      TEXT,
    content      TEXT NOT NULL DEFAULT '',
    cover_url    TEXT,
    tags         TEXT NOT NULL DEFAULT '[]',
    status       TEXT NOT NULL DEFAULT 'draft',
    author       TEXT NOT NULL DEFAULT 'PCBAForge Team',
    views        INTEGER NOT NULL DEFAULT 0,
    published_at TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  // ── seed default settings ──────────────────────────────
  const defaults = [
    ['whatsapp_number',     '',                   'WhatsApp 联系号码（含国码，如 +85212345678）'],
    ['shipping_address',    'Ligao Industrial Park, Longgang, Shenzhen, China', '客供料收件地址'],
    ['contact_email',       '',                   '运营联系邮箱'],
    ['company_name',        'PCBAForge',          '公司名称'],
    ['google_oauth_enabled','false',              'Google OAuth 登录开关（true/false）'],
    ['github_oauth_enabled','false',              'GitHub OAuth 登录开关（true/false）'],
    ['pcb_tier1_price',     '50',                 'PCB Tier1 最低价（$）'],
    ['pcb_tier2_price',     '75',                 'PCB Tier2 最低价（$）'],
    ['pcb_tier3_price',     '100',                'PCB Tier3 最低价（$）'],
    ['smt_single_price',    '200',                'SMT 单面全包价（$）'],
    ['smt_double_price',    '400',                'SMT 双面全包价（$）'],
    ['smt_max_parts',       '200',                'SMT 标准单最大元件数'],
    ['smt_max_ic',          '10',                 'SMT 标准单最大复杂IC数'],
    ['smt_max_dip',         '100',                'SMT 标准单最大插件脚数'],
    ['mail_driver',         'smtp',               '邮件驱动：smtp 或 resend'],
    ['mail_from',           '',                   '发件人邮箱地址'],
    ['mail_from_name',      'PCBAForge',          '发件人显示名称'],
    ['smtp_host',           '',                   'SMTP 服务器地址（如 smtp.gmail.com）'],
    ['smtp_port',           '587',                'SMTP 端口（587=TLS / 465=SSL）'],
    ['smtp_secure',         'false',              'SMTP 是否使用 SSL（465端口填true）'],
    ['smtp_user',           '',                   'SMTP 登录用户名（通常是邮箱地址）'],
    ['smtp_pass_enc',       '',                   'SMTP 密码（AES-256-GCM 加密存储）'],
    ['resend_api_key_enc',  '',                   'Resend API Key（AES-256-GCM 加密存储）'],
  ];

  for (const [key, value, description] of defaults) {
    await query(
      `INSERT OR IGNORE INTO settings (key, value, description, updated_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [key, value, description]
    );
  }

  // ── seed default admin ─────────────────────────────────
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');
  const { rows: admins } = await query('SELECT COUNT(*) AS cnt FROM admin_users');
  if (parseInt(admins[0]?.cnt ?? 0) === 0) {
    const hash = await bcrypt.hash(process.env.ADMIN_DEFAULT_PASSWORD || 'pcbaforge2026', 12);
    await query(
      `INSERT INTO admin_users (id, email, password_hash, name, role)
       VALUES (?, ?, ?, 'Super Admin', 'superadmin')`,
      [uuidv4(), process.env.ADMIN_EMAIL || 'admin@pcbaforge.com', hash]
    );
    console.log('✅ Default admin seeded. PLEASE CHANGE PASSWORD after first login.');
  }

  console.log('✅ D1 Database ready.');
}

init().catch(err => {
  console.error('DB init error:', err.message);
});

module.exports = { query };
