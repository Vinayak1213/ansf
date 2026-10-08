import { motion } from 'motion/react'
import { Construction } from 'lucide-react'
import type { Screen } from '@/components/Shell'

const COPY: Partial<Record<Screen, { title: string; body: string }>> = {
  pages: { title: 'Pages', body: 'Every landing page ranked by cost per lead, with group filters and a drill-down to each page’s funnel and health.' },
  experiments: { title: 'Experiments', body: 'Which A/B tests are winning and what to do next — with a verdict, the evidence, and a create-experiment flow.' },
  campaigns: { title: 'Campaigns', body: 'Where the money goes and what it returns, including the Google-vs-Meta platform split.' },
  settings: { title: 'Settings', body: 'Self-serve tenant configuration — connections, tag health, intakes & targets, team, and privacy.' },
}

export function Placeholder({ screen }: { screen: Screen }) {
  const c = COPY[screen] ?? { title: 'Coming next', body: '' }
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-[420px] text-center">
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-[14px] border border-line bg-panel shadow-sm">
          <Construction className="h-5 w-5 text-fg-subtle" />
        </span>
        <h1 className="text-[20px] font-semibold tracking-tight text-fg">{c.title}</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-fg-subtle">{c.body}</p>
        <p className="mt-4 text-[12px] text-fg-subtle">Designed next, consistent with the system you see in Overview and Samurai AI.</p>
      </motion.div>
    </div>
  )
}
