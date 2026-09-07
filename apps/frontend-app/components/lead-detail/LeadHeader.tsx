/**
 * LeadHeader — Intestazione della pagina dettaglio lead.
 *
 * Mostra il nome dell'attività (o una descrizione generica quando il lead è
 * ancora bloccato), città, categoria, il badge Opportunità (sempre via
 * getOpportunity: mai lo score grezzo) e i chip di freschezza dei dati.
 * Lo stato published/quarantine è visibile solo agli admin.
 *
 * Usato da: app/lead/[id]/page.tsx
 */

'use client'

import { ArrowLeft, MapPin, Clock, ShieldAlert, ShieldCheck } from 'lucide-react'
import { getOpportunity } from '@/lib/utils/opportunity'

interface LeadHeaderProps {
  businessName?: string | null
  city?: string | null
  category?: string | null
  score: number
  scoreVersion?: number | null
  createdAt?: string | null
  lastSeenAt?: string | null
  status?: string | null
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

export default function LeadHeader({
  businessName,
  city,
  category,
  score,
  scoreVersion,
  createdAt,
  lastSeenAt,
  status,
  unlocked,
  isAdmin,
  onBack
}: LeadHeaderProps) {
  const opportunity = getOpportunity(score, scoreVersion)
  const freshness = freshnessLabel(lastSeenAt, createdAt)

  const title = unlocked && businessName
    ? businessName
    : `Attività ${category || 'locale'}${city ? ` a ${city}` : ''}`

  return (
    <header>
      <button
        onClick={onBack}
        className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Torna ai lead
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 break-words">
            {title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            {city && (
              <span className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {city}
              </span>
            )}
            {category && (
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                {category}
              </span>
            )}
            {freshness && (
              <span className="flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                <Clock className="h-3.5 w-3.5 mr-1" />
                {freshness}
              </span>
            )}
            {isAdmin && status === 'quarantine' && (
              <span className="flex items-center px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                In quarantena
              </span>
            )}
            {isAdmin && status === 'published' && (
              <span className="flex items-center px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                Pubblicato
              </span>
            )}
          </div>
        </div>

        <div className={`shrink-0 text-right p-4 rounded-xl border ${opportunity.badgeClass}`}>
          <div className={`text-2xl font-bold ${opportunity.textClass}`}>
            {opportunity.value}/100
          </div>
          <div className="text-sm">{opportunity.label}</div>
        </div>
      </div>
    </header>
  )
}
