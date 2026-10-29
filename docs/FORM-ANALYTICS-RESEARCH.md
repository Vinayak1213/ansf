# Form analytics — competitor research & decision gate

**Date:** 2026-10-16 · **Verdict: BUILD (high confidence ~97%)**
**Gap it fills:** the landing-page forms are where visitors become leads, but Samurai does no field-level tracking — so a marketer sees *one* conversion number and can't tell *which field* loses the lead.

## Why this clears the gate (unlike Intent Analytics, which scored 27%)

| Principle | Intent Analytics | Form analytics |
|---|---|---|
| Deterministic, not AI/black-box | ✗ had to *infer* intent from mocked behaviour → hallucination | ✓ pure client-side events (focus/blur/change/submit) + **comparative ranking** of fields — the verdict is "worst field vs the rest", no prediction |
| Grounded in real structure | ✗ substrate mocked | ✓ the forms already exist on the pages; data reconciles to real lead counts |
| Everything reconciles | ✗ | ✓ **form completions = the page's leads**; starts plug into the existing journey funnel (`Form started → Submitted`) |
| Serves the core job | partial | ✓ directly answers "where are we losing leads" — zooms the on-page journey funnel from page-level to **field-level** |
| Proven | emerging | ✓ an entire category (Zuko/Formisimo) is built on it; 8 competitors converge on the same model |

## The proven framework (convergent across 8 competitors)

Sources: Zuko (metric-definitions, field-aggregate, field-flow guides), VWO Form Analysis, Mouseflow field analysis, Contentsquare Form Analysis, Lucky Orange Forms, FullStory funnels, Hotjar, Microsoft Clarity. Specialists (Zuko, VWO, Mouseflow, Contentsquare, Lucky Orange) expose the richest native field metrics; broad platforms (Clarity, FullStory, current Hotjar) lean on funnels + replay.

**Form-level (the outcome):** viewed → started → submit-attempted → completed; completion rate; abandonment; avg time; failed submits; period-over-period change.

**Field-level (the actionable core):**
1. **Abandonment field** — the last field interacted with before leaving. *The headline.* Keep two denominators separate (Zuko): **% of total abandons** (of all who left, how many here) vs **drop rate** (of those who reached it, how many left).
2. **Time per field** — active time; separate from **hesitation / time-to-start** (don't conflate — VWO/Lucky Orange).
3. **Corrections / returns / refills** — typed-deleted-retyped, or came back to the field → validation/comprehension friction.
4. **Validation errors & recovery** — which rules block progress.
5. **Blank / ignored rate** — submission-conditioned (blank on submit), not merely untouched.
6. **Reach / field order** — the exposure denominator; avoid a misleading linear funnel when users backtrack.

**The verdict (deterministic, no AI):** *"the field with the biggest gap vs the rest is your first edit"* (Zuko). Pure ranking — fits Samurai exactly. (Exatom/LeadCapture bolt an LLM on top; we don't need to.)

**Signature visualizations:** (a) compact completion funnel bars; (b) **field drop-off funnel** (sessions reached per field, narrowing to submit — the biggest gap is the culprit); (c) sortable **Fields Overview table** (reached, abandon %, drop rate, time, returns, errors). Specialists also link each field metric → filtered session replay.

**Instrumentation (all deterministic):** form_view/form_start · focusin/focusout (field visits + last-interacted) · input/change (changed? blank?) · field-duration accumulator (active vs hesitation) · validation_error_shown/cleared · submit_attempt/failure/success · visibility/session-end checkpoint (sendBeacon). **Track events, never the typed values** (privacy — Zuko/SessionSight).

## UI / animation libraries
No new dependencies needed. The gold-standard reference block (shadcn "form analytics dashboard") is built on **Tailwind + framer-motion** — exactly Samurai's stack (`motion/react` + Tailwind v4 + Recharts). Field funnel = animated horizontal bars via `motion` (same idiom as the journey funnel / ticket-revenue cards); table via the existing `Investigate` drawer. Avoids build-trap.

## How it maps onto Samurai (deterministic, reconciling)
- Model each page's **Enquiry form** as ordered fields: Full name · Email · Phone number · Programme of interest · Submit.
- Derive from `behavior.ts`: `started` = journey `Form started`, `completed` = journey `Submitted` = **page leads**. Distribute `started − completed` abandons across fields by a seeded, fault-aware friction profile → every number reconciles to the account.
- **Degrades honestly:** `broken_form` (B.Com, mobile <380px) → funnel collapses at **Submit**, headline names the real cause (ties to the existing leak + rage-on-form signals); `closed_intake` → "intake closed, not a form problem"; < ~15 starts → "not enough form activity yet."
- **Home:** a new "Form analytics" section on the **Behaviour** page, right after the On-page journey funnel (page-level → field-level zoom). Headline = the one field to fix; funnel bars by default; full Fields Overview table behind **Investigate** (progressive disclosure).
- **Stitches:** Smart Alerts (deterministic "form field leaking" rule) and the Experiments "Shorter enquiry form" test (field funnel per variant) are natural follow-ons.
