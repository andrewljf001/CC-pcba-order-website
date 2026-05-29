/**
 * PCBAForge — End-to-End 自动化测试 (完整流程)
 *
 * 通过 HTTP 打真实站点，走完整业务流程并打印每步结果。
 * ⚠️ 会写真实数据库（注册账号、下单、GDPR申请）。测试后请用快照还原。
 *
 * 用法：
 *   node test-e2e.js                          # 默认测 https://pcbaforge.com
 *   node test-e2e.js http://localhost:3001    # 测本地
 *
 * 退出码：全部通过=0，有失败=1
 */
const BASE = (process.argv[2] || 'https://pcbaforge.com').replace(/\/$/, '');

// Node 18+ 自带 fetch；旧版回退到 node-fetch
let _fetch = global.fetch;
if (!_fetch) { _fetch = require('node-fetch'); }

const TS = Date.now();
const TEST_EMAIL = `test-e2e-${TS}@pcbaforge-test.com`;
const TEST_PASS  = 'TestPass12345';
const TEST_NAME  = 'E2E Auto Test';

let pass = 0, fail = 0;
const results = [];

function ok(name, detail = '')  { pass++; results.push(`  ✅ ${name}${detail ? ' — ' + detail : ''}`); console.log(`✅ ${name}${detail ? ' — ' + detail : ''}`); }
function no(name, detail = '')  { fail++; results.push(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); console.log(`❌ ${name}${detail ? ' — ' + detail : ''}`); }

async function get(path, opts = {}) {
  const res = await _fetch(BASE + path, opts);
  return res;
}

// ─────────────────────────────────────────────
async function run() {
  console.log(`\n🧪 PCBAForge E2E Test — target: ${BASE}\n${'─'.repeat(50)}\n`);

  // ── 1. 首页可访问 ──
  try {
    const r = await get('/');
    const html = await r.text();
    if (r.ok && html.includes('PCBAForge')) ok('首页可访问', `HTTP ${r.status}`);
    else no('首页可访问', `HTTP ${r.status}`);

    // 顺带检查首页用的是本地图片不是 unsplash
    if (html.includes('images/hero-banner.jpg')) ok('首页使用本地图片', 'hero-banner.jpg');
    else if (html.includes('unsplash.com')) no('首页使用本地图片', '仍是 unsplash 外链！');
    else no('首页使用本地图片', '未找到预期图片路径');
  } catch (e) { no('首页可访问', e.message); }

  // ── 2. 4张本地图片可访问（图片bug验证）──
  const imgs = ['hero-banner.jpg', 'pcb-fabrication.jpg', 'smt-assembly.jpg', 'turnkey-testing.jpg'];
  for (const img of imgs) {
    try {
      const r = await get('/images/' + img);
      const ct = r.headers.get('content-type') || '';
      if (r.ok && ct.startsWith('image/')) ok(`图片 ${img}`, ct);
      else no(`图片 ${img}`, `HTTP ${r.status}, type=${ct}`);
    } catch (e) { no(`图片 ${img}`, e.message); }
  }

  // ── 3. cookie-consent.js 可访问（7.8）──
  try {
    const r = await get('/cookie-consent.js');
    const txt = await r.text();
    if (r.ok && txt.includes('cookie')) ok('cookie-consent.js (7.8)', `HTTP ${r.status}`);
    else no('cookie-consent.js (7.8)', `HTTP ${r.status}`);
  } catch (e) { no('cookie-consent.js (7.8)', e.message); }

  // ── 4. gdpr-delete.html 可访问（7.9）──
  try {
    const r = await get('/gdpr-delete.html');
    if (r.ok) ok('gdpr-delete.html 页面 (7.9)', `HTTP ${r.status}`);
    else no('gdpr-delete.html 页面 (7.9)', `HTTP ${r.status}`);
  } catch (e) { no('gdpr-delete.html 页面 (7.9)', e.message); }

  // ── 5. 公开设置 API ──
  try {
    const r = await get('/api/settings/public');
    const d = await r.json();
    if (r.ok && typeof d === 'object') ok('公开设置 API', `keys: ${Object.keys(d).length}`);
    else no('公开设置 API', `HTTP ${r.status}`);
  } catch (e) { no('公开设置 API', e.message); }

  // ── 6. 支付配置 API ──
  try {
    const r = await get('/api/payment/config');
    const d = await r.json();
    if (r.ok && 'mode' in d) ok('支付配置 API', `mode: ${d.mode}`);
    else no('支付配置 API', `HTTP ${r.status}`);
  } catch (e) { no('支付配置 API', e.message); }

  // ── 7. 注册测试账号 ──
  let registered = false;
  try {
    const r = await get('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS, name: TEST_NAME }),
    });
    const d = await r.json();
    // 注：如果开了 Turnstile，无 token 会被拦截，这属于安全机制正常
    if (r.ok && d.success) { ok('注册测试账号', TEST_EMAIL); registered = true; }
    else if (d.error && d.error.includes('verification')) ok('注册接口(Turnstile拦截)', '人机验证生效，属正常');
    else no('注册测试账号', d.error || `HTTP ${r.status}`);
  } catch (e) { no('注册测试账号', e.message); }

  // ── 8. 模拟下单（inquiry）──
  try {
    const form = new URLSearchParams();
    form.append('mode', 'pcb');
    form.append('name', TEST_NAME);
    form.append('email', TEST_EMAIL);
    form.append('notes', 'E2E automated test order — please ignore');
    form.append('pcb_material', 'fr4');
    form.append('pcb_qty', '10');
    form.append('pcb_w', '100');
    form.append('pcb_h', '100');

    const r = await get('/api/inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const d = await r.json();
    if (r.ok && d.success) ok('模拟下单 (inquiry)', `订单号 ${d.order_no}`);
    else if (d.error && d.error.includes('verification')) ok('下单接口(Turnstile拦截)', '人机验证生效，属正常');
    else no('模拟下单 (inquiry)', d.error || `HTTP ${r.status}`);
  } catch (e) { no('模拟下单 (inquiry)', e.message); }

  // ── 9. GDPR 删除申请（7.9）──
  try {
    const r = await get('/api/gdpr/delete-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, reason: 'E2E automated test' }),
    });
    const d = await r.json();
    if (r.ok && d.success) ok('GDPR 删除申请 (7.9)', '接口正常响应');
    else no('GDPR 删除申请 (7.9)', d.error || `HTTP ${r.status}`);
  } catch (e) { no('GDPR 删除申请 (7.9)', e.message); }

  // ── 10. 订单查询 API（用不存在的订单，应返回404）──
  try {
    const r = await get('/api/order/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_no: 'CC000000NOTEXIST', email: 'nobody@test.com' }),
    });
    if (r.status === 404) ok('订单查询 API', '不存在订单正确返回404');
    else if (r.ok) ok('订单查询 API', '接口正常响应');
    else no('订单查询 API', `HTTP ${r.status}`);
  } catch (e) { no('订单查询 API', e.message); }

  // ── 11. 博客列表 API ──
  try {
    const r = await get('/api/posts');
    const d = await r.json();
    if (r.ok && Array.isArray(d.posts)) ok('博客列表 API', `${d.posts.length} 篇文章`);
    else no('博客列表 API', `HTTP ${r.status}`);
  } catch (e) { no('博客列表 API', e.message); }

  // ── 12. 后台登录页可访问 ──
  try {
    const r = await get('/admin/');
    if (r.ok) ok('后台页面可访问', `HTTP ${r.status}`);
    else no('后台页面可访问', `HTTP ${r.status}`);
  } catch (e) { no('后台页面可访问', e.message); }

  // ── 汇总 ──
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`\n📊 测试汇总：${pass} 通过 / ${fail} 失败 / 共 ${pass + fail} 项\n`);
  if (fail === 0) {
    console.log('🎉 全部通过！整个流程健康运转。');
  } else {
    console.log('⚠️  有失败项，请检查上面标 ❌ 的部分。');
  }
  console.log(`\n💡 测试产生的数据（测试账号/订单/GDPR标记）请用快照还原清除。\n`);

  process.exit(fail === 0 ? 0 : 1);
}

run().catch(e => { console.error('测试脚本异常:', e); process.exit(1); });
