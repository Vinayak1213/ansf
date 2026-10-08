# Samurai — On-Page Behavior & User-Journey Intelligence (Research + Design Spec)

_Research date: 2026-09-27. Sources scraped live via Firecrawl + Scrape.do (see §8). This is the "next phase": behavioral intelligence on the landing page, kept **separate** from the current revenue lens (CPL / spend / leads), surfaced through a **view toggle** inside Pages and Experiments._

---

## 1. Why this phase — the gap

Samurai today answers **"which page turns ad spend into enquiries most cheaply?"** — a revenue lens (spend, leads, CPL, leaks, intake pacing). It says *whether* a page converts, never *how the visitor behaved on it*: where they clicked, how far they scrolled, where they hesitated, where they rage-clicked, where the journey broke.

That behavioral layer is the proven complement in the market. The design rule (from the user): **do not merge the two.** Behavior is its own view — a toggle inside a page's detail (and a parallel lens in Experiments), showing only behavioral data when active.

---

## 2. The market — who does this, and what they're known for

| Platform | Category | Known for |
|---|---|---|
| **Microsoft Clarity** | Free heatmaps + replay + insights | Dead clicks, rage clicks, excessive scrolling, quick-backs, JS errors — auto-surfaced "Insights". Already referenced in Samurai's PageDetail ("Microsoft Clarity is connected"). |
| **Hotjar** (Contentsquare) | Heatmaps + recordings + funnels + forms | The canonical 6 heatmap types; funnels; form analysis; feedback. |
| **Contentsquare** | Enterprise experience analytics | Zone-based (zoning) analysis, journey analysis, Frustration Score, "full journey intelligence". |
| **FullStory** | Session replay + analytics | Autocapture ("Fullcapture"), Journey Maps, Sentiment/Frustration signals, rage clicks. |
| **PostHog** | Product analytics (OSS) | Toolbar heatmaps (Heatmap / Scrollmap / Clickmap), **User Paths** (Sankey journeys with drop-off), session replay, autocapture. |
| **Amplitude** | Product analytics | Journeys / Pathfinder, funnels with drop-off & conversion + median time between steps. |
| **Others** | | Heap (autocapture journeys), Mouseflow/Smartlook/Crazy Egg (replay+heatmap), Zuko (form analytics), GA4 (path & funnel exploration). |

**Takeaway:** the feature set has converged. Everyone ships some combination of **heatmaps, scroll analysis, frustration signals, on-page/site journeys, session replay, form analytics, and engagement metrics** — differing mainly in polish and how they visualize it.

---

## 3. What to track — the converged taxonomy

### A. Heatmaps / interaction maps  (Hotjar's 6 types; PostHog's 3)
- **Click map** — aggregate of clicks (desktop) / taps (mobile), colour-coded by frequency. PostHog's **clickmap** is *element-anchored*: it draws a **labelled box with the click count on each real DOM element** (more accurate than x/y coordinate plotting). ← maps directly onto Samurai's existing `PageElement` model.
- **Scroll map** — exact % of visitors who reach any vertical point ("the redder, the more seen"). Reveals the **fold** and how many reach the form/CTA.
- **Move map** — where desktop cursors move (a proxy for gaze/attention).
- **Attention map** — time-weighted attention per area.
- **Engagement zones** — click + scroll + move combined into one at-a-glance view.
- **Rage-click map** — areas of repeated frustrated clicking.
- Always sliceable by **device (desktop / tablet / mobile)** and segment.
- Colour convention: warm (red/orange) = high activity, cool (blue/green) = low.

### B. Frustration / friction signals  (Clarity, FullStory, Contentsquare)
- **Rage clicks** — rapid repeated clicks in one spot (confusion, or something that looks clickable but isn't, or a slow/broken control).
- **Dead clicks** — clicks on non-interactive elements (nothing happens).
- **Error clicks** — clicks that coincide with a JS error firing.
- **Quick-backs** — landing then immediately returning (Clarity).
- **Excessive scrolling** — frantic up/down hunting (Clarity).
- **Thrashed cursor / u-turns** — erratic movement.
- **Frustration Score** — a single aggregate that ranks the worst sessions/pages (Contentsquare).

### C. On-page journey / flow  (PostHog Paths, Amplitude Journeys)
- A **flow of steps** (Sankey-style): each node a state, bars the transitions, numbers the distinct users through each step.
- Per step: **conversion rate**, **drop-off**, and **average/median time from the previous step**. Hover a node → highlight upstream + downstream to trace the whole journey.
- For a **single landing page**, this collapses into an **on-page funnel**: `Landed → Scrolled to form → Started form → Submitted` (plus branches like "clicked WhatsApp", "downloaded prospectus", "left").

### D. Session replay
- Recordings of real sessions; **filter by signal** (rage-clicked, errored, converted, bounced); jump to the moment of friction. Generate a heatmap screenshot from a recording.

### E. Form analytics  (Hotjar/Zuko)
- Field-level: **starts, completions, the field where people abandon, time per field, re-fills/corrections, overall abandonment rate.**

### F. Engagement metrics
- Active/engaged time, scroll reach, interactions per session, bounce/exit rate, sessions.

### G. Segmentation
- Device, traffic source/campaign, new vs returning.

---

## 4. How they present it (visualization patterns to reuse)

- **Heat overlay on a screenshot of the page**, with a colour legend and a device switch — the signature view.
- **Element-anchored count boxes** (PostHog clickmap) — labelled boxes on each element.
- **Scroll graph** — a vertical gradient beside the page + a "% reach" curve, with a dashed **fold line** and a marker at the form.
- **Ranked click list** — elements sorted by clicks/CTR.
- **Sankey / flow diagram** — nodes + weighted links for journeys; **funnel bars** for a fixed on-page sequence.
- **Session list** — rows tagged with signals, a tiny sparkline of the session, a play button.
- **Form waterfall** — per-field drop-off bars.
- **Frustration callouts** — a red badge on the offending element/area.

---

## 5. How this maps onto Samurai (JAIN Online landing pages)

Samurai already has the perfect substrate: `PageCanvas` renders a real JAIN landing page with named clickable elements (`apply`, `form`, `callback`, `prospectus`, `whatsapp`, `call`), and PageDetail already name-checks Clarity + script errors. We overlay behavior onto that.

### 5.1 Pages → page detail: a **"Behavior" view toggle**
Segmented control at the top of PageDetail: **[ Performance · Behavior ]**.
- **Performance** = the existing revenue view (unchanged).
- **Behavior** = new, showing only behavioral data:
  1. **Interaction map** (hero) — the landing render with a mode switch **Clicks · Scroll · Attention · Rage** and a **device** switch (Desktop / Mobile / Tablet). Clicks mode = element-anchored count + heat tint per element (PostHog-style). Scroll mode = fold line + %-reach gradient.
  2. **Scroll & fold** — "% of visitors reaching each section"; call out "only N% reach the form."
  3. **On-page journey funnel** — `Landed → Scrolled to form → Form start → Submit` with drop-off %, conversion and avg time between steps; branch chips for WhatsApp / prospectus / exit.
  4. **Friction signals** — rage / dead / quick-back / JS-error counts, with the **worst element flagged** — and this **bridges to the existing leak/fault model** (e.g. B.Com's `broken_form` fault → a rage-click cluster on Submit; the money leak now has a behavioral fingerprint).
  5. **Session replay** — a list of recent sessions tagged (rage / dead-click / converted / bounced) + a mock scrubber.
  6. **Engagement tiles** — active time, scroll reach, interactions/session, bounce.
  Everything reconciles to the page's real traffic (sessions ≈ visitors; form submits ≈ leads).

### 5.2 Experiments: a parallel **behavioral lens** (separate, not mixed)
- Extend the builder's **Track** step goal types with a **Behavioral** category: *scroll-to-CTA rate, form-completion rate, rage-click reduction, engaged time* — alongside today's conversion/revenue goals.
- Experiment detail gets a **Behavior toggle** showing the behavioral metric A vs B (e.g. scroll depth or rage-clicks moved), separate from the CPL verdict.
- A behavioral experiment answers "did the variant change how people *behave*", not just cost.

### 5.3 Overview (audit / integration — done last)
- A compact **"Friction hotspots"** card (distinct from revenue KPIs): top pages by rising frustration / lowest scroll-to-form / worst on-page drop-off, each linking into that page's Behavior view. Mirrors the existing "Tests in flight" and "Where the money leaked" cards in tone.

---

## 6. Proposed data model & components

**`src/data/behavior.ts`** — per-page behavioral data, all derived to reconcile with `PAGES` (visitors, leads) and the page's `fault`:
- `elements`: per element → `{ clicks, ctr, dead, rage }`
- `scroll`: `{ reach: {25,50,75,100}, foldPct, formReachPct }`
- `journey`: ordered steps `[{key,label,count,avgSecFromPrev}]` (Landed → Scroll → Form start → Submit) + branch exits
- `friction`: `{ rageClicks, deadClicks, quickBacks, jsErrors, score }` + `worstEl`
- `engagement`: `{ activeSec, scrollReach, interactions, bouncePct }`
- `devices`: `{ desktop, mobile, tablet }` (share + a per-device conversion)
- `sessions`: sample list `[{id, device, source, durSec, tags[], converted}]` for the replay list

**Components** (match existing chart/token style): `InteractionMap` (heat overlay + element count boxes over the landing render), `ScrollDepth`, `JourneyFlow` (on-page funnel/Sankey-lite), `FrictionPanel`, `SessionList` + `ReplayScrubber` (mock), `EngagementTiles`, `DeviceSplit`.

**Build order (step-by-step):** (1) data model → (2) Pages Behavior view + toggle → (3) the individual components → (4) Experiments behavioral lens → (5) Overview "Friction hotspots" + dependency audit.

---

## 7. Design guardrails
- Reuse the token system, chart primitives (`components/charts.tsx`, `expcharts.tsx`), Motion, and the calm enterprise B2B2C aesthetic.
- **Never mix lenses** — Performance and Behavior are separate views; a toggle switches the whole page.
- **Everything reconciles** — behavioral counts tie back to the page's real sessions/leads and to the existing fault/leak story.
- Mock data must be internally consistent per page (a broken-form page shows the rage-click/friction signature; a healthy page doesn't).

---

## 7b. Behavioural EXPERIMENT results (how leaders present an A/B test measured on behaviour)
_Second research pass, for the Experiments Behavior page (it was previously one bar chart)._
- **Statsig — "Read Experiment Results" (Scorecard)**: the canonical layout. A **scorecard** lists **primary + secondary + guardrail** metrics, each with **relative lift** (Delta% = (Test−Control)/Control), a **confidence interval** (95% default = ±1.96·SE), and a **significance verdict** — *positive lifts green, negative red, non-significant grey*. Plus **daily results over time**, dimension **breakdowns**, and guardrail/monitoring metrics.
- **CUX / uxHeat — heatmaps for A/B**: "**generate and analyze heatmaps separately for Variant A and Variant B**" and compare **side by side** — heatmaps reveal *why* one variant wins (attention/engagement shifts) beyond the conversion number; compare desktop and mobile.
- **PostHog — analyzing results / metric types**: experiments carry a **primary metric + secondary metrics**, shown as **funnel** or **trend** metrics, with significance and a results-over-time view; session replays are filterable per variant.

**→ Built into `ExpBehaviorView`:** a headline+significance banner, a **Statsig-style scorecard** (lift + CI bar + significance colouring, Goal/Guard roles), **primary metric over time** (A vs B dual line), **journey funnel A vs B**, **side-by-side click-map heatmaps A vs B**, and **session replay split by variant**. Data in `expBehavior(e)` — direction/magnitude from `e.verdict`, anchored to the page's `pageBehavior` + the experiment's own `corr` and arm counts.

## 8. Sources (scraped live this session)
- PostHog — Toolbar Heatmaps (Heatmap / Scrollmap / Clickmap; dead & rage clicks; element-anchored counts), User Paths (Sankey journey, drop-off, step conversion + time), Session Replay, Funnels.
- Hotjar / Contentsquare — Heatmaps (6 types), Engagement Zones, Rage clicks, Form analysis, Journey intelligence (Contentsquare platform, via Scrape.do render).
- Microsoft Clarity — Insights model (dead/rage clicks, excessive scrolling, quick-backs, JS errors).
- FullStory — Journey Maps, Sentiment/Frustration signals, Autocapture, Rage clicks.
- Amplitude — Journeys chart (drop-off & conversion, median time between steps).
_Raw scrapes cached under `.firecrawl/`._
