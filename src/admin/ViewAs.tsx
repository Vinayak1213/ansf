import { useState } from 'react'
import { Eye, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

/* Reason capture before opening a client's workspace as an operator. The reason is
   REAL data — it's stored on the audit event and nothing opens without one. This is
   a scoped "view-as", never a credentialed "log in as client" session. */
const REASONS = ['Troubleshooting', 'Onboarding help', 'Client request', 'Spot check']

export function ViewAsDialog({ clientName, onCancel, onConfirm }: { clientName: string; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const full = note.trim() ? `${reason} — ${note.trim()}` : reason
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" role="alertdialog" aria-modal="true" onClick={onCancel}>
      <div className="w-full max-w-[420px] rounded-[14px] border border-line bg-panel p-5 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-navy-tint text-navy"><Eye className="h-4 w-4" /></span>
          <h2 className="text-[15px] font-semibold tracking-tight text-fg">View {clientName}’s workspace</h2>
          <button onClick={onCancel} className="ml-auto grid h-7 w-7 place-items-center rounded-[7px] text-fg-subtle hover:bg-sunken hover:text-fg"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-3 text-[12.5px] leading-relaxed text-fg-subtle">You’ll open their product in a read-only operator view. This access is recorded — in production the client is notified. Why are you opening it?</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {REASONS.map((r) => (
            <button key={r} onClick={() => setReason(r)} className={cn('rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors', reason === r ? 'border-navy bg-navy-tint text-navy' : 'border-line bg-panel text-fg-muted hover:border-line-strong')}>{r}</button>
          ))}
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (optional)" className="input mb-4" />
        <div className="flex gap-2">
          <Button variant="default" size="md" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button variant="navy" size="md" className="flex-1" disabled={!reason} onClick={() => onConfirm(full)}><Eye className="h-3.5 w-3.5" /> Open workspace</Button>
        </div>
      </div>
    </div>
  )
}
