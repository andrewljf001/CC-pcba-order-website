const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'cc_pcba.db');
const db = new Database(DB_PATH);

db.exec(`CREATE TABLE IF NOT EXISTS inquiries (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
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
  smt_points        INTEGER,
  dip_points        INTEGER,
  smt_sides         TEXT,
  components_supply TEXT,
  notes             TEXT,
  manual_quote      INTEGER DEFAULT 0,
  files             TEXT,
  status            TEXT DEFAULT 'pending',
  quote_amount      REAL,
  admin_notes       TEXT,
  supplier          TEXT,
  supplier_order_no TEXT,
  tracking_no       TEXT,
  created_at        TEXT,
  updated_at        TEXT
)`);

db.exec(`CREATE TABLE IF NOT EXISTS pricing_config (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  category   TEXT NOT NULL,
  key        TEXT NOT NULL,
  label      TEXT NOT NULL,
  value      TEXT NOT NULL,
  unit       TEXT,
  updated_at TEXT,
  UNIQUE(category, key)
)`);

db.exec(`CREATE TABLE IF NOT EXISTS site_config (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  key        TEXT UNIQUE NOT NULL,
  value      TEXT,
  label      TEXT,
  updated_at TEXT
)`);

const siteCount = db.prepare('SELECT COUNT(*) as cnt FROM site_config').get();
if (siteCount.cnt === 0) {
  const insertSite = db.prepare('INSERT OR IGNORE INTO site_config (key, value, label, updated_at) VALUES (?,?,?,datetime("now"))');
  const siteDefaults = [
    ['company_name',    'CC PCBA',                                                                     '公司名称'],
    ['whatsapp_number', process.env.WHATSAPP_NUMBER || '',                                             'WhatsApp号码'],
    ['contact_email',   process.env.CONTACT_EMAIL || '',                                               '联系邮箱'],
    ['hero_title',      'Your PCBA Partner in China',                                                  'Hero主标题'],
    ['hero_subtitle',   'From Prototype to Production — PCB Fab · SMT · DIP · Turnkey',               'Hero副标题'],
    ['seo_home_title',  'CC PCBA — PCB & SMT Assembly, Small Batch to Production',                    '首页Title'],
    ['seo_home_desc',   'One-stop PCBA service. PCB fabrication, SMT assembly, through-hole, turnkey.','首页Description'],
    ['seo_quote_title', 'Submit Inquiry — CC PCBA',                                                    '询价页Title'],
    ['seo_track_title', 'Track Order — CC PCBA',                                                       '追踪页Title'],
  ];
  siteDefaults.forEach(([key, value, label]) => insertSite.run(key, value, label));
  console.log('Default site_config seeded.');
}

const pricingCount = db.prepare('SELECT COUNT(*) as cnt FROM pricing_config').get();
if (pricingCount.cnt === 0) {
  const insertPricing = db.prepare('INSERT OR IGNORE INTO pricing_config (category, key, label, value, unit, updated_at) VALUES (?,?,?,?,?,datetime("now"))');
  const defaults = [
    ['pcb', 'base_1l',    '1 Layer base price',    '15',  'USD'],
    ['pcb', 'base_2l',    '2 Layer base price',    '25',  'USD'],
    ['pcb', 'base_4l',    '4 Layer base price',    '55',  'USD'],
    ['pcb', 'base_6l',    '6 Layer base price',    '90',  'USD'],
    ['pcb', 'finish_enig','ENIG surcharge',         '20',  'USD'],
    ['smt', 'single',     'Single side base',       '150', 'USD'],
    ['smt', 'double',     'Double side base',       '300', 'USD'],
    ['dip', 'free_limit', 'Free DIP points limit',  '100', 'pts'],
    ['ship','us_free',    'US shipping',            '0',   'USD'],
  ];
  defaults.forEach(r => insertPricing.run(r));
  console.log('Default pricing config seeded.');
}

module.exports = db;
