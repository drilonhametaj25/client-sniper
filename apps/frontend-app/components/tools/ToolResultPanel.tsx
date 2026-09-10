/**
 * ToolResultPanel — la cornice del risultato dell'analisi.
 *
 * Percorso: apps/frontend-app/components/tools/ToolResultPanel.tsx
 * Guida: apps/frontend-app/DESIGN.md
 *
 * Il risultato è il soggetto della pagina, quindi non sta dentro una card che
 * lo incornicia: è una sezione con un filo hairline sopra, il titolo, il sito
 * analizzato e sotto il contenuto. La sezione è una regione live, così chi usa
 * uno screen reader sa che l'esito è arrivato.
 *
 * Usato da: tutte le pagine app/tools/(...)/page.tsx.
 */

'use client'

import { ReactNode, useId } from 'react'
import { cn } from '@/lib/utils/cn'

export interface ToolResultPanelProps {
  /** Titolo della sezione: "Risultato dell'analisi", "Rapporto sicurezza", ... */
  title: string
  /** Il sito analizzato (di solito l'hostname) */
  subject?: string
  /** Metadato quieto sotto il sito: la data dell'analisi */
  meta?: string
  /** Azioni a destra del titolo (es. "Analizza un altro sito") */
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export default function ToolResultPanel({
  title,
  subject,
  meta,
  actions,
  children,
  className,
}: ToolResultPanelProps) {
  const headingId = `tool-result-${useId()}`

  return (
    <section
      aria-labelledby={headingId}
      aria-live="polite"
      className={cn('border-t border-edge pt-10 sm:pt-12', className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id={headingId} className="text-title font-semibold text-content">
            {title}
          </h2>
          {subject && (
            <p className="mt-1 break-words text-caption text-content-muted">{subject}</p>
          )}
          {meta && <p className="mt-1 text-caption text-content-subtle">{meta}</p>}
        </div>

        {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
      </div>

      <div className="mt-8">{children}</div>
    </section>
  )
}

export { ToolResultPanel }
