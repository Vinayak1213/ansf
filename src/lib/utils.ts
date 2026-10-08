import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const numFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

/** Indian-format rupees, e.g. ₹6,20,009 */
export function inr(n: number): string {
  return '₹' + inrFmt.format(Math.round(n))
}

/** Compact rupees for tight axes, e.g. ₹6.2L, ₹1.2Cr */
export function inrCompact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_00_00_000) return '₹' + (n / 1_00_00_000).toFixed(1).replace(/\.0$/, '') + 'Cr'
  if (abs >= 1_00_000) return '₹' + (n / 1_00_000).toFixed(1).replace(/\.0$/, '') + 'L'
  if (abs >= 1_000) return '₹' + (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k'
  return '₹' + Math.round(n)
}

/** Indian-format integer, e.g. 6,20,009 */
export function num(n: number): string {
  return numFmt.format(Math.round(n))
}

/** Signed percent, e.g. +12% / -8% */
export function pct(n: number): string {
  return (n > 0 ? '+' : '') + Math.round(n) + '%'
}

export function cls(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ')
}
