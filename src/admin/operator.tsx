import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { OPERATOR } from './lib'
import type { AuditActor } from '@/lib/audit'

/* ── Operator roles (prototype) ───────────────────────────────────────────────
   There is ONE real operator identity (OPERATOR). Roles are a DETERMINISTIC
   capability map, not real auth — the role switcher is an un-enforced PREVIEW of
   what each role would see/do. Gating also lives in each Console handler (not only
   the disabled button), so cosmetic hiding can't be bypassed. Three roles is the
   right scale for a handful of operator actions; more would be build-trap. */

export type OperatorRole = 'admin' | 'csm' | 'support'
export type Capability = 'create' | 'handoff' | 'suspend' | 'offboard' | 'plan' | 'tag' | 'open' | 'bulk' | 'assign-roles'

export const ROLE_META: Record<OperatorRole, { label: string; blurb: string }> = {
  admin: { label: 'Operations admin', blurb: 'Full access — provisioning, lifecycle, plans and roles.' },
  csm: { label: 'Onboarding / CSM', blurb: 'Provision clients and hand off sign-in. No suspend, plan or offboard.' },
  support: { label: 'Support', blurb: 'Read-only, plus open a workspace to help. No changes.' },
}

const CAPS: Record<OperatorRole, Set<Capability>> = {
  admin: new Set<Capability>(['create', 'handoff', 'suspend', 'offboard', 'plan', 'tag', 'open', 'bulk', 'assign-roles']),
  csm: new Set<Capability>(['create', 'handoff', 'tag', 'open']),
  support: new Set<Capability>(['open']),
}

export const ALL_CAPS: Capability[] = ['create', 'handoff', 'tag', 'open', 'suspend', 'plan', 'offboard', 'bulk', 'assign-roles']
export const CAP_LABEL: Record<Capability, string> = {
  create: 'Create clients',
  handoff: 'Resend / regenerate sign-in',
  tag: 'Edit tag & details',
  open: 'Open workspace (view-as)',
  suspend: 'Suspend / reactivate',
  plan: 'Change plan & limits',
  offboard: 'Archive / delete / restore',
  bulk: 'Bulk actions',
  'assign-roles': 'Assign roles',
}

export const roleCan = (role: OperatorRole, cap: Capability): boolean => CAPS[role].has(cap)

const ROLE_KEY = 'samurai.operator.role'
function readRole(): OperatorRole {
  try { const r = localStorage.getItem(ROLE_KEY); if (r === 'csm' || r === 'support' || r === 'admin') return r } catch { /* ignore */ }
  return 'admin'
}

const Ctx = createContext<{
  role: OperatorRole
  setRole: (r: OperatorRole) => void
  can: (cap: Capability) => boolean
  operator: typeof OPERATOR
}>({ role: 'admin', setRole: () => {}, can: () => true, operator: OPERATOR })

export function OperatorProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<OperatorRole>(readRole)
  const setRole = useCallback((r: OperatorRole) => { try { localStorage.setItem(ROLE_KEY, r) } catch { /* ignore */ } setRoleState(r) }, [])
  const can = useCallback((cap: Capability) => roleCan(role, cap), [role])
  return <Ctx.Provider value={{ role, setRole, can, operator: OPERATOR }}>{children}</Ctx.Provider>
}

export const useOperator = () => useContext(Ctx)

/** The actor stamp for an audit event — the real operator plus the active role. */
export function operatorActor(role: OperatorRole): AuditActor {
  return { type: 'operator', id: 'operator', name: OPERATOR.name, email: OPERATOR.email, role: ROLE_META[role].label }
}
