/**
 * LeadCard — LA card lead della dashboard (layout lista, una colonna).
 *
 * Bloccato: iniziale categoria, città, categoria, badge Opportunità
 * (getOpportunity — mai interpretare leads.score direttamente), problema
 * principale in italiano, badge match (se l'utente ha servizi configurati),
 * badge freschezza (mai sbloccato / sbloccato da N) e CTA "Sblocca — 1 credito".
 *
 * Sbloccato: nome attività, contatti (telefono/email/sito), "Apri dettaglio"
 * e quick-update dello stato CRM (Starter+).
 *
 * Usato da: app/dashboard/page.tsx (lo sblocco passa da UnlockLeadModal).
 */

'use client'

import { ExternalLink, Phone, Mail, MapPin, Zap, ArrowRight } from 'lucide-react'
import { getOpportunity } from '@/lib/utils/opportunity'
import { translateCategory } from '@/lib/utils/categories'
import { getDomain, getTimeAgo } from '@/lib/utils/lead-card-helpers'
import { extractProblemKeysFromAnalysis, getMainProblem, SEVERITY_COLORS } from '@/lib/utils/problem-translator'
import { detectServices } from '@/lib/utils/service-detection'
import { calculateMatch, getMatchColor, getMatchIcon } from '@/lib/utils/match-calculation'
import type { ServiceType } from '@/lib/types/services'
import type { DashboardLead } from '@/lib/hooks/useLeads'
import type { CRMStatusType } from '@/lib/types/crm'

const CRM_QUICK_OPTIONS: Array<{ value: CRMStatusType; label: string }> = [
  { value: 'new', label: 'Nuovo' },
  { value: 'contacted', label: 'Contattato' },
  { value: 'in_negotiation', label: 'In trattativa' },
  { value: 'won', label: 'Vinto' },
  { value: 'lost', label: 'Perso' }
]

export interface LeadCardProps {
  lead: DashboardLead
  /** servizi offerti dall'utente, per il badge match */
  userServices?: ServiceType[]
  onUnlock: (lead: DashboardLead) => void
  onOpenDetail: (lead: DashboardLead) => void
  /** quick-update stato CRM (Starter+); se assente il selettore non appare */
  onQuickStatus?: (leadId: string, status: CRMStatusType) => void
  /** true mentre l'update CRM di QUESTO lead è in corso */
  isUpdatingStatus?: boolean
  className?: string
}

export default function LeadCard({
  lead,
  userServices = [],
  onUnlock,
  onOpenDetail,
  onQuickStatus,
  isUpdatingStatus = false,
  className = ''
}: LeadCardProps) {
  const unlocked = lead.is_unlocked === true
  const opportunity = getOpportunity(lead.score, lead.score_version)
  const categoryLabel = translateCategory(lead.category || '')
  const analysis = lead.website_analysis || lead.analysis
  const mainProblem = getMainProblem(extractProblemKeysFromAnalysis(analysis))
  const problemColors = mainProblem ? SEVERITY_COLORS[mainProblem.severity] : null

  // Badge match: solo se l'utente ha configurato i propri servizi
  const matchResult = userServices.length > 0
    ? calculateMatch(detectServices(analysis), userServices)
    : null
  const matchColors = matchResult ? getMatchColor(matchResult.score) : null

  // Freschezza (modello trasparente: il pool è condiviso, lo diciamo)
  const unlockCount = lead.global_unlock_count ?? 0

  const websiteHref = lead.website_url
    ? (lead.website_url.startsWith('http') ? lead.website_url : `https://${lead.website_url}`)
    : null

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all p-4 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Iniziale categoria */}
        <div className="hidden sm:flex w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 items-center justify-center text-lg font-bold flex-shrink-0">
          {categoryLabel.charAt(0).toUpperCase()}
        </div>

        {/* Info principali */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate max-w-full">
              {unlocked ? (lead.business_name || categoryLabel) : categoryLabel}
            </h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${opportunity.badgeClass}`}>
              {opportunity.label} · {opportunity.value}/100
            </span>
            {matchResult && matchColors && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${matchColors.bgColor} ${matchColors.textColor}`}>
                {getMatchIcon(matchResult.score)} {matchResult.score}% match
              </span>
            )}
            {unlockCount === 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                ✨ Mai sbloccato
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                Sbloccato da {unlockCount}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
            {lead.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {lead.city}
              </span>
            )}
            {unlocked && lead.category && <span>{categoryLabel}</span>}
            {!unlocked && (
              <span className="inline-flex items-center gap-2 text-xs">
                <span title={lead.has_phone ? 'Telefono disponibile' : 'Telefono non disponibile'}>
                  📞 {lead.has_phone ? '✓' : '✗'}
                </span>
                <span title={lead.has_email ? 'Email disponibile' : 'Email non disponibile'}>
                  📧 {lead.has_email ? '✓' : '✗'}
                </span>
              </span>
            )}
            {lead.created_at && <span className="text-xs">{getTimeAgo(lead.created_at)}</span>}
          </div>

          {/* Problema principale in linguaggio umano */}
          {mainProblem && problemColors && (
            <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs sm:text-sm ${problemColors.bg} ${problemColors.text}`}>
              <span>{mainProblem.emoji}</span>
              <span className="font-medium">{mainProblem.title}</span>
            </div>
          )}

          {/* Contatti (solo sbloccato) */}
          {unlocked && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400 hover:underline">
                  <Phone className="w-4 h-4" />
                  {lead.phone}
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 text-purple-600 dark:text-purple-400 hover:underline truncate max-w-full">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{lead.email}</span>
                </a>
              )}
              {websiteHref && (
                <a href={websiteHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline">
                  <ExternalLink className="w-4 h-4" />
                  {getDomain(lead.website_url!)}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Azioni */}
        <div className="flex items-center gap-2 flex-shrink-0 sm:flex-col sm:items-stretch lg:flex-row lg:items-center">
          {unlocked ? (
            <>
              {onQuickStatus && lead.crm_status && (
                <select
                  value={lead.crm_status}
                  disabled={isUpdatingStatus}
                  onChange={(e) => onQuickStatus(lead.id, e.target.value as CRMStatusType)}
                  className="text-xs px-2 py-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  title="Stato CRM"
                >
                  {CRM_QUICK_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
              <button
                onClick={() => onOpenDetail(lead)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Apri dettaglio
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => onUnlock(lead)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Zap className="w-4 h-4" />
              Sblocca — 1 credito
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
