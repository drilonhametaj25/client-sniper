/**
 * LeadHeader — l'intestazione del dossier lead.
 *
 * Il soggetto della schermata è l'attività: nome (se sbloccata) o "Ristorante a
 * Bergamo" quando è ancora bloccata. Subito sotto, in una frase, il motivo per
 * cui vale la pena guardarla (il problema più grave tradotto in italiano).
 * Città, categoria e freschezza sono metadati quieti su una riga.
 *
 * Il punteggio non compare come numero: getOpportunity resta l'unica fonte
 * della semantica dello score, ma qui se ne usa solo l'etichetta ("Opportunità
 * alta"). Il numero grezzo vive nei dettagli tecnici, dove sta il gergo.
 *
 * Usato da: app/lead/[id]/page.tsx
 */

'use client'

import { useMemo } from 'react'
import { ArrowLeft, ShieldAlert, ShieldCheck } from 'lucide-react'
import { getOpportunity } from '@/lib/utils/opportunity'
import { translateCategory } from '@/lib/utils/categories'
import { extractProblemKeysFromAnalysis, getMainProblem } from '@/lib/utils/problem-translator'
import { Badge, Button, type BadgeVariant } from '@/components/ui'

interface LeadHeaderProps {
  businessName?: string | null
  city?: string | null
  category?: string | null
  score: number
  scoreVersion?: number | null
  createdAt?: string | null
  lastSeenAt?: string | null
  status?: string | null
  /** analisi del sito: serve solo per la frase di apertura */
  analysis?: any
  unlocked: boolean
  isAdmin: boolean
  onBack: () => void
}

/** Etichetta di freschezza basata sull'ultima verifica del lead. */
function freshnessLabel(lastSeenAt?: string | null, createdAt?: string | null): string | null {
  const ref = lastSeenAt || createdAt
  if (!ref) return null
  const days = Math.floor((Date.now() - new Date(ref).getTime()) / 86400000)
  if (Number.isNaN(days) || days < 0) return null
  if (days === 0) return 'Verificato oggi'
  if (days === 1) return 'Verificato ieri'
  if (days < 30) return `Verificato ${days} giorni fa`
  const months = Math.floor(days / 30)
  return months === 1 ? 'Verificato un mese fa' : `Verificato ${months} mesi fa`
}

/** L'etichetta dell'opportunità è l'unico badge colorato dell'intestazione. */
const OPPORTUNITY_VARIANT: Record<string, BadgeVariant> = {
  'Opportunità alta': 'success',
  'Opportunità media': 'warning',
  'Opportunità bassa': 'neutral'
}

export default function LeadHeader({
  businessName,
  city,
  category,
  score,
  scoreVersion,
  createdAt,
  lastSeenAt,
  status,
  analysis,
  unlocked,
  isAdmin,
  onBack
}: LeadHeaderProps) {
  const opportunity = getOpportunity(score, scoreVersion)
  const freshness = freshnessLabel(lastSeenAt, createdAt)
  const categoryLabel = category ? translateCategory(category) : 'Attività locale'

  const mainProblem = useMemo(
    () => getMainProblem(extractProblemKeysFromAnalysis(analysis)),
    [analysis]
  )

  const title =
    unlocked && businessName
      ? businessName
      : city
        ? `${categoryLabel} a ${city}`
        : categoryLabel

  // Metadati: testo semplice separato da punti medi, niente chip in fila.
  // Se il lead è bloccato, citta' e categoria sono gia' nel titolo: non si ripetono.
  const meta = (
    unlocked ? [city, category ? categoryLabel : null, freshness] : [freshness]
  ).filter(Boolean) as string[]

  return (
    <header>
      <Button variant="ghost" onClick={onBack} icon={<ArrowLeft />} className="-ml-4 mb-4">
        Torna ai lead
      </Button>

      <h1 className="text-title font-semibold text-content break-words">{title}</h1>

      {mainProblem && (
        <p className="mt-2 max-w-2xl text-body-lg text-content-muted">
          {mainProblem.description}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-caption text-content-subtle">
        <Badge variant={OPPORTUNITY_VARIANT[opportunity.label] ?? 'neutral'} dot>
          {opportunity.label}
        </Badge>

        {meta.length > 0 && <span>{meta.join(' · ')}</span>}

        {isAdmin && status === 'quarantine' && (
          <span className="flex items-center gap-1.5 text-warning">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
            In quarantena
          </span>
        )}
        {isAdmin && status === 'published' && (
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Pubblicato
          </span>
        )}
      </div>
    </header>
  )
}
