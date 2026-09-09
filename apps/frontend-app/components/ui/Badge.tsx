/**
 * Badge — etichetta di stato o metadato.
 *
 * Percorso: apps/frontend-app/components/ui/Badge.tsx
 * Guida: apps/frontend-app/DESIGN.md
 *
 * REGOLA: in una card c'e' AL MASSIMO un badge colorato. Se ne servono
 * altri, sono `neutral`. Un badge non e' una decorazione: se non comunica
 * uno stato o un metadato, va tolto.
 * Il colore non e' mai l'unica informazione: il testo dice sempre cosa
 * significa (accessibilita' + daltonismo).
 */

'use client'

import { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

export type BadgeVariant =
  | 'neutral'
  | 'default'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'danger'
  | 'outline'

export type BadgeSize = 'sm' | 'md' | 'lg'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  /** Pallino di stato prima del testo */
  dot?: boolean
  /** Forma a pillola (per i piani, i tag) invece dell'angolo morbido */
  pill?: boolean
  icon?: ReactNode
}

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-subtle text-content-muted border-edge',
  default: 'bg-surface-subtle text-content-muted border-edge',
  accent: 'bg-accent-soft text-accent-ink border-accent-edge',
  info: 'bg-accent-soft text-accent-ink border-accent-edge',
  success: 'bg-success-soft text-success border-success-edge',
  warning: 'bg-warning-soft text-warning border-warning-edge',
  error: 'bg-danger-soft text-danger border-danger-edge',
  danger: 'bg-danger-soft text-danger border-danger-edge',
  outline: 'bg-transparent text-content-muted border-edge-strong',
}

const dots: Record<BadgeVariant, string> = {
  neutral: 'bg-content-subtle',
  default: 'bg-content-subtle',
  accent: 'bg-accent',
  info: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-danger',
  danger: 'bg-danger',
  outline: 'bg-content-subtle',
}

const sizes: Record<BadgeSize, string> = {
  sm: 'h-5 px-1.5 text-micro gap-1',
  md: 'h-6 px-2 text-caption gap-1.5',
  lg: 'h-7 px-2.5 text-caption gap-1.5',
}

export default function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  pill = false,
  icon,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center border font-medium',
        'whitespace-nowrap overflow-hidden text-ellipsis',
        pill ? 'rounded-pill' : 'rounded-md',
        variants[variant],
        sizes[size],
        '[&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0',
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 shrink-0 rounded-pill', dots[variant])}
          aria-hidden="true"
        />
      )}
      {icon && (
        <span className="inline-flex shrink-0 items-center" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  )
}

export { Badge }
