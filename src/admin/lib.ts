import { useCallback, useEffect, useState } from 'react'
import { allTenants, type Tenant, type TenantStatus } from '@/lib/tenant'

/* The person running the Console. In a real build this comes from the operator's
   own auth; in the prototype it's a fixed identity. */
export const OPERATOR = { name: 'Samurai Operations', email: 'ops@samurai.io', initials: 'SO' }

/** Console routes — a tiny local state machine (no router dependency). */
export type ConsoleRoute =
  | { name: 'dashboard' }
  | { name: 'clients' }
  | { name: 'new' }
  | { name: 'client'; id: string }
  | { name: 'activity' }
  | { name: 'roles' }

export type Go = (r: ConsoleRoute) => void

/** Live view of every client. Re-reads when the product tab (self-serve signup)
    or another Console tab writes to the shared store. */
export function useClients() {
  const [clients, setClients] = useState<Tenant[]>(() => allTenants())
  const refresh = useCallback(() => setClients(allTenants()), [])
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key && e.key.startsWith('samurai.clients')) refresh() }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [refresh])
  return { clients, refresh }
}

/** Seed / legacy workspaces carry no explicit status and read as active. */
export const effectiveStatus = (t: Tenant): TenantStatus => t.status ?? 'active'

/** A client is "awaiting setup" when it's live-less and still open (not suspended,
    archived or deleted) — the client still has to sign in and connect their data. */
export const awaitingSetup = (t: Tenant): boolean => {
  const s = effectiveStatus(t)
  return !!t.fresh && s !== 'suspended' && s !== 'archived' && s !== 'deleted'
}

export type Tone = 'pos' | 'warn' | 'navy' | 'neutral' | 'neg' | 'brand'
type StatusChip = { label: string; tone: Tone; dot: string }
export const STATUS_META: Record<TenantStatus, StatusChip> = {
  active: { label: 'Active', tone: 'pos', dot: 'bg-pos' },
  provisioning: { label: 'Provisioning', tone: 'warn', dot: 'bg-warn' },
  invited: { label: 'Invite sent', tone: 'navy', dot: 'bg-navy' },
  suspended: { label: 'Suspended', tone: 'neutral', dot: 'bg-fg-subtle' },
  archived: { label: 'Archived', tone: 'neutral', dot: 'bg-fg-subtle' },
  deleted: { label: 'Deleted', tone: 'neg', dot: 'bg-neg' },
}

/** Offboarded = taken out of the active portfolio (suspended/archived/deleted). These
    drop out of funnel counts, the Live stat and the needs-attention queue, and are
    hidden from the default Clients list. */
export const isClosed = (t: Tenant): boolean => {
  const s = effectiveStatus(t)
  return s === 'suspended' || s === 'archived' || s === 'deleted'
}
export const isOffboarded = (t: Tenant): boolean => {
  const s = effectiveStatus(t)
  return s === 'archived' || s === 'deleted'
}

/** The badge to show in a row/header. Setup-completeness leads lifecycle so the
    badge and the "Awaiting setup" stat always agree: a workspace is only "Active"
    once it's actually live (not fresh). While still fresh we show where access is —
    provisioning / invite sent — else the catch-all "Awaiting setup". */
export function displayStatus(t: Tenant): StatusChip {
  const s = effectiveStatus(t)
  if (s === 'deleted') return STATUS_META.deleted
  if (s === 'archived') return STATUS_META.archived
  if (s === 'suspended') return STATUS_META.suspended
  if (!t.fresh) return STATUS_META.active
  if (s === 'provisioning') return STATUS_META.provisioning
  if (s === 'invited') return STATUS_META.invited
  return { label: 'Awaiting setup', tone: 'warn', dot: 'bg-warn' }
}

export function fmtDate(ts?: number): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Where the client signs in to the product, pre-selected to their workspace. */
export const workspaceUrl = (id: string): string => `${window.location.origin}/?tenant=${encodeURIComponent(id)}`

/** Copy helper that resolves whether it worked, so the UI can confirm honestly. */
export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true } catch { return false }
}
