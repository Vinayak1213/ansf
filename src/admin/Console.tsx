import { useState } from 'react'
import { motion } from 'motion/react'
import { Boxes, KeyRound, LayoutDashboard, ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToastProvider } from '@/components/Toast'
import { type ConsoleRoute, type Go } from './lib'
import { OperatorProvider, ROLE_META, useOperator, type OperatorRole } from './operator'
import { Dashboard } from './Dashboard'
import { ClientsList } from './ClientsList'
import { CreateClient } from './CreateClient'
import { ClientDetail } from './ClientDetail'
import { Activity } from './Activity'
import { AccessRoles } from './AccessRoles'

export function Console() {
  const [route, setRoute] = useState<ConsoleRoute>({ name: 'dashboard' })
  const go: Go = (r) => { setRoute(r); window.scrollTo({ top: 0 }) }

  return (
    <OperatorProvider>
      <ToastProvider>
        <div className="flex min-h-screen bg-surface text-fg">
          <ConsoleSidebar route={route} go={go} />
          <div className="flex min-w-0 flex-1 flex-col">
            <ConsoleTopbar route={route} go={go} />
            <main className="flex-1">
              {route.name === 'dashboard' && <Dashboard go={go} />}
              {route.name === 'clients' && <ClientsList go={go} />}
              {route.name === 'new' && <CreateClient go={go} />}
              {route.name === 'client' && <ClientDetail id={route.id} go={go} />}
              {route.name === 'activity' && <Activity go={go} />}
              {route.name === 'roles' && <AccessRoles />}
            </main>
          </div>
        </div>
      </ToastProvider>
    </OperatorProvider>
  )
}

/* ── Sidebar ───────────────────────────────────────────────────────────────── */
type NavId = 'dashboard' | 'clients' | 'activity' | 'roles'
const NAV: { id: NavId; label: string; icon: typeof Boxes }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clients', label: 'Clients', icon: Boxes },
  { id: 'activity', label: 'Activity', icon: ScrollText },
  { id: 'roles', label: 'Access & roles', icon: KeyRound },
]
const ROLES: OperatorRole[] = ['admin', 'csm', 'support']

function activeNav(route: ConsoleRoute): NavId {
  if (route.name === 'activity') return 'activity'
  if (route.name === 'roles') return 'roles'
  if (route.name === 'dashboard') return 'dashboard'
  return 'clients'
}

function ConsoleSidebar({ route, go }: { route: ConsoleRoute; go: Go }) {
  const { role, setRole, operator } = useOperator()
  const activeId = activeNav(route)
  return (
    <aside className="sticky top-0 z-30 flex h-screen w-[232px] shrink-0 flex-col overflow-hidden border-r border-line bg-canvas">
      {/* brand */}
      <div className="flex h-14 items-center gap-2.5 px-4">
        <div className="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] bg-navy shadow-[inset_0_1px_0_rgba(255,255,255,.28)]">
          <span className="block h-2 w-2 rounded-full bg-white" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-fg">Samurai</span>
        <span className="rounded-[5px] border border-navy/15 bg-navy-tint px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-navy">Console</span>
      </div>

      <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">Operations</div>
      <nav className="flex flex-col gap-0.5 px-2.5">
        {NAV.map((n) => {
          const Icon = n.icon
          const on = activeId === n.id
          return (
            <button
              key={n.id}
              onClick={() => go({ name: n.id })}
              aria-current={on}
              className={cn(
                'relative flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[14px] font-medium transition-colors',
                on ? 'bg-navy-tint text-navy' : 'text-fg-muted hover:bg-sunken hover:text-fg',
              )}
            >
              {on && <motion.span layoutId="console-nav" className="absolute inset-0 -z-10 rounded-[9px] bg-navy-tint" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {n.label}
            </button>
          )
        })}
      </nav>

      {/* footer — role preview + operator identity + environment */}
      <div className="mt-auto border-t border-line p-2.5">
        <div className="mb-2">
          <div className="mb-1 px-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">Preview role</div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as OperatorRole)}
            title="Not enforced by a server — previews what each role can do"
            className="h-8 w-full rounded-[8px] border border-line bg-panel px-2 text-[12px] text-fg outline-none focus:border-navy"
          >
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
          </select>
        </div>
        <div className="mb-2 flex items-center gap-1.5 rounded-[8px] bg-warn-tint px-2.5 py-1.5 text-[11px] font-medium text-warn">
          <span className="h-1.5 w-1.5 rounded-full bg-warn" />
          Prototype · nothing is emailed
        </div>
        <div className="flex items-center gap-2.5 rounded-[9px] px-2.5 py-2">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-navy text-[11px] font-semibold text-white">{operator.initials}</div>
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-medium text-fg">{operator.name}</div>
            <div className="truncate text-[11px] text-fg-subtle">{ROLE_META[role].label}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

/* ── Topbar ────────────────────────────────────────────────────────────────── */
function ConsoleTopbar({ route, go }: { route: ConsoleRoute; go: Go }) {
  const crumb =
    route.name === 'new' ? 'New client'
    : route.name === 'client' ? 'Client'
    : route.name === 'clients' ? 'Clients'
    : route.name === 'activity' ? 'Activity'
    : route.name === 'roles' ? 'Access & roles'
    : 'Dashboard'
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-canvas/85 px-4 backdrop-blur-md backdrop-saturate-150">
      <button onClick={() => go({ name: 'dashboard' })} className="text-[13px] font-medium text-fg-muted transition-colors hover:text-fg">Operations</button>
      <span className="text-fg-subtle">/</span>
      <span className="text-[13px] font-medium text-fg">{crumb}</span>
      <div className="ml-auto flex items-center gap-2 text-[13px] font-medium text-fg-muted">
        <span className="hidden items-center gap-1.5 sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-pos" />
          Store live
        </span>
      </div>
    </header>
  )
}
