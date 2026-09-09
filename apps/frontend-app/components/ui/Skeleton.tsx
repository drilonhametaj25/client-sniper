/**
 * Skeleton — attesa senza spinner.
 *
 * Percorso: apps/frontend-app/components/ui/Skeleton.tsx
 * Guida: apps/frontend-app/DESIGN.md
 *
 * Regola: lo scheletro ha la FORMA del contenuto che sta arrivando, cosi'
 * la pagina non salta quando i dati atterrano. Niente spinner rotanti nelle
 * liste; lo spinner resta solo dentro i bottoni, come feedback a un click.
 *
 *   <Skeleton className="h-4 w-40" />
 *   <SkeletonText lines={3} />
 *   <SkeletonCard />
 */

'use client'

import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** rect: blocco di testo o immagine. circle: avatar o icona. */
  shape?: 'rect' | 'circle'
}

export default function Skeleton({
  shape = 'rect',
  className,
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-skeleton bg-surface-subtle',
        shape === 'circle' ? 'rounded-pill' : 'rounded-md',
        className
      )}
      {...props}
    />
  )
}

export interface SkeletonTextProps {
  /** Numero di righe. L'ultima e' piu' corta, come nel testo vero. */
  lines?: number
  className?: string
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn('h-3.5', index === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  )
}

export interface SkeletonCardProps {
  className?: string
}

/** Scheletro di una card lead: titolo, due righe, riga di metadati. */
export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-edge bg-surface-elevated p-6 shadow-card',
        className
      )}
      aria-hidden="true"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>

      <div className="mt-5 space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-24" />
      </div>
    </div>
  )
}

/** Lista di scheletri card. `label` viene annunciata agli screen reader. */
export function SkeletonList({
  count = 3,
  label = 'Caricamento in corso',
  className,
}: {
  count?: number
  label?: string
  className?: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn('space-y-4', className)}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  )
}

export { Skeleton }
