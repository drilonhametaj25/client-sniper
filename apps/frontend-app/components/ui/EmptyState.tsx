/**
 * EmptyState — cosa si vede quando non c'e' niente da vedere.
 *
 * Percorso: apps/frontend-app/components/ui/EmptyState.tsx
 * Guida: apps/frontend-app/DESIGN.md
 *
 * Struttura fissa: icona quieta, titolo, UNA riga di spiegazione, UNA azione.
 * Il titolo dice cosa manca, la riga dice come rimediare. Niente illustrazioni,
 * niente emoji, niente doppio bottone.
 *
 *   <EmptyState
 *     icon={<Search />}
 *     title="Nessun lead con questi filtri"
 *     description="Prova ad allargare la zona o a togliere qualche categoria."
 *     action={<Button variant="secondary">Azzera i filtri</Button>}
 *   />
 */

'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  /** Una riga sola. Se serve un paragrafo, la schermata e' sbagliata. */
  description?: string
  /** UNA azione. Se ne servono due, la seconda e' un link testuale in `footer`. */
  action?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md'
  className?: string
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  footer,
  size = 'md',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        size === 'sm' ? 'px-6 py-10' : 'px-6 py-16',
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            'mb-4 flex items-center justify-center rounded-pill',
            'bg-surface-subtle text-content-subtle',
            size === 'sm' ? 'h-10 w-10 [&_svg]:h-5 [&_svg]:w-5' : 'h-12 w-12 [&_svg]:h-6 [&_svg]:w-6'
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      <h3
        className={cn(
          'font-semibold text-content',
          size === 'sm' ? 'text-body' : 'text-heading'
        )}
      >
        {title}
      </h3>

      {description && (
        <p className="mt-1.5 max-w-sm text-body text-content-muted">{description}</p>
      )}

      {action && <div className="mt-5">{action}</div>}

      {footer && <div className="mt-3 text-caption text-content-subtle">{footer}</div>}
    </div>
  )
}

export { EmptyState }
