# Samurai — agentic strategy, segment declaration & market verdict

**Status:** research + decision brief for review (no code changed)
**Method:** 8-agent workflow — internal audit of prior docs/code + firecrawl research (competitor scan, market sizing, persona/revenue mechanics) → decisive synthesis → 3 adversarial lenses (market reality, differentiation, focus/honesty). All three lenses returned *needs-change* and converged; their fixes are folded in below.
**Triggered by:** Sagepilot's "AI Marketer" launch.

---

## 0. The declaration (what to commit to)

> **Segment:** the **non-technical, mid-market, LEAD-GEN / considered-purchase operator** — where revenue is a **CRM close realised offline and later**, not a cart. Industry-agnostic via the tenant lexicon (B2B services, financial services, home services, healthcare, auto, high-ticket DTC-*with-a-sales-step*, education). **Not** transactional DTC/ecommerce. **Not** ed-tech-only.
>
> **Beachhead (prove on real data first):** **one** vertical — **B2B services or financial services** — where the lead-to-close gap is widest, the CFO asks "what did spend return," and the Sagepilot collision is zero. Education/JAIN stays the **populated flagship demo**, not necessarily the first paying beachhead.
>
> **Persona:** the **one operator who owns both the acquisition budget and the on-page conversion number.** Marketing and CRO collapse into one buyer, tied by one reconciled number. *(Load-bearing assumption — validate before betting GTM on it; see §7.)*
>
> **What Samurai becomes:** the **reconciled-outcome copilot for lead-gen marketers** — an always-on agent that watches every rupee of spend through to the CRM close, **proposes** the next revenue-recovering move, **proves it with a holdout**, and refuses to act on any number it can't reconcile.
>
> **Market-facing line:** *"The only marketing agent that proves the lift with a holdout, on reconciled revenue."* (Determinism is the *how*, not the headline.)

The rest of this doc is why, and the four things that must change before this is safe to declare externally.

---

## 1. Sagepilot is the mirror image, not the threat

Sagepilot is **DTC/ecommerce retention** (India-first; customers are Wakefit, Sugar, Plum, Yogabar…). Its "AI Marketer" is one agent in an "AI employees" suite that works the **bottom of the funnel**: lapsed customers, abandoned carts, replenishment windows → writes brand-voice copy → sends across WhatsApp/email/SMS/push → "reports in revenue tied to actual Shopify orders," holdout-aware.

It reconciles to revenue **the easy way** — a Shopify order is an instant, deterministic event. It messages **people** (PII, owned channels). It's **black-box generation** with human approval.

| | **Sagepilot** | **Samurai** |
|---|---|---|
| Funnel | Bottom/back — retention, repeat orders, LTV | Top/front — paid acquisition, landing-page CRO |
| Revenue proof | Shopify **order** (instant, easy) | CRM **close** (later, offline — hard & defensible) |
| Data | Customer **PII**, messages people | **Anonymous** behaviour stitched to a CRM ref, no PII |
| Market | DTC ecommerce | Multi-industry considered-purchase lead-gen |
| AI | Black-box copy/offer gen | Deterministic — phrases, doesn't fabricate |

**Verdict:** Sagepilot *cannot cheaply enter our lane* (no order event = no easy revenue proof; PII-messaging is a different product). Its launch validates the **narrative** — "revenue-reconciled" is becoming table-stakes language — **not the feature set.** The response is **not** to copy its send-engine (DTC lifecycle is crowded: Klaviyo, Bloomreach, Sagepilot). It's to claim the half it structurally can't: *"Sagepilot proves it where revenue is a Shopify order; Samurai does it where revenue is a CRM close — without inventing a number."*

---

## 2. Market verdict — split, and the framing decides it

**NO** as "another CRO / A-B testing tool.** That core is only **~$1.2–4B (2025), ~10% CAGR, and consolidating** (VWO+AB Tasty merging; Hotjar folded into Contentsquare). No venture escape velocity — this confirms our own "don't clone VWO/Optimizely" warning.

**YES, conditionally,** as **AI-marketing-with-deterministic-trust** occupying the reconciled-outcome gap:
- Ride the **AI-in-marketing** vector: **$27B (2025) → $195B (2033), 27.6% CAGR** (the cleanest marketing-specific AI number; corroborated by "AI for sales & marketing" ~33% and "GenAI in marketing" ~34%).
- Anchor the credible half on **marketing attribution: ~$5B (2025), ~14% CAGR** — the **tightest analyst consensus of any segment** (4 independent houses agree), and the "reconcile-to-revenue" half of our wedge.
- The **SMB/mid-market tier is the fastest-growing cohort** in marketing automation (~17%) and personalization (~16%) — exactly the buyer both CRO incumbents abandoned.

### ⚠ The honest correction (market lens)
The "~$7–10B serviceable wedge" in the first synthesis is **two full category TAMs summed across all vendors and segments — that is not a SAM.** Honest bottom-up (winnable non-technical mid-market lead-gen accounts × realistic ACV) lands **roughly an order of magnitude lower** — low hundreds of millions to low single-digit billions. Treat the big numbers as **macro backdrop only** and **validate the serviceable number bottom-up (accounts × ACV) before any revenue plan.** Analyst TAMs here diverge up to ~8× and contain obvious scope errors (a $507B "personalization" figure; QA-testing numbers mislabelled as A/B) — order-of-magnitude framing, nothing more.

Two traps the numbers expose: **(a)** anchoring on pure CRO (too small, too slow); **(b)** chasing broad "agentic AI" hype (~40% CAGR but cross-industry, *unsized for marketing*, and maximally hallucination-prone — the opposite of our brand).

---

## 3. The moat — reframed (this is the most important change)

The first synthesis staked defensibility on the **reconciliation invariant.** The differentiation lens correctly broke that: **reconciling spend → CRM close on live connectors is the *attribution* category's existing core competency.** Dreamdata and HockeyStack already do it, on real data, for this exact lead-gen buyer — and they own the expensive half (live ad+CRM connectors, identity resolution, real close-rate/ticket from finance) that **Samurai has *not* built** (today `CLOSE_RATE` is the constant `0.34`; `TICKET` is hardcoded; connectors are labels; the invariant reconciles only to seeded mock data). "Propose + prove" is a roadmap item they could bolt on in one release.

**So the moat is not reconciliation. It is the closed loop attribution structurally lacks:**

> **ACT + PROVE on the same reconciled substrate** — diagnose → propose a page/spend change → **measure the holdout-proven reconciled lift** — as one motion. Attribution tools *have no page experiment*, so they cannot screenshot a holdout-proven reconciled-lift result. **That artifact is the wedge**, not the invariant.

To make it a wall and not a slogan: **ship one holdout-measured, reconciled-lift result on one real live-connector account before any external positioning.** The genuine moat (integrated loop + accumulated trust + eventual cross-tenant benchmarks) is real but a **window, not a wall** — a funded incumbent on either side can compress it, so speed to that first proof matters.

---

## 4. The agentic vision — "prove-what-you-propose," not "generate-and-send"

Everyone else's agent is a **doer on the execution side** (writes copy, builds journeys, sends messages) — crowded and hallucination-prone. Samurai's agent is a **deterministic optimization copilot** running the same loop language as Opal/Wingz (understand → **propose** → human approves → execute → measure the **reconciled** outcome → learn), but every step inspectable. The shipped **Smart Alerts** engine (`src/data/alerts.ts`) is already the always-on, auditable **spine**; the "builds the case, you make the call" `ApprovalDialog` (`src/ai/engine.ts`) is the scaffold to generalise.

**Four agents, each grounded in a signal we already hold, human-in-the-loop for anything irreversible/outward:**

1. **Spend Steward** — dead-spend rule + LEAKS model + platform CPL (Meta ~2.4× Google). Proposes pause/reallocate; **human approves every money move.**
2. **Page & Test Agent** — dearest-page CPL + killer form field + converter-lift + experiment verdicts. Drafts the next test copying a proven winner; calls losers; ships winners. **Human approves ship/kill.**
3. **Lead Rescuer** — cooling CRM-stitched leads + form abandoners (pure recency/stage logic, no score). The acquisition-side mirror of Sagepilot's "no intent signal missed," done the lead-gen way: a **CRM deep-link**, never an autonomous PII send.
4. **Reconciler** — the governance spine: ranks proposals by projected reconciled revenue/CAC, composes the exec digest, and emits **"insufficient signal" as a first-class output.**

### ⚠ The honesty boundary that makes this safe (focus lens — the sharpest catch)
The prose "the agent never computes a number" is **false as written**: `bizFromLeads` computes `enrolled = qualified × CLOSE_RATE(0.34)` and the reallocate pitch assumes marginal CPL = average CPL. **Every revenue *projection* is a modeled number on a non-reconciled assumption — the exact black box the 98% gate forbids.** This traps the thesis in a vise: honor the gate strictly and the four agents collapse into a **rebrand of Smart Alerts**; relax it and the first CFO who recalculates "+Y leads," finds a `0.34` guess underneath, **detonates the trust moat.**

**Resolution — make the fact/projection split constitutional, in engine *and* UI:**
- **Classify every figure: RECONCILED** (ties to account totals, Investigate-drillable) **vs ESTIMATE** (anything forward-looking or constant-derived). Estimates render in a visually distinct lower-trust register, carry their assumption inline (*"assumes current CPL holds at higher spend — marginal CPL usually rises"*), are framed only as a **hypothesis the holdout will test**, and are **never** the headline or co-registered with reconciled numbers.
- **Rank proposals by the reconcilable recovered amount first** (dead spend / confirmed bleed already tie to real totals); projections only *order the headroom*, so the first number a CFO sees always reconciles.
- **Gate every revenue-projection claim behind per-segment close-rate/ticket from the tenant's own CRM/finance** — retire the single `CLOSE_RATE = 0.34`.
- **Rename the north star from "propose-and-prove" to "prove-what-you-propose":** the holdout, not the projection, is the product.

---

## 5. How we bring revenue — honestly

We do **not** invent new revenue. We **recover demand already bought, reallocate to a cheaper true CAC, and prove incremental lift with a control:**
1. **Recover leaked spend, then re-feed the funnel** — provably dead campaigns / broken forms freed and redeployed (reconciles *today*).
2. **Reallocate to a lower *true* CAC** — "shift ₹X → +Y leads" at the reconciled CAC, trustworthy because it reconciles to the real downstream outcome, not an ad platform's self-reported conversions. *(Projection — renders as ESTIMATE per §4.)*
3. **Rescue paid-for demand going cold** — cooling leads + abandoners via a CRM deep-link, no PII. The acquisition-side mirror of Sagepilot's retention revenue; the clearest proven money-maker in the set.
4. **Drive down blended CPL with headroom tests** — the agent drafts, the human ships, the **holdout proves** the lift.
5. **Prioritise by projected revenue/CAC, not CPL alone** — a bigger-ticket programme justifies a higher CAC.

This is defensible to a CFO exactly as the market hits the measurement wall (51% can't measure AI ROI; Gartner expects 40%+ of agentic projects cancelled by 2027). It depends on per-segment close-rate/ticket coming from **real finance/CRM** — today's `CLOSE_RATE=0.34` and per-programme `TICKET` are single constants, a **Stage-1 prerequisite** before any revenue claim goes CFO-grade.

---

## 6. What we are NOT (anti-scope — guards the build-trap)
- **Not** an autonomous "AI marketer" that plans the month and sells on every channel (Sagepilot/Opal lane — crowded, hallucination-prone, PII messaging we refuse).
- **Not** a creative/content generator sold as a revenue driver (AdCreative/Omneky/Coframe — creation is an *input* to a measured test).
- **Not** a DXP/CMS/commerce suite (the Optimizely M&A/integration build-trap).
- **Not** a transactional DTC/ecommerce lifecycle & retention tool (Shopify/Triple Whale/Sagepilot own it).
- **Not** a black-box intent/propensity/"revenue-found" score (the 6sense lane — the thing we deferred at 27% groundable).
- **Not** a statistics / warehouse-native analytics engine (already skip-listed; a Stats Engine was built and removed).
- **Not** a PII messaging engine (anonymous behaviour, CRM deep-link out, never store/message the person).
- **Not** an agent acting on seeded or modelled signal — only on reconciled, measured data.

---

## 7. The fork to resolve *before* declaring externally (market lens — the sharpest risk)

**You cannot be both self-serve-PLG-at-CRO-prices *and* CFO-grade reconciliation.** Self-serve CRO tools cluster at **$29–$700/mo (~$0.4–8k/yr ACV)**; the reconciliation peers Samurai actually resembles — **HockeyStack ($20k–$200k, demo-only), Dreamdata (demo-only)** — are **sales-led at 10–50× that ACV**, *precisely because* reconciliation-grade spend→CRM→close-rate integration (+ a capture tag + finance close-rate/ticket) **cannot be onboarded self-serve by a non-technical marketer.** The free trial can light up the *spend* side; it **cannot demonstrate the moat** (the CRM reconciliation) without integration + finance data + IT.

**Recommendation:** **land-via-trial, expand-via-sales hybrid at attribution-grade ACV (~$12–40k/yr).** The free trial is a **top-of-funnel lead source, not the monetization model.** And **promote the performance/CRO agency from "secondary" to a primary multiplier** — one reconciled, client-defensible seat multiplies across many lead-gen accounts, at higher ACV and stickier than self-serve direct.

**Prove willingness-to-pay cheaply first:** 10–15 **paid** design-partner contracts at a real price (≥ $12k/yr) on real connector data (Stage 1: Spend Steward + Reconciler). If mid-market operators/agencies won't sign for reconciled spend→CRM outcomes, the market thesis is **falsified cheaply**; if they will, the agentic layer is a justified expansion, **not the opening bet.**

---

## 8. Sequencing & non-negotiable prerequisites
- **Stage 1 (real data):** read-only Google Ads/Meta/CRM connectors replace the labels → ship **Spend Steward + Reconciler** on already-reconciled data. Land the first **holdout-proven reconciled-lift artifact** here.
- **Stage 2 (gated):** **Page & Test Agent + Lead Rescuer** depend on *measured* behaviour → gated behind the capture tag (rrweb + DPDP masking) + CRM-sync. Shipping them on today's seeded/modelled behaviour would **itself break the 98% gate.**
- **Delete the live fabrication first (all three lenses flagged it):** `expBehavior()` in `src/data/behavior.ts` force-sets the winning arm's sessions to `converted: true` — a manufactured outcome. For a product whose *only* durable differentiation is trust, one fake number in shipped code is the thesis-ender. Fix is already specced in `docs/EXPERIMENT-SESSION-REPLAY-PLAN.md`. **Non-negotiable, before any agent surfaces per-arm evidence.**
- **Retire `CLOSE_RATE = 0.34` and hardcoded `TICKET`** in favour of per-segment values from the tenant's finance/CRM before any revenue projection goes CFO-grade.

---

## 9. Gaps in prior research — now resolved
- **Segment undeclared** (three docs pulled three ways: mid-market horizontal / ed-tech-vertical / industry-agnostic) → **declared** (§0): non-technical mid-market lead-gen, industry-agnostic, one beachhead vertical to prove first.
- **Every prior doc *refused* the agentic direction** (named the owner's agent ambition "the biggest internal risk") → **reconciled**: not autonomous black-box agency but a deterministic *propose-and-prove* copilot on the Smart Alerts spine; it *extends* the existing engine, it doesn't break the brand.
- **No revenue thesis** → provided (§5): recover / reallocate / prove — the acquisition-side mirror of Sagepilot's retention revenue.
- **No market sizing anywhere** → provided + stress-tested (§2), with the honest "SAM ≠ summed TAMs" correction.
- **Marketing vs CRO never cleanly separated** (committed two, then hid them) → **collapsed** to one operator; drop the "hide two personas" posture — *if* the single-owner buyer validates (§7).

---

## 10. Open questions to close before build
1. **Beachhead vertical:** B2B services vs financial services vs stay-on-education — which do we prove the acquisition agent on first (sharp lead-to-close gap, CFO scrutiny, zero Sagepilot collision)?
2. **Single-owner buyer:** run 5–10 interviews in the chosen beachhead to confirm one person owns budget *and* the page. If it's two, lead with the **budget owner** + CRO as the proof mechanism — don't straddle.
3. **GTM motion & price:** commit to land-via-trial / expand-via-sales at ~$12–40k/yr, and decide whether the **agency** is the day-one primary multiplier.
4. **Execution substrate:** build real two-way connector write-back (the actual "act"), or ship "agent proposes, human executes in-tool" as the on-brand interim?
5. **Autonomy line:** may the Spend Steward auto-pause a *provably dead* campaign (reversible), or always propose? Write the "irreversible/outward = human approves" boundary down precisely.
6. **External line:** is *"the only tool that proves the lift with a holdout on reconciled revenue"* the market-facing answer to Sagepilot's "AI Marketer," or do we need something punchier?

---

## Appendix A — market data (order-of-magnitude; validate bottom-up)

| Segment | Size (2025) | CAGR | Read |
|---|---|---|---|
| CRO software (core) | ~$1.7–3.8B (spread $1.2–10.4B) | ~10–12% | Small, slow, **consolidating** — do not anchor here |
| A/B testing sub-segment | ~$1.2–2.2B | ~10.7% | Tiny; exclude QA-"testing" numbers |
| Behaviour analytics (in CRO) | est. >$4B | ~22% | Fastest *within* CRO; maps to our intent layer |
| Marketing automation | ~$5–10B (cluster ~$7B) | ~10–15% | **SME cohort fastest ~17%** |
| Marketing **attribution** | **~$5B** | **~14%** | **Tightest consensus**; our loop-closer half |
| **AI in marketing** | **$27B → $195B (2033)** | **27.6%** | **The growth vector to ride** |
| Agentic AI (cross-industry) | ~$5–12B → ~$140–206B | ~40–44% | Fast but **unsized for marketing**, hype-laden — do *not* anchor |
| Total martech | ~$175–200B+ | ~11–20% | Macro backdrop only |

**Sources (selected):** Grand View (AI-in-marketing; attribution; CRO), Fortune Business Insights (martech; attribution; marketing automation; agentic), MarketsandMarkets (AI for sales & marketing; martech; agentic), Precedence/Mordor (SME cohort), Gartner (40% agentic cancellations by 2027). Full source list in the workflow output. *Supply-side analyst TAMs diverge up to ~8×; order-of-magnitude only.*

## Appendix B — competitor map (the split nobody rejoins)
- **Sagepilot** — DTC retention agent (Shopify order). *Mirror image; can't enter our lane.*
- **Coframe** — growth/CRO page agent; auto-writes & ships copy toward CR-lift (the autonomy we refuse).
- **Optimizely Opal / Wingify Wingz** — enterprise DXP "autonomous" agents, "every action logged." *We go further than logging (constitutionally can't act on an unreconciled number) — but don't chase the DXP.*
- **AdCreative / Omneky** — creative generation (an *input*, not a revenue claim).
- **6sense / Mutiny / Clay** — demand-gen/ABM targeting; black-box intent scores being abandoned (teams switching 6sense→Clay for auditable data — the same trust shift, one rung down).
- **Dreamdata / HockeyStack** — closest to our *reconciliation spirit* (tie to CRM revenue) but **stop at attribution**: no page experiment, no holdout proof. *The real incumbent to out-run — see §3.*
