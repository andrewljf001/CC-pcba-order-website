(function () {
  var submitted = false;
  var DEFAULTS = {
    'name': '', 'email': '', 'whatsapp': '', 'company': '', 'notes': '',
    'pcb-material': 'fr4', 'pcb-layers': '2', 'pcb-w': '100', 'pcb-h': '100',
    'pcb-qty': '10', 'pcb-thick': '1.6', 'pcb-drill': '0.3', 'pcb-finish': 'hasl_free',
    'pcb-color': 'green', 'pcb-impedance': 'no', 'pcb-copper': '1oz',
    'assy-qty': '10', 'smt-pads': '50', 'dip-pins': '0', 'smt-ic': '0',
    'assy-sides': 'single', 'assy-notes': '',
    'test-desc': ''
  };
  function val(id){ var el=document.getElementById(id); return el?String(el.value):null; }
  function isDirty(){
    for (var id in DEFAULTS){ var cur=val(id); if(cur!==null && cur!==DEFAULTS[id]) return true; }
    var anySvc=['chk-pcb','chk-assy','chk-test'].some(function(id){ var el=document.getElementById(id); return el&&el.checked; });
    if(anySvc) return true;
    var bs=document.querySelector('[name="board-source"]:checked'); if(bs&&bs.value!=='customer') return true;
    var cs=document.querySelector('[name="comp-supply"]:checked');  if(cs&&cs.value!=='cms') return true;
    var fl=document.getElementById('file-list'); if(fl&&fl.children.length>0) return true;
    return false;
  }
  function init(){
    var form=document.getElementById('inquiry-form'); if(!form) return;
    var sb=document.getElementById('success-box');
    if(sb&&window.MutationObserver){
      var mo=new MutationObserver(function(){ if(sb.classList.contains('show')) submitted=true; });
      mo.observe(sb,{attributes:true,attributeFilter:['class']});
    }
    window.addEventListener('beforeunload',function(e){
      if(!submitted && isDirty()){ e.preventDefault(); e.returnValue=''; return ''; }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
