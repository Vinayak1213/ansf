import { useEffect, useRef, useState } from 'react'
import { Eye, LogOut } from 'lucide-react'
import { useTenant } from '@/lib/tenant'
import { logAudit } from '@/lib/audit'

/* Persistent banner shown in the PRODUCT when an operator opened this workspace as a
   read-only view (?view=operator). High-contrast, can't scroll away, one-click Exit.
   Logs client.workspace.closed on exit (or auto-expire) so "how long was support in
   here" is answerable. The operator identity is the fixed prototype operator. */
const EXPIRE_MS = 20 * 60 * 1000

export function OperatorViewBanner() {
  const { tenant } = useTenant()
  const [elapsed, setElapsed] = useState(0)
  const start = useRef(Date.now())
  const closed = useRef(false)

  const exit = (auto = false) => {
    if (closed.current) return
    closed.current = true
    try {
      logAudit({
        action: 'client.workspace.closed',
        actor: { type: 'operator', id: 'operator', name: 'Samurai Operations' },
        target: { type: 'client', id: tenant.id, name: tenant.name },
        source: 'console',
        note: auto ? 'Session auto-expired after 20 minutes.' : undefined,
      })
    } catch { /* ignore */ }
    window.location.href = '/admin.html'
  }

  useEffect(() => {
    const iv = setInterval(() => {
      const e = Date.now() - start.current
      setElapsed(e)
      if (e > EXPIRE_MS) exit(true)
    }, 1000)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const mm = Math.floor(elapsed / 60000)
  const ss = Math.floor((elapsed % 60000) / 1000)
  return (
    <div className="sticky top-0 z-[70] flex items-center gap-2 bg-navy px-4 py-2 text-[12.5px] font-medium text-white shadow-sm">
      <Eye className="h-4 w-4 shrink-0" />
      <span className="min-w-0 truncate">Viewing <b>{tenant.name}</b> as Samurai Operations · read-only</span>
      <span className="ml-auto shrink-0 tabular-nums text-white/70">{mm}:{String(ss).padStart(2, '0')}</span>
      <button onClick={() => exit(false)} className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-[7px] bg-white/15 px-2.5 py-1 font-semibold transition-colors hover:bg-white/25"><LogOut className="h-3.5 w-3.5" /> Exit to Console</button>
    </div>
  )
}
