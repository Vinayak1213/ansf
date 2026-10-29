# Samurai strategy: VWO & Optimizely, and where we should go

**Date:** 2026-10-16 · **Method:** 8-agent deep-research workflow (Firecrawl scrape/map + Exa + WebSearch over official product/docs/pricing/methodology pages, G2/Gartner/Forrester, and company history). 6 research agents (VWO ×3, Optimizely ×3) → head-to-head comparison → Samurai strategy.

**The question:** *"Are we making Samurai similar to VWO/Optimizely? I want to eventually take it where Optimizely is."*

**The answer, in one line:** **No — don't clone them, and don't chase "where Optimizely is." Take the *direction* (a connected optimization loop on one reconciled data layer) but not the *destination* (an enterprise DXP). Win a different, winnable category: the revenue-reconciled, deterministic, outcome-first optimization console for the non-technical mid-market both incumbents walked away from.**

> **North star:** Every marketing rupee reconciles to the revenue it returned — and Samurai tells a non-technical marketer the one thing to fix next — without ever inventing a number.

---

## 1. The ladder (why "where Optimizely is" is a trap, not a roadmap)

There are three rungs, and the two companies reached their spots from **opposite ends**.

| Rung | What it is | Who's here |
|---|---|---|
| **1 — Point CRO / A-B tool** | A JS snippet + visual editor + stats readout. One job: did B beat A on this page. | Where both were born (VWO 2009, Optimizely 2010 @ $17/mo). Where most greenfield tools sit. |
| **2 — Full experimentation platform** | Testing becomes a *program*: server-side/feature flags, behaviour analytics (the "why"), personalization on shared audiences, a CDP/data layer, bandits, governance, a defensible stats engine. | **VWO sits at the top of this rung** and is broadening *within* it (AB Tasty merger, Wingz agents) — deliberately **not** adding a CMS/commerce. |
| **3 — Digital Experience Platform (DXP)** | Experimentation is *one module* inside the system that **creates, governs, personalizes and ships** experiences: CMS + commerce + CMP/DAM + warehouse analytics + real-time CDP + AI orchestration, under one identity + content API. | **Optimizely** — competing with Adobe & Salesforce. |

**The decisive twist:** Optimizely did **not** climb organically. In 2020 the Rung-1/2 testing company was **acquired** by a 1994 Swedish CMS (Episerver, Insight Partners, ~$600M), which bolted on its CMS/commerce and rebranded everything "Optimizely" (Jan 2021), then **bought the rest** — Zaius→CDP (2021), Welcome→CMP/DAM (2021), Netspring→warehouse analytics (2024). "One Optimizely" (Opti ID, Graph, Opal) is still a **migration-heavy, in-progress** stitching of those acquisitions.

→ **Reaching Rung 3 is an M&A-and-integration game, not a feature list.** For a self-serve product with a no-build-trap principle, it's the archetypal build-trap. VWO's mirror-image climb (organic up Rungs 1→2, then M&A for breadth *within* the optimization layer) is the reachable-by-building shape — and even that is a consolidation play, not a product roadmap.

---

## 2. VWO vs Optimizely — the head-to-head

Both are now **suites on a shared data layer**, but they occupy different categories and converge on nearly everything except that core.

**Where VWO wins:** accessibility & price (≈10× cheaper at entry, real free trial, PLG); ease-of-use for non-technical marketers (no-code editor, lightest anti-flicker tag, same-day go-live); Bayesian methodology legibility ("probability to beat / potential loss"); **qualitative behaviour fused to tests** (heatmaps, recordings, field-level form analytics, surveys, funnels inside experiment reports — Optimizely has *no* equivalent); one coherent built-not-bolted loop; open-source SDKs.

**Where Optimizely wins:** true DXP breadth (CMS/commerce/CMP/DAM/content); deepest enterprise experimentation (edge decisioning, two bandit objectives, mutual exclusion, can analyze *external* experiments); frequentist **always-valid Stats Engine** (peer-reviewed, *Operations Research* 2022; FDR control, CUPED, Epoch/Simpson's); **warehouse-native analytics** (runs on the customer's Snowflake/BigQuery); more mature predictive personalization & recommendations (ODP/Zaius); the most productized **agentic AI** (50+ agents, Virtual Teammates); analyst leadership (Gartner DXP Leader ×5).

**The stats fork (the deepest difference):** VWO = **Bayesian SmartStats** (cost-of-a-wrong-call / potential loss, intuitive). Optimizely = **frequentist sequential Stats Engine** (always-valid p-values so "peeking" is safe + FDR control, research pedigree). **But both now ship sequential testing, both offer multiple engines, both hide the math behind a marketer-friendly toggle.** The war has collapsed into "pick your engine."

**Convergence everywhere else:** shared CDP as connective tissue (Data360 / ODP); bundled loop as table-stakes; **the same agentic bet** ("vibe experimentation" / "Virtual Teammates" — understand→hypothesize→build→run→measure with holdouts & human-in-the-loop); both PE/debt-backed consolidators; both abandoned self-serve SMB → **pricing opacity is their shared weakness**.

### The single most decisive fact for Samurai
The **category's unanimous flagship is a statistics/confidence engine** — the *exact* feature we built, simplified, and then **removed entirely** because it overloaded non-technical marketers. **A product that will never ship the category's defining feature is, by definition, not "a VWO/Optimizely."** That's not a gap; it's the positioning.

---

## 3. Where Samurai actually plays

Samurai is **neither a CRO tool nor an attribution tool — it sits in the gap between them**, which is precisely why neither VWO/Optimizely (CRO) nor Triple Whale/HockeyStack/Dreamdata (attribution) occupies it.

- CRO tools **start from the page** ("did B beat A?"); revenue is an afterthought bolted on as a "revenue goal."
- Samurai **starts from the money**: spend → leads → qualified → enrolled → revenue → CAC → ROAS, every figure reconciling to the account total, across Overview, Pages, Campaigns, Experiments, Alerts and the AI — **one shared reconciliation model (`business.ts`)**, the way VWO has one shared *data* layer.

**Positioning line:** *"The one console that traces every marketing rupee to the revenue it returned — and tells a non-technical marketer what to fix next — without ever inventing a number."*

### The wedge (what neither does well)
1. **Blended, auditable spend→revenue with CAC/ROAS reconciling end-to-end** — incumbents leave this to a *separate* attribution tool; Samurai makes it the home screen.
2. **Outcome-first experiments** — each variant shows **projected revenue incl. CAC** (fewer leads but a bigger ticket can still win on money); neither ships this natively.
3. **Deterministic credibility instead of statistical credibility** — their flagship is a stats engine; ours is that *every number reconciles and is defensible to a CFO* — what a non-statistical marketer actually needs.
4. **Transparent, self-serve, cross-industry** onboarding/pricing — the research explicitly names pricing opacity and the abandoned non-technical mid-market as "left open by both."

### The moat (in order of defensibility)
1. **The reconciliation invariant** — "everything ties to the account total" is an architectural discipline, not a feature; each new surface inherits trust for free. A competitor who bolted revenue onto a test engine can't retrofit it without re-architecting.
2. **Trust/auditability as the switching cost** — nothing fabricated, every figure drillable via Investigate; a black-box competitor structurally can't claim that.
3. **Grounded AI** (the model *phrases*, never *computes*) — as the category stampedes toward autonomous "vibe experimentation" and buyers hit hallucination / "POC purgatory," an AI that *can't* invent a number becomes the trust differentiator.
4. **Cross-industry deterministic benchmarks** (longer-term network effect) — "your CPL/CAC vs similar accounts" is something no single-tenant enterprise DXP can match. Only once real multi-tenant data exists; never fabricated.

---

## 4. The roadmap — climbing a *winnable* ladder

Take VWO's **Rung 2 done exceptionally** as the destination (a connected optimization loop), implemented the deterministic/reconciling way. Use VWO as the ease-of-use reference and **Optimizely as the complexity ceiling to stay below.**

| Stage | Goal | Key moves |
|---|---|---|
| **0 — Harden (now)** | One coherent, fully-reconciling console; zero half-built surfaces. | Delete dead weight (`EnrollmentStudio`+`outcome.ts`, `Decisions`+`decisions.ts`); promote **Behaviour** to a first-class nav surface; ship the two pending honest stitches (Smart Alerts form-field rule + per-variant form funnel); re-audit reconciliation. |
| **1 — Productise the wedge (real data)** | Make reconciled economics the undeniable reason to use Samurai. | Read-only **live connectors** (Google Ads, Meta, CRM/AMS) feeding spend/leads/close-rate/ticket so the chain is live not seeded; per-segment close-rate & ticket as **labelled inputs** (degrade to default when sparse); a one-screen **CFO-ready money reconciliation**; keep "what your ad spend returned" as the default home. |
| **2 — Behaviour-capture foundation** | Replace the mocked substrate with a real event stream; fuse behaviour to the reconciled outcome. | rrweb tag + consent/DPDP masking + ingestion (per `BEHAVIOUR-CAPTURE-TAG-SPEC.md`; copy VWO's anti-flicker SmartCode discipline); read-only per-session CRM outcome join (Converter vs Non + **behaviour next to the revenue it drove**); turn heatmaps/journey/form-analytics/replay from synthesised → captured. |
| **3 — Deterministic signals + personalization-lite** *(unlocked, not before)* | Turn the real stream into transparent, named, auditable signals. | **One** weighted-signal→score→named-tier engine (two surfaces: page-facing & CRM-facing — "never build twice"); feed the tier back as a deterministic, rule-based audience; plain tier label by default, rigor behind a "show the numbers" toggle. *(This is the 27%-gated Intent item — permitted only after Stage 2 is real.)* |
| **4 — Program depth + multi-tenant** | Own the category via depth & trust in **one** loop — the honest "where Optimizely is." | Cross-tenant deterministic **benchmarks** (only on real multi-tenant data); a reconciled, auditable exec/program digest; roles/approvals/governance; broader connectors; a lightweight server-side/feature-flag capability **only if customers pull AND it reconciles — otherwise skip.** |

---

## 5. Copy ✅ / Skip ❌ / Risks ⚠

**Copy the pattern, not the feature:**
- **Hide depth behind a toggle** (both do it for stats) — but *your* depth is reconciliation detail + Investigate drills, not p-values. (This is already our progressive-disclosure principle.)
- **Behaviour fused to the result** (Control vs Variation, Converters vs Non) — and extend it one step past VWO: put the "why" beside the **revenue** it drove.
- **One data layer / "define once, use everywhere"** — `business.ts` + the tenant lexicon is our version; keep every new surface strictly on it.
- **Accessible, self-serve, transparent pricing with a real trial** — own the non-technical mid-market both abandoned.
- **"Credibility is the product"** — but implement credibility as *reconciliation + auditability*, not a statistics engine.
- **SmartCode engineering discipline** (lightest async, no flicker) for the Stage-2 tag.
- **Honest guardrails** (SRM/outlier checks; Optimizely's "refuse to declare on stale evidence") — copy the *spirit*: always degrade to "insufficient signal," never overstate.

**Skip (and why it's a positive choice):**
- ❌ **A statistics/confidence engine** — the category flagship; already built, simplified, rejected. Skipping it *is* the clearest "we are not a VWO/Optimizely."
- ❌ **A full DXP / Rung 3** (CMS, commerce, CMP/DAM) — an M&A assembly + 5-yr integration tax. The archetypal build-trap.
- ❌ **Warehouse-native analytics** (Netspring) — needs a data-mature customer + cloud warehouse; the opposite of non-technical self-serve.
- ❌ **Agentic "autonomous experimentation"** (Wingz/Opal) — where hallucination risk is worst; our grounded-AI is the trust wedge *because* we refuse this.
- ❌ **AI intent-scoring / predictive personalization on mocked/sparse data** — gated at 27%; only the deterministic version, only after Stage 2.
- ❌ **MVT & multi-armed bandits** — need high traffic; complexity with no payoff for a non-technical mid-market tool.
- ❌ **Fabricated distributions** (ticket tiers/buckets) — already removed; model only the labelled average, sync real per-student tickets from the AMS.
- ❌ **Opaque, quote-only pricing** — the incumbents' shared weakness; staying transparent *is* the GTM wedge.

**Risks (watch these):**
- ⚠ **Attribution is hard and political** — reconciliation depends on CRM/AMS join quality + close-rate/ticket accuracy. *One wrong CFO-facing number destroys the trust moat that is the whole thesis.* Mitigate: degrade to "insufficient signal," always show labelled inputs, never a blended black-box figure. **This is the existential risk** — trust *is* the moat.
- ⚠ **"No stats engine" can read as "less rigorous"** in enterprise bake-offs. Mitigate: reframe rigor as reconciliation + auditability; accept it caps reach into formal enterprise experimentation.
- ⚠ **Category ambiguity** (straddling CRO & attribution) can mean "neither." Mitigate: lead unambiguously with the reconciled-outcome console; experiments & behaviour are supporting acts.
- ⚠ **The mocked-substrate ceiling** — advanced surfaces can't be real until Stage 2; never ship behaviour-scoring on the mock.
- ⚠ **The owner's own ambition** ("take it where Optimizely is") pulling toward breadth (CMS, bandits, agents) is the biggest *internal* risk. Mitigate: hold the staged roadmap + the 98% gate; every new surface must reconcile and run on real data before it ships.
