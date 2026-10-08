# Samurai AI — UX Research & Redesign (2026-09-28)

_Goal: make the Samurai AI experience ~10× better. Functionality (the grounded insight engine, generative charts, human-in-the-loop actions) was already good; this was a **UI/UX** overhaul. Research done live via Firecrawl + Scrape.do before any change._

## Sources
- **setproduct.com/blog/ai-chat-interface-ui-design** — the AI-chat field guide (9 regions of a chat; **6 message states**; the streaming pattern).
- **shapeof.ai** — AI UX pattern library: Wayfinders, Prompt actions, Tuners, Governors, **Trust builders**, Identifiers.
- **aiuxpatterns.com** — taxonomy: Inline Suggestions, Prompt Templates, Result Actions, **Show Citations**, **Agent Action Review & Confirm**, Thread History.
- eleken.co / decagon.ai — generative UI. (Raw scrapes cached in `.firecrawl/`.)

## What the research said (and how we applied it)
1. **The composer must be stable.** The message area is "the entire product"; the composer stays anchored (ChatGPT/Claude/Perplexity all dock it). → **Fix for the "everything jumps" bug:** the old home (centred hero + input) hard-swapped to a thread (input at the bottom). Now there is **one layout** — a scroll region + a **docked composer that never moves**. Submitting only changes what's in the scroll region (landing ⇄ conversation), a fade, not a jump.
2. **Message states beyond streaming→done.** The set is Queued → Streaming → Complete → Error. Most products ship only two, which feels janky. The queued window (200ms–2s) should show a **subtle shimmer, never a fake progress bar.** → Added a **QueuedShimmer** ("Reading your reconciled data…" + shimmer lines) before the reasoning stream; kept the streamed reasoning; kept the "Reasoned over N sources" collapsible (Trust builder / Show Citations).
3. **Wayfinders / Inline Suggestions, merged.** Prompt starters help users start; keep them one set, dismissible follow-ups once in a thread. → **Removed the persona segregation** ("For the marketer" / "For the marketing head") — the client shouldn't see we target two personas. Now **one grid of icon prompt-starter cards**; in a thread, a slim **"Follow up:"** chip row above the composer.
4. **Trust builders / Agent Action Review & Confirm.** Cite sources; confirm agent actions. → Already present and kept: "Built from your reconciled data · not a generated guess", source list, and the confirm-before-apply action buttons.

## Also upgraded (same pass)
- **Needs your attention** — proactive panel with a live pulse, per-alert icons, an "₹X at risk" roll-up, and hover-reveal Investigate.
- **Report generation** — a **"Composing…"** state (stepped shimmer) before the document renders, then the polished report doc.
- **Scheduled reports** — card layout with delivery channel + "composed at send time, never a stale snapshot".
- **Composer** — multiline auto-grow textarea, Enter to send / Shift-Enter newline, ⌘↵ hint.

**Net:** the AI surface now follows the industry-standard anchored-composer chat model, has honest loading states, merged suggestions, and a smoother report flow — no functional change to the grounded engine.
