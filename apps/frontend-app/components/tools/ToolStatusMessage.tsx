/**
 * ToolStatusMessage — errori, limite giornaliero e avvisi dei tool.
 *
 * Percorso: apps/frontend-app/components/tools/ToolStatusMessage.tsx
 * Guida: apps/frontend-app/DESIGN.md
 *
 * È SOLO presentazione: la logica del rate limit e degli stati di errore resta
 * nelle pagine. Qui si decide come appare il messaggio — superficie tenue,
 * bordo hairline, un'icona lucide — e come viene annunciato (role="alert" per
 * gli errori, role="status" per il resto).
 *
 * Usato da: tutte le pagine app/tools/(...)/page.tsx.
 */

'use client'

import { ReactNode } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export type ToolMessageTone = 'danger' | 'warning' | 'accent' | 'success' | 'neutral'

const TONE_SURFACE: Record<ToolMessageTone, string> = {
  danger: 'border-danger-edge bg-danger-soft',
  warning: 'border-warning-edge bg-warning-soft',
  accent: 'border-accent-edge bg-accent-soft',
  success: 'border-success-edge bg-success-soft',
  neutral: 'border-edge bg-surface-subtle',
}

const TONE_ICON: Record<ToolMessageTone, string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  accent: 'text-accent-ink',
  success: 'text-success',
  neutral: 'text-content-subtle',
}

const TONE_DEFAULT_ICON: Record<ToolMessageTone, LucideIcon> = {
  danger: AlertCircle,
  warning: AlertTriangle,
  accent: Info,
  success: CheckCircle2,
  neutral: Info,
}

export interface ToolStatusMessageProps {
  tone?: ToolMessageTone
  /** Prima riga, in evidenza. Se manca, `children` fa da testo principale. */
  title?: string
  children?: ReactNode
  /** Un bottone o un link sotto il testo (di solito `secondary`) */
  action?: ReactNode
  /** Sostituisce l'icona di default della tinta */
  icon?: ReactNode
  /** Di default: 'alert' per danger, 'status' per tutto il resto */
  role?: 'alert' | 'status'
  className?: string
}

export default function ToolStatusMessage({
  tone = 'danger',
  title,
  children,
  action,
  icon,
  role,
  className,
}: ToolStatusMessageProps) {
  const DefaultIcon = TONE_DEFAULT_ICON[tone]
  const resolvedRole = role ?? (tone === 'danger' ? 'alert' : 'status')

  return (
    <div
      role={resolvedRole}
      aria-live={resolvedRole === 'alert' ? 'assertive' : 'polite'}
      className={cn('rounded-card border p-4', TONE_SURFACE[tone], className)}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn('mt-0.5 shrink-0 [&_svg]:h-4 [&_svg]:w-4', TONE_ICON[tone])}
          aria-hidden="true"
        >
          {icon ?? <DefaultIcon />}
        </span>

        <div className="min-w-0 flex-1">
          {title && <p className="text-body font-medium text-content">{title}</p>}
          {children && (
            <div className={cn('text-body text-content-muted', title && 'mt-1')}>{children}</div>
          )}
          {action && <div className="mt-4 flex flex-wrap gap-3">{action}</div>}
        </div>
      </div>
    </div>
  )
}

export { ToolStatusMessage }
