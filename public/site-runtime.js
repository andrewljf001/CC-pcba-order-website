(function () {
  'use strict';

  var app = window.PCBAForge = window.PCBAForge || {};
  var CONSENT_KEY = 'pcbaf_cookie_consent';
  var SETTINGS_KEY = 'pcbaf_public_settings_v2';
  var SETTINGS_TTL_MS = 60 * 60 * 1000;
  var settingsPromise = null;
  var analyticsLoaded = false;
  var turnstilePromise = null;

  function readStorage(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return ''; }
  }

  function writeStorage(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) {}
  }

  function readSettingsCache(allowStale) {
    try {
      var raw = window.localStorage.getItem(SETTINGS_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.value) return null;
      if (!allowStale && Number(parsed.expiresAt || 0) <= Date.now()) return null;
      return parsed.value;
    } catch (e) {
      return null;
    }
  }

  function writeSettingsCache(value) {
    if (!value || typeof value !== 'object') return;
    writeStorage(SETTINGS_KEY, JSON.stringify({
      expiresAt: Date.now() + SETTINGS_TTL_MS,
      value: value
    }));
  }

  app.getPublicSettings = function getPublicSettings(options) {
    options = options || {};
    if (!options.force) {
      var cached = readSettingsCache(false);
      if (cached) return Promise.resolve(cached);
      if (settingsPromise) return settingsPromise;
    }

    var stale = readSettingsCache(true);
    settingsPromise = fetch('/api/settings/public', {
      cache: options.force ? 'reload' : 'force-cache',
      credentials: 'same-origin'
    }).then(function (res) {
      if (!res.ok) throw new Error('settings unavailable');
      return res.json();
    }).then(function (data) {
      writeSettingsCache(data);
      return data;
    }).catch(function (err) {
      if (stale) return stale;
      throw err;
    }).finally(function () {
      settingsPromise = null;
    });

    return settingsPromise;
  };

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    wait_for_update: 500
  });

  function runIdle(fn, timeout) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(fn, { timeout: timeout || 2500 });
      return;
    }
    window.setTimeout(fn, timeout || 1200);
  }

  function analyticsAllowed() {
    return readStorage(CONSENT_KEY) === 'accepted';
  }

  function loadAnalytics() {
    if (analyticsLoaded || !analyticsAllowed()) return;
    analyticsLoaded = true;
    var gaId = window.PCBAFORGE_GA_ID || 'G-7966B84XT6';
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId);
    document.head.appendChild(script);
    window.gtag('js', new Date());
    window.gtag('config', gaId, { send_page_view: true });
  }

  function scheduleAnalytics(timeout) {
    runIdle(loadAnalytics, timeout || 2500);
  }

  app.setAnalyticsConsent = function setAnalyticsConsent(accepted) {
    window.gtag('consent', 'update', {
      analytics_storage: accepted ? 'granted' : 'denied',
      ad_storage: 'denied'
    });
    if (accepted) scheduleAnalytics(500);
  };

  window.addEventListener('pcbaf:cookie-consent', function (event) {
    app.setAnalyticsConsent(Boolean(event.detail && event.detail.accepted));
  });

  if (analyticsAllowed()) {
    app.setAnalyticsConsent(true);
    if (document.readyState === 'complete') scheduleAnalytics(1000);
    else window.addEventListener('load', function () { scheduleAnalytics(1000); }, { once: true });
  }

  function isLocalHost() {
    return /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/.test(window.location.hostname);
  }

  function hideLocalTurnstile() {
    document.documentElement.classList.add('local-turnstile-bypass');
    if (document.getElementById('local-turnstile-bypass-style')) return;
    var style = document.createElement('style');
    style.id = 'local-turnstile-bypass-style';
    style.textContent = '.cf-turnstile{display:none!important}';
    document.head.appendChild(style);
  }

  app.loadTurnstile = function loadTurnstile() {
    if (isLocalHost()) {
      hideLocalTurnstile();
      return Promise.resolve();
    }
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (turnstilePromise) return turnstilePromise;

    turnstilePromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      script.onload = function () { resolve(window.turnstile); };
      script.onerror = function () {
        turnstilePromise = null;
        reject(new Error('turnstile unavailable'));
      };
      document.head.appendChild(script);
    });
    return turnstilePromise;
  };

  function bindTurnstileLazyLoad() {
    var boxes = Array.prototype.slice.call(document.querySelectorAll('.cf-turnstile'));
    if (!boxes.length) return;
    if (isLocalHost()) {
      hideLocalTurnstile();
      return;
    }

    var started = false;
    function start() {
      if (started) return;
      started = true;
      app.loadTurnstile().catch(function () {});
    }

    var roots = [];
    boxes.forEach(function (box) {
      var form = box.closest ? box.closest('form') : null;
      if (form && roots.indexOf(form) === -1) roots.push(form);
    });
    if (!roots.length) roots.push(document);

    ['focusin', 'pointerdown', 'touchstart', 'keydown', 'mouseenter'].forEach(function (eventName) {
      roots.forEach(function (root) {
        root.addEventListener(eventName, start, { once: true, passive: true });
      });
    });

    document.addEventListener('submit', function (event) {
      if (event.target && event.target.querySelector && event.target.querySelector('.cf-turnstile')) start();
    }, true);

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            start();
            observer.disconnect();
          }
        });
      }, { rootMargin: '260px 0px' });
      boxes.forEach(function (box) { observer.observe(box); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindTurnstileLazyLoad, { once: true });
  } else {
    bindTurnstileLazyLoad();
  }
})();
