# Visitor Intelligence — the production AI prompt

How Visitor Intelligence (Journey Patterns + Conversion Drivers) is generated **dynamically for any page, any industry, any context** — without the model inventing a single number.

## The core principle: the pipeline computes, the model interprets

Samurai never shows a figure it can't reconcile. So the AI does **not** discover statistics. A deterministic pipeline does the maths; the LLM only **names, explains, adapts and recommends**.

```
Event stream (behaviour-capture tag) ─┐
Ad platforms + CRM ──────────────────┼─▶  PIPELINE (deterministic)
                                      │     • normalise events → semantic stages
                                      │     • sequence-cluster journeys → patterns
                                      │     • attribute signals → drivers (lift vs matched cohort)
                                      │     • compute counts, conversion rates, confidence
                                      ▼
                            PIPELINE OUTPUT (numbers, fixed)
                                      │
                                      ▼
                            LLM  (interpretation only)
                                      │   names · blurbs · stage vocabulary ·
                                      │   recommended tests · the "top opportunity" read
                                      ▼
                            Visitor Intelligence UI
```

The model receives the **tenant context**, the **page's own detected sections**, and the **pipeline's computed analysis**, and returns labelled, human-readable patterns/drivers in the tenant's domain language. It may rephrase a finding; it may never produce or change a figure, a confidence level, or a lift.

---

## Inputs handed to the model

A single JSON object. Everything the model is allowed to "know" is in here — it has no other source.

```jsonc
{
  "tenant": {
    "industry": "Education",                 // drives the domain vocabulary
    "offering": { "one": "programme", "many": "programmes" },  // tenant lexicon
    "conversion": { "one": "lead", "many": "leads" },
    "goalUnit": "enrolments",
    "brandVoice": "plain, warm, non-technical"
  },
  "page": {
    "name": "Online MBA", "url": "/online-mba",
    // sections the tag actually detected on THIS page, with a semantic role.
    // This is what makes stage names adapt per page — never hard-coded.
    "sections": [
      { "id": "hero",        "label": "Hero",         "role": "landing" },
      { "id": "testimonials","label": "Testimonials", "role": "social-proof" },
      { "id": "fees",        "label": "Fees",         "role": "pricing" },
      { "id": "faq",         "label": "FAQ",          "role": "objection-handling" },
      { "id": "apply",       "label": "Apply Now",    "role": "primary-cta" },
      { "id": "form",        "label": "Enquiry form", "role": "conversion" }
    ]
  },
  "analysis": {
    "journeysAnalysed": 1090,                // = sessions in window (NOT unique people)
    "window": "30 days",
    "baselineConvRate": 0.041,               // page conversion, computed
    "dataQuality": { "eventStream": "live", "crm": "live", "sampleFloorMet": true },

    // ── computed by the clustering stage; the model only labels these ──
    "patterns": [
      { "clusterId": "c1", "kind": "converting",
        "sequence": ["hero","apply","form"],          // section ids, in observed order
        "journeys": 189, "converters": 19, "convRate": 0.101,
        "shareOfConversions": 0.42, "relMultiple": 2.5,
        "confidence": "strong",                        // from sample size + stability
        "topDevice": "desktop", "topChannel": "Google · Brand" },
      { "clusterId": "c4", "kind": "opportunity",
        "sequence": ["fees","testimonials","faq","exit"],
        "journeys": 170, "converters": 0, "lastStage": "fees",
        "confidence": "strong", "topDevice": "desktop", "topChannel": "Meta · Prospecting" },
      { "clusterId": "c6", "kind": "repeated-comparison",
        "sequence": ["fees","programme","fees","exit"],
        "journeys": 38, "exitLiftVsPage": 1.03,        // ≈ page → NOT friction
        "confidence": "hypothesis" }
    ],

    // ── computed by the attribution stage (matched-cohort lift) ──
    "drivers": [
      { "signalId": "viewed_testimonials", "group": "positive",
        "lift": 2.1, "confidence": "strong", "n": 402 },
      { "signalId": "fees_and_programme",  "group": "combination",
        "lift": 1.8, "confidence": "strong", "n": 311 },
      { "signalId": "form_error",          "group": "negative",
        "lift": 0.35, "confidence": "strong", "n": 96 }
    ],

    // representative sessions per cluster/signal, pre-selected to MATCH the outcome
    // (converting→converted, opportunity/friction→non-converted) so replays never contradict
    "evidence": { "c1": ["s-0012","s-0044"], "c4": ["s-0203","s-0219"], "viewed_testimonials": ["s-0012"] }
  }
}
```

**Why this shape works for any industry.** The pipeline is domain-blind: it clusters section-id sequences and attributes signals. The *meaning* comes from `page.sections[].role` + `tenant`. Swap in an e-commerce page and the same engine emits `["pdp","reviews","cart","checkout"]`; the model names the archetype "Review-led buyers" instead of "Proof seekers". Nothing in the engine or the prompt is education-specific.

---

## The system prompt

```
You are the interpretation layer of Samurai Visitor Intelligence. You turn a page's
already-computed behavioural analysis into clear, marketer-ready patterns and drivers.

ROLE — INTERPRET, DO NOT CALCULATE
• Every number is given to you in `analysis`. Use them verbatim. Never invent, round,
  re-derive, aggregate, or alter a figure, a confidence level, a lift, or a count.
• Never introduce a pattern or driver that is not in the input. Label only what is there.
• If a required field is missing, omit that item — do not fill the gap.

ADAPT TO THIS PAGE AND THIS BUSINESS
• Name every stage using `page.sections[].label` and `.role` for the ids in each sequence.
  Map the id `exit` to “Left”. You have no fixed vocabulary — a page with a “Reviews”
  section yields “Read the reviews”, a page with “Pricing” yields “Checked the pricing”.
• Name archetypes from the SHAPE of the journey in this domain: a proof/social-proof detour
  → a proof-led name; a price-first path → a value/price-comparison name; a short hero→cta→
  convert path → a fast-decider name. Use the tenant’s words (`tenant.offering`,
  `tenant.conversion`, `tenant.goalUnit`); say “lead”/“enrolment” etc. as the lexicon gives,
  never “enquiry”, never a word the tenant doesn’t use.
• Match `tenant.brandVoice`. Plain, concrete, non-technical.

HONESTY (these protect the brand — breaking them is a defect)
• Drivers are ASSOCIATIONS, never causes. Phrase as “associated with”, “journeys that X
  converted at Y× …”. Every driver write-up must carry: validate with an A/B test.
• Use the given `confidence` as-is. Never upgrade a “hypothesis” to a recommendation; for
  hypothesis-level items, hedge (“an early signal”, “worth a look”, not “do this”).
• A `repeated-comparison` cluster is NOT friction unless `exitLiftVsPage` is clearly > 1.
  If it isn’t, frame it as thorough research, not a problem.
• Counts are journeys/sessions, not unique people — say “journeys”, never imply people.
• If `dataQuality` marks a source as modelled/sampled/not-live, add a short “illustrative /
  pending <source>” note and do not present it as captured fact.
• Recommendations are experiments to TRY or questions to INVESTIGATE, never promised outcomes
  and never a claim that a change “will” lift conversion.

OUTPUT
• Minimal words. One short blurb per item; one-line recommended test; one-line “top opportunity”.
• Return ONLY the JSON in the schema below. No prose outside it.
```

### Output schema (the model fills only the text fields)

```jsonc
{
  "overview": {
    // the single biggest OPPORTUNITY (most-affected opportunity cluster), not the top converter
    "clusterId": "c4",
    "headline": "170 journeys — checked fees and proof, then left without enquiring.",
    "investigate": "Is the next step after reviewing programme info clear enough?"
  },
  "patterns": [
    { "clusterId": "c1", "name": "Direct decision-makers", "blurb": "Decide fast, little exploration.",
      "journey": ["Hero","Apply Now","Enquiry form"], "recommendedTest": "Test a sticky Apply button." }
    // … one per input cluster; numbers/kind/confidence are NOT echoed back by the model,
    //    the app joins them from `analysis` by clusterId
  ],
  "drivers": [
    { "signalId": "viewed_testimonials", "label": "Viewed the testimonials",
      "interpretation": "Social proof lifts intent before the enquiry." }
  ]
}
```

The app renders `analysis` numbers + the model's text, joined by id — so the figures on screen are always the pipeline's, never the model's.

---

## Same engine, five industries

| Page sections (roles) | Archetype the model names | A positive driver |
|---|---|---|
| **Education** hero · testimonials · fees · faq · apply | Proof seekers · Comparison shoppers | Viewed testimonials (2.1×) |
| **E-commerce** pdp · reviews · size-guide · cart · checkout | Review-led buyers · Cart hesitators | Read reviews + size guide (1.9×) |
| **B2B SaaS** hero · features · pricing · docs · demo-cta | Evaluators · Docs-first researchers | Opened docs then pricing (1.7×) |
| **Fintech** hero · rates · eligibility · calculator · apply | Rate shoppers · Eligibility-checkers | Used the calculator (2.0×) |
| **Healthcare** service · doctors · insurance · faq · book | Insurance-checkers · Provider-vetters | Viewed doctor profiles (1.6×) |

The prompt and pipeline are identical across all five. Only `page.sections` and `tenant` change — which is exactly why it is self-serve: a new client's pages are analysed the moment their tag + CRM are connected, with no per-industry configuration.

---

## Guardrail checklist (what the model must never do)

- ❌ Produce, change, round, or re-derive any number, lift, rate, confidence, or count.
- ❌ Add a pattern/driver not present in the input.
- ❌ Claim causation ("X causes/▸will lift conversion"). Only "associated with".
- ❌ Upgrade a hypothesis-confidence item into a firm recommendation.
- ❌ Call a repeated-comparison "friction" without `exitLiftVsPage > 1` evidence.
- ❌ Imply unique people; say "journeys".
- ❌ Use words outside the tenant lexicon (e.g. "enquiry" when the term is "lead").
- ❌ Present modelled/sampled data as captured fact.

## How the prototype maps to this

Today's in-app engine (`src/data/visitorIntel.ts`) **is the deterministic pipeline**, seeded per page and reconciling to the page's aggregates — it stands in for the event-stream clustering/attribution and emits exactly the `analysis` shape above. Representative sessions are pre-selected to match each item's outcome, and `SessionReplay` reconstructs each one along the cluster's journey + outcome, so a replay never contradicts the card it sits under. Wiring the LLM text layer on top (names/blurbs/tests) is the only production addition; the numbers already come from the pipeline.
```
