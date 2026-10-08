import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'motion/react'
import { ShieldCheck, X } from 'lucide-react'
import { useState } from 'react'
import { APPLY_COPY, type ApplyAction } from './engine'
import { Button } from '@/components/ui'
import { useToast } from '@/components/Toast'

/** Human-in-the-loop: "the AI builds the case, you make the call." */
export function ApprovalButton({ action }: { action: ApplyAction }) {
  const [open, setOpen] = useState(false)
  const toast = useToast()
  const copy = APPLY_COPY[action.kind]
  const primary = action.kind === 'starttest' || action.kind === 'fixform'
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant={primary ? 'navy' : 'default'} size="sm">
          {action.label}
        </Button>
      </Dialog.Trigger>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div className="fixed inset-0 z-50 bg-fg/25 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className="fixed left-1/2 top-1/2 z-50 w-[440px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-[16px] border border-line bg-panel shadow-lg focus:outline-none"
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 6 }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              >
                <div className="flex items-start gap-3 border-b border-line p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-navy-tint">
                    <ShieldCheck className="h-5 w-5 text-navy" />
                  </span>
                  <div className="flex-1">
                    <Dialog.Title className="text-[15px] font-semibold text-fg">{copy.title}</Dialog.Title>
                    <Dialog.Description className="mt-0.5 text-[12px] text-fg-subtle">
                      Samurai AI builds the case — you make the call.
                    </Dialog.Description>
                  </div>
                  <Dialog.Close className="text-fg-subtle hover:text-fg">
                    <X className="h-4 w-4" />
                  </Dialog.Close>
                </div>
                <div className="p-4">
                  <p className="text-[13.5px] leading-relaxed text-fg-muted">{copy.body}</p>
                  <p className="mt-3 rounded-[10px] bg-sunken px-3 py-2 text-[12px] text-fg-subtle">
                    Nothing changes until you confirm. The action is logged and reversible.
                  </p>
                </div>
                <div className="flex justify-end gap-2 border-t border-line p-3">
                  <Dialog.Close asChild>
                    <Button variant="default" size="sm">
                      Cancel
                    </Button>
                  </Dialog.Close>
                  <Button
                    variant="navy"
                    size="sm"
                    onClick={() => {
                      setOpen(false)
                      toast(copy.done)
                    }}
                  >
                    {copy.confirm}
                  </Button>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
