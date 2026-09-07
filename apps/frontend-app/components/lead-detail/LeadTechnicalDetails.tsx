/**
 * LeadTechnicalDetails — "Dettagli tecnici per esperti", chiuso di default.
 *
 * Griglia punteggi (SEO / Performance / Tracking / GDPR / Mobile) tramite gli
 * helper di normalizzazione di analysis-utils, stack tecnologico e Core Web
 * Vitals quando disponibili. Nessun blocco duplicato per il formato legacy:
 * la normalizzazione gestisce entrambi i formati in un'unica vista.
 *
 * Usato da: app/lead/[id]/page.tsx (solo vista sbloccata)
 */

'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Wrench } from 'lucide-react'
import { normalizeAnalysis, getScoreColor } from '@/lib/utils/analysis-utils'

interface LeadTechnicalDetailsProps {
  analysis: any
}

function formatMs(value?: number): string | null {
  if (typeof value !== 'number' || value <= 0) return null
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`
}

export default function LeadTechnicalDetails({ analysis }: LeadTechnicalDetailsProps) {
  const [open, setOpen] = useState(false)
  const normalized = useMemo(
    () => (analysis ? normalizeAnalysis(analysis) : null),
    [analysis]
  )

  if (!analysis || !normalized) return null

  const scores = [
    { label: 'SEO', value: normalized.seo.score },
    { label: 'Performance', value: normalized.performance.score },
    { label: 'Tracking', value: normalized.tracking.score },
    { label: 'GDPR', value: normalized.gdpr.score },
    { label: 'Mobile', value: normalized.mobile.score }
  ]

  const techStack = (analysis as any).techStack
  const techChips: string[] = techStack
    ? [
        techStack.cms && `CMS: ${techStack.cms}`,
        techStack.ecommerce && `E-commerce: ${techStack.ecommerce}`,
        techStack.framework && `Framework: ${techStack.framework}`,
        ...(Array.isArray(techStack.libraries) ? techStack.libraries : []),
        ...(Array.isArray(techStack.plugins) ? techStack.plugins : [])
      ].filter(Boolean)
    : []

  const vitals = [
    { label: 'LCP', value: formatMs(normalized.performance.lcp) },
    { label: 'FCP', value: formatMs(normalized.performance.fcp) },
    { label: 'TTFB', value: formatMs(normalized.performance.ttfb) },
    {
      label: 'CLS',
      value:
        typeof normalized.performance.cls === 'number'
          ? normalized.performance.cls.toFixed(3)
          : null
    },
    { label: 'Caricamento', value: formatMs(normalized.performance.loadTime) }
  ].filter(v => v.value !== null)

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-6 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center text-lg font-semibold text-gray-900 dark:text-white">
          <Wrench className="h-5 w-5 mr-2 text-blue-500" />
          Dettagli tecnici per esperti
        </span>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {scores.map(({ label, value }) => (
              <div key={label} className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className={`text-2xl font-bold ${getScoreColor(value)}`}>{value}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
              </div>
            ))}
          </div>

          {vitals.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Core Web Vitals e tempi di caricamento
              </h3>
              <div className="flex flex-wrap gap-2">
                {vitals.map(({ label, value }) => (
                  <span
                    key={label}
                    className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                  >
                    {label}: <span className="font-medium">{value}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {techChips.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Stack tecnologico
              </h3>
              <div className="flex flex-wrap gap-2">
                {techChips.map(chip => (
                  <span
                    key={chip}
                    className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
