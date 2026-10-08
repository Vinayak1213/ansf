# Samurai — Product & Scope Audit (2026-09-27)

_Purpose: check that everything built so far serves the **marketer** (and **marketing executive**) persona, stays true to the product vision, and falls inside scope — and flag any drift before we build more._

---

## 1. The yardstick — what we committed to

**Vision (one line):** _"Which landing page turns ad spend into enquiries most cheaply — and what to change next."_ A marketing-optimization console for JAIN Online.

**Strategy pillars:**
1. **CPL efficiency** across pages and campaigns — find the cheap, expose the expensive.
2. **Run & read tests without engineering** — templates → launch → honest verdict.
3. **Everything reconciles** — "one owner per number"; the same totals on every screen.
4. **Honest by design** — a running test is not a result; the AI can't invent a number; show the gaps, don't hide them.

**Personas:**
- **Marketer** (owns CPL): day-to-day — what's cheap vs expensive, where money leaks, what to test next, did the test win, _why_ a page underperforms.
- **Marketing Executive** (owns budget + intake): pacing to the **January 600** target, **Google vs Meta** allocation, is the **₹1,42,800 leak** being recovered, blended CPL trend.

**Anchor numbers (must reconcile everywhere):** ₹6,20,009 spend · 358 leads · blended CPL ₹1,732 (↓14%) · leak ₹1,42,800 · intake 412/600 · Google ~2.4× cheaper than Meta.

---

## 2. What we've built (inventory)

| Surface | What it does |
|---|---|
| **Overview** | Blended CPL hero + January intake ring; spend/leads/CPL KPIs; **Tests in flight**; CPL trend; **Where the money leaked**; CPL by page; **Friction hotspots** (behavioral) |
| **Pages** | List ranked by CPL; detail with the spend→lead chain, CPL-over-time, ad breakdown, page health (Clarity/script); **Performance ⇄ Behavior** toggle |
| **Page Behavior view** | Interaction map (click/scroll/attention/rage), scroll depth, on-page journey funnel, friction signals, device split, session replay |
| **Experiments** | Tests table (CPL A→B, verdict, uplift); **Templates** library |
| **Template builder** | Full-screen 4-step journey: Track → Dashboard (drag widgets) → Monitor → Review |
| **New-experiment wizard** | 5-step (Start-from-template → Page → Change → Goal → Review), stitched to templates |
| **Experiment detail** | **Result** lens (readiness, timing, matchup, metric table, funnel, over-time) + **Behavior** lens (scorecard, over-time, journey A/B, click-map A/B, replay by variant) |
| **Campaigns** | Google vs Meta split; campaign table; campaign detail |
| **Samurai AI** | Agentic assistant (grounded reasoning, generative charts, confirm-before-apply, reports) |
| **Cross-cutting** | Reconciling drill-downs ("Investigate"), range picker, collapsible sidebar, toasts |

---

## 3. Scope audit — feature by feature

Legend: **Core** = directly serves a committed pillar · **Extension** = legitimate deepening · **Boundary** = justified but must stay tethered.

| Feature | Persona | Committed need it serves | Classification | Verdict |
|---|---|---|---|---|
| Overview CPL + intake ring | Executive | Pillar 1, 3 | Core | ✅ The exec's home screen |
| Where the money leaked | Both | Pillar 1 (waste) | Core | ✅ Signature insight; funds the shortfall story |
| CPL by page ("dearest first") | Marketer | "what to change next" | Core | ✅ Points at headroom |
| Tests in flight | Marketer | Pillar 2 | Core | ✅ Stitches experiments to home |
| Pages list + detail (Performance) | Marketer | Pillar 1, 3 | Core | ✅ The chain reconciles |
| Templates + wizard + builder | Marketer | Pillar 2 | Core | ✅ Run tests without eng (see §4b) |
| Experiment Result lens | Marketer | Pillar 2, 4 | Core | ✅ Honest verdicts |
| Campaigns (Google vs Meta) | Executive | budget allocation | Core | ✅ but see gap §5.2 |
| Samurai AI | Both | act faster | Strategic bet | 🟡 In scope while grounded |
| **Friction hotspots (Overview)** | Marketer | "why + what next" | Extension | ✅ Tethered to pages/leaks |
| **Page Behavior view** | Marketer | "why is CPL high" | **Boundary** | 🟡 In scope — must stay tethered (see §4a) |
| **Experiment Behavior lens** | Marketer | "why did it move" | **Boundary** | 🟡 In scope — same tether |

Nothing is clearly **out** of scope. Two areas sit on the boundary and need a guardrail (§4).

---

## 4. Drift watch — the honest risks

### 4a. The Behavior lens has "product-analytics gravity"
Heatmaps, rage clicks, journeys, session replay are the toolkit of a **product/UX-analytics** product (Clarity, Hotjar, FullStory). That is a _different category_ from "marketing spend → enquiry efficiency." The pull to keep adding (retention cohorts, feature funnels, user-level analytics) is real and would quietly turn Samurai into a Clarity clone.

**Why it's still in scope today:** it is tethered to the core question — it explains **why a page's CPL is high** and gives the marketer the **what-to-change** ("the mobile form breaks → rage clicks → this is the ₹64,300 leak"). It honors the user's own rule — _kept a separate toggle, never mixed_ — and it **reconciles** (sessions = visits, funnel bottom = leads).

**Guardrail (keep this true):** every behavior view must trace back to **cost or leads**. If a proposed behavior feature can't finish the sentence _"…and this changes CPL / recovers a leak / is the next test,"_ it's out of scope.

### 4b. Builder customization is richer than the median marketer needs
The full-screen drag-drop dashboard builder is elegant but is a **power-user** surface. A marketer's real job is "pick a proven test and launch it." This stays in scope **only because** the pre-configured templates are the primary path (one click) and the custom builder is the escape hatch behind "New/Edit template." Risk = spending future effort polishing customization instead of the core analytics/recommendation.

### 4c. We've gone deep on *diagnose*, lighter on *decide/act*
The last several phases (behavior lens, richer experiment reports) all deepen the **analyst/diagnostic** side. The vision has two halves — _"which page is cheapest"_ (diagnose ✅) **and** _"what to change next"_ (recommend/act 🟡). The second half is thinner than the first. This is the most important strategic observation in this audit.

---

## 5. Gaps vs the vision (what the persona still needs)

### 5.1 A first-class "What to change next" spine — **highest priority**
The vision literally says _"…and what to change next,"_ but today the answer is **implicit** (dearest page, friction hotspot) and scattered. There is no single, ranked **Opportunities / Next best test** view that says: _"Test B.Com's mobile form next — biggest leak, easy fix, ~2 weeks to a verdict."_ Ranking by **impact × ease × confidence**, and **launching the test in one click**, would make Samurai prescriptive, not just descriptive. (Samurai AI touches this, but it isn't a durable, first-class surface.)

### 5.2 The Executive can see the budget decision but can't *act* on it
Campaigns shows Google ~2.4× cheaper than Meta, but there's no **"shift ₹X from Meta → Google → ~+Y leads at target CPL"** recommendation, and the **January 600** is a static ring with no **forecast** ("on track / need +N leads/week"). The executive persona has thinned relative to the marketer in recent phases.

### 5.3 The behavior → experiment loop isn't closed
A friction hotspot links to the Behavior view but **not** to _"launch a test to fix this friction."_ Closing that (behavior → templated test → result → behavior again) would make the whole product a single loop instead of parallel tools.

---

## 6. Reconciliation & persona-balance check

- **Reconciliation holds** after all additions: behavior sessions = page `visits`; the on-page funnel bottoms out at `leads` (MBA = 45); experiment behavior derives from the test's real `corr`/arms; friction JS-errors (122) = the page-health number. The "one owner per number" pillar survived the behavior phase. ✅
- **Persona balance has skewed** toward the marketer/analyst in the last 3 phases. The executive's decision surface (budget move, intake forecast) hasn't grown to match. ⚠️ Rebalance next.

---

## 7. Verdict & recommendations

**Verdict: on-strategy and in-scope — ~85–90%.** The spine (CPL efficiency + run/read tests + reconcile + honest) is intact and strong; nothing built is off-strategy. Two features sit on the scope boundary (behavior lens, builder depth) but are justified and, crucially, **tethered and reconciling**. The real issue is not drift-out but **imbalance**: we've built a superb *diagnostic* tool and under-built the *"what to do next"* and *executive action* halves of the vision.

**Do next, in order:**
1. **Build the "Next best test" / Opportunities spine** (ranked by impact × ease × confidence, one-click launch). This delivers the vision's second half and re-centres us on the core.
2. **Close the loop**: "launch a test from this friction hotspot / this expensive page."
3. **Rebalance for the executive**: an intake **forecast** and a **budget-reallocation** recommendation on Campaigns/Overview.
4. **Hold the behavior-lens guardrail** (§4a): only extend it where it ties back to cost/leads; do **not** add generic product analytics.
5. **Freeze builder customization depth** — templates are the main path; invest elsewhere.

**One-line summary:** _We haven't drifted out of scope — we've drifted deep into "diagnose" and left "decide what to do next" thin. Build the recommendation spine before adding more analysis._
