import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { ArrowRight, Eye, LayoutList, Percent, Radio, UserCheck, Users, Wallet } from 'lucide-react'
import { Badge, Card, InvestigateLink, SectionHead, Segmented } from '@/components/ui'
import { RangePicker, useRange } from '@/lib/range'
import { useNav } from '@/lib/nav'
import { useInvestigate } from '@/components/Investigate'
import { cn, inr, inrCompact, num } from '@/lib/utils'
import { ACCOUNT, CAMPAIGNS, PAGES, platformStats, type Net } from '@/data/samurai'
import { pageHealth, pageNet } from '@/data/pages'
import { NetIcon } from '@/features/Pages'
import { cap, lexiconOf, useTenant } from '@/lib/tenant'

/* ============================================================================
   Audience — the DESCRIPTIVE user-analytics layer. It rolls up signals that
   today live one page at a time into an account-wide picture of who your spend
   reached and what it returned, tied back to the spend → lead spine.

   Deliberately DESCRIPTIVE, never prescriptive: it never renders a "fix", never
   suggests an action, and never ranks by money-to-act. That is the job of
   "Get more leads" (ConversionIntel, the future AI-gated layer) and Smart Alerts
   (money monitoring). This feeds both; it does not duplicate them.

   Every number here is MEASURED and reconciles to the account totals — real
   page/campaign aggregates (sessions, clicks, leads, conversion, CPL, spend).
   Nothing is modelled, estimated, or a projected gain.
   ========================================================================== */

const stagger = { animate: { transition: { staggerChildren: 0.06 } } }
const rise = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } } }

const rate = (part: number, whole: number) => (whole > 0 ? +((part / whole) * 100).toFixed(1) : 0)

export function Audience() {
  const { factor: f, label } = useRange()
  const { go } = useNav()
  const { tenant } = useTenant()
  const lex = lexiconOf(tenant)

  const totalSessions = PAGES.reduce((a, p) => a + p.visits, 0)
  const siteConv = rate(ACCOUNT.leads, totalSessions)

  return (
    <div className="mx-auto max-w-[1080px] px-8 py-7">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-fg">Audience</h1>
          <p className="mt-0.5 text-[13px] text-fg-subtle">Who your spend brings in, and which pages and channels turn them into {lex.conversion.many}.</p>
        </div>
        <RangePicker />
      </div>

      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
        {/* lead with the verdict — one plain-language read of the whole account */}
        <motion.div variants={rise}>
          <Card className="relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-navy to-[#3b5c93]" />
            <div className="flex items-start gap-3.5 p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-navy-tint text-navy"><Users className="h-[19px] w-[19px]" /></span>
              <Verdict f={f} totalSessions={totalSessions} siteConv={siteConv} lex={lex} />
            </div>
          </Card>
        </motion.div>

        {/* summary strip — all measured, reconciling to the account totals */}
        <motion.div variants={rise} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat icon={Eye} label="Sessions" value={num(totalSessions * f)} sub={label} />
          <Stat icon={UserCheck} label={cap(lex.conversion.many)} value={num(ACCOUNT.leads * f)} sub={label} />
          <Stat icon={Percent} label="Site conversion" value={`${siteConv}%`} sub={`${lex.conversion.many} ÷ sessions`} />
          <Stat icon={Wallet} label="Cost per lead" value={inr(ACCOUNT.cpl)} sub="blended · account" />
        </motion.div>

        {/* module 1 — landing-page scoreboard */}
        <motion.div variants={rise}>
          <PageScoreboard f={f} go={go} lex={lex} totalSessions={totalSessions} siteConv={siteConv} />
        </motion.div>

        {/* module 2 — traffic & channel breakdown */}
        <motion.div variants={rise}>
          <ChannelBreakdown f={f} go={go} lex={lex} />
        </motion.div>

        <p className="px-1 text-[11px] leading-relaxed text-fg-subtle">
          Measured from your reconciled spend, click, session and {lex.conversion.one} totals — not modelled, not estimated. This is the descriptive picture; the fixes to act on live in <b className="font-medium text-fg-muted">Get more leads</b>, and the money to move in <b className="font-medium text-fg-muted">Alerts</b>.
        </p>
      </motion.div>
    </div>
  )
}

function Verdict({ f, totalSessions, siteConv, lex }: { f: number; totalSessions: number; siteConv: number; lex: ReturnType<typeof lexiconOf> }) {
  const withLeads = PAGES.filter((p) => p.leads > 0)
  const cheapest = [...withLeads].sort((a, b) => a.cpl! - b.cpl!)[0]
  const zero = PAGES.filter((p) => p.leads === 0).length
  const ps = platformStats()
  return (
    <div className="min-w-0">
      <p className="text-[14.5px] font-semibold leading-snug text-fg">
        Your spend reached {num(totalSessions * f)} sessions; {siteConv}% became {lex.conversion.many}.
      </p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">
        <b className="font-semibold text-fg">{cheapest.name}</b> converts them cheapest at {inr(cheapest.cpl!)}, and Google brings {lex.conversion.many} at {ps.ratio}× the efficiency of Meta.{zero > 0 && ` ${zero} pages took traffic and returned none.`}
      </p>
    </div>
  )
}

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Eye; label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-sunken"><Icon className="h-3.5 w-3.5 text-fg-muted" /></span>
        <span className="truncate text-[12.5px] font-medium text-fg-muted">{label}</span>
      </div>
      <div className="mt-2.5 text-[24px] font-bold leading-none tracking-tight text-fg tnum">{value}</div>
      {sub && <div className="mt-1.5 truncate text-[11px] text-fg-subtle">{sub}</div>}
    </Card>
  )
}

/* ---------------- Module 1 · Landing-page scoreboard ---------------- */
type PageSort = 'spend' | 'sessions' | 'leads' | 'conv' | 'cpl'

function PageScoreboard({ f, go, lex, totalSessions, siteConv }: { f: number; go: (n: 'pagedetail', id: string) => void; lex: ReturnType<typeof lexiconOf>; totalSessions: number; siteConv: number }) {
  const [sort, setSort] = useState<PageSort>('spend')
  const investigate = useInvestigate()

  const rows = useMemo(() => {
    const r = PAGES.map((p) => ({
      p,
      net: pageNet(p.id),
      health: pageHealth(p),
      sessions: p.visits,
      leads: p.leads,
      conv: rate(p.leads, p.visits),
      cpl: p.cpl,
      spend: p.spend,
    }))
    r.sort((a, b) => {
      if (sort === 'cpl') {
        // pages with no leads have no CPL — they sort last, by spend, so the ranking stays honest
        if (a.cpl == null && b.cpl == null) return b.spend - a.spend
        if (a.cpl == null) return 1
        if (b.cpl == null) return -1
        return b.cpl - a.cpl
      }
      return (b[sort] as number) - (a[sort] as number)
    })
    return r
  }, [sort])

  const convMax = Math.max(...rows.map((r) => r.conv), 1)
  const spendMax = Math.max(...rows.map((r) => r.spend), 1)

  const drill = () =>
    investigate({
      title: 'Every page, reconciled to your account',
      definition: `Sessions, ${lex.conversion.many} and spend by page. Conversion = ${lex.conversion.many} ÷ sessions; cost per lead = spend ÷ ${lex.conversion.many}. Every row sums to the account total — nothing modelled.`,
      columns: [
        { key: 'p', label: 'Page' },
        { key: 's', label: 'Sessions', align: 'right' },
        { key: 'l', label: cap(lex.conversion.many), align: 'right' },
        { key: 'cv', label: 'Conv.', align: 'right' },
        { key: 'c', label: 'CPL', align: 'right' },
        { key: 'sp', label: 'Spend', align: 'right' },
      ],
      rows: rows.map((r) => ({ p: r.p.name, s: num(r.sessions * f), l: num(r.leads * f), cv: `${r.conv}%`, c: r.cpl ? inr(r.cpl) : '—', sp: inr(r.spend * f) })),
      foot: { p: 'Account', s: num(totalSessions * f), l: num(ACCOUNT.leads * f), cv: `${siteConv}%`, c: inr(ACCOUNT.cpl), sp: inr(ACCOUNT.spend * f) },
    })

  return (
    <Card className="p-5">
      <SectionHead
        title="Which pages earn your spend"
        hint="every landing page, measured"
        icon={<LayoutList className="h-4 w-4" />}
        right={<InvestigateLink onClick={drill} />}
      />
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11.5px] text-fg-subtle">Sorted by</span>
        <Segmented<PageSort>
          size="sm"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'spend', label: 'Spend' },
            { value: 'sessions', label: 'Sessions' },
            { value: 'leads', label: cap(lex.conversion.many) },
            { value: 'conv', label: 'Conversion' },
            { value: 'cpl', label: 'CPL' },
          ]}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[660px] border-collapse">
          <thead>
            <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
              <th className="px-2 py-2 text-left font-semibold">Page</th>
              <th className="px-2 py-2 text-right font-semibold">Sessions</th>
              <th className="px-2 py-2 text-right font-semibold">{cap(lex.conversion.many)}</th>
              <th className="px-2 py-2 text-left font-semibold">Conversion</th>
              <th className="px-2 py-2 text-right font-semibold">Cost / lead</th>
              <th className="px-2 py-2 text-right font-semibold">Spend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const cplTone = r.cpl == null ? 'text-fg-subtle' : r.cpl <= ACCOUNT.cpl ? 'text-pos' : 'text-neg'
              return (
                <motion.tr
                  key={r.p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.03 * i } }}
                  onClick={() => go('pagedetail', r.p.id)}
                  className="group cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-sunken/50"
                >
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <NetIcon net={r.net} />
                      <span className="truncate text-[13px] font-medium text-fg group-hover:text-navy">{r.p.name}</span>
                      {r.health.tone !== 'ok' && (
                        <Badge tone={r.health.tone === 'bad' ? 'neg' : 'warn'} className="shrink-0">{r.health.txt}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-right text-[13px] tnum text-fg-muted">{num(r.sessions * f)}</td>
                  <td className="px-2 py-2.5 text-right text-[13px] tnum font-semibold text-fg">{num(r.leads * f)}</td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-[72px] shrink-0 overflow-hidden rounded-full bg-sunken">
                        <motion.i className={cn('block h-full rounded-full', r.conv === 0 ? 'bg-line-strong' : 'bg-navy')} initial={{ width: 0 }} animate={{ width: `${(r.conv / convMax) * 100}%` }} transition={{ duration: 0.6, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }} />
                      </div>
                      <span className="w-10 shrink-0 text-[12.5px] tnum text-fg-muted">{r.conv}%</span>
                    </div>
                  </td>
                  <td className={cn('px-2 py-2.5 text-right text-[13px] tnum font-semibold', cplTone)}>{r.cpl ? inr(r.cpl) : '—'}</td>
                  <td className="px-2 py-2.5 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[13px] tnum text-fg">{inrCompact(r.spend * f)}</span>
                      <div className="h-1 w-[56px] overflow-hidden rounded-full bg-sunken">
                        <motion.i className="block h-full rounded-full bg-navy/40" initial={{ width: 0 }} animate={{ width: `${(r.spend / spendMax) * 100}%` }} transition={{ duration: 0.6, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }} />
                      </div>
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-fg-subtle">Cost per lead shown <span className="font-medium text-pos">green</span> below your blended {inr(ACCOUNT.cpl)}, <span className="font-medium text-neg">red</span> above. Click a page for its full detail.</p>
    </Card>
  )
}

/* ---------------- Module 2 · Traffic & channel breakdown ---------------- */
type ChanSort = 'spend' | 'clicks' | 'leads' | 'ctl' | 'cpl'

function ChannelBreakdown({ f, go, lex }: { f: number; go: (n: 'campaigns') => void; lex: ReturnType<typeof lexiconOf> }) {
  const [sort, setSort] = useState<ChanSort>('spend')

  const byNet = useMemo(() => {
    const agg: Record<Net, { spend: number; clicks: number; leads: number }> = { google: { spend: 0, clicks: 0, leads: 0 }, meta: { spend: 0, clicks: 0, leads: 0 } }
    for (const c of CAMPAIGNS) { const t = agg[c.net]; t.spend += c.spend; t.clicks += c.clicks; t.leads += c.leads }
    return agg
  }, [])

  const campaigns = useMemo(() => {
    const r = CAMPAIGNS.map((c) => ({ c, ctl: rate(c.leads, c.clicks), health: pageHealth(PAGES.find((p) => p.id === c.pageId)!) }))
    r.sort((a, b) => {
      if (sort === 'cpl') {
        if (a.c.cpl == null && b.c.cpl == null) return b.c.spend - a.c.spend
        if (a.c.cpl == null) return 1
        if (b.c.cpl == null) return -1
        return b.c.cpl - a.c.cpl
      }
      if (sort === 'ctl') return b.ctl - a.ctl
      return (b.c[sort] as number) - (a.c[sort] as number)
    })
    return r
  }, [sort])

  const spendMax = Math.max(...CAMPAIGNS.map((c) => c.spend), 1)

  return (
    <Card className="p-5">
      <SectionHead
        title="Where your leads come from"
        hint="by channel and campaign"
        icon={<Radio className="h-4 w-4" />}
        right={<button onClick={() => go('campaigns')} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-navy hover:text-navy-hover">All campaigns <ArrowRight className="h-3.5 w-3.5" /></button>}
      />

      {/* two networks, side by side */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(['google', 'meta'] as Net[]).map((n) => {
          const d = byNet[n]
          const cpl = d.leads ? Math.round(d.spend / d.leads) : null
          const ctl = rate(d.leads, d.clicks)
          return (
            <div key={n} className="rounded-[12px] border border-line bg-surface/40 p-3.5">
              <div className="flex items-center gap-2">
                <NetIcon net={n} />
                <span className="text-[13.5px] font-semibold capitalize text-fg">{n}</span>
                <span className="ml-auto text-[12.5px] tnum text-fg-muted">{inr(d.spend * f)}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <NetFig value={num(d.leads * f)} label={cap(lex.conversion.many)} />
                <NetFig value={`${ctl}%`} label="Click → lead" />
                <NetFig value={cpl ? inr(cpl) : '—'} label="Cost / lead" tone={cpl == null ? 'muted' : cpl <= ACCOUNT.cpl ? 'pos' : 'neg'} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mb-3 mt-5 flex items-center justify-between gap-3">
        <span className="text-[11.5px] text-fg-subtle">Campaigns · sorted by</span>
        <Segmented<ChanSort>
          size="sm"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'spend', label: 'Spend' },
            { value: 'clicks', label: 'Clicks' },
            { value: 'leads', label: cap(lex.conversion.many) },
            { value: 'ctl', label: 'Click → lead' },
            { value: 'cpl', label: 'CPL' },
          ]}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
              <th className="px-2 py-2 text-left font-semibold">Campaign</th>
              <th className="px-2 py-2 text-right font-semibold">Spend</th>
              <th className="px-2 py-2 text-right font-semibold">Clicks</th>
              <th className="px-2 py-2 text-right font-semibold">{cap(lex.conversion.many)}</th>
              <th className="px-2 py-2 text-right font-semibold">Click → lead</th>
              <th className="px-2 py-2 text-right font-semibold">Cost / lead</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map(({ c, ctl, health }, i) => {
              const cplTone = c.cpl == null ? 'text-fg-subtle' : c.cpl <= ACCOUNT.cpl ? 'text-pos' : 'text-neg'
              return (
                <tr key={c.id} className="border-b border-line/60 transition-colors last:border-0 hover:bg-sunken/50">
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <NetIcon net={c.net} />
                      <span className="truncate text-[13px] font-medium text-fg">{c.name}</span>
                      {c.leads === 0 && <Badge tone={health.tone === 'bad' ? 'neg' : 'warn'} className="shrink-0">{health.txt}</Badge>}
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[13px] tnum text-fg">{inrCompact(c.spend * f)}</span>
                      <div className="h-1 w-[52px] overflow-hidden rounded-full bg-sunken">
                        <motion.i className="block h-full rounded-full bg-navy/40" initial={{ width: 0 }} animate={{ width: `${(c.spend / spendMax) * 100}%` }} transition={{ duration: 0.6, delay: 0.03 * i, ease: [0.22, 1, 0.36, 1] }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-right text-[13px] tnum text-fg-muted">{num(c.clicks * f)}</td>
                  <td className="px-2 py-2.5 text-right text-[13px] tnum font-semibold text-fg">{num(c.leads * f)}</td>
                  <td className="px-2 py-2.5 text-right text-[13px] tnum text-fg-muted">{ctl}%</td>
                  <td className={cn('px-2 py-2.5 text-right text-[13px] tnum font-semibold', cplTone)}>{c.cpl ? inr(c.cpl) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function NetFig({ value, label, tone = 'default' }: { value: string; label: string; tone?: 'default' | 'pos' | 'neg' | 'muted' }) {
  const cls = tone === 'pos' ? 'text-pos' : tone === 'neg' ? 'text-neg' : tone === 'muted' ? 'text-fg-subtle' : 'text-fg'
  return (
    <div className="rounded-[8px] bg-sunken/60 py-2">
      <div className={cn('text-[15px] font-bold leading-none tnum', cls)}>{value}</div>
      <div className="mt-1 text-[10.5px] leading-tight text-fg-subtle">{label}</div>
    </div>
  )
}
