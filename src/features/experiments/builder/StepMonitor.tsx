import { motion } from 'motion/react'
import { Bell, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GUARDRAILS, NOTIFY } from '@/data/templates'
import type { StepProps } from './TemplateBuilder'

export function StepMonitor({ t, update, setGuard }: StepProps) {
  const guardState = (k: string) => t.guardrails.find((x) => x.k === k)
  const activeCount = t.guardrails.filter((g) => g.on).length

  return (
    <div className="mx-auto max-w-[860px] px-6 py-7">
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-navy-tint text-navy"><ShieldCheck className="h-[18px] w-[18px]" /></span>
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-fg">Set your guardrails &amp; alerts</h1>
          <p className="mt-0.5 max-w-[70ch] text-[13px] leading-relaxed text-fg-subtle">Samurai watches the test for you and backs off the moment something looks wrong. Turn on the checks that matter — this step is optional, you can leave the defaults.</p>
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-line bg-panel p-4 shadow-sm">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="text-[12.5px] font-semibold text-fg">Guardrails</div>
          <span className="text-[11.5px] text-fg-subtle">{activeCount} active</span>
        </div>
        <div className="space-y-2">
          {GUARDRAILS.map((g) => {
            const st = guardState(g.k)
            const on = !!st?.on
            return (
              <div key={g.k} className={cn('rounded-[10px] border px-3 py-2.5 transition-colors', on ? 'border-navy/20 bg-navy-tint/40' : 'border-line')}>
                <div className="flex items-center gap-3">
                  <div className="flex-1"><b className="text-[12.5px] text-fg">{g.name}</b><p className="text-[11px] leading-snug text-fg-subtle">{g.desc}</p></div>
                  {on && (
                    <span className="flex items-center gap-1 text-[11.5px] text-fg-muted">
                      <input type="number" value={st?.threshold ?? g.def} onChange={(e) => setGuard(g.k, { threshold: +e.target.value || 0 })} className="h-7 w-14 rounded-[7px] border border-line bg-panel px-2 text-[12px] text-fg outline-none focus:border-navy" />
                      {g.unit === '%' ? '%' : 'h'}
                    </span>
                  )}
                  <Switch on={on} onClick={() => setGuard(g.k, { on: !on })} />
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-3.5">
          <label className="flex items-center gap-2 text-[12.5px] text-fg-muted"><Bell className="h-3.5 w-3.5 text-navy" /> Only alert after
            <input type="number" value={t.minVisitors} onChange={(e) => update((d) => { d.minVisitors = +e.target.value || 0 })} className="h-7 w-16 rounded-[7px] border border-line bg-panel px-2 text-[12.5px] text-fg outline-none focus:border-navy" /> visitors/arm</label>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[12px] text-fg-subtle">Notify via</span>
            <div className="inline-flex rounded-[9px] border border-line bg-sunken p-0.5">
              {NOTIFY.map((n) => (
                <button key={n} onClick={() => update((d) => { d.notify = n })} className={cn('rounded-[7px] px-2.5 py-1.5 text-[12px] font-medium transition-colors', t.notify === n ? 'bg-panel text-fg shadow-sm' : 'text-fg-subtle hover:text-fg-muted')}>{n}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={onClick} className={cn('relative h-6 w-10 shrink-0 rounded-full transition-colors', on ? 'bg-navy' : 'bg-line-strong')}>
      <motion.span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm" animate={{ left: on ? 18 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 34 }} />
    </button>
  )
}
