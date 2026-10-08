import { AnimatePresence, motion } from 'motion/react'
import { Check, X } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Toast = { id: number; msg: string }
const ToastCtx = createContext<(msg: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, msg }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4800)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="pointer-events-auto flex max-w-[360px] items-start gap-2.5 rounded-[12px] border border-line bg-panel px-3.5 py-3 shadow-pop"
            >
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-pos-tint">
                <Check className="h-3 w-3 text-pos" />
              </span>
              <span className="flex-1 text-[13px] leading-snug text-fg">{t.msg}</span>
              <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-fg-subtle hover:text-fg">
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}
