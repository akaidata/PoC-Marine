/* ══ Finance app ════════════════════════════════════════════════════
   The Limassol office side. Claims arrive already checked and tagged by
   the superintendent; this app decides what happens to them — policy,
   apportionment across vessels and owner accounts, recoverable VAT,
   approval, and the payload the ledger consumes. */

const state = {
  view:'inbox',
  policy:POLICY.map(r => Object.assign({}, r)),
  claim:{
    id:'CLM-2026-0184', status:'submitted', submittedOn:'2026-09-04',
    title:'Busan · Shanghai · Piraeus — attendance trip',
    traveller:'D. Charalambous', role:'Senior Technical Superintendent',
    period:'17–25 Aug 2026',
    legs:[['17–19 Aug','Busan (KR)'],['19–22 Aug','Shanghai (CN)'],['24–25 Aug','Piraeus (GR)']],
    receipts:[]
  },
  history:[
    {id:'CLM-2026-0171', status:'submitted', submittedOn:'2026-08-27',
     title:'Rotterdam & Hamburg — Aegean Trader BWTS retrofit', traveller:'D. Charalambous',
     gross:1284.40, excluded:96.20, reimbursable:1188.20, vat:143.60,
     byTarget:{'V-AEG':1188.20},
     exclusions:[{ruleId:'POL-001', lines:3, amount:96.20}]},
    {id:'CLM-2026-0166', status:'approved', submittedOn:'2026-07-24',
     title:'Singapore — Kyrenia Star annual survey', traveller:'A. Michaelides',
     gross:2051.85, excluded:178.40, reimbursable:1873.45, vat:61.05,
     byTarget:{'V-KYR':1685.20,'CC-LIM':188.25},
     exclusions:[{ruleId:'POL-001', lines:4, amount:178.40}]}
  ],
  audit:[],
  activeReceipt:null,
  askLog:[],
  dashTab:{recharge:'vessel', attention:'flagged'},
  approved:false
};

const MAIN_NAV = [
  {id:'inbox',   label:'Inbox',      glyph:'inbox'},
  {id:'extract', label:'Review',     glyph:'file'},
  {id:'alloc',   label:'Apportion',  glyph:'split'},
  {id:'payload', label:'To the ledger', glyph:'ledger'}
];
const UTIL_NAV = [
  {id:'dashboard', label:'Dashboard',    glyph:'dashboard'},
  {id:'policy',    label:'Policy rules', glyph:'scale'},
  {id:'ask',       label:'Ask the data', glyph:'ask'}
];
const CLAIM_VIEWS = ['extract','alloc','payload','policy'];
const DOC_VIEWS = ['extract','alloc'];
const PANE_COPY = {
  inbox:['Inbox', 'What the superintendents have sent in.'],
  extract:['Review', 'What was read, what the traveller corrected, and what policy did to it.'],
  policy:['Policy rules', 'Configured per client. Toggle one and every claim total moves.'],
  alloc:['Apportion', 'Percentages per vessel, and therefore per owner account.'],
  payload:['To the ledger', 'The structured claim an accounting system would consume.'],
  dashboard:['Dashboard', 'Across all three claims — two open, one closed.'],
  ask:['Ask the data', 'Answered from the loaded claims only, with sources named.']
};

/* what the superintendent already did, before finance opened it */
function seedFromSuperintendent(){
  FIXTURES.forEach(f => state.claim.receipts.push(instantiate(f)));
  state.claim.receipts.forEach(r => {
    r.confirmed = true;
    r.tags = r.alloc.map(a => a.target);
  });
  /* the handwritten taxi: the traveller corrected the misread total */
  const taxi = receipt('RCP-04');
  if (taxi){
    setField(taxi.lines[0].total, 34);
    state.audit.push({receipt:'RCP-04', field:'RCP-04-L1 · amount', from:'84', to:'34',
      at:'by D. Charalambous, 03 Sep'});
  }
}

function stepper(){ return ''; }   /* finance has no wizard — it has a console */

/* ── chrome ──────────────────────────────────────────────────────── */
function renderChrome(){
  const c = state.claim;
  const waiting = state.history.filter(h => h.status === 'submitted').length
    + (c.status === 'submitted' && !state.approved ? 1 : 0);

  const navItem = v => {
    const active = state.view === v.id;
    const badge = v.id === 'inbox' && waiting ? String(waiting) : '';
    return '<li class="' + (active ? 'on' : '') + '">'
      + '<button type="button" data-view="' + v.id + '">'
      + '<span class="n">' + icon(v.glyph) + '</span><span>' + v.label + '</span>'
      + '<span class="tick">' + badge + '</span></button></li>';
  };
  document.getElementById('mainNav').innerHTML = MAIN_NAV.map(navItem).join('');
  document.getElementById('utilNav').innerHTML = UTIL_NAV.map(navItem).join('');

  const copy = PANE_COPY[state.view];
  document.getElementById('paneTitle').textContent = copy[0];
  /* on the claim screens the header carries which claim you are in, so
     the sidebar does not have to repeat it on every page */
  const onClaimPage = ['extract','alloc','payload'].indexOf(state.view) >= 0;
  document.getElementById('paneLede').textContent = onClaimPage
    ? c.id + ' from ' + c.traveller + ', sent in ' + c.submittedOn
      + ' and waiting ' + daysSince(c.submittedOn) + ' days'
    : copy[1];

  const tabs = document.getElementById('quickTabs');
  if (DOC_VIEWS.indexOf(state.view) >= 0 && c.receipts.length){
    tabs.style.display = 'flex';
    tabs.innerHTML = c.receipts.map(r =>
      '<button type="button" role="tab" data-rcp="' + r.id + '"'
      + ' aria-selected="' + (state.activeReceipt === r.id) + '">'
      + r.id.replace('RCP-', '#') + '</button>').join('');
  } else { tabs.style.display = 'none'; tabs.innerHTML = ''; }

  const strip = document.getElementById('summaryStrip');
  const onClaim = CLAIM_VIEWS.indexOf(state.view) >= 0;
  strip.style.display = onClaim ? 'flex' : 'none';
  if (!onClaim){ strip.innerHTML = ''; return; }
  const t = claimTotals();
  strip.innerHTML =
      cell('Claimed', 'EUR ' + eur(t.gross), '')
    + cell('Excluded', 'EUR ' + eur(t.excluded), 'strike')
    + cell('Payable', 'EUR ' + eur(t.reimbursable), '')
    + cell('Recoverable VAT', 'EUR ' + eur(t.vat), '')
    + cell('To review', 'EUR ' + eur(t.review), '');
  function cell(k, v, cls){
    return '<div class="cell ' + cls + '"><div class="k">' + k + '</div>'
      + '<div class="v">' + v + '</div></div>';
  }
}

/* ── inbox ───────────────────────────────────────────────────────── */
function renderInbox(){
  const t = claimTotals();
  const rows = [];

  rows.push(row(state.claim.id, state.claim.title, state.claim.traveller,
    state.claim.submittedOn, t.reimbursable, t.vat, t.review,
    state.approved ? 'approved' : 'to review', true));
  state.history.forEach(h => rows.push(row(h.id, h.title, h.traveller, h.submittedOn,
    h.reimbursable, h.vat, 0, h.status === 'submitted' ? 'to review' : 'approved', false)));

  const toReview = rows.filter(r => r.indexOf('to review') >= 0).length;

  document.getElementById('pane-inbox').innerHTML =
    '<div class="stack pane-wide">'
    + '<div class="dash-top">'
    + '<div class="stat hero"><div class="k">Waiting on you</div>'
    + '<div class="v">' + toReview + '</div>'
    + '<div class="s">' + (toReview
        ? 'The oldest has been sitting ' + Math.max.apply(null,
            state.history.filter(h => h.status === 'submitted')
              .map(h => daysSince(h.submittedOn))
              .concat(state.approved ? [0] : [daysSince(state.claim.submittedOn)]))
          + ' days. Superintendents have already checked and tagged these.'
        : 'Nothing outstanding.') + '</div></div>'
    + '<div class="stat"><div class="k">Payable, open claims</div><div class="v">'
    + eur(t.reimbursable) + '</div><div class="s">EUR, this claim</div></div>'
    + '<div class="stat"><div class="k">Recoverable VAT</div><div class="v">'
    + eur(t.vat) + '</div><div class="s">not yet reclaimed</div></div>'
    + '<div class="stat"><div class="k">Flagged lines</div><div class="v">'
    + flaggedLines().length + '</div><div class="s">over a cap, or read poorly</div></div>'
    + '<div class="stat"><div class="k">Excluded by policy</div><div class="v">'
    + eur(t.excluded) + '</div><div class="s">before it reached you</div></div>'
    + '</div>'

    + '<div class="card"><header class="ruled"><div><h3>Claims</h3>'
    + '<p class="desc">Open one to review the lines, then apportion it.</p></div></header>'
    + '<div class="body tight"><div class="tbl-wrap"><table class="tbl">'
    + '<thead><tr><th>Claim</th><th>Traveller</th><th class="r">Payable</th>'
    + '<th class="r">VAT</th><th class="r">Flagged</th><th>Status</th><th></th></tr></thead>'
    + '<tbody>' + rows.join('') + '</tbody></table></div></div></div></div>';

  function row(id, title, who, on, payable, vat, review, status, open){
    return '<tr><td>' + title
      + '<div class="muted" style="font-size:11.5px;margin-top:2px">' + id
      + ' · sent ' + on + ' · ' + daysSince(on) + ' days</div></td>'
      + '<td>' + who + '</td>'
      + '<td class="num r">' + eur(payable) + '</td>'
      + '<td class="num r">' + eur(vat) + '</td>'
      + '<td class="num r">' + (review > 0 ? eur(review) : '—') + '</td>'
      + '<td><span class="badge ' + (status === 'approved' ? 'solid' : 'striped') + '">'
      + status + '</span></td>'
      + '<td class="r">' + (open
          ? '<button class="btn xs" type="button" data-view="extract">Open</button>'
          : '<span class="muted" style="font-size:11.5px">no line detail in this demo</span>') + '</td></tr>';
  }
}

function flaggedLines(){
  const out = [];
  state.claim.receipts.forEach(r => r.lines.forEach(l => {
    if (l._status === 'review') out.push({r:r, l:l});
  }));
  return out;
}

/* ── review ──────────────────────────────────────────────────────── */
function travellerCard(r){
  const edits = state.audit.filter(a => a.receipt === r.id);
  return '<div class="card"><header class="ruled"><div><h3>What the traveller did</h3>'
    + '<p class="desc">Kept alongside what the AI proposed. This is what makes the claim '
    + 'auditable rather than just fast.</p></div>'
    + '<span class="badge outline">' + edits.length + ' correction'
    + (edits.length === 1 ? '' : 's') + '</span></header>'
    + '<div class="body tight">'
    + (edits.length
        ? '<table class="audit"><thead><tr><th>Field</th><th>AI read</th>'
          + '<th>Corrected to</th><th>By</th></tr></thead><tbody>'
          + edits.map(a => '<tr><td>' + esc(a.field) + '</td><td>' + esc(a.from)
            + '</td><td><b>' + esc(a.to) + '</b></td><td>' + a.at + '</td></tr>').join('')
          + '</tbody></table>'
        : '<div class="empty">Nothing was corrected on this document — every value is as read.</div>')
    + '</div>'
    /* The two evidence facts the rules turn on. They live here, on the
       document they describe, rather than in a card of their own. */
    + '<footer><div class="muted" style="font-size:12.5px">'
    + 'Tagged to ' + (r.tags || []).map(id => {
        const v = targetById(id); return v ? v.name : id;
      }).join(' and ') + '</div>'
    + '<div class="row" style="gap:7px">'
    + att(r, 'itemisedInvoice', 'Itemised invoice held', 'No itemised invoice')
    + att(r, 'clientEntertainment', 'Client entertained', 'No client entertained')
    + '</div></footer></div>';

  function att(rc, key, onText, offText){
    return '<button type="button" class="att' + (rc[key] ? ' on' : '') + '"'
      + ' data-att="' + key + '" data-rcp="' + rc.id + '"'
      + ' title="Affects which policy rules apply">'
      + (rc[key] ? icon('check',14) + onText : offText) + '</button>';
  }
}

function renderReview(){
  const r = state.claim.receipts.find(x => x.id === state.activeReceipt);
  if (!r) return;
  const others = state.claim.receipts.filter(x => x.id !== r.id);
  document.getElementById('pane-extract').innerHTML =
    '<div class="split">' + docColumn(r)
    + '<div class="stack">'
    + ledgerCard(r) + travellerCard(r) + notesCard(r)
    + '<div class="card"><footer style="border-top:0">'
    + '<div class="muted" style="font-size:12.5px;max-width:46ch">'
    + 'Policy is configured under Policy rules — changing it there moves every claim.</div>'
    + '<div class="row" style="gap:8px">'
    + (others.length
        ? '<button class="btn" type="button" data-rcp="' + others[0].id + '"'
          + ' data-rcpgo="1">Next receipt</button>' : '')
    + '<button class="btn primary" type="button" data-view="alloc">Apportion this claim</button>'
    + '</div></footer></div>'
    + '</div></div>';
}

/* ── policy ──────────────────────────────────────────────────────── */
function renderPolicy(){
  const r = state.claim.receipts.find(x => x.id === state.activeReceipt);
  document.getElementById('pane-policy').innerHTML =
    '<div class="stack pane-wide" style="max-width:940px">'
    + policyCard()
    + (r ? outcomeCard(r) : '')
    + '<div class="card"><footer style="border-top:0">'
    + '<div class="muted" style="font-size:12.5px;max-width:46ch">'
    + 'The traveller never sees these switches — they only see that a line came off, and why.</div>'
    + '<button class="btn primary" type="button" data-view="extract">Back to the claim</button>'
    + '</footer></div></div>';
}

/* ── apportion ───────────────────────────────────────────────────── */
function renderAlloc(){
  const r = state.claim.receipts.find(x => x.id === state.activeReceipt);
  if (!r) return;
  const rs = state.claim.receipts;
  const balanced = rs.every(x => receiptAllocValid(x));
  const t = claimTotals();

  const perOwner = Object.keys(t.byOwner).map(k => {
    const o = OWNERS.find(x => x.id === k);
    return '<div class="sum-row"><div><div style="font-weight:500">'
      + (o ? o.name : 'Internal cost centres') + '</div>'
      + '<div class="muted" style="font-size:11.5px;margin-top:2px">'
      + (o ? o.agreement : 'not recharged to an owner') + '</div></div>'
      + '<div style="font-weight:500">EUR ' + eur(t.byOwner[k]) + '</div></div>';
  }).join('');

  document.getElementById('pane-alloc').innerHTML =
    '<div class="split">' + docColumn(r)
    + '<div class="stack">'
    + '<div class="callout"><strong>The traveller tagged '
    + (r.tags || []).map(id => { const v = targetById(id); return v ? v.name : id; }).join(' and ')
    + '.</strong> Setting the percentages is yours — they carry the management agreement.</div>'
    + allocCard(r)
    + '<div class="card"><header class="ruled"><div><h3>Recharged to</h3>'
    + '<p class="desc">Across the whole claim, once every receipt is apportioned.</p></div></header>'
    + '<div class="body tight">' + perOwner + '</div></div>'
    + '<div class="card"><footer style="border-top:0">'
    + '<div class="muted" style="font-size:12.5px;max-width:46ch">'
    + (state.approved ? 'Approved. The payload is ready.'
        : balanced ? 'Every receipt balances to 100%.'
        : 'Approval is blocked until every split sums to 100%.') + '</div>'
    + '<div class="row" style="gap:8px">'
    + '<button class="btn" type="button" data-view="extract">Back</button>'
    + '<button class="btn" type="button" id="returnClaim">Return to traveller</button>'
    + '<button class="btn ' + (balanced && !state.approved ? 'primary' : '') + '" type="button"'
    + ' id="approveClaim"' + (balanced && !state.approved ? '' : ' disabled') + '>'
    + (state.approved ? 'Approved ✓' : 'Approve claim') + '</button>'
    + '</div></footer></div>'
    + '</div></div>';
}

/* ── dispatcher ──────────────────────────────────────────────────── */
const RENDERERS = {inbox:renderInbox, extract:renderReview, policy:renderPolicy,
  alloc:renderAlloc, payload:renderPayload, dashboard:renderDashboard,
  ask:renderAsk};

function render(){
  if (!state.activeReceipt && state.claim.receipts.length){
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
function afterCapture(){ go('extract'); }

/* ── events ──────────────────────────────────────────────────────── */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-view],[data-rule],[data-splitline],[data-allocdel],'
    + '[data-allocadd],[data-allocbal],[data-allocclear],[data-ask],[data-fx],[data-dashtab],'
    + '[data-att],#approveClaim,#returnClaim,#copyPayload,#selectPayload,#themeBtn,'
    + '#quickTabs button,[data-rcpgo]');
  if (!el) return;

  if (el.id === 'themeBtn'){ cycleTheme(); return; }
  if (el.closest('#quickTabs') || el.dataset.rcpgo){
    state.activeReceipt = el.dataset.rcp; render(); return;
  }

  if (el.dataset.dashtab){
    const p = el.dataset.dashtab.split(':');
    state.dashTab[p[0]] = p[1];
    render(); return;
  }
  if (el.dataset.att){
    const r = receipt(el.dataset.rcp);
    r[el.dataset.att] = !r[el.dataset.att];
    render();
    toast('Evidence updated — policy re-evaluated');
    return;
  }
  if (el.dataset.rule){
    const rule = ruleById(el.dataset.rule);
    rule.enabled = !rule.enabled;
    render();
    toast(rule.id + ' ' + (rule.enabled ? 'on' : 'off') + ' — every total recomputed');
    return;
  }
  if (el.dataset.fx){
    const r = receipt(el.dataset.fx);
    if (r.fxOverride){ r.fxOverride = null; toast('Published rate restored'); }
    else {
      const pub = FX_TABLE[r.currency.value + '|' + r.date.value];
      r.fxOverride = {rate:Number((pub * 1.018).toFixed(6)), date:r.date.value};
      toast('Settlement rate applied — recorded in the payload');
    }
    render(); return;
  }
  if (el.dataset.splitline){
    const r = receipt(el.dataset.rcp), l = lineOf(r, el.dataset.splitline);
    if (l.alloc && l.alloc.length) l.alloc = null;
    else l.alloc = r.alloc.map(a => Object.assign({}, a));
    render(); return;
  }
  if (el.dataset.allocadd){
    const s = scopeOf(el.dataset.rcp, el.dataset.line);
    s.list.push({target:unusedTarget(s.list), share:0});
    render(); return;
  }
  if (el.dataset.allocdel !== undefined && el.dataset.allocdel !== ''){
    const s = scopeOf(el.dataset.rcp, el.dataset.line);
    s.list.splice(Number(el.dataset.allocdel), 1);
    render(); return;
  }
  if (el.dataset.allocbal){
    balance(scopeOf(el.dataset.rcp, el.dataset.line).list);
    render(); return;
  }
  if (el.dataset.allocclear){
    const s = scopeOf(el.dataset.rcp, el.dataset.line);
    if (s.l) s.l.alloc = null;
    render(); return;
  }

  if (el.id === 'approveClaim'){
    if (!state.claim.receipts.every(r => receiptAllocValid(r))) return;
    state.approved = true;
    state.claim.status = 'approved';
    go('payload');
    toast('Claim approved — payload generated');
    return;
  }
  if (el.id === 'returnClaim'){
    toast('Returned to D. Charalambous with your notes');
    return;
  }
  if (el.id === 'copyPayload'){
    const txt = document.getElementById('payloadPre').textContent;
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(() => toast('Payload copied'),
        () => toast('Copy blocked — use Select all'));
    } else toast('Copy unavailable here — use Select all');
    return;
  }
  if (el.id === 'selectPayload'){
    const pre = document.getElementById('payloadPre');
    const sel = window.getSelection(), rng = document.createRange();
    rng.selectNodeContents(pre); sel.removeAllRanges(); sel.addRange(rng);
    toast('Selected — copy with Ctrl+C');
    return;
  }
  if (el.dataset.ask){ ask(el.dataset.ask); return; }
  if (el.dataset.view){ go(el.dataset.view); return; }
});

document.addEventListener('change', e => {
  const el = e.target;

  if (el.dataset.fxrate){
    const r = receipt(el.dataset.fxrate);
    if (r.fxOverride){ r.fxOverride.rate = Number(el.value); render(); toast('Override rate set'); }
    return;
  }
  if (el.dataset.edit){
    const r = receipt(el.dataset.rcp);
    if (!r) return;
    const path = el.dataset.edit;
    if (el.dataset.line){
      const l = lineOf(r, el.dataset.line);
      if (path === 'note'){ l.note = el.value; render(); return; }
      const before = l[path].value;
      const val = ['qty','total','taxRate'].indexOf(path) >= 0 ? Number(el.value) : el.value;
      if (setField(l[path], val)){
        logAudit(r.id, l.id + ' · ' + path, String(before), String(val));
        render();
        toast('Adjusted by finance — the earlier values are kept');
      }
      return;
    }
    const before = r[path].value;
    const val = ['heads','docTotal'].indexOf(path) >= 0 ? Number(el.value) : el.value;
    if (setField(r[path], val)){
      logAudit(r.id, path, String(before), String(val));
      render();
      toast('Adjusted by finance — the earlier values are kept');
    }
    return;
  }
  if (el.dataset.alloc){
    const s = scopeOf(el.dataset.rcp, el.dataset.line);
    const i = Number(el.dataset.i);
    if (el.dataset.alloc === 'target') s.list[i].target = el.value;
    else if (el.dataset.alloc === 'share') s.list[i].share = Number(el.value);
    else s.list[i].share = s.amt ? Math.round(Number(el.value) / s.amt * 1000) / 10 : 0;
    render();
    return;
  }
});

document.addEventListener('submit', e => {
  if (e.target.id !== 'askForm') return;
  e.preventDefault();
  const q = document.getElementById('askInput').value.trim();
  if (q) ask(q);
});
function ask(q){
  state.askLog.push({role:'you', text:q});
  state.askLog.push(Object.assign({role:'bot'}, answer(q)));
  render();
  const chat = document.getElementById('chat');
  if (chat) chat.scrollTop = chat.scrollHeight;
}

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

seedFromSuperintendent();

document.getElementById('themeIcon').innerHTML = icon('monitor', 16);
render();
