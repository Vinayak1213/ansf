# Conversion Intelligence — audit & revamp

Revamp of **User analytics → "What converters do differently"** into a **Conversion Behaviour & Opportunity Insights** experience. This is the audit the spec asked for, the methodology the rebuild uses, and the backend contract production needs. It is not a cosmetic pass — the analytical foundation was wrong and is replaced.

Touched: `src/data/converterIntel.ts` (new engine), `src/features/leads/ConversionIntel.tsx` (new experience), swapped in for `ConverterLift` in `BehaviorView` and `Overview`. The old `src/data/lift.ts` + `ConverterLift.tsx` are retained only until the swap is verified, then removed.

---

## 1. Audit of the existing implementation

The old card (`src/data/lift.ts` → `ConverterLift.tsx`) presents counted-looking insights ("31% of them became leads vs 2.2% of everyone else", "13.6×") that are **not counted**. Root causes:

| # | Issue | Evidence in `lift.ts` | Why it misleads |
|---|-------|----------------------|-----------------|
| 1 | **The association is fabricated.** The lift multiplier is hardcoded, not measured. | `EL_LIFT = { apply: 2.6, prospectus: 3.1, … }`; universal catalog `m: 2.8 / 1.9 / 2.3 …` | The headline "× more likely" is an author's guess, shown as a finding. |
| 2 | **The rates are back-solved from the guess.** | `rNot = base / (p*m + (1-p))`, `rDid = m*rNot` | "31% vs 2.2%" is algebra on the fabricated `m`, not two counted cohorts. There is no cohort. |
| 3 | **Behaviours with no backing event.** | `return` (prev 0.16), `long` (0.24), `pricing` (0.22), all `measured:false` | "Spent 2+ minutes", "Viewed the pricing", "Came back a 2nd+ time" are invented — the data model has no such events. |
| 4 | **Visits counted as visitors.** | `total = p.visits`, `base = leads/visits` | A repeat visitor is counted 2–3×; "52,476 visits became a lead" is relabelled "visitors who…". Denominator is wrong and undefined to the reader. |
| 5 | **Ranked by multiplier alone.** | `.sort((a,b) => b.lift - a.lift)` | A 20-visitor quirk outranks a 10,000-visitor pattern — the spec's explicit anti-goal. |
| 6 | **No statistics.** | only `MIN_COHORT = 30` | No significance test, no confidence interval, no multiple-comparison control across ~12 behaviours. Noise reads as signal. |
| 7 | **No before-conversion ordering.** | behaviours and conversion share the same scope, no time axis | Reverse causation and tautology ("reached the form" ≈ "converted") are not separated. |
| 8 | **The multiplier is the product.** | "13.6×" is the hero number | The spec says stop depending on arbitrary green/red multipliers; the whole card is one. |

**Data-model finding (decisive):** `src/data/behavior.ts` exposes only **aggregates** per page — `visits`, `leads`, scroll %, bounce %, rage/dead counts, element CTRs, a 4-step funnel — plus **28 sample sessions** for replay. There is **no per-visitor event stream**. A genuine converter-vs-non-converter comparison (per-visitor cohorts, before-conversion windowing, journey paths, dedup of repeat visits) **cannot be computed from the current data**. The old card papered over this by modelling the answer.

## 2. What the rebuild does instead

Because the whole app runs on seeded data, the honest fix is not to invent an answer but to build a **consistent per-visitor substrate and then count everything from it** — the same computation production will run on real events. Every number shown is produced by counting that population; nothing is a hardcoded multiplier.

**Substrate (`converterIntel.ts`):** a deterministic per-visitor population, seeded per scope, that **reconciles to the page's real aggregates** (unique visitors, visits, leads, scroll, bounce, rage, element CTRs, form funnel). Each visitor carries a device, source, an **ordered** event list, repeat-visit flag, and a converted flag. Conversion and each behaviour load on one latent intent, so any association is an **emergent, counted** property — not back-solved per row. The generative layer is labelled as a prototype stand-in for the event pipeline; the **analytical** layer (cohorts, denominators, tests, suppression) is production-grade.

**Every displayed metric is counted:** converters vs non-converters are two real cohorts; each behaviour reports both cohort counts, both conversion rates with **Wilson 95% CIs**, a **two-proportion z-test** p-value, and **Benjamini–Hochberg (FDR 0.10)** significance across the whole behaviour set. Visitor-level throughout (repeat visits deduped). Only **pre-conversion** events count; the conversion event itself is excluded. Thin cohorts (< 30 either side) are suppressed and labelled, not shown.

## 3. Information architecture (five sections)

- **A — Conversion overview:** visits, unique visitors, converted, non-converted, conversion rate, and change vs the previous equivalent period. Denominators stated.
- **B — What converters & non-converters do differently** (core): per behaviour — counts and % in each cohort, conversion rate if they did vs if they didn't (with CIs), relative difference where significant, sample size and a plain confidence label. Filters: *More among converters / More among non-converters / All significant*. Bars encode **affected-visitor share**, not the multiplier.
- **C — Conversion journey comparison:** modal paths for converters vs non-converters, step conversion, biggest drop-off, median time between steps — reconstructed from the funnel + scroll + element events we actually have, never invented.
- **D — UX friction & experience gaps:** observed friction (rage, dead clicks, form errors, repeated field edits, early exits, navigation loops) with *observed / who / how often* kept strictly separate from *what it could indicate / what to investigate*. Signals we can't measure (load time) are shown as unavailable, not faked.
- **E — Business impact & recommendations:** top findings ranked by priority, each with observed pattern → possible user impact → business impact → recommended action → success metric. Opportunity is quantified in **leads** (conservative / expected / optimistic, from a stated fraction of the observed gap), never as a direct causal number and never in fabricated rupees. Each opportunity routes to a **test**, because correlation is not uplift.

## 4. Analytics integrity safeguards (implemented)

Visitor-level cohorts · one conversion definition (CRM lead) · equivalent windows · pre-conversion events only · bots/internal excluded where flagged · repeat visits deduped · numerator and denominator always shown · relative difference computed as (rate_did − rate_not)/rate_not · two-proportion z-test + Wilson CIs · Benjamini–Hochberg multiple-comparison control · configurable `MIN_COHORT` floor · unreliable insights suppressed or labelled · correlation separated from causation in copy · no number without a source row.

## 5. Intelligence layer

Interpretation is **deterministic and evidence-bound**, not generative — every sentence carries the computed figures and uses association language ("associated with higher conversion", "may indicate friction"), never "increased conversions by X" or "will generate N leads". This deliberately avoids the excluded Samurai AI / Smart Alerts and matches the owner's deterministic-over-AI principle.

## 6. Prioritisation

Priority = f(affected-visitor volume, magnitude of the rate difference, statistical reliability, friction severity, feasibility). Explicitly **not** the raw multiplier: a moderate difference over 10,000 visitors outranks a huge multiplier over 20.

## 7. Backend contract production needs (not simulated)

To compute the above on real traffic, the event pipeline must provide, per anonymous visitor (stitched to the CRM lead ref, no PII):

- **Identity:** stable visitor id (1st-party), session id, `isRepeat`, device, source/UTM, bot/internal flags.
- **Events (ordered, timestamped):** page/section views, scroll-depth milestones, element clicks (Apply, prospectus, WhatsApp, call, callback), form field focus/blur/change/error, submit success/fail, rage/dead clicks, quick-back/exit.
- **Outcome join:** CRM lead + stage + timestamp keyed to the visitor ref, so conversion is defined and **pre-conversion** windowing is possible.
- **Aggregation API:** cohort split + per-behaviour counts, rates, CIs, z-test, BH correction, and journey paths — server-side, so the client only renders. Until this exists, the experience runs on the labelled prototype substrate.
