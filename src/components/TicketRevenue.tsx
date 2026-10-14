import { Card, InvestigateLink, SectionHead } from '@/components/ui'
import { useInvestigate } from '@/components/Investigate'
import { inr, num } from '@/lib/utils'
import { money, ticketSize, type Biz } from '@/data/business'
import { C } from '@/lib/tokens'

/* "What it returned" — the cost ↔ revenue story for one page / campaign, as a KPI donut: the ring
   is each enrolment's revenue, the dark sliver is what it cost to win, and the centre is the return.
   The main view stays simple (the page = the combination of its campaigns); Investigate drills down —
   a page breaks down by campaign, a campaign shows its own chain. Reconciles with the spend & leads. */

const R = 46
const CIRC = 2 * Math.PI * R

export function TicketRevenue({ pageId, name, biz, f, hint, campaigns }: { pageId: string; name: string; biz: Biz; f: number; hint: string; campaigns?: { name: string; biz: Biz }[] }) {
  const investigate = useInvestigate()
  const enrolled = Math.round(biz.enrolled * f)
  if (enrolled <= 0) return null
  const spend = Math.round(biz.spend * f)
  const avg = ticketSize(pageId)
  const revenue = enrolled * avg
  const cac = Math.round(spend / enrolled)
  const roas = spend ? +(revenue / spend).toFixed(1) : 0
  const costFrac = Math.max(0.015, Math.min(1, cac / avg))
  const costLen = costFrac * CIRC
  const multi = !!campaigns && campaigns.length > 1

  const drill = () =>
    investigate(
      multi
        ? {
            title: `What it returned — ${name}`,
            definition: `This page is funded by ${campaigns!.length} campaigns — here's the cost vs revenue each one brought. They combine into the page total below. Per-enrolment ticket sizes sync from your AMS.`,
            columns: [
              { key: 'camp', label: 'Campaign' },
              { key: 's', label: 'Spend', align: 'right' },
              { key: 'e', label: 'Enrol', align: 'right' },
              { key: 'rev', label: 'Revenue', align: 'right' },
              { key: 'cac', label: 'CAC', align: 'right' },
              { key: 'roas', label: 'Return', align: 'right' },
            ],
            rows: [...campaigns!]
              .sort((a, z) => z.biz.revenue - a.biz.revenue)
              .map(({ name: cName, biz: cb }) => ({
                camp: cName,
                s: inr(Math.round(cb.spend * f)),
                e: cb.enrolled ? num(Math.round(cb.enrolled * f)) : '—',
                rev: cb.enrolled ? money(Math.round(cb.revenue * f)) : '—',
                cac: cb.cac ? inr(cb.cac) : '—',
                roas: cb.enrolled ? `${cb.roas}×` : '—',
              })),
            foot: { camp: 'Page total', s: inr(spend), e: num(enrolled), rev: money(revenue), cac: inr(cac), roas: `${roas}×` },
            note: 'Each campaign reconciles to the page; the page reconciles to the account.',
          }
        : {
            title: `What it returned — ${name}`,
            definition: `How ${inr(spend)} of ad spend becomes revenue: leads → sales-qualified → enrolled (34% close-rate), each paying their ticket. Per-enrolment ticket sizes sync from your AMS — the average is used here.`,
            columns: [{ key: 'k', label: 'Step' }, { key: 'v', label: '', align: 'right' }],
            rows: [
              { k: 'Ad spend', v: inr(spend) },
              { k: 'Leads', v: num(Math.round(biz.leads * f)) },
              { k: 'Sales-qualified', v: num(Math.round(biz.qualified * f)) },
              { k: 'Enrolled', v: num(enrolled) },
              { k: 'Average ticket', v: money(avg) },
              { k: 'Revenue', v: money(revenue) },
              { k: 'Cost to win one (CAC)', v: inr(cac) },
              { k: 'Return (ROAS)', v: `${roas}×` },
            ],
            note: 'Cost and revenue reconcile with the spend and leads on this page.',
          },
    )

  return (
    <div className="mt-5">
      <SectionHead title="What it returned" hint={hint} right={<InvestigateLink onClick={drill} />} />
      <Card className="p-5">
        <p className="text-[13.5px] leading-relaxed text-fg-muted">
          {inr(spend)} spent{multi ? <> across <b className="text-fg">{campaigns!.length} campaigns</b></> : null} → <b className="text-fg">{num(enrolled)}</b> enrolment{enrolled === 1 ? '' : 's'} → <b className="tnum text-pos">{money(revenue)}</b> revenue.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-7 gap-y-4">
          {/* KPI donut: ring = revenue per enrolment, dark sliver = cost to win, centre = return */}
          <div className="relative h-[128px] w-[128px] shrink-0">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r={R} fill="none" stroke={C.sunken} strokeWidth="13" />
              <circle cx="60" cy="60" r={R} fill="none" stroke={C.pos} strokeWidth="13" strokeDasharray={`${CIRC} ${CIRC}`} />
              <circle cx="60" cy="60" r={R} fill="none" stroke={C.navy} strokeWidth="13" strokeLinecap="round" strokeDasharray={`${costLen} ${CIRC}`} />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="tnum text-[26px] font-bold leading-none text-pos">{roas}×</div>
                <div className="mt-1 text-[10.5px] text-fg-subtle">return</div>
              </div>
            </div>
          </div>

          {/* the two numbers */}
          <div className="min-w-[180px] flex-1 space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">Per enrolment</div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[13px] text-fg-muted"><i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: C.pos }} />Revenue it brings</span>
              <b className="tnum text-[15px] font-bold text-pos">{money(avg)}</b>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[13px] text-fg-muted"><i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: C.navy }} />Cost to win one</span>
              <b className="tnum text-[15px] font-bold text-fg">{inr(cac)}</b>
            </div>
            <p className="border-t border-line pt-2.5 text-[11px] leading-relaxed text-fg-subtle">The ring is what each enrolment brings; the dark sliver is what it cost to win it.</p>
          </div>
        </div>

        <p className="mt-3.5 border-t border-line pt-3 text-[11.5px] leading-relaxed text-fg-muted">
          A higher cost to acquire is worth it when the ticket is bigger — what matters is the <b className="text-fg">return</b>.{multi ? <> Open <b className="text-fg">Investigate</b> for the split by campaign.</> : <> Per-enrolment ticket sizes sync from your AMS; the average is <b className="tnum text-fg">{money(avg)}</b>.</>}
        </p>
      </Card>
    </div>
  )
}
