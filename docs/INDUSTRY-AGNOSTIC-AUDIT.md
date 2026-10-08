# Industry-Agnostic Audit — making Samurai a product for any vertical

**Goal:** Samurai should not read as an education/university tool. Any client — B2B SaaS,
e-commerce, fintech, healthcare, real estate — can be onboarded, and the platform configures
itself to *their* world. JAIN Online stays as the fully-populated flagship (a real university
client); the platform *framing* around it becomes vertical-neutral.

## What was hardcoded to education (findings)

Two distinct groups surfaced in the audit:

**A. Platform chrome — presents the product itself (must generalize):**
- `src/lib/tenant.tsx` — `type` field limited to University/Edtech/Coaching; seeds all education.
- `src/features/onboarding/Onboarding.tsx` — "Type of institution", programme suggestions
  (MBA/BBA/…), "Programmes & intake", "First intake", "Enrolment target", success copy.
- `src/features/Overview.tsx` — the headline subtitle ("…into **enquiries**… hit the **intake**")
  and the entire fresh-tenant cold-start ("intake target", "enrolments", "programmes").
- `src/features/Settings.tsx` — static JAIN `DEFAULTS`: tab "Programmes & targets", "the degrees
  you market", "Intakes & enrolment targets", "Cost per enrolment", "Broken enquiry form", etc.
- `src/ai/SamuraiAI.tsx` — "Ask about spend, pages, experiments or **intake**".

**B. JAIN's own content — a university client's real data (legitimately education, kept as-is):**
- `src/data/samurai.ts`, `pages.ts`, `experiments.ts`, `behavior.ts`, `templates.ts`,
  `Campaigns.tsx`, `CampaignDetail.tsx` — JAIN's pages, experiments, leaks, programme names.
  These are the flagship example client's data, not platform framing.

## Design decision — a per-tenant lexicon; CPL stays universal

External grounding (average CPL-by-industry benchmarks, 2026–27) confirms **cost per lead / "Blended
CPL" is a cross-industry standard** — the benchmark tables break Blended CPL across B2B SaaS,
E-commerce, Healthcare, Finance, Real Estate, Education alike. So CPL is kept as the universal core
metric; only the genuinely vertical-specific framing varies, via a small `Lexicon` on each tenant:

| Field | Education | B2B SaaS | E-commerce | Healthcare |
|-------|-----------|----------|------------|-----------|
| conversion | enquiry/enquiries | lead/leads | lead/leads | lead/leads |
| offering | programme(s) | product(s) | collection(s) | service(s) |
| goalNoun | intake | quarterly target | sales target | quarterly target |
| goalUnit | enrolments | sign-ups | orders | appointments |

Industries: **B2B SaaS · E-commerce · Education · Fintech · Healthcare · Real Estate · Other**
(`INDUSTRIES` in `tenant.tsx`, each with a lexicon + "what do you market?" suggestions).

## Changes made

- **`src/lib/tenant.tsx`** — new `Lexicon`, `INDUSTRIES`, `OFFER_SUGGEST`, `lexiconFor()`,
  `lexiconOf()`, `cap()`. Tenant fields renamed to neutral: `type→industry`, `programmes→offerings`,
  `intake→goal` (`{name,target,current?,close?}`), plus optional `lexicon`. Seeds now span verticals:
  JAIN Online (Education, populated flagship), Northwind CRM (B2B SaaS), Marlowe Living (E-commerce).
- **`onboarding/Onboarding.tsx`** — industry picker; step labels, offering suggestions, goal fields
  and all copy derive from the selected industry's lexicon and update live when the industry changes.
- **`Overview.tsx`** — headline subtitle and the whole cold-start are lexicon-driven; JAIN (education
  lexicon) renders identically to before.
- **`Settings.tsx`** — now reflects the **active tenant**: identity, offerings, goal/targets and which
  sources are connected all come from the tenant; tab label, headings, lead-definition, alerts and the
  headline-metric options are lexicon-labelled. Deep platform tabs (tracking, privacy, alerts) keep
  sensible defaults.
- **`ai/SamuraiAI.tsx`** — intro line neutralised ("…or targets").
- Currency: the cold-start explainer no longer says "rupee" (fresh tenants show no ₹ figures). The
  populated JAIN dashboard remains ₹-denominated — correct for that client.

## Kept intentionally
JAIN Online is the populated demo (a university), so its dashboard, experiments and detailed
Settings content stay education-flavoured. The multi-vertical story is told by onboarding, the
diversified switcher, and each fresh tenant's own-language cold-start.

## Verified
JAIN unchanged · switcher shows 3 verticals · Northwind cold-start speaks SaaS (products / sign-ups /
quarterly target) · Marlowe speaks e-commerce (collections / orders / sales target) · Marlowe Settings
shows collections + "Cost per order" + CRM as not-connected · onboarding reactive across industries
(Healthcare → Services / Appointments target). `tsc -b` clean.
