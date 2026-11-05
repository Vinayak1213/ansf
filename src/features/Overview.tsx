import { motion } from 'motion/react'
import { AlertTriangle, ArrowRight, Check, Rocket, TrendingUp, Users, Wallet } from 'lucide-react'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { CplBars, CplTrendChart, RingGauge, Sparkline, SpendSplitBar } from '@/components/charts'
import { Badge, Button, Card, Delta, InvestigateLink, SectionHead } from '@/components/ui'
import { onboardingProgress } from '@/lib/onboarding'
import { RangePicker, useRange } from '@/lib/range'
import { useNav } from '@/lib/nav'
import { useInvestigate } from '@/components/Investigate'
import { cn, inr, num } from '@/lib/utils'
import { ACCOUNT, EXPERIMENTS, LEAKS, PAGES, QUARTER, VERDICT, cplTrend, ecpl, goalVarOf, isNVar, leakTotal, pageName, platformStats, variantCpl } from '@/data/samurai'
import { accountBiz, money, pageBiz, ticketSize } from '@/data/business'
import { expPage, readinessPct } from '@/data/experiments'
import { pageNet } from '@/data/pages'
import { NetIcon } from '@/features/Pages'
import { frictionHotspots, openBehavior } from '@/data/behavior'
import { Activity, Sparkles } from 'lucide-react'
import { cap, isOperatorView, lexiconOf, ownsSeededData, useTenant } from '@/lib/tenant'
import { ConversionIntel } from '@/features/leads/ConversionIntel'

const stagger = { animate: { transition: { staggerChildren: 0.06 } } }
const rise = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } } }

export function Overview() {
  const { factor: f, label } = useRange()
  const { go } = useNav()
  const { tenant } = useTenant()
  const investigate = useInvestigate()

  // Only the data-owning tenant renders the bundled dataset. Every other workspace —
  // still in setup OR already live — has no numbers of its own, so it gets the honest
  // cold-start instead of borrowing another workspace's figures.
  if (!ownsSeededData(tenant)) return <FreshOverview />

  const lex = lexiconOf(tenant)
  const trend = cplTrend()
  const spendSeries = trend.map((t) => t.spend).slice(-8)
  const leadSeries = trend.map((t) => t.leads).slice(-8)
  const cplSeries = trend.map((t) => t.cpl).slice(-8)
  const need = QUARTER.target - QUARTER.enrol
  const rankedPages = PAGES.filter((p) => p.leads > 0).sort((a, b) => b.cpl! - a.cpl!)

  const kpiDrill = () =>
    investigate({
      title: 'Money in, leads out',
      definition: `Blended CPL = ${inr(ACCOUNT.spend * f)} spend ÷ ${num(ACCOUNT.leads * f)} leads = ${inr(ACCOUNT.cpl)}. Every page's contribution reconciles to these totals.`,
      columns: [
        { key: 'p', label: 'Page' },
        { key: 's', label: 'Spend', align: 'right' },
        { key: 'l', label: 'Leads', align: 'right' },
        { key: 'c', label: 'CPL', align: 'right' },
      ],
      rows: [...PAGES].sort((a, b) => b.spend - a.spend).map((p) => ({ p: p.name, s: inr(p.spend * f), l: num(p.leads * f), c: p.cpl ? inr(p.cpl) : '—' })),
      foot: { p: 'Account', s: inr(ACCOUNT.spend * f), l: num(ACCOUNT.leads * f), c: inr(ACCOUNT.cpl) },
    })

  const leakDrill = () =>
    investigate({
      title: 'Where the money leaked',
      definition: `${inr(leakTotal())} — 23% of spend — reached pages that produced no leads. Confirmed leaks are provably broken; likely leaks are spend past one CPL with no return.`,
      columns: [
        { key: 'p', label: 'Page' },
        { key: 'sev', label: 'Severity' },
        { key: 'why', label: 'Reason' },
        { key: 'amt', label: 'Amount', align: 'right' },
      ],
      rows: LEAKS.map((l) => ({ p: pageName(l.page), sev: l.severity, why: l.reason.replace('_', ' '), amt: inr(l.amount) })),
      foot: { p: 'Total leaked', sev: '', why: '', amt: inr(leakTotal()) },
    })

  return (
    <div className="mx-auto max-w-[1080px] px-8 py-7">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-fg">Overview</h1>
          <p className="mt-0.5 text-[13px] text-fg-subtle">Which page turns ad spend into {lex.conversion.many} most cheaply — and whether you'll hit the {lex.goalNoun}.</p>
        </div>
        <RangePicker />
      </div>

      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
        {/* HERO */}
        <motion.div variants={rise}>
          <Card className="relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand to-[#f6835f]" />
            <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">Blended cost per lead</span>
                  <span className="ml-auto lg:hidden"><InvestigateLink onClick={kpiDrill} /></span>
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <AnimatedNumber value={ACCOUNT.cpl} kind="inr" className="text-[44px] font-bold leading-none tracking-tight text-fg" />
                  <Delta value={ACCOUNT.cplDeltaPct} invert />
                </div>
                <p className="mt-2 text-[12.5px] text-fg-muted">
                  Blended CPL = {inr(ACCOUNT.spend * f)} ÷ {num(ACCOUNT.leads * f)} leads · down from {inr(ACCOUNT.prevCpl)} last quarter.
                </p>
                <div className="mt-2 hidden lg:block"><InvestigateLink onClick={kpiDrill} /></div>
              </div>
              <div className="hidden w-px self-stretch bg-line lg:block" />
              <div className="lg:w-[340px]">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">{QUARTER.intake} {lex.goalNoun} pacing</span>
                  <Badge tone="warn">Behind by {QUARTER.pctPeriod - QUARTER.pctTarget} pts</Badge>
                </div>
                <RingGauge value={QUARTER.pctTarget} label={`${QUARTER.enrol} of ${QUARTER.target}`} sub={`${need} more by ${QUARTER.closeDate}`} />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* KPI row */}
        <motion.div variants={rise} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile icon={Wallet} label="Spend" value={ACCOUNT.spend * f} kind="inr" series={spendSeries} tone="navy" sub={label} />
          <StatTile icon={Users} label="Leads" value={ACCOUNT.leads * f} kind="num" series={leadSeries} tone="pos" delta={9} sub={label} />
          <StatTile icon={TrendingUp} label="Blended CPL" value={ACCOUNT.cpl} kind="inr" series={cplSeries} tone="navy" delta={ACCOUNT.cplDeltaPct} invert sub="vs last quarter" />
        </motion.div>

        {/* What the spend returned — the business / revenue layer */}
        <motion.div variants={rise}>
          <RevenueCard f={f} label={label} />
        </motion.div>

        {/* Audience — the descriptive user-analytics layer; a teaser into the full section */}
        <motion.div variants={rise}>
          <AudiencePeek />
        </motion.div>

        {/* Conversion intelligence — the behaviour × outcome flagship (user-level layer) */}
        <motion.div variants={rise}>
          <ConversionIntel />
        </motion.div>

        {/* Tests in flight */}
        <motion.div variants={rise}>
          <TestsInFlight />
        </motion.div>

        {/* Trend */}
        <motion.div variants={rise}>
          <Card className="p-5">
            <SectionHead title="Cost per lead over the quarter" hint="account-blended · weekly · markers show winners shipped" right={<Badge tone="neutral">13 weeks</Badge>} />
            <CplTrendChart height={240} />
          </Card>
        </motion.div>

        {/* Leak + pages */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <motion.div variants={rise}>
            <Card className="flex h-full flex-col p-5">
              <SectionHead title="Where the money leaked" hint="this month" right={<InvestigateLink onClick={leakDrill} />} />
              <SpendSplitBar />
              <div className="mt-4 flex-1 space-y-2.5">
                {LEAKS.map((l) => (
                  <button key={l.id} onClick={() => go('pagedetail', l.page)} className="flex w-full items-start gap-2.5 rounded-[8px] px-1.5 py-1 text-left transition-colors hover:bg-sunken">
                    <span className={cn('mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold', l.severity === 'confirmed' ? 'bg-neg-tint text-neg' : 'bg-warn-tint text-warn')}>{l.severity}</span>
                    <div className="flex-1">
                      <div className="text-[12.5px] font-medium text-fg">{pageName(l.page)}</div>
                      <div className="text-[11.5px] leading-snug text-fg-subtle">{l.detail}</div>
                    </div>
                    <span className="tnum text-[13px] font-bold text-fg">{inr(l.amount)}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-1.5 rounded-[10px] bg-warn-tint/50 px-3 py-2 text-[11.5px] text-fg-muted">
                <AlertTriangle className="h-3.5 w-3.5 text-warn" />
                Recovering the confirmed leaks funds roughly the January shortfall.
              </div>
            </Card>
          </motion.div>

          <motion.div variants={rise}>
            <Card className="flex h-full flex-col p-5">
              <SectionHead title="Cost per lead by page" hint="dearest first — most headroom to test" />
              <CplBars pages={rankedPages} />
              <button onClick={() => go('pages')} className="mt-4 inline-flex items-center gap-1 self-start text-[12.5px] font-medium text-navy hover:text-navy-hover">
                See all {PAGES.length} pages <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Card>
          </motion.div>
        </div>

        {/* Friction hotspots — behavioral, distinct from the revenue cards above */}
        <motion.div variants={rise}>
          <FrictionHotspots />
        </motion.div>
      </motion.div>
    </div>
  )
}

/* Cold-start Overview for a freshly onboarded client — same Samurai product, but its own
   (empty) numbers. Nothing here is borrowed from another workspace; every figure is honest. */
function FreshOverview() {
  const { go } = useNav()
  const { tenant } = useTenant()
  const lex = lexiconOf(tenant)
  const prog = onboardingProgress(tenant)
  const live = tenant.fresh !== true // already set up, but still owns no seeded data
  const opView = isOperatorView() // read-only operator view — don't offer to finish the client's setup
  // "Signed in" is implicit for someone viewing their own workspace — show the steps they still act on.
  const steps = prog.clientSteps.filter((s) => s.key !== 'signed_in')
  const doneCount = steps.filter((s) => s.done).length

  return (
    <div className="mx-auto max-w-[1080px] px-8 py-7">
      <div className="mb-5">
        <h1 className="text-[22px] font-semibold tracking-tight text-fg">Overview</h1>
        <p className="mt-0.5 text-[13px] text-fg-subtle">Which page turns ad spend into {lex.conversion.many} most cheaply — once your data is connected.</p>
      </div>

      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
        {/* Activation hero */}
        <motion.div variants={rise}>
          <Card className="relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-navy to-[#3b5c93]" />
            <div className="flex flex-col gap-6 p-6 lg:flex-row">
              <div className="flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-navy text-white"><Sparkles className="h-[18px] w-[18px]" /></span>
                  <div>
                    <div className="text-[15px] font-semibold text-fg">{live ? `${tenant.name} is live on Samurai.` : `Welcome to Samurai, ${tenant.name}.`}</div>
                    <div className="text-[12.5px] text-fg-subtle">{live ? 'Your numbers appear here as spend and leads flow in.' : 'The same Samurai product — your numbers, kept entirely separate.'}</div>
                  </div>
                </div>

                {live ? (
                  <div className="mb-1 mt-5 flex flex-wrap items-center gap-3">
                    <Button variant="navy" size="md" onClick={() => go('settings')}>Open Settings</Button>
                    <span className="text-[12.5px] text-fg-subtle">Add or change your data connections anytime in Settings.</span>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 mt-5 flex flex-wrap items-center gap-3">
                      {!opView && <Button variant="navy" size="md" onClick={() => go('onboarding', 'complete')}><Rocket className="h-4 w-4" /> Finish setup</Button>}
                      <span className="text-[12.5px] text-fg-subtle"><b className="tnum text-fg">{doneCount} of {steps.length}</b> steps done{opView && ' — the client finishes setup themselves'}</span>
                    </div>

                    <div className="space-y-0.5">
                      {steps.map((s) => (
                        <div key={s.key} className="flex items-center gap-2.5 rounded-[10px] px-2 py-1.5">
                          <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold', s.done ? 'bg-pos text-white' : 'border border-dashed border-line-strong text-fg-subtle')}>{s.done && <Check className="h-3 w-3" />}</span>
                          <span className={cn('text-[13px]', s.done ? 'text-fg-muted line-through decoration-line-strong' : 'text-fg')}>{s.clientLabel}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* KPI row — honest empty states, not another workspace's data */}
        <motion.div variants={rise} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <EmptyStat icon={Wallet} label="Spend" hint="No spend recorded yet" />
          <EmptyStat icon={Users} label={cap(lex.conversion.many)} hint={`No ${lex.conversion.many} yet`} />
          <EmptyStat icon={TrendingUp} label="Blended CPL" hint={`Appears with first spend & ${lex.conversion.one}`} />
        </motion.div>

        <motion.div variants={rise}>
          <Card className="p-5">
            <SectionHead title="What Samurai does next" hint="once your data is flowing" />
            <div className="mt-1 grid gap-3.5 sm:grid-cols-3">
              <NextStep n={1} title="Reconciles every unit of spend" detail="Spend from your ad accounts meets leads from your CRM — one blended cost per lead, nothing double-counted." />
              <NextStep n={2} title="Ranks your pages by CPL" detail="The dearest pages surface first — that's where a single test buys the most." />
              <NextStep n={3} title="Proves what to ship" detail="Change one thing at a time; Samurai calls the winner and reconciles the saving." />
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}

function EmptyStat({ icon: Icon, label, hint }: { icon: typeof Wallet; label: string; hint: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-sunken"><Icon className="h-3.5 w-3.5 text-fg-muted" /></span>
        <span className="text-[12.5px] font-medium text-fg-muted">{label}</span>
      </div>
      <div className="mt-2.5 text-[26px] font-bold leading-none tracking-tight text-fg-subtle">—</div>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-fg-subtle"><span className="h-1.5 w-1.5 rounded-full bg-line-strong" />{hint}</div>
    </Card>
  )
}

function NextStep({ n, title, detail }: { n: number; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy-tint text-[11px] font-bold text-navy tnum">{n}</span>
      <div>
        <div className="text-[13px] font-semibold text-fg">{title}</div>
        <div className="text-[11.5px] leading-snug text-fg-subtle">{detail}</div>
      </div>
    </div>
  )
}

/* The business / revenue layer — what the ad spend actually returned. Scoped to PAID spend
   (distinct from the January intake goal, which counts all admissions) so the two never clash.
   All figures from the canonical, reconciling business model. Deterministic, no AI. */
function RevenueCard({ f, label }: { f: number; label: string }) {
  const investigate = useInvestigate()
  const { tenant } = useTenant()
  const lex = lexiconOf(tenant)
  const singular = (s: string) => s.replace(/s$/, '')
  const b = accountBiz()
  const spend = Math.round(b.spend * f)
  const revenue = Math.round(b.revenue * f)
  const enrolled = Math.round(b.enrolled * f)
  const spendPct = Math.max(5, Math.round((spend / revenue) * 100))

  const revenueDrill = () =>
    investigate({
      title: `What your ad spend returned — by ${lex.offering.one}`,
      definition: `Cost vs revenue by ${lex.offering.one}: what you spent, what came back, the average ticket, the cost to win one ${singular(lex.goalUnit)} (CAC) and the return. A higher CAC is worth it when the ticket is bigger. Avg ticket is the per-${lex.offering.one} average — individual ${lex.goalUnit} sync from your CRM. 34% close-rate; reconciles to the account total.`,
      columns: [
        { key: 'prog', label: cap(lex.offering.one) },
        { key: 's', label: 'Spend', align: 'right' },
        { key: 'rev', label: 'Revenue', align: 'right' },
        { key: 't', label: 'Avg ticket', align: 'right' },
        { key: 'cac', label: 'CAC', align: 'right' },
        { key: 'roas', label: 'Return', align: 'right' },
      ],
      rows: [...PAGES]
        .map((p) => ({ p, pb: pageBiz(p.id) }))
        .sort((a, z) => z.pb.revenue - a.pb.revenue)
        .map(({ p, pb }) => ({
          prog: p.name,
          s: inr(Math.round(pb.spend * f)),
          rev: pb.enrolled ? money(Math.round(pb.revenue * f)) : '—',
          t: pb.enrolled ? money(ticketSize(p.id)) : '—',
          cac: pb.cac ? inr(pb.cac) : '—',
          roas: pb.enrolled ? `${pb.roas}×` : '—',
        })),
      foot: { prog: `All ${lex.offering.many}`, s: inr(spend), rev: money(revenue), t: `avg ${money(b.avgTicket ?? 0)}`, cac: b.cac ? inr(b.cac) : '—', roas: `${b.roas}×` },
      note: `${cap(lex.offering.many)} with 0 ${lex.goalUnit} still spent — that spend sits in the total but brought no revenue (the confirmed leaks). Open a page or campaign to drill into its cost vs revenue.`,
    })

  return (
    <Card className="p-5">
      <SectionHead title="What your ad spend returned" hint={`${lex.goalUnit} revenue · ${label}`} right={<InvestigateLink onClick={revenueDrill} />} />
      <p className="text-[13.5px] leading-relaxed text-fg-muted">
        Your <b className="tnum text-fg">{money(spend)}</b> of ad spend turned into <b className="tnum text-pos">{money(revenue)}</b> of revenue.
      </p>

      {/* spent → returned, to scale */}
      <div className="mt-3.5 space-y-2">
        <div className="flex items-center gap-2.5">
          <span className="w-[68px] shrink-0 text-[11px] text-fg-subtle">Spent</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-sunken"><motion.i className="block h-full rounded-full bg-navy" initial={{ width: 0 }} animate={{ width: `${spendPct}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} /></div>
          <span className="tnum w-14 shrink-0 text-right text-[12.5px] font-semibold text-fg">{money(spend)}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="w-[68px] shrink-0 text-[11px] text-fg-subtle">Returned</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-sunken"><motion.i className="block h-full rounded-full bg-pos" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} /></div>
          <span className="tnum w-14 shrink-0 text-right text-[12.5px] font-semibold text-pos">{money(revenue)}</span>
        </div>
      </div>

      {/* the payoff — plain labels, no jargon */}
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4 text-center">
        <div><div className="tnum text-[21px] font-bold text-pos">{b.roas}×</div><div className="mt-0.5 text-[11px] leading-tight text-fg-subtle">back on every ₹1 spent</div></div>
        <div><div className="tnum text-[21px] font-bold text-fg">{b.cac ? inr(b.cac) : '—'}</div><div className="mt-0.5 text-[11px] leading-tight text-fg-subtle">to win one {singular(lex.goalUnit)}</div></div>
        <div><div className="tnum text-[21px] font-bold text-fg">{money(b.avgTicket ?? 0)}</div><div className="mt-0.5 text-[11px] leading-tight text-fg-subtle">average ticket brought</div></div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-fg-subtle">
        {num(enrolled)} {lex.goalUnit} × their ticket size (varies by {lex.offering.one} — avg {money(b.avgTicket ?? 0)}), at a 34% close-rate on qualified {lex.conversion.many}. Counts only what ad spend drove — the {lex.goalNoun} target above tracks all {lex.goalUnit}.
      </p>
    </Card>
  )
}

/* Audience teaser — a compact preview of the descriptive user-analytics section.
   Measured facts only (sessions, site conversion, cheapest page, channel efficiency);
   the full picture lives in the Audience section. No fixes, no money-to-act. */
function AudiencePeek() {
  const { go } = useNav()
  const { tenant } = useTenant()
  const lex = lexiconOf(tenant)
  const totalSessions = PAGES.reduce((a, p) => a + p.visits, 0)
  const siteConv = +((ACCOUNT.leads / totalSessions) * 100).toFixed(1)
  const cheapest = PAGES.filter((p) => p.leads > 0).sort((a, b) => a.cpl! - b.cpl!)[0]
  const ps = platformStats()
  return (
    <Card className="p-5">
      <SectionHead
        title="Audience"
        hint="who your spend brings in"
        icon={<Users className="h-4 w-4" />}
        right={<button onClick={() => go('audience')} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-navy hover:text-navy-hover">Open Audience <ArrowRight className="h-3.5 w-3.5" /></button>}
      />
      <p className="text-[13.5px] leading-relaxed text-fg-muted">
        <b className="tnum text-fg">{num(totalSessions)}</b> sessions across {PAGES.length} pages — <b className="tnum text-fg">{siteConv}%</b> became {lex.conversion.many}. <b className="font-semibold text-fg">{cheapest.name}</b> converts them cheapest, and Google brings {lex.conversion.many} at {ps.ratio}× the efficiency of Meta.
      </p>
      <div className="mt-3.5 flex flex-wrap gap-2">
        {(['google', 'meta'] as const).map((n) => {
          const d = n === 'google' ? ps.google : ps.meta
          return (
            <span key={n} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-sunken px-2.5 py-1 text-[12px]">
              <NetIcon net={n} />
              <span className="capitalize text-fg-muted">{n}</span>
              <span className="tnum font-semibold text-fg">{inr(d.cpl)}/{lex.conversion.one}</span>
            </span>
          )
        })}
      </div>
    </Card>
  )
}

function FrictionHotspots() {
  const { go } = useNav()
  const rows = frictionHotspots(PAGES).slice(0, 4)
  const openBeh = (id: string) => { openBehavior(id); go('pagedetail', id) }
  return (
    <Card className="p-5">
      <SectionHead
        title="Friction hotspots"
        hint="where visitors get stuck — behavioural, not spend"
        right={<button onClick={() => go('pages')} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-navy hover:text-navy-hover">All pages <ArrowRight className="h-3.5 w-3.5" /></button>}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map(({ p, b }) => {
          const sc = b.friction.score
          const tone = sc >= 60 ? 'neg' : sc >= 35 ? 'warn' : 'pos'
          const barCls = { neg: 'bg-neg', warn: 'bg-warn', pos: 'bg-pos' }[tone]
          const chipCls = { neg: 'bg-neg-tint text-neg', warn: 'bg-warn-tint text-warn', pos: 'bg-pos-tint text-pos' }[tone]
          const signal = p.fault === 'broken_form' ? `${num(b.friction.rageClicks)} rage · broken form`
            : p.fault === 'closed_intake' ? `${num(b.friction.quickBacks)} quick-backs · stale`
            : b.friction.rageClicks > b.friction.deadClicks ? `${num(b.friction.rageClicks)} rage clicks`
            : `${num(b.friction.quickBacks)} quick-backs`
          return (
            <button key={p.id} onClick={() => openBeh(p.id)} className="flex flex-col rounded-[12px] border border-line bg-surface/40 p-3 text-left transition-colors hover:border-line-strong hover:bg-sunken/40">
              <div className="flex items-center gap-1.5">
                <NetIcon net={pageNet(p.id)} />
                <span className="flex-1 truncate text-[12px] font-semibold text-fg">{p.name}</span>
                <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', chipCls)}>{sc}</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-fg-subtle"><Activity className="h-3 w-3" />{signal}</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken"><motion.i className={cn('block h-full rounded-full', barCls)} initial={{ width: 0 }} animate={{ width: `${sc}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} /></div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function TestsInFlight() {
  const { go } = useNav()
  const live = EXPERIMENTS.filter((e) => e.status === 'running')
  if (live.length === 0) return null
  const shown = live.slice(0, 4)
  const more = live.length - shown.length
  return (
    <Card className="p-5">
      <SectionHead
        title="Tests in flight"
        hint={`${live.length} live · how each is trending right now`}
        right={<button onClick={() => go('experiments')} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-navy hover:text-navy-hover">{more > 0 ? `${more} more · all experiments` : 'All experiments'} <ArrowRight className="h-3.5 w-3.5" /></button>}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {shown.map((e) => <FlightCard key={e.id} e={e} onOpen={() => go('experimentdetail', e.id)} />)}
      </div>
    </Card>
  )
}

const FLIGHT_TONE: Record<string, { chip: string; bar: string }> = {
  pos: { chip: 'bg-pos-tint text-pos', bar: 'bg-pos' },
  navy: { chip: 'bg-navy-tint text-navy', bar: 'bg-navy' },
  neg: { chip: 'bg-neg-tint text-neg', bar: 'bg-neg' },
  warn: { chip: 'bg-warn-tint text-warn', bar: 'bg-warn' },
  neutral: { chip: 'bg-sunken text-fg-muted', bar: 'bg-line-strong' },
}

function FlightCard({ e, onOpen }: { e: (typeof EXPERIMENTS)[number]; onOpen: () => void }) {
  const p = expPage(e)
  const nvar = isNVar(e)
  const cc = ecpl(e.control)
  const vc = ecpl(e.variant)
  const vd = VERDICT[e.verdict]
  const ready = readinessPct(e)
  const has = cc != null && vc != null
  const cheaper = has && vc! < cc!
  const pricier = has && vc! > cc!
  const tone = FLIGHT_TONE[vd.tone] ?? FLIGHT_TONE.neutral
  const nCount = (e.variants ?? []).length
  const nLead = nvar ? (e.variants ?? []).map((v) => variantCpl(e, v.letter)).filter((x): x is number => x != null).sort((a, b) => a - b)[0] : undefined
  const nGoal = nvar ? (goalVarOf(e)?.name ?? 'goal').toLowerCase() : ''
  return (
    <button onClick={onOpen} className="flex flex-col rounded-[12px] border border-line bg-surface/40 p-3 text-left transition-colors hover:border-line-strong hover:bg-sunken/40">
      <div className="flex items-center gap-1.5">
        {p && <NetIcon net={pageNet(p.id)} />}
        <span className="flex-1 truncate text-[11.5px] font-medium text-fg-muted">{p?.name ?? '—'}</span>
        {e.status === 'running'
          ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-navy" title="Running" />
          : <span className="rounded bg-warn-tint px-1 py-0.5 text-[8.5px] font-bold uppercase text-warn">Limited</span>}
      </div>
      <b className="mt-1 line-clamp-1 text-[13px] font-semibold text-fg">{e.name}</b>
      <div className="mt-1.5 text-[12px] tnum">
        {nvar
          ? (nLead != null
              ? <><b className="text-pos">{inr(nLead)}</b><span className="ml-1 text-[10.5px] text-fg-subtle">best per {nGoal} · {nCount} versions</span></>
              : <span className="text-fg-subtle">{nCount} versions · gathering…</span>)
          : has
            ? <><span className="text-fg-subtle">{inr(cc!)}</span> <span className="text-fg-subtle">→</span> <b className={cheaper ? 'text-pos' : pricier ? 'text-neg' : 'text-fg'}>{inr(vc!)}</b><span className="ml-1 text-[10.5px] text-fg-subtle">per lead</span></>
            : <span className="text-fg-subtle">Gathering data…</span>}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', tone.chip)}>{vd.word}</span>
        <span className="truncate text-[10.5px] text-fg-subtle">{vd.call}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken"><motion.i className={cn('block h-full rounded-full', tone.bar)} initial={{ width: 0 }} animate={{ width: `${ready}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} /></div>
        <span className="text-[10px] text-fg-subtle tnum">Day {e.days}</span>
      </div>
    </button>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  kind,
  series,
  tone,
  delta,
  invert,
  sub,
}: {
  icon: typeof Wallet
  label: string
  value: number
  kind: 'inr' | 'num'
  series: number[]
  tone: 'navy' | 'pos' | 'neg'
  delta?: number
  invert?: boolean
  sub?: string
}) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-sunken">
            <Icon className="h-3.5 w-3.5 text-fg-muted" />
          </span>
          <span className="text-[12.5px] font-medium text-fg-muted">{label}</span>
          {delta != null && <Delta className="ml-auto" value={delta} invert={invert} />}
        </div>
        <div className="mt-2.5 flex items-end justify-between gap-2">
          <AnimatedNumber value={value} kind={kind} className="text-[26px] font-bold tracking-tight text-fg" />
          <div className="mb-1 opacity-90">
            <Sparkline data={series} tone={tone} w={104} h={30} />
          </div>
        </div>
        {sub && <div className="mt-1 text-[11px] text-fg-subtle">{sub}</div>}
      </Card>
    </motion.div>
  )
}
