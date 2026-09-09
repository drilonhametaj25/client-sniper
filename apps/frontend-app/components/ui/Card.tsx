/**
 * Card — superficie elevata.
 *
 * Percorso: apps/frontend-app/components/ui/Card.tsx
 * Guida: apps/frontend-app/DESIGN.md
 *
 * Una card e' un rettangolo di superficie con bordo hairline e ombra
 * quasi invisibile. Non ha gradienti, non ha vetro smerigliato, non si
 * solleva da sola: si solleva SOLO se e' cliccabile (`interactive`).
 *
 * `CardHeader` / `CardBody` / `CardFooter` sono opzionali: servono quando
 * la card ha sezioni separate da un divider a filo dei bordi.
 */

'use client'

import { HTMLAttributes, ReactNode, forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /**
   * default   card normale
   * flat      nessuna ombra (dentro un'altra superficie)
   * overlay   modale / dropdown: superficie overlay + ombra pop
   * glass     DEPRECATO — reso come `default`. Niente glassmorphism.
   */
  variant?: 'default' | 'flat' | 'overlay' | 'glass' | 'elevated'
  padding?: CardPadding
  /** Aggiunge feedback al passaggio del mouse. Solo per card cliccabili. */
  interactive?: boolean
  /** Alias storico di `interactive`. */
  hover?: boolean
}

const paddings: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
  xl: 'p-8',
}

const variants: Record<NonNullable<CardProps['variant']>, string> = {
  default: 'bg-surface-elevated border border-edge shadow-card',
  elevated: 'bg-surface-elevated border border-edge shadow-card',
  glass: 'bg-surface-elevated border border-edge shadow-card',
  flat: 'bg-surface-elevated border border-edge',
  overlay: 'bg-surface-overlay border border-edge shadow-pop',
}

const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    children,
    className,
    variant = 'default',
    padding = 'lg',
    interactive = false,
    hover = false,
    ...props
  },
  ref
) {
  const isInteractive = interactive || hover

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-card',
        variants[variant],
        paddings[padding],
        isInteractive &&
          'cursor-pointer transition-[border-color,box-shadow] duration-base ease-soft ' +
            'hover:border-edge-strong hover:shadow-lift focus-ring',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})

export interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

/** Intestazione della card: titolo a sinistra, azioni a destra. */
export function CardHeader({ children, className, ...props }: CardSectionProps) {
  return (
    <div
      className={cn('flex items-start justify-between gap-4 pb-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardBody({ children, className, ...props }: CardSectionProps) {
  return (
    <div className={cn('text-body text-content-muted', className)} {...props}>
      {children}
    </div>
  )
}

/** Piede della card, separato da un divider hairline. */
export function CardFooter({ children, className, ...props }: CardSectionProps) {
  return (
    <div
      className={cn('mt-5 flex items-center gap-3 border-t border-edge pt-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}

/** Titolo di card: 18px, mai piu' grande del titolo di pagina. */
export function CardTitle({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-heading font-semibold text-content', className)} {...props}>
      {children}
    </h3>
  )
}

export default Card
export { Card }
