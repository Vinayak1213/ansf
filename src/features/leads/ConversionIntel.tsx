import { motion } from 'motion/react'
import { useMemo } from 'react'
import { Ban, CalendarX, ChevronRight, ChevronsDown, ClipboardList, Info, LogOut, MousePointerClick, Smartphone, Target, Timer, Wrench } from 'lucide-react'
import { Card, SectionHead } from '@/components/ui'
import { cn, inr } from '@/lib/utils'
import { useNav } from '@/lib/nav'
import { leadOpportunities, type Finding, type IssueKind, type Viz as VizSpec } from '@/data/leadOpportunities'

/* "Where you're losing leads" — a conversion DIAGNOSTIC, deliberately not styled like the alerts feed.
   No severity rails, chips or money-at-stake: each item is an icon-led opportunity with a small inline
   visual that SHOWS the gap and the fix as its own block. Measured facts only; no estimated uplift. */

const KIND_ICON: Record<IssueKind, typeof Smartphone> = {
  device: Smartphone,
  form: ClipboardList,
  validation: Ban,
  slowfield: Timer,
  reach: ChevronsDown,
  bounce: LogOut,
  friction: MousePointerClick,
}

export function ConversionIntel({ pageId }: { pageId?: string }) {
  const { go } = useNav()
  const data = useMemo(() => leadOpportunities(pageId), [pageId])
  const scoped = !!pageId

  const shell = (children: React.ReactNode) => (
    <Card className="p-5">
      <SectionHead title="Where you're losing leads" hint={scoped ? 'on this page' : 'across your pages'} icon={<Target className="h-4 w-4" />} />
      {children}
    </Card>
  )

  if (data.status === 'closed') {
    return shell(
      <div className="flex items-start gap-2 rounded-[10px] bg-sunken px-3.5 py-3 text-[13px] leading-relaxed text-fg-muted">
        <CalendarX className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" />
        <span>{data.reason}</span>
      </div>,
    )
  }
  if (data.status === 'thin' || data.status === 'no_traffic') {
    return shell(
      <div className="flex items-start gap-2 rounded-[10px] bg-sunken px-3.5 py-3 text-[13px] leading-relaxed text-fg-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" />
        <span>{data.reason}</span>
      </div>,
    )
  }
  if (data.status === 'healthy' || data.findings.length === 0) {
    return shell(<div className="rounded-[10px] bg-pos-tint/40 px-3.5 py-3 text-[13px] leading-relaxed text-fg">{data.topLine}</div>)
  }

  return shell(
    <div className="space-y-3">
      <p className="text-[12.5px] leading-relaxed text-fg-muted">{data.topLine}</p>
      <div className="grid grid-cols-1 gap-3">
        {data.findings.map((f, i) => (
          <DiagnosticCard key={f.pageId ? f.pageId + f.k : f.k} f={f} index={i} onOpen={f.pageId ? () => go('pagedetail', f.pageId!) : undefined} />
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-fg-subtle">Read from this page's reconciled data — measured, not estimated. Validate any fix with an A/B test before rolling it out.</p>
    </div>,
  )
}

function DiagnosticCard({ f, index, onOpen }: { f: Finding; index: number; onOpen?: () => void }) {
  const Icon = KIND_ICON[f.k]
  const body = (
    <>
      <div className="flex gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-navy-tint text-navy"><Icon className="h-[19px] w-[19px]" /></span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-fg">{f.title}</div>
          {f.pageName && <div className="truncate text-[11.5px] text-fg-subtle">{f.pageName}</div>}
          <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">{f.detail}</p>
          {f.viz && <VizBlock viz={f.viz} />}
          {f.money != null && f.money > 0 && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-sunken px-2.5 py-1 text-[11.5px] text-fg-muted">
              <span className="tnum font-semibold text-fg">{inr(f.money)}</span> ad spend reaches these visitors
            </div>
          )}
        </div>
      </div>

      {/* the fix — its own block, so it reads as a solution, not an alert's "do this" */}
      <div className="mt-3.5 flex items-start gap-2 rounded-[10px] border border-line bg-sunken/50 px-3 py-2.5">
        <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-navy">The fix</div>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-fg">{f.action}</p>
        </div>
        {onOpen && <ChevronRight className="ml-auto mt-0.5 h-4 w-4 shrink-0 self-center text-fg-subtle transition-transform group-hover:translate-x-0.5" />}
      </div>
    </>
  )
  const cls = 'rounded-[13px] border border-line bg-panel p-4'
  if (onOpen) return <button onClick={onOpen} className={cn(cls, 'group block w-full text-left transition-colors hover:border-navy/25 hover:bg-sunken/20')}>{body}</button>
  return <motion.div className={cls} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: index * 0.06 }}>{body}</motion.div>
}

const TONE: Record<'bad' | 'base' | 'good', string> = { bad: 'bg-neg', base: 'bg-navy/35', good: 'bg-pos' }

function VizBlock({ viz }: { viz: VizSpec }) {
  if (!viz) return null
  if (viz.type === 'meter') {
    return (
      <div className="mt-2.5 max-w-[340px]">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-sunken">
            <motion.i className="block h-full rounded-full bg-navy" initial={{ width: 0 }} animate={{ width: `${viz.pct}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
          </div>
          <span className="tnum w-12 shrink-0 text-right text-[13px] font-bold text-fg">{viz.value}</span>
        </div>
        <div className="mt-1 text-[11px] text-fg-subtle">{viz.caption}</div>
      </div>
    )
  }
  return (
    <div className="mt-2.5 max-w-[340px] space-y-1.5">
      {viz.rows.map((r, i) => (
        <div key={r.label} className="flex items-center gap-2.5">
          <span className="w-14 shrink-0 text-[11px] text-fg-subtle">{r.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-sunken">
            <motion.i className={cn('block h-full rounded-full', TONE[r.tone])} initial={{ width: 0 }} animate={{ width: `${r.pct}%` }} transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }} />
          </div>
          <span className="tnum w-12 shrink-0 text-right text-[12.5px] font-semibold text-fg">{r.value}</span>
        </div>
      ))}
    </div>
  )
}
