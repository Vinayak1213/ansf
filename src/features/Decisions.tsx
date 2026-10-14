import { useState } from 'react'
import { motion } from 'motion/react'
import { ArrowUpRight, Check, Clock, Rocket, TriangleAlert, Undo2 } from 'lucide-react'
import { useNav } from '@/lib/nav'
import { Button, Card } from '@/components/ui'
import { cn, inr, num } from '@/lib/utils'
import { C } from '@/lib/tokens'
import { decisions, type Decision, type DecisionArm, type DecisionKind } from '@/data/decisions'

const KIND: Record<DecisionKind, { label: string; chip: string; accent: string; icon: typeof Rocket }> = {
  flip: { label: 'Needs a call', chip: 'bg-warn-tint text-warn', accent: 'border-warn/35', icon: TriangleAlert },
  rollback: { label: 'Roll back', chip: 'bg-neg-tint text-neg', accent: 'border-neg/25', icon: Undo2 },
  ship: { label: 'Ship it', chip: 'bg-pos-tint text-pos', accent: 'border-pos/25', icon: Rocket },
  early: { label: 'Collecting', chip: 'bg-sunken text-fg-muted', accent: 'border-line', icon: Clock },
}

export function Decisions() {
  const list = decisions()
  const toCall = list.filter((d) => d.kind !== 'early').length
  const waiting = list.length - toCall

  return (
    <div className="mx-auto max-w-[940px] px-8 py-7">
      <div className="mb-4">
        <h1 className="text-[22px] font-semibold tracking-tight text-fg">Decisions</h1>
        <p className="mt-0.5 text-[13px] text-fg-subtle">What to ship, hold or roll back today — judged on <b className="text-fg-muted">qualified leads</b>, not just form-fills.</p>
      </div>

      {/* method — why these calls are trustworthy (the one input is labelled) */}
      <Card className="mb-5 flex items-start gap-2.5 border-navy/15 bg-navy-tint/30 p-4">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
        <p className="text-[12.5px] leading-relaxed text-fg-muted">
          Each arm's leads are joined to their <b className="text-fg">CRM sales-qualified rate</b>, so Samurai calls the winner on qualified leads — not form-fills. A variant can win the A/B test on volume and still lose you money. <span className="text-fg-subtle">The only input is the CRM qualified rate; enquiries, cost and qualified counts are all derived.</span>
        </p>
      </Card>

      <div className="mb-3 flex items-center gap-4 text-[12.5px] text-fg-subtle">
        <span><b className="text-fg">{toCall}</b> to decide today</span>
        <span className="text-line-strong">·</span>
        <span><b className="text-fg-muted">{waiting}</b> waiting on data</span>
      </div>

      <div className="space-y-4">
        {list.map((d) => <DecisionCard key={d.e.id} d={d} />)}
      </div>
    </div>
  )
}

function DecisionCard({ d }: { d: Decision }) {
  const { go } = useNav()
  const k = KIND[d.kind]
  const Icon = k.icon
  const [decided, setDecided] = useState<string | null>(null)

  return (
    <Card className={cn('overflow-hidden border p-0', k.accent)}>
      {/* head */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
        <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide', k.chip)}><Icon className="h-3.5 w-3.5" />{k.label}</span>
        <b className="text-[14px] font-semibold text-fg">{d.e.name}</b>
        <span className="text-[12px] text-fg-subtle">· {d.e.group}</span>
        <button onClick={() => go('experimentdetail', d.e.id)} className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-navy hover:text-navy-hover">Open test <ArrowUpRight className="h-3.5 w-3.5" /></button>
      </div>

      <div className="px-5 py-4">
        <div className="text-[14px] font-semibold text-fg">{d.headline}</div>

        {/* per-arm: enquiries vs qualified, so the flip is visible */}
        <div className="mt-3.5 space-y-2.5">
          <div className="grid grid-cols-[52px_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
            <span>Ver.</span><span>Enquiries</span><span>Qualified</span><span className="text-right">₹ / qual</span>
          </div>
          {d.arms.map((a) => <ArmRow key={a.key} a={a} d={d} />)}
        </div>

        <p className="mt-3.5 text-[12.5px] leading-relaxed text-fg-muted">{d.detail}</p>
        <p className="mt-1 text-[11.5px] italic text-fg-subtle">{d.uncertainty}</p>

        {/* action */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-line pt-3.5">
          {decided ? (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-pos"><Check className="h-4 w-4" /> {decided} — logged <button onClick={() => setDecided(null)} className="ml-1 text-[11.5px] font-normal text-fg-subtle underline hover:text-fg-muted">undo</button></span>
          ) : d.kind === 'early' ? (
            <span className="text-[12.5px] text-fg-subtle">No call yet — <b className="text-fg-muted">keep testing</b>.</span>
          ) : (
            <>
              <Button variant={d.kind === 'rollback' ? 'danger' : d.kind === 'flip' ? 'navy' : 'primary'} size="sm" onClick={() => setDecided(d.action)}>{d.action}</Button>
              {d.kind === 'flip' && <Button variant="default" size="sm" onClick={() => setDecided(`Shipped ${d.leadLeader.label} anyway`)}>Ship {d.leadLeader.label} anyway</Button>}
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

function ArmRow({ a, d }: { a: DecisionArm; d: Decision }) {
  const isLeadLeader = a.key === d.leadLeader.key
  const isQualLeader = a.key === d.qualLeader.key
  const label = a.label.replace('Version ', 'V').replace('Control (A)', 'Control').replace('Variant B', 'Variant')
  return (
    <div className="grid grid-cols-[52px_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 text-[12px]">
      <span className="truncate font-medium text-fg">{label}</span>
      {/* enquiries */}
      <div className="flex min-w-0 items-center gap-1.5">
        <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-sunken">
          <motion.i className="block h-full rounded-full" style={{ background: C.navy, opacity: isLeadLeader ? 1 : 0.5 }} initial={{ width: 0 }} animate={{ width: `${(a.leads / d.maxLeads) * 100}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
        </div>
        <b className="tnum shrink-0 text-fg">{num(a.leads)}</b>
        {isLeadLeader && <span className="shrink-0 rounded bg-navy-tint px-1 text-[8px] font-bold uppercase leading-[1.5] text-navy">most</span>}
      </div>
      {/* qualified */}
      <div className="flex min-w-0 items-center gap-1.5">
        <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-sunken">
          <motion.i className="block h-full rounded-full" style={{ background: C.pos, opacity: isQualLeader ? 1 : 0.5 }} initial={{ width: 0 }} animate={{ width: `${(a.qualified / d.maxQual) * 100}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
        </div>
        <span className="tnum shrink-0 whitespace-nowrap text-fg"><b>{num(a.qualified)}</b> <span className="text-fg-subtle">{Math.round(a.qualRate * 100)}%</span></span>
        {isQualLeader && <span className="shrink-0 rounded bg-pos-tint px-1 text-[8px] font-bold uppercase leading-[1.5] text-pos">most</span>}
      </div>
      <span className="tnum shrink-0 whitespace-nowrap text-right text-[11.5px] text-fg-muted">{a.cpql != null ? inr(a.cpql) : '—'}</span>
    </div>
  )
}
