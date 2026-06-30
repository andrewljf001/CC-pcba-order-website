/**
 * PCBAForge — Cookie Consent Banner (7.8)
 * GDPR compliant. GA4-ready: fires gtag consent update when user accepts.
 * Usage: <script src="/cookie-consent.js"></script>  (before closing </body>)
 */
(function () {
  var STORAGE_KEY = 'pcbaf_cookie_consent';
  var stored = localStorage.getItem(STORAGE_KEY);

  // Default: deny analytics until user accepts
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      wait_for_update: 2000
    });
  }

  if (stored) return; // already decided

  // Build banner
  var compact = window.matchMedia && window.matchMedia('(max-width: 600px)').matches;
  var banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.innerHTML = [
    '<div id="cb-inner">',
    '  <div id="cb-text">',
    '    <span id="cb-title">🍪 We use cookies</span>',
    '    <span id="cb-desc">' + (compact ? 'Analytics cookies improve the site. <a href="/privacy">Privacy</a>.' : 'We use analytics cookies to understand how visitors use our site and improve your experience. See our <a href="/privacy">Privacy Policy</a>.') + '</span>',
    '  </div>',
    '  <div id="cb-btns">',
    '    <button id="cb-decline">Decline</button>',
    '    <button id="cb-accept">Accept</button>',
    '  </div>',
    '</div>'
  ].join('');

  var style = document.createElement('style');
  style.textContent = [
    '#cookie-banner{position:fixed;bottom:0;left:0;right:0;z-index:9999;',
    'background:#ffffff;border-top:1px solid #e3e8f0;padding:.75rem 1.2rem;',
    'font-family:"DM Sans",Inter,sans-serif;font-size:.85rem;color:#334155;',
    'box-shadow:0 -8px 24px rgba(20,32,51,.06);animation:cb-slide .3s ease;}',
    '@keyframes cb-slide{from{transform:translateY(100%)}to{transform:translateY(0)}}',
    '#cb-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;',
    'justify-content:space-between;gap:1rem;flex-wrap:wrap;}',
    '#cb-text{display:flex;flex-direction:column;gap:.25rem;flex:1;min-width:220px;}',
    '#cb-title{font-size:.92rem;font-weight:800;color:#142033;letter-spacing:-.01em;}',
    '#cb-desc{font-size:.8rem;color:#64748b;line-height:1.55;}',
    '#cb-desc a{color:#11843d;font-weight:700;text-decoration:underline;}',
    '#cb-btns{display:flex;gap:.6rem;flex-shrink:0;}',
    '#cb-decline{background:#fff;border:1px solid #cbd5e1;color:#64748b;border-radius:7px;',
    'padding:.5rem 1.1rem;font-size:.8rem;font-weight:700;font-family:"DM Sans",Inter,sans-serif;',
    'cursor:pointer;transition:all .2s;}',
    '#cb-decline:hover{border-color:#94a3b8;color:#334155;}',
    '#cb-accept{background:#16a34a;border:none;color:#fff;border-radius:7px;',
    'padding:.5rem 1.3rem;font-size:.8rem;font-family:"DM Sans",Inter,sans-serif;',
    'font-weight:800;cursor:pointer;transition:background .2s;box-shadow:0 8px 16px rgba(22,163,74,.18);}',
    '#cb-accept:hover{background:#11843d;}',
    '@media(max-width:600px){#cookie-banner{padding:.65rem .85rem;}',
    '#cb-inner{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:.65rem;}',
    '#cb-text{min-width:0;gap:.1rem;}',
    '#cb-title{font-size:.82rem;}',
    '#cb-desc{font-size:.72rem;line-height:1.35;}',
    '#cb-btns{width:auto;justify-content:flex-end;gap:.45rem;}',
    '#cb-decline,#cb-accept{padding:.42rem .7rem;font-size:.74rem;}}'
  ].join('');

  document.head.appendChild(style);
  document.body.appendChild(banner);

  function dismiss(accepted) {
    localStorage.setItem(STORAGE_KEY, accepted ? 'accepted' : 'declined');
    banner.style.transition = 'transform .3s';
    banner.style.transform = 'translateY(100%)';
    setTimeout(function () { banner.remove(); }, 320);

    if (accepted && typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'denied'
      });
    }
  }

  document.getElementById('cb-accept').addEventListener('click', function () { dismiss(true); });
  document.getElementById('cb-decline').addEventListener('click', function () { dismiss(false); });
})();
