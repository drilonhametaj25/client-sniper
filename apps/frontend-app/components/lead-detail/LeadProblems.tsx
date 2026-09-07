/**
 * LeadProblems — Problemi del sito in italiano semplice, dal più grave.
 *
 * Riusa il problem-translator (extractProblemKeysFromAnalysis + translations)
 * per convertire l'analisi tecnica in problemi comprensibili al cliente,
 * raggruppati per severità con l'idioma SEVERITY_COLORS esistente
 * (esteso con le varianti dark).
 *
 * Usato da: app/lead/[id]/page.tsx (solo vista sbloccata)
 */

'use client'

import { useMemo } from 'react'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import {
  extractProblemKeysFromAnalysis,
  translateProblems,
  SEVERITY_COLORS,
  SEVERITY_NAMES,
  TranslatedProblem
} from '@/lib/utils/problem-translator'

interface LeadProblemsProps {
  analysis: any
}

const SEVERITY_ORDER: TranslatedProblem['severity'][] = ['critical', 'high', 'medium', 'low']

/** Varianti dark per l'idioma SEVERITY_COLORS (che definisce solo il tema chiaro). */
const SEVERITY_DARK: Record<TranslatedProblem['severity'], string> = {
  critical: 'dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
  high: 'dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
  medium: 'dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
  low: 'dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
}

export default function LeadProblems({ analysis }: LeadProblemsProps) {
  const grouped = useMemo(() => {
    const problems = translateProblems(extractProblemKeysFromAnalysis(analysis))
    const bySeverity = new Map<TranslatedProblem['severity'], TranslatedProblem[]>()
    for (const problem of problems) {
      const list = bySeverity.get(problem.severity) || []
      list.push(problem)
      bySeverity.set(problem.severity, list)
    }
    return bySeverity
  }, [analysis])

  const total = SEVERITY_ORDER.reduce((sum, s) => sum + (grouped.get(s)?.length || 0), 0)

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
        Problemi del sito
      </h2>

      {total === 0 ? (
        <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
          <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
          <p>
            L&apos;analisi automatica non ha rilevato problemi significativi. Il sito è
            in buone condizioni generali.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {SEVERITY_ORDER.map(severity => {
            const problems = grouped.get(severity)
            if (!problems || problems.length === 0) return null
            const colors = SEVERITY_COLORS[severity]
            return (
              <div key={severity}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border} ${SEVERITY_DARK[severity]}`}
                  >
                    {SEVERITY_NAMES[severity]}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {problems.length} {problems.length === 1 ? 'problema' : 'problemi'}
                  </span>
                </div>
                <ul className="space-y-2">
                  {problems.map(problem => (
                    <li
                      key={problem.key}
                      className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {problem.title}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        {problem.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {problem.impact}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
