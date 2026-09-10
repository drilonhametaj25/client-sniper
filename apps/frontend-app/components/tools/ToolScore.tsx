/**
 * ToolScore — il punteggio 0-100 di un'analisi, reso sobrio.
 *
 * Percorso: apps/frontend-app/components/tools/ToolScore.tsx
 * Guida: apps/frontend-app/DESIGN.md
 *
 * Numero grande in `text-metric` con tabular-nums, una parola che lo qualifica
 * e un pallino di stato accanto alla parola (il pallino è un rinforzo, non
 * l'informazione). Niente cerchi animati, niente barre sfumate: il punteggio
 * è un dato, non un cruscotto.
 *
 * Nei tool il punteggio è "salute del sito": più è alto, meglio sta il sito.
 * È il contrario dell'opportunity score dei lead — non riusare qui
 * lib/utils/opportunity.ts.
 *
 * Usato da: app/tools/seo-checker, security-check, accessibility-check,
 * public-scan, manual-scan.
 */

'use client'

import { cn } from '@/lib/utils/cn'
import { TOOL_TONE_DOT, type ToolTone } from './ToolStatusLabel'

/** La parola e la tinta di default per un punteggio 0-100. */
export function toolScoreVerdict(value: number, max = 100): { word: string; tone: ToolTone } {
  const percent = max > 0 ? (value / max) * 100 : 0
  if (percent >= 80) return { word: 'Buono', tone: 'success' }
  if (percent >= 50) return { word: 'Da migliorare', tone: 'warning' }
  return { word: 'Critico', tone: 'danger' }
}

export interface ToolScoreProps {
  /** Il punteggio. Viene arrotondato per la resa. */
  value: number
  /** Cosa misura il numero: "Punteggio SEO", "Punteggio sicurezza", ... */
  label?: string
  /** Sostituisce la parola calcolata da toolScoreVerdict */
  qualifier?: string
  /** Forza la tinta del pallino (di default deriva dal punteggio) */
  tone?: ToolTone
  /** Massimo della scala, per i rari casi in cui non è 100 */
  max?: number
  /** Voto in lettera, se il tool ne ha uno (A-F) */
  grade?: string
  /** Etichetta del voto in lettera */
  gradeLabel?: string
  /** Una riga sotto il numero: cosa significa, in italiano */
  caption?: string
  className?: string
}

export default function ToolScore({
  value,
  label = 'Punteggio',
  qualifier,
  tone,
  max = 100,
  grade,
  gradeLabel = 'Voto',
  caption,
  className,
}: ToolScoreProps) {
  const rounded = Math.round(Number.isFinite(value) ? value : 0)
  const verdict = toolScoreVerdict(rounded, max)
  const word = qualifier ?? verdict.word
  const dotTone = tone ?? verdict.tone

  return (
    <div className={cn(className)}>
      <div className="flex flex-wrap items-start gap-x-10 gap-y-6">
        <div>
          <p className="text-caption text-content-subtle">{label}</p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="text-metric font-semibold tabular-nums text-content">{rounded}</span>
            <span className="text-caption tabular-nums text-content-subtle">/ {max}</span>
          </p>
          <p className="mt-2 flex items-center gap-2 text-caption text-content-muted">
            <span
              className={cn('h-2 w-2 shrink-0 rounded-pill', TOOL_TONE_DOT[dotTone])}
              aria-hidden="true"
            />
            {word}
          </p>
        </div>

        {grade && (
          <div>
            <p className="text-caption text-content-subtle">{gradeLabel}</p>
            <p className="mt-1 text-metric font-semibold tabular-nums text-content">{grade}</p>
          </div>
        )}
      </div>

      {caption && <p className="mt-4 max-w-2xl text-body text-content-muted">{caption}</p>}
    </div>
  )
}

export { ToolScore }
