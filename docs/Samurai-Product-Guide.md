# Samurai — Product Guide

**A reconciled view of what your marketing spend actually returns — and an engine built to act on it.**

Samurai is a marketing-optimization console for lead-generation teams. It follows every unit of ad spend from the click, to the lead, to the deal your CRM closes, to the revenue that close produces — reconciles what you spent against what came back — and points to the single highest-value thing to fix next. Where most tools stop at a report, Samurai is built to close the loop: to act on its own diagnosis and prove the result.

This guide introduces the platform and walks through each part of it, section by section.

---

## Contents

1. [What Samurai is](#what-samurai-is)
2. [Connecting your data](#connecting-your-data)
3. [The platform at a glance](#the-platform-at-a-glance)
4. [Features in depth](#features-in-depth)
   - [Overview](#overview--the-command-centre)
   - [Campaigns](#campaigns--where-the-spend-comes-from)
   - [Pages](#pages--where-the-spend-lands)
   - [Experiments](#experiments--proving-what-works)
   - [Where the money leaked](#where-the-money-leaked)
   - [Samurai AI](#samurai-ai)
5. [How it all fits together](#how-it-all-fits-together)
6. [Where Samurai is going](#where-samurai-is-going)

---

## What Samurai is

Every lead-generation team can see what each ad platform *claims* it delivered. What they can't easily see is what that spend actually returns once a lead is qualified and closed — weeks later, offline, in the CRM. Ad platforms count their own self-attributed conversions. Conversion-testing tools start from the page and treat revenue as an afterthought. Attribution tools stop at the lead. The marketer is left stitching spreadsheets to answer the one question finance actually asks: *what did we get back for this — and how do we get more of it?*

Samurai answers both halves in a single view. It brings spend, leads and revenue into one reconciled picture, then works the whole lifecycle in between: it shows where money is leaking — a form broken on mobile, a campaign still spending on a closed intake, a page that converts expensively — pinpoints exactly where interested visitors slip away on the page, and names the specific change to make next. Revenue is where the story ends, not where it starts. The real job is the loop that gets you there: optimise the landing page, win more leads from the traffic you already pay for, and turn those leads into more revenue. The depth sits behind plain-language summaries and one clear next action, because it is built for marketers, not analysts.

And Samurai is built to go beyond telling you. Its direction is to **act** — an agentic AI that algorithmically runs and reallocates your ad spend toward what converts cheapest, bringing in more leads and, with them, more revenue, then proving the lift against a held-back control before it scales. Measure the full journey, fix the page, win the lead, grow the revenue — and, increasingly, let Samurai do it for you. *(Agentic ad execution is the forward roadmap — see [Samurai AI](#samurai-ai) and [Where Samurai is going](#where-samurai-is-going).)*

**Who it's for.** Non-technical, mid-market marketing teams whose revenue is a considered purchase closed in a CRM — later and offline — rather than an instant online checkout. The natural owner is the person accountable for both the acquisition budget and the on-page conversion number. Samurai is industry-agnostic: a per-tenant vocabulary adapts the on-screen language to each business — higher-education admissions (the flagship example), B2B services, financial services, healthcare, home services and similar lead-generation categories.

### Every number, traceable

Samurai's defining principle is that it never shows a figure it cannot trace back to its source:

- **Reconciled.** Spend and leads tie exactly to the account total — every page and every campaign adds up to the same number, with nothing double-counted or invented.
- **Computed in the open.** Revenue, cost to acquire a customer and return on ad spend are derived from two inputs you control — your average deal value and the share of qualified leads that close — drawn from your own finance and CRM, never guessed.
- **Drillable.** Any number on screen can be opened to the rows behind it, so every figure is defensible to a finance team.
- **Honest about uncertainty.** Where the signal isn't strong enough to be sure, Samurai says so instead of estimating.

That discipline is what separates Samurai from a platform's self-reported dashboard. It is also what makes the next step possible: an engine this honest is one you can eventually trust to act.

---

## Connecting your data

Samurai runs on your own data, and it earns trust by connecting to the systems you already use — then refusing to show a number it can't trace back to them. Three connections bring the full picture together.

- **Your ad platforms.** Connect Google Ads and Meta Ads, and Samurai reads the spend and clicks behind every page — broken out by campaign and by device, not left as one lump sum.
- **Your website activity.** A lightweight capture snippet records what visitors actually do on the page — how many arrive, how far they scroll, when they reach the form, which buttons they click — so you can see where interest turns into action.
- **Your CRM and revenue system.** Samurai connects to the tools your pipeline already runs on — HubSpot, Salesforce, Zoho, Superleap and the like. This is the connection that turns a click into a qualified lead, a registration, an enrolment and, finally, revenue — one continuous line instead of two disconnected halves.

**Honest while it connects.** Nothing is faked to fill a gap. Before a source is linked, the figure that would depend on it reads *Connect CRM* (or *Connect Ads*, or *Connect Website*). While data is still flowing in, it reads *awaiting sync*. A number appears only once there is real data behind it — so an incomplete setup looks incomplete, never wrong.

Once your sources are live, that reconciled data becomes a workspace you shape yourself — the dashboards, funnels and widgets you build from it live in **[Pages](#pages--where-the-spend-lands)**.

---

## The platform at a glance

| Section | The question it answers |
|---|---|
| **Overview** | What did all our spend return, and what should we fix first? |
| **Campaigns** | Which campaigns turn spend into leads — and which just buy clicks? |
| **Pages** | Which landing pages convert spend into affordable leads — and the dashboards you build to prove it? |
| **Experiments** | Which change actually lowers the cost of a lead? |
| **Where the money leaked** | How much spend is provably wasted, and how much is only worth a review? |
| **Samurai AI** *(Beta)* | What are the highest-value moves this week — ranked by the money they recover? |

---

## Features in depth

### Overview — the command centre

The Overview is the account's home screen and its financial summary. It leads with one blended cost per lead and one return on ad spend for the whole account, set against goal pacing — how far through your target you are versus how far through the period. Beneath that sits the revenue your spend returned, the pages and campaigns quietly leaking budget, the tests in flight, and the cost-per-lead trend across the quarter.

It is deliberately money-first. Where a testing tool opens on a conversion readout, Samurai opens on what the spend returned and the single most expensive problem to address — so the first thing the team sees is the thing most worth their attention.

- **Blended cost per lead and return on ad spend** for the whole account, each drillable to the pages and campaigns behind it.
- **Goal pacing** — progress against the target measured against the elapsed window, so "behind" is visible before it becomes a shortfall.
- **What the spend returned** — revenue, cost to acquire a customer and return, computed transparently from your average deal value and close rate.
- **Where the money leaked** and **tests in flight**, each a one-click path into the detail.

### Campaigns — where the spend comes from

Campaigns brings every paid campaign across Google and Meta into one reconciled view: what each spent, how many leads it produced on its landing page, and the resulting cost per lead. A platform split shows how budget and leads divide between the two networks, and a single filter isolates campaigns that are spending with nothing to show for it. Every campaign is tied to the one landing page it drives, so spend is always traceable to an outcome.

- **Platform split (Google vs Meta)** — spend share, lead share and cost per lead for each network, as a chart or a table.
- **Full campaign list** — every campaign with its spend, leads, cost per lead and good-lead rate, totalling back to the account.
- **Benchmarked cost per lead** — each campaign banded against the account average, so the expensive ones stand out at a glance.
- **"Spending, no leads" filter** — surfaces campaigns consuming budget with no leads to return, the clearest waste to act on first.
- **Campaign detail** — open any campaign for its spend-and-cost-per-lead trend, the page it depends on, and the enrolment revenue it is projected to return.

*The breakdown is at network and campaign level; cost per lead is spend divided by the leads the campaign's page captured. Projected revenue on a campaign is a forward projection from your close rate and deal value — directional until the deals are confirmed — never booked revenue.*

### Pages — where the spend lands

Pages is a per-page ledger that ranks every landing page by what a lead actually costs, and flags the ones quietly spending with no return. Open any page and you land on a **dashboard you control** — not a fixed report.

#### The dashboard you build

Each page opens on a live dashboard of widgets. Samurai ships sensible defaults — the spend-to-lead funnel (*How spend becomes a lead*), the cost-per-lead trend, and what the spend returned — and from there it's yours to shape. **Add a widget** in two simple steps: first choose how you want to see it — a funnel, a trend over time, a bar comparison, a share-of-total split, or a single headline number — then choose the data behind it. Drag widgets to reorder them, widen or compact them, collapse the ones you aren't watching.

The funnel is fully composable: build it stage by stage from ad spend, website activity and CRM milestones, in whatever order your pipeline runs — including **custom stages mapped straight to your own CRM fields**, whether that's *Counselling booked*, *Offer accepted*, or whatever your pipeline calls them. Every widget value reconciles to that page's own totals, and any stage without a connected source reads *Connect CRM* or *awaiting sync* rather than inventing a figure. A dashboard you assemble yourself is therefore exactly as trustworthy as the headline numbers beside it.

The ledger underneath every page stays the same:

- **The spend-to-lead chain** — spend → clicks → visits → leads, with the click-to-visit gap shown openly (bounces before load, ad blockers, direct traffic) rather than hidden.
- **Cost-per-lead ranking** — every page banded against the account average, so the most and least efficient pages are obvious.
- **Revenue per page** — what a page returned once its leads closed in the CRM, connecting spend to outcome, not just lead volume.
- **Pages that spend with no return** — a page taking budget but recording zero leads is flagged outright as a confirmed leak.

Each page also carries a **Behaviour** view that explains the drop between visits and leads.

#### On-page behaviour
Opens with a single plain verdict — *the mobile form is failing*, *this field loses the most leads*, *this page converts cleanly* — and points to where to look. Four lenses organise the detail: an interaction map (clicks, scroll reach, attention, rage clicks, by device), scroll depth and an on-page journey funnel, friction signals with a device-by-device conversion split, and a triaged shortlist of individual sessions worth reviewing — each surfaced only because the visitor did something specific, never a black-box score.

#### Visitor intelligence
Where on-page behaviour maps the clicks, Visitor intelligence reads the *journeys* — the recurring ways real prospects move through a page, and exactly where interested ones slip away. Instead of a wall of numbers, it names the patterns:

- **Converting archetypes** — the routes that end in an enquiry, like the direct decision-maker who acts fast and the proof-seeker who reads the testimonials first.
- **Missed-opportunity groups** — visitors who showed real intent but left without enquiring, sized in journeys so you know how much is at stake.
- **Friction loops** — the dead-ends where people bounce between fees and programme details and give up.

Its sharpest view is form-level drop-off. Visitor intelligence can surface a high-intent prospect who filled in their name, phone and email, then stalled at the moment of choosing a programme — pinpointing the exact step to fix instead of a vague "improve the form." Open any pattern into a **session timeline** that walks through what that visitor actually did, step by step, ending in the one thing to take away. Every insight carries a confidence level — *Strong*, *Emerging*, or an early signal — so you always know how much weight to put on it, and every count is drawn from the page's own reconciled activity, never invented. It lives under the **Visitors** view in the Behaviour tab.

#### Form field analytics
Zooms inside the enquiry form to show, field by field, exactly where would-be leads are shed: how many reached each field, abandoned there, hesitated or re-typed — and names the single field to fix first. The completed count equals the page's real leads, so the view always ties back to the page's economics. Form friction is often the cheapest lead win available, because the traffic is already paid for.

#### Get more leads
A conversion diagnostic that reads a page's own reconciled data and lists the fixable, on-page reasons paid visitors aren't converting — largest first. It detects a device converting far below the best, the form field losing the most leads, visitors blocked at submit by validation, a slow or fiddly field, a form sitting below the fold, fast bounces that signal an ad-to-page mismatch, and rage-clicked elements. Each finding shows the measured gap and a specific fix, and degrades honestly on thin-traffic or closed pages rather than inventing findings. It shows measured facts only — never a projected "you'll gain X leads" — and every suggested fix carries the reminder to validate it with an A/B test before rolling it out.

### Experiments — proving what works

Experiments lets a team test changes to its landing pages and prove the winner on **cost per lead and the revenue it returns** — not on clicks or time on page. Run a head-to-head A/B test or compare up to five versions at once. Every test is set up through one guided, no-code builder, started from a library of proven templates or from scratch, with guardrail alerts set before launch.

- **A/B and multi-variant** — a control against one variant, or up to five versions compared on the same decisive action.
- **Cost per lead, per version** — each version's spend over the leads it produced, worked out separately so differently-designed pages still compare like-for-like.
- **Proven templates** — pre-built tests drawn from patterns that have worked before (form above the fold, a scholarship banner, a shorter enquiry form), each noting what it suits.
- **A verdict you can act on** — every test resolves to a plain call: *Ship it*, *Keep running*, *Replace it*, or *No difference* — each paired with the evidence behind it and a one-click way to put the winner live, with no developer or deploy step.
- **What it returned** — a projection of each version's revenue, which can name a different winner than cost per lead when programmes carry different values.
- **Behaviour inside the test** — switch from Result to Behaviour to see *why* a version won or lost: the funnel, the form field each version loses people on, and sessions grouped by version.

*Winners are called on reconciled business outcomes and a reading threshold — a well-supported bet, not a statistical certainty — and "What it returned" is a projection that stays directional until the deals close. A running test is never presented as a result, "No difference" is a genuine finding, and a stopped test means the idea is untested, not disproved.*

### Where the money leaked

Samurai sorts every unit of spend into exactly one of three buckets, so a wasted rupee has nowhere to hide:

- **Working** — spend producing leads at or above benchmark.
- **Confirmed loss** — spend hitting a provable, mechanical fault that returned nothing (a broken conversion path, a closed offer still taking budget). Presented as recoverable, and open to the numbers behind it.
- **Likely loss** — spend that works but underperforms a benchmark. Presented as a *review*, counting only the overspend versus benchmark — never as money in hand.

Working + Confirmed + Likely always equals total spend, so the split is complete and every figure drills to the spend, leads and benchmark it came from. The distinction between *confirmed, recoverable* and *likely, worth a review* is deliberate and strict — it is what keeps a recoverable number defensible to a CFO. The most expensive problems surface first, in the Overview and on each page, so attention always lands where the money is.

### Samurai AI

Every other section hands you the truth about your spend. Samurai AI is the part that *does something with it* — today by thinking like your sharpest analyst, and, on the near horizon, by acting like one.

**Today: an analyst that has already read every number.** Samurai AI opens not with a blank prompt but with a verdict — *here's what I'd do this week* — a ranked, ready-to-apply list of moves, biggest recoverable money first. Each one is built from your reconciled leaks and platform split: fix the mobile form bleeding budget, pause the campaign still spending on a closed intake, shift spend off the channel that converts dearer. Every rupee ties back to your account totals, and you approve or decline each move; it recommends, you decide. Ask it anything — *where am I losing leads, which page is dearest, are we pacing to target* — and it answers with a headline, a short narrative, a chart and a specific recommendation, footnoted with what it's grounded in. It composes those findings into a shareable, scheduled executive report. And because it sits on the same reconciled model as everything else, **the model phrases the finding — it never invents the figure.**

**Next: an agent that acts, then proves it.** This is where Samurai is headed, and it is the difference that matters. Most tools stop at the report: VWO and Optimizely tell you whether B beat A on one page; attribution dashboards tell you where the money went. Samurai is built to take the next step — to act on its own diagnosis. Once it knows which segments and pages convert cheapest, the agentic layer will algorithmically allocate and run your ad spend toward them — reclaiming wasted budget and steering it to where it brings in more leads at a lower true cost per lead. Then it will do the one thing a dashboard never can: **prove the lift with a holdout** — a controlled slice, a measured result, reconciled back to real revenue, so the gain is evidence, not a projection.

That closed loop — *diagnose honestly, act on the diagnosis, then prove it against a control* — is the moat. Reporting is commoditised; reconciliation is table stakes for attribution vendors. Acting and proving on the same reconciled ground is not something a reporting tool can bolt on. Today Samurai AI diagnoses and recommends. Tomorrow it acts and proves — a marketing agent that moves your spend and shows you, honestly, the leads it won.

*Samurai AI is in Beta; the agentic execution described above is the forward roadmap, flagged as such so today's capability is never oversold. Its standing promise holds at every stage: it composes from reconciled data — it may phrase a finding, but it never decides a figure, a bucket, or whether something is a leak.*

---

## How it all fits together

Samurai runs on **one reconciled model, shared by every screen**: ad click → lead → qualified lead → closed deal → revenue, and from there cost per lead, cost to acquire a customer, and return on ad spend. Spend from the ad side meets leads recorded on the CRM side to produce one blended cost per lead; the qualified and closed stages apply your close rate and average deal value to turn leads into revenue.

Because every page and campaign partitions the *same* account total, the surfaces are different views of one truth rather than separate reports:

> **Campaigns** (where the spend comes from) → **Pages** (where it lands, converts, and you build your own dashboards) → **Experiments** (how you improve it) → **Revenue** (what came back) — with **money-leak detection** watching the whole thing and **Samurai AI** turning it into the next move.

That shared model is also what closes the loop. A page flagged as expensive in Pages becomes a test in Experiments; a shipped winner lowers the cost per lead that rolls up to the Overview; a campaign spending with no leads appears as a confirmed leak. Measure, test, ship, re-measure — each step reconciled against the same totals, so improvement is provable rather than asserted. The next step on the roadmap extends that same loop one stage further: act on the diagnosis, then prove the act against a holdout.

---

## Where Samurai is going

Samurai today **measures, diagnoses and recommends**. Its direction is to also **act** — to close the gap between knowing what to do and doing it — always with the same reconciled, prove-it-first discipline. This is the heart of the product's promise, not a footnote to it.

**Algorithmic ad execution — the headline.** The defining next step is running and allocating ad spend on your behalf, directly from the platform, to bring in more leads. Rather than only telling you which campaign is wasteful and which page is cheapest, Samurai will move budget toward what demonstrably produces leads and revenue — continuously, across Google and Meta — so the optimisation happens for you. In keeping with the brand, every automated move is proven against a held-back control before it scales, so the lift it claims is real and reconciled, not assumed. Report, then act, then prove: that is the loop no reporting tool closes.

**An agentic copilot that acts with approval.** The weekly moves queue evolves from a list you read into actions Samurai can carry out once you approve them — pausing dead spend, shipping a proven winner, rerouting traffic — each with a full record of what it did and why.

**Deeper connectivity.** Live read-only connectors to the major ad platforms and CRMs, and broader fault coverage in money-leak detection, extend the same reconciled model from today's worked example to each client's live data.

Each of these is additive to the core promise: **every number traceable, every claim reconciled, every action proven — and the one thing to fix next always in plain sight.**
