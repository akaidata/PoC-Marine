/* the document, shown alongside every step of the review. */
function docColumn(r){
  const fx = r._fx;
  const fixture = FIXTURES.find(f => f.id === r.fixture);

  /* The merchant, date and total are legible on the receipt itself and
     restated in the table beside it, so they are not repeated here. The
     rate and its effective date stay, because a converted figure is not
     auditable without them. */
  return '<div class="doc-col">'
    + '<div class="doc-frame">' + receiptSvg(fixture.doc) + '</div>'
    + '<div class="doc-meta"><span>' + r.id + '</span><span>' + r.script + '</span></div>'
    + '<p class="fx-note">'
    + (fx.rate === null
        ? fx.source
        : r.currency.value === BASE
          ? 'Already in ' + BASE + ', so no conversion applies.'
          : (fx.overridden
              ? 'Converted at the card settlement rate of '
                + '<input class="rate-in" type="number" step="0.000001" data-fxrate="'
                + r.id + '" value="' + fx.rate + '">, entered by hand. '
                + '<button type="button" class="lnk" data-fx="' + r.id + '">'
                + 'Restore the published rate</button>'
              : 'Converted at ' + fx.rate.toFixed(6) + ', the published rate on ' + fx.date + '. '
                + '<button type="button" class="lnk" data-fx="' + r.id + '">'
                + 'Use the card settlement rate</button>'))
    + '</p></div>';
}
/* One row per line: what was read, and what policy did to it, together.
   These used to be two stacked tables listing the same four lines. */
function ledgerCard(r){
  const cur = r.currency.value;
  const t = receiptTotals(r);

  const rows = r.lines.map(l =>
    '<tr data-st="' + l._status + '"><td class="st"></td>'
    + '<td><div class="orig">' + esc(l.orig.value) + '</div>'
    + '<div class="gloss">' + esc(l.gloss.value) + '</div>'
    + (l._minConf < CONF_FLOOR
        ? '<div class="edited"><span class="badge striped" style="padding:0 6px">'
          + Math.round(l._minConf * 100) + '% sure</span>worth a look</div>' : '')
    + editedNote(l.total, cur)
    + (l._rules || []).map(x =>
        '<span class="rule-line ' + (x.effect === 'satisfied' ? 'satisfied' : '') + '">'
        + '<span class="rid">' + x.id + '</span><span>' + x.detail + '</span></span>').join('')
    + '</td>'
    + '<td class="num r" style="width:132px">'
    + fieldInput(r.id, 'total', l.total, {lid:l.id, mono:true, type:'number', step:'0.01', style:'text-align:right;padding:0 12px'})
    + '<div class="muted" style="font-size:12px;margin-top:3px">' + cur
    + (Number(l.qty.value) > 1 ? ', ' + l.qty.value + '×' : '') + '</div></td>'
    + '<td class="num r amt" style="width:82px">' + eur(l._base) + '</td>'
    + '<td style="width:140px">' + catSelect(r.id, l.id, l.cat)
    + (l.cat.edited ? '<div class="edited">was <s>' + esc(String(l.cat.ai)) + '</s></div>' : '')
    + '</td>'
    + '<td style="width:116px">' + statusBadge(l._status) + '</td></tr>').join('');

  return '<div class="card"><header class="ruled">'
    + '<div><h3>' + r.lines.length + ' line items, ' + r.script + '</h3>'
    + '<p class="desc">The original text sits beside the English so the claim ties back to the paper. '
    + 'Amounts and categories are editable; the rule behind any exclusion is named on its line.</p>'
    + '</div></header>'
    + (r.lowConfNote
        ? '<div style="padding:14px 18px 0"><div class="callout">' + r.lowConfNote + '</div></div>'
        : '')
    + '<div class="body tight"><div class="tbl-wrap"><table class="tbl ledger">'
    + '<thead><tr><th class="st"></th><th>Item</th>'
    + '<th class="r">Amount</th><th class="r">' + BASE + '</th>'
    + '<th>Category</th><th>Outcome</th></tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '<tfoot><tr><td class="st"></td><td>Payable on this document</td>'
    + '<td class="num r">' + money(r.lines.reduce((s, l) => s + Number(l.total.value), 0), cur) + '</td>'
    + '<td class="num r">' + eur(t.reimbursable) + '</td>'
    + '<td colspan="2"><span class="muted" style="font-weight:400;font-size:12px">'
    + eur(t.gross) + ' less ' + eur(t.excluded) + ' excluded</span></td>'
    + '</tr></tfoot></table></div></div></div>';
}
const RULE_TYPE_LABEL = {
  category_exclusion:'Category exclusion', allowed_with_condition:'Allowed with condition',
  per_item_cap:'Per-item cap', daily_cap:'Daily cap', required_evidence:'Required evidence'
};
function policyCard(){
  const rows = state.policy.map(p => {
    const bite = ruleBite(p.id);
    return '<div class="rule"><span class="rid">' + p.id + '</span>'
      + '<div><div class="t">' + p.title + '</div>'
      + '<div class="d"><span class="type">' + RULE_TYPE_LABEL[p.type] + '</span>'
      + (p.threshold ? ' · threshold EUR ' + p.threshold : '')
      + ' — ' + p.detail + '</div></div>'
      + '<div class="row" style="gap:12px;flex-wrap:nowrap">'
      + '<span class="bite">' + (bite.lines
          ? bite.lines + ' line' + (bite.lines === 1 ? '' : 's') + '<br>EUR ' + eur(bite.amount)
          : bite.met
            ? bite.met + ' line' + (bite.met === 1 ? '' : 's') + '<br>satisfied'
            : '<span style="color:var(--subtle-foreground)">no effect</span>') + '</span>'
      + '<button type="button" class="switch" role="switch" data-rule="' + p.id + '"'
      + ' aria-checked="' + p.enabled + '" aria-label="' + p.title + '"></button>'
      + '</div></div>';
  }).join('');

  return '<div class="card"><header class="ruled">'
    + '<div><h3>Policy set</h3>'
    + '<p class="desc">Toggle a rule and every total moves. Nothing is dropped silently — an excluded '
    + 'line stays on the claim with the rule that excluded it named.</p></div>'
    + '<span class="badge outline">' + state.policy.filter(p => p.enabled).length
    + ' of ' + state.policy.length + ' on</span></header>'
    + '<div class="body"><div class="rules">' + rows + '</div></div></div>';
}

function notesCard(r){
  const flagged = r.lines.filter(l => l._status !== 'reimbursable');
  if (!flagged.length){
    return '<div class="card"><header><div><h3>Notes</h3>'
      + '<p class="desc">No line on this document is excluded or flagged, so there is nothing to explain.</p>'
      + '</div></header></div>';
  }
  return '<div class="card"><header class="ruled"><div><h3>Notes on '
    + flagged.length + ' line' + (flagged.length === 1 ? '' : 's') + '</h3>'
    + '<p class="desc">Add context for whoever approves this.</p></div></header>'
    + '<div class="body" style="display:grid;gap:13px">'
    + flagged.map(l =>
        '<div><div class="row" style="justify-content:space-between;gap:10px">'
        + '<span style="font-size:13px">' + esc(l.gloss.value) + '</span>'
        + statusBadge(l._status) + '</div>'
        + '<input class="input sm" style="margin-top:6px" placeholder="Add a note…"'
        + ' data-edit="note" data-rcp="' + r.id + '" data-line="' + l.id + '"'
        + ' value="' + esc(l.note) + '"></div>').join('')
    + '</div></div>';
}

function allocEditor(r, line){
  const list = line ? (line.alloc || []) : r.alloc;
  const scopeAmt = line ? line._base : receiptTotals(r).reimbursable;
  const sum = allocSum(list);
  const ok = allocValid(list);
  const attr = line ? ' data-line="' + line.id + '"' : '';

  const rows = list.map((a, i) => {
    const tg = targetById(a.target);
    const owner = ownerOfTarget(a.target);
    return '<div>'
      + '<div class="alloc-row">'
      + '<select class="select sm" data-alloc="target" data-rcp="' + r.id + '"' + attr + ' data-i="' + i + '">'
      + '<optgroup label="Vessels">' + VESSELS.map(v =>
          '<option value="' + v.id + '"' + (v.id === a.target ? ' selected' : '') + '>'
          + v.name + '</option>').join('') + '</optgroup>'
      + '<optgroup label="Cost centres">' + CENTRES.map(c =>
          '<option value="' + c.id + '"' + (c.id === a.target ? ' selected' : '') + '>'
          + c.name + '</option>').join('') + '</optgroup></select>'
      + '<input class="input sm mono" type="number" step="0.5" style="text-align:right"'
      + ' data-alloc="share" data-rcp="' + r.id + '"' + attr + ' data-i="' + i + '" value="' + a.share + '">'
      + '<input class="input sm mono" type="number" step="0.01" style="text-align:right"'
      + ' data-alloc="amount" data-rcp="' + r.id + '"' + attr + ' data-i="' + i + '"'
      + ' value="' + (scopeAmt * (Number(a.share) || 0) / 100).toFixed(2) + '">'
      + '<button class="btn icon xs" type="button" data-allocdel="' + i + '" data-rcp="' + r.id + '"' + attr
      + ' aria-label="Remove allocation row">' + icon('x',15) + '</button>'
      + '</div>'
      + '<div class="owner">' + (tg ? tg.type : '')
      + (owner ? ' · ' + owner.name + ' (' + owner.id + ')' : ' · not recharged to an owner')
      + (tg && tg.imo ? ' · IMO ' + tg.imo : '') + '</div></div>';
  }).join('');

  const meter = '<div class="alloc-meter">'
    + list.map(a => '<i style="width:' + Math.max(0, Math.min(100, Number(a.share) || 0)) + '%"></i>').join('')
    + '</div>';

  return '<div style="display:grid;gap:9px">'
    + '<div class="alloc-row" style="align-items:end">'
    + '<span class="label">Vessel or cost centre</span><span class="label" style="text-align:right">Share %</span>'
    + '<span class="label" style="text-align:right">EUR</span><span></span></div>'
    + '<div class="alloc-rows">' + rows + '</div>'
    + meter
    + '<div class="alloc-state ' + (ok ? '' : 'bad') + '">'
    + (ok
        ? 'Allocated 100.0% of EUR ' + eur(scopeAmt) + ' — balanced.'
        : (sum > 100
            ? 'Over-allocated by ' + (sum - 100).toFixed(1) + '% — EUR '
              + eur(scopeAmt * (sum - 100) / 100) + ' more than the reimbursable total.'
            : 'Unallocated: ' + (100 - sum).toFixed(1) + '% — EUR '
              + eur(scopeAmt * (100 - sum) / 100) + ' still to assign.'))
    + '</div>'
    + '<div class="row" style="gap:7px">'
    + '<button class="btn xs" type="button" data-allocadd="1" data-rcp="' + r.id + '"' + attr + '>Add a split</button>'
    + '<button class="btn xs" type="button" data-allocbal="1" data-rcp="' + r.id + '"' + attr + '>Balance to 100%</button>'
    + (line ? '<button class="btn xs" type="button" data-allocclear="1" data-rcp="' + r.id + '"' + attr
              + '>Use the document split</button>' : '')
    + '</div></div>';
}

function allocCard(r){
  const lineSplits = r.lines.filter(l => l.alloc && l.alloc.length);
  const splittable = r.lines.filter(l => l._status !== 'excluded');
  return '<div class="card"><header class="ruled">'
    + '<div><h3>Who carries this cost</h3>'
    + '<p class="desc">A vessel budget, recharged to that owner — the part generic expense software has '
    + 'no concept of.</p></div>'
    + (receiptAllocValid(r) ? '<span class="badge outline dot">Balanced</span>'
                            : '<span class="badge striped">Unbalanced</span>') + '</header>'
    + '<div class="body" style="display:grid;gap:16px">'
    + (r.allocReason ? '<div class="callout">' + r.allocReason + '</div>' : '')
    + allocEditor(r, null)
    + (lineSplits.length
        ? '<hr class="sep">' + lineSplits.map(l =>
            '<div><span class="label" style="display:block;margin-bottom:9px">'
            + esc(l.gloss.value) + ' — EUR ' + eur(l._base) + ', split on its own</span>'
            + allocEditor(r, l) + '</div>').join('')
        : '')
    + '<hr class="sep">'
    + '<div><span class="label" style="display:block;margin-bottom:8px">Split one line differently</span>'
    + '<div class="row" style="gap:7px">'
    + splittable.map(l => '<button class="btn xs" type="button" data-splitline="' + l.id
        + '" data-rcp="' + r.id + '">'
        + ((l.alloc && l.alloc.length) ? 'Undo ' : '') + esc(l.gloss.value.split(',')[0])
        + '</button>').join('')
    + '</div></div>'
    + '</div></div>';
}
function outcomeCard(r){
  const t = receiptTotals(r);
  const rows = r.lines.map(l =>
    '<tr data-st="' + l._status + '"><td class="st"></td>'
    + '<td><div>' + esc(l.gloss.value) + '</div>'
    + (l._rules || []).map(x =>
        '<span class="rule-line ' + (x.effect === 'satisfied' ? 'satisfied' : '') + '">'
        + '<span class="rid">' + x.id + '</span><span>' + x.detail + '</span></span>').join('')
    + '</td>'
    + '<td class="num r amt" style="width:82px">' + eur(l._base) + '</td>'
    + '<td style="width:116px">' + statusBadge(l._status) + '</td></tr>').join('');
  return '<div class="card"><header class="ruled"><div><h3>What that does to this document</h3>'
    + '<p class="desc">Toggle a rule above and this changes.</p></div></header>'
    + '<div class="body tight"><div class="tbl-wrap"><table class="tbl ledger">'
    + '<thead><tr><th class="st"></th><th>Item</th><th class="r">EUR</th>'
    + '<th>Outcome</th></tr></thead><tbody>' + rows + '</tbody>'
    + '<tfoot><tr><td class="st"></td><td>Reimbursable</td>'
    + '<td class="num r">' + eur(t.reimbursable) + '</td>'
    + '<td><span class="muted" style="font-weight:400;font-size:12px">less '
    + eur(t.excluded) + '</span></td></tr></tfoot></table></div></div></div>';
}

function buildPayload(){
  const c = state.claim, t = claimTotals();
  const lines = [];
  c.receipts.forEach(r => {
    const fx = r._fx;
    r.lines.forEach(l => {
      const editedFields = ['orig','gloss','qty','unit','total','cat','taxRate']
        .filter(k => l[k].edited);
      const alloc = l._status === 'excluded' ? [] : allocFor(r, l).map(a => {
        const tg = targetById(a.target), o = ownerOfTarget(a.target);
        return {
          cost_object_id:a.target,
          cost_object:tg ? tg.name : a.target,
          imo:tg && tg.imo ? tg.imo : null,
          owner_account:o ? o.id : null,
          owner_name:o ? o.name : null,
          management_agreement:o ? o.agreement : null,
          share_pct:Number(a.share),
          amount_base:round2(l._base * Number(a.share) / 100)
        };
      });
      lines.push({
        line_id:l.id,
        source_document:{
          ref:r.id, document_no:r.docNo.value,
          image:'claims/' + c.id + '/' + r.id + '.jpg',
          merchant:r.merchant.value, country:r.country.value
        },
        description_original:l.orig.value,
        description_en:l.gloss.value,
        quantity:Number(l.qty.value),
        unit_price_original:Number(l.unit.value),
        amount_original:Number(l.total.value),
        currency_original:r.currency.value,
        transaction_date:r.date.value,
        amount_base:round2(l._base),
        base_currency:BASE,
        fx_rate:fx.rate,
        fx_rate_date:fx.date,
        fx_source:fx.source,
        fx_overridden:fx.overridden,
        tax:{
          rate_pct:Number(l.taxRate.value) || null,
          inclusive:r.taxInclusive,
          amount_original:Number(l.taxRate.value) ? round2(l._taxOrig) : null,
          amount_base:Number(l.taxRate.value) ? round2(l._tax) : null,
          recoverable:Number(l.taxRate.value) > 0 && l._status !== 'excluded'
        },
        category:l.cat.value,
        policy_outcome:l._status,
        policy_rules:(l._rules || []).map(x => ({rule_id:x.id, effect:x.effect, detail:x.detail})),
        note:l.note || null,
        allocation:alloc,
        extraction:{
          confidence:round2(l._minConf),
          human_edited:editedFields.length > 0,
          edited_fields:editedFields,
          ai_proposed:editedFields.reduce((o, k) => { o[k] = l[k].ai; return o; }, {})
        }
      });
    });
  });

  return {
    claim:{
      id:c.id, status:c.status, title:c.title,
      traveller:{name:c.traveller, role:c.role},
      period:c.period, submitted_on:c.submittedOn,
      base_currency:BASE,
      policy_set:state.policy.filter(p => p.enabled).map(p => p.id),
      generated_at:TODAY
    },
    summary:{
      gross_document_total:round2(t.gross),
      excluded_total:round2(t.excluded),
      reimbursable_total:round2(t.reimbursable),
      flagged_for_review_total:round2(t.review),
      recoverable_vat_total:round2(t.vat),
      by_cost_object:Object.keys(t.byTarget).map(k => {
        const tg = targetById(k);
        return {cost_object_id:k, cost_object:tg ? tg.name : k, amount_base:round2(t.byTarget[k])};
      }),
      by_owner_account:Object.keys(t.byOwner).map(k => {
        const o = OWNERS.find(x => x.id === k);
        return {owner_account:k, owner_name:o ? o.name : 'Internal cost centres',
                amount_base:round2(t.byOwner[k])};
      }),
      exclusions_by_rule:state.policy.map(p => {
        const b = ruleBite(p.id);
        return b.lines ? {rule_id:p.id, lines:b.lines, amount_base:round2(b.amount)} : null;
      }).filter(Boolean)
    },
    lines:lines
  };
}
function round2(n){ return Math.round((Number(n) || 0) * 100) / 100; }

function renderPayload(){
  const p = buildPayload();
  const json = JSON.stringify(p, null, 2);
  document.getElementById('pane-payload').innerHTML =
    (state.claim.receipts.length ? stepper() : '')
    + '<div class="stack pane-wide">'
    + '<div class="card"><header class="ruled"><div><h3>' + p.claim.id + '</h3>'
    + '<p class="desc">' + p.lines.length + ' lines. Carries the FX rate and its date, the rule behind '
    + 'each exclusion, the vessel and owner, and what the AI read before anyone corrected it.</p></div>'
    + '<div class="row" style="gap:7px">'
    + '<button class="btn sm" type="button" id="copyPayload">Copy JSON</button>'
    + '<button class="btn sm" type="button" id="selectPayload">Select all</button></div></header>'
    + '<div class="body"><pre class="payload" id="payloadPre">' + esc(json) + '</pre></div></div></div>';
}
function portfolio(){
  const t = claimTotals();
  const byTarget = {}, byOwner = {};
  const add = (o, k, v) => { o[k] = (o[k] || 0) + v; };
  Object.keys(t.byTarget).forEach(k => add(byTarget, k, t.byTarget[k]));
  Object.keys(t.byOwner).forEach(k => add(byOwner, k, t.byOwner[k]));
  let vat = t.vat, reimb = t.reimbursable, excl = t.excluded;
  const excByRule = {};
  state.policy.forEach(p => { const b = ruleBite(p.id); if (b.lines) excByRule[p.id] = {lines:b.lines, amount:b.amount}; });

  state.history.forEach(h => {
    vat += h.vat; reimb += h.reimbursable; excl += h.excluded;
    Object.keys(h.byTarget).forEach(k => {
      add(byTarget, k, h.byTarget[k]);
      const o = ownerOfTarget(k);
      add(byOwner, o ? o.id : 'CC', h.byTarget[k]);
    });
    h.exclusions.forEach(e => {
      if (!excByRule[e.ruleId]) excByRule[e.ruleId] = {lines:0, amount:0};
      excByRule[e.ruleId].lines += e.lines;
      excByRule[e.ruleId].amount += e.amount;
    });
  });
  const counts = {draft:0, submitted:0, approved:0};
  counts[state.claim.status]++;
  state.history.forEach(h => counts[h.status]++);
  return {byTarget:byTarget, byOwner:byOwner, vat:vat, reimbursable:reimb, excluded:excl,
          excByRule:excByRule, counts:counts, draftVat:t.vat};
}

function renderDashboard(){
  const p = portfolio();
  const flagged = [];
  state.claim.receipts.forEach(r => r.lines.forEach(l => {
    if (l._status === 'review') flagged.push({r:r, l:l});
  }));

  const maxT = Math.max.apply(null, Object.keys(p.byTarget).map(k => p.byTarget[k]).concat([1]));
  const vesselBars = VESSELS.concat(CENTRES).map(v => {
    const amt = p.byTarget[v.id] || 0;
    const o = ownerOfTarget(v.id);
    return '<div class="bar-row"><div class="nm">' + v.name
      + '<small>' + (o ? o.name : 'internal, not recharged')
      + (v.imo ? ' · IMO ' + v.imo : '') + '</small></div>'
      + '<div class="bar-track"><i class="' + (amt === maxT ? 'lead' : (o ? '' : 'hatch'))
      + '" style="width:' + (amt / maxT * 100).toFixed(1) + '%"></i></div>'
      + '<div class="vv">' + eur(amt) + '</div></div>';
  }).join('');

  const maxO = Math.max.apply(null, Object.keys(p.byOwner).map(k => p.byOwner[k]).concat([1]));
  const ownerBars = OWNERS.map(o => o.id).concat(['CC']).map(k => {
    const o = OWNERS.find(x => x.id === k);
    const amt = p.byOwner[k] || 0;
    return '<div class="bar-row"><div class="nm">' + (o ? o.name : 'Internal cost centres')
      + '<small>' + (o ? o.agreement : 'not recharged') + '</small></div>'
      + '<div class="bar-track"><i class="' + (amt === maxO ? 'lead' : (o ? '' : 'hatch'))
      + '" style="width:' + (amt / maxO * 100).toFixed(1) + '%"></i></div>'
      + '<div class="vv">' + eur(amt) + '</div></div>';
  }).join('');

  const excRows = Object.keys(p.excByRule).map(id => {
    const r = ruleById(id), b = p.excByRule[id];
    return '<tr><td>' + (r ? r.title : 'Extraction confidence floor')
      + '<div class="muted" style="font-size:11.5px;margin-top:2px">' + id + '</div></td>'
      + '<td class="num r">' + b.lines + '</td><td class="num r">' + eur(b.amount) + '</td>'
      + '<td>' + (r ? (r.enabled ? '<span class="badge outline dot">on</span>'
                                 : '<span class="badge striped">off</span>')
                    : '<span class="badge outline">system</span>') + '</td></tr>';
  }).join('') || '<tr><td colspan="4" class="empty">No rule has bitten yet.</td></tr>';

  const flagRows = flagged.length ? flagged.map(f =>
      '<tr><td>' + esc(f.l.gloss.value)
      + '<div class="muted" style="font-size:11.5px;margin-top:2px">'
      + esc(String(f.r.merchant.value).split(' (')[0]) + ' · ' + f.r.date.value + '</div></td>'
      + '<td class="num r">' + eur(f.l._base) + '</td>'
      + '<td style="max-width:38ch">' + (f.l._rules || []).filter(x => x.effect === 'review')
          .map(x => x.detail).join('; ')
      + (f.l.note ? '<div class="muted" style="font-size:11.5px;margin-top:3px">Note: '
          + esc(f.l.note) + '</div>' : '') + '</td></tr>').join('')
    : '<tr><td colspan="3" class="empty">Nothing is waiting on a human.</td></tr>';

  const waiting = state.history.filter(h => h.status === 'submitted');
  const rechargeTab = state.dashTab.recharge;
  const attentionTab = state.dashTab.attention;

  const tabs = (group, opts) => '<div class="tabs">'
    + opts.map(o => '<button type="button" role="tab" data-dashtab="' + group + ':' + o[0] + '"'
        + ' aria-selected="' + (state.dashTab[group] === o[0]) + '">' + o[1] + '</button>').join('')
    + '</div>';

  document.getElementById('pane-dashboard').innerHTML =
    '<div class="stack pane-wide">'

    + '<div class="dash-top">'
    + '<div class="stat hero"><div class="k">Reimbursable, all claims</div>'
    + '<div class="v">EUR ' + eur(p.reimbursable) + '</div>'
    + '<div class="s">EUR ' + eur(p.vat) + ' of that is recoverable VAT. EUR ' + eur(p.excluded)
    + ' was excluded by policy before it got here.</div></div>'
    + '<div class="stat"><div class="k">Open</div><div class="v">' + p.counts.draft + '</div>'
    + '<div class="s">draft, not yet submitted</div></div>'
    + '<div class="stat"><div class="k">Awaiting approval</div><div class="v">' + waiting.length + '</div>'
    + '<div class="s">' + (waiting.length
        ? 'longest ' + Math.max.apply(null, waiting.map(h => daysSince(h.submittedOn))) + ' days'
        : 'nothing pending') + '</div></div>'
    + '<div class="stat"><div class="k">Needs a human</div><div class="v">' + flagged.length + '</div>'
    + '<div class="s">lines flagged for review</div></div>'
    + '<div class="stat"><div class="k">Approved</div><div class="v">' + p.counts.approved + '</div>'
    + '<div class="s">closed and recharged</div></div></div>'

    + '<div class="card"><header class="ruled"><div><h3>Recharge</h3>'
    + '<p class="desc">Who carries the cost, in EUR, across every loaded claim.</p></div>'
    + tabs('recharge', [['vessel','By vessel'],['owner','By owner']]) + '</header>'
    + '<div class="body"><div class="bars">'
    + (rechargeTab === 'vessel' ? vesselBars : ownerBars) + '</div></div></div>'

    + '<div class="card"><header class="ruled"><div><h3>Needs attention</h3>'
    + '<p class="desc">' + (attentionTab === 'flagged'
        ? 'Lines a human has to look at before approval.'
        : 'Which rules actually bite, so a policy owner can see what the set is doing.') + '</p></div>'
    + tabs('attention', [['flagged','Flagged lines'],['rules','By rule']]) + '</header>'
    + '<div class="body tight"><div class="tbl-wrap"><table class="tbl">'
    + (attentionTab === 'flagged'
        ? '<thead><tr><th>Item</th><th class="r">EUR</th><th>Why</th></tr></thead><tbody>' + flagRows + '</tbody>'
        : '<thead><tr><th>Rule</th><th class="r">Lines</th><th class="r">EUR</th><th>State</th></tr></thead>'
          + '<tbody>' + excRows + '</tbody>')
    + '</table></div></div></div>'

    + '<div class="card"><header class="ruled"><div><h3>Claims</h3>'
    + '<p class="desc">One open, two closed.</p></div></header>'
    + '<div class="body tight"><div class="tbl-wrap"><table class="tbl">'
    + '<thead><tr><th>Trip</th><th class="r">Reimbursable</th><th>Status</th></tr></thead><tbody>'
    + claimRow(state.claim.id, state.claim.title, claimTotals().reimbursable,
               state.claim.status, state.claim.submittedOn)
    + state.history.map(h => claimRow(h.id, h.title, h.reimbursable, h.status, h.submittedOn)).join('')
    + '</tbody></table></div></div></div></div>';

  function claimRow(id, title, reimb, status, on){
    const wait = status === 'submitted' && on ? ' · waiting ' + daysSince(on) + ' days' : '';
    return '<tr><td>' + title
      + '<div class="muted" style="font-size:11.5px;margin-top:2px">' + id + wait + '</div></td>'
      + '<td class="num r">' + eur(reimb) + '</td>'
      + '<td><span class="badge ' + (status === 'draft' ? 'outline' : status === 'submitted' ? 'striped' : 'solid')
      + '">' + status + '</span></td></tr>';
  }
}
const SUGGESTIONS = [
  'Which claims are awaiting approval, and for how long?',
  'How much has been recharged to Helios Maritime?',
  'Which lines were excluded, and under which rule?',
  'How much recoverable VAT is sitting in unsubmitted claims?',
  'What is the total per vessel?',
  'What was the exchange rate on the Busan receipt?'
];

function answer(q){
  const s = q.toLowerCase();
  const t = claimTotals(), p = portfolio();
  const has = w => s.indexOf(w) >= 0;

  if (has('approval') || has('awaiting') || has('pending') || has('how long')){
    const subs = state.history.filter(h => h.status === 'submitted')
      .concat(state.claim.status === 'submitted' ? [{id:state.claim.id, title:state.claim.title,
        reimbursable:t.reimbursable, submittedOn:state.claim.submittedOn}] : []);
    if (!subs.length) return {text:'No claim is currently awaiting approval.',
      cites:[state.claim.id].concat(state.history.map(h => h.id))};
    return {
      text:subs.length + ' claim' + (subs.length === 1 ? ' is' : 's are') + ' awaiting approval, as at ' + TODAY + '.',
      list:subs.map(h => h.id + ' — ' + h.title + ' — EUR ' + eur(h.reimbursable)
        + ', submitted ' + h.submittedOn + ', waiting ' + daysSince(h.submittedOn) + ' days'),
      cites:subs.map(h => h.id)
    };
  }

  const owner = OWNERS.find(o => has(o.name.toLowerCase().split(' ')[0]));
  if (owner || has('owner')){
    if (owner){
      const amt = p.byOwner[owner.id] || 0;
      const draft = claimTotals().byOwner[owner.id] || 0;
      const hist = state.history.filter(h => Object.keys(h.byTarget)
        .some(k => { const o = ownerOfTarget(k); return o && o.id === owner.id; }));
      return {
        text:'EUR ' + eur(amt) + ' is recharged to ' + owner.name + ' across the loaded claims, of which '
          + 'EUR ' + eur(draft) + ' sits in the open claim ' + state.claim.id + ' and is not yet submitted.',
        list:['Agreement basis: ' + owner.agreement,
              'Vessels under this account: ' + VESSELS.filter(v => v.owner === owner.id).map(v => v.name).join(', ')],
        cites:[state.claim.id].concat(hist.map(h => h.id))
      };
    }
    return {
      text:'Recharge per owner account across the loaded claims:',
      list:Object.keys(p.byOwner).map(k => {
        const o = OWNERS.find(x => x.id === k);
        return (o ? o.name + ' (' + o.id + ')' : 'Internal cost centres') + ' — EUR ' + eur(p.byOwner[k]);
      }),
      cites:[state.claim.id].concat(state.history.map(h => h.id))
    };
  }

  if (has('exclud') || has('rule') || has('policy') || has('alcohol')){
    const rows = [];
    state.claim.receipts.forEach(r => r.lines.forEach(l => {
      if (l._status !== 'excluded') return;
      const rule = (l._rules || []).find(x => x.effect === 'excluded');
      rows.push({id:l.id, txt:l.gloss.value + ' — ' + r.currency.value + ' '
        + money(l.total.value, r.currency.value) + ' (EUR ' + eur(l._base) + ') — '
        + (rule ? rule.id : 'no rule') + ' — ' + r.merchant.value});
    }));
    if (!rows.length) return {
      text:'No line in the open claim is currently excluded. POL-001 is '
        + (ruleById('POL-001').enabled ? 'active but no line is categorised Alcohol'
                                       : 'switched off, so alcohol lines are being carried') + '.',
      cites:[state.claim.id]};
    return {
      text:rows.length + ' line' + (rows.length === 1 ? '' : 's') + ' excluded in ' + state.claim.id
        + ', totalling EUR ' + eur(t.excluded) + '. Historic claims add EUR '
        + eur(p.excluded - t.excluded) + ' under POL-001.',
      list:rows.map(x => x.txt),
      cites:rows.map(x => x.id).concat(state.history.map(h => h.id))
    };
  }

  if (has('vat') || has('reclaim') || has('recover')){
    const unsub = state.claim.status === 'draft' ? t.vat : 0;
    return {
      text:'EUR ' + eur(unsub) + ' of recoverable VAT is sitting in unsubmitted claims — all of it in '
        + state.claim.id + ', which is still a draft. Across every loaded claim the figure is EUR '
        + eur(p.vat) + '.',
      list:state.claim.receipts.map(r => {
        const rt = receiptTotals(r);
        return r.id + ' — ' + r.merchant.value + ' — EUR ' + eur(rt.vat)
          + (rt.vat === 0 ? ' (no VAT shown on the document)' : '');
      }),
      cites:[state.claim.id].concat(state.claim.receipts.map(r => r.id))
    };
  }

  if (has('vessel') || has('per vessel') || VESSELS.some(v => has(v.name.toLowerCase().split(' ')[1] || ''))){
    return {
      text:'Reimbursable cost per vessel across the loaded claims:',
      list:VESSELS.concat(CENTRES).map(v => {
        const o = ownerOfTarget(v.id);
        return v.name + (v.imo ? ' (IMO ' + v.imo + ')' : '') + ' — EUR ' + eur(p.byTarget[v.id] || 0)
          + (o ? ' — recharged to ' + o.name : ' — internal, not recharged');
      }),
      cites:[state.claim.id].concat(state.history.map(h => h.id))
    };
  }

  if (has('rate') || has('exchange') || has('fx') || has('convert')){
    return {
      text:'Rates applied in ' + state.claim.id + ', each keyed to its own transaction date:',
      list:state.claim.receipts.map(r => {
        const fx = r._fx;
        return r.id + ' — ' + r.currency.value + ' on ' + r.date.value + ' — '
          + (fx.rate === null ? 'no rate held'
             : '1 ' + r.currency.value + ' = ' + fx.rate.toFixed(6) + ' EUR (rate date ' + fx.date + ')')
          + (fx.overridden ? ' — manually overridden' : '');
      }).concat(['Source: ' + FX_SOURCE + '. Fixture data, not a live feed.']),
      cites:state.claim.receipts.map(r => r.id)
    };
  }

  if (has('total') || has('how much') || has('claim')){
    return {
      text:'Open claim ' + state.claim.id + ': EUR ' + eur(t.gross) + ' gross on the documents, EUR '
        + eur(t.excluded) + ' excluded by policy, EUR ' + eur(t.reimbursable) + ' reimbursable, of which EUR '
        + eur(t.review) + ' is flagged for review. Recoverable VAT EUR ' + eur(t.vat) + '.',
      cites:[state.claim.id]
    };
  }

  return {
    text:'The loaded claim data does not support an answer to that. I can only work from '
      + (1 + state.history.length) + ' claims — ' + state.claim.id + ', '
      + state.history.map(h => h.id).join(', ') + ' — and I will not put a number to anything outside them.',
    list:['Try: awaiting approval · recharge per owner · excluded lines and their rule · recoverable VAT · '
      + 'totals per vessel · the FX rate on a document'],
    cites:[]
  };
}

function renderAsk(){
  const log = state.askLog.map(m => m.role === 'you'
    ? '<div class="msg you">' + esc(m.text) + '</div>'
    : '<div class="msg bot"><div class="hdr">Answered from claim data</div>'
      + '<div>' + m.text + '</div>'
      + (m.list ? '<ul>' + m.list.map(x => '<li>' + x + '</li>').join('') + '</ul>' : '')
      + (m.cites && m.cites.length
          ? '<div class="cites"><span>cited:</span>' + m.cites.map(c => '<b>' + c + '</b>').join('')
            + '</div>'
          : '<div class="cites"><span>no figures asserted</span></div>')
      + '</div>').join('');

  document.getElementById('pane-ask').innerHTML =
    '<div class="stack pane-wide" style="max-width:920px">'
    + '<div class="card"><header class="ruled"><div><h3>Ask the claim data</h3>'
    + '<p class="desc">' + (1 + state.history.length) + ' claims in scope. Every answer names its sources, '
    + 'and refuses rather than guessing.</p></div></header>'
    + '<div class="body">'
    + (log ? '<div class="chat" id="chat">' + log + '</div>'
           : '<div class="empty">No questions yet. Pick one below.</div>')
    + '<div class="chips" style="margin-top:14px">'
    + SUGGESTIONS.map(q => '<button class="chip" type="button" data-ask="' + esc(q) + '">'
        + esc(q) + '</button>').join('')
    + '</div>'
    + '<form class="ask-form" id="askForm"><input class="input" id="askInput"'
    + ' placeholder="Ask about the loaded claims…" autocomplete="off">'
    + '<button class="btn primary" type="submit">Ask</button></form>'
    + '</div></div></div>';
}
