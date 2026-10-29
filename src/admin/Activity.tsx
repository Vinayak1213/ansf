import { useMemo, useState } from 'react'
import { Download, ScrollText, Search } from 'lucide-react'
import { Button, Card, Segmented } from '@/components/ui'
import { actionVerb, auditTime, auditToCsv, useAudit, type AuditAction, type AuditEvent } from '@/lib/audit'
import { cn } from '@/lib/utils'
import type { Go } from './lib'

type Group = 'all' | 'provisioning' | 'access' | 'lifecycle' | 'views'
const GROUP_OF: Record<AuditAction, Group> = {
  'client.created': 'provisioning', 'client.invited': 'provisioning', 'client.credentials.issued': 'provisioning', 'self-serve.signup': 'provisioning',
  'client.invite.resent': 'access', 'client.credentials.regenerated': 'access', 'client.signin.recorded': 'access',
  'client.suspended': 'lifecycle', 'client.reactivated': 'lifecycle', 'client.plan.changed': 'lifecycle', 'client.updated': 'lifecycle',
  'client.archived': 'lifecycle', 'client.deleted': 'lifecycle', 'client.restored': 'lifecycle', 'client.purged': 'lifecycle',
  'client.workspace.opened': 'views', 'client.workspace.closed': 'views',
}

function download(name: string, text: string, type: string) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type }))
    const a = document.createElement('a')
    a.href = url; a.download = name; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch { /* ignore */ }
}

export function Activity({ go }: { go: Go }) {
  const { events } = useAudit()
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<Group>('all')

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return events.filter((e) => {
      if (group !== 'all' && GROUP_OF[e.action] !== group) return false
      if (!needle) return true
      return [e.target?.name, e.actor.name, e.action, e.reason].filter(Boolean).some((s) => s!.toLowerCase().includes(needle))
    })
  }, [events, q, group])

  return (
    <div className="mx-auto max-w-[920px] px-6 py-7">
      <div className="mb-5 flex items-end gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-fg">Activity</h1>
          <p className="mt-0.5 text-[13px] text-fg-subtle">Every action taken in the Console, newest first.</p>
        </div>
        <div className="ml-auto flex shrink-0 gap-2">
          <Button variant="default" size="md" disabled={!events.length} onClick={() => download('samurai-activity.csv', auditToCsv(events), 'text/csv')}><Download className="h-3.5 w-3.5" /> CSV</Button>
          <Button variant="default" size="md" disabled={!events.length} onClick={() => download('samurai-activity.json', JSON.stringify(events, null, 2), 'application/json')}><Download className="h-3.5 w-3.5" /> JSON</Button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-[9px] border border-line bg-panel px-3 text-[13px] text-fg-subtle focus-within:border-brand">
          <Search className="h-4 w-4 shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search client, action, reason…" className="w-full bg-transparent text-fg outline-none placeholder:text-fg-subtle" />
        </div>
        <Segmented<Group>
          value={group}
          onChange={setGroup}
          options={[
            { value: 'all', label: 'All' },
            { value: 'provisioning', label: 'Provisioning' },
            { value: 'access', label: 'Access' },
            { value: 'lifecycle', label: 'Lifecycle' },
            { value: 'views', label: 'Views' },
          ]}
        />
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <ScrollText className="mx-auto mb-2 h-6 w-6 text-fg-subtle" />
            <p className="text-[13px] text-fg-muted">{events.length ? 'Nothing matches.' : 'No activity yet.'}</p>
            {!events.length && <p className="mt-0.5 text-[11.5px] text-fg-subtle">Actions you take in the Console appear here as they happen.</p>}
          </div>
        ) : (
          rows.map((e) => <Row key={e.id} e={e} onClient={(id, name) => go({ name: 'client', id })} />)
        )}
      </Card>

      <p className="mt-3 text-[11.5px] leading-relaxed text-fg-subtle">Append-only within the app — the log is never edited or deleted here. (localStorage is editable from devtools; a production build adds server-side immutability and retention.)</p>
    </div>
  )
}

function Row({ e, onClient }: { e: AuditEvent; onClient: (id: string, name: string) => void }) {
  const hasRaw = !!(e.changes?.before || e.changes?.after)
  return (
    <div className="border-b border-line px-4 py-3 last:border-0">
      <div className="flex items-start gap-2.5">
        <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', GROUP_OF[e.action] === 'lifecycle' ? 'bg-warn' : GROUP_OF[e.action] === 'views' ? 'bg-navy/50' : 'bg-pos/60')} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] text-fg">
            {e.actor.name} {actionVerb(e.action)}{' '}
            {e.target && <button onClick={() => onClient(e.target!.id, e.target!.name)} className="font-medium text-navy hover:underline">{e.target.name}</button>}
          </div>
          {(e.reason || e.note) && <div className="text-[11.5px] text-fg-subtle">{[e.reason, e.note].filter(Boolean).join(' · ')}</div>}
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-fg-subtle">
            <span>{auditTime(e.ts)}</span>
            {e.actor.role && <><span>·</span><span>{e.actor.role}</span></>}
          </div>
          {hasRaw && (
            <details className="mt-1">
              <summary className="cursor-pointer select-none text-[11px] text-fg-subtle hover:text-fg">Details</summary>
              <pre className="mt-1 overflow-x-auto rounded-[8px] bg-sunken/60 p-2.5 font-mono text-[11px] text-fg-muted">{JSON.stringify({ before: e.changes?.before, after: e.changes?.after }, null, 2)}</pre>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}
