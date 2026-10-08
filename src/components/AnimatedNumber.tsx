import NumberFlow from '@number-flow/react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Rolls up from zero on mount, then animates on any value change.
 * kind picks the formatting: rupees, plain integer, or percent.
 */
export function AnimatedNumber({
  value,
  kind = 'num',
  className,
  prefix,
  suffix,
  delay = 120,
}: {
  value: number
  kind?: 'inr' | 'num' | 'pct'
  className?: string
  prefix?: string
  suffix?: string
  delay?: number
}) {
  const [v, setV] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])

  const pfx = prefix ?? (kind === 'inr' ? '₹' : '')
  const sfx = suffix ?? (kind === 'pct' ? '%' : '')

  return (
    <NumberFlow
      value={v}
      locales="en-IN"
      format={{ maximumFractionDigits: 0 }}
      prefix={pfx}
      suffix={sfx}
      className={cn('tnum', className)}
    />
  )
}
