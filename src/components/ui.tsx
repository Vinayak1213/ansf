import { cva, type VariantProps } from 'class-variance-authority'
import { motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as React from 'react'

/* ---------------- Button ---------------- */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-[10px] font-medium whitespace-nowrap transition-all duration-150 disabled:opacity-45 disabled:pointer-events-none select-none active:scale-[.98]',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white shadow-xs hover:bg-brand-hover',
        navy: 'bg-navy text-white shadow-xs hover:bg-navy-hover',
        default: 'bg-panel text-fg-muted border border-line hover:border-line-strong hover:text-fg',
        ghost: 'text-brand hover:bg-brand-tint',
        subtle: 'bg-sunken text-fg-muted hover:bg-line',
        danger: 'bg-panel text-neg border border-neg/25 hover:bg-neg-tint',
      },
      size: {
        sm: 'h-8 px-3 text-[12.5px]',
        md: 'h-9 px-3.5 text-[13px]',
        lg: 'h-11 px-5 text-[14px]',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
)
Button.displayName = 'Button'

/* ---------------- Card ---------------- */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-[var(--radius-lg)] border border-line bg-panel shadow-sm', className)}
      {...props}
    />
  )
}

/* ---------------- Badge ---------------- */
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold leading-tight tracking-tight',
  {
    variants: {
      tone: {
        neutral: 'bg-sunken text-fg-muted border border-line',
        pos: 'bg-pos-tint text-pos',
        neg: 'bg-neg-tint text-neg',
        warn: 'bg-warn-tint text-warn',
        navy: 'bg-navy-tint text-navy',
        brand: 'bg-brand-tint text-brand',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)
export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}

/* ---------------- Delta chip (▲/▼ with semantic colour) ---------------- */
export function Delta({ value, invert = false, className }: { value: number; invert?: boolean; className?: string }) {
  const good = invert ? value < 0 : value > 0
  const up = value > 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11.5px] font-semibold tnum',
        good ? 'bg-pos-tint text-pos' : 'bg-neg-tint text-neg',
        className,
      )}
    >
      {up ? '↑' : '↓'}
      {Math.abs(value)}%
    </span>
  )
}

/* ---------------- Section heading ---------------- */
export function SectionHead({
  title,
  hint,
  right,
  icon,
  className,
}: {
  title: string
  hint?: string
  right?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-3 flex items-baseline gap-2.5', className)}>
      {icon && <span className="relative top-[2px] shrink-0 text-fg-muted">{icon}</span>}
      <h2 className="text-[15px] font-semibold tracking-tight text-fg">{title}</h2>
      {hint && <span className="text-[12px] text-fg-subtle">{hint}</span>}
      {right && <div className="ml-auto pl-2">{right}</div>}
    </div>
  )
}

/* ---------------- Collapsible (default-closed depth; never for a primary block) ---------------- */
export function Collapsible({
  title,
  hint,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string
  hint?: string
  icon?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <Card className="p-5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-baseline gap-2.5 text-left">
        {icon && <span className="relative top-[2px] shrink-0 text-fg-muted">{icon}</span>}
        <span className="text-[15px] font-semibold tracking-tight text-fg">{title}</span>
        {hint && <span className="text-[12px] text-fg-subtle">{hint}</span>}
        <ChevronDown className={cn('ml-auto h-4 w-4 shrink-0 self-center text-fg-subtle transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && <div className="mt-4">{children}</div>}
    </Card>
  )
}

/* ---------------- Kbd ---------------- */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-line-strong bg-panel px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle">
      {children}
    </kbd>
  )
}

/* ---------------- Segmented (e.g. Graph / Table) ---------------- */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: {
  options: { value: T; label: React.ReactNode; icon?: React.ReactNode }[]
  value: T
  onChange: (v: T) => void
  className?: string
  size?: 'sm' | 'md'
}) {
  const id = React.useId()
  return (
    <div className={cn('inline-flex rounded-[9px] border border-line bg-sunken p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'relative rounded-[7px] font-medium transition-colors',
            size === 'sm' ? 'px-2 py-1 text-[11.5px]' : 'px-2.5 py-1 text-[12px]',
            value === o.value ? 'text-fg' : 'text-fg-subtle hover:text-fg-muted',
          )}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-[7px] bg-panel shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
          )}
          <span className="relative flex items-center gap-1.5">{o.icon}{o.label}</span>
        </button>
      ))}
    </div>
  )
}

/* ---------------- Ghost "Investigate" link button ---------------- */
export function InvestigateLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand transition-colors hover:text-brand-hover">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4" />
      </svg>
      Investigate
    </button>
  )
}
