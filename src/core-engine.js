/* ══ helpers ════════════════════════════════════════════════════════ */
const DP = {KRW:0, JPY:0};
function dp(cur){ return DP[cur] === undefined ? 2 : DP[cur]; }
function money(n, cur){
  const d = dp(cur);
  return (Number(n) || 0).toLocaleString('en-GB', {minimumFractionDigits:d, maximumFractionDigits:d});
}
function eur(n){ return money(n, BASE); }
function F(pair){
  const v = Array.isArray(pair) ? pair[0] : pair;
  const c = Array.isArray(pair) ? (pair[1] === undefined ? .99 : pair[1]) : .99;
  return {ai:v, value:v, conf:c, edited:false};
}
function setField(f, v){
  if (String(f.value) === String(v)) return false;
  f.value = v;
  f.edited = String(v) !== String(f.ai);
  return true;
}
function targetById(id){
  return VESSELS.find(v => v.id === id) || CENTRES.find(c => c.id === id) || null;
}
function ownerOfTarget(id){
  const v = VESSELS.find(x => x.id === id);
  return v ? OWNERS.find(o => o.id === v.owner) : null;
}
function ruleById(id){ return state.policy.find(r => r.id === id); }
function fxFor(receipt){
  if (receipt.fxOverride){
    return {rate:Number(receipt.fxOverride.rate), date:receipt.fxOverride.date,
            source:'Manual override — card settlement rate', overridden:true};
  }
  const cur = receipt.currency.value, d = receipt.date.value;
  if (cur === BASE) return {rate:1, date:d, source:'Base currency — no conversion applied', overridden:false};
  const hit = FX_TABLE[cur + '|' + d];
  if (hit) return {rate:hit, date:d, source:FX_SOURCE, overridden:false};
  const fallback = Object.keys(FX_TABLE).find(k => k.indexOf(cur + '|') === 0);
  return fallback
    ? {rate:FX_TABLE[fallback], date:fallback.split('|')[1], source:FX_SOURCE + ' — nearest available date', overridden:false}
    : {rate:null, date:null, source:'No fixture rate held for ' + cur + ' on ' + d, overridden:false};
}
function daysSince(iso){
  return Math.round((Date.parse(TODAY) - Date.parse(iso)) / 86400000);
}
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._h); toast._h = setTimeout(() => t.classList.remove('on'), 2200);
}
function logAudit(receiptId, field, from, to){
  state.audit.push({receipt:receiptId, field:field, from:from, to:to,
    at:new Date().toISOString().slice(11,19) + ' local'});
}

/* build a live receipt from a fixture's recorded extraction */
function instantiate(fx){
  const e = fx.ext;
  return {
    id:fx.id, fixture:fx.id, label:fx.label, script:fx.script, purpose:fx.purpose,
    merchant:F(e.merchant), address:F(e.address), country:F(e.country), docNo:F(e.docNo),
    date:F(e.date), time:F(e.time), currency:F(e.currency), heads:F(e.heads),
    docTotal:F(e.docTotal),
    taxInclusive:e.taxInclusive, itemisedInvoice:e.itemisedInvoice,
    clientEntertainment:e.clientEntertainment, entertainmentNote:e.entertainmentNote || '',
    allocReason:e.allocReason || '', lowConfNote:e.lowConfNote || '',
    confirmed:false,
    fxOverride:null,
    alloc:e.alloc.map(a => Object.assign({}, a)),
    lines:e.lines.map((l, i) => ({
      id:fx.id + '-L' + (i + 1),
      orig:F([l.orig, l.conf.orig]), gloss:F([l.gloss, l.conf.gloss === undefined ? (l.conf.orig || .95) : l.conf.gloss]),
      qty:F([l.qty, l.conf.qty === undefined ? .95 : l.conf.qty]),
      unit:F([l.unit, l.conf.unit === undefined ? (l.conf.total || .95) : l.conf.unit]),
      total:F([l.total, l.conf.total]),
      cat:F([l.cat, l.conf.cat === undefined ? .93 : l.conf.cat]),
      taxRate:F([l.taxRate, .95]),
      note:'', alloc:null
    }))
  };
}
/* ══ policy engine ══════════════════════════════════════════════════
   Rules are read from state.policy at evaluation time, so toggling one
   recomputes every claim total without touching this function. */
function evaluateClaim(){
  const rs = state.claim.receipts;

  /* claim-wide meal totals per transaction date, for the daily cap */
  const mealsByDate = {};
  rs.forEach(r => {
    const fx = fxFor(r);
    if (fx.rate === null) return;
    r.lines.forEach(l => {
      if (l.cat.value !== 'Meals') return;
      const d = r.date.value;
      mealsByDate[d] = (mealsByDate[d] || 0) + Number(l.total.value) * fx.rate;
    });
  });

  rs.forEach(r => {
    const fx = fxFor(r);
    r._fx = fx;
    r.lines.forEach(l => {
      const base = fx.rate === null ? 0 : Number(l.total.value) * fx.rate;
      const rules = [];
      let status = 'reimbursable';
      const flag = eff => { if (status !== 'excluded') status = eff; };

      if (l.cat.value === 'Alcohol'){
        const p1 = ruleById('POL-001'), p2 = ruleById('POL-002');
        if (p1.enabled){
          if (p2.enabled && r.clientEntertainment){
            rules.push({id:'POL-002', effect:'allowed',
              detail:'Client entertainment attested on this document — POL-001 overridden'});
          } else {
            status = 'excluded';
            rules.push({id:'POL-001', effect:'excluded',
              detail:p2.enabled
                ? 'Client entertainment is not attested on this document, so the exception does not apply'
                : 'Alcohol is not reimbursable under the active policy set'});
          }
        }
      }

      if (l.cat.value === 'Meals'){
        const p3 = ruleById('POL-003');
        const heads = Math.max(1, Number(r.heads.value) || 1);
        if (p3.enabled && base / heads > p3.threshold){
          flag('review');
          rules.push({id:'POL-003', effect:'review',
            detail:'EUR ' + eur(base / heads) + ' per head across ' + heads
              + ' — cap is EUR ' + p3.threshold});
        }
        const p4 = ruleById('POL-004');
        const dayTotal = mealsByDate[r.date.value] || 0;
        if (p4.enabled && dayTotal > p4.threshold){
          flag('review');
          rules.push({id:'POL-004', effect:'review',
            detail:'EUR ' + eur(dayTotal) + ' of meals claimed on ' + r.date.value
              + ' — cap is EUR ' + p4.threshold});
        }
      }

      if (l.cat.value === 'Accommodation'){
        const p5 = ruleById('POL-005');
        if (p5.enabled && base > p5.threshold){
          if (r.itemisedInvoice){
            rules.push({id:'POL-005', effect:'satisfied',
              detail:'Itemised invoice attested — evidence requirement met'});
          } else {
            flag('review');
            rules.push({id:'POL-005', effect:'review',
              detail:'EUR ' + eur(base) + ' exceeds EUR ' + p5.threshold
                + ' and no itemised invoice is attested'});
          }
        }
      }

      const minConf = Math.min(l.total.conf, l.orig.conf, l.qty.conf);
      const humanFixed = l.total.edited || l.orig.edited || l.qty.edited;
      if (minConf < CONF_FLOOR && !humanFixed){
        flag('review');
        rules.push({id:'SYS-CONF', effect:'review',
          detail:'Extraction confidence ' + Math.round(minConf * 100)
            + '% is below the ' + Math.round(CONF_FLOOR * 100) + '% floor — needs human confirmation'});
      }

      l._base = base;
      l._status = status;
      l._rules = rules;
      l._tax = Number(l.taxRate.value) > 0
        ? base * Number(l.taxRate.value) / (100 + Number(l.taxRate.value)) : 0;
      l._taxOrig = Number(l.taxRate.value) > 0
        ? Number(l.total.value) * Number(l.taxRate.value) / (100 + Number(l.taxRate.value)) : 0;
      l._minConf = minConf;
    });
  });
}

function receiptTotals(r){
  let gross = 0, excluded = 0, vat = 0, review = 0;
  r.lines.forEach(l => {
    gross += l._base;
    if (l._status === 'excluded') excluded += l._base;
    else { vat += l._tax; if (l._status === 'review') review += l._base; }
  });
  return {gross:gross, excluded:excluded, reimbursable:gross - excluded, vat:vat, review:review};
}

function claimTotals(){
  const t = {gross:0, excluded:0, reimbursable:0, vat:0, review:0, byTarget:{}, byOwner:{}};
  state.claim.receipts.forEach(r => {
    const rt = receiptTotals(r);
    t.gross += rt.gross; t.excluded += rt.excluded;
    t.reimbursable += rt.reimbursable; t.vat += rt.vat; t.review += rt.review;
    r.lines.forEach(l => {
      if (l._status === 'excluded') return;
      allocFor(r, l).forEach(a => {
        const amt = l._base * (Number(a.share) || 0) / 100;
        t.byTarget[a.target] = (t.byTarget[a.target] || 0) + amt;
        const o = ownerOfTarget(a.target);
        const key = o ? o.id : 'CC';
        t.byOwner[key] = (t.byOwner[key] || 0) + amt;
      });
    });
  });
  return t;
}

function allocFor(r, l){ return (l.alloc && l.alloc.length) ? l.alloc : r.alloc; }
function allocSum(a){ return a.reduce((s, x) => s + (Number(x.share) || 0), 0); }
function allocValid(a){
  return a.length > 0 && a.every(x => x.target) && Math.abs(allocSum(a) - 100) < 0.01;
}
function receiptAllocValid(r){
  if (!allocValid(r.alloc)) return false;
  return r.lines.every(l => !l.alloc || !l.alloc.length || allocValid(l.alloc));
}
function ruleBite(id){
  let lines = 0, amount = 0, met = 0;
  state.claim.receipts.forEach(r => r.lines.forEach(l => {
    (l._rules || []).forEach(x => {
      if (x.id !== id) return;
      if (x.effect === 'excluded' || x.effect === 'review'){ lines++; amount += l._base; }
      else met++;
    });
  }));
  return {lines:lines, amount:amount, met:met};
}
/* ══ review — shared field widgets ══════════════════════════════════ */
function confBar(conf){
  const pct = Math.round(conf * 100);
  return '<span class="conf ' + (conf < CONF_FLOOR ? 'low' : '') + '" title="Extraction confidence">'
    + '<span class="bar"><i style="width:' + pct + '%"></i></span>' + pct + '%</span>';
}
function editedNote(f, cur){
  if (!f.edited) return '';
  const a = cur ? money(f.ai, cur) : esc(String(f.ai));
  const v = cur ? money(f.value, cur) : esc(String(f.value));
  return '<span class="edited"><span class="badge outline" style="padding:0 6px">edited</span>'
    + 'AI read <s>' + a + '</s> → <b style="font-weight:600">' + v + '</b></span>';
}
function fieldInput(rid, path, f, o){
  o = o || {};
  return '<input class="input sm ' + (o.mono ? 'mono' : '') + '"'
    + (o.type ? ' type="' + o.type + '"' : '')
    + (o.step ? ' step="' + o.step + '"' : '')
    + ' data-edit="' + path + '" data-rcp="' + rid + '"'
    + (o.lid ? ' data-line="' + o.lid + '"' : '')
    + ' value="' + esc(String(f.value)) + '"'
    + (o.style ? ' style="' + o.style + '"' : '') + '>';
}
function catSelect(rid, lid, f){
  return '<select class="select sm" data-edit="cat" data-rcp="' + rid + '" data-line="' + lid + '">'
    + CATEGORIES.map(c => '<option ' + (c === f.value ? 'selected' : '') + '>' + c + '</option>').join('')
    + '</select>';
}
function statusBadge(st){
  if (st === 'excluded') return '<span class="badge solid">Excluded</span>';
  if (st === 'review')   return '<span class="badge striped">Needs review</span>';
  return '<span class="badge outline dot">Reimbursable</span>';
}

/* ══ the reading sequence ═══════════════════════════════════════════ */
function runReading(fixture, fast, done){
  const stages = [
    'Reading document image',
    'Detecting language — ' + fixture.script,
    'Extracting line items',
    'Translating to English',
    'Normalising categories',
    'Applying policy set'
  ];
  const ov = document.getElementById('overlay');
  const ul = document.getElementById('readStages');
  const bar = document.getElementById('readBar');
  document.getElementById('readTitle').textContent = 'AI is reading ' + fixture.id;
  document.getElementById('readSub').textContent = fixture.label + ' · ' + fixture.currency;
  ov.classList.add('on');
  let i = 0;
  const step = () => {
    ul.innerHTML = stages.map((s, k) =>
      '<li class="' + (k < i ? 'done' : k === i ? 'doing' : '') + '">'
      + '<span class="m">' + (k < i ? '✓' : k === i ? '<span class="spin"></span>' : '·') + '</span>'
      + '<span>' + s + '</span></li>').join('');
    bar.style.width = Math.round(i / stages.length * 100) + '%';
    i++;
    if (i <= stages.length) setTimeout(step, fast ? 130 : 330);
    else {
      bar.style.width = '100%';
      setTimeout(() => { ov.classList.remove('on'); done(); }, fast ? 90 : 220);
    }
  };
  step();
}

function capture(fixtureId, fast, then){
  const fx = FIXTURES.find(f => f.id === fixtureId);
  if (!fx) return;
  if (state.claim.receipts.some(r => r.id === fx.id)){
    state.activeReceipt = fx.id;
    afterCapture();
    return;
  }
  runReading(fx, fast, () => {
    state.claim.receipts.push(instantiate(fx));
    state.claim.receipts.sort((a, b) => a.id.localeCompare(b.id));
    state.activeReceipt = fx.id;
    if (then) then();
    else { afterCapture(); toast(fx.id + ' read — ' + fx.ext.lines.length + ' line items'); }
  });
}
function captureAll(){
  const pending = FIXTURES.map(f => f.id).filter(id => !state.claim.receipts.some(r => r.id === id));
  if (!pending.length){ state.activeReceipt = FIXTURES[0].id; afterCapture(); return; }
  const next = () => {
    const id = pending.shift();
    if (!id){
      state.activeReceipt = FIXTURES[0].id;
      afterCapture();
      toast('All four documents read');
      return;
    }
    capture(id, true, next);
  };
  next();
}

/* ══ mutation helpers ═══════════════════════════════════════════════ */
function receipt(id){ return state.claim.receipts.find(r => r.id === id); }
function lineOf(r, lid){ return r.lines.find(l => l.id === lid); }
function scopeOf(rid, lid){
  const r = receipt(rid);
  if (!r) return null;
  if (!lid) return {r:r, list:r.alloc, amt:receiptTotals(r).reimbursable};
  const l = lineOf(r, lid);
  if (!l.alloc) l.alloc = [];
  return {r:r, l:l, list:l.alloc, amt:l._base};
}
function balance(list){
  if (!list.length) return;
  const rest = list.slice(0, -1).reduce((s, x) => s + (Number(x.share) || 0), 0);
  list[list.length - 1].share = Math.round((100 - rest) * 10) / 10;
}
function unusedTarget(list){
  const all = VESSELS.map(v => v.id).concat(CENTRES.map(c => c.id));
  return all.find(id => !list.some(a => a.target === id)) || all[0];
}

/* ══ icons ══════════════════════════════════════════════════════════
   Lucide-style line icons, inlined. 24px viewBox, 1.5px stroke,
   currentColor, rounded caps. No glyphs, no emoji, no icon font. */
const ICONS = {
  receipt:'<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h4"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  send:'<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  file:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h5"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  split:'<path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.17-2.83L3 3"/><path d="M21 3l-7.83 7.87A4 4 0 0 0 12 13.7v.3"/>',
  ledger:'<path d="M17 12H3"/><path d="m11 18 6-6-6-6"/><path d="M21 5v14"/>',
  dashboard:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  scale:'<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  ask:'<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
  x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  monitor:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
  ship:'<path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.4 12 22 14l-2 5"/><path d="M4.6 12 2 14l2 5"/><path d="M12 2v3"/><path d="M4.6 12h14.8L12 5Z"/>'
};
function icon(name, size){
  const p = ICONS[name];
  if (!p) return '';
  const s = size || 18;
  return '<svg class="ic" viewBox="0 0 24 24" width="' + s + '" height="' + s + '"'
    + ' fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"'
    + ' stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
}
