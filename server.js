require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/admin', express.static('admin'));
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = `uploads/${Date.now()}_${Math.random().toString(36).substr(2,6)}`;
    fs.mkdirSync(dir, { recursive: true });
    req.uploadDir = dir;
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowed = ['.zip', '.rar', '.gerber', '.gbr', '.drl', '.xls', '.xlsx', '.csv', '.txt', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('File type not allowed: ' + ext));
  }
});

app.post('/api/inquiry', upload.array('files', 5), (req, res) => {
  const { name, email, whatsapp, service_type, quantity, notes, quote_estimate } = req.body;
  if (!name || !email || !service_type) return res.status(400).json({ error: 'Missing required fields' });
  const files = req.files ? req.files.map(f => f.path).join(',') : '';
  const order_no = 'CC' + Date.now();
  db.run(
    `INSERT INTO inquiries (order_no, name, email, whatsapp, service_type, quantity, notes, quote_estimate, files, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`,
    [order_no, name, email, whatsapp, service_type, quantity, notes, quote_estimate, files],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, order_no: order_no, message: 'Inquiry received. We will contact you within 24 hours.' });
    }
  );
});

app.get('/api/track/:order_no', (req, res) => {
  db.get(
    `SELECT order_no, name, service_type, quantity, status, quote_amount, notes, admin_notes, tracking_no, created_at, updated_at
     FROM inquiries WHERE order_no = ?`,
    [req.params.order_no],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Order not found' });
      res.json(row);
    }
  );
});

function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token === process.env.ADMIN_TOKEN) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

app.get('/api/admin/inquiries', adminAuth, (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let sql = 'SELECT * FROM inquiries';
  let params = [];
  if (status) { sql += ' WHERE status = ?'; params.push(status); }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/admin/inquiries/:id', adminAuth, (req, res) => {
  db.get('SELECT * FROM inquiries WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });
});

app.patch('/api/admin/inquiries/:id', adminAuth, (req, res) => {
  const { status, quote_amount, admin_notes, supplier, supplier_order_no, tracking_no } = req.body;
  db.run(
    `UPDATE inquiries SET
       status = COALESCE(?, status),
       quote_amount = COALESCE(?, quote_amount),
       admin_notes = COALESCE(?, admin_notes),
       supplier = COALESCE(?, supplier),
       supplier_order_no = COALESCE(?, supplier_order_no),
       tracking_no = COALESCE(?, tracking_no),
       updated_at = datetime('now')
     WHERE id = ?`,
    [status, quote_amount, admin_notes, supplier, supplier_order_no, tracking_no, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, changes: this.changes });
    }
  );
});

app.get('/api/admin/pricing', adminAuth, (req, res) => {
  db.all('SELECT * FROM pricing_config ORDER BY category, key', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.patch('/api/admin/pricing/:id', adminAuth, (req, res) => {
  const { value } = req.body;
  db.run(
    'UPDATE pricing_config SET value = ?, updated_at = datetime("now") WHERE id = ?',
    [value, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.get('/api/admin/stats', adminAuth, (req, res) => {
  db.get(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) as today,
       SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
       SUM(CASE WHEN status='quoted' THEN 1 ELSE 0 END) as quoted,
       SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) as paid,
       SUM(CASE WHEN status='production' THEN 1 ELSE 0 END) as production,
       SUM(CASE WHEN status='shipped' THEN 1 ELSE 0 END) as shipped,
       SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed
     FROM inquiries`,
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row);
    }
  );
});

app.get('/api/config', (req, res) => {
  db.all('SELECT key, value FROM site_config', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const cfg = {};
    rows.forEach(r => { cfg[r.key] = r.value; });
    res.json(cfg);
  });
});

app.get('/api/admin/config', adminAuth, (req, res) => {
  db.all('SELECT * FROM site_config ORDER BY id', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.patch('/api/admin/config/:key', adminAuth, (req, res) => {
  const { value } = req.body;
  db.run(
    'UPDATE site_config SET value = ?, updated_at = datetime("now") WHERE key = ?',
    [value, req.params.key],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.listen(PORT, () => {
  console.log(`CC PCBA server running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});
