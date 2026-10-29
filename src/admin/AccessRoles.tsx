import { Check, KeyRound, Minus, ShieldCheck } from 'lucide-react'
import { Badge, Card } from '@/components/ui'
import { cn } from '@/lib/utils'
import { ALL_CAPS, CAP_LABEL, ROLE_META, roleCan, useOperator, type OperatorRole } from './operator'
import { OPERATOR } from './lib'

const ROLES: OperatorRole[] = ['admin', 'csm', 'support']

export function AccessRoles() {
  const { role } = useOperator()
  return (
    <div className="mx-auto max-w-[920px] px-6 py-7">
      <div className="mb-5">
        <h1 className="text-[22px] font-semibold tracking-tight text-fg">Access &amp; roles</h1>
        <p className="mt-0.5 text-[13px] text-fg-subtle">What each operator role can do. Gating also runs inside every action handler — not just the buttons.</p>
      </div>

      {/* current operator */}
      <Card className="mb-4 flex items-center gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-navy text-[12px] font-bold text-white">{OPERATOR.initials}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-fg">{OPERATOR.name}</div>
          <div className="truncate text-[12px] text-fg-subtle">{OPERATOR.email}</div>
        </div>
        <Badge tone="navy"><ShieldCheck className="h-3 w-3" /> {ROLE_META[role].label}</Badge>
      </Card>

      {/* role cards */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {ROLES.map((r) => (
          <Card key={r} className={cn('p-4', r === role && 'ring-1 ring-navy')}>
            <div className="flex items-center gap-1.5">
              <span className="text-[13.5px] font-semibold text-fg">{ROLE_META[r].label}</span>
              {r === role && <Badge tone="navy">Active</Badge>}
            </div>
            <p className="mt-1 text-[11.5px] leading-snug text-fg-subtle">{ROLE_META[r].blurb}</p>
          </Card>
        ))}
      </div>

      {/* capability matrix */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1.6fr_repeat(3,0.8fr)] gap-2 border-b border-line bg-sunken/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
          <span>Capability</span>
          {ROLES.map((r) => <span key={r} className="text-center">{ROLE_META[r].label.split(' ')[0]}</span>)}
        </div>
        {ALL_CAPS.map((cap) => (
          <div key={cap} className="grid grid-cols-[1.6fr_repeat(3,0.8fr)] items-center gap-2 border-b border-line px-4 py-2.5 text-[13px] last:border-0">
            <span className="text-fg">{CAP_LABEL[cap]}</span>
            {ROLES.map((r) => (
              <span key={r} className="flex justify-center">
                {roleCan(r, cap)
                  ? <Check className="h-4 w-4 text-pos" />
                  : <Minus className="h-4 w-4 text-fg-subtle/40" />}
              </span>
            ))}
          </div>
        ))}
      </Card>

      <p className="mt-3 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-fg-subtle">
        <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Roles aren’t enforced by a server in this prototype — there’s one operator account, and the role switcher (top-left) previews what each role sees and can do. A production build adds real per-operator accounts and sign-in.
      </p>
    </div>
  )
}
