const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false } : false
});

async function init() {
  // ── users ──────────────────────────────────────────────
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email            TEXT UNIQUE NOT NULL,
    password_hash    TEXT,
    name             TEXT NOT NULL DEFAULT '',
    company          TEXT,
    whatsapp         TEXT,
    customer_type    TEXT NOT NULL DEFAULT 'normal',
    note             TEXT,
    google_id        TEXT UNIQUE,
    github_id        TEXT UNIQUE,
    email_verified   BOOLEAN NOT NULL DEFAULT FALSE,
    verify_token     TEXT,
    reset_token      TEXT,
    reset_expires    TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at    TIMESTAMPTZ
  )`);

  // ── addresses ──────────────────────────────────────────
  await pool.query(`CREATE TABLE IF NOT EXISTS addresses (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label        TEXT NOT NULL DEFAULT 'Home',
    recipient    TEXT NOT NULL,
    phone        TEXT,
    address_line TEXT NOT NULL,
    city         TEXT NOT NULL,
    country      TEXT NOT NULL DEFAULT 'US',
    is_default   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  // ── orders ─────────────────────────────────────────────
  await pool.query(`CREATE TABLE IF NOT EXISTS orders (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no       TEXT UNIQUE NOT NULL,
    user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    guest_email    TEXT,
    mode           TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'pending',
    params         JSONB NOT NULL DEFAULT '{}',
    estimate       NUMERIC(10,2),
    quoted_price   NUMERIC(10,2),
    shipping_fee   NUMERIC(10,2),
    total_paid     NUMERIC(10,2),
    payment_method TEXT,
    payment_ref    TEXT,
    tracking_no    TEXT,
    notes          TEXT,
    admin_note     TEXT,
    files          JSONB NOT NULL DEFAULT '[]',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  // ── settings ───────────────────────────────────────────
  await pool.query(`CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL DEFAULT '',
    description TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  // ── admin_users ────────────────────────────────────────
  await pool.query(`CREATE TABLE IF NOT EXISTS admin_users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL DEFAULT 'Admin',
    role          TEXT NOT NULL DEFAULT 'admin',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
  )`);

  // ── seed default settings ──────────────────────────────
  const defaults = [
    ['whatsapp_number',     '',                   'WhatsApp 联系号码（含国码，如 +85212345678）'],
    ['shipping_address',    'Ligao Industrial Park, Longgang, Shenzhen, China', '客供料收件地址'],
    ['contact_email',       '',                   '运营联系邮箱'],
    ['company_name',        'CC PCBA',            '公司名称'],
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
  ];
  for (const [key, value, description] of defaults) {
    await pool.query(
      `INSERT INTO settings (key, value, description, updated_at)
       VALUES ($1,$2,$3,NOW())
       ON CONFLICT (key) DO NOTHING`,
      [key, value, description]
    );
  }

  // ── seed default admin（首次部署用，建议上线后修改密码）──
  const bcrypt = require('bcryptjs');
  const { rows: admins } = await pool.query('SELECT COUNT(*) AS cnt FROM admin_users');
  if (parseInt(admins[0].cnt) === 0) {
    const hash = await bcrypt.hash(process.env.ADMIN_DEFAULT_PASSWORD || 'ccpcba2026', 12);
    await pool.query(
      `INSERT INTO admin_users (email, password_hash, name, role)
       VALUES ($1,$2,'Super Admin','superadmin')`,
      [process.env.ADMIN_EMAIL || 'admin@ccpcba.com', hash]
    );
    console.log('Default admin seeded. PLEASE CHANGE PASSWORD after first login.');
  }

  console.log('✅ Database ready.');
}

init().catch(err => {
  console.error('DB init error:', err.message);
  process.exit(1);
});

module.exports = pool;
