/* ══ Superintendent app ═════════════════════════════════════════════
   One job: photograph the receipts, check what was read off them, say
   which vessel you were attending, send it in. No policy switches, no
   percentages, no VAT recovery, no export — those are finance's, and
   putting them here is what made the earlier build feel heavy. */

const state = {
  view:'capture',
  policy:POLICY.map(r => Object.assign({}, r)),   /* read-only here */
  claim:{
    id:'CLM-2026-0184', status:'draft',
    title:'Busan · Shanghai · Piraeus — attendance trip',
    traveller:'D. Charalambous', role:'Senior Technical Superintendent',
    period:'17–25 Aug 2026', submittedOn:null,
    legs:[['17–19 Aug','Busan (KR)'],['19–22 Aug','Shanghai (CN)'],['24–25 Aug','Piraeus (GR)']],
    receipts:[]
  },
  history:[],
  audit:[],
  activeReceipt:null
};

const STEPS = [
  {n:1, label:'Receipts', view:'capture'},
  {n:2, label:'Check',    view:'check'},
  {n:3, label:'Send',     view:'send'}
];
const NAV = [
  {id:'capture', label:'Receipts', glyph:'receipt'},
  {id:'check',   label:'Check',    glyph:'check', needsDoc:true},
  {id:'send',    label:'Send in',  glyph:'send', needsDoc:true}
];
const PANE_COPY = {
  capture:['Your receipts', 'Photograph them as you go. Four samples are loaded for the demo.'],
  check:['Check what was read', 'Fix anything wrong, then say which vessel you were attending.'],
  send:['Send to finance', 'One last look before it goes to the Limassol office.']
};

/* the superintendent tags vessels; finance sets the percentages */
function tagsOf(r){
  if (!r.tags) r.tags = r.alloc.map(a => a.target);
  return r.tags;
}
function toggleTag(r, id){
  const t = tagsOf(r);
  const i = t.indexOf(id);
  if (i >= 0) t.splice(i, 1); else t.push(id);
}
function readyToSend(){
  const rs = state.claim.receipts;
  return rs.length > 0 && rs.every(r => r.confirmed && tagsOf(r).length > 0);
}
function afterCapture(){ go('check'); }

/* ── chrome ──────────────────────────────────────────────────────── */
function currentStep(){
  return state.view === 'capture' ? 1 : state.view === 'check' ? 2 : 3;
}
function stepDone(n){
  const rs = state.claim.receipts;
  if (n === 1) return rs.length > 0;
  if (n === 2) return readyToSend();
  return state.claim.status !== 'draft';
}
function stepper(){
  return '<ol class="stepper">' + STEPS.map(s => {
    const on = currentStep() === s.n;
    return '<li class="' + (on ? 'on ' : '') + (stepDone(s.n) ? 'done' : '') + '">'
      + '<button type="button" data-view="' + s.view + '">'
      + '<span class="dot">' + (stepDone(s.n) && !on ? icon('check',15) : s.n) + '</span>'
      + '<span class="lb">' + s.label + '</span></button></li>';
  }).join('') + '</ol>';
}

function renderChrome(){
  const c = state.claim, hasDoc = c.receipts.length > 0;

  document.getElementById('mainNav').innerHTML =
    NAV.filter(v => !v.needsDoc || hasDoc).map(v =>
      '<li class="' + (state.view === v.id ? 'on' : '') + '">'
      + '<button type="button" data-view="' + v.id + '">'
      + '<span class="n">' + icon(v.glyph) + '</span><span>' + v.label + '</span>'
      + '<span class="tick">' + (v.id === 'capture' && hasDoc ? c.receipts.length : '') + '</span>'
      + '</button></li>').join('');

  const copy = PANE_COPY[state.view];
  document.getElementById('paneTitle').textContent = copy[0];
  document.getElementById('paneLede').textContent = copy[1];

  const tabs = document.getElementById('quickTabs');
  if (state.view === 'check' && hasDoc){
    tabs.style.display = 'flex';
    tabs.innerHTML = c.receipts.map(r =>
      '<button type="button" role="tab" data-rcp="' + r.id + '"'
      + ' aria-selected="' + (state.activeReceipt === r.id) + '">'
      + r.id.replace('RCP-', '#') + (r.confirmed && tagsOf(r).length ? icon('check',13) : '') + '</button>').join('');
  } else { tabs.style.display = 'none'; tabs.innerHTML = ''; }

  /* no totals strip here — the claiming figure sits at the foot of the
     line list, where the numbers it sums are. */
  const strip = document.getElementById('summaryStrip');
  strip.style.display = 'none';
  strip.innerHTML = '';
}

/* ── 1. receipts ─────────────────────────────────────────────────── */
function renderCapture(){
  const used = state.claim.receipts.map(r => r.id);
  const pending = FIXTURES.length - used.length;
  const cards = FIXTURES.map(f =>
    '<button type="button" class="fx-card ' + (used.indexOf(f.id) >= 0 ? 'used' : '') + '"'
    + ' data-fixture="' + f.id + '">'
    + '<span class="thumb">' + receiptSvg(f.doc) + '</span>'
    + '<span class="meta"><span class="n">' + f.label + '</span>'
    + '<span class="p">' + f.currency + ' · ' + f.script + '</span>'
    + '<span class="f"><span>' + (used.indexOf(f.id) >= 0 ? 'Read' : 'Open') + '</span>'
    + '<span>' + f.id.replace('RCP-', '#') + '</span></span></span></button>').join('');

  document.getElementById('pane-capture').innerHTML =
    '<div class="stack" style="max-width:820px">'
    + stepper()
    + '<div class="drop" id="drop">'
    + '<div class="drop-icon">' + icon('upload',22) + '</div>'
    + '<div class="big">Add a receipt</div>'
    + '<div class="sm" id="dropMsg">Photograph it now and forget it — or '
    + '<label class="link">choose a file<input type="file" id="file" class="sr"'
    + ' accept="image/*,.pdf"></label>.</div></div>'
    + '<div class="or"><span>or open a sample</span></div>'
    + '<div class="fixtures">' + cards + '</div>'
    + (pending > 1
        ? '<div style="display:flex;justify-content:center">'
          + '<button class="btn sm" type="button" id="loadAll">Read all ' + pending
          + ' at once</button></div>' : '')
    + (used.length
        ? '<div style="display:flex;justify-content:center">'
          + '<button class="btn primary" type="button" data-view="check">'
          + 'Check ' + used.length + ' receipt' + (used.length === 1 ? '' : 's') + '</button></div>'
        : '')
    + '</div>';
}

/* ── 2. check one receipt ────────────────────────────────────────── */
function renderCheck(){
  const el = document.getElementById('pane-check');
  const r = state.claim.receipts.find(x => x.id === state.activeReceipt);
  if (!r){
    el.innerHTML = '<div class="card"><div class="empty">No receipts yet.'
      + '<div style="margin-top:12px"><button class="btn sm primary" type="button"'
      + ' data-view="capture">Add one</button></div></div></div>';
    return;
  }
  const fx = r._fx, cur = r.currency.value, t = receiptTotals(r);
  const tags = tagsOf(r);
  const next = state.claim.receipts.find(x => !x.confirmed || !tagsOf(x).length);

  const lines = r.lines.map(l =>
    '<div class="ln' + (l._status === 'excluded' ? ' off' : '') + '">'
    + '<div class="ln-main">'
    + '<div class="orig">' + esc(l.orig.value) + '</div>'
    + '<div class="gloss">' + esc(l.gloss.value) + '</div>'
    + (l._minConf < CONF_FLOOR
        ? '<div class="edited"><span class="badge striped" style="padding:0 6px">'
          + Math.round(l._minConf * 100) + '% sure</span>please check this one</div>' : '')
    + editedNote(l.total, cur)
    + (l._status === 'excluded'
        ? '<div class="ln-off">Left off the claim — ' + offReason(l) + '</div>' : '')
    + '</div>'
    + '<div class="ln-amt">'
    + fieldInput(r.id, 'total', l.total, {lid:l.id, type:'number', step:'0.01',
        style:'text-align:right;height:40px;font-size:15px'})
    + '<div class="muted" style="font-size:11px;margin-top:4px;text-align:right">' + cur + '</div>'
    + '</div>'
    + '<div class="ln-cat">' + catSelect(r.id, l.id, l.cat) + '</div>'
    + '</div>').join('');

  el.innerHTML = '<div class="stack" style="max-width:1080px">'
    + stepper()
    + '<div class="split">'
    + '<div class="doc-col"><div class="doc-frame">'
    + receiptSvg(FIXTURES.find(f => f.id === r.fixture).doc) + '</div>'
    + '<div class="doc-meta"><span>' + r.id.replace('RCP-', '#') + '</span>'
    + '<span>' + r.script + '</span></div></div>'

    + '<div class="stack">'
    + '<div class="card">'
    + '<div class="hdr-fields">'
    + hf('Merchant', fieldInput(r.id, 'merchant', r.merchant), 'wide')
    + hf('Date', fieldInput(r.id, 'date', r.date))
    + hf('People on the bill', fieldInput(r.id, 'heads', r.heads, {type:'number'}))
    + '</div>'
    + '<div class="body tight"><div class="lines">' + lines + '</div>'
    + '<div class="ln-total"><span>You are claiming</span>'
    + '<b>EUR ' + eur(t.reimbursable) + '</b></div></div></div>'

    + '<div class="card"><header class="ruled"><div><h3>Which vessel were you attending?</h3>'
    + '<p class="desc">Tap every vessel this receipt relates to. Finance works out the split.</p>'
    + '</div></header><div class="body">'
    + '<div class="chips">'
    + VESSELS.concat(CENTRES).map(v =>
        '<button type="button" class="chip lg' + (tags.indexOf(v.id) >= 0 ? ' on' : '') + '"'
        + ' data-tag="' + v.id + '" data-rcp="' + r.id + '">'
        + (tags.indexOf(v.id) >= 0 ? icon('check',15) : '') + v.name + '</button>').join('')
    + '</div>'
    + (tags.length > 1
        ? '<p class="note" style="margin-top:12px">Two or more vessels — finance will apportion it.</p>'
        : !tags.length
          ? '<p class="note" style="margin-top:12px">Pick at least one before you send.</p>' : '')
    + '</div>'
    + '<footer><div class="muted" style="font-size:12.5px">'
    + (r.confirmed ? 'Checked.' : 'Confirm when the numbers match the paper.') + '</div>'
    + '<div class="row" style="gap:8px">'
    + '<button class="btn ' + (r.confirmed ? '' : 'primary') + '" type="button"'
    + ' data-confirm="' + r.id + '"' + (tags.length ? '' : ' disabled') + '>'
    + (r.confirmed ? 'Reopen' : 'Looks right') + '</button>'
    + (next && next.id !== r.id
        ? '<button class="btn" type="button" data-rcpgo="' + next.id + '">Next receipt</button>'
        : '<button class="btn ' + (readyToSend() ? 'primary' : '') + '" type="button"'
          + ' data-view="send"' + (readyToSend() ? '' : ' disabled') + '>Send in</button>')
    + '</div></footer></div>'
    + '</div></div></div>';

  function hf(label, input, wide){
    return '<label class="hf' + (wide ? ' wide' : '') + '">'
      + '<span>' + label + '</span>' + input + '</label>';
  }
}

function offReason(l){
  const rule = (l._rules || []).find(x => x.effect === 'excluded');
  if (!rule) return 'company policy';
  if (rule.id === 'POL-001') return 'alcohol is not reimbursable under company policy';
  return rule.detail;
}

/* ── 3. send ─────────────────────────────────────────────────────── */
function renderSend(){
  const t = claimTotals(), rs = state.claim.receipts;
  const sent = state.claim.status !== 'draft';
  const flagged = [];
  rs.forEach(r => r.lines.forEach(l => { if (l._status === 'review') flagged.push({r:r, l:l}); }));
  const excluded = [];
  rs.forEach(r => r.lines.forEach(l => { if (l._status === 'excluded') excluded.push({r:r, l:l}); }));

  const vesselList = {};
  rs.forEach(r => tagsOf(r).forEach(id => { vesselList[id] = (vesselList[id] || 0) + 1; }));

  document.getElementById('pane-send').innerHTML =
    '<div class="stack" style="max-width:760px">'
    + stepper()

    + (sent
        ? '<div class="card"><div class="body" style="text-align:center;padding:34px 22px">'
          + '<div class="drop-icon" style="margin-bottom:16px">✓</div>'
          + '<h3 style="font-size:19px">Sent to finance</h3>'
          + '<p class="note" style="margin-top:8px;max-width:44ch;margin-left:auto;margin-right:auto">'
          + state.claim.id + ' went to the Limassol office on ' + state.claim.submittedOn
          + '. They will apportion it across the vessels and come back to you only if something '
          + 'needs explaining.</p></div></div>'
        : '')

    + '<div class="card"><header class="ruled"><div><h3>' + state.claim.title + '</h3>'
    + '<p class="desc">' + state.claim.period + ' · ' + rs.length + ' receipt'
    + (rs.length === 1 ? '' : 's') + '</p></div></header>'
    + '<div class="body tight">'
    + rs.map(r => {
        const rt = receiptTotals(r);
        return '<div class="sum-row"><div>'
          + '<div style="font-weight:500">' + esc(String(r.merchant.value).split(' (')[0]) + '</div>'
          + '<div class="muted" style="font-size:11.5px;margin-top:2px">' + r.date.value + ' · '
          + tagsOf(r).map(id => { const v = targetById(id); return v ? v.name : id; }).join(' + ')
          + '</div></div>'
          + '<div style="text-align:right"><div style="font-weight:500">EUR '
          + eur(rt.reimbursable) + '</div>'
          + (rt.excluded > 0
              ? '<div class="muted" style="font-size:11.5px;margin-top:2px;text-decoration:line-through">'
                + eur(rt.excluded) + ' off</div>' : '')
          + '</div></div>';
      }).join('')
    + '<div class="ln-total" style="padding:14px 18px"><span>Total claim</span>'
    + '<b>EUR ' + eur(t.reimbursable) + '</b></div>'
    + '</div></div>'

    + (excluded.length
        ? '<div class="card"><header class="ruled"><div><h3>Left off, and why</h3>'
          + '<p class="desc">Shown so nothing is a surprise later. You do not need to do anything.</p>'
          + '</div><span class="badge outline">EUR ' + eur(t.excluded) + '</span></header>'
          + '<div class="body tight">'
          + excluded.map(x => '<div class="sum-row"><div>' + esc(x.l.gloss.value)
              + '<div class="muted" style="font-size:11.5px;margin-top:2px">'
              + offReason(x.l) + '</div></div>'
              + '<div class="muted" style="text-decoration:line-through">EUR '
              + eur(x.l._base) + '</div></div>').join('')
          + '</div></div>'
        : '')

    + (flagged.length
        ? '<div class="callout"><strong>' + flagged.length + ' line'
          + (flagged.length === 1 ? '' : 's') + ' finance will look at.</strong> '
          + 'Over a cap or read with low confidence. Nothing is wrong — they may just ask.</div>'
        : '')

    + (sent ? ''
        : '<div class="card"><footer style="border-top:0">'
          + '<div class="muted" style="font-size:12.5px;max-width:44ch">'
          + (readyToSend()
              ? 'Everything is checked and tagged.'
              : 'Check every receipt and tag a vessel first.') + '</div>'
          + '<div class="row" style="gap:8px">'
          + '<button class="btn" type="button" data-view="check">Back</button>'
          + '<button class="btn ' + (readyToSend() ? 'primary' : '') + '" type="button" id="sendClaim"'
          + (readyToSend() ? '' : ' disabled') + '>Send to finance</button>'
          + '</div></footer></div>')
    + '</div>';
}

/* ── dispatcher ──────────────────────────────────────────────────── */
const RENDERERS = {capture:renderCapture, check:renderCheck, send:renderSend};
function render(){
  if (state.view !== 'capture' && !state.activeReceipt && state.claim.receipts.length){
    state.activeReceipt = state.claim.receipts[0].id;
  }
  evaluateClaim();
  renderChrome();
  RENDERERS[state.view]();
  document.querySelectorAll('.pane').forEach(p => p.classList.remove('on'));
  document.getElementById('pane-' + state.view).classList.add('on');
}
function go(view){
  state.view = view;
  render();
  window.scrollTo({top:0, behavior:'instant'});
}

/* ── events ──────────────────────────────────────────────────────── */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-view],[data-fixture],[data-tag],[data-confirm],[data-hdr],'
    + '[data-rcpgo],#loadAll,#sendClaim,#themeBtn,#quickTabs button');
  if (!el) return;

  if (el.id === 'themeBtn'){ cycleTheme(); return; }
  if (el.id === 'loadAll'){ captureAll(); return; }
  if (el.dataset.fixture){ capture(el.dataset.fixture, false); return; }
  if (el.closest('#quickTabs')){ state.activeReceipt = el.dataset.rcp; render(); return; }
  if (el.dataset.rcpgo){ state.activeReceipt = el.dataset.rcpgo; go('check'); return; }
  if (el.dataset.hdr){
    state.editHeader = state.editHeader === el.dataset.hdr ? null : el.dataset.hdr;
    render(); return;
  }
  if (el.dataset.tag){
    toggleTag(receipt(el.dataset.rcp), el.dataset.tag);
    render(); return;
  }
  if (el.dataset.confirm){
    const r = receipt(el.dataset.confirm);
    if (!r.confirmed && !tagsOf(r).length) return;
    r.confirmed = !r.confirmed;
    render();
    toast(r.confirmed ? 'Receipt checked' : 'Receipt reopened');
    return;
  }
  if (el.id === 'sendClaim'){
    if (!readyToSend()) return;
    state.claim.status = 'submitted';
    state.claim.submittedOn = TODAY;
    go('send');
    toast('Sent to finance');
    return;
  }
  if (el.dataset.view){ go(el.dataset.view); return; }
});

document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.edit){
    const r = receipt(el.dataset.rcp);
    if (!r) return;
    const path = el.dataset.edit;
    if (el.dataset.line){
      const l = lineOf(r, el.dataset.line);
      const before = l[path].value;
      const val = path === 'total' ? Number(el.value) : el.value;
      if (setField(l[path], val)){
        logAudit(r.id, l.id + ' · ' + path, String(before), String(val));
        render();
        toast('Corrected — the original reading is kept');
      }
      return;
    }
    const before = r[path].value;
    const val = path === 'heads' ? Number(el.value) : el.value;
    if (setField(r[path], val)){
      logAudit(r.id, path, String(before), String(val));
      render();
      toast('Corrected — the original reading is kept');
    }
    return;
  }
  if (el.id === 'file' && el.files && el.files[0]){
    document.getElementById('dropMsg').innerHTML = '<b>' + esc(el.files[0].name)
      + '</b> accepted. Reading is not wired to a model in this proof of concept — '
      + 'open a sample to see the whole flow.';
  }
});

document.addEventListener('dragover', e => {
  const d = e.target.closest && e.target.closest('#drop');
  if (d){ e.preventDefault(); d.classList.add('over'); }
});
document.addEventListener('dragleave', e => {
  const d = e.target.closest && e.target.closest('#drop');
  if (d) d.classList.remove('over');
});
document.addEventListener('drop', e => {
  const d = e.target.closest && e.target.closest('#drop');
  if (!d) return;
  e.preventDefault();
  d.classList.remove('over');
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  document.getElementById('dropMsg').innerHTML = f
    ? '<b>' + esc(f.name) + '</b> accepted. Reading is not wired to a model here — '
      + 'open a sample to see the whole flow.'
    : 'That did not look like a file.';
});

const THEMES = [
  {v:null, icon:'monitor', label:'Match system'},
  {v:'light', icon:'sun', label:'Light'},
  {v:'dark', icon:'moon', label:'Dark'}
];
let themeIdx = 0;
function cycleTheme(){
  themeIdx = (themeIdx + 1) % THEMES.length;
  const t = THEMES[themeIdx];
  if (t.v) document.documentElement.setAttribute('data-theme', t.v);
  else document.documentElement.removeAttribute('data-theme');
  document.getElementById('themeIcon').innerHTML = icon(t.icon, 16);
  document.getElementById('themeLabel').textContent = t.label;
}


document.getElementById('themeIcon').innerHTML = icon('monitor', 16);
render();
