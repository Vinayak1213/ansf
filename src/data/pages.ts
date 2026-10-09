/* Page-level derivations for the Pages list & detail — all reconciling
   to each page's totals (weekly spend/leads sum to spend×3 / leads×3). */
import { EXPERIMENTS, PAGES, QUARTER, ecpl, type Net, type Page } from './samurai'

const PAGE_NET: Record<string, Net> = {
  mba: 'google', bba: 'google', mca: 'google', bca: 'google', bcom: 'meta',
  mbajul: 'meta', home: 'google', mcom: 'google', ba: 'meta', bsc: 'google',
}
export const pageNet = (id: string): Net => PAGE_NET[id] ?? 'google'

export const pageRunningTest = (id: string) =>
  EXPERIMENTS.find((e) => e.pageId === id && e.status === 'running')
export const pageEndedTest = (id: string) => EXPERIMENTS.find((e) => e.pageId === id && e.status === 'ended')

export type Health = { tone: 'ok' | 'warn' | 'bad'; txt: string }
export function pageHealth(p: Page): Health {
  if (p.fault === 'broken_form') return { tone: 'bad', txt: 'Form broken' }
  if (p.fault === 'closed_intake') return { tone: 'bad', txt: 'Intake closed' }
  if (p.leads === 0) return { tone: 'warn', txt: 'No leads yet' }
  return { tone: 'ok', txt: 'Healthy' }
}

export function lifeState(p: Page): { cls: 'mute' | 'run' | 'won' | 'base'; txt: string } {
  if (p.leads === 0) return { cls: 'mute', txt: 'Live · not converting' }
  if (pageRunningTest(p.id)) return { cls: 'run', txt: 'Testing' }
  if (pageEndedTest(p.id)) return { cls: 'won', txt: 'Winner live' }
  return { cls: 'base', txt: 'Live baseline' }
}

export const ALL_GROUPS = [...new Set(PAGES.map((p) => p.group))]

/** 13-week spend & leads for a page that sum EXACTLY to spend×3 / leads×3,
 *  with a CPL shape that carries the page's story (a step where a test shipped). */
export function pageWeekly(p: Page) {
  const N = 13
  const Lq = p.leads * 3
  const Sq = p.spend * 3
  const cur = p.leads ? p.spend / p.leads : p.spend / 1
  const ended = pageEndedTest(p.id)
  const running = pageRunningTest(p.id)
  const shipWeek = 7

  const Lw = Array.from({ length: N }, (_, i) => 1 + 0.03 * i)
  const ls = Lw.reduce((a, b) => a + b, 0)
  const L = Lw.map((w) => Math.max(1, Math.round((Lq * w) / ls)))
  L[N - 1] += Lq - L.reduce((a, b) => a + b, 0)

  const beforeCpl = ended ? (ecpl(ended.control) ?? cur * 1.12) : cur * 1.12
  const C: number[] = []
  for (let i = 0; i < N; i++) {
    if (ended) {
      C.push(i < shipWeek ? beforeCpl : beforeCpl + (cur - beforeCpl) * Math.min(1, 0.6 + 0.4 * ((i - shipWeek) / (N - 1 - shipWeek || 1))))
    } else if (running) {
      C.push(cur * (1 + ((i % 3) - 1) * 0.01) - (i >= 5 ? (i - 5) * cur * 0.004 : 0))
    } else {
      const drift = cur - 1732 > 0 ? 1 : -1
      C.push(cur * (1 + drift * 0.02 * (i - (N - 1) / 2) / N) + ((i % 4) - 1.5) * cur * 0.004)
    }
  }
  const Sraw = C.map((c, i) => c * L[i])
  const k = Sq / Sraw.reduce((a, b) => a + b, 0)
  const S = Sraw.map((s) => Math.round(s * k))
  S[N - 1] += Sq - S.reduce((a, b) => a + b, 0)
  return {
    spend: S,
    leads: L,
    cpl: S.map((s, i) => Math.round(s / L[i])),
    shipWeek: ended ? shipWeek : running ? 5 : -1,
    shipLabel: ended ? 'Winner shipped' : running ? 'Test started' : '',
  }
}

export interface AdRow {
  name: string
  net: Net
  spend: number
  clicks: number
  leads: number
  cpl: number | null
}
export function pageAds(p: Page): AdRow[] {
  const shares = [0.5, 0.3, 0.2]
  const names = p.id === 'home'
    ? ['Search — Generic', 'Search — Brand', 'Search — Competitor']
    : pageNet(p.id) === 'google'
      ? ['Search — Brand', 'Search — Generic', 'Search — Competitor']
      : ['Prospecting', 'Retargeting', 'Lookalike']
  return shares.map((sh, k) => {
    const spend = Math.round(p.spend * sh)
    const clicks = Math.round(p.clicks * sh)
    const leads = Math.round(p.leads * sh)
    return { name: names[k], net: pageNet(p.id), spend, clicks, leads, cpl: leads ? Math.round(spend / leads) : null }
  })
}

export const STATUS_OPTS: { key: string; label: string }[] = [
  { key: 'all', label: 'All pages' },
  { key: 'attention', label: 'Needs attention' },
  { key: 'testing', label: 'Testing' },
  { key: 'shipped', label: 'Winner shipped' },
  { key: 'notest', label: 'No test' },
]

export function matchStatus(p: Page, status: string): boolean {
  switch (status) {
    case 'attention': return p.leads === 0 || !!p.fault
    case 'testing': return !!pageRunningTest(p.id)
    case 'shipped': return !!pageEndedTest(p.id)
    case 'notest': return !pageRunningTest(p.id) && !pageEndedTest(p.id)
    default: return true
  }
}
