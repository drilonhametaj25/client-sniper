/**
 * ToolStatusLabel — l'esito di un controllo: icona + parola, mai solo colore.
 *
 * Percorso: apps/frontend-app/components/tools/ToolStatusLabel.tsx
 * Guida: apps/frontend-app/DESIGN.md
 *
 * Qui vive il vocabolario degli esiti condiviso da tutti i tool: i tre stati
 * ('pass' | 'warning' | 'fail'), le parole italiane che li dicono e le tinte
 * di stato. Chi rende una riga di controllo a modo suo importa da qui, così
 * la stessa cosa si chiama con lo stesso nome in tutte e sei le pagine.
 *
 * Usato da: ToolCheckList, ToolScore, ToolSummaryStats e dalle pagine
 * app/tools/(...)/page.tsx che costruiscono righe proprie.
 */

'use client'

import { AlertTriangle, CheckCircle2, XCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/** I tre esiti che tutte le API dei tool restituiscono. */
export type ToolCheckStatus = 'pass' | 'warning' | 'fail'

/** Tinta di stato. `neutral` = nessuno stato, testo quieto. */
export type ToolTone = 'success' | 'warning' | 'danger' | 'neutral'

export const TOOL_STATUS_META: Record<
  ToolCheckStatus,
  { word: string; tone: ToolTone; icon: LucideIcon }
> = {
  pass: { word: 'Superato', tone: 'success', icon: CheckCircle2 },
  warning: { word: 'Da controllare', tone: 'warning', icon: AlertTriangle },
  fail: { word: 'Non superato', tone: 'danger', icon: XCircle },
}

/** Colore del testo per tinta di stato (token, non colori scritti a mano). */
export const TOOL_TONE_TEXT: Record<ToolTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  neutral: 'text-content-muted',
}

/** Colore del pallino per tinta di stato. */
export const TOOL_TONE_DOT: Record<ToolTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-content-subtle',
}

export interface ToolStatusLabelProps {
  status: ToolCheckStatus
  /** Sostituisce la parola di default ("Superato", "Da controllare", ...) */
  label?: string
  /** Nasconde l'icona: usalo solo se accanto c'è già un'altra icona di stato */
  hideIcon?: boolean
  className?: string
}

export default function ToolStatusLabel({
  status,
  label,
  hideIcon = false,
  className,
}: ToolStatusLabelProps) {
  const meta = TOOL_STATUS_META[status]
  const Icon = meta.icon

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 text-caption font-medium',
        TOOL_TONE_TEXT[meta.tone],
        className
      )}
    >
      {!hideIcon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
      {label ?? meta.word}
    </span>
  )
}

export { ToolStatusLabel }
