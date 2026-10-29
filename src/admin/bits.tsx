import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { copyText } from './lib'

/** A read-only value with a copy button that honestly confirms the copy worked. */
export function CopyField({ value, mono }: { value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false)
  const onCopy = async () => { if (await copyText(value)) { setCopied(true); setTimeout(() => setCopied(false), 1600) } }
  return (
    <div className="flex items-center gap-2 rounded-[9px] border border-line bg-sunken/60 px-3 py-2">
      <span className={cn('min-w-0 flex-1 truncate text-[12.5px] text-fg', mono && 'font-mono')}>{value}</span>
      <button onClick={onCopy} className={cn('inline-flex shrink-0 items-center gap-1 rounded-[7px] px-2 py-1 text-[11.5px] font-medium transition-colors', copied ? 'bg-pos-tint text-pos' : 'bg-panel text-fg-muted hover:text-fg')}>
        {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
      </button>
    </div>
  )
}

/** One line in a "what happens next" checklist — done (solid check) or pending (dashed). */
export function StepLine({ label, done }: { label: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold', done ? 'bg-pos text-white' : 'border border-dashed border-line-strong text-fg-subtle')}>{done ? <Check className="h-3 w-3" /> : ''}</span>
      <span className={cn('text-[13px]', done ? 'text-fg' : 'text-fg-muted')}>{label}</span>
    </div>
  )
}
