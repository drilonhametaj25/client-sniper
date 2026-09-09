/**
 * LeadTechnicalDetails — il gergo, chiuso di default.
 *
 * Qui finisce tutto quello che serve a chi vuole entrare nel merito: punteggi
 * per area (normalizzati da analysis-utils, che gestisce i formati vecchi e
 * nuovi in un'unica vista), punteggio opportunità grezzo, Core Web Vitals e
 * stack tecnologico. In prima battuta la pagina parla italiano: questo pannello
 * si apre solo se l'utente lo chiede.
 *
 * Usato da: app/lead/[id]/page.tsx (solo vista sbloccata)
 */

'use client'

import { ReactNode, useId, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { normalizeAnalysis } from '@/lib/utils/analysis-utils'
import { getOpportunity } from '@/lib/utils/opportunity'
import { Badge, Card, cn } from '@/components/ui'

interface LeadTechnicalDetailsProps {
  analysis: any
  /** punteggio grezzo del lead: qui è il posto giusto per mostrarlo */
  score?: number
  scoreVersion?: number | null
}

function formatMs(value?: number): string | null {
  if (typeof value !== 'number' || value <= 0) return null
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`
}

/** Riga label a sinistra, numero a destra: si legge come una scheda tecnica. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-edge py-3 first:border-t-0">
      <dt className="text-body text-content-muted">{label}</dt>
      <dd className="text-body tabular-nums text-content">{value}</dd>
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className="mb-1 text-micro text-content-subtle">{children}</h3>
}

export default function LeadTechnicalDetails({
  analysis,
  score,
  scoreVersion
}: LeadTechnicalDetailsProps) {
  const [open, setOpen] = useState(false)
  const panelId = `tech-details-${useId()}`
  const normalized = useMemo(() => (analysis ? normalizeAnalysis(analysis) : null), [analysis])

  if (!analysis || !normalized) return null

  const opportunity = typeof score === 'number' ? getOpportunity(score, scoreVersion) : null

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
    { label: 'LCP (contenuto principale)', value: formatMs(normalized.performance.lcp) },
    { label: 'FCP (primo contenuto)', value: formatMs(normalized.performance.fcp) },
    { label: 'TTFB (risposta del server)', value: formatMs(normalized.performance.ttfb) },
    {
      label: 'CLS (stabilità del layout)',
      value:
        typeof normalized.performance.cls === 'number'
          ? normalized.performance.cls.toFixed(3)
          : null
    },
    { label: 'Caricamento completo', value: formatMs(normalized.performance.loadTime) }
  ].filter(v => v.value !== null) as Array<{ label: string; value: string }>

  return (
    <Card padding="none">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className="focus-ring-inset flex w-full items-center justify-between gap-4 rounded-card p-6 text-left"
      >
        <span>
          <span className="block text-heading font-semibold text-content">Dettagli tecnici</span>
          <span className="mt-0.5 block text-caption text-content-subtle">
            Punteggi, tempi di caricamento e tecnologie del sito
          </span>
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-content-subtle transition-transform duration-base ease-soft',
            open && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div id={panelId} className="space-y-6 border-t border-edge px-6 py-6">
          <div>
            <SectionLabel>Punteggi dell&apos;analisi (0-100)</SectionLabel>
            <dl>
              {opportunity && (
                <Row label="Opportunità del lead" value={`${opportunity.value}`} />
              )}
              {scores.map(({ label, value }) => (
                <Row key={label} label={label} value={`${value}`} />
              ))}
            </dl>
          </div>

          {vitals.length > 0 && (
            <div>
              <SectionLabel>Tempi di caricamento</SectionLabel>
              <dl>
                {vitals.map(({ label, value }) => (
                  <Row key={label} label={label} value={value} />
                ))}
              </dl>
            </div>
          )}

          {techChips.length > 0 && (
            <div>
              <SectionLabel>Tecnologie rilevate</SectionLabel>
              <div className="mt-2 flex flex-wrap gap-2">
                {techChips.map(chip => (
                  <Badge key={chip} variant="neutral">
                    {chip}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
