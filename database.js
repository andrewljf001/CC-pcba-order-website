require('dotenv').config();
const fetch = require('node-fetch');

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_DB_ID      = process.env.CLOUDFLARE_D1_DATABASE_ID;
const CF_API_TOKEN  = process.env.CLOUDFLARE_API_TOKEN;

const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DB_ID}/query`;

async function query(sql, params = []) {
  const d1sql = sql.replace(/\$(\d+)/g, '?');
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql: d1sql, params }),
  });
  const data = await res.json();
  if (!data.success) {
    const errMsg = data.errors?.[0]?.message || JSON.stringify(data.errors);
    throw new Error(errMsg);
  }
  const result = data.result?.[0];
  return {
    rows: result?.results || [],
    rowCount: result?.meta?.changes || 0,
  };
}

async function initDB() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT,
      company TEXT,
      whatsapp TEXT,
      note TEXT,
      customer_type TEXT DEFAULT 'normal',
      google_id TEXT,
      github_id TEXT,
      email_verified INTEGER DEFAULT 0,
      verify_token TEXT,
      reset_token TEXT,
      reset_token_expires TEXT,
      deletion_requested_at TEXT,
      deletion_reason TEXT,
      last_login_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'admin',
      last_login_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_no TEXT UNIQUE NOT NULL,
      user_id TEXT,
      guest_email TEXT,
      mode TEXT NOT NULL,
      params TEXT DEFAULT '{}',
      estimate REAL,
      quoted_price REAL,
      shipping_fee REAL,
      total_paid REAL DEFAULT 0,
      tracking_no TEXT,
      status TEXT DEFAULT 'pending',
      files TEXT DEFAULT '[]',
      notes TEXT,
      admin_note TEXT,
      payment_intent TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      description TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS addresses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      label TEXT DEFAULT 'Home',
      recipient TEXT,
      phone TEXT,
      address_line TEXT,
      city TEXT,
      country TEXT DEFAULT 'US',
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT DEFAULT '',
      content TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      status TEXT DEFAULT 'draft',
      author TEXT DEFAULT 'PCBAForge Team',
      views INTEGER DEFAULT 0,
      published_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
  ];

  const defaultSettings = [
    ['whatsapp_number',    '',      'WhatsApp contact number'],
    ['engineer_whatsapp',  '',      'Engineer direct WhatsApp (digits only, no + sign)'],
    ['shipping_address',  'Ligao Industrial Park, Longgang, Shenzhen, Guangdong, China', 'Factory shipping address'],
    ['contact_email',     '',      'Admin notification email'],
    ['company_name',      'PCBAForge', 'Company display name'],
    ['google_oauth_enabled', 'false', 'Enable Google OAuth login'],
    ['github_oauth_enabled', 'false', 'Enable GitHub OAuth login'],
    ['pcb_tier1_price',   '50',    'PCB std price: 1-10pcs no impedance'],
    ['pcb_tier2_price',   '75',    'PCB std price: 1-10pcs impedance OR 11-20pcs no impedance'],
    ['pcb_tier3_price',   '100',   'PCB std price: 11-20pcs impedance'],
    ['pcb_qty_split',     '10',    'PCB qty boundary: 1-N=low band, N+1-max=high band'],
    ['pcb_qty_max',       '20',    'PCB max qty for standard quote (over = manual)'],
    ['pcb_size_max',      '100',   'PCB max W or H in mm for standard (over = manual)'],
    ['pcb_layer_max',     '4',     'PCB max layers for standard (over = manual)'],
    ['smt_single_price',  '200',   'SMT assembly single side base price'],
    ['smt_double_price',  '400',   'SMT assembly double side base price'],
    ['smt_max_parts',     '200',   'Max unique component types for SMT'],
    ['smt_max_ic',        '10',    'Max complex ICs for SMT'],
    ['smt_max_dip',       '100',   'Max DIP pins for SMT'],
    ['mail_driver',       'smtp',  'Mail driver: smtp or resend'],
    ['mail_from',         '',      'Sender email address'],
    ['mail_from_name',    'PCBAForge', 'Sender display name'],
    ['smtp_host',         '',      'SMTP server hostname'],
    ['smtp_port',         '587',   'SMTP port'],
    ['smtp_secure',       'false', 'SMTP SSL (true/false)'],
    ['smtp_user',         '',      'SMTP username'],
    ['smtp_pass_enc',     '',      'SMTP password (AES-256-GCM encrypted)'],
    ['resend_api_key_enc','',      'Resend API key (encrypted)'],
    ['paypal_client_id',  '',      'PayPal Client ID'],
    ['paypal_client_secret_enc', '', 'PayPal Client Secret (encrypted)'],
    ['paypal_mode',       'live',  'PayPal mode: live or sandbox'],
  ];

  for (const sql of tables) {
    await query(sql);
  }

  for (const [key, value, description] of defaultSettings) {
    await query(
      `INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)`,
      [key, value, description]
    );
  }

  // Migrations — safe to run repeatedly
  try { await query(`ALTER TABLE users ADD COLUMN reset_token TEXT`); } catch(e) {}
  try { await query(`ALTER TABLE users ADD COLUMN reset_token_expires TEXT`); } catch(e) {}
  try { await query(`ALTER TABLE users ADD COLUMN deletion_requested_at TEXT`); } catch(e) {}
  try { await query(`ALTER TABLE users ADD COLUMN deletion_reason TEXT`); } catch(e) {}
  try { await query(`ALTER TABLE orders ADD COLUMN payment_intent TEXT`); } catch(e) {}

  const { rows } = await query('SELECT COUNT(*) as cnt FROM admin_users');
  if (!rows[0] || rows[0].cnt === 0) {
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    const hash = await bcrypt.hash('pcbaforge2026', 12);
    await query(
      `INSERT INTO admin_users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), 'admin@pcbaforge.com', hash, 'PCBAForge Admin', 'superadmin']
    );
    console.log('✅ Default admin created: admin@pcbaforge.com / pcbaforge2026');
  }

  console.log('✅ D1 Database ready.');
}

initDB().catch(console.error);

module.exports = { query };
