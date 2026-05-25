require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/admin', express.static('admin'));
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join('uploads', Date.now() + '_' + Math.random().toString(36).substr(2,6));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowed = ['.zip','.rar','.gerber','.gbr','.drl','.xls','.xlsx','.csv','.txt','.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('File type not allowed: ' + ext));
  }
});

function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token === process.env.ADMIN_TOKEN) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// --- 客户 API ---

app.post('/api/inquiry', upload.array('files', 5), (req, res) => {
  try {
    const {
      name, email, whatsapp, service_type, quantity,
      pcb_layers, pcb_size_x, pcb_size_y, pcb_thickness,
      pcb_material, pcb_surface, pcb_color,
      smt_points, dip_points, smt_sides, components_supply, notes
    } = req.body;

    if (!name || !email || !service_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const qty = parseInt(quantity) || 0;
    const smtPts = parseInt(smt_points) || 0;
    const dipPts = parseInt(dip_points) || 0;
    const specialMaterials = ['Rogers','PTFE','Flex','Rigid-Flex','Other'];
    const manual = (
      qty > 20 ||
      pcb_layers === '8+' ||
      specialMaterials.includes(pcb_material) ||
      smtPts > 200 ||
      dipPts > 100 ||
      (notes && notes.trim().length > 0)
    ) ? 1 : 0;

    const files = req.files ? req.files.map(f => f.path).join(',') : '';
    const order_no = 'CC' + Date.now();

    db.prepare(`INSERT INTO inquiries
      (order_no,name,email,whatsapp,service_type,quantity,
       pcb_layers,pcb_size_x,pcb_size_y,pcb_thickness,pcb_material,pcb_surface,pcb_color,
       smt_points,dip_points,smt_sides,components_supply,notes,manual_quote,files,status,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',datetime('now'))`
    ).run(
      order_no, name, email, whatsapp, service_type, qty,
      pcb_layers, pcb_size_x, pcb_size_y, pcb_thickness, pcb_material, pcb_surface, pcb_color,
      smtPts, dipPts, smt_sides, components_supply, notes, manual, files
    );

    res.json({
      success: true,
      order_no,
      manual_quote: manual === 1,
      message: manual === 1
        ? 'Your order requires manual quotation. We will contact you via WhatsApp/Email within 24 hours.'
        : 'Inquiry received! We will send your quote within 24 hours.'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/track/:order_no', (req, res) => {
  try {
    const row = db.prepare(
      `SELECT order_no,name,service_type,quantity,status,quote_amount,notes,admin_notes,tracking_no,created_at,updated_at
       FROM inquiries WHERE order_no = ?`
    ).get(req.params.order_no);
    if (!row) return res.status(404).json({ error: 'Order not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/config', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM site_config').all();
    const cfg = {};
    rows.forEach(r => { cfg[r.key] = r.value; });
    res.json(cfg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 后台 API ---

app.get('/api/admin/stats', adminAuth, (req, res) => {
  try {
    const row = db.prepare(`SELECT
      COUNT(*) as total,
      SUM(CASE WHEN date(created_at)=date('now') THEN 1 ELSE 0 END) as today,
      SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status='quoted' THEN 1 ELSE 0 END) as quoted,
      SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) as paid,
      SUM(CASE WHEN status='production' THEN 1 ELSE 0 END) as production,
      SUM(CASE WHEN status='shipped' THEN 1 ELSE 0 END) as shipped,
      SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN manual_quote=1 THEN 1 ELSE 0 END) as manual
    FROM inquiries`).get();
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/inquiries', adminAuth, (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM inquiries';
    const params = [];
    if (status) { sql += ' WHERE status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/inquiries/:id', adminAuth, (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/inquiries/:id', adminAuth, (req, res) => {
  try {
    const { status, quote_amount, admin_notes, supplier, supplier_order_no, tracking_no } = req.body;
    db.prepare(`UPDATE inquiries SET
      status=COALESCE(?,status), quote_amount=COALESCE(?,quote_amount),
      admin_notes=COALESCE(?,admin_notes), supplier=COALESCE(?,supplier),
      supplier_order_no=COALESCE(?,supplier_order_no),
      tracking_no=COALESCE(?,tracking_no), updated_at=datetime('now')
      WHERE id=?`
    ).run(status, quote_amount, admin_notes, supplier, supplier_order_no, tracking_no, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/pricing', adminAuth, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM pricing_config ORDER BY category, key').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/pricing/:id', adminAuth, (req, res) => {
  try {
    db.prepare('UPDATE pricing_config SET value=?, updated_at=datetime("now") WHERE id=?')
      .run(req.body.value, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/config', adminAuth, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM site_config ORDER BY id').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/config/:key', adminAuth, (req, res) => {
  try {
    db.prepare('UPDATE site_config SET value=?, updated_at=datetime("now") WHERE key=?')
      .run(req.body.value, req.params.key);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`CC PCBA server running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});
