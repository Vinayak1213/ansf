import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { AnimatePresence, motion } from 'motion/react'
import { BellRing, Check, ChevronsUpDown, FlaskConical, LayoutDashboard, Megaphone, PanelLeft, ChevronLeft, Plus, ScrollText, Search, Settings, Sparkles, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNav } from '@/lib/nav'
import { useTenant } from '@/lib/tenant'
import { CAMPAIGNS, EXPERIMENTS, PAGES } from '@/data/samurai'
import { criticalCount } from '@/data/alerts'
import { Kbd } from './ui'

export type Screen = 'overview' | 'alerts' | 'audience' | 'studio' | 'decisions' | 'pages' | 'experiments' | 'campaigns' | 'ai' | 'settings'

// Counts read from the seed data so the sidebar always reconciles with each section's list.
const NAV: { id: Screen; label: string; icon: typeof LayoutDashboard; count?: number }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'alerts', label: 'Alerts', icon: BellRing, count: criticalCount() },
  { id: 'audience', label: 'Audience', icon: Users },
  { id: 'pages', label: 'Pages', icon: ScrollText, count: PAGES.length },
  { id: 'experiments', label: 'Experiments', icon: FlaskConical, count: EXPERIMENTS.length },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone, count: CAMPAIGNS.length },
]

export function Sidebar({ active, onNavigate, collapsed, onToggleCollapse }: { active: Screen; onNavigate: (s: Screen) => void; collapsed: boolean; onToggleCollapse: () => void }) {
  const { tenant } = useTenant()
  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 232 }}
      transition={{ type: 'spring', stiffness: 420, damping: 38 }}
      className="group/side sticky top-0 z-30 flex h-screen shrink-0 flex-col overflow-hidden border-r border-line bg-canvas"
    >
      {/* brand + collapse toggle */}
      <div className={cn('flex h-14 items-center', collapsed ? 'justify-center px-0' : 'gap-2.5 px-4')}>
        <div className="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] bg-brand shadow-[inset_0_1px_0_rgba(255,255,255,.28)]">
          <span className="block h-2 w-2 rounded-full bg-white" />
        </div>
        {!collapsed && <span className="text-[15px] font-semibold tracking-tight text-fg">Samurai</span>}
        {!collapsed && (
          <button onClick={onToggleCollapse} title="Collapse sidebar" className="ml-auto grid h-7 w-7 place-items-center rounded-[7px] text-fg-subtle transition-colors hover:bg-sunken hover:text-fg">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {!collapsed && <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">Workspace</div>}
      <nav className={cn('flex flex-col gap-0.5', collapsed ? 'items-center px-2 pt-2' : 'px-2.5')}>
        {NAV.map((n) => (
          <NavButton key={n.id} n={n} active={active === n.id} collapsed={collapsed} onClick={() => onNavigate(n.id)} />
        ))}
      </nav>

      {/* AI — set apart */}
      {!collapsed && <div className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">Intelligence</div>}
      <div className={cn(collapsed ? 'flex justify-center px-2 pt-1' : 'px-2.5')}>
        <button
          onClick={() => onNavigate('ai')}
          aria-current={active === 'ai'}
          title={collapsed ? 'Samurai AI' : undefined}
          className={cn(
            'group flex items-center rounded-[9px] text-[14px] font-medium transition-colors',
            collapsed ? 'h-9 w-9 justify-center' : 'w-full gap-2.5 px-2.5 py-2',
            active === 'ai' ? 'bg-navy-tint text-navy' : 'text-fg-muted hover:bg-sunken hover:text-fg',
          )}
        >
          <Sparkles className={cn('h-[18px] w-[18px] shrink-0', active === 'ai' ? 'text-navy' : 'text-navy/70')} />
          {!collapsed && 'Samurai AI'}
          {!collapsed && (
            <span className="ml-auto rounded-[5px] border border-navy/15 bg-navy-tint px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-navy">Beta</span>
          )}
        </button>
      </div>

      {/* expand affordance when collapsed */}
      {collapsed && (
        <div className="flex justify-center px-2 pt-2">
          <button onClick={onToggleCollapse} title="Expand sidebar" className="grid h-9 w-9 place-items-center rounded-[9px] text-fg-subtle transition-colors hover:bg-sunken hover:text-fg">
            <PanelLeft className="h-[18px] w-[18px]" />
          </button>
        </div>
      )}

      {/* footer */}
      <div className={cn('mt-auto border-t border-line', collapsed ? 'flex flex-col items-center gap-1 py-2.5' : 'p-2.5')}>
        <button
          onClick={() => onNavigate('settings')}
          aria-current={active === 'settings'}
          title={collapsed ? 'Settings' : undefined}
          className={cn(
            'flex items-center rounded-[9px] text-[13.5px] font-medium transition-colors',
            collapsed ? 'h-9 w-9 justify-center' : 'w-full gap-2.5 px-2.5 py-2',
            active === 'settings' ? 'bg-sunken text-fg' : 'text-fg-muted hover:bg-sunken hover:text-fg',
          )}
        >
          <Settings className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && 'Settings'}
        </button>
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'mt-1 gap-2.5 rounded-[9px] px-2.5 py-2')}>
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-navy text-[11px] font-semibold text-white" title={collapsed ? `Akshay R · ${tenant.name}` : undefined}>AR</div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-[12.5px] font-medium text-fg">Akshay R</div>
              <div className="truncate text-[11px] text-fg-subtle">{tenant.name} · Owner</div>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  )
}

function NavButton({ n, active, collapsed, onClick }: { n: (typeof NAV)[number]; active: boolean; collapsed: boolean; onClick: () => void }) {
  const Icon = n.icon
  return (
    <button
      onClick={onClick}
      aria-current={active}
      title={collapsed ? n.label : undefined}
      className={cn(
        'relative flex items-center rounded-[9px] text-[14px] font-medium transition-colors',
        collapsed ? 'h-9 w-9 justify-center' : 'gap-2.5 px-2.5 py-2',
        active ? 'bg-brand-tint text-brand' : 'text-fg-muted hover:bg-sunken hover:text-fg',
      )}
    >
      {active && <motion.span layoutId="nav-active" className="absolute inset-0 -z-10 rounded-[9px] bg-brand-tint" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && n.label}
      {!collapsed && n.count != null && <span className="ml-auto text-[11px] tabular-nums text-fg-subtle">{n.count}</span>}
    </button>
  )
}

export function Topbar({ collapsed, onToggleCollapse }: { collapsed: boolean; onToggleCollapse: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-md backdrop-saturate-150">
      <AnimatePresence initial={false}>
        {collapsed && (
          <motion.button
            initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 34 }} exit={{ opacity: 0, width: 0 }}
            onClick={onToggleCollapse} title="Expand sidebar"
            className="grid h-[34px] shrink-0 place-items-center overflow-hidden rounded-[9px] border border-line bg-sunken text-fg-subtle transition-colors hover:border-line-strong hover:text-fg"
          >
            <PanelLeft className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>
      <button className="flex h-9 max-w-[420px] flex-1 items-center gap-2 rounded-[9px] border border-line bg-sunken px-3 text-[13px] text-fg-subtle transition-colors hover:border-line-strong">
        <Search className="h-4 w-4" />
        Search pages, campaigns, experiments
        <span className="ml-auto">
          <Kbd>⌘K</Kbd>
        </span>
      </button>
      <div className="ml-auto flex items-center gap-2 text-[13px] font-medium text-fg-muted">
        <span className="hidden items-center gap-1.5 sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-pos" />
          Data live
        </span>
        <span className="mx-1 hidden h-4 w-px bg-line sm:block" />
        <WorkspaceSwitcher />
      </div>
    </header>
  )
}

/* client / tenant switcher — the Samurai brand stays constant, only the client whose data you view changes */
function WorkspaceSwitcher() {
  const { tenant, tenants, switchTo } = useTenant()
  const { go } = useNav()
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-2 rounded-[9px] px-1.5 py-1 font-medium text-fg-muted transition-colors hover:bg-sunken hover:text-fg">
          <span className="grid h-6 w-6 place-items-center rounded-[6px] bg-navy text-[9px] font-bold text-white">{tenant.initials}</span>
          <span className="max-w-[140px] truncate">{tenant.name}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-[256px] rounded-[12px] border border-line bg-panel p-1.5 shadow-pop">
          <div className="px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-fg-subtle">Client workspaces</div>
          {tenants.map((t) => (
            <DropdownMenu.Item key={t.id} onSelect={() => switchTo(t.id)} className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 outline-none data-[highlighted]:bg-sunken">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[7px] bg-navy text-[10px] font-bold text-white">{t.initials}</span>
              <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-medium text-fg">{t.name}</div><div className="truncate text-[11px] text-fg-subtle">{t.domain || (t.fresh ? 'Needs setup' : t.industry)}</div></div>
              {t.id === tenant.id && <Check className="h-4 w-4 shrink-0 text-brand" />}
            </DropdownMenu.Item>
          ))}
          <div className="my-1 h-px bg-line" />
          <DropdownMenu.Item onSelect={() => go('onboarding')} className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-[13px] font-medium text-navy outline-none data-[highlighted]:bg-navy-tint">
            <span className="grid h-7 w-7 place-items-center rounded-[7px] border border-dashed border-navy/40"><Plus className="h-3.5 w-3.5" /></span>
            Onboard a new client
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => go('settings')} className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-[13px] text-fg-muted outline-none data-[highlighted]:bg-sunken">
            <span className="grid h-7 w-7 place-items-center rounded-[7px] text-fg-subtle"><Settings className="h-3.5 w-3.5" /></span>
            Workspace settings
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
