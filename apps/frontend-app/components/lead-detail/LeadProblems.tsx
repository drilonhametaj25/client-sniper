/**
 * LeadProblems — i problemi del sito raccontati in italiano semplice.
 *
 * Riusa il problem-translator (extractProblemKeysFromAnalysis + translations):
 * una sola lista ordinata dal più grave al meno grave, con la gravità scritta a
 * parole (il colore non è mai l'unica informazione). Di default mostra i primi
 * quattro: il resto si apre a richiesta, perché la pagina non è un cruscotto.
 *
 * Usato da: app/lead/[id]/page.tsx (solo vista sbloccata)
 */

'use client'

import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import {
  extractProblemKeysFromAnalysis,
  translateProblems,
  SEVERITY_NAMES,
  TranslatedProblem
} from '@/lib/utils/problem-translator'
import { Button, Card, CardTitle, cn } from '@/components/ui'

interface LeadProblemsProps {
  analysis: any
}

const SEVERITY_ORDER: Record<TranslatedProblem['severity'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
}

/** Il pallino è un rinforzo: la gravità è comunque scritta accanto. */
const SEVERITY_DOT: Record<TranslatedProblem['severity'], string> = {
  critical: 'bg-danger',
  high: 'bg-warning',
  medium: 'bg-content-subtle',
  low: 'bg-edge-strong'
}

const PREVIEW_COUNT = 4

export default function LeadProblems({ analysis }: LeadProblemsProps) {
  const [expanded, setExpanded] = useState(false)

  const problems = useMemo(() => {
    const list = translateProblems(extractProblemKeysFromAnalysis(analysis))
    return [...list].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  }, [analysis])

  const criticalCount = problems.filter(p => p.severity === 'critical').length
  const visible = expanded ? problems : problems.slice(0, PREVIEW_COUNT)
  const hidden = problems.length - visible.length

  return (
    <Card>
      <CardTitle>Problemi del sito</CardTitle>

      {problems.length === 0 ? (
        <div className="mt-2 flex items-start gap-2">
          <Check className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          <p className="text-body text-content-muted">
            L&apos;analisi automatica non ha rilevato problemi significativi: il sito è in
            buone condizioni generali.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-2 text-body text-content-muted">
            {problems.length === 1
              ? 'Abbiamo rilevato un problema.'
              : `Abbiamo rilevato ${problems.length} problemi.`}
            {criticalCount > 0 &&
              (criticalCount === 1
                ? ' Uno è critico: è il motivo per cui vale la pena chiamarlo.'
                : ` ${criticalCount} sono critici: sono il motivo per cui vale la pena chiamarlo.`)}
          </p>

          <ul className="mt-4">
            {visible.map((problem, index) => (
              <li
                key={problem.key}
                className={cn('flex gap-3 py-4', index > 0 && 'border-t border-edge')}
              >
                <span
                  className={cn(
                    'mt-2 h-1.5 w-1.5 shrink-0 rounded-pill',
                    SEVERITY_DOT[problem.severity]
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-body font-medium text-content">{problem.title}</span>
                    <span className="text-micro text-content-subtle">
                      {SEVERITY_NAMES[problem.severity]}
                    </span>
                  </div>
                  <p className="mt-1 text-body text-content-muted">{problem.description}</p>
                  <p className="mt-1 text-caption text-content-subtle">{problem.impact}</p>
                </div>
              </li>
            ))}
          </ul>

          {problems.length > PREVIEW_COUNT && (
            <div className="mt-2 border-t border-edge pt-4">
              <Button
                variant="ghost"
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
                className="-ml-4"
              >
                {expanded ? 'Mostra solo i principali' : `Mostra gli altri ${hidden} problemi`}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
