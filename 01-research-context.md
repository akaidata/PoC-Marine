# Research Context: Ship Management PoC (Cyprus)

Background research compiled for a proof-of-concept targeting ship management
companies, primarily in Limassol, Cyprus. This document is context only — the
build spec is in `02-poc-build-spec.md`.

All facts below were gathered from public sources in September 2026. Figures
sourced from company marketing material are claims by that company, not
independently verified.

---

## 1. Why this market

- Cyprus has the third-largest fleet in Europe and the 11th largest globally.
- Companies operating from the island manage more than 20% of the world's
  third-party managed fleet.
- Limassol hosts 200+ shipping and shipping-related companies: shipowners,
  shipmanagers, insurers, financiers, brokers, maritime technology providers.
- The sector contributed roughly 7% of Cyprus' GDP in 2025 (~EUR 1.9bn).
- Third-party ship management is asset-light: capital sits with the owner,
  while the fee, expertise and employment sit in Limassol.

Implication: a dense, geographically concentrated, high-value buyer pool.

---

## 2. Regulatory backdrop (relevant but NOT the PoC target)

Included because it shapes conversations with this sector, and because it was
the original PoC direction before being ruled out.

- **EU ETS** reached 100% phase-in from January 2026 (up from 70% in 2025).
  From 1 January 2026 exposure is calculated in CO2-equivalent, so methane and
  nitrous oxide now count.
- **FuelEU Maritime**: compliance responsibility sits on the ISM company —
  typically the *technical manager*, not the owner. Penalty is approximately
  EUR 2,400 per tonne of VLSFO-equivalent deficit.
- **UK ETS** for shipping from 1 July 2026 — emissions are not double-counted
  but the administrative burden is (separate reporting, separate surrender).
- 2025 compliance year: verified emissions due 31 March 2026; allowance
  surrender covering 70% due 30 September 2026.
- IMO Net Zero Framework negotiations were adjourned and resume in 2026,
  leaving long-term fuel and retrofit decisions unresolved.

**Why this was dropped as a PoC:** see section 3.

---

## 3. Columbia Group / Schoeller Holdings — company research

### Structure

- **Schoeller Holdings Ltd** is the parent. Dodekanison 18, Germasogeia,
  Limassol. Divisions: maritime, aviation, hospitality, horticulture.
- **Maritime**: Columbia Group, AAL Shipping, Hanse Bereederung, GenPro,
  Deutsche Offshore Schifffahrt, plus own shipowning.
- **Aviation**: ACC Columbia Jet Service, Skyside.
- **Hospitality**: Columbia Beach Resort, Columbia Restaurants, Columbia
  Secret Valley golf course, Quality Laundry Services.
- **Horticulture**: House & Garden.
- **Columbia Group HQ**: 21 Spyrou Kyprianou Ave, Yermasoyia, Limassol.
  Shares a switchboard with the parent (+357 25 843100).
- CEO and President: Mark O'Neil.

### Scale (company claims)

- 45+ years operating.
- 25+ management and representative offices, crew agencies, training centres.
- 20,000+ employees on land and sea.
- 325+ vessels under newbuilding supervision.
- Positions itself as the first fully-integrated maritime services platform,
  moving from third-party toward a "second-party" operating model.

### What they have already built — this is the key finding

Columbia is far ahead of the rest of the Limassol market on digitalisation:

- **EmissionLink** — their own FuelEU and EU ETS compliance product, sold
  standalone, covering data management through legal guidance.
- **POCR / OneLink** — 24/7 fleet monitoring: route, speed and fuel
  optimisation, energy management, emission tracking, commercial analytics.
- **SmartSea** — ship-to-shore data integration partnership.
- **MORSE** (Prevention at Sea) — digital compliance platform, deployed across
  the entire managed fleet as of April 2026.
- 100+ vessels on Starlink; hologram and VR crew training.
- Five EU-funded R&D projects: DECAtrust, FLEETfor55, NH3CRAFT, BlueBARGE,
  MDigi-I. Plus Cyberfort (Cyber Resilience Act readiness for SMEs).

**Consequence:** any emissions-compliance or fleet-performance tool pitched to
Columbia would be an inferior version of something they already own. Ruled out.

### AI function

- **Christina Orfanidou** appointed Head of AI, February 2026.
- Previously Head of AI Services at **Deloitte Cyprus**. Prior European
  Commission work with ACER, DG CONNECT and EFSA on AI adoption and AI/data
  governance. (LinkedIn also indicates PwC background — verify independently.)
- Building an internal **"AI factory"**: tailored solutions developed with
  business units rather than siloed in a technical team.
- Stated initial focus is **internal operations**, where risk is lower and
  impact immediate:
  - AI agents handling repetitive office tasks
  - internal knowledge management tools
  - modernised crewing assignment systems
  - reducing document production time
- Explicitly *not* emissions or fleet performance.

### Hiring signals (Limassol, as of September 2026)

- Junior AI Developer
- Data Engineer / Junior Data Engineer
- Senior ERP Consultant (Microsoft Dynamics AX F&O)
- Junior ERP Functional Consultant & Support (Microsoft ERP Solutions)
- Senior Administrator (Hamburg)

Two readings:

1. **Junior-heavy AI hiring** = building capability from scratch cheaply. One
   senior leader plus juniors is a capability *gap*, not a capability.
2. **Senior + junior Dynamics AX/F&O hiring** = likely ERP migration in flight
   or a strained legacy estate. AX is the legacy on-premise product; F&O is the
   cloud successor. This is a large, well-funded consulting engagement of a very
   conventional kind.

### Technology stack constraint

Their AI job spec names an entirely Microsoft stack: Azure AI Foundry, Azure
OpenAI, Azure Machine Learning, Azure AI Search, Azure AI Services, Microsoft
Fabric, GitHub Copilot, Azure DevOps. ERP is Microsoft Dynamics.

Anything eventually proposed to Columbia must be Azure-native or it is dead on
arrival. Does not constrain the PoC itself.

### Growth pressure

- New Mumbai hub announced January 2026, recruiting 220 new staff.
- **Noatum-CSM** JV with AD Ports Group (UAE), 34 vessels under technical
  management as of January 2026, actively pursuing more third-party fleets.
  AD Ports operates 250+ ocean-going vessels.
- Third cruise ship management agreement with Adora Cruises, May 2026.
- CAPE BRASILIA product tanker delivered May 2026; ongoing AAL newbuilds.

---

## 4. Strategic conclusions

1. **Columbia is the benchmark, not necessarily the buyer.** They are the only
   company in Limassol with a Head of AI, an AI factory, an emissions product
   and a connected fleet. The other ~200 carry the same operational load with a
   compliance manager and a spreadsheet. "Here is what the market leader has,
   and here is a version you can afford" is an easier sale.

2. **Selling Columbia a finished tool likely fails.** The AI factory model
   means they intend to build in-house. Selling *capability*, *governance* or
   *acceleration* is the live route.

3. **Independent assurance is the one thing an in-house AI team cannot provide
   itself.** Orfanidou's mandate includes ensuring AI is deployed ethically,
   transparently and in compliance with evolving regulation. The team that
   builds the system cannot credibly assure it.

4. **EU AI Act timing.** The Digital Omnibus on AI (Regulation (EU) 2026/1744,
   in force 27 July 2026) deferred standalone Annex III high-risk obligations
   from 2 August 2026 to **2 December 2027**, and Annex I product-embedded
   systems to 2 August 2028. Article 50 transparency duties stayed on the
   original August 2026 schedule and were not deferred. Substantive obligations
   are unchanged — only the date moved. Relevant because AI used in
   recruitment, task allocation and worker monitoring is high-risk employment
   territory, and "modernised crewing assignment" is on Orfanidou's list.

5. **Positioning correction.** Grant Thornton is not "Big 5" — the Big Four is
   Deloitte, PwC, EY, KPMG and there is no fifth. GT is generally the largest
   of the next tier, around sixth or seventh globally. Do not claim Big 5 in a
   room containing an ex-Deloitte Head of AI. The accurate positioning is
   better anyway: more senior attention per euro, faster decisions, rates a
   ship manager will actually sign.

---

## 5. The observed problem that became the PoC

Direct field observation, not desk research:

- Technical superintendents travel constantly and for long periods.
- They collect **paper receipts** and claim reimbursement later. Confirmed by
  direct observation of a Columbia superintendent collecting paper checks —
  they are *not* currently using expense SaaS for this.
- Alcohol is typically non-reimbursable. Current workaround is asking the
  venue for a separate bill, because if alcohol appears on the claim the whole
  item may be rejected.
- Policy varies by company — some allow drinks in some circumstances. So the
  policy layer must be configurable, not hardcoded.
- Travel is worldwide, so receipts arrive in many currencies, languages and
  scripts.

Addressable market is wider than ship management: **any company that regularly
flies staff abroad.** Superintendents are the entry wedge because the pain is
acute and observable.

---

## 6. Second idea, parked for roadmap

Visa and travel readiness. Real problem, but the obvious product is wrong.

- **Do not build** consulate appointment tracking or policy news feeds.
  Consulates have no APIs, scraping is fragile and ToS-grey, and a news feed is
  a thin wrapper on Google Alerts.
- **Do build** (later) a travel-readiness register over the company's own data:
  who holds which passport and nationality, which visas are valid and when they
  expire, remaining passport validity — therefore who can be deployed where,
  next week, with no consulate in the loop. It is a matching problem over
  internal data.
- Two high-value, non-obvious computations:
  - **Schengen 90/180 rolling window tracking.** Someone bouncing between
    Rotterdam, Hamburg and Piraeus can silently exhaust 90 days in any rolling
    180 and be refused entry. Pure arithmetic over travel history.
  - **Six-month passport validity and blank-page requirements.** Many
    countries refuse entry under six months remaining validity.
- Governance flag: if the system *decides* deployment rather than supporting a
  human decision, that is worker task allocation, i.e. Annex III high-risk
  territory. Design as decision support with human approval.

### Fact to correct before repeating

The August 2026 US visa pause was on **immigrant** visa appointments, paused
worldwide from around 25–26 August 2026 while consular officers complete public
charge screening training, with no announced resumption date. It followed an
21 August court ruling vacating a separate policy that had suspended immigrant
visa issuance for nationals of 75 countries.

Superintendents travel on **B-1 business visas, which are nonimmigrant** — so
the pause does not directly hit them. Do not say "all visas worldwide".

---

## 7. Prior art and reusable components

### TaxHacker (vas3k)

<https://github.com/vas3k/TaxHacker> — MIT licence, self-hosted.

Closest existing project to the PoC. Upload photos of receipts, invoices or
PDFs; LLM extracts merchant, line items, dates, amounts, taxes into a
structured database; custom fields with user-defined prompts; automatic
currency conversion including crypto using **historical exchange rates from the
transaction date**. 170+ fiat currencies and 14 cryptocurrencies. Early
development.

Note: often described as an indie developer's project; verify nationality
before citing it as German. Useful as prior art and as validation of the
historical-rate design decision.

### E-Invoice-EU (gflohr)

<https://github.com/gflohr/e-invoice-eu> — **WTFPL licence**, i.e. maximally
permissive, no attribution or copyleft obligations, usable commercially without
restriction.

Generates EN16931-conforming e-invoices (Factur-X/ZUGFeRD, UBL, CII,
XRechnung) from spreadsheet or JSON input. Available as CLI, REST API, and a
TypeScript/JavaScript library that runs in the browser (browser version cannot
generate PDFs from spreadsheet data — needs LibreOffice — so supply a PDF
yourself if required). Known issue: PDF/A compliance for Factur-X is described
by the author as not battle-tested.

**Important scoping note:** an expense receipt is not an e-invoice. EN16931
applies to invoices a company *issues*. The legitimate use here is the
**rebilling invoice** the ship manager raises to the vessel owner for
recharged superintendent costs — that is a real B2B invoice and a genuine
EN16931 candidate. Keep this out of the PoC core and treat it as a phase-two
differentiator.

### Other projects reviewed

- **BudgetLens** (1oannis) — Django, OpenAI API, Open Exchange Rates,
  PostgreSQL. Self-hosted receipt scanner.
- **Receipt Wrangler** — self-hosted receipt manager with OCR/AI scanning.
- Neither has the vessel/owner cost-allocation concept.

---

## 8. Competitive objection to prepare for

Expect: *"why not just buy Concur, Expensify, Pleo, Ramp or Navan? And
Dynamics 365 already ships expense management with receipt OCR."*

The answer is **vessel and owner cost allocation**. A superintendent flies to a
drydock and the cost does not belong to a departmental cost centre — it belongs
to *that vessel's* budget and is rebilled to *that owner* under the management
agreement. One two-week trip covering four vessels for three owners produces
one pile of receipts that must split multiple ways. Generic expense software
has no concept of a vessel, an owner account, or a management agreement.

That is the feature that makes this maritime software rather than a Concur
clone. Secondary differentiators: line-item level policy evaluation,
multilingual receipt handling, and foreign VAT capture for reclaim.
