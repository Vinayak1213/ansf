# Money-leak detection — requirements & tickets

**Status:** requirements for review (defines logic; no code written)
**Owner surface:** the "Where the money leaked" card + the Moves queue (Spend Steward) + Smart Alerts.
**Grounded in:** the existing deterministic engine `src/data/alerts.ts` (rules 1–5) and the leak model in `src/data/samurai.ts` (`LEAKS`, `confirmedLeak()`, `leakTotal()`, `ACCOUNT`). This spec promotes the hand-seeded `LEAKS` list into **rule-generated, event-driven** classification that runs continuously over live data.

---

## 0. Audit verdict (rev 2) — read this first

An adversarial audit (fresh agents, not the author) returned **`major-gaps`: NOT yet safe to hand a client a number.** The engine *design* is sound and genuinely generic; but the *prototype* is not tenant-generic, the rule set has material gaps, and — for "the number can't be off" — **the one shipped Likely figure is an artifact, and the Confirmed figure can overstate by 40% in a routine case.**

### The three findings that matter most
1. **The ₹41,200 "likely leak" exists only because of a hard-coded constant.** The `₹1,166` matched-page benchmark (`samurai.ts` LEAK l3, `alerts.ts` rule 2) is a literal, not computed. Under the spec's *own* cohort formula the benchmark is **₹1,455**, which makes the homepage overspend `41,200 − 30×1,455 = −₹2,450 → ₹0`. The only Likely number we ship today is produced by an unsourced number. **Delete `₹1,166`; compute the benchmark from the tenant's own cohort each run.**
2. **"Confirmed = exact to the rupee" is false as written.** Connectors report spend per **ad/campaign**, not per landing page — so spend-per-page is always a *derived apportionment*. Reproduced on the B.Com case: one Meta ad repointed mid-month from the broken page to a working one → days 1–18 (~₹38,300) genuinely leaked, days 19–30 (₹26,000) produced **20 real leads** on a working page. T1 bills the whole **₹64,300** → confirmed **overstated by ₹26,000 (40% of the line), and that ₹26,000 already converted.** The spec does **not** catch it. **Fix:** apportion confirmed spend to the faulty *destination* (not the campaign) per settled day, and auto-resolve when sessions to the faulty page drop to ~0.
3. **A value-blind benchmark flags your most profitable line as a leak.** The high-ticket MBA·Brand line (₹1.7L ticket, **16.5× ROAS** vs the account's 12.6×) is flagged as ₹17,528 "overspend" because a CPL benchmark counts a ₹1.7L-ticket lead the same as an ₹80k one. **The sign is wrong** — the card would tell a marketer to cut their best line. Caught only in prose, not a rule. **Fix:** benchmark only against *value-comparable* peers (ticket/LTV band + intent); never flag an entity whose value-adjusted return ≥ its cohort's.

### The trap underneath all three: reconciliation ≠ accuracy
`Working + Confirmed + Likely == total` **always** holds, because Working is defined by subtraction. It proves the split is **complete**, never that a bucket is **correct** — a wrong Confirmed/Likely is silently absorbed into Working and still passes the invariant. The real correctness test is `Working == Σ spend of entities with no open finding`, asserted to the rupee each run.

### The honest answer to "100% accurate"
- **Confirmed → RECONCILED, exact to the rupee — but only when** (a) the spend window is **settled** (past platform restatement), (b) fault boundaries are **timestamped**, (c) the **CRM join is lossless** (coverage ≥ floor), and the amount is **apportioned per destination**. It's a measured fact (settled spend into a provably-dead destination; no benchmark, no `CLOSE_RATE`) — which is *why* exactness is achievable.
- **Likely → ESTIMATE, bounded, a review — it cannot be 100% accurate.** It's a counterfactual ("what this spend should have cost"); there is no observable true "efficient CPL" to be accurate against. We can guarantee it's **deterministic, reproducible, overspend-bounded, and fully drillable** — which is *not* accuracy. **Presenting any Likely figure to a CFO as hard recoverable money is the one move that voids the thesis.**
- **Label the registers on the card:** Confirmed = *recoverable*, Likely = *review*.

### Must fix before shipping a client-facing number
1. **Benchmark:** delete `₹1,166`; compute `benchmarkCPL = Σ(cohort spend)/Σ(cohort leads)` from the tenant's own value-comparable cohort each run, excluding broken/closed + the entity under test.
2. **One canonical Likely amount:** `overspend = max(0, spend − leads×benchmarkCPL)`; reconcile T5 (wrong-page) and T6 (CPL-outlier) to **one** benchmark + **one** entity set (today they disagree **6.6×** — T5 flags {home}=₹6,210, T6 flags {c1a,c1b,c4}=₹52,519 and never enters the card), or demote one to a non-monetary "watch."
3. **Gate every zero-lead Confirm** behind join-coverage ≥ floor **and** tracking-integrity = up for the whole window — else `insufficient_signal`. An unseen-lead false positive labelling a healthy page recoverable is the single thesis-killer.
4. **Learn the attribution-maturity window per tenant** from its own click→outcome latency — never fixed 48–72h (too-short = the #1 false positive).
5. **Settled windows only:** classify over spend past restatement + stable across two re-pulls; mark open periods provisional; emit `leak.updated` on restatement.
6. **Amount precision:** integrate spend over `[faultOnset, asOf]` (not the reporting period — B.Com currently bills whole-month ₹64,300 despite "down since 14 Nov"); split a page's leaked spend across feeding campaigns by affected-traffic share.
7. **Add an explicit `Unreconciled` (dark-spend) line**; extend the invariant to `Working+Confirmed+Likely+Unreconciled+InsufficientSignal == total`, and assert `Σ(per-campaign CRM leads) == account leads`.
8. **Make the engine tenant-generic:** replace hard-coded `inr()`/₹, the edtech `TICKET` map + `CLOSE_RATE=0.34`, the module-constant thresholds, the hand-seeded `LEAKS`, and the hand-set `page.fault` with config + rule-generated findings.
9. **Close or at least name the value/quality blind spot:** outcome is a *count* today, so junk leads, trials-that-never-pay, carts-that-never-buy, returns/refunds, and double-counted conversions all pass the invariant as **Working** and the catch-all never sees them — the largest hole for a CRM-close product.

### Complete rule catalog (rev 2)
Existing T1–T7 + catch-all, plus the gaps the audit found (G1–G16). The **category** is universal; only the signal is industry-specific.

| ID | Rule | Bucket | New? |
|---|---|---|---|
| T1 | Broken lead form | confirmed | — |
| T2 | Closed intake / dead offer | confirmed | — |
| T3 | Dead spend, cause unknown (flagship day-1) | confirmed | — |
| T4 | Broken tracking / 404 (excluded from recoverable) | confirmed* | — |
| T5 | Wrong-page routing | likely | — |
| T6 | High-CPL outlier / regression | likely | — |
| T7 | Working (residual) | working | — |
| CA | Unexplained catch-all | confirmed-by-amount | — |
| G1 | **Sub-campaign / sub-grain bleed** (placement, keyword, audience, geo, device, daypart) — *biggest structural gap; engine is keyed at campaign×page* | confirmed/likely | ✦ |
| G2 | Invalid traffic / click fraud (sub-reason of dead-spend) | confirmed | ✦ |
| G3 | Broken checkout / signup / OTP path (multi-step analog of T1) | confirmed | ✦ |
| G4 | Broken call-conversion path | confirmed | ✦ |
| G5 | **Lead-quality / junk-conversion leak** (healthy CPL, worthless leads) | likely/confirmed | ✦ |
| G6 | Attribution undercount (consent, iOS ATT) — *guard, not a bucket* | guard | ✦ |
| G7 | Unreconciled / dark spend (no joinable campaign,page) | new line | ✦ |
| G8 | Page speed / pre-form bounce | likely | ✦ |
| G9 | Creative-offer vs landing / feed-price mismatch | confirmed/likely | ✦ |
| G10 | Out-of-stock / unbuyable destination (ecommerce) | confirmed | ✦ |
| G11 | Multi-step / wrong-outcome (proxy counted as conversion) | likely/confirmed | ✦ |
| G12 | Duplicate / double-counted conversions — *guard* | guard | ✦ |
| G13 | Net-value underperformance / returns / refunds / chargebacks | likely/confirmed | ✦ |
| G14 | Low-click / CPM / awareness blind spot (spend-denominated floor) | confirmed | ✦ |
| G15 | Cold-start / single-offering tenant has no peer cohort — *guard* | guard | ✦ |
| G16 | Amount precision (onset window + multi-campaign split + single rounding) | confirmed+likely | ✦ |

### Definitive calculation reference (supersedes §2's amount table + §5's amounts)
- **CONFIRMED** = Σ over each reconciled destination of `spend integrated over [faultOnset, asOf]`, restricted to entities with a binary provable fault **and** CRM outcomes = 0 in that window; each rupee assigned once via the precedence ladder; **spend apportioned to the faulty destination** (≤ spend whose sessions reached it), **settled days only**. Inputs: settled spend + CRM counts + the fault signal — **no benchmark, no `CLOSE_RATE`.** (T4 computed but excluded from recoverable.)
- **LIKELY** = Σ `max(0, spend − leads × benchmarkCPL)`; `benchmarkCPL = Σ(cohort spend)/Σ(cohort leads)` at full precision over the tenant's own **value-comparable** peers excluding broken/closed + self; round once at display (the drill-through multiplication must equal the stored amount). `overspend ≤ 0 ⇒ not a leak`.
- **WORKING** = `totalSettledSpend − Confirmed − Likely − Unreconciled − InsufficientSignal`; cross-checked to equal `Σ spend of entities with no open finding`, to the rupee, or render is blocked.

### One common engine — the onboarding model (verdict: generic engine is sufficient; prototype isn't yet)
- **Day-1 on connector spend + CRM only:** the invariant + blended cost-per-outcome; **T3 dead-spend + the catch-all** (confirmed by amount — exact for the rupee even without a cause label); T6 if ≥5 scored campaigns; T5 if ≥2 comparable pages; T7.
- **Tenant config at onboarding:** conversion event + funnel + terminal value event; value/economics model (today's `TICKET`+`CLOSE_RATE` is edtech-only — a new tenant has none); currency + timezone; an initial sales-cycle estimate to seed the maturity window; close-dates; the CRM field carrying campaign/landing attribution; the "generic page" / peer-cohort taxonomy; consent regime.
- **Auto-derived (no config):** benchmark CPO, z-baseline mean/std, the learned attribution-lag window, per-entity CPO + qualified rate, all bucket totals + the residual, regression baselines after ~2 weeks.
- **Gated:** the **lead→campaign/page join at sub-account grain** (*the single most important dependency* — without it you only get account-level blended CPL); T2 close-dates; T1 capture tag; T4 health probe; a stable benchmark (≥5 entities); quality/refund feed; sub-grain breakdowns.
- **Cold start (fresh tenant):** shows almost nothing at first, *by design* — `insufficient_signal` until spend ages past the maturity window and entities clear the floors; first trustworthy leak is T3 zero-outcome dead-spend (hours for ecommerce, weeks for B2B/edtech); the whole Likely side stays dark until ≥5 converting peers exist; an account-wide empty/stale CRM feed must withhold any confirm until one reconciled outcome proves the pipe works.

---

## 1. Decision: deterministic, not AI

Classification is **100% deterministic rules on reconciled data — no LLM in the detection path.** This is non-negotiable and is the product's moat: every rupee in every bucket must drill to a production number, and the same inputs must always yield the same classification. An LLM may later *phrase* a leak ("your B.Com form is costing you ₹64,300") but must **never decide** whether something is a leak, which bucket it lands in, or the amount. Reasons, per the memory'd gate: a wrong CFO-facing number voids the thesis; and at hundreds of pages × per-minute change, auditable rules are cheaper, faster, and reproducible where an AI call is none of those.

---

## 2. The classification model

Every rupee of ad spend lands in **exactly one** bucket (the reconciliation invariant):

```
WORKING  +  CONFIRMED LEAK  +  LIKELY LEAK  =  total ad spend   (exactly, to the rupee)
```

| Bucket | Definition | Confidence | Leaked amount | Register (see RECONCILED-vs-ESTIMATE) |
|---|---|---|---|---|
| **Confirmed leak** | Spend hitting a **provable mechanical fault** — the money produced ~0 leads *because something is broken or closed*, not because it converts poorly | A hard fact (binary signal) | **All spend during the fault window** (it produced nothing) | **RECONCILED** — money recoverable, shown loud, drillable |
| **Likely leak** | Spend that **works but underperforms a benchmark** — it produces leads, just inefficiently or in the wrong place | A relative judgement (statistical) | **The overspend vs benchmark only** — `spend − (leads × benchmarkCPL)` — *not* the whole spend | **ESTIMATE** — a review, not money in hand |
| **Working** | Everything else — spend producing leads at/above benchmark with no fault | — | residual | RECONCILED (the healthy remainder) |

**Current totals it must reproduce:** Working ₹4,77,209 · Confirmed ₹1,01,600 · Likely ₹41,200 = ₹6,20,009 total.

### ⚠ Modelling inconsistency to fix (found during this spec)
The current seed counts the **whole** generic-homepage campaign spend (₹41,200) as "likely leak," while `alerts.ts` rule 3 (high-CPL outlier) correctly counts only the **excess** (`perLead × leads`). These two "likely" rules disagree. Per §2, a *likely* leak's amount is the **overspend vs benchmark**, because the spend *did* produce leads. The honest figure for the homepage is `30 leads × (₹1,373 − ₹1,166) = ₹6,210`, not ₹41,200. **Recommendation:** likely-leak amount = overspend, consistently. (Routing *all* ₹41,200 elsewhere is a separate "reallocation opportunity," which belongs in the Moves queue as a `projected` move, not as leaked money.) This decision materially changes the card's Likely number and must be signed off.

---

## 3. Data inputs (the reconciled join)

Each rule reads from the same reconciled substrate. A leak can only be asserted when its required inputs are **fresh and joined**:

| Input | Source | Used for | Freshness need |
|---|---|---|---|
| Spend, clicks (per campaign→page) | Ad connectors (Google Ads, Meta) | every bucket; the ₹ amounts | hourly |
| Sessions, device split, **form events** (submit-attempt, submit-success, JS error) | Behaviour capture tag (rrweb + events) | broken-form, dead-click faults | near-real-time |
| Leads, qualified rate, lead timestamps | CRM | zero-lead detection, CPL, maturity window | hourly |
| Offer/intake **close date**, page HTTP status, redirect | Page/offer metadata + a health probe | closed-intake, 404 faults | daily + on-change |
| Peer-group / matched-page CPL | Derived from the above | the `benchmarkCPL` for likely leaks | recomputed each run |

**Hard rule:** if a required input is missing or stale beyond its freshness need, the rule emits **`insufficient_signal`** for that page — never a guess. (This is the first-class degrade state already used elsewhere.)

---

## 4. The detection pipeline (event-driven)

Because hundreds of pages change by the minute, detection is a **continuous evaluator**, not a page view:

1. **Evaluate** every (campaign, page) on a schedule (e.g. every 15 min) *and* on relevant input-change webhooks (spend update, a run of failed form submits, an offer close-date passing).
2. Each rule returns, per entity, a `LeakFinding | null`.
3. **Debounce / hysteresis** — a finding must persist across **2 consecutive evaluations** (or a sustained window) before it **opens**, so a one-off blip never fires. It **auto-resolves** when the condition clears for the same window.
4. **Lifecycle events** emitted (idempotent, keyed by `entityId + rule`): `leak.opened`, `leak.updated` (amount changed > X%), `leak.resolved`. These feed the Moves queue, Smart Alerts, and notifications.
5. **Dedup / precedence** (preserves the invariant — a rupee counted once): for each entity apply the **first** matching rule down this ladder and stop:
   `confirmed:broken_form` → `confirmed:closed_intake` → `confirmed:broken_tracking` → `confirmed:dead_spend (cause unknown)` → `likely:wrong_page` → `likely:cpl_outlier` → `working`.

---

## 5. Per-scenario tickets

Each ticket: **Trigger · Inputs · Rule · Thresholds · Amount · Why this confidence · Auto-resolve · Event · Edge cases · Acceptance.**

### T1 — Confirmed leak · Broken form
- **Trigger:** a page takes spend + sessions but the form mechanically fails to submit.
- **Inputs:** sessions, form submit-attempt events, submit-success events (by viewport), leads.
- **Rule:** `sessions ≥ S_MIN` **AND** `leads = 0` **AND** `submitAttempts > 0` **AND** `submitSuccessRate = 0` over window `W`. The viewport split localises it ("breaks below 380px" = attempts on <380px with 0 successes while ≥380px works or there's no ≥380px traffic).
- **Thresholds (config):** `S_MIN = 150` sessions, `W = 24h`, attempts floor `≥ 20`.
- **Amount:** all spend to the page across `W` (it produced 0 leads). *(B.Com: ₹64,300.)*
- **Why confirmed:** a mechanical signal (attempts but zero successes) proves a fault — not a conversion opinion.
- **Auto-resolve:** a successful submit is observed, or submit-success-rate > 0 for a full window.
- **Event:** `leak.opened {reason:'broken_form', amount, evidence:{sessions, attempts, viewport}}`.
- **Edge cases:** form legitimately absent on some pages (exclude pages with no form element); forms using a 3rd-party iframe where success isn't observable → downgrade to `dead_spend (cause unknown)`.
- **Acceptance:** given a page with 1,840 sessions, 0 leads, submit-attempts>0, 0 successes below 380px → opens a `broken_form` confirmed leak = that page's spend; clears within one window of a successful submit.

### T2 — Confirmed leak · Closed intake / dead offer
- **Trigger:** spend still flowing to a page/offer whose intake window has ended.
- **Inputs:** offer/intake `closeDate`, spend after close, leads, (optionally HTTP 404/redirect).
- **Rule:** `closeDate < now` **AND** `spendAfterClose > 0` **AND** `leads ≈ 0` since close. (A 404 or redirect-to-closed is an immediate confirm regardless of leads.)
- **Thresholds:** any spend after `closeDate`; grace `= 0` (a closed intake can't convert).
- **Amount:** spend accrued **after** `closeDate`. *(MBA July: ₹37,300.)*
- **Why confirmed:** the close date is a hard fact in metadata.
- **Auto-resolve:** the intake reopens (new `closeDate` in future) or spend to it stops.
- **Event:** `leak.opened {reason:'closed_intake', amount, evidence:{closeDate, daysClosed}}`.
- **Edge cases:** rolling intakes with no close date → not eligible (use T6 instead); offer closed but page repurposed to a live offer → not a leak.
- **Acceptance:** intake closed 11 days ago, campaign still spending on Meta → opens a `closed_intake` confirmed leak = post-close spend.

### T3 — Confirmed leak · Dead spend, cause unknown (the umbrella)
- **Trigger:** spend + clicks, **zero leads**, but **no** specific T1/T2/T4 signal explains it.
- **Rule (this is `alerts.ts` rule 1):** `spend > 0` **AND** `leads = 0` over a mature window, and no higher-precedence reason matched.
- **Thresholds:** `clicks ≥ C_MIN` (e.g. 100) so a barely-live campaign isn't flagged; window ≥ attribution maturity (§6).
- **Amount:** all spend (0 leads).
- **Why confirmed:** zero return on real traffic is provable; only the *cause* is unknown, so the **action is "pause & investigate,"** not a specific fix.
- **Auto-resolve:** first lead recorded.
- **Edge cases:** attribution lag (see §6) — do **not** flag a page whose leads simply haven't landed yet.
- **Acceptance:** a campaign with 1,980 clicks, 0 leads, no form/offer signal → confirmed `dead_spend`, action = pause & investigate.

### T4 — Confirmed leak · Broken tracking / 404 (extension, recommended)
- **Trigger:** page returns 4xx/5xx, or the conversion pixel/CRM webhook stopped firing while sessions continue.
- **Rule:** `httpStatus ≥ 400` on the live probe, **OR** `sessions > 0` with `conversionEventsReceived = 0` AND the CRM endpoint health = down.
- **Amount:** spend during the outage.
- **Why confirmed:** an HTTP/endpoint fact. **Caveat:** broken *tracking* means leads may exist but be unseen — flag as `broken_tracking` with a distinct action ("fix tracking — leads may be uncounted"), and **exclude from the recoverable total** until tracking is restored (don't claim recovery on possibly-real leads).
- **Acceptance:** page 404s while spending → confirmed; tracking-down case is flagged but not added to recoverable ₹.

### T5 — Likely leak · Wrong-page routing
- **Trigger:** a page converts, but **worse than matched peer pages**, and its traffic could be routed to a better-matched page.
- **Inputs:** page CPL, `benchmarkCPL` (weighted CPL of matched programme pages), leads.
- **Rule (this is `alerts.ts` rule 2):** `pageCPL ≥ benchmarkCPL × (1 + MARGIN)` **AND** `leads ≥ L_MIN`, for a page flagged as generic/mismatched. `benchmarkCPL` = Σ(matched-page spend)/Σ(matched-page leads), recomputed each run.
- **Thresholds:** `MARGIN = 0.15`, `L_MIN = 30` (sample floor — never judge on thin data).
- **Amount (per §2 fix):** **overspend** = `leads × (pageCPL − benchmarkCPL)`. *(Homepage: 30 × (₹1,373 − ₹1,166) = ₹6,210.)* **Not** the whole ₹41,200.
- **Why likely:** a relative benchmark call — could be legitimate (brand vs prospecting), so it's a **review**, never auto-actioned.
- **Auto-resolve:** CPL falls back within `MARGIN` of benchmark for a full window.
- **Event:** `leak.opened {reason:'wrong_page', confidence:'likely', amount:overspend}`.
- **Edge cases:** the benchmark itself must exclude broken/closed pages and the page under test; brand-search pages flagged for human context, not auto-pause.
- **Acceptance:** homepage CPL ₹1,373 vs benchmark ₹1,166 with 30 leads → likely leak = ₹6,210 (overspend), action = review/route.

### T6 — Likely leak · High-CPL outlier / CPL regression
- **Trigger:** a converting campaign is a cross-sectional cost outlier, or its own CPL regressed sharply.
- **Rule (this is `alerts.ts` rule 3):** z-score over converting campaigns: `z = (cpl − mean) / std`; flag if `z > SIGMA`. Regression variant: `cpl_7d ≥ cpl_prior × (1 + REG)` with `leads ≥ L_MIN`.
- **Thresholds:** `SIGMA = 1`, `CPL_MIN_LEADS = 10`, need `≥ 5` scored campaigns for a stable baseline; `REG = 0.3`.
- **Amount:** overspend = `leads × (cpl − mean)` (rounded once so the shown multiplication is exact).
- **Why likely:** statistically dearer, but could be a hard-but-valuable segment → **watch/review**.
- **Edge cases:** small cohorts excluded by the floor; high-value/high-ticket programmes legitimately carry higher CPL (cross-reference ticket size before escalating).
- **Acceptance:** a campaign >1σ above the mean CPL with ≥10 leads → watch-level likely leak = the excess.

### T7 — Working (the healthy residual, positively defined)
- **Definition:** spend on pages with **no open confirmed or likely finding** — i.e. converting at/above benchmark with a live form and open offer.
- **Amount:** `totalSpend − confirmed − likely` (must equal the sum of positively-working campaigns; if it doesn't, the pipeline has a double-count bug — see §7).
- **Acceptance:** Working + Confirmed + Likely = total spend exactly, every run.

---

## 6. Cross-cutting rules

- **Attribution maturity window.** Leads arrive *after* the click (a page isn't "leaking" because leads lag). No zero-lead confirm (T1/T3) until spend has aged past `MATURITY` (e.g. 48–72h, configurable per vertical by typical lead latency). Before that → `insufficient_signal`.
- **Sample floors everywhere.** `S_MIN` sessions, `C_MIN` clicks, `L_MIN` leads. Below the floor → `insufficient_signal`, never a flag. (New pages with no history start here.)
- **Pages in an active experiment** are evaluated but findings are tagged `in_experiment` and **suppressed from auto-actions** (the test is deliberately varying the page).
- **Debounce + auto-resolve** (§4.3) prevent per-minute flip-flop; every finding carries `openedAt`, `lastSeen`, and resolves itself.
- **Config constants** (`S_MIN, C_MIN, L_MIN, W, MARGIN, SIGMA, REG, MATURITY`) live in one place, are shown in the UI ("flagged because CPL > benchmark + 15%"), and are tunable per tenant — never magic numbers buried in code.

---

## 7. Reconciliation & correctness (acceptance-level)

- **Invariant test:** for every tenant, every run, `Working + Confirmed + Likely === totalSpend`. A failing assert blocks the result from rendering (degrade to "recomputing").
- **No double-count:** the precedence ladder (§4.5) guarantees each entity maps to one bucket. Unit test: a page that trips both broken-form and wrong-page is counted once, as confirmed.
- **Drill-through:** every bucket total and every row amount links to the production number it's composed from (campaign spend, CRM leads, the benchmark calc). No figure exists that can't be opened.
- **Determinism test:** same frozen inputs → byte-identical classification across runs.

---

## 8. What the LLM may / may not do
- **May:** phrase a finding in plain language, draft the fix message, summarise the week's leaks.
- **May not:** decide a leak exists, choose its bucket, compute or adjust an amount, or set a threshold. If the detection path ever needs "judgement," that's a new deterministic rule + a config constant, reviewed — not an inference.

---

## 9. Build order (tickets → sprints)
1. **T3 + T2** (dead-spend + closed-intake) — already live in `alerts.ts` on reconciled connector data; promote to the event pipeline + lifecycle. Ship first.
2. **§2 amount fix + T5** (likely = overspend, consistent) — corrects the card's Likely number; sign-off needed.
3. **T1 + T4** (broken form, tracking/404) — **gated on the behaviour capture tag + health probe** (Stage 2); until then these stay seeded and clearly labelled as such.
4. **T6** (CPL outlier/regression) — extends `alerts.ts` rule 3 with the regression variant.
5. **§7 invariant + drill-through tests** throughout — they are the moat's guarantee, not optional.

---

## 10. Production architecture (prototype → prod)

The reassuring part: **the rules are already written and portable.** In the prototype, `samurai.ts` is the reconciled store and `alerts.ts` is the evaluator (it runs once at import). Prod keeps the *exact same deterministic rule functions* and changes only two things — (1) feed them live ingested data instead of the static seed, and (2) run them continuously with persisted state + events.

```
[Ad APIs]  [CRM]  [Capture tag]  [Offer metadata]  [Health probe]
    │        │          │               │                │
    └────────┴──────────┴───────────────┴────────────────┘
                         ▼  connectors: scheduled pulls + webhooks
              ┌───────────────────────────┐
              │  Reconciled facts store    │  per (tenant, campaign, page, hour):
              │  spend·clicks·sessions·    │  the single source of truth —
              │  form-events·leads·qual    │  the prod equivalent of samurai.ts
              └──────────────┬────────────┘
                             ▼  every 15 min + on change-webhooks
              ┌───────────────────────────┐
              │  Deterministic evaluator   │  = the alerts.ts rule set, as a
              │  detect(facts, config)     │  pure, testable library. No I/O, no LLM.
              └──────────────┬────────────┘
                             ▼
              ┌───────────────────────────┐
              │  Findings store + lifecycle│  debounce (2 runs) → open / update / resolve
              └──────────────┬────────────┘
                             ▼  emits leak.opened / updated / resolved
          ┌──────────────┬──────────────┬──────────────┐
      Overview card   Moves queue   Notifications    Audit log
```

1. **Ingestion → reconciled facts.** Connector workers pull Google/Meta spend and CRM leads hourly and receive capture-tag events near-real-time; a health probe checks HTTP status + a synthetic form submit per page. Everything lands in a facts table keyed by (tenant, campaign, page, hour). The **join** that makes it "reconciled": the capture tag stamps each session with UTM (→ campaign) + page + a Samurai anonymous id; at submit, that id is handed to the CRM, so the lead reconciles back to the spend that bought it. (This is the capture-tag + CRM-sync that Stage 2 builds.)
2. **Evaluator.** A worker runs `detect(facts, config)` — the same rules as `alerts.ts` — per tenant, on a 15-min schedule *and* on change-webhooks (a spend update, a run of failed submits, an offer close-date passing → immediate re-eval). It's arithmetic over a few hundred rows per tenant, so it's cheap; scale by partitioning workers by tenant.
3. **Findings + lifecycle.** Results are diffed against a `findings` table (keyed tenant+entity+rule). Debounce: a finding must persist 2 evals before it `opens`; it auto-resolves when the rule returns null for a window. State changes emit `leak.opened/updated/resolved` to an event bus (idempotent by key).
4. **Consumers.** The Overview card and Moves queue read current findings + the rollup via an API (every number drills to the fact that composed it). Notifications fire on `opened`; an audit log records each finding + its evidence.

**Scenario → prod data source (what each needs to go live):**

| Scenario | Needs | Ships when |
|---|---|---|
| Closed intake · dead-spend | Ad spend + CRM leads + offer close-date | **Stage 1** (connectors) — today's logic already works |
| Wrong-page · CPL outlier | Ad spend + CRM + derived benchmark | **Stage 1** |
| Broken form · broken tracking | Capture-tag events + health probe | **Stage 2** (capture tag) |

**Correctness in prod (non-negotiable):**
- The **reconciliation invariant** (`Working+Confirmed+Likely == total`) is asserted before a run is served; a failing run is rejected and the last-good snapshot stays up — a wrong number never ships.
- **Attribution maturity window** — don't flag zero-lead until spend ages past typical lead latency (leads lag clicks).
- **Insufficient-signal** — any missing/stale input degrades that page, never guesses.
- **Determinism + golden-fixture tests** in CI — same frozen inputs → identical findings.

**Stack (boring on purpose):** connector workers + a queue (SQS / Pub-Sub / BullMQ), Postgres for facts + findings (add a columnar store like ClickHouse/BigQuery only if fact volume demands it), the evaluator as a shared TS library, a scheduler (cron / Temporal), an events topic. At mid-market scale (hundreds of pages per tenant) Postgres alone is plenty.

---

## 11. Industry-agnostic & dynamic-scenario design

### The honest limitation
§5's tickets are written in lead-gen / edtech vocabulary (leads, CPL, intakes, enrolments) and enumerate a **fixed** scenario list. That is right for the declared beachhead but is **not yet generic** across industries, and a fixed list cannot anticipate every real-world scenario. Two things fix it: a generic model, and a catch-all that makes novelty safe.

### The universal detector (why it generalises at all)
The **reconciliation invariant is itself industry- and scenario-agnostic:**
> A **leak** = spend that did not produce its **expected reconciled outcome.**

"Outcome" is a lead (lead-gen), an order (ecommerce), a signup/trial (SaaS), a booking (travel), an application (lending). In every case, *money that spent without producing its configured outcome is a leak — and the invariant catches it even when we can't name the cause.* The typed rules (§5) only add the WHY and the fix.

### Three abstractions that make it generic
| Prototype (edtech, hard-coded) | Generic (config-driven, per tenant) |
|---|---|
| "lead" | a configured **conversion event** (lead / order / signup / booking / application) with a **value** + a **funnel** |
| "CPL ₹1,732" | **cost-per-outcome**, in the tenant's currency |
| "July intake closed" | a **destination/offer state** (closed / out-of-stock / 404 / expired) |
| "broken form" | a **broken conversion path** (form / checkout / signup / call) |
| "₹1,166 matched pages" | a **benchmark from the tenant's own peer cohort** |

The tenant **lexicon already does half of this** (`lexiconOf`: conversion/offering/goal nouns); the generic engine extends it to a **funnel + conversion-event + value** config.

### Categories generalise; only the signals are industry-specific
| Category (universal) | Lead-gen | Ecommerce | SaaS |
|---|---|---|---|
| Broken conversion path | form submit fails | checkout/cart fails | signup/trial-start fails |
| Dead destination | intake closed / 404 | out-of-stock / 404 | plan removed / 404 |
| Broken tracking | CRM webhook down | order pixel down | event pipeline down |
| Underperformance (likely) | CPL > peer benchmark | ROAS < peer / CAC > peer | CPA > peer |
| **Unexplained (catch-all)** | spend, no outcome, no named cause | same | same |

The **category** is the same everywhere; the **signal** is plugged in per connector/industry. New industries add signals, not a new engine.

### Handling dynamic / unknown scenarios
A **two-tier** model so novelty never slips through:
1. **Typed rules** — the named, high-confidence scenarios → `confirmed`, with a specific fix.
2. **Generic residual detector** — ANY spend failing the invariant (no/low reconciled outcome vs expected, past the maturity window, above the sample floor) that **no typed rule explains** → flagged **`unexplained` — "money not converting, cause unknown — pause & investigate."** Confirmed by amount, generic by cause.

So a scenario we never anticipated is still caught as money-not-converting; worst case it's labelled `unexplained`, **never silently counted as Working.** Recurring `unexplained` patterns graduate into new typed rules via a **config-driven rule registry** (thresholds, funnel steps, conversion events are config, not code).

### Real-environment dynamics — per-tenant, learned, never assumed
The static seed hides these; prod must handle each deterministically from the tenant's own data:
- **Attribution-lag window** — minutes for ecommerce, **weeks** for B2B/edtech/lending. Learn it from the tenant's own click→outcome latency; never a fixed 48h. (Flagging a slow-converting vertical as "leaking" too early is the #1 false positive.)
- **Benchmarks** — the tenant's own peer cohort (plus, optionally, an anonymised cross-tenant industry median), recomputed each run — never a hard-coded ₹1,166.
- **Currency, timezone, consent regime** (DPDP / GDPR / CCPA) per tenant/region.
- **Many ad platforms** (Google, Meta, LinkedIn, TikTok…) — connector-pluggable into one facts schema.
- **Seasonality / promotions / brand-vs-prospecting** — tagged as context, not auto-punished (brand search legitimately costs more).
- **Multi-touch / offline conversions** — the outcome may reconcile against a journey, not one click.
- **Graceful degradation** — when it can't confidently classify, it emits `insufficient_signal` / `unexplained`, never a forced wrong label. This *is* the brand under real-world mess.

### Scope flag (vs the declared strategy)
The **framework** is industry-agnostic by construction. The **GTM** declared a lead-gen beachhead (CRM-close, not cart), so building the engine generic now serves the multi-industry PLG thesis, while *actively selling* into transactional ecommerce is beyond that beachhead. **Decision for the owner:** build the engine generic from day one (recommended — it is mostly config) and expand GTM later, vs stay lead-gen-shaped until the beachhead is proven.

---

## Appendix — current reconciliation (what the rules must reproduce)
`totalSpend = ₹6,20,009` · `leads = 358` · `blended CPL = ₹1,732`.
Confirmed = `confirmedLeak()` = ₹64,300 (B.Com broken form) + ₹37,300 (MBA July closed) = **₹1,01,600**.
Likely = **₹41,200 today** (whole homepage spend) → **≈₹6,210 after the §2 fix** (overspend vs ₹1,166 benchmark). Working = `totalSpend − leakTotal` = **₹4,77,209** (rises to ~₹5,12,199 after the §2 fix moves the routing opportunity out of "leaked").
