import { motion } from 'motion/react'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { RANGES, type RangeKey } from '@/data/samurai'
import { cn } from '@/lib/utils'

const RangeCtx = createContext<{ range: RangeKey; setRange: (r: RangeKey) => void; factor: number; label: string }>({
  range: '30d',
  setRange: () => {},
  factor: 1,
  label: 'Last 30 days',
})
export const useRange = () => useContext(RangeCtx)

export function RangeProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<RangeKey>('30d')
  return (
    <RangeCtx.Provider value={{ range, setRange, factor: RANGES[range].factor, label: RANGES[range].label }}>
      {children}
    </RangeCtx.Provider>
  )
}

export function RangePicker() {
  const { range, setRange } = useRange()
  const keys: RangeKey[] = ['7d', '30d', '3m', '6m']
  return (
    <div className="inline-flex rounded-[10px] border border-line bg-sunken p-0.5">
      {keys.map((k) => (
        <button
          key={k}
          onClick={() => setRange(k)}
          className={cn('relative rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium transition-colors', range === k ? 'text-fg' : 'text-fg-subtle hover:text-fg-muted')}
        >
          {range === k && <motion.span layoutId="range-active" className="absolute inset-0 rounded-[8px] bg-panel shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
          <span className="relative">{RANGES[k].label.replace('Last ', '')}</span>
        </button>
      ))}
    </div>
  )
}
