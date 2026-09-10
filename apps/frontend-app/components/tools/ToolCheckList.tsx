/**
 * ToolCheckList / ToolCheckRow — l'elenco dei controlli con i tre esiti.
 *
 * Percorso: apps/frontend-app/components/tools/ToolCheckList.tsx
 * Guida: apps/frontend-app/DESIGN.md
 *
 * Una riga per controllo, separata da un hairline: niente riquadri colorati
 * in fila. L'esito è detto da un'icona lucide e da una parola (ToolStatusLabel),
 * il valore rilevato e il consiglio stanno sotto, in testo quieto.
 * La forma è volutamente generica: ci passano i check SEO, gli header di
 * sicurezza e i criteri WCAG senza inventare varianti.
 *
 * Usato da: app/tools/seo-checker, security-check, accessibility-check,
 * public-scan, manual-scan.
 */

'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import ToolStatusLabel, { type ToolCheckStatus } from './ToolStatusLabel'

export interface ToolCheckItem {
  /** Chiave di React: se manca si usa il nome */
  id?: string
  /** Nome del controllo, come lo chiama l'API */
  name: string
  status: ToolCheckStatus
  /** Il valore trovato sul sito (es. il title, l'header HTTP) */
  value?: string
  /** Il valore è tecnico e va reso a spaziatura fissa (header, direttive CSP) */
  mono?: boolean
  /** Cosa fare: una riga di consiglio */
  recommendation?: string
  /** Dettagli puntati (es. gli elementi che non passano) */
  details?: string[]
  /** Metadato quieto accanto al nome: "WCAG AA · 1.4.3", "Critico", ... */
  meta?: string
  /** Icona di argomento (16px). Opzionale: l'esito lo dice già ToolStatusLabel. */
  icon?: ReactNode
  /** Sostituisce la parola dell'esito, se il tool ha un lessico suo */
  statusLabel?: string
}

export interface ToolCheckRowProps {
  item: ToolCheckItem
  className?: string
}

/** Una riga sola: utile quando la pagina costruisce la lista da sé. */
export function ToolCheckRow({ item, className }: ToolCheckRowProps) {
  return (
    <li className={cn('border-t border-edge py-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 items-start gap-2">
          {item.icon && (
            <span
              className="mt-0.5 inline-flex shrink-0 items-center text-content-subtle [&_svg]:h-4 [&_svg]:w-4"
              aria-hidden="true"
            >
              {item.icon}
            </span>
          )}
          <span className="text-body font-medium text-content">{item.name}</span>
          {item.meta && (
            <span className="mt-0.5 shrink-0 text-micro text-content-subtle">{item.meta}</span>
          )}
        </div>

        <ToolStatusLabel status={item.status} label={item.statusLabel} className="mt-0.5" />
      </div>

      {item.value && (
        <p
          className={cn(
            'mt-1.5 text-caption text-content-muted',
            item.mono && 'break-all font-mono'
          )}
        >
          {item.value}
        </p>
      )}

      {item.details && item.details.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {item.details.map((detail, index) => (
            <li key={index} className="flex items-start gap-2 text-caption text-content-subtle">
              <span
                className="mt-2 h-1 w-1 shrink-0 rounded-pill bg-content-subtle"
                aria-hidden="true"
              />
              {detail}
            </li>
          ))}
        </ul>
      )}

      {item.recommendation && (
        <p className="mt-1.5 text-caption text-content-subtle">{item.recommendation}</p>
      )}
    </li>
  )
}

export interface ToolCheckListProps {
  items: ToolCheckItem[]
  /** Titolo di sezione (18px). Omettilo se la lista sta già sotto un titolo. */
  title?: string
  /** Una riga di spiegazione sotto il titolo */
  description?: string
  /** Cosa scrivere se non c'è nessun controllo da mostrare */
  emptyMessage?: string
  className?: string
}

export default function ToolCheckList({
  items,
  title,
  description,
  emptyMessage = 'Nessun controllo disponibile per questo sito.',
  className,
}: ToolCheckListProps) {
  return (
    <section className={cn(className)}>
      {title && <h3 className="text-heading font-semibold text-content">{title}</h3>}
      {description && <p className="mt-2 text-body text-content-muted">{description}</p>}

      {items.length === 0 ? (
        <p className={cn('text-body text-content-muted', (title || description) && 'mt-4')}>
          {emptyMessage}
        </p>
      ) : (
        <ul className={cn(title || description ? 'mt-4' : undefined)}>
          {items.map((item, index) => (
            <ToolCheckRow key={item.id ?? `${item.name}-${index}`} item={item} />
          ))}
        </ul>
      )}
    </section>
  )
}

export { ToolCheckList }
