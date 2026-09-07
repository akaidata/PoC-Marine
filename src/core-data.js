/* ══ reference data ═════════════════════════════════════════════════ */
const TODAY = '2026-09-07';
const BASE  = 'EUR';

const OWNERS = [
  {id:'OWN-HELIOS', name:'Helios Maritime Ltd',        agreement:'SHIPMAN 2009 — Cl. 8 recharge'},
  {id:'OWN-NORD',   name:'Nordline Bereederung GmbH',  agreement:'SHIPMAN 2009 — Cl. 8 recharge'}
];
const VESSELS = [
  {id:'V-ATL', name:'MV Atlantic Sentinel', imo:'9483721', type:'Bulk carrier · 63,500 dwt',    owner:'OWN-HELIOS'},
  {id:'V-KYR', name:'MT Kyrenia Star',      imo:'9612044', type:'Product tanker · 49,900 dwt',  owner:'OWN-HELIOS'},
  {id:'V-AEG', name:'MV Aegean Trader',     imo:'9330118', type:'Container feeder · 1,730 TEU', owner:'OWN-NORD'}
];
const CENTRES = [
  {id:'CC-LIM', name:'Office — Limassol', type:'Cost centre · overhead', owner:null}
];
const CATEGORIES = ['Meals','Alcohol','Accommodation','Ground transport','Air travel',
  'Communications','Laundry','Supplies','Port and agency fees','Other'];

/* historical FX — fixture table, keyed to the transaction date */
const FX_TABLE = {
  'KRW|2026-08-18': 0.0006329,
  'CNY|2026-08-21': 0.1204,
  'EUR|2026-08-25': 1
};
const FX_SOURCE = 'Static fixture table (ECB daily reference, transaction date)';

/* policy — data, not code */
const POLICY = [
  {id:'POL-001', type:'category_exclusion', enabled:true,  category:'Alcohol',
   title:'Alcohol is not reimbursable',
   detail:'Any line categorised Alcohol is excluded from the claim total.'},
  {id:'POL-002', type:'allowed_with_condition', enabled:false, category:'Alcohol',
   title:'Alcohol reimbursable when entertaining a client',
   detail:'Overrides POL-001, but only on documents where client entertainment is recorded and attested.'},
  {id:'POL-003', type:'per_item_cap', enabled:true, category:'Meals', threshold:60,
   title:'Meals over EUR 60 per head need review',
   detail:'Line total converted to base currency, divided by the head count on the document.'},
  {id:'POL-004', type:'daily_cap', enabled:true, category:'Meals', threshold:120,
   title:'Total meals over EUR 120 per day need review',
   detail:'Summed across every document in the claim bearing the same transaction date.'},
  {id:'POL-005', type:'required_evidence', enabled:true, category:'Accommodation', threshold:200,
   title:'Accommodation over EUR 200 requires an itemised invoice',
   detail:'Satisfied when an itemised invoice is attested on the document in step 5.'}
];
const CONF_FLOOR = 0.60;
/* ══ receipt facsimile renderer ═════════════════════════════════════
   Synthetic demo documents. Drawn as SVG so the file stays standalone —
   no external images, nothing to fetch. Always dark ink on white paper,
   because this stands in for a photograph of paper. */
const CJK_FACE = "Malgun Gothic, Microsoft YaHei, Noto Sans CJK KR, Apple SD Gothic Neo, sans-serif";
const MONO_FACE = "Consolas, Courier New, monospace";
const HAND_FACE = "Segoe Script, Ink Free, Bradley Hand, cursive";

function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function receiptSvg(spec){
  const W = 300, L = 20, R = W - 20, MID = W / 2;
  const face = spec.face || MONO_FACE;
  const ink = '#141414';
  let y = 0;
  const el = [];
  const txt = (x, s, o) => {
    o = o || {};
    el.push('<text x="' + x + '" y="' + y + '" font-family="' + (o.face || face) + '"'
      + ' font-size="' + (o.size || 8.6) + '" font-weight="' + (o.w || 400) + '"'
      + ' text-anchor="' + (o.anchor || 'start') + '" fill="' + ink + '"'
      + ' opacity="' + (o.op || 1) + '"' + (o.extra || '') + '>' + esc(s) + '</text>');
  };
  const rule = (dash) => {
    el.push('<line x1="' + L + '" y1="' + y + '" x2="' + R + '" y2="' + y + '"'
      + ' stroke="' + ink + '" stroke-width="0.7" opacity="0.5"'
      + (dash ? ' stroke-dasharray="2 2"' : '') + '/>');
  };

  y = 26;
  (spec.head || []).forEach((h, i) => {
    txt(MID, h.t, {anchor:'middle', size:h.size || (i === 0 ? 11 : 8.4),
      w:h.w || (i === 0 ? 600 : 400), face:h.face || (spec.headFace || face), op:h.op});
    y += (h.gap || (i === 0 ? 14 : 11));
  });

  y += 3; rule(); y += 12;
  (spec.info || []).forEach(r => {
    txt(L, r[0], {size:7.8, op:.82}); txt(R, r[1], {size:7.8, anchor:'end', op:.82}); y += 10;
  });

  y += 2; rule(true); y += 13;
  (spec.items || []).forEach(it => {
    txt(L, it.d, {size:it.size || 8.6, face:it.face || spec.itemFace || face, w:it.w || 400, op:it.op});
    txt(R, it.a, {size:8.6, anchor:'end', op:it.op});
    y += 11;
    if (it.sub){ txt(L + 8, it.sub, {size:7.4, op:(it.op || 1) * .72}); y += 10; }
  });

  y += 3; rule(true); y += 13;
  (spec.totals || []).forEach(t => {
    txt(L, t[0], {size:t[2] ? 9.6 : 8.4, w:t[2] ? 600 : 400, op:t[3] || 1});
    txt(R, t[1], {size:t[2] ? 9.6 : 8.4, w:t[2] ? 600 : 400, anchor:'end', op:t[3] || 1});
    y += t[2] ? 14 : 11;
  });

  y += 4; rule(); y += 13;
  (spec.foot || []).forEach(f => {
    txt(MID, f, {size:7.4, anchor:'middle', op:.62}); y += 10;
  });

  const H = y + 12;
  const paper = '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#fdfdfc"/>'
    + '<rect x="0.5" y="0.5" width="' + (W - 1) + '" height="' + (H - 1) + '" fill="none"'
    + ' stroke="#141414" stroke-opacity="0.12"/>';
  const grain = spec.aged
    ? '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#141414" opacity="0.035"/>'
    : '';
  const tilt = spec.tilt ? ' transform="rotate(' + spec.tilt + ' ' + (W / 2) + ' ' + (H / 2) + ')"' : '';
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="'
    + esc(spec.alt || 'Receipt facsimile') + '" xmlns="http://www.w3.org/2000/svg">'
    + paper + '<g' + tilt + '>' + el.join('') + '</g>' + grain + '</svg>';
}
/* ══ fixtures ═══════════════════════════════════════════════════════
   Four synthetic receipts and the extraction each one yields. In a wired
   build `ext` would be the model's response; here it is pre-recorded, so
   the demo never depends on a network call in a meeting room. */
function L(orig, gloss, qty, unit, total, cat, taxRate, conf){
  return {orig:orig, gloss:gloss, qty:qty, unit:unit, total:total,
          cat:cat, taxRate:taxRate, conf:conf || {}};
}

const FIXTURES = [];

FIXTURES.push({
  id:'RCP-01', label:'Restaurant — Busan', script:'Korean (ko-KR)', currency:'KRW',
  purpose:'Non-Latin script, line-item extraction, and the alcohol exclusion',
  doc:{
    alt:'Korean restaurant receipt from Busan, printed in Hangul',
    headFace:CJK_FACE, itemFace:CJK_FACE,
    head:[{t:'해운대 소갈비'},{t:'HAEUNDAE SO-GALBI · 본점', size:7.6, face:MONO_FACE}],
    info:[['사업자 617-81-04204','TABLE 7'],['부산 해운대구 구남로 21','2인'],
          ['2026-08-18','20:41'],['영수증 A-20268','POS 02']],
    items:[
      {d:'한우 정식 코스', a:'220,000', sub:'2 x 110,000'},
      {d:'참이슬 후레쉬 360ml', a:'10,000', sub:'2 x 5,000'},
      {d:'카스 생맥주 500cc', a:'14,000', sub:'2 x 7,000'},
      {d:'공기밥', a:'4,000', sub:'2 x 2,000'}],
    totals:[['과세물품가액','225,455'],['부가세 10%','22,545'],['합계 KRW','248,000',true]],
    foot:['카드결제  신한 ****4471','감사합니다']
  },
  ext:{
    merchant:['해운대 소갈비 (Haeundae So-Galbi)', .96],
    address:['부산 해운대구 구남로 21, Busan', .91],
    country:['Korea, Republic of', .97],
    docNo:['A-20268', .93],
    date:['2026-08-18', .97], time:['20:41', .93],
    currency:['KRW', .99], heads:[2, .86],
    taxInclusive:true, itemisedInvoice:true,
    clientEntertainment:true,
    entertainmentNote:'Dae Sung HI yard superintendent and owner’s representative present — docking spec review',
    docTotal:[248000, .98],
    alloc:[{target:'V-ATL', share:60},{target:'V-KYR', share:40}],
    allocReason:'Yard dinner covered the Atlantic Sentinel docking in progress and the Kyrenia Star docking spec quoted by the same yard.',
    lines:[
      L('한우 정식 코스','Hanwoo beef set course', 2, 110000, 220000, 'Meals', 10, {orig:.97,total:.96}),
      L('참이슬 후레쉬 360ml','Chamisul Fresh soju, 360ml', 2, 5000, 10000, 'Alcohol', 10, {orig:.94,total:.95}),
      L('카스 생맥주 500cc','Cass draught beer, 500cc', 2, 7000, 14000, 'Alcohol', 10, {orig:.92,total:.94}),
      L('공기밥','Steamed rice', 2, 2000, 4000, 'Meals', 10, {orig:.97,total:.97})
    ]
  }
});

FIXTURES.push({
  id:'RCP-02', label:'Hotel folio — Shanghai', script:'Chinese (zh-CN)', currency:'CNY',
  purpose:'One document spanning four categories with mixed policy outcomes',
  doc:{
    alt:'Chinese hotel folio from Shanghai, printed in simplified Chinese',
    headFace:CJK_FACE, itemFace:CJK_FACE,
    head:[{t:'上海浦东嘉里大酒店'},
          {t:'KERRY HOTEL PUDONG · GUEST FOLIO', size:7.4, face:MONO_FACE}],
    info:[['房号 ROOM','1812'],['花木路1388号 浦东新区','GUEST 1'],
          ['入住 2026-08-18','退房 2026-08-21'],['账单号','FOL-88214']],
    items:[
      {d:'客房费 3晚', a:'2,340.00', sub:'3 x 780.00'},
      {d:'迷你吧 青岛啤酒', a:'90.00', sub:'2 x 45.00'},
      {d:'洗衣服务', a:'120.00'},
      {d:'商务中心 打印', a:'35.00'},
      {d:'早餐 3份', a:'264.00', sub:'3 x 88.00'}],
    totals:[['小计','2,687.74'],['增值税 6%','161.26'],['应付总额 CNY','2,849.00',true]],
    foot:['增值税专用发票已开具','客人签名  D. CHARALAMBOUS']
  },
  ext:{
    merchant:['上海浦东嘉里大酒店 (Kerry Hotel Pudong)', .95],
    address:['花木路1388号, 浦东新区, Shanghai', .9],
    country:['China', .98],
    docNo:['FOL-88214', .96],
    date:['2026-08-21', .95], time:['11:04', .82],
    currency:['CNY', .99], heads:[1, .9],
    taxInclusive:true, itemisedInvoice:true,
    clientEntertainment:false, entertainmentNote:'',
    docTotal:[2849, .97],
    alloc:[{target:'V-KYR', share:100}],
    allocReason:'Whole stay attributable to the Kyrenia Star drydock at Hudong-Zhonghua.',
    lines:[
      L('客房费 3晚','Room charge, 3 nights', 3, 780, 2340, 'Accommodation', 6, {orig:.95,total:.96}),
      L('迷你吧 青岛啤酒','Minibar — Tsingtao beer', 2, 45, 90, 'Alcohol', 6, {orig:.88,total:.9}),
      L('洗衣服务','Laundry service', 1, 120, 120, 'Laundry', 6, {orig:.94,total:.95}),
      L('商务中心 打印','Business centre — printing', 1, 35, 35, 'Supplies', 6, {orig:.9,total:.93}),
      L('早餐 3份','Breakfast, 3 servings', 3, 88, 264, 'Meals', 6, {orig:.92,total:.94})
    ]
  }
});
FIXTURES.push({
  id:'RCP-03', label:'Taverna — Piraeus', script:'Greek (el-GR)', currency:'EUR',
  purpose:'VAT itemised at two rates — the recoverable-VAT figure',
  doc:{
    alt:'Greek taverna receipt from Piraeus with itemised VAT',
    head:[{t:'Ο ΜΙΚΡΟΛΙΜΑΝΟΣ'},
          {t:'ΤΑΒΕΡΝΑ · ΑΚΤΗ ΚΟΥΜΟΥΝΔΟΥΡΟΥ 48', size:7.2},
          {t:'ΠΕΙΡΑΙΑΣ 185 33', size:7.2}],
    info:[['ΑΦΜ 099384712','ΔΟΥ ΠΕΙΡΑΙΑ'],['ΑΠΟΔΕΙΞΗ','4471'],
          ['2026-08-25','13:22'],['ΑΤΟΜΑ','1']],
    items:[
      {d:'ΧΩΡΙΑΤΙΚΗ ΣΑΛΑΤΑ      Α', a:'9.50'},
      {d:'ΨΗΤΟ ΞΙΦΙΑΣ           Α', a:'22.00'},
      {d:'ΠΑΤΑΤΕΣ ΤΗΓΑΝΗΤΕΣ     Α', a:'5.00'},
      {d:'ΚΡΑΣΙ ΧΥΜΑ 500ML      Β', a:'8.00'},
      {d:'ΝΕΡΟ 1L               Α', a:'1.50'},
      {d:'ΚΑΦΕΣ ΕΛΛΗΝΙΚΟΣ  x2   Β', a:'5.00'}],
    totals:[['ΚΑΘΑΡΗ ΑΞΙΑ  Α 13%','33.63'],['ΦΠΑ 13%','4.37'],
            ['ΚΑΘΑΡΗ ΑΞΙΑ  Β 24%','10.48'],['ΦΠΑ 24%','2.52'],
            ['ΣΥΝΟΛΟ EUR','51.00',true]],
    foot:['ΦΠΑ ΣΥΝΟΛΟ 6.89','ΕΥΧΑΡΙΣΤΟΥΜΕ']
  },
  ext:{
    merchant:['Ταβέρνα Ο Μικρολίμανος', .97],
    address:['Ακτή Κουμουνδούρου 48, Πειραιάς 185 33', .94],
    country:['Greece', .99],
    docNo:['4471', .96],
    date:['2026-08-25', .97], time:['13:22', .95],
    currency:['EUR', .99], heads:[1, .93],
    taxInclusive:true, itemisedInvoice:true,
    clientEntertainment:false, entertainmentNote:'',
    docTotal:[51, .98],
    alloc:[{target:'V-AEG', share:100}],
    allocReason:'Lunch during the Aegean Trader crew handover at Piraeus.',
    lines:[
      L('ΧΩΡΙΑΤΙΚΗ ΣΑΛΑΤΑ','Village salad', 1, 9.5, 9.5, 'Meals', 13, {orig:.97,total:.98}),
      L('ΨΗΤΟ ΞΙΦΙΑΣ','Grilled swordfish', 1, 22, 22, 'Meals', 13, {orig:.96,total:.98}),
      L('ΠΑΤΑΤΕΣ ΤΗΓΑΝΗΤΕΣ','Fried potatoes', 1, 5, 5, 'Meals', 13, {orig:.97,total:.98}),
      L('ΚΡΑΣΙ ΧΥΜΑ 500ML','House wine, 500ml', 1, 8, 8, 'Alcohol', 24, {orig:.95,total:.97}),
      L('ΝΕΡΟ 1L','Water, 1L', 1, 1.5, 1.5, 'Meals', 13, {orig:.98,total:.98}),
      L('ΚΑΦΕΣ ΕΛΛΗΝΙΚΟΣ','Greek coffee', 2, 2.5, 5, 'Meals', 24, {orig:.94,total:.96})
    ]
  }
});

FIXTURES.push({
  id:'RCP-04', label:'Taxi, handwritten — Piraeus', script:'Greek (el-GR), handwritten',
  currency:'EUR',
  purpose:'Low-confidence extraction and the human-correction path',
  doc:{
    alt:'Faded handwritten Greek taxi receipt',
    aged:true, tilt:-1.4, face:HAND_FACE, headFace:HAND_FACE, itemFace:HAND_FACE,
    head:[{t:'ΤΑΞΙ ΠΕΙΡΑΙΑ', size:13, op:.8},
          {t:'ΑΡ. ΑΔΕΙΑΣ  ΠΕ—4?81', size:9, op:.55}],
    info:[['ΗΜ/ΝΙΑ  25/08/2?','—']],
    items:[
      {d:'ΚΟΜΙΣΤΡΟ ΠΕΙΡΑΙΑΣ—ΑΕΡΟΔΡ.', a:'34,00', size:10, op:.62},
      {d:'ΔΙΟΔΙΑ', a:'2,80', size:10, op:.7}],
    totals:[['ΣΥΝΟΛΟ','36,80',true,.68]],
    foot:['(υπογραφή)']
  },
  ext:{
    merchant:['ΤΑΞΙ ΠΕΙΡΑΙΑ (licence ΠΕ-4?81 — partly illegible)', .38],
    address:['Πειραιάς, Greece', .55],
    country:['Greece', .9],
    docNo:['— none printed —', .3],
    date:['2026-08-25', .52], time:['', .2],
    currency:['EUR', .95], heads:[1, .6],
    taxInclusive:true, itemisedInvoice:false,
    clientEntertainment:false, entertainmentNote:'',
    docTotal:[86.8, .41],
    alloc:[{target:'V-AEG', share:70},{target:'CC-LIM', share:30}],
    allocReason:'Airport transfer at the end of the Piraeus leg; 30% carried by the Limassol office as return-travel overhead.',
    lines:[
      L('ΚΟΜΙΣΤΡΟ ΠΕΙΡΑΙΑΣ—ΑΕΡΟΔΡ.','Fare, Piraeus to airport', 1, 84, 84,
        'Ground transport', 0, {orig:.58,total:.41}),
      L('ΔΙΟΔΙΑ','Tolls', 1, 2.8, 2.8, 'Ground transport', 0, {orig:.62,total:.55})
    ],
    lowConfNote:'Handwritten comma decimals and a smudged total. The document reads 34,00 — the extraction proposed 84.00. Correct it in step 5 and both values are kept.'
  }
});
