const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false }
    : false
});

async function init() {
  await pool.query(`CREATE TABLE IF NOT EXISTS inquiries (
    id                SERIAL PRIMARY KEY,
    order_no          TEXT UNIQUE NOT NULL,
    name              TEXT NOT NULL,
    email             TEXT NOT NULL,
    whatsapp          TEXT,
    service_type      TEXT NOT NULL,
    quantity          INTEGER,
    pcb_layers        TEXT,
    pcb_size_x        REAL,
    pcb_size_y        REAL,
    pcb_thickness     TEXT,
    pcb_material      TEXT,
    pcb_surface       TEXT,
    pcb_color         TEXT,
    smt_points        INTEGER DEFAULT 0,
    dip_points        INTEGER DEFAULT 0,
    smt_sides         TEXT,
    components_supply TEXT,
    testing_service   TEXT DEFAULT 'none',
    notes             TEXT,
    manual_quote      INTEGER DEFAULT 0,
    files             TEXT,
    status            TEXT DEFAULT 'pending',
    quote_amount      REAL,
    admin_notes       TEXT,
    supplier          TEXT,
    supplier_order_no TEXT,
    tracking_no       TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ
  )`);

  await pool.query(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS testing_service TEXT DEFAULT 'none'`).catch(()=>{});

  await pool.query(`CREATE TABLE IF NOT EXISTS pricing_config (
    id         SERIAL PRIMARY KEY,
    category   TEXT NOT NULL,
    key        TEXT NOT NULL,
    label      TEXT NOT NULL,
    value      TEXT NOT NULL,
    unit       TEXT,
    updated_at TIMESTAMPTZ,
    UNIQUE(category, key)
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS site_config (
    id         SERIAL PRIMARY KEY,
    key        TEXT UNIQUE NOT NULL,
    value      TEXT,
    label      TEXT,
    updated_at TIMESTAMPTZ
  )`);

  const { rows: sc } = await pool.query('SELECT COUNT(*) as cnt FROM site_config');
  if (parseInt(sc[0].cnt) === 0) {
    const siteDefaults = [
      ['company_name',    'CC PCBA',                                                                       '公司名称'],
      ['whatsapp_number', process.env.WHATSAPP_NUMBER || '',                                               'WhatsApp号码'],
      ['contact_email',   process.env.CONTACT_EMAIL || '',                                                 '联系邮箱'],
      ['hero_title',      'From Gerber to Working PCBA — Tested & Verified Before Shipping',              'Hero主标题'],
      ['hero_subtitle',   'PCB Fab · SMT · DIP · Functional Testing · Remote Debug Support',             'Hero副标题'],
      ['seo_home_title',  'CC PCBA — Tested & Verified PCBA Assembly, Free Shipping to USA',             '首页Title'],
      ['seo_home_desc',   'One-stop PCBA service with functional testing. PCB fab, SMT, DIP, turnkey.',  '首页Description'],
      ['seo_quote_title', 'Submit Inquiry — CC PCBA',                                                     '询价页Title'],
      ['seo_track_title', 'Track Order — CC PCBA',                                                        '追踪页Title'],
    ];
    for (const [key, value, label] of siteDefaults) {
      await pool.query(
        'INSERT INTO site_config (key, value, label, updated_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT (key) DO NOTHING',
        [key, value, label]
      );
    }
    console.log('Default site_config seeded.');
  }

  const { rows: pc } = await pool.query('SELECT COUNT(*) as cnt FROM pricing_config');
  if (parseInt(pc[0].cnt) === 0) {
    const defaults = [
      ['pcb',  'base_1l',    '1 Layer base price',     '15',  'USD'],
      ['pcb',  'base_2l',    '2 Layer base price',     '25',  'USD'],
      ['pcb',  'base_4l',    '4 Layer base price',     '55',  'USD'],
      ['pcb',  'base_6l',    '6 Layer base price',     '90',  'USD'],
      ['pcb',  'finish_enig','ENIG surcharge',          '20',  'USD'],
      ['smt',  'single',     'Single side base',        '200', 'USD'],
      ['smt',  'double',     'Double side base',        '400', 'USD'],
      ['smt',  'max_points', 'Max SMT points (base)',   '200', 'pts'],
      ['smt',  'max_ic',     'Max ICs (base)',          '10',  'pcs'],
      ['dip',  'free_limit', 'Free DIP points limit',   '100', 'pts'],
      ['ship', 'us_free',    'US shipping',             '0',   'USD'],
    ];
    for (const [category, key, label, value, unit] of defaults) {
      await pool.query(
        'INSERT INTO pricing_config (category, key, label, value, unit, updated_at) VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT (category, key) DO NOTHING',
        [category, key, label, value, unit]
      );
    }
    console.log('Default pricing config seeded.');
  }

  console.log('Database ready.');
}

init().catch(err => {
  console.error('DB init error:', err);
  process.exit(1);
});

module.exports = pool;
