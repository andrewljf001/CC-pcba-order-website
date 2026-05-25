const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'cc_pcba.db');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {

  db.run(`CREATE TABLE IF NOT EXISTS inquiries (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no         TEXT UNIQUE NOT NULL,
    name             TEXT NOT NULL,
    email            TEXT NOT NULL,
    whatsapp         TEXT,
    service_type     TEXT NOT NULL,
    quantity         INTEGER,
    notes            TEXT,
    quote_estimate   TEXT,
    files            TEXT,
    status           TEXT DEFAULT 'pending',
    quote_amount     REAL,
    admin_notes      TEXT,
    supplier         TEXT,
    supplier_order_no TEXT,
    tracking_no      TEXT,
    created_at       TEXT,
    updated_at       TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS pricing_config (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    category   TEXT NOT NULL,
    key        TEXT NOT NULL,
    label      TEXT NOT NULL,
    value      TEXT NOT NULL,
    unit       TEXT,
    updated_at TEXT,
    UNIQUE(category, key)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS site_config (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    key        TEXT UNIQUE NOT NULL,
    value      TEXT,
    label      TEXT,
    updated_at TEXT
  )`);

  db.get('SELECT COUNT(*) as cnt FROM site_config', (err, row) => {
    if (err || row.cnt > 0) return;
    const siteDefaults = [
      ['company_name',    'CC PCBA',                                                                      '公司名称'],
      ['whatsapp_number', process.env.WHATSAPP_NUMBER || '',                                              'WhatsApp号码'],
      ['contact_email',   process.env.CONTACT_EMAIL || '',                                               '联系邮箱'],
      ['hero_title',      'Your PCBA Partner in China',                                                  'Hero主标题'],
      ['hero_subtitle',   'From Prototype to Production — PCB Fab · SMT · DIP · Turnkey',               'Hero副标题'],
      ['seo_home_title',  'CC PCBA — PCB & SMT Assembly, Small Batch to Production',                    '首页Title'],
      ['seo_home_desc',   'One-stop PCBA service. PCB fabrication, SMT assembly, through-hole, turnkey. Small batch from 5 pcs. Worldwide shipping.', '首页Description'],
      ['seo_quote_title', 'Submit Inquiry — CC PCBA',                                                   '询价页Title'],
      ['seo_track_title', 'Track Order — CC PCBA',                                                      '追踪页Title'],
    ];
    const s = db.prepare('INSERT OR IGNORE INTO site_config (key, value, label, updated_at) VALUES (?,?,?,datetime("now"))');
    siteDefaults.forEach(([key, value, label]) => s.run(key, value, label));
    s.finalize();
    console.log('Default site_config seeded.');
  });

  db.get('SELECT COUNT(*) as cnt FROM pricing_config', (err, row) => {
    if (err || row.cnt > 0) return;

    const defaults = [
      ['pcb', 'base_2l',    '2 Layer base price',     '12',  'USD'],
      ['pcb', 'base_4l',    '4 Layer base price',     '28',  'USD'],
      ['pcb', 'base_6l',    '6 Layer base price',     '55',  'USD'],
      ['pcb', 'base_8l',    '8 Layer base price',     '90',  'USD'],
      ['pcb', 'finish_enig','ENIG surcharge',          '8',   'USD'],
      ['pcb', 'finish_hg',  'Hard Gold surcharge',    '25',  'USD'],
      ['pcb', 'lt_express', 'Express lead time fee',  '15',  'USD'],
      ['pcb', 'lt_standard','Standard lead time fee', '5',   'USD'],
      ['smt', 'base_10p',   '≤10 unique parts base',  '40',  'USD'],
      ['smt', 'base_20p',   '11-20 unique parts base','65',  'USD'],
      ['smt', 'base_30p',   '21-30 unique parts base','90',  'USD'],
      ['smt', 'base_50p',   '31-50 unique parts base','130', 'USD'],
      ['smt', 'xray',       'X-Ray inspection',       '30',  'USD'],
      ['dip', 'base_20pt',  '≤20 DIP points base',    '30',  'USD'],
      ['dip', 'base_50pt',  '21-50 DIP points base',  '50',  'USD'],
      ['dip', 'base_100pt', '51-100 DIP points base', '80',  'USD'],
      ['dip', 'wave',       'Wave soldering fee',     '15',  'USD'],
      ['ship', 'dhl',       'DHL Express',            '12',  'USD'],
      ['ship', 'fedex',     'FedEx International',    '14',  'USD'],
      ['ship', 'ems',       'EMS Post',               '8',   'USD'],
    ];

    const stmt = db.prepare(
      'INSERT OR IGNORE INTO pricing_config (category, key, label, value, unit, updated_at) VALUES (?,?,?,?,?,datetime("now"))'
    );
    defaults.forEach(r => stmt.run(r));
    stmt.finalize();
    console.log('Default pricing config seeded.');
  });

});

module.exports = db;
