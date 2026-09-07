# Build Spec: Superintendent Expense Capture PoC

A proof of concept, not a product. Read `01-research-context.md` first for
market and client background.

Stack, framework, styling and visual design are all the implementer's choice
and deliberately unspecified here. This document defines *what must be true*,
not how it should look or what it should be built with.

---

## 1. The claim being proved

> A photograph of a foreign-language paper receipt can become audit-ready,
> vessel-allocated, policy-checked accounting data in under a minute, with the
> traveller confirming rather than typing.

Everything in the build exists to demonstrate that sentence. Anything that does
not serve it is out of scope.

### Success criteria

The PoC succeeds if, in a live demo:

1. A receipt image in a non-Latin script produces correct structured line items
   without manual typing.
2A non-reimbursable line is identified and excluded from the claim total
   automatically, with the exclusion visible and explained.
3. A single trip's costs are split across more than one vessel and owner
   account.
4. Currency conversion uses the rate at the transaction date, and both the rate
   and the date are shown on the claim.
5. The output is a structured payload an accounting system could consume.

If a viewer cannot see all five happen, the PoC has failed regardless of how
finished it looks.

### Explicit non-goals

- Real authentication, user accounts, or multi-tenancy.
- Real accounting system integration. Show the payload; do not send it.
- Mobile app. A web page is sufficient.
- Persistence beyond the current session.
- Handling the full range of receipt formats. Three or four fixtures is enough.
- Anything from the visa/travel-readiness idea. That is roadmap, not PoC.

---

## 2. Core flow

Seven steps, in order. Each must be visible to an observer.

### Step 1 — Capture

Accept a receipt image. Provide two paths: upload a file, and pick from
pre-loaded sample receipts. The samples matter more than upload — they
guarantee the demo works without network luck or a good camera.

### Step 2 — Extract

Send the image to a vision-capable LLM. Extract:

- merchant name, address, country
- transaction date and time
- currency (as printed)
- **individual line items**, each with description, quantity, unit price,
  line total
- tax lines (VAT/GST) with rate and amount where present
- service charge or tip if separately stated
- document total

Line-item level extraction is mandatory, not optional. Receipt-level totals
alone cannot demonstrate the policy engine.

Show a processing state. Extraction takes seconds and silence reads as a bug.

If extraction returns low confidence on a field, mark that field rather than
guessing silently.

### Step 3 — Translate and normalise

Where the receipt is not in English, show both the original text and an English
gloss for each line item. The original must remain visible — an auditor needs
to tie the claim back to the physical document.

Normalise descriptions to a consistent category set. Suggested minimum:

`Meals` · `Accommodation` · `Ground transport` · `Air travel` · `Communications`
· `Laundry` · `Supplies` · `Port and agency fees` · `Other`

### Step 4 — Apply policy

Evaluate each line item against a configurable policy set, and mark each line
as `reimbursable`, `excluded`, or `needs review`.

Policy rules must be **data, not code**. The demo has to be able to toggle a
rule live and show the claim total change — this is what makes it "tailored"
rather than generic.

Minimum rule types to support:

| Rule type | Example |
|---|---|
| Category exclusion | Alcohol is not reimbursable |
| Per-item cap | Meals over EUR 60 per head need review |
| Daily cap | Total meals over EUR 120 per day need review |
| Required evidence | Accommodation over EUR 200 requires an itemised invoice |
| Allowed with condition | Alcohol reimbursable when entertaining a client |

The alcohol rule is the demo centrepiece and must be toggleable both ways,
because company policy genuinely varies. When a line is excluded, state which
rule excluded it. Never silently drop a line.

Design note on framing: the value is that the traveller no longer has to ask a
venue to split the bill, and cannot accidentally file a non-compliant claim.
It is a compliance aid, not an evasion aid. Wording in the interface should
reflect that.

### Step 5 — Confirm

The traveller reviews and corrects before anything is submitted. They must be
able to edit any extracted field, override a category, and add a note against
an excluded or flagged line.

Record what the AI proposed and what the human changed. Keep both. This is
what makes the system auditable and is the single most important thing to show
anyone with a governance or assurance mindset.

Nothing proceeds without an explicit confirmation action.

### Step 6 — Allocate

**This is the differentiating feature. Do not skip or minimise it.**

Assign each line item, or the whole receipt, to one or more vessels. Each
vessel maps to an owner account. Support:

- allocating a whole receipt to one vessel
- splitting a receipt across vessels by percentage or by explicit amount
- allocating individual line items to different vessels
- a small number of non-vessel cost centres, e.g. `Office — Limassol`, for
  costs that are genuinely overhead

Allocation must always sum to 100% of the reimbursable total. Block
confirmation if it does not, and say what is unallocated.

Use a small fixture set of vessels and owners, e.g. three vessels across two
owners, so a realistic multi-vessel split can be demonstrated.

### Step 7 — Output

Produce and display a structured payload representing the claim. Show it, do
not transmit it.

The payload must include, per line:

- source document reference and a link or pointer to the stored image
- original currency amount, currency code, and transaction date
- converted amount, base currency, **the FX rate used, and the date that rate
  is for**
- tax amount and rate where captured
- category, policy outcome, and the rule ID that produced any exclusion
- vessel, owner account, and allocation share
- extraction confidence and a flag for whether the human edited the field

Include a per-claim summary: gross document total, excluded total, reimbursable
total, recoverable VAT total, and totals per vessel and per owner.

---

## 3. Currency handling

Get this right or an auditor will dismiss the whole thing.

- Use a **historical** rate keyed to the transaction date. Never a live spot
  rate. A live rate produces a different number every page load, which is
  unauditable.
- Display the rate and its effective date alongside every converted amount.
- Support a company base currency, configurable. Default EUR.
- Where a company policy uses the actual card settlement rate instead of a
  published rate, allow the rate to be overridden manually and record that it
  was overridden.
- For the PoC, a small static table of historical rates for the fixture dates
  is acceptable and more reliable than a live API call in a meeting. Label it
  clearly as fixture data.

Crypto support is unnecessary for this audience. Ignore it.

---

## 4. VAT capture

Capture VAT lines separately wherever the receipt shows them, with rate and
amount.

This converts the pitch from a time-saving estimate into a recoverable-cash
figure, which is a stronger number to put in front of a finance decision-maker.
Companies routinely fail to reclaim foreign VAT on business travel because
nobody captures it at line level.

Show a running "recoverable VAT" total on the claim summary. Do not attempt to
implement reclaim mechanics — identifying and totalling it is enough.

---

## 5. Dashboard

Keep it small. Its only job is to show that the captured data aggregates into
something a manager would act on.

Minimum:

- claims by status: draft, submitted, approved
- reimbursable total per vessel and per owner account
- recoverable VAT total
- exclusions by rule, so a policy owner can see which rules actually bite
- a list of items flagged for review

Resist building analytics beyond this. It is not what is being proved.

---

## 6. AI agent surface

One conversational surface over the claim data, answering questions a finance
or ops person would actually ask. For example:

- which claims are awaiting approval, and for how long
- total recharged to a given owner this quarter
- which lines were excluded and under which rule
- how much recoverable VAT is sitting in unsubmitted claims

Constrain it to the claim dataset. It must cite the specific claims or lines
behind any figure it states, and it must not invent numbers when the data does
not support an answer — say so instead.

This is a secondary feature. Build it only after steps 1–7 work end to end.

---

## 7. Fixture data

Prepare receipts that exercise the hard cases. Suggested set:

| Fixture | Purpose |
|---|---|
| Restaurant receipt, Korean, KRW, includes soju and beer | Non-Latin script + the alcohol exclusion |
| Hotel folio, Chinese, CNY, includes minibar and laundry | Multi-category single document + mixed policy outcomes |
| Taxi and lunch, Greek, EUR, VAT itemised at 24% | VAT capture and reclaim total |
| Handwritten or poor-quality receipt | Low-confidence handling and the human-correction path |

Vessels: three, across two owner accounts, with a plausible mix of types.

Design the fixtures so that one trip legitimately spans more than one vessel.
The multi-vessel split cannot be demonstrated otherwise.

---

## 8. Build order

Do not build breadth-first. Get one path fully working before widening.

1. Static page rendering one hardcoded extracted receipt with line items.
2. Real LLM extraction from one sample image, replacing the hardcode.
3. Policy engine with the alcohol rule, driven by a config object.
4. Human confirmation and edit, with before/after retained.
5. Vessel and owner allocation, including a multi-vessel split.
6. Historical FX conversion with rate and date shown.
7. Structured payload output.
8. Remaining fixtures.
9. Dashboard.
10. Agent surface, if time allows.

Steps 1–7 are the PoC. Steps 8–10 are polish. If time runs short, a narrow
demo that completes the full chain beats a broad demo that stops at extraction.

---

## 9. Things to state openly in the demo

Credibility comes from naming the limits before anyone asks.

- Extraction accuracy is unmeasured. If there is time, run the fixtures ten
  times and report a field-level accuracy figure. A measured number, even an
  imperfect one, is worth more than a polished interface.
- FX rates are fixture data, not a live feed.
- No integration exists. The payload is shown, not delivered.
- Policy rules are illustrative and would be configured per client.
- The security and data-residency questions are unaddressed and would need
  answering before any pilot — receipt images contain personal data, so GDPR
  applies, and the eventual client's stack constraints would govern where
  processing happens.

---

## 10. Roadmap slide content

Keep out of the build. Include in the pitch so the PoC reads as step one of
something rather than a one-off.

- **Phase 2 — EN16931 rebilling.** Generate the owner rebilling invoice as a
  compliant e-invoice from allocated claim data. Prior art and licence details
  in the research document.
- **Phase 2 — Travel readiness register.** Passport and visa validity, and
  Schengen 90/180 rolling-window tracking. Details in the research document.
- **Phase 3 — Corporate card reconciliation.** Match receipts to card
  transactions and chase the missing ones automatically.
