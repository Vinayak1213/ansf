import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface Column {
  key: string
  label: string
  align?: 'left' | 'right'
}
export interface InvestigatePayload {
  title: string
  definition?: string
  /** rich custom content rendered in place of the table (e.g. a Lead Story timeline). */
  body?: ReactNode
  columns?: Column[]
  rows?: Record<string, ReactNode>[]
  foot?: Record<string, ReactNode>
  note?: string
}

const Ctx = createContext<(p: InvestigatePayload) => void>(() => {})
export const useInvestigate = () => useContext(Ctx)

export function InvestigateProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<InvestigatePayload | null>(null)
  const [open, setOpen] = useState(false)
  const openWith = useCallback((p: InvestigatePayload) => {
    setPayload(p)
    setOpen(true)
  }, [])

  return (
    <Ctx.Provider value={openWith}>
      {children}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <AnimatePresence>
          {open && payload && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div className="fixed inset-0 z-50 bg-fg/25 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  className="fixed right-0 top-0 z-50 flex h-full w-[560px] max-w-[calc(100vw-24px)] flex-col border-l border-line bg-panel shadow-lg focus:outline-none"
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', stiffness: 360, damping: 38 }}
                >
                  <div className="flex items-start gap-3 border-b border-line px-5 py-4">
                    <div className="flex-1">
                      <Dialog.Title className="text-[15px] font-semibold text-fg">{payload.title}</Dialog.Title>
                      <Dialog.Description className="mt-0.5 text-[12px] text-fg-subtle">The numbers behind the headline — reconciled, and yours to inspect.</Dialog.Description>
                    </div>
                    <Dialog.Close className="rounded-md p-1 text-fg-subtle transition-colors hover:bg-sunken hover:text-fg">
                      <X className="h-4 w-4" />
                    </Dialog.Close>
                  </div>
                  <div className="flex-1 overflow-y-auto px-5 py-4">
                    {payload.definition && (
                      <p className="mb-4 rounded-[10px] border border-line bg-sunken px-3.5 py-2.5 text-[12.5px] leading-relaxed text-fg-muted">{payload.definition}</p>
                    )}
                    {payload.body}
                    {payload.columns && payload.rows && (
                      <div className="overflow-x-auto rounded-[10px] border border-line">
                        <table className="w-full text-[12.5px]">
                          <thead>
                            <tr className="border-b border-line bg-surface/60 text-fg-subtle">
                              {payload.columns.map((c) => (
                                <th key={c.key} className={cn('px-3 py-2 font-medium', c.align === 'right' ? 'text-right' : 'text-left')}>
                                  {c.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {payload.rows.map((r, i) => (
                              <tr key={i} className="border-b border-line last:border-0 hover:bg-sunken/60">
                                {payload.columns!.map((c) => (
                                  <td key={c.key} className={cn('px-3 py-2 text-fg', c.align === 'right' ? 'text-right tnum' : 'text-left')}>
                                    {r[c.key]}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                          {payload.foot && (
                            <tfoot>
                              <tr className="border-t border-line bg-surface/60 font-semibold text-fg">
                                {payload.columns.map((c) => (
                                  <td key={c.key} className={cn('px-3 py-2', c.align === 'right' ? 'text-right tnum' : 'text-left')}>
                                    {payload.foot![c.key]}
                                  </td>
                                ))}
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    )}
                    {payload.note && <p className="mt-3 text-[11.5px] leading-relaxed text-fg-subtle">{payload.note}</p>}
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </Ctx.Provider>
  )
}
