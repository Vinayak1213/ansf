import { useState } from 'react'
import { NavProvider, baseOf, useNav } from '@/lib/nav'
import { TenantProvider } from '@/lib/tenant'
import { Onboarding } from '@/features/onboarding/Onboarding'
import { RangeProvider } from '@/lib/range'
import { InvestigateProvider } from '@/components/Investigate'
import { ToastProvider } from '@/components/Toast'
import { Sidebar, Topbar, type Screen } from '@/components/Shell'
import { Overview } from '@/features/Overview'
import { Pages } from '@/features/Pages'
import { PageDetail } from '@/features/PageDetail'
import { Experiments } from '@/features/Experiments'
import { ExperimentDetail } from '@/features/ExperimentDetail'
import { TemplateBuilder } from '@/features/experiments/builder/TemplateBuilder'
import { ExperimentsProvider } from '@/features/experiments/ExperimentsProvider'
import { Campaigns } from '@/features/Campaigns'
import { CampaignDetail } from '@/features/CampaignDetail'
import { Settings } from '@/features/Settings'
import { SamuraiAI } from '@/ai/SamuraiAI'

function readCollapsed() {
  try { return localStorage.getItem('samurai.sidebar') === 'collapsed' } catch { return false }
}

function AppInner() {
  const { route, go } = useNav()
  const base = baseOf(route.name)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const toggleCollapse = () => setCollapsed((c) => { const n = !c; try { localStorage.setItem('samurai.sidebar', n ? 'collapsed' : 'open') } catch { /* ignore */ } return n })

  // Focused, full-screen journeys — they take over the whole viewport (no shell).
  if (route.name === 'sandbox') return <TemplateBuilder id={route.param!} />
  if (route.name === 'onboarding') return <Onboarding />

  return (
    <div className="flex min-h-screen bg-surface text-fg">
      <Sidebar active={base as Screen} onNavigate={(s) => go(s)} collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
        <main className="flex-1" key={route.name + (route.param ?? '')}>
          {route.name === 'overview' && <Overview />}
          {route.name === 'pages' && <Pages />}
          {route.name === 'pagedetail' && <PageDetail id={route.param!} />}
          {route.name === 'ai' && <SamuraiAI />}
          {route.name === 'experiments' && <Experiments />}
          {route.name === 'experimentdetail' && <ExperimentDetail id={route.param!} />}
          {route.name === 'campaigns' && <Campaigns />}
          {route.name === 'campaigndetail' && <CampaignDetail id={route.param!} />}
          {route.name === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <InvestigateProvider>
        <RangeProvider>
          <NavProvider>
            <TenantProvider>
              <ExperimentsProvider>
                <AppInner />
              </ExperimentsProvider>
            </TenantProvider>
          </NavProvider>
        </RangeProvider>
      </InvestigateProvider>
    </ToastProvider>
  )
}
