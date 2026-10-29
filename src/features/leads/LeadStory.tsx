import { motion } from 'motion/react'
import { Monitor, Smartphone, Tablet, CircleUserRound, EyeOff, ExternalLink, Database } from 'lucide-react'
import type { InvestigatePayload } from '@/components/Investigate'
import { Badge } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { cn, inr, num } from '@/lib/utils'
import { money } from '@/data/business'
import { COOL_DAYS, type Visitor } from '@/data/leads'
import { PAGES } from '@/data/samurai'
import type { Device } from '@/data/behavior'
import { cap, lexiconOf, useTenant } from '@/lib/tenant'

/* Lead Story — the per-visitor reconciled timeline, BEHAVIOUR-first.
   Samurai owns the anonymous behaviour; identity lives in the CRM and shows only as a synced
   reference with a deep-link out — never a name or phone here. It is a literal, ordered replay of
   logged behaviour plus the joined CRM outcome, so nothing is computed and nothing can hallucinate:
   the audit view that makes every aggregate defensible. Rendered in the shared Investigate drawer. */

const DeviceIcon = ({ d, className }: { d: Device; className?: string }) =>
  d === 'mobile' ? <Smartphone className={className} /> : d === 'tablet' ? <Tablet className={className} /> : <Monitor className={className} />

type Tone = 'navy' | 'pos' | 'neg' | 'warn' | 'neutral'
const DOT: Record<Tone, string> = { navy: 'bg-navy', pos: 'bg-pos', neg: 'bg-neg', warn: 'bg-warn', neutral: 'bg-line-strong' }
const singular = (s: string) => s.replace(/s$/, '')

function stagePill(v: Visitor, goalUnit: string): { tone: 'pos' | 'navy' | 'warn' | 'neg' | 'neutral'; text: string } {
  if (v.stage === 'enrolled') return { tone: 'pos', text: `${cap(singular(goalUnit))} · ~${money(v.revenue ?? 0)}` }
  if (v.stage === 'anonymous') return { tone: 'neutral', text: "Didn't submit" }
  if (v.cooling) return { tone: 'warn', text: `${v.stage === 'qualified' ? 'Qualified' : 'Lead'} · quiet ${v.daysSinceActive}d` }
  if (v.stage === 'qualified') return { tone: 'navy', text: 'Qualified · in the pipeline' }
  return { tone: 'neutral', text: 'Lead · recently active' }
}

export function LeadStoryBody({ v }: { v: Visitor }) {
  const toast = useToast()
  const { tenant } = useTenant()
  const lex = lexiconOf(tenant)
  const pill = stagePill(v, lex.goalUnit)
  const page = PAGES.find((p) => p.id === v.pageId)
  const reconcile = v.known
    ? `One of ${num(page?.leads ?? 0)} ${lex.conversion.many} on ${v.pageName} — every story reconciles to the page's ${lex.conversion.one} count.`
    : `One of the visitors who started the form on ${v.pageName} but never submitted — anonymous, with no CRM record to call.`

  return (
    <div className="text-[13px]">
      {/* who — an anonymous behavioural handle, never PII */}
      <div className="mb-3 flex items-start gap-3 rounded-[12px] border border-line bg-surface/50 px-3.5 py-3">
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full', v.known ? 'bg-navy-tint text-navy' : 'bg-sunken text-fg-subtle')}>
          {v.known ? <CircleUserRound className="h-5 w-5" /> : <EyeOff className="h-[18px] w-[18px]" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="tnum text-[13.5px] font-semibold text-fg">Visitor {v.handle}</span>
            <Badge tone={pill.tone}>{pill.text}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-fg-subtle">
            <span>{v.programme}</span>
            <span className="inline-flex items-center gap-1"><DeviceIcon d={v.device} className="h-3 w-3" />{v.sessions} {v.sessions === 1 ? 'visit' : 'visits'}</span>
          </div>
        </div>
      </div>

      {/* identity — synced from the CRM, not owned here */}
      {v.known ? (
        <div className="mb-3 flex items-center gap-2.5 rounded-[10px] border border-navy/15 bg-navy-tint/30 px-3 py-2 text-[12px]">
          <Database className="h-3.5 w-3.5 shrink-0 text-navy" />
          <span className="text-fg-muted">Identity synced from your CRM · <b className="tnum text-fg">{v.crmRef}</b></span>
          <button onClick={() => toast(`Opening ${v.crmRef} in your CRM (demo)`)} className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-medium text-navy hover:text-navy-hover">
            Open in CRM <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="mb-3 rounded-[10px] bg-sunken px-3 py-2 text-[11.5px] text-fg-subtle">
          Anonymous — no name or contact (they never submitted). Retarget this behaviour or fix the field below.
        </div>
      )}

      {/* behavioural signals — the thing the CRM can't see */}
      {v.signals.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {v.signals.map((s) => (
            <span key={s} className="rounded-md bg-sunken px-2 py-0.5 text-[11px] text-fg-muted">{s}</span>
          ))}
        </div>
      )}

      {/* first touch — reconciled cost */}
      <div className="mb-3 flex items-center justify-between rounded-[10px] bg-sunken px-3 py-2 text-[12px]">
        <span className="text-fg-muted">First touch · <b className="text-fg">{v.firstSource}</b> ({v.firstNet === 'google' ? 'Google' : 'Meta'})</span>
        {v.firstCostInr > 0 && <span className="tnum text-fg-subtle">~{inr(v.firstCostInr)} to reach them</span>}
      </div>

      {/* the timeline — ordered behaviour, grouped by visit; CRM events tagged */}
      <div className="relative pl-1">
        <div className="absolute bottom-2 left-[9px] top-2 w-px bg-line" />
        <div className="space-y-0.5">
          {v.events.map((e, i) => {
            const newVisit = i === 0 || e.session !== v.events[i - 1].session
            return (
              <div key={i}>
                {newVisit && i > 0 && <div className="py-1 pl-7 text-[10.5px] font-medium uppercase tracking-[0.06em] text-fg-subtle">Visit {e.session}</div>}
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.4), ease: [0.22, 1, 0.36, 1] }}
                  className="relative flex items-start gap-3 rounded-[9px] px-2 py-1.5"
                >
                  <span className="relative z-10 mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center">
                    <span className={cn('h-[10px] w-[10px] rounded-full ring-2 ring-panel', DOT[e.tone])} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className={cn('text-[12.5px] font-medium', e.tone === 'pos' ? 'text-pos' : e.tone === 'neg' ? 'text-neg' : e.tone === 'warn' ? 'text-warn' : 'text-fg')}>{e.label}</span>
                      {e.crm && <span className="shrink-0 rounded bg-navy-tint px-1 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-navy">CRM</span>}
                      <span className="ml-auto shrink-0 text-[10.5px] text-fg-subtle">{e.when}</span>
                    </div>
                    {e.detail && <div className="text-[11.5px] leading-snug text-fg-subtle">{e.detail}</div>}
                  </div>
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>

      {/* reconciliation / what-to-do */}
      <p className="mt-3 rounded-[10px] bg-sunken px-3 py-2.5 text-[11.5px] leading-relaxed text-fg-subtle">{reconcile}</p>
      {v.cooling && (
        <p className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-fg-muted">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
          No behaviour for {v.daysSinceActive} days (the follow-up threshold is {COOL_DAYS} days). Open the CRM record above for a specific, warm call — not a cold one.
        </p>
      )}
    </div>
  )
}

/** Build the Investigate-drawer payload for one visitor's story. Open with useInvestigate(). */
export function leadStoryPayload(v: Visitor): InvestigatePayload {
  return {
    title: v.known ? `Lead Story — Visitor ${v.handle}` : `Lead Story — anonymous visitor ${v.handle}`,
    body: <LeadStoryBody v={v} />,
  }
}
