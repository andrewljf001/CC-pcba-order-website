require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pool = require('./database');

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
  filename: function (req, file, cb) { cb(null, file.originalname); }
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

app.post('/api/inquiry', upload.array('files', 5), async (req, res) => {
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

    await pool.query(
      `INSERT INTO inquiries
        (order_no,name,email,whatsapp,service_type,quantity,
         pcb_layers,pcb_size_x,pcb_size_y,pcb_thickness,pcb_material,pcb_surface,pcb_color,
         smt_points,dip_points,smt_sides,components_supply,notes,manual_quote,files,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'pending')`,
      [order_no, name, email, whatsapp, service_type, qty,
       pcb_layers, pcb_size_x, pcb_size_y, pcb_thickness, pcb_material, pcb_surface, pcb_color,
       smtPts, dipPts, smt_sides, components_supply, notes, manual, files]
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

app.get('/api/track/:order_no', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT order_no,name,service_type,quantity,status,quote_amount,notes,admin_notes,tracking_no,created_at,updated_at
       FROM inquiries WHERE order_no = $1`,
      [req.params.order_no]
    );
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/config', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM site_config');
    const cfg = {};
    rows.forEach(r => { cfg[r.key] = r.value; });
    res.json(cfg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 后台 API ---

app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT
      COUNT(*) as total,
      SUM(CASE WHEN created_at::date = CURRENT_DATE THEN 1 ELSE 0 END) as today,
      SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status='quoted' THEN 1 ELSE 0 END) as quoted,
      SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) as paid,
      SUM(CASE WHEN status='production' THEN 1 ELSE 0 END) as production,
      SUM(CASE WHEN status='shipped' THEN 1 ELSE 0 END) as shipped,
      SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN manual_quote=1 THEN 1 ELSE 0 END) as manual
    FROM inquiries`);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/inquiries', adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM inquiries';
    const params = [];
    if (status) { sql += ' WHERE status = $1'; params.push(status); }
    sql += ` ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(Number(limit), Number(offset));
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/inquiries/:id', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM inquiries WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/inquiries/:id', adminAuth, async (req, res) => {
  try {
    const { status, quote_amount, admin_notes, supplier, supplier_order_no, tracking_no } = req.body;
    await pool.query(
      `UPDATE inquiries SET
        status=COALESCE($1,status), quote_amount=COALESCE($2,quote_amount),
        admin_notes=COALESCE($3,admin_notes), supplier=COALESCE($4,supplier),
        supplier_order_no=COALESCE($5,supplier_order_no),
        tracking_no=COALESCE($6,tracking_no), updated_at=NOW()
       WHERE id=$7`,
      [status, quote_amount, admin_notes, supplier, supplier_order_no, tracking_no, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/pricing', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM pricing_config ORDER BY category, key');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/pricing/:id', adminAuth, async (req, res) => {
  try {
    await pool.query('UPDATE pricing_config SET value=$1, updated_at=NOW() WHERE id=$2', [req.body.value, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/config', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM site_config ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/config/:key', adminAuth, async (req, res) => {
  try {
    await pool.query('UPDATE site_config SET value=$1, updated_at=NOW() WHERE key=$2', [req.body.value, req.params.key]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`CC PCBA server running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});
