/**
 * ToolLoadingState — l'attesa mentre l'analisi gira.
 *
 * Percorso: apps/frontend-app/components/tools/ToolLoadingState.tsx
 * Guida: apps/frontend-app/DESIGN.md
 *
 * Ha la forma del risultato in arrivo — punteggio, riepilogo, righe di
 * controllo — così quando i dati atterrano la pagina non salta. Niente
 * spinner: quello sta già dentro il bottone "Analizza".
 *
 * Usato da: tutte le pagine app/tools/(...)/page.tsx, al posto del risultato
 * mentre `loading` è true.
 */

'use client'

import Skeleton from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils/cn'

export interface ToolLoadingStateProps {
  /** Annunciato agli screen reader */
  label?: string
  /** Quante righe di controllo mostrare */
  rows?: number
  /** Mostra anche il blocco del punteggio (per i tool che ne hanno uno) */
  showScore?: boolean
  className?: string
}

export default function ToolLoadingState({
  label = 'Analisi in corso',
  rows = 5,
  showScore = true,
  className,
}: ToolLoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn('border-t border-edge pt-10 sm:pt-12', className)}
    >
      <span className="sr-only">{label}</span>

      <Skeleton className="h-6 w-56" />

      {showScore && (
        <div className="mt-8 flex flex-wrap gap-x-10 gap-y-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-14" />
          </div>
        </div>
      )}

      <div className="mt-10">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="border-t border-edge py-4">
            <div className="flex items-start justify-between gap-4">
              <Skeleton className={cn('h-4', index % 2 === 0 ? 'w-40' : 'w-52')} />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="mt-2 h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}

export { ToolLoadingState }
