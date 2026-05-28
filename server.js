require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// ── AES-256-GCM 加解密 ───────────────────────────────────
const ENC_KEY_RAW = process.env.SETTINGS_ENCRYPT_KEY || '';
const ENC_KEY = ENC_KEY_RAW
  ? crypto.createHash('sha256').update(ENC_KEY_RAW).digest()
  : null;

function encrypt(text) {
  if (!ENC_KEY || !text) return text || '';
  const iv  = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + enc.toString('hex');
}

function decrypt(ciphertext) {
  if (!ENC_KEY || !ciphertext) return ciphertext || '';
  try {
    const [ivHex, tagHex, encHex] = ciphertext.split(':');
    if (!ivHex || !tagHex || !encHex) return '';
    const iv      = Buffer.from(ivHex,  'hex');
    const tag     = Buffer.from(tagHex, 'hex');
    const enc     = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc, null, 'utf8') + decipher.final('utf8');
  } catch { return ''; }
}

const pool = require('./database');

const app  = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET       = process.env.JWT_SECRET;
const JWT_ADMIN_SECRET = process.env.JWT_ADMIN_SECRET;
if (!JWT_SECRET || !JWT_ADMIN_SECRET) {
  console.error('❌ JWT_SECRET and JWT_ADMIN_SECRET environment variables must be set');
  process.exit(1);
}

// ── Turnstile 人机验证 ────────────────────────────────────
async function verifyTurnstile(token) {
  if (!token) return false;
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return true;
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token })
  });
  const data = await res.json();
  return data.success === true;
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/admin', express.static('admin'));

// ── Cloudflare R2 客户端 ─────────────────────────────────
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID     || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

async function uploadToR2(buffer, filename, mimetype) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `uploads/${Date.now()}_${safeName}`;
  await r2Client.send(new PutObjectCommand({
    Bucket:      process.env.R2_BUCKET || 'pcbaforge-files',
    Key:         key,
    Body:        buffer,
    ContentType: mimetype || 'application/octet-stream',
  }));
  return { key, url: `${process.env.R2_PUBLIC_URL || 'https://static.pcbaforge.com'}/${key}` };
}

// ── 文件上传（内存缓存，上传到 R2）──────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = ['.zip','.rar','.gerber','.gbr','.drl','.xls','.xlsx','.csv','.txt','.pdf'];
    allowed.includes(path.extname(file.originalname).toLowerCase())
      ? cb(null, true) : cb(new Error('File type not allowed'));
  }
});

// ── 邮件工具 ─────────────────────────────────────────────
async function getMailConfig() {
  const { rows } = await pool.query(
    `SELECT key, value FROM settings WHERE key IN ('mail_driver','mail_from','mail_from_name','smtp_host','smtp_port','smtp_secure','smtp_user','smtp_pass_enc','resend_api_key_enc')`
  );
  const cfg = {};
  rows.forEach(r => { cfg[r.key] = r.value; });
  return cfg;
}

async function sendMail({ to, subject, html }) {
  try {
    const cfg = await getMailConfig();
    const driver   = cfg.mail_driver || 'smtp';
    const fromAddr = cfg.mail_from      || process.env.MAIL_FROM || 'noreply@pcbaforge.com';
    const fromName = cfg.mail_from_name || 'PCBAForge';
    const from     = `${fromName} <${fromAddr}>`;

    if (driver === 'resend') {
      const apiKey = decrypt(cfg.resend_api_key_enc) || process.env.RESEND_API_KEY || '';
      if (!apiKey) { console.warn('[MAIL] resend_api_key not set'); return; }
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject, html })
      });
      if (!res.ok) console.error('[MAIL RESEND ERROR]', await res.text());
      else console.log('[MAIL] Resend sent to', to);
    } else {
      const nodemailer = require('nodemailer');
      const smtpPass   = decrypt(cfg.smtp_pass_enc) || process.env.SMTP_PASS || '';
      const smtpUser   = cfg.smtp_user || process.env.SMTP_USER || '';
      const host       = cfg.smtp_host || process.env.SMTP_HOST || '';
      const port       = parseInt(cfg.smtp_port || '587');
      const secure     = cfg.smtp_secure === 'true';
      if (!host || !smtpUser || !smtpPass) {
        console.warn('[MAIL] SMTP not configured. Skipping email to', to);
        return;
      }
      const transporter = nodemailer.createTransport({ host, port, secure, auth: { user: smtpUser, pass: smtpPass } });
      await transporter.sendMail({ from, to, subject, html });
      console.log('[MAIL] SMTP sent to', to);
    }
  } catch (err) {
    console.error('[MAIL ERROR]', err.message);
  }
}

function genOrderNo() {
  const now  = new Date();
  const ymd  = now.getFullYear().toString().slice(-2) +
               String(now.getMonth()+1).padStart(2,'0') +
               String(now.getDate()).padStart(2,'0');
  const rand = Math.random().toString(36).substr(2,5).toUpperCase();
  return 'CC' + ymd + rand;
}

function userAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Token expired or invalid' }); }
}

function adminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Admin not authenticated' });
  try {
    req.admin = jwt.verify(token, JWT_ADMIN_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Admin token expired or invalid' }); }
}

// ═══════════════════════════════════════════════════════
// PUBLIC APIS
// ═══════════════════════════════════════════════════════

app.get('/api/settings/public', async (req, res) => {
  try {
    const PUBLIC_KEYS = ['whatsapp_number','shipping_address','company_name',
                         'smt_single_price','smt_double_price','pcb_tier1_price',
                         'pcb_tier2_price','pcb_tier3_price','smt_max_parts',
                         'smt_max_ic','smt_max_dip','google_oauth_enabled','github_oauth_enabled'];
    const placeholders = PUBLIC_KEYS.map((_,i) => `$${i+1}`).join(',');
    const { rows } = await pool.query(
      `SELECT key, value FROM settings WHERE key IN (${placeholders})`, PUBLIC_KEYS
    );
    const cfg = {};
    rows.forEach(r => { cfg[r.key] = r.value; });
    res.json(cfg);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 提交询价（文件上传到 R2）
app.post('/api/inquiry', upload.array('files', 5), async (req, res) => {
  try {
    const { mode, name, email, whatsapp, company, notes, estimate } = req.body;
    if (!name || !email || !mode) return res.status(400).json({ error: 'name, email, mode required' });

    const params = {};
    if (mode === 'pcb') {
      Object.assign(params, {
        material: req.body.pcb_material, qty: req.body.pcb_qty,
        w: req.body.pcb_w, h: req.body.pcb_h, thick: req.body.pcb_thick,
        drill: req.body.pcb_drill, impedance: req.body.pcb_impedance,
        copper: req.body.pcb_copper, finish: req.body.pcb_finish, color: req.body.pcb_color
      });
    } else if (mode === 'smt') {
      Object.assign(params, {
        qty: req.body.smt_qty, sides: req.body.smt_sides, parts: req.body.smt_parts,
        ic: req.body.smt_ic, dip: req.body.smt_dip, supply: req.body.smt_supply
      });
    }

    const files = [];
    if (req.files && req.files.length > 0) {
      for (const f of req.files) {
        try {
          const { key, url } = await uploadToR2(f.buffer, f.originalname, f.mimetype);
          files.push({ name: f.originalname, key, url, size: f.size });
        } catch (e) {
          console.error('[R2 UPLOAD ERROR]', e.message);
          files.push({ name: f.originalname, error: e.message, size: f.size });
        }
      }
    }

    const order_no = genOrderNo();
    const { rows: users } = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    const user_id = users.length ? users[0].id : null;

    await pool.query(
      `INSERT INTO orders (id, order_no, user_id, guest_email, mode, params, estimate, notes, files)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [uuidv4(), order_no, user_id, user_id ? null : email, mode,
       JSON.stringify(params), estimate ? parseFloat(estimate) : null, notes, JSON.stringify(files)]
    );

    const { rows: cfg } = await pool.query(`SELECT value FROM settings WHERE key='contact_email'`);
    const adminEmail = cfg[0]?.value;
    if (adminEmail) {
      await sendMail({
        to: adminEmail,
        subject: `[PCBAForge] New Inquiry ${order_no} — ${mode.toUpperCase()}`,
        html: `<h2>New Inquiry Received</h2>
          <p><b>Order:</b> ${order_no}</p>
          <p><b>Customer:</b> ${name} &lt;${email}&gt;</p>
          <p><b>Mode:</b> ${mode}</p>
          <p><b>Files:</b> ${files.length} file(s) uploaded to R2</p>
          <p><b>Notes:</b> ${notes || '—'}</p>
          <p><a href="${process.env.SITE_URL || ''}/admin">Open Admin Panel</a></p>`
      });
    }

    res.json({ success: true, order_no });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/order/lookup', async (req, res) => {
  try {
    const { order_no, email } = req.body;
    if (!order_no || !email) return res.status(400).json({ error: 'order_no and email required' });
    const { rows } = await pool.query(
      `SELECT o.order_no, o.mode, o.status, o.params, o.estimate, o.quoted_price,
              o.shipping_fee, o.total_paid, o.tracking_no, o.notes, o.admin_note,
              o.created_at, o.updated_at, u.name as customer_name
       FROM orders o LEFT JOIN users u ON o.user_id = u.id
       WHERE o.order_no=$1 AND (o.guest_email=$2 OR u.email=$2)`,
      [order_no.toUpperCase(), email.toLowerCase()]
    );
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════
// AUTH APIS
// ═══════════════════════════════════════════════════════

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, cf_turnstile } = req.body;
    if (!await verifyTurnstile(cf_turnstile)) return res.status(400).json({ error: 'Human verification failed. Please try again.' });
    if (!email || !password || !name) return res.status(400).json({ error: 'email, password, name required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password min 8 characters' });

    const { rows: exists } = await pool.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (exists.length) return res.status(409).json({ error: 'Email already registered' });

    const hash         = await bcrypt.hash(password, 12);
    const verify_token = uuidv4();
    await pool.query(
      `INSERT INTO users (id, email, password_hash, name, verify_token) VALUES ($1,$2,$3,$4,$5)`,
      [uuidv4(), email.toLowerCase(), hash, name, verify_token]
    );

    const verifyUrl = `${process.env.SITE_URL || 'https://pcbaforge.com'}/api/auth/verify?token=${verify_token}`;
    await sendMail({
      to: email,
      subject: 'Verify your PCBAForge account',
      html: `<h2>Welcome to PCBAForge</h2>
        <p>Hi ${name}, please verify your email:</p>
        <p><a href="${verifyUrl}" style="background:#00FF41;color:#000;padding:10px 20px;text-decoration:none;font-weight:bold">VERIFY EMAIL</a></p>
        <p>Link expires in 24 hours.</p>`
    });

    res.json({ success: true, message: 'Registration successful. Please check your email to verify.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/auth/verify', async (req, res) => {
  try {
    const { token } = req.query;
    const { rows } = await pool.query(
      `UPDATE users SET email_verified=1, verify_token=NULL WHERE verify_token=$1 RETURNING id`,
      [token]
    );
    if (!rows.length) return res.status(400).send('Invalid or expired verification link.');
    res.redirect('/account.html?verified=1');
  } catch (err) { res.status(500).send('Server error'); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, cf_turnstile } = req.body;
    if (!await verifyTurnstile(cf_turnstile)) return res.status(400).json({ error: 'Human verification failed. Please try again.' });
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email?.toLowerCase()]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid email or password' });

    const user = rows[0];
    if (!user.password_hash) return res.status(401).json({ error: 'This account uses social login. Please sign in with Google or GitHub.' });
    if (!user.email_verified) return res.status(403).json({ error: 'Please verify your email first.' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    await pool.query("UPDATE users SET last_login_at=datetime('now') WHERE id=$1", [user.id]);
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, customer_type: user.customer_type } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 忘记密码：发送重置邮件 ────────────────────────────────
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const { rows } = await pool.query('SELECT id, name FROM users WHERE email=$1', [email.toLowerCase()]);
    // 无论是否找到用户都返回成功，防止枚举攻击
    if (rows.length) {
      const reset_token = uuidv4();
      const expires = new Date(Date.now() + 3600000).toISOString(); // 1小时后过期
      await pool.query(
        `UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE id=$3`,
        [reset_token, expires, rows[0].id]
      );
      const resetUrl = `${process.env.SITE_URL || 'https://pcbaforge.com'}/account.html?reset_token=${reset_token}`;
      await sendMail({
        to: email,
        subject: '[PCBAForge] Password Reset Request',
        html: `<h2>Password Reset</h2>
          <p>Hi ${rows[0].name},</p>
          <p>We received a request to reset your password. Click the button below to set a new password:</p>
          <p><a href="${resetUrl}" style="background:#00FF41;color:#000;padding:12px 24px;text-decoration:none;font-weight:bold;font-family:monospace">RESET PASSWORD →</a></p>
          <p>This link expires in <strong>1 hour</strong>.</p>
          <p>If you did not request a password reset, please ignore this email.</p>`
      });
    }
    res.json({ success: true, message: 'If this email is registered, a reset link has been sent.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 重置密码：用 token 设置新密码 ────────────────────────────
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password min 8 characters' });

    const { rows } = await pool.query(
      `SELECT id FROM users WHERE reset_token=$1 AND reset_token_expires > datetime('now')`,
      [token]
    );
    if (!rows.length) return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });

    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      `UPDATE users SET password_hash=$1, reset_token=NULL, reset_token_expires=NULL, email_verified=1 WHERE id=$2`,
      [hash, rows[0].id]
    );
    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { rows: cfg } = await pool.query(`SELECT value FROM settings WHERE key='google_oauth_enabled'`);
    if (cfg[0]?.value !== 'true') return res.status(403).json({ error: 'Google login is disabled' });

    const { access_token } = req.body;
    const gRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer ' + access_token }
    });
    if (!gRes.ok) return res.status(401).json({ error: 'Invalid Google token' });
    const gUser = await gRes.json();

    let { rows } = await pool.query('SELECT * FROM users WHERE google_id=$1 OR email=$2', [gUser.id, gUser.email]);
    let user = rows[0];
    if (!user) {
      const { rows: newRows } = await pool.query(
        `INSERT INTO users (id, email, name, google_id, email_verified) VALUES ($1,$2,$3,$4,1) RETURNING *`,
        [uuidv4(), gUser.email, gUser.name, gUser.id]
      );
      user = newRows[0];
    } else if (!user.google_id) {
      await pool.query('UPDATE users SET google_id=$1 WHERE id=$2', [gUser.id, user.id]);
    }

    await pool.query("UPDATE users SET last_login_at=datetime('now') WHERE id=$1", [user.id]);
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, customer_type: user.customer_type } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/github', async (req, res) => {
  try {
    const { rows: cfg } = await pool.query(`SELECT value FROM settings WHERE key='github_oauth_enabled'`);
    if (cfg[0]?.value !== 'true') return res.status(403).json({ error: 'GitHub login is disabled' });

    const { code } = req.body;
    const tRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code })
    });
    const tData = await tRes.json();
    if (!tData.access_token) return res.status(401).json({ error: 'GitHub auth failed' });

    const uRes   = await fetch('https://api.github.com/user', { headers: { Authorization: 'Bearer ' + tData.access_token } });
    const ghUser = await uRes.json();
    const eRes   = await fetch('https://api.github.com/user/emails', { headers: { Authorization: 'Bearer ' + tData.access_token } });
    const emails = await eRes.json();
    const primaryEmail = emails.find(e => e.primary)?.email || ghUser.email;

    let { rows } = await pool.query('SELECT * FROM users WHERE github_id=$1 OR email=$2', [String(ghUser.id), primaryEmail]);
    let user = rows[0];
    if (!user) {
      const { rows: newRows } = await pool.query(
        `INSERT INTO users (id, email, name, github_id, email_verified) VALUES ($1,$2,$3,$4,1) RETURNING *`,
        [uuidv4(), primaryEmail, ghUser.name || ghUser.login, String(ghUser.id)]
      );
      user = newRows[0];
    } else if (!user.github_id) {
      await pool.query('UPDATE users SET github_id=$1 WHERE id=$2', [String(ghUser.id), user.id]);
    }

    await pool.query("UPDATE users SET last_login_at=datetime('now') WHERE id=$1", [user.id]);
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, customer_type: user.customer_type } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════
// CUSTOMER APIs
// ═══════════════════════════════════════════════════════

app.get('/api/me', userAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, name, company, whatsapp, customer_type,
              google_id IS NOT NULL as google_linked,
              github_id IS NOT NULL as github_linked,
              email_verified, created_at, last_login_at
       FROM users WHERE id=$1`, [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/me', userAuth, async (req, res) => {
  try {
    const { name, company, whatsapp } = req.body;
    await pool.query(
      `UPDATE users SET name=COALESCE($1,name), company=COALESCE($2,company),
       whatsapp=COALESCE($3,whatsapp) WHERE id=$4`,
      [name, company, whatsapp, req.user.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/me/password', userAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!new_password || new_password.length < 8) return res.status(400).json({ error: 'Password min 8 characters' });
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
    if (rows[0].password_hash) {
      const ok = await bcrypt.compare(current_password, rows[0].password_hash);
      if (!ok) return res.status(401).json({ error: 'Current password incorrect' });
    }
    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/me/orders', userAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT order_no, mode, status, estimate, quoted_price, shipping_fee,
              total_paid, tracking_no, created_at, updated_at
       FROM orders WHERE user_id=$1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/me/addresses', userAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM addresses WHERE user_id=$1 ORDER BY is_default DESC, created_at', [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/me/addresses', userAuth, async (req, res) => {
  try {
    const { label, recipient, phone, address_line, city, country, is_default } = req.body;
    if (is_default) await pool.query('UPDATE addresses SET is_default=0 WHERE user_id=$1', [req.user.id]);
    const { rows } = await pool.query(
      `INSERT INTO addresses (id, user_id, label, recipient, phone, address_line, city, country, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [uuidv4(), req.user.id, label||'Home', recipient, phone, address_line, city, country||'US', is_default ? 1 : 0]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/me/addresses/:id', userAuth, async (req, res) => {
  try {
    const { label, recipient, phone, address_line, city, country, is_default } = req.body;
    if (is_default) await pool.query('UPDATE addresses SET is_default=0 WHERE user_id=$1', [req.user.id]);
    await pool.query(
      `UPDATE addresses SET label=COALESCE($1,label), recipient=COALESCE($2,recipient),
       phone=COALESCE($3,phone), address_line=COALESCE($4,address_line),
       city=COALESCE($5,city), country=COALESCE($6,country),
       is_default=COALESCE($7,is_default)
       WHERE id=$8 AND user_id=$9`,
      [label, recipient, phone, address_line, city, country, is_default, req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/me/addresses/:id', userAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM addresses WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════
// ADMIN APIs
// ═══════════════════════════════════════════════════════

app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password, cf_turnstile } = req.body;
    if (!await verifyTurnstile(cf_turnstile)) return res.status(400).json({ error: 'Human verification failed. Please try again.' });
    const { rows } = await pool.query('SELECT * FROM admin_users WHERE email=$1', [email?.toLowerCase()]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    await pool.query("UPDATE admin_users SET last_login_at=datetime('now') WHERE id=$1", [rows[0].id]);
    const token = jwt.sign({ id: rows[0].id, email: rows[0].email, role: rows[0].role }, JWT_ADMIN_SECRET, { expiresIn: '12h' });
    res.json({ success: true, token, admin: { id: rows[0].id, name: rows[0].name, role: rows[0].role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const [oRes, uRes, rRes, pRes] = await Promise.all([
      pool.query(`SELECT
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END),0) as pending,
        COALESCE(SUM(CASE WHEN status='quoted'  THEN 1 ELSE 0 END),0) as quoted,
        COALESCE(SUM(CASE WHEN status='paid'    THEN 1 ELSE 0 END),0) as paid,
        COALESCE(SUM(CASE WHEN status='production' THEN 1 ELSE 0 END),0) as production,
        COALESCE(SUM(CASE WHEN status='shipped' THEN 1 ELSE 0 END),0) as shipped,
        COALESCE(SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END),0) as completed,
        COALESCE(SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END),0) as today
        FROM orders`),
      pool.query('SELECT COUNT(*) as total FROM users'),
      pool.query(`SELECT COALESCE(SUM(total_paid),0) as total_revenue FROM orders WHERE status='completed'`),
      pool.query(`SELECT COUNT(*) as total FROM posts WHERE status='published'`)
    ]);
    res.json({ orders: oRes.rows[0], users: uRes.rows[0], revenue: rRes.rows[0], posts: pRes.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/orders', adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20, q } = req.query;
    const offset = (page - 1) * limit;
    let where = []; const params = [];
    if (status) { where.push(`o.status=$${params.length+1}`); params.push(status); }
    if (q) {
      where.push(`(o.order_no LIKE $${params.length+1} OR u.email LIKE $${params.length+1} OR u.name LIKE $${params.length+1})`);
      params.push('%'+q+'%');
    }
    const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const { rows } = await pool.query(
      `SELECT o.id, o.order_no, o.mode, o.status, o.estimate, o.quoted_price,
              o.total_paid, o.created_at, o.updated_at,
              COALESCE(u.name, o.guest_email) as customer_name,
              COALESCE(u.email, o.guest_email) as customer_email
       FROM orders o LEFT JOIN users u ON o.user_id = u.id
       ${whereStr}
       ORDER BY o.created_at DESC
       LIMIT $${params.length+1} OFFSET $${params.length+2}`,
      [...params, Number(limit), Number(offset)]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/orders/:id', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.*, COALESCE(u.name,'') as customer_name, COALESCE(u.email, o.guest_email) as customer_email,
              u.whatsapp as customer_whatsapp, u.company as customer_company
       FROM orders o LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id=$1 OR o.order_no=$1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/orders/:id', adminAuth, async (req, res) => {
  try {
    const { status, quoted_price, shipping_fee, tracking_no, admin_note } = req.body;
    await pool.query(
      `UPDATE orders SET
       status=COALESCE($1,status), quoted_price=COALESCE($2,quoted_price),
       shipping_fee=COALESCE($3,shipping_fee), tracking_no=COALESCE($4,tracking_no),
       admin_note=COALESCE($5,admin_note), updated_at=datetime('now')
       WHERE id=$6 OR order_no=$6`,
      [status, quoted_price, shipping_fee, tracking_no, admin_note, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/orders/:id/send-payment', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.*, COALESCE(u.email, o.guest_email) as customer_email, COALESCE(u.name,'Customer') as customer_name
       FROM orders o LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id=$1 OR o.order_no=$1`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    const order = rows[0];
    if (!order.quoted_price) return res.status(400).json({ error: 'Please set quoted_price first' });

    await pool.query(`UPDATE orders SET status='quoted', updated_at=datetime('now') WHERE id=$1`, [order.id]);

    const trackUrl = `${process.env.SITE_URL || 'https://pcbaforge.com'}/track.html?order=${order.order_no}`;
    await sendMail({
      to: order.customer_email,
      subject: `[PCBAForge] Your Quote is Ready — ${order.order_no}`,
      html: `<h2 style="color:#00C832">Your Quote is Ready</h2>
        <p>Hi ${order.customer_name},</p>
        <p>Our engineer has reviewed your inquiry <b>${order.order_no}</b>.</p>
        <table style="border-collapse:collapse;width:100%;max-width:400px">
          <tr><td style="padding:8px;color:#666">Service</td><td style="padding:8px"><b>${order.mode.toUpperCase()}</b></td></tr>
          <tr style="background:#f9f9f9"><td style="padding:8px;color:#666">Quoted Price</td><td style="padding:8px"><b style="color:#00C832;font-size:1.2em">USD $${order.quoted_price}</b></td></tr>
          ${order.shipping_fee ? `<tr><td style="padding:8px;color:#666">Shipping Fee</td><td style="padding:8px"><b>USD $${order.shipping_fee}</b></td></tr>` : ''}
        </table>
        <br>
        <p><a href="${trackUrl}" style="background:#00C832;color:#000;padding:12px 24px;text-decoration:none;font-weight:bold;font-family:monospace">VIEW ORDER & PAY →</a></p>`
    });

    res.json({ success: true, message: 'Payment link sent to ' + order.customer_email });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/customers', adminAuth, async (req, res) => {
  try {
    const { q, type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let where = []; const params = [];
    if (type) { where.push(`u.customer_type=$${params.length+1}`); params.push(type); }
    if (q) {
      where.push(`(u.email LIKE $${params.length+1} OR u.name LIKE $${params.length+1} OR u.company LIKE $${params.length+1})`);
      params.push('%'+q+'%');
    }
    const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.name, u.company, u.whatsapp, u.customer_type,
              u.email_verified, u.created_at, u.last_login_at,
              u.google_id IS NOT NULL as google_linked,
              u.github_id IS NOT NULL as github_linked,
              COUNT(o.id) as order_count,
              COALESCE(SUM(o.total_paid),0) as total_spent
       FROM users u LEFT JOIN orders o ON o.user_id = u.id
       ${whereStr}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $${params.length+1} OFFSET $${params.length+2}`,
      [...params, Number(limit), Number(offset)]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/customers/:id', adminAuth, async (req, res) => {
  try {
    const [uRes, oRes] = await Promise.all([
      pool.query('SELECT * FROM users WHERE id=$1', [req.params.id]),
      pool.query('SELECT order_no,mode,status,estimate,quoted_price,total_paid,created_at FROM orders WHERE user_id=$1 ORDER BY created_at DESC', [req.params.id])
    ]);
    if (!uRes.rows.length) return res.status(404).json({ error: 'Customer not found' });
    res.json({ ...uRes.rows[0], orders: oRes.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/customers/:id', adminAuth, async (req, res) => {
  try {
    const { customer_type, note, unbind_google, unbind_github } = req.body;
    let sql = `UPDATE users SET customer_type=COALESCE($1,customer_type), note=COALESCE($2,note)`;
    const params = [customer_type, note];
    if (unbind_google) { sql += `, google_id=NULL`; }
    if (unbind_github) { sql += `, github_id=NULL`; }
    sql += ` WHERE id=$3`;
    params.push(req.params.id);
    await pool.query(sql, params);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 后台重置客户密码 ─────────────────────────────────────
app.post('/api/admin/customers/:id/reset-password', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT email, name FROM users WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Customer not found' });
    const reset_token = uuidv4();
    const expires = new Date(Date.now() + 3600000).toISOString();
    await pool.query(
      `UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE id=$3`,
      [reset_token, expires, req.params.id]
    );
    const resetUrl = `${process.env.SITE_URL || 'https://pcbaforge.com'}/account.html?reset_token=${reset_token}`;
    await sendMail({
      to: rows[0].email,
      subject: '[PCBAForge] Password Reset — Admin Action',
      html: `<h2>Password Reset</h2>
        <p>Hi ${rows[0].name},</p>
        <p>An administrator has initiated a password reset for your account. Click the button below to set a new password:</p>
        <p><a href="${resetUrl}" style="background:#00FF41;color:#000;padding:12px 24px;text-decoration:none;font-weight:bold;font-family:monospace">RESET PASSWORD →</a></p>
        <p>This link expires in <strong>1 hour</strong>.</p>`
    });
    res.json({ success: true, message: 'Password reset email sent to ' + rows[0].email });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/settings', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM settings ORDER BY key');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/settings/:key', adminAuth, async (req, res) => {
  try {
    await pool.query("UPDATE settings SET value=$1, updated_at=datetime('now') WHERE key=$2", [req.body.value, req.params.key]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/admins', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id,email,name,role,created_at,last_login_at FROM admin_users ORDER BY created_at');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/admins', adminAuth, async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only' });
    const { email, password, name, role } = req.body;
    const hash = await bcrypt.hash(password, 12);
    await pool.query('INSERT INTO admin_users (id,email,password_hash,name,role) VALUES ($1,$2,$3,$4,$5)', [uuidv4(), email, hash, name, role||'admin']);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/admins/:id/password', adminAuth, async (req, res) => {
  try {
    if (req.admin.id !== req.params.id && req.admin.role !== 'superadmin')
      return res.status(403).json({ error: 'Permission denied' });
    const hash = await bcrypt.hash(req.body.new_password, 12);
    await pool.query('UPDATE admin_users SET password_hash=$1 WHERE id=$2', [hash, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/settings/encrypted/:key', adminAuth, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const ENCRYPTED_KEYS = ['smtp_pass_enc', 'resend_api_key_enc'];
    if (!ENCRYPTED_KEYS.includes(key)) return res.status(400).json({ error: 'Key is not an encrypted field' });
    if (!ENC_KEY) return res.status(500).json({ error: 'SETTINGS_ENCRYPT_KEY environment variable not set' });
    const encrypted = encrypt(value);
    await pool.query("UPDATE settings SET value=$1, updated_at=datetime('now') WHERE key=$2", [encrypted, key]);
    res.json({ success: true, message: 'Value encrypted and saved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/mail/test', adminAuth, async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'to email required' });
    await sendMail({
      to,
      subject: '[PCBAForge] Mail Configuration Test',
      html: `<h2 style="color:#00C832">✅ Mail Configuration Working</h2>
        <p>This is a test email from your PCBAForge mail server.</p>
        <p style="color:#999;font-size:12px">Sent at ${new Date().toISOString()}</p>`
    });
    res.json({ success: true, message: 'Test email sent to ' + to });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════
// BLOG APIs（公开）
// ═══════════════════════════════════════════════════════

app.get('/api/posts', async (req, res) => {
  try {
    const { tag, page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;
    let where = "WHERE status='published'";
    const params = [];
    if (tag) {
      where += ` AND tags LIKE ?`;
      params.push('%' + tag + '%');
    }
    const { rows } = await pool.query(
      `SELECT id, slug, title, excerpt, cover_url, tags, author, views, published_at, created_at
       FROM posts ${where}
       ORDER BY published_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) as total FROM posts ${where}`, params
    );
    res.json({ posts: rows, total: Number(countRows[0]?.total || 0) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/posts/:slug', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM posts WHERE slug=? AND status='published'`,
      [req.params.slug]
    );
    if (!rows.length) return res.status(404).json({ error: 'Post not found' });
    await pool.query(`UPDATE posts SET views=views+1 WHERE slug=?`, [req.params.slug]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════
// ADMIN BLOG APIs
// ═══════════════════════════════════════════════════════

app.get('/api/admin/posts', adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let where = ''; const params = [];
    if (status) { where = `WHERE status=?`; params.push(status); }
    const { rows } = await pool.query(
      `SELECT id, slug, title, excerpt, cover_url, tags, status, author, views, published_at, created_at, updated_at
       FROM posts ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    const { rows: countRows } = await pool.query(`SELECT COUNT(*) as total FROM posts ${where}`, params);
    res.json({ posts: rows, total: Number(countRows[0]?.total || 0) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/posts/:id', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM posts WHERE id=?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Post not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/posts', adminAuth, async (req, res) => {
  try {
    const { title, slug, excerpt, content, cover_url, tags, status, author } = req.body;
    if (!title || !slug) return res.status(400).json({ error: 'title and slug required' });
    const { rows: exists } = await pool.query(`SELECT id FROM posts WHERE slug=?`, [slug]);
    if (exists.length) return res.status(409).json({ error: 'Slug already exists' });
    const published_at = status === 'published' ? new Date().toISOString() : null;
    const { rows } = await pool.query(
      `INSERT INTO posts (id, slug, title, excerpt, content, cover_url, tags, status, author, published_at)
       VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING *`,
      [uuidv4(), slug, title, excerpt||'', content||'', cover_url||'',
       JSON.stringify(tags||[]), status||'draft', author||'PCBAForge Team', published_at]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/posts/:id', adminAuth, async (req, res) => {
  try {
    const { title, slug, excerpt, content, cover_url, tags, status, author } = req.body;
    if (slug) {
      const { rows: exists } = await pool.query(`SELECT id FROM posts WHERE slug=? AND id!=?`, [slug, req.params.id]);
      if (exists.length) return res.status(409).json({ error: 'Slug already exists' });
    }
    const { rows: current } = await pool.query(`SELECT status, published_at FROM posts WHERE id=?`, [req.params.id]);
    if (!current.length) return res.status(404).json({ error: 'Post not found' });
    const published_at = (status === 'published' && !current[0].published_at)
      ? new Date().toISOString() : current[0].published_at;
    await pool.query(
      `UPDATE posts SET
       title=COALESCE(?,title), slug=COALESCE(?,slug), excerpt=COALESCE(?,excerpt),
       content=COALESCE(?,content), cover_url=COALESCE(?,cover_url),
       tags=COALESCE(?,tags), status=COALESCE(?,status), author=COALESCE(?,author),
       published_at=?, updated_at=datetime('now')
       WHERE id=?`,
      [title, slug, excerpt, content, cover_url,
       tags ? JSON.stringify(tags) : null, status, author, published_at, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/posts/:id', adminAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM posts WHERE id=?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => {
  console.log(`✅ PCBAForge server running on http://localhost:${PORT}`);
});
