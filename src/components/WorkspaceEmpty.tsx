import { FlaskConical, LayoutGrid, Megaphone, Rocket, ScrollText, ShieldCheck, Sparkles, Users, Workflow } from 'lucide-react'
import { Card } from './ui'

/* Honest empty state for a workspace that has no data of its own yet. The bundled
   demo dataset belongs to one tenant; every other workspace shows this instead of
   another client's numbers. Copy is plain-language and names the one thing that
   makes data appear (connect sources), never a fabricated figure. */
type ScreenKey = 'pages' | 'experiments' | 'campaigns' | 'decisions' | 'alerts' | 'audience' | 'studio' | 'ai'

const COPY: Record<ScreenKey, { icon: typeof ScrollText; title: string; message: string }> = {
  pages: { icon: ScrollText, title: 'No pages yet', message: 'Import this workspace’s live landing-page URLs or build one. Samurai ranks them by cost per lead once spend and leads start flowing in.' },
  experiments: { icon: FlaskConical, title: 'No experiments yet', message: 'Once pages are in, pick one, change a single thing, and Samurai proves the winner against cost per lead.' },
  campaigns: { icon: Megaphone, title: 'No campaigns yet', message: 'Connect Google Ads and Meta in Settings — this workspace’s campaigns and their spend appear here automatically.' },
  decisions: { icon: Rocket, title: 'No decisions yet', message: 'As data flows in, Samurai surfaces the spend to move and the tests to ship for this workspace.' },
  alerts: { icon: ShieldCheck, title: 'No alerts yet', message: 'Samurai raises alerts — dead spend, wrong-page, pacing — the moment this workspace’s data is flowing.' },
  audience: { icon: Users, title: 'No audience data yet', message: 'Connect this workspace’s pages and ad accounts — Samurai shows which pages and channels bring leads once sessions and spend flow in.' },
  studio: { icon: Workflow, title: 'Nothing to map yet', message: 'This workspace’s funnel from spend to closed lead appears once its data sources are connected.' },
  ai: { icon: Sparkles, title: 'Nothing to analyse yet', message: 'Connect this workspace’s data and Samurai AI will surface this week’s money moves for it.' },
}

export function WorkspaceEmpty({ screen }: { screen: ScreenKey }) {
  const c = COPY[screen] ?? { icon: LayoutGrid, title: 'No data yet', message: 'Connect this workspace’s data sources to see its numbers here.' }
  const Icon = c.icon
  return (
    <div className="mx-auto max-w-[560px] px-8 py-16">
      <Card className="flex flex-col items-center p-10 text-center">
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-[14px] bg-navy-tint text-navy"><Icon className="h-6 w-6" /></span>
        <h2 className="text-[16px] font-semibold tracking-tight text-fg">{c.title}</h2>
        <p className="mx-auto mt-1.5 max-w-[44ch] text-[13px] leading-relaxed text-fg-subtle">{c.message}</p>
      </Card>
    </div>
  )
}
