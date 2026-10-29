# Experiment session replay — presentation plan

**Status:** plan for review (no code changed yet)
**Question it answers:** Given the new page-level high-signal session triage, how should Experiments present session replay — we can't store/show 50k sessions, so should we show only the important ones?
**Backed by:** a 7-agent research + audit + adversarial workflow (external tooling research, code audit, honesty-gate review, synthesis, 3 adversarial lenses). All three lenses returned *needs-change* — the direction is right, the refinements below are theirs.

---

## 1. Short answer

**Yes — show only high-signal sessions, by the exact same fixed rule the page triage uses (`HIGH_SIGNAL` / `TAG_RANK`), framed as *examples that illustrate* the result, never as the per-arm measure or the reason a variant won.** The per-arm **comparison** (the signal-mix difference, already reconciled per arm) is the lead; individual recordings are a "show me one example" drill-down.

This is both the category standard *and* our honest differentiator.

### Why (research, 15 sources)
- **Nobody surfaces all sessions in an experiment.** Every tool caps/samples/filters: FullStory ranks by Rage/Dead/Error/Thrashed clicks; Convert *only stores signal sessions* ("we only store signals, no noise"); Hotjar caps daily + samples ~15% of sessions as replays + drops <30s sessions; VWO/Clarity filter by variation + friction.
- **"Important" is a fixed, deterministic signal vocabulary** — rage / dead / error / quick-back / excessive-scroll + outcome (converted vs abandoned) + segment. FullStory's canonical set is *almost identical to our `HIGH_SIGNAL`*. External validation that a named fixed tag set (not a computed score) is the standard and the honest way.
- **The AI "recordings worth watching" ranker exists (Crazy Egg, Wingify Copilot) — and it's the black box our deterministic gate deliberately rejects.** Our fixed-rule approach is the differentiator to name against AI-ranked competitors.
- **What marketers actually use experiment replay for** (all qualitative, output = the next hypothesis, never a metric):
  1. **Debug the surprising loser — find the one broken flow** (the #1 use; canonical example: a dead/unresponsive date field at checkout the aggregate numbers never revealed).
  2. **Sanity-check right after launch**, before significance, to catch a bug/broken layout before burning traffic.
  3. **Validate a winner** — confirm *why* it won so the pattern can be reused.
  4. **Segment differences** — desktop glides, mobile abandons.

> Industry framing is unanimous: recordings are the qualitative **"why"** evidence. **No tool claims recordings measure how much behaviour drove the win.** This backs our prior 0.9-confidence decision to refuse modelled per-arm behavioural lift.

---

## 2. What the audit found in the current code (the honesty problems)

Two things must change regardless of which presentation we pick.

### 2a. A fabrication in the A/B replay — **must remove**
`expBehavior()` in `src/data/behavior.ts` (~L408–414) builds `sessionsByArm` by **splitting the *control* page's `sessionList` in half** and setting the variant half's `converted: dir > 0 ? true`. So:
- For any **winning** variant, **every** variant session is force-marked converted. Because `SessionReplay.tsx` branches on `s.converted`, opening a variant session tagged `quick-back`/`left` renders a **converted timeline** — the row chip and the modal contradict each other. This is manufacturing outcomes to match the verdict.
- The variant arm's sessions are sliced from the **control** page, so they can't be the variant's sessions at all.

`ReplayByArm` (`src/features/behavior/BehaviorView.tsx` ~L920/L1020) is the sole consumer of this.

### 2b. A redundant duplicate — **should remove**
`NVarReplay` (`BehaviorView.tsx` ~L683/L783) renders `cur.beh.sessionList.slice(0,5)` — the **identical** page session pool the existing per-row **"Lifetime behaviour"** deep-link (~L625/L658) already opens via the full page triage. It's a strictly weaker duplicate (first-5, no selection logic).

### 2c. The `SessionReplay` headline copy — **must soften**
`verdict()` in `SessionReplay.tsx` (~L71–72), on the `headline` path, emits *"Watch both arms to see the behavioural reason behind the number."* — asserts session-level causation we don't have. Remove the why-won framing from any experiment session surface.

### 2d. Duplicated friction numbers already on the experiment tab
- A/B: the **Scorecard** (~L871–918) already carries a per-arm **rage-clicks guardrail row with CI + significance**.
- N-variant: the **"On-page behaviour — A vs B vs C"** table (~L634–666) has a Friction-score column, and the **"Friction signals — A vs B vs C"** table (~L742–774) repeats that score plus rage/dead/quick/js. **Friction score is shown twice in the same tab.**

---

## 3. Recommended design

### 3.1 "Important" = the page's rule, verbatim
Reuse `HIGH_SIGNAL`, `TAG_RANK`, `isHighSignal`, `whySurfaced`, `sessionSeverity` (already exported from `src/data/behavior.ts`, already imported into `BehaviorView.tsx`). **No experiment-specific "importance."** Inclusion = fixed-set tag membership; ranking = fixed severity. Label exactly like the page: *"surfaced by what the visitor did, not a score."*

### 3.2 The per-arm comparison is the lead — sourced only from already-reconciled per-arm counts
Not from counting the 28-session sample.

- **N-variant:** the per-version friction data already exists (`arm()` scales each real page's measured friction to that version's own test sessions). **Merge the two tables into one** (kill the duplicated score column from §2d), then **lead it with a plain-language verdict line** (spec below). Honest because each version is a genuinely distinct page with its own measured `pageBehavior`.
- **Page-vs-page A/B** (`e.variantPageId` set): extend the **Scorecard** with dead/quick rows (inheriting its CI/guardrail treatment) rather than standing up a *second* friction table. Keep `HeatmapCompare` as the distinct spatial view.
- **Single-page A/B tweak** (no `variantPageId`): there is **no second session pool**. Do not fake a per-arm mix. Show one honest line — *"This test changed one page, so there's no second page to compare behaviour on — the result is in Result and the scorecard"* — and **omit** the per-arm session block entirely.

### 3.3 The plain-language verdict line (the usefulness fix — must be built, not hand-waved)
Deterministic, from reconciled per-arm counts:
- Rank arms by **rage-clicks-per-session** (tiebreak: **quick-backs-per-session**).
- Render a sentence **only when the leader beats the next by a fixed margin** (a named constant, same spirit as the page's fixed thresholds): *"Version B shows the most rage clicks per session (N vs M) — that's where to look."*
- Otherwise: *"No version stands out on friction — the win is in the numbers, not the behaviour."*
- **Never anchor the verdict on JS errors** (`jsErrors` is a flat hardcoded constant — `broken?122:closed?0:3` — with no per-session grounding). Lead on rage, which derives from a per-element rate.

### 3.4 Demote the jargon (non-technical-users rule)
Lead row shows only the two signals a marketer can act on — **rage clicks** and **quick-backs**, in plain words. Put **dead clicks, JS errors, and the 0–100 score behind the existing `Collapsible`** depth toggle. Never lead an experiment comparison with a JS-error count.

### 3.5 Session examples = a drill-down, **deep-linked** to the page triage
*(The fork you left to me — chosen: deep-link, not inline-embed.)*

- Replace `ReplayByArm` + `NVarReplay` with a per-arm **"See example sessions →"** affordance that opens the **real page triage** (`SessionList`) for that arm's actual page — same fixed selection, `diversify()`, timeline modal, abandoners→Lead Story.
- **Why deep-link over inline-embed:** embedding the page triage inside the experiment tab renders the *same* session rows in two on-screen locations (page tab + experiment tab) — a direct no-redundancy violation — and imports the page's lifetime framing ("of {lifetime visits}", "every recent recording") under experiment headings, blurring lifetime vs test. The deep-link keeps **one canonical sessions location** and inherits the existing "all-time — not this test" labels. The test-specific insight already lives in-context (§3.2), so only the generic examples leave.
- **Mitigate the one downside the usefulness lens raised** (bouncing a marketer into lifetime numbers): label the link destination explicitly — *"opens this page's lifetime behaviour, not just this test."*
- **N-variant:** this *is* the existing "Lifetime behaviour" link's job — so just keep that link and delete `NVarReplay`.
- **A/B page-vs-page:** add the deep-link the A/B view currently lacks — one per real page (control page + variant page).
- **Single-page tweak:** no link (no test-specific pool; §3.2).

### 3.6 Honesty guardrails (apply to every experiment session surface)
- Never "these sessions are why B won" / "watch both arms to see the reason." Causation stays in Result (Verdict/Matchup/cplDrill/funnel/evidence) + the CI-bounded Behavioural Scorecard + FormFunnelCompare.
- Never show an A-vs-B session **count or ranking** from `sessionsByArm` as measured — it's one pool bisected with conversions force-flipped. The honest per-arm mix is the friction comparison that scales each arm's real measured friction to its own test sessions.
- Selection is fixed-set membership + fixed severity — never "most important," "top," or any computed/learned importance.
- **No stored-archive implication in the experiment context** (elevated from optional → mandatory by the fabrication lens, because it directly contradicts your premise "we can't store 50k"): drop the **"Open in Clarity"** button + "Opening the raw recording" toast on experiment-reached examples, and suppress/relabel the "of {lifetime visits}" denominator + "every recent recording" copy when the triage is reached from an experiment.
- Timeline is events, not video — no playback/cursor/device-frame language.
- Never quantify behavioural **lift** from sessions (lift is modelled). The sample illustrates a *kind* of friction, scoped ("3 of the sampled sessions hit a form error"), never extrapolated.

---

## 4. Concrete change list (for when we build)

| # | File | Change |
|---|------|--------|
| 1 | `src/data/behavior.ts` (~L408–414) | **Delete** the `sessionsByArm` bisection + `converted: dir>0?true` flip. (Remove `sessionsByArm` from `ExpBehaviorData` once its consumer is gone.) |
| 2 | `src/features/behavior/BehaviorView.tsx` | **Delete** `ReplayByArm` (~L920/L1020) and its call site (~L459). |
| 3 | `src/features/behavior/BehaviorView.tsx` | **Delete** `NVarReplay` (~L683/L783) and its call site (~L676); rely on the existing "Lifetime behaviour" link. |
| 4 | `src/features/behavior/BehaviorView.tsx` | **A/B:** add dead/quick rows to the `Scorecard` for page-vs-page; add the per-arm **"See example sessions →"** deep-links (control page + variant page) with the "lifetime, not this test" label; render the single-page-tweak honest line + no session block. |
| 5 | `src/features/behavior/BehaviorView.tsx` | **N-variant:** merge the two friction tables into one (drop the duplicated score column); add the plain-language verdict line (§3.3); move dead/JS/score behind `Collapsible`. |
| 6 | `src/features/behavior/SessionReplay.tsx` (~L71–72) | Remove the `headline`-path "Watch both arms…" why-won text; if a header is wanted, neutral "Example session on {page}". When reached from an experiment, suppress the "Open in Clarity" button + stored-archive copy. |
| 7 | New helper | A tiny deterministic `frictionVerdict(arms)` (rank by rage-per-session, margin constant) for §3.3 — co-located with the experiment behaviour code. |

No new infrastructure — the selection rule and triage component already exist.

---

## 5. Decisions resolved / still open

**Resolved in this plan:**
- Important-only? **Yes**, by the page's fixed rule.
- Docked-inline vs deep-link? **Deep-link** (§3.5 reasoning).
- Second friction table for A/B? **No** — merge into the Scorecard.
- Single-page tweak? **Omit** the session block; show one honest line.
- Lead signal? **Rage (per session)**, never JS errors; jargon behind the toggle.

**Still worth a quick confirm before build:**
1. Deep-link label wording — is "opens this page's lifetime behaviour, not just this test" clear enough, or do we want a stronger visual separation?
2. For page-vs-page A/B, extend the Scorecard with dead + quick-back rows, or keep it to **rage only** to avoid implying more per-arm resolution than a short test window supports?

---

## 6. Out of scope (flagged, not part of this plan)
The **page** triage itself still uses some stored-archive wording ("of {lifetime visits}", "every recent recording", "Open in Clarity") that leans on the same not-really-stored implication. The fabrication lens flagged it. It's a separate, page-level copy pass — worth a follow-up, but outside this experiment-focused change.
