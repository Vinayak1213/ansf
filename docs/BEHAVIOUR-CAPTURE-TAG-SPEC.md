# Samurai Behaviour-Capture Tag — Spec (Layer ① foundation)

**What this is:** the data layer that makes Samurai's behaviour lens (replay, heatmaps, scroll/click maps, friction) *real and owned* instead of mocked or dependent on Microsoft Clarity. One tag → one event stream → many renders.

**Design principles**
1. **One stream, many renders.** The same capture feeds replay, heatmaps, friction signals, and behaviour analytics. We are not building "session replay" — we're building the behaviour-data foundation; replay is one output.
2. **Own it = white-label by construction.** Our tag, our backend, our player under our brand. No user ever leaves Samurai to a third-party UI.
3. **Privacy-first, not privacy-later.** Masking + consent are in the capture path, not bolted on.
4. **Outcome-linked.** Every session can join to enquiry → enrolment outcome → campaign/variant. This is the only part of replay that's actually differentiated.
5. **Don't reinvent capture.** Use **rrweb** (MIT, open-source — the engine Clarity/PostHog/OpenReplay are built on) for record + player.

---

## 1. Architecture (end to end)

```
JAIN pages  ──►  Samurai tag (rrweb)  ──►  batch + gzip  ──►  Ingestion API
                 • mask/consent in-path                         │
                                                                ▼
                                   ┌───────────────── Processing ─────────────────┐
                                   │ sessionize · identity-resolve · derive        │
                                   │ friction · link to CRM outcome + campaign/arm │
                                   └───────────────────────────────────────────────┘
                                         │                         │
                                         ▼                         ▼
                            Event store (columnar)        Object store (blobs)
                            metadata, events, aggregates   snapshots + mutation payloads
                                         │
                                         ▼
                        Serving: replay player · heatmaps · friction · analytics
                                   (filterable by outcome / campaign / variant)
```

---

## 2. Event schema

### Session envelope (one per session)
```json
{
  "session_id": "uuid",
  "visitor_id": "anon-persistent-id",      // cookie/localStorage, survives sessions
  "distinct_id": null,                      // set on form submit (hashed email/phone)
  "started_at": "2026-10-12T09:14:03Z",
  "ended_at": null,
  "page_url": "/online-mba",
  "entry": { "referrer": "...", "utm": {...}, "gclid": "...", "experiment_arm": "B" },
  "device": { "ua": "...", "os": "...", "browser": "...", "type": "mobile",
              "viewport": [375, 812], "dpr": 3 },
  "geo": { "country": "IN", "region": "KA" },   // coarse only
  "consent": { "granted": true, "ts": "..." }
}
```

### Events (ordered, each with `t` = ms offset from session start)
| Event | `type` | Payload (key fields) | Feeds |
|---|---|---|---|
| **Full snapshot** | `snapshot` | serialized DOM tree + CSS at load | Replay (start frame) |
| **DOM mutation** | `mutation` | adds/removes/attr/text/style changes | Replay |
| **Mouse move** | `mousemove` | sampled positions `[x,y,t]` (~50ms) | Replay, attention maps |
| **Interaction** | `click` / `dblclick` / `rage` | `x,y`, target node id, count | Replay, click maps, **friction** |
| **Scroll** | `scroll` | element id, `x,y` | Replay, scroll maps |
| **Input** | `input` | node id, **masked** value, isChecked | Replay (form behaviour) |
| **Viewport** | `resize` | `[w,h]` | Replay fidelity |
| **Navigation** | `nav` | from→to URL / SPA route | Sessionization, funnels |
| **Error** | `error` | message, source, stack | **Friction**, tech-health |
| **Custom** | `custom` | e.g. `form_submit`, `cta_click` | Analytics, identity hook |

> Maps 1:1 to rrweb's `FullSnapshot` / `IncrementalSnapshot(source=…)` types — we wrap them in this envelope and add session/identity/consent context rrweb doesn't carry.

### Derived (computed in processing, not captured)
`rage_clicks`, `dead_clicks` (click with no DOM effect), `quick_backs`, `thrash` (erratic mouse), `scroll_depth`, `time_on_element`, `form_abandonment`, `friction_score`. These power the Friction panel from the raw stream — no extra capture.

---

## 3. Identity & outcome linkage (the differentiator)

1. **Anonymous:** `visitor_id` assigned on first load (cookie/localStorage), persists across sessions.
2. **Capture source at entry:** UTM + `gclid` + `experiment_arm` stored on the session → replays/heatmaps filterable by campaign and variant.
3. **Identify on conversion:** on form submit, the tag emits a `custom:form_submit` with a **hashed** email/phone (`distinct_id`). We never store raw PII — we store the hash as the join key.
4. **Join to outcome:** the enrolment-outcome spine (`lead→qualified→applied→enrolled`, from the CRM) matches on the same hashed key → every session inherits its downstream outcome.

**Result Clarity/Hotjar can't match:** *"show me replays of sessions that became admissions,"* *"heatmap for Variant B of the MBA page,"* *"friction on sessions from the 'MBA fees' campaign that did NOT enrol."*

---

## 4. Privacy, masking & consent (mandatory — ed-tech student data)

- **Mask by default:** all inputs masked at capture (record *that* typing happened, not content) via rrweb `maskAllInputs`; mask text in `.samurai-mask` nodes.
- **Block entirely:** payment, ID (Aadhaar/passport), and any sensitive section via `blockSelector` — never enters the stream.
- **Hash, don't store PII:** email/phone are hashed client-side for the match key; raw values never leave the page.
- **Consent-gated:** no capture before consent under **GDPR** and **India's DPDP Act**; honour withdrawal; configurable per region.
- **Retention:** explicit TTL on recordings (e.g. 30–90 days) + deletion on request; coarse geo only; no capture in private/incognito if blocked.

This layer is non-negotiable and is a real part of the build cost.

---

## 5. Volume & storage strategy
- **Sample + compress:** throttle `mousemove` (~50ms), dedupe mutations, gzip batches, throttle snapshots.
- **Two stores:** columnar **event store** (e.g. ClickHouse — what PostHog/OpenReplay use) for metadata/events/aggregates + queryable analytics; **object store** for snapshot/mutation payloads (the "recordings").
- **Batch ingestion:** events buffered client-side, sent on interval / page-hide / size threshold to a lightweight ingestion API.

---

## 6. Recommended stack (don't reinvent)
- **Capture + player:** rrweb (`rrweb-record` on the tag, `rrweb-player` in Samurai's UI, rebranded).
- **Ingestion:** small stateless API (queue-backed).
- **Stores:** ClickHouse (events/analytics) + S3-compatible blob (payloads).
- **Processing:** async workers for sessionization, identity resolution, friction derivation, outcome join.

---

## 7. MVP phasing (stay out of the build trap)
- **v1 — Capture + replay:** tag (rrweb + masking + consent) → ingestion → store → branded replay player. Sessions tagged with UTM/arm. *This alone makes the behaviour lens real and owned.*
- **v2 — Heatmaps + scroll/click maps:** aggregate the same events (no new capture).
- **v3 — Friction signals + behaviour analytics:** derive rage/dead/quick-backs; sessionized funnels.
- **v4 — Outcome linkage:** join to the enrolment spine → outcome-filtered replays/heatmaps (the differentiator; depends on the CRM spine existing).

Everything after v1 reuses the v1 stream — no re-instrumentation.

---

## 8. Open decisions / dependencies
- **Consent mechanism** on JAIN's pages (banner / CMP) and default region behaviour.
- **Retention window** + deletion SLA (compliance sign-off).
- **Hashing scheme** for the email/phone match key (salt, algorithm) — must match what the CRM spine uses to join.
- **Hosting** of the event/blob stores (cost owner).
- **Tag install access** — JAIN's web team must add the Samurai tag to the pages.
- **Which identity key** is reliable in their forms (email vs phone; phone is often stronger in Indian ed-tech).

---

*Note: Samurai's existing behaviour lens (interaction map, scroll depth, journey, friction, session replay) is the **render target** — this spec is the real data layer that replaces the current seeded/mocked inputs feeding it.*
