/**
 * ToolPageHeader / ToolUsageNote — l'intestazione di una pagina tool.
 *
 * Percorso: apps/frontend-app/components/tools/ToolPageHeader.tsx
 * Guida: apps/frontend-app/DESIGN.md
 *
 * Titolo, una riga che spiega a cosa serve, il form (passato come children) e
 * sotto, in piccolo, quante analisi gratuite restano oggi. È l'unica H1 della
 * pagina: il soggetto vero, subito dopo, è il risultato dell'analisi.
 *
 * Usato da: tutte le pagine app/tools/(...)/page.tsx.
 */

'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

/**
 * La forma restituita da GET /api/tools/(...): è la stessa in tutti i tool.
 * Passa `null` finché non è arrivata.
 */
export interface ToolUsage {
  used: number
  limit: number
  remaining: number
  canAnalyze: boolean
}

export interface ToolUsageNoteProps {
  usage?: ToolUsage | null
  /** Limite mostrato finché l'API non ha risposto */
  fallbackLimit?: number
  className?: string
}

/** La riga del contatore, in testo quieto. Niente barre di avanzamento. */
export function ToolUsageNote({ usage, fallbackLimit = 3, className }: ToolUsageNoteProps) {
  const limit = usage?.limit ?? fallbackLimit

  let text: string
  if (!usage) {
    text = `${limit} analisi gratuite al giorno per ogni indirizzo IP.`
  } else if (usage.remaining <= 0) {
    text = `Hai usato tutte le ${limit} analisi gratuite di oggi. Il contatore riparte domani.`
  } else if (usage.remaining === 1) {
    text = `Ti resta 1 analisi gratuita oggi, su ${limit} al giorno per indirizzo IP.`
  } else {
    text = `Ti restano ${usage.remaining} analisi gratuite oggi, su ${limit} al giorno per indirizzo IP.`
  }

  return <p className={cn('text-caption text-content-subtle', className)}>{text}</p>
}

export interface ToolPageHeaderProps {
  /** Titolo della pagina: è l'H1 */
  title: string
  /** Una riga: cosa fa il tool, in italiano */
  description?: string
  /** Riga sopra il titolo, minuscola e quieta (es. "Tool gratuito") */
  eyebrow?: string
  /** Di solito il ToolUrlForm */
  children?: ReactNode
  /** Il contatore delle analisi rimaste. Passa `null` finché non è arrivato. */
  usage?: ToolUsage | null
  /** Nasconde la riga del contatore (es. sui tool a crediti) */
  hideUsage?: boolean
  fallbackLimit?: number
  className?: string
}

export default function ToolPageHeader({
  title,
  description,
  eyebrow,
  children,
  usage,
  hideUsage = false,
  fallbackLimit = 3,
  className,
}: ToolPageHeaderProps) {
  return (
    <header className={cn(className)}>
      {eyebrow && <p className="text-caption text-content-subtle">{eyebrow}</p>}

      <h1
        className={cn(
          'max-w-3xl text-title font-semibold text-content sm:text-display',
          eyebrow && 'mt-3'
        )}
      >
        {title}
      </h1>

      {description && (
        <p className="mt-4 max-w-2xl text-body-lg text-content-muted">{description}</p>
      )}

      {children && <div className="mt-8 max-w-2xl">{children}</div>}

      {!hideUsage && (
        <ToolUsageNote usage={usage} fallbackLimit={fallbackLimit} className="mt-3" />
      )}
    </header>
  )
}

export { ToolPageHeader }
