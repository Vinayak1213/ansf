import { useCallback, useEffect, useState } from 'react'

/* ── Audit log (prototype) ────────────────────────────────────────────────────
   An append-only record of operator (and some client) actions. Lives in its OWN
   sibling localStorage key — NOT inside the clients store — so appending a log
   entry never re-renders the clients list. Honest by construction: it starts
   EMPTY (no backfilled history), records only facts we actually have, and never
   stores a one-time secret (invite token / temp password). It is tamper-EVIDENT
   at best in a prototype (localStorage is editable from devtools); production adds
   server-side immutability + retention — stated plainly in the UI, not faked. */

export const AUDIT_KEY = 'samurai.audit.v1'
const AUDIT_PING = 'samurai:audit' // same-tab refresh signal (storage event only fires cross-tab)

export type AuditAction =
  | 'client.created'
  | 'client.invited'
  | 'client.credentials.issued'
  | 'client.invite.resent'
  | 'client.credentials.regenerated'
  | 'client.signin.recorded'
  | 'client.suspended'
  | 'client.reactivated'
  | 'client.plan.changed'
  | 'client.updated'
  | 'client.workspace.opened'
  | 'client.workspace.closed'
  | 'self-serve.signup'
  | 'client.archived'
  | 'client.deleted'
  | 'client.restored'
  | 'client.purged'

export interface AuditActor { type: 'operator' | 'client' | 'system'; id: string; name: string; email?: string; role?: string }
export interface AuditTarget { type: 'client'; id: string; name: string }

export interface AuditEvent {
  id: string
  seq: number // monotonic — a gap is visible
  ts: number
  action: AuditAction
  actor: AuditActor
  target?: AuditTarget
  changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> }
  reason?: string
  note?: string
  source: 'console' | 'self-serve' | 'seed'
  schemaVersion: 1
}

function genId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  } catch { /* ignore */ }
  return 'ae-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function load(): AuditEvent[] {
  try {
    const raw = localStorage.getItem(AUDIT_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? (parsed as AuditEvent[]) : []
  } catch { return [] }
}
function save(events: AuditEvent[]) {
  try {
    localStorage.setItem(AUDIT_KEY, JSON.stringify(events))
    window.dispatchEvent(new Event(AUDIT_PING)) // same-tab listeners refresh
  } catch { /* ignore */ }
}

export function loadAudit(): AuditEvent[] { return load() }

/** The ONLY writer. Appends one event; never edits or deletes. */
export function logAudit(e: Omit<AuditEvent, 'id' | 'seq' | 'ts' | 'schemaVersion'>): AuditEvent {
  const all = load()
  const seq = (all.length ? all[all.length - 1].seq : 0) + 1
  const evt: AuditEvent = { ...e, id: genId(), seq, ts: Date.now(), schemaVersion: 1 }
  save([...all, evt])
  return evt
}

/** Live view, newest-first. Refreshes on same-tab appends and cross-tab writes. */
export function useAudit() {
  const [events, setEvents] = useState<AuditEvent[]>(() => load())
  const refresh = useCallback(() => setEvents(load()), [])
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === AUDIT_KEY) refresh() }
    window.addEventListener('storage', onStorage)
    window.addEventListener(AUDIT_PING, refresh)
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener(AUDIT_PING, refresh) }
  }, [refresh])
  const newestFirst = [...events].sort((a, b) => b.seq - a.seq)
  return { events: newestFirst, refresh }
}

/* ── Human-readable rendering ─────────────────────────────────────────────────
   Each line is a plain, non-technical sentence; the raw before→after sits behind
   a disclosure in the UI. */
const VERB: Record<AuditAction, string> = {
  'client.created': 'created',
  'client.invited': 'sent an invite to',
  'client.credentials.issued': 'issued one-time credentials for',
  'client.invite.resent': 'resent the invite to',
  'client.credentials.regenerated': 'regenerated the password for',
  'client.signin.recorded': 'recorded first sign-in for',
  'client.suspended': 'suspended',
  'client.reactivated': 'reactivated',
  'client.plan.changed': 'changed the plan for',
  'client.updated': 'updated',
  'client.workspace.opened': 'opened the workspace of',
  'client.workspace.closed': 'closed the workspace of',
  'self-serve.signup': 'completed setup for',
  'client.archived': 'archived',
  'client.deleted': 'deleted',
  'client.restored': 'restored',
  'client.purged': 'permanently removed',
}
export const actionVerb = (a: AuditAction): string => VERB[a] ?? a

export function auditSentence(e: AuditEvent): string {
  const who = e.actor.name
  const what = e.target?.name ? ` ${e.target.name}` : ''
  return `${who} ${actionVerb(e.action)}${what}`
}

export function auditTime(ts: number): string {
  return new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** CSV export of the raw events (honest columns only). */
export function auditToCsv(events: AuditEvent[]): string {
  const head = ['seq', 'timestamp', 'action', 'actor', 'actor_role', 'target', 'reason', 'note']
  const rows = events.map((e) => [
    e.seq,
    new Date(e.ts).toISOString(),
    e.action,
    e.actor.name,
    e.actor.role ?? '',
    e.target?.name ?? '',
    (e.reason ?? '').replace(/"/g, '""'),
    (e.note ?? '').replace(/"/g, '""'),
  ])
  return [head, ...rows].map((r) => r.map((c) => `"${String(c)}"`).join(',')).join('\n')
}
