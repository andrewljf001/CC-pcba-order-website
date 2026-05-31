/* ============================================================
   PCBAForge — 报价页"未保存离开"提示 (仅 quote.html)
   零侵入：不改动现有报价/提交逻辑。

   判定方式(快照比对，非监听事件)：
     以"全新空白默认表单"为基准。离开页面时，读取当前表单状态，
     只要和空白基准有任何差异(手填的、或从首页带回填的数据、选了服务、
     传了文件)，就弹出浏览器原生"离开/数据会丢失"确认框。
     什么都没动(等于空白默认)则不提示。
     成功提交(success-box 显示)后不再提示。
   注：beforeunload 的提示文字由浏览器固定，无法自定义为中文。
   ============================================================ */
(function () {
  var submitted = false;

  // 各字段的"空白默认值"基准(取自 quote.html 表单初始状态)
  var DEFAULTS = {
    'name': '', 'email': '', 'whatsapp': '', 'company': '', 'notes': '',
    'pcb-material': 'fr4', 'pcb-layers': '2', 'pcb-w': '100', 'pcb-h': '100',
    'pcb-qty': '10', 'pcb-thick': '1.6', 'pcb-drill': '0.3', 'pcb-finish': 'hasl_free',
    'pcb-color': 'green', 'pcb-impedance': 'no', 'pcb-copper': '1oz',
    'assy-qty': '10', 'smt-pads': '50', 'dip-pins': '0', 'smt-ic': '0',
    'assy-sides': 'single', 'assy-notes': '',
    'test-desc': ''
  };

  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value) : null;
  }

  function isDirty() {
    for (var id in DEFAULTS) {
      var cur = val(id);
      if (cur !== null && cur !== DEFAULTS[id]) return true;
    }
    var anySvc = ['chk-pcb', 'chk-assy', 'chk-test'].some(function (id) {
      var el = document.getElementById(id);
      return el && el.checked;
    });
    if (anySvc) return true;

    var bs = document.querySelector('[name="board-source"]:checked');
    if (bs && bs.value !== 'customer') return true;
    var cs = document.querySelector('[name="comp-supply"]:checked');
    if (cs && cs.value !== 'cms') return true;

    var fl = document.getElementById('file-list');
    if (fl && fl.children.length > 0) return true;

    return false;
  }

  function init() {
    var form = document.getElementById('inquiry-form');
    if (!form) return;

    var sb = document.getElementById('success-box');
    if (sb && window.MutationObserver) {
      var mo = new MutationObserver(function () {
        if (sb.classList.contains('show')) { submitted = true; }
      });
      mo.observe(sb, { attributes: true, attributeFilter: ['class'] });
    }

    window.addEventListener('beforeunload', function (e) {
      if (!submitted && isDirty()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
