/* ============================================================
   PCBAForge — 共享报价逻辑 (single source of truth)
   首页(index.html) 与 报价页(quote.html) 都加载并调用本文件。
   规则改动只需改这里一处，两个页面同时生效。
   ============================================================ */
(function (global) {

  // 默认报价参数（后台 /api/settings/public 可覆盖）
  var DEFAULTS = {
    pcb_t1: 50, pcb_t2: 75, pcb_t3: 100,
    pcb_qty_split: 10, pcb_qty_max: 20, pcb_size_max: 100, pcb_layer_max: 4,
    smt_single: 200, smt_double: 400,
    smt_max_parts: 200, smt_max_ic: 10, smt_max_dip: 100
  };

  // 全局共享的当前参数（页面读后台后会更新）
  var PRICING = {};
  for (var k in DEFAULTS) PRICING[k] = DEFAULTS[k];

  // 从后台 cfg 载入参数；无值则保留默认
  function loadPricingFromConfig(cfg) {
    cfg = cfg || {};
    var num = function (v, d) { var n = parseFloat(v); return (isFinite(n) && n > 0) ? n : d; };
    PRICING.pcb_t1        = num(cfg.pcb_tier1_price,  DEFAULTS.pcb_t1);
    PRICING.pcb_t2        = num(cfg.pcb_tier2_price,  DEFAULTS.pcb_t2);
    PRICING.pcb_t3        = num(cfg.pcb_tier3_price,  DEFAULTS.pcb_t3);
    PRICING.pcb_qty_split = num(cfg.pcb_qty_split,    DEFAULTS.pcb_qty_split);
    PRICING.pcb_qty_max   = num(cfg.pcb_qty_max,      DEFAULTS.pcb_qty_max);
    PRICING.pcb_size_max  = num(cfg.pcb_size_max,     DEFAULTS.pcb_size_max);
    PRICING.pcb_layer_max = num(cfg.pcb_layer_max,    DEFAULTS.pcb_layer_max);
    PRICING.smt_single    = num(cfg.smt_single_price, DEFAULTS.smt_single);
    PRICING.smt_double    = num(cfg.smt_double_price, DEFAULTS.smt_double);
    PRICING.smt_max_parts = num(cfg.smt_max_parts,    DEFAULTS.smt_max_parts);
    PRICING.smt_max_ic    = num(cfg.smt_max_ic,       DEFAULTS.smt_max_ic);
    PRICING.smt_max_dip   = num(cfg.smt_max_dip,      DEFAULTS.smt_max_dip);
    return PRICING;
  }

  /* PCB 报价
     输入 { material, layers, w, h, qty, drill, impedance, finish }
     返回 { manual:bool, price:number }
     人工条件: 非FR4 / 层数>上限 / 任一边>尺寸上限 / 数量>上限或为0 / 孔径!=0.3 / 表面处理=enig(镀金)
     标准分档(数量 1~split 低档, split+1~max 高档):
        无阻抗: 低档 t1 , 高档 t2
        有阻抗: 低档 t2 , 高档 t3
  */
  function computePcb(input) {
    var mat    = input.material;
    var layers = parseInt(input.layers, 10) || 0;
    var W      = parseFloat(input.w) || 0;
    var H      = parseFloat(input.h) || 0;
    var qty    = parseInt(input.qty, 10) || 0;
    var drill  = String(input.drill);
    var imp    = input.impedance;
    var finish = input.finish;

    var manual = (
      mat !== 'fr4' ||
      layers > PRICING.pcb_layer_max ||
      W > PRICING.pcb_size_max || H > PRICING.pcb_size_max ||
      qty > PRICING.pcb_qty_max || qty === 0 ||
      drill !== '0.3' ||
      finish === 'enig'
    );
    if (manual) return { manual: true, price: 0 };

    var lowBand = (qty <= PRICING.pcb_qty_split);
    var price;
    if (imp === 'no') price = lowBand ? PRICING.pcb_t1 : PRICING.pcb_t2;
    else              price = lowBand ? PRICING.pcb_t2 : PRICING.pcb_t3;
    return { manual: false, price: price };
  }

  /* 组装报价
     输入 { supply('cms'|'turnkey'/'customer'|'us'), qty, smtPads, dipPins, ic, sides('single'|'double') }
     人工条件: turnkey(我方供料) / 数量>上限或为0 / SMT焊盘>上限 / IC>=上限 / DIP引脚>上限
  */
  function computeAssy(input) {
    var supply = input.supply;
    var qty    = parseInt(input.qty, 10) || 0;
    var smt    = parseInt(input.smtPads, 10) || 0;
    var dip    = parseInt(input.dipPins, 10) || 0;
    var ic     = parseInt(input.ic, 10) || 0;
    var sides  = input.sides;

    var turnkey = (supply === 'turnkey' || supply === 'us');
    var manual = (
      turnkey ||
      qty > PRICING.pcb_qty_max || qty === 0 ||
      smt > PRICING.smt_max_parts ||
      ic >= PRICING.smt_max_ic ||
      dip > PRICING.smt_max_dip
    );
    if (manual) return { manual: true, price: 0 };
    return { manual: false, price: (sides === 'double') ? PRICING.smt_double : PRICING.smt_single };
  }

  global.PCBAPricing = {
    PRICING: PRICING,
    DEFAULTS: DEFAULTS,
    loadPricingFromConfig: loadPricingFromConfig,
    computePcb: computePcb,
    computeAssy: computeAssy
  };

})(typeof window !== 'undefined' ? window : this);
