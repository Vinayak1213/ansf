import { useMemo } from 'react'
import { motion } from 'motion/react'
import { AlertTriangle, ArrowRight, CheckCircle2, Plus } from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import { cn } from '@/lib/utils'
import { FUNNEL, funnelBucket, stuckReason, type Stuck } from '@/lib/onboarding'
import type { Tenant } from '@/lib/tenant'
import { displayStatus, fmtDate, isClosed, isOffboarded, useClients, type Go } from './lib'
import { useOperator } from './operator'

export function Dashboard({ go }: { go: Go }) {
  const { clients } = useClients()
  const { can } = useOperator()
  const now = Date.now()

  const view = useMemo(() => {
    const managed = clients.filter((c) => c.source === 'operator' || c.source === 'self-serve')
    const stuck = managed
      .map((t) => ({ t, s: stuckReason(t, now) }))
      .filter((x): x is { t: Tenant; s: Stuck } => !!x.s)
      .sort((a, b) => b.s.severity - a.s.severity)
    const buckets = FUNNEL.map((f) => ({ ...f, count: managed.filter((t) => funnelBucket(t) === f.key).length }))
    const recent = [...managed].filter((t) => t.createdAt && !isOffboarded(t)).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 5)
    return {
      stuck,
      buckets,
      recent,
      maxCount: Math.max(1, ...buckets.map((b) => b.count)),
      live: managed.filter((t) => t.fresh !== true && !isClosed(t)).length,
      inSetup: managed.filter((t) => t.fresh === true && !isClosed(t)).length,
      suspended: managed.filter((t) => (t.status ?? 'active') === 'suspended').length,
    }
  }, [clients, now])

  return (
    <div className="mx-auto max-w-[1040px] px-6 py-7">
      <div className="mb-5 flex items-end gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-fg">Dashboard</h1>
          <p className="mt-0.5 text-[13px] text-fg-subtle">Where every client sits on the path to live — and who needs a nudge to get there.</p>
        </div>
        <Button variant="navy" size="md" className="ml-auto shrink-0" disabled={!can('create')} title={can('create') ? undefined : 'Your role can’t create clients'} onClick={() => go({ name: 'new' })}><Plus className="h-4 w-4" /> New client</Button>
      </div>

      {/* stat strip — lead with the actionable count, not a vanity total */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Needs a nudge" value={view.stuck.length} tone={view.stuck.length ? 'warn' : 'muted'} />
        <StatTile label="In setup" value={view.inSetup} />
        <StatTile label="Live" value={view.live} tone="pos" />
        <StatTile label="Suspended" value={view.suspended} tone="muted" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        {/* funnel */}
        <Card className="p-5">
          <div className="mb-3 text-[14px] font-semibold tracking-tight text-fg">Clients by stage</div>
          <div className="space-y-2.5">
            {view.buckets.map((b) => (
              <div key={b.key} className="flex items-center gap-3">
                <span className="w-[116px] shrink-0 text-right text-[12px] text-fg-muted">{b.label}</span>
                <div className="relative h-6 flex-1 overflow-hidden rounded-[6px] bg-sunken">
                  <motion.span
                    className={cn('absolute inset-y-0 left-0 rounded-[6px]', b.key === 'live' ? 'bg-pos' : 'bg-navy')}
                    initial={{ width: 0 }}
                    animate={{ width: `${(b.count / view.maxCount) * 100}%` }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-[13px] font-semibold tabular-nums text-fg">{b.count}</span>
              </div>
            ))}
          </div>
          {view.suspended > 0 && <p className="mt-3 text-[11.5px] text-fg-subtle">+ {view.suspended} suspended (excluded from the funnel)</p>}
        </Card>

        {/* needs-attention queue */}
        <Card className="flex flex-col p-5">
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-[14px] font-semibold tracking-tight text-fg">Needs attention</span>
            {view.stuck.length > 0 && <Badge tone="warn">{view.stuck.length}</Badge>}
          </div>
          {view.stuck.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="mb-2 h-6 w-6 text-pos" />
              <p className="text-[13px] text-fg-muted">Everyone's on track.</p>
              <p className="mt-0.5 text-[11.5px] text-fg-subtle">No stalled sign-ins or setups.</p>
            </div>
          ) : (
            <div className="-mx-1.5 space-y-0.5">
              {view.stuck.map(({ t, s }) => (
                <button key={t.id} onClick={() => go({ name: 'client', id: t.id })} className="group flex w-full items-center gap-2.5 rounded-[9px] px-1.5 py-2 text-left transition-colors hover:bg-sunken/60">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-navy text-[11px] font-bold text-white">{t.initials}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-fg">{t.name}</span>
                    <span className={cn('flex items-center gap-1 text-[11.5px]', s.severity >= 5 ? 'text-neg' : 'text-warn')}>
                      <AlertTriangle className="h-3 w-3 shrink-0" />{s.label}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] font-medium text-navy opacity-0 transition-opacity group-hover:opacity-100">{s.action === 'resend' ? 'Resend' : 'Open'}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-fg-subtle" />
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* recently provisioned */}
      <Card className="mt-4 overflow-hidden">
        <div className="border-b border-line px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-fg-subtle">Recently provisioned</div>
        {view.recent.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-fg-muted">No clients yet. Create your first from “New client”.</p>
        ) : (
          view.recent.map((t) => {
            const st = displayStatus(t)
            return (
              <button key={t.id} onClick={() => go({ name: 'client', id: t.id })} className="flex w-full items-center gap-3 border-b border-line px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-sunken/50">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[7px] bg-navy text-[10px] font-bold text-white">{t.initials}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-fg">{t.name}</span>
                <Badge tone={st.tone}><span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}</Badge>
                <span className="hidden w-24 shrink-0 text-right text-[12px] text-fg-subtle sm:block">{fmtDate(t.createdAt)}</span>
              </button>
            )
          })
        )}
      </Card>
    </div>
  )
}

function StatTile({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'pos' | 'warn' | 'muted' }) {
  const color = tone === 'pos' ? 'text-pos' : tone === 'warn' ? 'text-warn' : tone === 'muted' ? 'text-fg-subtle' : 'text-fg'
  return (
    <Card className="px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">{label}</div>
      <div className={cn('mt-1 text-[24px] font-semibold tabular-nums tracking-tight', color)}>{value}</div>
    </Card>
  )
}
