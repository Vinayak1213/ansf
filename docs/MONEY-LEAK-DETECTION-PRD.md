# Money-Leak Detection — Product Requirements Document

**Status:** draft for review
**Audience:** Product, Engineering, Design
**Scope:** the full feature — problem, users, experience, and the detection logic, scenario catalog, calculation, data contract, and multi-tenant engine. Industry-agnostic; written for lead-gen, ecommerce, and SaaS tenants alike.

> **One-line definition.** Money-Leak Detection continuously and *deterministically* classifies every unit of ad spend — for every tenant, in their own currency and outcome language — into spend that is **working**, spend that is **provably lost and recoverable now**, and spend that is **probably inefficient and worth a review**, with every number tracing to a real reconciled outcome and nothing invented.

**The product promise, and its one hard rule:** the number can be trusted because it is *reconciled and deterministic*, not because it is clever. **No AI/LLM is ever in the detection, classification, amount, or thresholding path.** The same inputs always yield the same result, and every figure drills to a production number. A language model may *phrase* a finding or draft a fix; it may never decide a leak exists, which bucket it is in, the amount, or a threshold.

---

# PART 1 — PRODUCT

## 1. Problem & why now

Marketers spend continuously across many destinations and dozens-to-hundreds of campaigns that change by the minute. Today they cannot tell *working* spend from *wasted* spend with confidence: ad-platform dashboards report their own success, blended cost-per-outcome hides pockets of total waste, and the tools that promise to find waste increasingly do it with black-box AI that marketers (and their finance teams) no longer trust.

The opening: a **deterministic, outcome-reconciled** detector that separates money that is provably lost from money that is merely underperforming, says exactly how sure it is about each, and shows its work. As confidence in black-box automation falls, *"we never invent a number"* becomes a differentiator, not a constraint.

## 2. Goals & non-goals

**Goals**
1. **Account for every unit of settled ad spend** — classify each unit as **Working / Confirmed leak / Likely leak**, *or* explicitly hold it as **Unreconciled** or **Insufficient-signal** when it cannot yet be classified. (Three buckets for the user narrative; a five-part reconciliation for the math — see §8.)
2. **Make "recoverable" exact and "review" honest.** Confirmed leaks are exact-to-the-smallest-currency-unit recoverable money; Likely leaks are bounded estimates shown as a review — never as money in hand.
3. **Detect leaks as events, continuously,** across hundreds of changing destinations, and surface each with an amount, the evidence, and a fix.
4. **One common engine across all tenants and industries** — config + auto-derived parameters + per-industry signal adapters; no per-client bespoke rule code.
5. **Degrade gracefully** — when inputs are missing, stale, immature, or thin, say "insufficient signal," never guess.

**Non-goals**
- **Not an AI guesser / predictor.** Detection is deterministic; no inferred or modelled leaks.
- **Not a bid manager or ad buyer.** It recommends and (with human approval) can trigger a pause/reallocation, but it does not autonomously run ad accounts.
- **Not an attribution-model debate.** It consumes the tenant's reconciled outcomes; it is not a new multi-touch attribution methodology.
- **Not a vanity-metric dashboard.** Impressions/clicks/CTR are inputs, never the verdict.
- **Not a system of record.** The CRM/commerce platform remains the outcome source of truth.
- **No hand-seeded findings and no per-client rule code** — one engine, config + signal adapters only.
- **Not a personalized financial/investment-advice product.**
- **Not a clone of experimentation/DXP suites** — scope is deterministic reconciled-outcome *leak detection*, not general CRO tooling.

## 3. Users & jobs-to-be-done

| Persona | Primary job | What they need from the feature |
|---|---|---|
| **Marketer / growth operator** (owns spend + destinations) | "Tell me what spend is wasted, how sure you are, and let me recover it." | A ranked, actionable list of leaks led by recoverable money; one-click fixes with approval; trust that the numbers are real. |
| **Executive / finance reader** (owns the budget) | "How much of our spend is actually working, and does it reconcile?" | A reconciled overview, the recoverable total as a defensible figure, drill-through to the source numbers. |
| **Onboarding / RevOps admin** (sets the tenant up) | "Connect our data and configure what a conversion is so the engine works for us." | A guided config surface (below); clear cold-start expectations; validation that the join is healthy before any number is shown. |

## 4. User experience & surfaces

### 4.1 Leak overview
A single reconciled view of where the money went. The composition bar renders **all five segments** — Working, Confirmed, Likely, Unreconciled, Insufficient-signal — so nothing is hidden (three are "buckets," two are honest lines; design must not drop the latter). The two monetary registers are **visually and verbally distinct**:
- **Confirmed → "recoverable"** (loud, confident register).
- **Likely → "review"** (quieter register; a prompt to look, never a cheque).

### 4.2 Per-leak cards
Each finding is a card: the capability (e.g. *broken conversion path*), the **amount** in the correct register, a plain-language **why/evidence**, a **fix**, and a **drill-through**. Each card carries an explicit **state**: `provisional` (open/unsettled period), `settled`, `in_experiment` (suppressed from auto-action), or `resolved`.

### 4.3 Drill-through evidence view
Every amount opens to the production rows that composed it — the settled spend series for the window, the reconciled outcome count, and (for Likely) the benchmark cohort and its members. This view *is* the trust mechanism; it is a first-class screen, not a tooltip.

### 4.4 Moves / actions
Confirmed (and reviewed Likely) findings feed a ranked **moves queue**, led by recoverable amount, each with **human-in-the-loop approval** ("the system builds the case, you make the call"). **Reallocation of working-but-suboptimal spend is a *projected* move kept out of the leak total** — it is an opportunity, not leaked money.

### 4.5 Honest states (first-class, designed)
- **Insufficient-signal / "listening"** — inputs missing, stale, immature, or below floor; shown, not hidden.
- **Cold-start** — a freshly onboarded tenant sees little at first, by design (see §14).
- **Provisional / open-period** — amounts over an unsettled window are marked provisional and excluded from recoverable claims.
- **Unreconciled (dark spend)** — its own line; a visibility gap, not a verdict.
- **Recomputing / degrade** — if the reconciliation invariant (or the Working cross-check) fails, show a recomputing state and **keep the last-good snapshot visible**; never ship a wrong number.

### 4.6 Onboarding / configuration surface
A guided setup that collects the per-tenant config (§14), validates the spend→outcome join is healthy, and sets expectations: until the join is proven and spend matures, the product shows cost-per-outcome and "listening," not leaks.

### 5. Success metrics

Targets below are **initial; calibrated in Phase 0** against design-partner data. Each has a defined denominator and a measurement window.

| Metric | Definition | Initial target |
|---|---|---|
| **Recoverable leak actioned** | Confirmed ₵ with an approved fix ÷ Confirmed ₵ surfaced, per month | ≥ 50% |
| **Confirmed false-positive rate** | Confirmed findings later shown to be working ÷ Confirmed findings, per month | **< 1%** (the thesis-critical metric) |
| **Detection precision / recall** | vs. a labelled audit set, per quarter | precision ≥ 95%, recall ≥ 80% |
| **Time-to-detect** | fault onset → finding opened (past the maturity window) | within one evaluation cycle after maturity |
| **Time-to-fix** | finding opened → resolved | median ↓ over time |
| **Invariant pass rate** | runs served because the reconciliation invariant held ÷ runs attempted (rejected runs counted) | ≥ 99.9% |
| **Attribution-maturity calibration** | premature zero-outcome confirms before spend ages past the learned window | **0** |
| **Determinism** | identical classification on frozen golden-fixture inputs in CI | **100%** |
| **Trust signals** | drill-through opens per finding; user overrides of a verdict | drill-through used, overrides low & falling |

## 6. Risks & mitigations

| Risk | Why it's serious | Mitigation |
|---|---|---|
| **A false positive breaks trust** — a healthy destination called "recoverable waste." | One wrong CFO-facing number voids the thesis. | Every zero-outcome Confirm gated behind join-coverage ≥ floor **and** tracking-integrity up for the whole window; else degrade to insufficient-signal. |
| **Messy connector data** — reporting lag, restatements, missing/unmapped attribution tags, cross-platform duplication. | Corrupts the amount silently. | Settled-only facts, versioned by (source, day, pull); CRM/commerce as the sole outcome authority; dedup + join-coverage guards (§9). |
| **Likely mistaken for Confirmed** — an estimate shown as recoverable money. | Collapses the honesty model. | Two labelled registers enforced in the data model and UI; Likely never enters the recoverable total. |
| **Value-blindness punishes a profitable line** — a high-value, higher-cost line flagged as overspend. | Tells a marketer to cut their best spend. | Benchmark only against *value-comparable* peers; never flag a line whose value-adjusted return ≥ its cohort's (§11). |

## 7. Rollout & phasing

Each phase has an explicit go/no-go gate. Timelines are indicative.

| Phase | Ships | Exit / go-no-go gate |
|---|---|---|
| **0 — Validate** (~2–4 wks) | Run the engine read-only on design-partner accounts; calibrate thresholds + the maturity window; no client-facing number. | Invariant holds every run; Confirmed FP < 1% on the labelled set; determinism 100%. |
| **1 — Confirmed, connector + outcome** (~1 qtr) | Day-1 capabilities on ad spend + outcome system only: dead-spend + unexplained catch-all + dead-destination (where close/expiry metadata exists); the overview + moves + drill-through; all honest states. | Recoverable total reconciles; ≥ N partners actioning fixes; FP target held in production. |
| **2 — Confirmed, behaviour-gated** (~1 qtr) | Broken conversion/checkout/signup/call paths, broken tracking, invalid traffic — needs the behaviour/health signals. | Per-capability precision on the audit set; no regression in FP. |
| **3 — Likely + value/quality** (~1 qtr) | The full Likely side on value-comparable benchmarks; lead-quality/returns/net-value; sub-grain. **Likely ships only here**, and only once a tenant has a stable value-comparable cohort. | Likely clearly labelled "review"; benchmark-sign tests pass; cohort-size floors enforced. |

---

# PART 2 — LOGIC / SPECIFICATION

## 8. The classification model

### 8.1 The buckets & registers
Every unit of **settled** spend lands in exactly one of:

| Bucket | Definition | Signal nature | Amount basis | Register |
|---|---|---|---|---|
| **Confirmed leak** | Spend into a **provable mechanical fault** — ~0 reconciled outcomes *because something is broken, closed, or invalid*, not because it converts poorly | Binary, provable | All settled spend into the faulty **destination** over the fault window | **Recoverable** |
| **Likely leak** | Spend that **works but underperforms** a value-comparable benchmark | Relative, statistical | **Overspend vs benchmark only** — never the whole spend | **Review** (bounded estimate) |
| **Working** | Produces outcomes at/above its value-comparable benchmark, live path, open destination | Residual | Residual | Healthy |
| **Unreconciled (dark)** | Cannot be joined to any (campaign, destination, outcome) | Join failure | The unjoined spend | Its own line — visibility gap |
| **Insufficient-signal** | Required inputs missing/stale/immature/below floor | Degrade | Spend held in abeyance | Withheld — not yet classified |

A **generic "unexplained" catch-all** sits inside Confirmed: any spend failing the invariant (no/low reconciled outcome past maturity, above the floor) that **no typed rule explains** → `unexplained — money not converting, cause unknown; pause & investigate`. Confirmed by amount, generic by cause. **This makes novelty safe:** an unanticipated scenario is still caught as money-not-converting and is *never silently counted as Working.*

### 8.2 The reconciliation invariant (five-part, over settled spend)
```
Working + Confirmed + Likely + Unreconciled + InsufficientSignal  ==  total SETTLED spend
                                                                      (exactly, to the smallest currency unit)
```
All five terms are **mandatory**; Unreconciled and Insufficient-signal are not optional. The assertion runs every cycle; a failing run is rejected and the last-good snapshot stays up.

### 8.3 Reconciliation ≠ accuracy (the caveat that defines the feature)
The invariant proves the split is **complete**, never that a bucket is **correct** — because Working is a *residual* (`total − the rest`), a wrong Confirmed/Likely is silently absorbed into Working and still passes. Completeness must never be sold as accuracy. The real correctness check is a **separate** assertion, every cycle:
```
Working  ==  Σ settled spend of entities with no open finding      (to the smallest currency unit)
```
Failure ⇒ a double-count/classification bug ⇒ the run is rejected.

### 8.4 Honest register positioning (baked into the data model and labels)
- **Confirmed = reconciled, recoverable, exact** — *only when* the window is **settled**, fault boundaries are **timestamped**, the outcome-join is **lossless** (coverage ≥ floor **and** tracking integrity up for the whole window), and spend is **apportioned to the faulty destination**. It uses settled spend + outcome counts + the fault signal — no benchmark, no value model — which is *why* exactness is achievable. **If any condition fails, it degrades to insufficient-signal — never a confirm.**
- **Likely = bounded estimate, review — cannot be 100% accurate.** It is a benchmark counterfactual with no observable ground truth. Guaranteed: deterministic, reproducible, overspend-bounded, fully drillable — *not* accurate. Never presented as recoverable money.

## 9. Scenario catalog (the universal set)

The **category is universal; the signal is industry-specific.** "Outcome" = the tenant's configured conversion; "destination" = where the ad sends traffic.

### 9.1 Confirmed — mechanical faults (recoverable; else degrade to insufficient-signal)
| Capability | Signal (proves the fault) | Lead-gen / Ecommerce / SaaS | Amount basis |
|---|---|---|---|
| **Broken conversion path** (incl. multi-step) | Path entries/attempts > 0 but success-event rate = 0 over W, outcomes = 0; localisable by viewport/device/step | form submit fails / checkout-cart fails / signup-OTP-trial fails | settled spend into the destination over the fault window |
| **Broken call-conversion path** | Call-intent sessions/clicks ≥ floor but connected/logged calls = 0, or number-health probe = unrouted | call-tracked lead-gen, local/services, high-ticket | settled spend to that destination over the fault window |
| **Dead destination** | Destination state = closed/expired/removed, or HTTP ≥ 400, or availability = 0; spend continues past the timestamped state change; outcomes ≈ 0 | application/registration window closed / out-of-stock / plan removed; 404 in all | settled spend **after** the state-change timestamp |
| **Broken tracking** | Sessions continue but outcome pixel/webhook/event pipeline down | outcome webhook / order pixel / event pipeline down | spend during the outage — **computed but EXCLUDED from the recoverable total** (outcomes may be real but unseen); action = "fix tracking" |
| **Invalid traffic / fraud** | Platform-reported invalid-click rate × spend ≥ floor, or a placement/IP/geo cluster with bot-session share > X and 0 outcomes | all; display/video worst | invalid clicks × avg click cost (platform figure); action = exclusions + claim platform credit |
| **Creative-offer vs destination mismatch (hard)** | Ad promise (offer/price/claim) diverges from the destination, and the destination is unbuyable/expired | offer withdrawn / feed-price ≠ product-page price on the item / plan or price removed | spend to the mismatched destination while in that state |
| **Dead spend, cause unknown** (flagship, catch-all) | spend > 0, outcomes = 0, past maturity, above floor, no higher rule matched | universal | all settled entity spend; action = pause & investigate |

### 9.2 Likely — underperformance (review; bounded estimate)
| Capability | Signal | Amount basis |
|---|---|---|
| **Wrong-destination routing** | destinationCPO ≥ value-comparable benchmark × (1+MARGIN), outcomes ≥ floor | overspend = max(0, spend − outcomes × benchmarkCPO) |
| **Cost outlier / regression** | cross-sectional cost-per-outcome outlier vs peers, or own CPO regressed sharply | overspend vs the matched cohort |
| **Page-speed / pre-conversion bounce** | sessions ≥ floor, bounce ≥ cohort+margin, conversion ≤ peer×(1−MARGIN), corroborated by load metrics | overspend vs benchmark |
| **Lead-quality / junk conversions** (Review) | outcome fires but qualified/valid rate ≤ cohort×(1−QMARGIN) | (outcomes − qualified) × CPO, capped at spend − qualified × benchmarkCPO |
| **Net-value underperformance / returns / refunds** | net value after returns/refunds below the cohort's return-on-spend | reversed value, or spend − netValue/benchmarkReturn |
| **Wrong-outcome proxy** | a proxy event is counted while the terminal outcome rate ≤ peer×(1−MARGIN) | spend × (1 − terminalRate / peerTerminalRate) |
| **Creative-offer mismatch (soft)** | promise diverges but the destination still converts, just worse | overspend vs benchmark |

### 9.3 Guards (NOT buckets — they gate or correct classification)
| Guard | Purpose |
|---|---|
| **Attribution-undercount** (consent/ATT/3p loss) | When observed-outcome coverage < floor in a region, suppress zero/low-outcome confirms there (→ insufficient-signal), widen likely thresholds, and exclude that region from benchmarks — prevents manufacturing leaks from measurement loss. |
| **Duplicate-conversion dedup** | Dedup outcomes by (identity + event + window) before classification; over-count hides real leaks as Working and deflates benchmarks. |
| **Cold-start / no cohort** | If the value-comparable cohort < N_MIN or < 2 comparable destinations, the entire Likely side emits insufficient-signal — never silently Working. |

### 9.4 Structural coverage
- **Sub-grain bleed.** Run the same ladder at the finest connector dimension (placement, keyword, audience, geo, device, daypart); child amounts sum ≤ parent and reclassify part of the parent's Working, preserving the invariant. *(A dead placement inside a "healthy" campaign is otherwise invisible.)*
- **Unreconciled / dark spend.** `unreconciledSpend = platformSpend − Σ joined spend`, surfaced as its own line; never folded into Working.
- **Spend-denominated floor (awareness / low-click).** The minimum session/click/outcome floors prevent thin-data false positives — but a high-spend, low-click entity would be *hidden* by them. So a **parallel spend floor** applies: when settled spend ≥ SPEND_MIN but traffic is below the click floor, classify as Confirmed dead-spend-by-amount (using impressions ≥ I_MIN as the thin-data guard) rather than routing to insufficient-signal. *(Stated tension: click floors stop false positives; the spend floor stops the high-spend/zero-traffic blind spot.)*

## 10. Detection logic & lifecycle

1. **Continuous evaluation** per tenant on a schedule (e.g. ~15 min) **and** on change-webhooks (spend update, a run of failed conversions, a destination state change).
2. **Configurable thresholds + floors** (`S_MIN, C_MIN, L_MIN, SPEND_MIN, W, MARGIN, SIGMA, REG, MATURITY`) — shown in the UI, per-tenant-tunable, never magic numbers in code.
3. **Attribution-maturity window — learned per tenant** from its own click→outcome latency (minutes for ecommerce, weeks for long sales cycles); classification over spend younger than this is withheld. *(Too-short is the #1 false positive.)*
4. **Precedence ladder** (each unit counted once): `confirmed:broken-path → dead-destination → broken-tracking → invalid-traffic → dead-spend-unknown → likely:routing → cost-outlier → … → working`.
5. **Debounce / hysteresis** — a finding persists across ≥ 2 evaluations before it **opens**; auto-resolves when the condition clears **or when sessions to the faulty destination fall to ~0** (so a stale fault can't keep accruing spend that moved elsewhere).
6. **Lifecycle events** — `leak.opened / updated / resolved`, idempotent by key.

## 11. Calculation & accuracy guarantee

**CONFIRMED** = Σ over each reconciled destination of `settled spend integrated over [faultOnset, asOf]`, restricted to entities with a binary provable fault **and** reconciled outcomes = 0 in that window; each unit assigned once via the precedence ladder; **spend apportioned to the faulty destination** (≤ spend whose sessions reached it), **settled days only**. No benchmark, no value model. *(Broken-tracking computed but excluded from recoverable.)* **If settled / timestamped / coverage / apportionment conditions aren't all met → insufficient-signal, not a confirm.**

**LIKELY** = Σ `max(0, spend − outcomes × benchmarkCPO)`, where `benchmarkCPO = Σ(cohort spend) / Σ(cohort outcomes)` at full precision over the tenant's own **value-comparable** peers (ticket/LTV band + intent + funnel stage) **excluding broken/closed entities and the entity under test**, recomputed each run. Round **once** at display; the drill-through multiplication must equal the stored amount. `overspend ≤ 0 ⇒ not a leak`. **Never flag an entity whose value-adjusted return ≥ its cohort's** (demote to watch).

**WORKING** = `totalSettledSpend − Confirmed − Likely − Unreconciled − InsufficientSignal`, cross-checked to equal `Σ settled spend of entities with no open finding`, to the smallest currency unit, or render is blocked.

**The guarantee we make, per register:** Confirmed is a *measured fact*, exact to the smallest currency unit once settled; Likely is a *bounded, reproducible estimate* shown as a review. Everything is deterministic and fully drillable. We never present a Likely figure as recoverable money.

## 12. Data inputs & the reconciliation join

| Input | Source | Used for | Freshness |
|---|---|---|---|
| Spend, clicks, impressions, invalid-click rate (per campaign→destination, and sub-grain) | Ad connectors | amounts; dead-spend; sub-grain; awareness floor | hourly, settled-aware |
| Outcomes, qualified/valid status, returns/refunds, timestamps | Outcome system (CRM / commerce) — **the sole outcome authority** | zero-outcome detection, CPO, quality, net value | hourly + webhook |
| **Outcome-join coverage** (share of outcomes that reconcile to spend) | derived | **first-class gating input** for every zero-outcome confirm | per run |
| Sessions, conversion-path/step events, health | Behaviour / capture signal | broken-path, speed/bounce | near-real-time |
| Destination/offer state, close/expiry, availability, price/feed | Destination & catalog metadata | dead-destination, mismatch, out-of-stock | daily + on-change |
| HTTP status, synthetic conversion probe | Health probe | broken-tracking, 404 | periodic |

**"Settled, reconciliation-grade"** = every day feeding a shown amount is past per-source settlement lag and stable across two re-pulls; facts versioned by (source, day, pull-timestamp); restatements emit `leak.updated`, never a silent mutation; open periods are marked provisional. **Platform-reported/modelled/view-through conversions are never counted as an outcome** — only reconciled ones.

## 13. The Finding data contract & events

**Finding** (the typed unit the whole feature reads/writes):
```
Finding {
  id, tenantId, entityId, grain,            // campaign / destination / sub-grain key
  rule, bucket, register,                    // register ∈ {recoverable, review, line, withheld}
  amount, currency,                          // amount in the tenant's currency
  faultOnset?, asOf, settled,                // window + settled flag
  confidence,                                // confirmed | likely | guard
  evidence[],                                // refs to the production rows that compose it
  state,                                     // provisional | settled | in_experiment | resolved
  openedAt, lastSeen, resolvedAt?
}
```
**Events** (idempotent, keyed by `tenantId+entityId+rule`): `leak.opened`, `leak.updated` (amount moved > X% or state changed), `leak.resolved` — each carrying the Finding snapshot + a diff.
**Consumer read API:** a per-tenant rollup (`{working, confirmed, likely, unreconciled, insufficientSignal, total, asOf, provisional?}`) that satisfies the five-part invariant, plus a list/stream of open Findings with drill-through refs.

## 14. Multi-tenant engine & architecture

**One common engine. No per-client rule code.** The reconciliation invariant is industry-agnostic; the typed rules are fully parameterized; industry differences are absorbed by **signal adapters** (form vs checkout vs signup vs call) that all map to the same universal categories. The only layer that touches per-industry logic is the conversion-*value* model, which sits **above** classification (buckets are computed from outcome count and cost, which are currency/formula-agnostic).

**Architecture:** connectors → a **reconciled facts store** (per tenant, campaign/destination/sub-grain, hour) → a **deterministic evaluator** (pure, testable, the same rules for everyone) running on schedule + webhooks → a **findings store with lifecycle/debounce** → an **event bus** → consumers (overview, moves, notifications, audit log). The evaluator is arithmetic over the tenant's rows — cheap; scale by sharding workers per tenant.

**Tenant config at onboarding:** conversion event + funnel + terminal value event; value/economics model; currency + timezone; an initial sales-cycle estimate to seed the maturity window; destination close/expiry metadata source; the attribution field that carries campaign/destination; peer-cohort / "generic destination" taxonomy; consent regime.
**Auto-derived (no config):** benchmark CPO, the z-baseline mean/std, the learned maturity window, per-entity CPO + qualified rate, all bucket totals + the residual, regression baselines (~2 weeks of history).
**Day-1 capability (connector spend + outcome system only):** the invariant + blended CPO; dead-spend + the unexplained catch-all (**confirmed, exact for the amount even before a cause is named**); dead-destination where close metadata exists; cost-outlier if ≥ 5 scored entities; routing overspend if ≥ 2 comparable destinations.
**Gated:** the **spend→campaign/destination join at sub-account grain** (*the single most important dependency* — without it, only account-level blended CPO is possible); behaviour-dependent broken-path/tracking; stable value-comparable benchmark (≥ 5 comparable peers); quality/returns feed; sub-grain breakdowns.
**Cold-start (fresh tenant):** shows little at first, by design — insufficient-signal until spend ages past the maturity window and entities clear the floors; the first trustworthy leak is zero-outcome dead-spend (hours for ecommerce, weeks for long cycles); the whole Likely side stays withheld until a value-comparable cohort exists; an account-wide empty/stale outcome feed **withholds any confirm** until one reconciled outcome proves the pipe works.

## 15. Open questions / decisions
1. **Show a Likely number before a value-comparable cohort exists?** Recommend withholding the Likely side until ≥ N comparable peers exist, to avoid flagging a profitable high-value line.
2. **Cold-start fallback benchmark** — use an anonymised cross-tenant industry median (with a confidence flag) until a tenant has its own cohort, or withhold entirely?
3. **Thresholds** — shared generic defaults vs per-tenant/per-vertical overrides, and who signs off a change that moves a client-facing number.
4. **Value/quality at launch for ecommerce/SaaS** — require a returns/qualification feed before any Likely claim, or ship count-based with the gap clearly labelled?
5. **Autonomy line** — may the engine auto-pause a *provably dead* (reversible) spend, or always propose? Define the "irreversible/outward = human approves" boundary.
