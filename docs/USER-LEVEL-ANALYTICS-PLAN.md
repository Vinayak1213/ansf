# User-level analytics — validated build plan

*What to build once Samurai has an individual user-level event stream. Researched across replay / experience-intelligence (FullStory, Contentsquare, Glassbox, Quantum Metric, Hotjar, Clarity), product analytics (Amplitude, Mixpanel, Heap, PostHog, Pendo) and marketing / attribution / lead-scoring (HockeyStack, Dreamdata, VWO Insights). 26 candidates → deduped → ranked → adversarially verified against the determinism gate, prototype-feasibility, and non-redundancy.*

---

## 1. The premise and the gate

Everything here assumes the **Stage-2 behaviour-capture foundation** exists: a per-visitor event stream (sessions stitched by a visitor id; anonymous → known at form submit) joined to the CRM outcome. Today the substrate is **mocked and aggregate** (`behavior.ts` → seeded `pageBehavior()`), so in the prototype each feature is demoed on a **seeded per-visitor store** built off the same RNG — honest *as a prototype*, clearly not real traffic.

Every candidate was tested against four gates:

1. **Deterministic & inspectable** — computable from logged events, no opaque ML/propensity, reconciles to account totals. (A rule-based score with visible inputs is OK; a black-box "likelihood" is not.)
2. **Prototype-feasible honestly** — can seeded per-visitor data demo it *without authoring the very distribution it then "discovers"*? (This is where longitudinal/multi-touch ideas failed — see §4.)
3. **Non-redundant** — net-new vs heatmaps, aggregate funnels, form analytics, the Clarity replay list, Smart Alerts, and the revenue layer we already ship.
4. **Instant value, self-serve, aligned** — a non-technical marketer or admissions counsellor acts on it day one, and it fits the reconciled-outcome category.

---

## 2. The validated shortlist

Confidence is the adversarial critic's **adjusted** score (after challenge), not the optimistic first pass.

| # | Feature | What it is | Verdict | Conf. |
|---|---|---|---|---|
| 1 | **Lead Story** | A right-hand drawer that replays one prospect's whole arc: first ad/campaign (+ its cost) → every session/device/page/scroll/form event → lead → qualified → enrolled → revenue. | **BUILD-NOW** | 88 |
| 2 | Friction-to-lost-leads impact ledger | Ranks friction/form/drop issues by "N sessions → ~X fewer leads → ~₹Y". | Build *only* as a labelled opportunity band — **not a headline** | 72 |
| 3 | **Behaviour-to-outcome lift** | "What leads did differently" — each on-site behaviour's lead/enrolment rate for people who did it vs didn't, with cohort sizes. | **BUILD-NOW** | 82 |
| 4 | **Counsellor worklist (no score)** | A standing, tiered list of people to act on now: form-abandoners · returned-but-not-a-lead · cold leads past the typical window. Each row opens a Lead Story. | **BUILD-NOW** | 85 |
| 5 | Full funnel to enrolment, segmentable | Extends the funnel past the lead and across sessions (Visited → Returned → Lead → Qualified → Enrolled), compare-segments. | BUILD-NOW, behind progressive disclosure | 76 |
| 6 | Consideration & return (time axis) | New-vs-returning + visits/days-to-convert distributions. | **GATE** (needs real longitudinal data) | 60 |
| 7 | First- vs last-touch attribution | Fixed-rule multi-touch credit + assist channels. | **GATE** (needs real multi-touch capture) | 58 |
| 8 | Audience builder | Save a behaviour-defined cohort; auto-reconcile its leads/CPL/enrolments/revenue. | **DEFER** until the consuming views create demand | 56 |

---

## 3. Recommended build sequence

Build **one substrate plus a small, governed set of drill entry points — sequenced, not eight cards in parallel.** The critic's single loudest warning was feature sprawl / surface overload; this sequence is the discipline against it.

**Slice 1 — Lead Story (the substrate).** Everything else reads from it, so it ships first. It is the single most deterministic thing in the set — a literal, timestamp-ordered replay of logged events plus the joined CRM record, so *nothing is computed and nothing can hallucinate* (the strongest possible fit for the no-fabrication principle). It is also the **audit view that makes every aggregate defensible**: open any lead and verify the spend → visits → form → lead → qualified → enrolled → revenue chain end-to-end — which is exactly the trust/auditability moat the strategy names as the whole thesis. Day-one value for the named counsellor audience: a warm, specific call instead of a cold one, with zero statistical literacy required.

**Slice 2 — Counsellor worklist.** The worklist is *just a filtered list of Lead Stories to act on*, so it reuses the substrate and adds the highest day-one action value. Pure boolean/recency logic (≥2 sessions AND no submit; or started-not-submitted; or lead idle past an editable threshold) — the cleanest determinism after Lead Story, and the honest **non-score** alternative to the Stage-3 scoring engine. Privacy: the form-abandoner tier must be built **consent-gated** from day one (capturing partial email/phone carries DPDP obligations).

**Slice 3 — Behaviour-to-outcome lift.** "What leads did differently" — the purest behaviour → lead → enrolment → revenue expression, and the honest empirical base that would *later* justify any weights (so no opaque score is ever needed). Framed as observed **association**, never causation, with a visible sample-size floor that degrades thin factors to "insufficient signal". Reused in Experiments as the per-variant "why this won" explainer.

The arc reads cleanly for a non-technical user: **the person (Story) → who to act on (Worklist) → what works (Lift).**

---

## 4. Deliberately NOT building now — and why

- **The impact ledger / "revenue-at-stake" (#2)** — this is the feature just reverted, and the critic independently flagged it as the trust-weakest item: its sized "₹ missed" is a **counterfactual** (the conversion the page *would* have had), so by definition it reconciles to no actual total — it fights the reconciliation-invariant moat. If it returns, it must be a clearly-labelled *opportunity band* with the formula and an editable baseline on screen, never a headline and never phrased as recoverable money.
- **Consideration & return (#6)** and **first/last-touch attribution (#7)** — both demo fine on seeded data but their value depends on **real longitudinal / multi-touch capture that doesn't exist yet**. Seeding those curves means authoring the headline ("62% of enrolments from 2nd+ visits") rather than observing it — the exact "fabricated distributions" trap on the strategy's SKIP list. Gated to Stage-2 real data. (A plain new-vs-returning *count* card could be a lighter early slice if wanted.)
- **Audience builder (#8)** — the most builder-like, blank-canvas, overwhelm-prone item. Let the need *emerge*: ship a "save this segment" action from the worklist/lift/funnel views first; promote a standalone Audiences panel only once those views generate real demand.
- **Any propensity / intent / readiness score** — these collapse to the **27%-gated Intent Analytics** item (weighted-signal → score → tier), explicitly deferred to Stage 3 and "never build twice". The worklist delivers the "who to call first" value *now* without the score risk; its honest weights come later from the lift view.

---

## 5. UI/UX stitching principles (the most critical constraint)

1. **One substrate, governed entry points.** Lead Story is a **drawer**, never a surface — opened from an Overview lead row, a session in the existing Clarity replay list, and any worklist/lift/cohort row. Zero new top-level clutter; pure progressive disclosure, consistent with the existing Investigate grammar. *(Implementation note: today's Investigate drawer renders a table payload — Lead Story needs a new timeline drawer variant.)*
2. **Depth behind the drill, never on the surface.** Each new readout shows one plain-language headline; the cohorts, paths, distributions and per-field detail live one click down. The segmentable funnel (#5) ships with a single default view; its segment/path controls are a drill.
3. **Reuse existing visual grammar** — the device-split card shape, the funnel bars, the Investigate drawer — so new features feel like the same product, not bolt-ons.
4. **Sequence, don't stack.** Ship Slice 1, let it settle, then 2, then 3. Never ship a ledger headline + lift card + cross-session funnel + worklist + consideration card + attribution toggle + audiences onto Overview at once — that reintroduces the statistical-literacy and PII burden this audience can't carry.
5. **Honest degradation everywhere** — thin cohorts / sparse data → "insufficient signal", never a confident-looking fabricated number.

---

## 6. Prototype data plan

- Add a seeded **per-visitor event store** derived from the existing RNG (sessions with visitor id, ordered events, device/source, and a joined seeded CRM outcome).
- **Reconciliation invariant:** the count of Lead Stories reaching "Submitted" must equal the existing lead total; qualified/enrolled/revenue roll up through `business.ts` and tie to account totals. If a new per-visitor number doesn't reconcile, it doesn't ship.
- Deterministic throughout — no `Math.random()` at render; same seed → same story.

---

## 7. Alignment

- **Vision / category:** Lead Story *is* the reconciled-outcome thesis made literal (behaviour next to the revenue it drove, auditable per person) — the position between CRO and attribution that neither VWO/Optimizely nor the product-analytics tools occupy.
- **Roadmap:** this is the Stage-2 "behaviour next to the revenue it drove" payoff; it deliberately stops short of the Stage-3 scoring/personalization engine (gated) and the DXP/agentic breadth (skipped).
- **Principle:** honours deterministic-over-AI and no-fabrication end to end; the gated/deferred decisions above are the principle doing its job.
