import { DAY_MS, type Tenant } from './tenant'

/* ── Deterministic onboarding model ───────────────────────────────────────────
   One source of truth for "where is this client on the path to live", shared by
   the product (a client's own setup card) and the Console (funnel + per-client
   tracker) so the two can never disagree. Every step's `done` is computed from
   real tenant state — never a stored "progress", never a pre-seeded/auto-satisfied
   step, never a percentage (the steps are partly non-linear, so we count "N of 5").
   Thresholds are named, operator-visible constants — not data-derived. */

export const NUDGE_DAYS = 3 // invite unaccepted this long → nudge
export const STALL_DAYS = 5 // signed in, no data this long → stalled
export const ONBOARDING_SLA = 14 // any client in setup this long → review backstop
export const TRIAL_DAYS = 14 // trial window length (matches the Trial plan blurb)
export const TRIAL_ENDING_DAYS = 3 // flag a trial as "ending soon" within this many days

/* Trial clock. Honest anchor is access.activatedAt — the moment the client actually
   began, not when we provisioned them. Only meaningful for the trial plan. */
export type TrialState = { state: 'not_trial' | 'not_started' | 'active' | 'ended'; dayShown?: number; daysLeft?: number }
export function trialState(t: Tenant, now: number): TrialState {
  if (t.plan !== 'trial') return { state: 'not_trial' }
  const started = t.access?.activatedAt
  if (!started) return { state: 'not_started' }
  const elapsedDays = Math.floor((now - started) / DAY_MS)
  const daysLeft = TRIAL_DAYS - elapsedDays
  if (daysLeft <= 0) return { state: 'ended', dayShown: TRIAL_DAYS, daysLeft: 0 }
  return { state: 'active', dayShown: elapsedDays + 1, daysLeft }
}

export type OnbKey = 'provisioned' | 'access_shared' | 'signed_in' | 'data_connected' | 'live'

export interface OnbStep {
  key: OnbKey
  label: string // operator-facing
  clientLabel: string // shown in the client's own setup card
  done: boolean
  operatorOnly?: boolean // a step the operator performs (not counted in the client's "N of 5")
}

const isManaged = (t: Tenant) => t.source === 'operator' || t.source === 'self-serve'

/** The canonical step ladder for a client, each `done` derived from real state. */
export function onboardingSteps(t: Tenant): OnbStep[] {
  const selfServe = t.source === 'self-serve'
  const hasAccess = !!t.access?.invitedAt || selfServe
  const signedIn = t.access?.state === 'activated' || selfServe
  const connected = (t.conns?.length ?? 0) > 0
  return [
    { key: 'provisioned', label: 'Workspace & admin created', clientLabel: 'Workspace ready', done: true },
    { key: 'access_shared', label: 'Sign-in handed off', clientLabel: 'Sign-in shared', done: hasAccess, operatorOnly: true },
    { key: 'signed_in', label: 'Client signed in', clientLabel: 'You signed in', done: signedIn },
    { key: 'data_connected', label: 'Data connected', clientLabel: 'Connect your data', done: connected },
    // Live = not awaiting setup. The codebase marks live workspaces by omitting `fresh`
    // (undefined) and fresh ones with fresh:true, so "live" is fresh !== true.
    { key: 'live', label: 'Workspace live', clientLabel: 'Go live', done: t.fresh !== true },
  ]
}

/** The first genuinely-incomplete step — where "resume" should drop the client, and
    where the operator funnel buckets the tenant. Returns 'live' when all are done. */
export function onboardingStage(t: Tenant): OnbKey {
  const next = onboardingSteps(t).find((s) => !s.done)
  return next ? next.key : 'live'
}

/** Honest counts. `done/total` is the full operator ladder (/5). `clientSteps` drops the
    operator-only step; the client card (FreshOverview) further hides the implicit
    "signed in" step and renders its own "N of 3" off what's left. */
export function onboardingProgress(t: Tenant) {
  const steps = onboardingSteps(t)
  return {
    steps,
    done: steps.filter((s) => s.done).length,
    total: steps.length,
    clientSteps: steps.filter((s) => !s.operatorOnly),
    live: t.fresh !== true,
  }
}

/* ── Funnel ───────────────────────────────────────────────────────────────────
   Bucket each managed client by where it sits. Suspended is handled separately. */
export const FUNNEL: { key: string; label: string }[] = [
  { key: 'awaiting_signin', label: 'Awaiting sign-in' },
  { key: 'connecting', label: 'Connecting data' },
  { key: 'ready', label: 'Ready to go live' },
  { key: 'live', label: 'Live' },
]

export function funnelBucket(t: Tenant): string | null {
  if (!isManaged(t)) return null
  const s = t.status ?? 'active'
  if (s === 'suspended' || s === 'archived' || s === 'deleted') return null
  if (t.fresh !== true) return 'live'
  switch (onboardingStage(t)) {
    case 'access_shared':
    case 'signed_in':
      return 'awaiting_signin'
    case 'data_connected':
      return 'connecting'
    case 'live':
      return 'ready' // everything but the go-live flip is done
    default:
      return 'connecting'
  }
}

/* ── Stuck / needs-attention detection ────────────────────────────────────────
   Deterministic, time-based, and HONEST: a day-count is shown only where we store
   the clock for it (invitedAt / activatedAt / createdAt). Gated to managed, fresh,
   non-suspended clients and excludes true seed tenants — a "stall" on a tenant with
   no genuine provisioning record would be fabricated. Returns the single most-severe
   blocker, in plain language, with the one action that unblocks it. */
export type StuckAction = 'resend' | 'open'
export interface Stuck {
  key: 'expired' | 'waiting' | 'nodata' | 'overdue' | 'trial'
  label: string
  action: StuckAction
  severity: number // higher = more urgent; used to sort the queue
}

const daysLabel = (ms: number) => `${Math.floor(ms / DAY_MS)}d`

export function stuckReason(t: Tenant, now: number): Stuck | null {
  if (!isManaged(t) || t.source === 'seed') return null
  const status = t.status ?? 'active'
  if (status === 'suspended' || status === 'archived' || status === 'deleted') return null

  // Trial ending — applies whether the client is still in setup OR already live.
  if (t.plan === 'trial') {
    const tr = trialState(t, now)
    if (tr.state === 'ended') return { key: 'trial', label: 'Trial ended', action: 'open', severity: 4 }
    if (tr.state === 'active' && (tr.daysLeft ?? 99) <= TRIAL_ENDING_DAYS) return { key: 'trial', label: `Trial ends in ${tr.daysLeft}d`, action: 'open', severity: 3 }
  }

  // The onboarding-stall rules below only apply while the client is still in setup.
  if (t.fresh !== true) return null
  const a = t.access

  // Invite/credentials handoff expired before the client used it.
  if (a && a.state === 'pending' && a.expiresAt && now > a.expiresAt)
    return { key: 'expired', label: 'Sign-in expired — resend', action: 'resend', severity: 5 }

  // Handoff shared but never used after the nudge window.
  if (a && a.state === 'pending' && a.invitedAt && now - a.invitedAt > NUDGE_DAYS * DAY_MS)
    return { key: 'waiting', label: `Waiting on sign-in · ${daysLabel(now - a.invitedAt)}`, action: 'resend', severity: 4 }

  // Signed in but no data connected after the stall window (needs a real activatedAt clock).
  if (a && a.state === 'activated' && (t.conns?.length ?? 0) === 0 && a.activatedAt && now - a.activatedAt > STALL_DAYS * DAY_MS)
    return { key: 'nodata', label: `Signed in, no data · ${daysLabel(now - a.activatedAt)}`, action: 'open', severity: 4 }

  // Backstop: anything sitting in setup past the SLA, whatever the specific step.
  if (t.createdAt && now - t.createdAt > ONBOARDING_SLA * DAY_MS)
    return { key: 'overdue', label: `In setup ${daysLabel(now - t.createdAt)} — review`, action: 'open', severity: 3 }

  return null
}
