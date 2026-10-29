import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { OFFBOARD_REASONS } from '@/lib/tenant'
import { cn } from '@/lib/utils'

export type OffboardKind = 'suspend' | 'archive' | 'delete' | 'purge'

const META: Record<OffboardKind, { title: (n: string) => string; consequence: string; cta: string; danger: boolean; needsReason: boolean }> = {
  suspend: {
    title: (n) => `Suspend ${n}?`,
    consequence: 'Stops the workspace loading and hides it from the client. Fully reversible — reactivate anytime.',
    cta: 'Suspend', danger: true, needsReason: true,
  },
  archive: {
    title: (n) => `Archive ${n}?`,
    consequence: 'Closes the relationship but keeps the record read-only for history. Hidden from the default client list; you can restore it.',
    cta: 'Archive', danger: false, needsReason: true,
  },
  delete: {
    title: (n) => `Delete ${n}?`,
    consequence: 'Soft-deletes the workspace. The record is kept and restorable — nothing is permanently removed here.',
    cta: 'Delete', danger: true, needsReason: true,
  },
  purge: {
    title: (n) => `Permanently remove ${n}?`,
    consequence: 'Deletes the client and its record for good. This cannot be undone. (A production build would require elevated operator permission.)',
    cta: 'Permanently remove', danger: true, needsReason: false,
  },
}

export function OffboardDialog({ kind, clientName, restorableUntil, onCancel, onConfirm }: {
  kind: OffboardKind
  clientName: string
  restorableUntil?: string
  onCancel: () => void
  onConfirm: (reason: string) => void
}) {
  const m = META[kind]
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [typed, setTyped] = useState('')
  const reasonOk = !m.needsReason || !!reason
  const purgeOk = kind !== 'purge' || typed.trim() === clientName
  const full = [reason && OFFBOARD_REASONS.find((r) => r.id === reason)?.label, note.trim()].filter(Boolean).join(' — ')

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" role="alertdialog" aria-modal="true" onClick={onCancel}>
      <div className="w-full max-w-[440px] rounded-[14px] border border-line bg-panel p-5 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center gap-2">
          <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-[9px]', m.danger ? 'bg-neg-tint text-neg' : 'bg-navy-tint text-navy')}><AlertTriangle className="h-4 w-4" /></span>
          <h2 className="text-[15px] font-semibold tracking-tight text-fg">{m.title(clientName)}</h2>
          <button onClick={onCancel} className="ml-auto grid h-7 w-7 place-items-center rounded-[7px] text-fg-subtle hover:bg-sunken hover:text-fg"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-3 text-[12.5px] leading-relaxed text-fg-subtle">{m.consequence}{kind === 'delete' && restorableUntil && <> Restorable until <b className="text-fg-muted">{restorableUntil}</b>.</>}</p>

        {m.needsReason && (
          <>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {OFFBOARD_REASONS.map((r) => (
                <button key={r.id} onClick={() => setReason(r.id)} className={cn('rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors', reason === r.id ? 'border-navy bg-navy-tint text-navy' : 'border-line bg-panel text-fg-muted hover:border-line-strong')}>{r.label}</button>
              ))}
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (optional)" className="input mb-4" />
          </>
        )}

        {kind === 'purge' && (
          <label className="mb-4 block">
            <span className="mb-1.5 block text-[12px] font-medium text-fg-muted">Type <b className="text-fg">{clientName}</b> to confirm</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={clientName} className="input" />
          </label>
        )}

        <div className="flex gap-2">
          <Button variant="default" size="md" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button variant={m.danger ? 'danger' : 'navy'} size="md" className="flex-1" disabled={!reasonOk || !purgeOk} onClick={() => onConfirm(full)}>{m.cta}</Button>
        </div>
      </div>
    </div>
  )
}
