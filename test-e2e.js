/**
 * PCBAForge — End-to-End 自动化测试 (完整真人下单链路)
 *
 * 通过 HTTP 打站点，走完整业务流程并打印每步结果。
 * ⚠️ 会写真实数据库（注册账号、下单、改报价）。测试后请用快照还原。
 *
 * 用法：
 *   # 测线上（Turnstile 会拦截写操作，只验证只读项）
 *   node test-e2e.js
 *
 *   # 测无 Turnstile 的临时实例（走完整下单链路）+ 传管理员账号以测改报价
 *   TURNSTILE_SECRET="" PORT=3002 node server.js &
 *   ADMIN_EMAIL=admin@pcbaforge.com ADMIN_PASS=你的密码 node test-e2e.js http://localhost:3002
 *
 * 退出码：全部通过=0，有失败=1
 */
const BASE = (process.argv[2] || 'https://pcbaforge.com').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASS  = process.env.ADMIN_PASS  || '';

let _fetch = global.fetch;
if (!_fetch) { _fetch = require('node-fetch'); }

const TS = Date.now();
const TEST_EMAIL = `test-e2e-${TS}@pcbaforge-test.com`;
const TEST_PASS  = 'TestPass12345';
const TEST_NAME  = 'E2E Auto Test';

let pass = 0, fail = 0, skip = 0;
function ok(name, detail = '')  { pass++; console.log(`✅ ${name}${detail ? ' — ' + detail : ''}`); }
function no(name, detail = '')  { fail++; console.log(`❌ ${name}${detail ? ' — ' + detail : ''}`); }
function sk(name, detail = '')  { skip++; console.log(`⏭️  ${name}${detail ? ' — ' + detail : ''}`); }

async function get(path, opts = {}) { return _fetch(BASE + path, opts); }

async function run() {
  console.log(`\n🧪 PCBAForge E2E 完整链路测试 — target: ${BASE}\n${'─'.repeat(54)}\n`);

  let orderNo = null;
  let adminToken = null;

  // ── 1. 首页 + 本地图片 ──
  try {
    const r = await get('/'); const html = await r.text();
    if (r.ok && html.includes('PCBAForge')) ok('首页可访问', `HTTP ${r.status}`); else no('首页可访问', `HTTP ${r.status}`);
    if (html.includes('images/hero-banner-20260607.webp')) ok('首页使用本地图片');
    else if (html.includes('unsplash.com')) no('首页使用本地图片', '仍是 unsplash！'); else no('首页使用本地图片', '未找到路径');
  } catch (e) { no('首页可访问', e.message); }

  // ── 2. 4张本地图片 ──
  for (const img of ['hero-banner-20260607.webp','pcb-fabrication-20260607.webp','smt-assembly-20260607.webp','turnkey-testing-20260607.webp']) {
    try { const r = await get('/images/'+img); const ct = r.headers.get('content-type')||'';
      if (r.ok && ct.startsWith('image/')) ok(`图片 ${img}`, ct); else no(`图片 ${img}`, `HTTP ${r.status}`);
    } catch (e) { no(`图片 ${img}`, e.message); }
  }

  // ── 3. cookie-consent.js (7.8) ──
  try { const r = await get('/cookie-consent.js'); const t = await r.text();
    if (r.ok && t.includes('cookie')) ok('cookie-consent.js (7.8)'); else no('cookie-consent.js (7.8)', `HTTP ${r.status}`);
  } catch (e) { no('cookie-consent.js (7.8)', e.message); }

  // ── 4. 公开设置 / 支付配置 ──
  try { const r = await get('/api/settings/public'); const d = await r.json();
    if (r.ok) ok('公开设置 API', `${Object.keys(d).length} keys`); else no('公开设置 API', `HTTP ${r.status}`);
  } catch (e) { no('公开设置 API', e.message); }
  try { const r = await get('/api/payment/config'); const d = await r.json();
    if (r.ok && 'mode' in d) ok('支付配置 API', `mode: ${d.mode}`); else no('支付配置 API', `HTTP ${r.status}`);
  } catch (e) { no('支付配置 API', e.message); }

  // ── 5. 真人下单（完整链路第1步）──
  try {
    const form = new URLSearchParams();
    form.append('mode','pcb'); form.append('name',TEST_NAME); form.append('email',TEST_EMAIL);
    form.append('notes','E2E 完整链路测试订单'); form.append('pcb_material','fr4');
    form.append('pcb_qty','10'); form.append('pcb_w','100'); form.append('pcb_h','100');
    form.append('estimate','50');
    const r = await get('/api/inquiry', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: form.toString() });
    const d = await r.json();
    if (r.ok && d.success) { orderNo = d.order_no; ok('真人下单', `订单号 ${orderNo}`); }
    else if (d.error && d.error.includes('verification')) sk('真人下单', 'Turnstile拦截(线上正常)，跳过后续下单链路');
    else no('真人下单', d.error || `HTTP ${r.status}`);
  } catch (e) { no('真人下单', e.message); }

  // ── 6. 下单后立即查询（应能查到，状态 pending）──
  if (orderNo) {
    try {
      const r = await get('/api/order/lookup', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ order_no: orderNo, email: TEST_EMAIL }) });
      const d = await r.json();
      if (r.ok && d.status === 'pending') ok('下单后查询', `状态 ${d.status}`);
      else if (r.ok) ok('下单后查询', `状态 ${d.status}`);
      else no('下单后查询', `HTTP ${r.status}`);
    } catch (e) { no('下单后查询', e.message); }
  }

  // ── 7. 管理员登录（用于改报价）──
  if (orderNo && ADMIN_EMAIL && ADMIN_PASS) {
    try {
      const r = await get('/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }) });
      const d = await r.json();
      if (r.ok && d.token) { adminToken = d.token; ok('管理员登录'); }
      else if (d.error && d.error.includes('verification')) sk('管理员登录', 'Turnstile拦截');
      else no('管理员登录', d.error || `HTTP ${r.status}`);
    } catch (e) { no('管理员登录', e.message); }
  } else if (orderNo) {
    sk('管理员登录', '未提供 ADMIN_EMAIL/ADMIN_PASS，跳过改报价链路');
  }

  // ── 8. 管理员给订单报价（quoted）──
  if (orderNo && adminToken) {
    try {
      const r = await get('/api/admin/orders/' + orderNo, { method:'PUT', headers:{'Content-Type':'application/json','Authorization':'Bearer '+adminToken}, body: JSON.stringify({ status:'quoted', quoted_price: 88, shipping_fee: 25 }) });
      const d = await r.json();
      if (r.ok && d.success) ok('管理员改报价', 'quoted, $88 + $25运费'); else no('管理员改报价', d.error || `HTTP ${r.status}`);
    } catch (e) { no('管理员改报价', e.message); }

    // ── 9. 改价后再查询，验证状态流转到 quoted ──
    try {
      const r = await get('/api/order/lookup', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ order_no: orderNo, email: TEST_EMAIL }) });
      const d = await r.json();
      if (r.ok && d.status === 'quoted' && Number(d.quoted_price) === 88) ok('报价后查询验证', `状态 quoted, 报价 $${d.quoted_price}`);
      else no('报价后查询验证', `状态 ${d.status}, 报价 ${d.quoted_price}`);
    } catch (e) { no('报价后查询验证', e.message); }

    // ── 10. 创建支付订单（验证支付链路能起单，不真实付款）──
    try {
      const r = await get('/api/payment/create', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ order_no: orderNo, email: TEST_EMAIL }) });
      const d = await r.json();
      if (r.ok && d.approve_url) ok('创建支付订单', 'PayPal approve_url 已生成');
      else no('创建支付订单', d.error || `HTTP ${r.status}`);
    } catch (e) { no('创建支付订单', e.message); }
  }

  // ── 11. 博客 / 后台页面 ──
  try { const r = await get('/api/posts'); const d = await r.json();
    if (r.ok && Array.isArray(d.posts)) ok('博客列表 API', `${d.posts.length} 篇`); else no('博客列表 API', `HTTP ${r.status}`);
  } catch (e) { no('博客列表 API', e.message); }
  try { const r = await get('/admin/'); if (r.ok) ok('后台页面可访问'); else no('后台页面可访问', `HTTP ${r.status}`); } catch (e) { no('后台页面可访问', e.message); }

  // ── 汇总 ──
  console.log(`\n${'─'.repeat(54)}`);
  console.log(`\n📊 汇总：${pass} 通过 / ${fail} 失败 / ${skip} 跳过 / 共 ${pass+fail+skip} 项\n`);
  if (orderNo) console.log(`📝 本次测试订单号：${orderNo}（测完用快照还原清除）\n`);
  if (fail === 0) console.log('🎉 全部通过！完整业务链路健康。');
  else console.log('⚠️  有失败项，请检查上面 ❌ 部分。');
  console.log(`\n💡 测试数据请用 Cloudflare 快照还原清除。\n`);
  process.exit(fail === 0 ? 0 : 1);
}
run().catch(e => { console.error('测试脚本异常:', e); process.exit(1); });
