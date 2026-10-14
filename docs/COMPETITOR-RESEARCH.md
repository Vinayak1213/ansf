# Samurai — Competitive Intelligence Report

**Prepared:** 11 Oct 2026
**Scope:** What's *proven in the market* across the tools adjacent to Samurai — their best features, the features users love most (by real reviews), their USP, and the fit to our buyer — so we build on validated patterns, not guesses.
**Method:** Exa Agent (48 web searches, multi-source synthesis) + Firecrawl (primary-source scrapes of vendor pages and G2 category grids). Evidence drawn from **G2, Capterra, TrustRadius** and vendor sites. Review counts/pricing are snapshots as of Oct 2026 and move over time.
**Confidence:** High-confidence, best-effort discovery — **not exhaustive**. Coverage is strongest in CRO/experimentation, behaviour analytics and landing pages; lighter in pure attribution.

---

## 1. Executive summary — the 7 things to know

1. **"Ease of use" is the single most-loved attribute in the entire category.** On G2 it is the #1 most-mentioned pro for VWO, AB Tasty, Statsig, Omniconvert, PostHog and almost every tool reviewed. No-code, non-technical, fast setup is the proven buying driver — more than depth of features.
2. **The market is converging on "connected experimentation + behaviour."** VWO already bundles A/B testing *with* heatmaps/recordings; Contentsquare bundles behaviour with journey analytics. Samurai's "experiment + behaviour in one console" is a validated direction, not a novelty.
3. **Basic heatmaps & session replay are now a commodity.** Microsoft Clarity is **free forever** (2M+ sites, no traffic limits) and Contentsquare now offers a free tier up to 200k sessions/mo. So replay/heatmaps alone are **not a moat** — the moat is what you *do* with them (scoring, experiments, economics).
4. **The hardest, least-solved problem is closing the loop to revenue.** For long-cycle lead-gen, the proven need is connecting enquiry → CRM-qualified lead → call → **enrolment/revenue** — not just cheap form fills. Only attribution specialists (Ruler, Dreamdata, HockeyStack) touch this, and none of them also run the page experiments or behaviour.
5. **No competitor owns Samurai's full loop.** Ad spend → landing-page experiment → behaviour diagnosis → lead/behaviour scoring → **CRM-verified enrolment outcome**, reconciled to **cost-per-admission**, tailored to ed-tech. CRO tools stop at conversion; behaviour tools stop at "why"; attribution tools stop at pipeline. **That gap is Samurai's position.**
6. **Two entry-pricing models win self-serve:** attainable fixed tiers ($29–$249/mo — Unbounce, Leadpages, Hotjar) and free/usage-based entry (Clarity, PostHog, Dreamdata, Amplitude). Advanced CRO/attribution is overwhelmingly **quote-led** (Optimizely, AB Tasty, Contentsquare, HockeyStack) — a friction point we can beat with transparent, self-serve pricing.
7. **Live market moves to track:** **VWO and AB Tasty announced a merger** (subject to closing); **Hotjar has been folded into Contentsquare**. Consolidation at the top end is active.

---

## 2. The landscape at a glance (18 players, 5 segments)

| Company | Segment | Rating (reviews) | Flagship feature | Most-loved (per reviews) | Entry price | Persona fit |
|---|---|---|---|---|---|---|
| **VWO** | A/B & CRO | 4.4 (929 G2) | Visual A/B + MVT, *with* heatmaps/recordings | Ease of setting up & running tests | Quote; free trial | **High** |
| **Optimizely** | A/B & CRO | 4.2 (843 G2); 8.7/10 (599 TR) | Stats Engine (rigorous experimentation) | No-code visual editor | Quote only | High (enterprise) |
| **AB Tasty** | A/B & CRO | 4.4 (400+ G2) | WYSIWYG editor + pre-built widgets | Responsive support | Quote (~€15k/yr 3rd-party) | High |
| **Convert** | A/B & CRO | 4.6 (98 G2) | Full-stack (web + server) testing | Support + ease of setup | ~$399/mo (100k MTU) | High |
| **Kameleoon** | A/B & CRO | 4.6 (125 G2); 4.9 (8 Capterra) | AI/prompt-based tests + deep targeting | Granular targeting & personalization | ~$495/mo Starter | Medium |
| **Unbounce** | Landing pages | 4.2 (2,207 G2) | **Smart Traffic** (AI routes visitors to best variant) | Drag-and-drop builder | $29–$249/mo | **High** |
| **Instapage** | Landing pages | 4.3 (508 G2) | **AdMap** — ad group → dedicated page, personalization | No-code visual builder | $79–$159/mo+ | High (funded) |
| **Leadpages** | Landing pages | 4.5 (302 Capterra) | Unlimited-traffic pages + built-in A/B | Template-driven, <5-min pages | $29–$399/mo | High (SMB) |
| **Hotjar** | Behaviour | 4.3 (309 G2); 4.6 (545 Capterra) | Heatmaps + session recordings + surveys | Heatmaps & recordings | Free; paid ~$39/mo | **High** |
| **Microsoft Clarity** | Behaviour | 4.5 (51 G2); 4.8 (56 Capterra) | Recordings + heatmaps + friction + AI summaries | **Free** heatmaps & recordings | **$0 forever** | **High** |
| **Contentsquare** | Behaviour | 4.7 (456 G2); 4.8 (124 Capterra) | Zone-based heatmaps + journey analysis | Zoning analysis of page elements | Quote; free ≤200k sess. | Medium |
| **FullStory** | Behaviour | 4.5 (788 G2); 9.1/10 (158 TR) | Tagless autocapture + searchable replay | Searchable session replay | Quote | Medium |
| **HockeyStack** | Attribution | 4.7 (27 Capterra) | Multi-touch attribution (9 models) + Odin AI | Self-serve performance dashboards | Quote (~$599/mo) | Medium |
| **Triple Whale** | Attribution | 4.2 (92 Shopify) | Triple Pixel first-party attribution + profit/ROAS | Consolidated ad dashboards | Free → GMV-based | **Low** (ecommerce) |
| **Ruler Analytics** | Attribution | 3.7 (3 Capterra) | Closed-loop lead+revenue attribution incl. **calls** | Matching paid clicks to forms **AND** calls | ~$400/mo | **High** |
| **Dreamdata** | Attribution | 4.8 (55 Capterra) | B2B full-funnel multi-touch revenue attribution | Unified full-funnel reports for budgeting | Free $0; ~$750/mo | **High** |
| **PostHog** | Product analytics | 4.5 (1,052 G2) | Analytics + replay + flags/experiments in one | Replay connected to funnels/analytics | Usage-based; free tier | Medium |
| **Amplitude** | Product analytics | 4.5 (2,950 G2) | Behavioural cohorts + funnel/retention + experiments | Self-service funnel & cohort analysis | Free 2M events; then PAYG | Medium |

> Note: G2's "A/B testing" and "landing-page builder" categories are **polluted with feature-flag tools (LaunchDarkly, Statsig, Harness) and marketing suites (HubSpot, Mailchimp, Salesforce, Brevo)** — a sign the "pure CRO/landing" category is smaller than it looks, and that buyers often reach these jobs from inside a bigger suite.

---

## 3. What's PROVEN in the market (build on these)

These are the patterns validated across multiple vendors and corroborated by user reviews — the baseline a serious tool in this space is expected to cover.

1. **No-dev page creation + quick variant publishing is table stakes.** Marketers expect to build and split-test campaign pages without engineering (Unbounce, Instapage, Leadpages). *Proven by:* drag-and-drop builder being the single most-loved feature of every landing tool.
2. **A/B / MVT must measure real conversion outcomes, not pageviews** — with a visual editor, audience targeting and clear experiment reporting (VWO, Optimizely, AB Tasty, Convert, Kameleoon).
3. **Ad-to-page message match + campaign segmentation works.** Instapage's AdMap (ad group → dedicated page) and Unbounce's Smart Traffic (AI variant routing) are flagship, loved features — proof that *matching the page to the ad* is a proven lever.
4. **Heatmaps, scroll/click maps and session replay are mainstream diagnostics** for ignored CTAs, form abandonment and mobile friction (Hotjar, Clarity, Contentsquare, FullStory). Expected, not differentiating.
5. **Quant + qual together explains *why* a variant wins or loses.** Pairing funnel/drop-off numbers with replays is increasingly built-in (VWO, Contentsquare, PostHog). Contentsquare reviewers explicitly use zoning+replay to "generate and diagnose A/B-test ideas."
6. **Cross-channel cost + conversion must be unified** for spend decisions — don't trust a single ad platform's self-reported numbers (HockeyStack, Triple Whale, Dreamdata).
7. **For long-cycle lead-gen, connect enquiry → CRM-qualified lead → calls → revenue/enrolment** — not just cheap form fills. This is the hardest, highest-value job (Ruler, Dreamdata, HockeyStack). Ruler's most-loved capability is literally *matching paid clicks to both forms and phone-call leads.*
8. **Self-service + attainable entry pricing is competitively important.** Free or usage-based entry exists (Clarity $0, PostHog, Amplitude 2M events free, Dreamdata free) — while advanced CRO/attribution hides behind "contact sales," which users and small teams dislike.
9. **Event-based funnels + cohorts reveal post-lead activation and retention** (PostHog, Amplitude) — complementary to paid-media attribution, not a replacement.
10. **Above all: ease of use beats feature depth.** The meta-signal across every G2 profile — the thing reviewers praise most and the thing that wins switchers.

---

## 4. Segment deep-dives

### 4.1 A/B testing & CRO — *the core category*
- **VWO** is the closest analogue to Samurai: it explicitly markets itself as "connected experimentation **and** behavioural insights" (testing + heatmaps + recordings in one). Loved for straightforward visual setup after a single tag install; knocked for a visual editor that gets "slow/glitchy on complex pages." Seller-level **1,571 reviews, 4.3★**. *Takeaway: our experiment+behaviour pairing is validated — and the editor is a known weak point we can beat.*
- **Optimizely** owns the rigorous/enterprise end (Stats Engine) but is fully **quote-gated**, which pushes smaller teams away.
- **AB Tasty** = marketer-friendly WYSIWYG + widgets + personalization; loved for **support**, not a single feature. **Merging with VWO.**
- **Convert** differentiates on **privacy + transparent MTU pricing** ($399/mo published) + full-stack testing — the transparency is itself a selling point reviewers cite.
- **Kameleoon** leans into **AI/prompt-based test creation + deep targeting** (30+ targeting criteria praised) — a signal that AI-assisted experiment creation is an emerging, valued direction.

### 4.2 Landing-page optimization
- **Unbounce** — flagship **Smart Traffic** (AI auto-routes visitors to the variant most likely to convert *for them*); 15,000+ customers, 2,207 G2 reviews. Loved for the builder. Pricing is clean and self-serve ($29–$249). *Smart Traffic ≈ a proven, lightweight form of personalization worth studying.*
- **Instapage** — **AdMap** (connect ad groups to dedicated, personalized post-click pages) is the standout; enterprise-leaning ($79–$159+/mo).
- **Leadpages** — the accessible SMB option: **unlimited-traffic** pages (no per-visitor overage) + built-in A/B from $99/mo; heatmaps appear at $199. Non-technical users build pages "in under 5 minutes."

### 4.3 Behaviour analytics (heatmaps / replay) — *now partly commoditized*
- **Microsoft Clarity** — the disruptor: **free forever**, 2M+ sites, no traffic limits, now with AI summaries. Publishes outcomes like **+80% form submissions, +10% RSVP conversions**. *This is why behaviour analytics alone can't be Samurai's paid moat.*
- **Hotjar** — the incumbent loved for heatmaps+recordings+surveys; now routed through **Contentsquare**. Reviewers find bugs and reposition unseen content via recordings.
- **Contentsquare** — enterprise **zoning analysis + journey analytics**; reviewers use it to source and explain A/B test wins/losses (quant+qual). Complex, quote-led.
- **FullStory** — **tagless autocapture + searchable replay** tied to events/errors; highest satisfaction (9.1/10 TrustRadius) but product/eng-oriented and priced by quote.

### 4.4 Marketing attribution / ad-spend optimization — *the loop-closers*
- **Ruler Analytics** — **best persona fit of the attribution set for us**: closed-loop attribution that ties paid clicks to **forms AND phone-call leads** through to CRM revenue. Exactly the lead-gen job ed-tech has (admissions calls). Small review base, mixed (3.7, n=3).
- **Dreamdata** — **B2B full-funnel revenue attribution** (HubSpot/Salesforce, ABM, long cycles); free tier + strong reviews (4.8, n=55). Great for pipeline/enrolment attribution.
- **HockeyStack** — unifies marketing/sales/revenue into a buyer-journey timeline, 9 attribution models + **Odin AI analyst**; loved for **self-serve dashboards**. Mid-market B2B, quote-led. *(This is the UI inspiration referenced earlier — worth a dashboard teardown.)*
- **Triple Whale** — excellent at ecommerce/Shopify profit+ROAS, but **low fit** for enrolment lead-gen funnels.

### 4.5 Adjacent product / intent analytics
- **PostHog** — all-in-one **analytics + replay + flags/experiments**, usage-priced with a generous free tier and data ownership. Loved for replay tied to funnels. A model for "many jobs, one stack, transparent pricing."
- **Amplitude** — enterprise behavioural **cohorts + funnel/retention + experimentation**; free 2M events. Strong for post-lead activation, requires analytics maturity.

---

## 5. The "most-loved feature" meta-pattern

When you stack every tool's top-rated attribute, three things dominate — and they are *not* exotic features:

1. **Ease of use / fast no-code setup** — #1 by a wide margin (VWO, AB Tasty, Omniconvert, Statsig, PostHog, Unbounce, Leadpages, Instapage, Clarity…).
2. **Responsive human support** — repeatedly the *most-loved* thing (AB Tasty, Convert, Omniconvert). For a new entrant, support is a cheap, proven wedge.
3. **The "aha" visual artefact** — heatmaps/recordings (Hotjar, Clarity), zoning (Contentsquare), searchable replay (FullStory), consolidated dashboards (HockeyStack, Triple Whale). People love *seeing* the insight, not reading a table.

**Implication for Samurai:** polish, onboarding speed, support, and a strong visual "aha" will move the needle more than another feature checkbox.

---

## 6. Where Samurai can win (the whitespace)

No reviewed competitor demonstrates the **complete** chain in one self-serve console:

> **Ad spend → landing-page experiment → on-page behaviour diagnosis → lead/behaviour scoring → CRM-verified enrolment → reconciled cost-per-admission**, built for **ed-tech**.

- CRO tools (VWO, Optimizely, AB Tasty) stop at the conversion event.
- Behaviour tools (Hotjar, Clarity, Contentsquare) stop at the "why," with no economics or experiments attached.
- Attribution tools (Ruler, Dreamdata, HockeyStack) stop at pipeline/revenue, with no page experiments or heatmaps.

**Defensible differentiators for Samurai:**
1. **The unified economic loop** — one number owner from spend to admission; **cost-per-admission**, not just CPL. Nobody reconciles experiments + behaviour + spend to a verified outcome.
2. **Ed-tech vertical depth** — intake-pacing, enrolment targets, programme-level pages, admissions-call attribution (where Ruler is generic, we are native).
3. **Behaviour-based lead/page scoring tied to outcomes** — turn commodity replay/heatmap data into a *decision* (which lead to chase, which page to fix).
4. **Honest, reconciling metrics** — our existing principle (every number traces to real data, totals reconcile) is a trust wedge against "black-box" attribution that reviewers distrust.

**Table-stakes we must match (because they're proven):** no-code visual experiment setup · heatmaps + session replay · quant+qual in one view · ad-to-page message match · cross-channel spend unification · an attainable/free entry tier · **ruthless ease of use + fast onboarding + great support.**

**Pricing lesson:** win self-serve with transparent, attainable tiers (the Unbounce/Leadpages $29–$249 model) and/or a free/usage entry — and *don't* charge for the commodity (basic heatmaps/replay that Clarity gives away). Charge for the **loop and the intelligence.**

---

## 7. Market moves to monitor
- **VWO × AB Tasty merger** (announced, pending close) — creates a larger "experimentation + personalization + behaviour" suite; watch for bundling and price changes.
- **Hotjar → Contentsquare** — Hotjar pricing now routes through Contentsquare; the SMB behaviour leader is now enterprise-owned.
- **Microsoft Clarity's free expansion** + **Contentsquare free tier (≤200k sessions)** — downward pricing pressure on all paid heatmap/replay.
- **AI analysts going mainstream** — HockeyStack "Odin," Kameleoon prompt-based tests, Clarity AI summaries. An AI "what to fix/test next" layer is becoming expected (aligns with Samurai's AI-recommendations roadmap item).

---

## 8. Sources, confidence & limitations
- **Primary review sources:** G2, Capterra, TrustRadius (ratings + review counts cited inline). **Vendor sources:** product/pricing pages for USP + pricing.
- **Research tools:** Exa Agent (`agent_run`, auto effort, 48 searches, ~$1.24) for multi-source discovery/synthesis with per-field citations; Firecrawl for primary-source scrapes (vendor pages + G2 grids).
- **Confidence:** "Most loved" = a recurring/strongly-expressed positive in sampled reviews, **not** a statistically ranked feature. Review samples vary widely by vendor (n=3 for Ruler vs n=2,950 for Amplitude) — weight accordingly. Pricing and counts are Oct-2026 snapshots.
- **Known gaps (not covered here):** Mouseflow, Smartlook, LogRocket (behaviour); Northbeam (attribution); Mixpanel, Heap (product analytics); Google-native tooling (GA4, sunset Google Optimize). Add on request.
- **Not exhaustive** — high-confidence initial universe. Coverage strongest in CRO, behaviour and landing pages; thinner in attribution (smaller, more fragmented market).
