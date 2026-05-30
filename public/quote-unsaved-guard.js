/* ============================================================
   PCBAForge — 报价页"未保存离开"提示 (仅 quote.html)
   零侵入：不改动现有报价/提交逻辑。
   规则：用户动过表单(选服务/改字段/上传文件)且未成功提交时，
        关闭/刷新/离开页面会弹出浏览器原生确认框。
        成功提交(success-box 显示)后自动解除。
   注：beforeunload 的提示文字由浏览器固定，无法自定义为中文。
   ============================================================ */
(function () {
  var dirty = false;

  function markDirty() { dirty = true; }

  function init() {
    var form = document.getElementById('inquiry-form');
    if (!form) return;

    // 1) 表单内所有输入控件的改动 → 标脏
    form.addEventListener('input',  markDirty, true);
    form.addEventListener('change', markDirty, true);

    // 2) 三个服务选择卡片点击 → 标脏
    ['card-pcb', 'card-assy', 'card-test'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('click', markDirty, true);
    });

    // 3) 文件上传(拖拽/选择)区域 → 标脏
    var zone  = document.getElementById('upload-zone');
    if (zone) {
      zone.addEventListener('drop',   markDirty, true);
      zone.addEventListener('change', markDirty, true);
    }

    // 4) 成功提交后解除：success-box 出现 .show 类时清除脏标记
    var sb = document.getElementById('success-box');
    if (sb && window.MutationObserver) {
      var mo = new MutationObserver(function () {
        if (sb.classList.contains('show')) { dirty = false; }
      });
      mo.observe(sb, { attributes: true, attributeFilter: ['class'] });
    }

    // 5) 离开拦截
    window.addEventListener('beforeunload', function (e) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';   // 触发浏览器原生确认框(文案不可自定义)
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
