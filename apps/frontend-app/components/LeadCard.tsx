/**
 * LeadCard - Componente principale per visualizzare un lead
 *
 * Due versioni:
 * - LeadCard (expanded): Card completa con tutte le info
 * - LeadCardCompact: Versione compressa per scan veloce
 *
 * Include TUTTE le info essenziali organizzate bene:
 * - Header con criticità, location, status
 * - Business info con score prominente
 * - Dati disponibili PRIMA dello sblocco
 * - Problemi identificati
 * - Data scansione + potenziale budget
 * - Disclaimer sempre visibile
 * - Actions
 */

'use client'

import { useState } from 'react'
import {
  Lock,
  Unlock,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Globe,
  MoreVertical,
  Calendar,
  AlertTriangle,
  CheckSquare,
  Square,
  Eye,
  Copy,
  Flag,
  Archive,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react'
import {
  getCriticalityConfig,
  getScoreBarColor,
  formatDate,
  getTimeAgo,
  isNewLead,
  extractAvailableData,
  getAvailableDataCount,
  extractProblems,
  estimateBudget,
  getDomain,
  formatLocation,
  DATA_LABELS,
  DATA_ICONS,
  CRM_STATUS_CONFIG,
  type LeadAvailableData,
  type CrmStatus
} from '@/lib/utils/lead-card-helpers'
import { detectServices } from '@/lib/utils/service-detection'
import { calculateMatch, getMatchColor, getMatchIcon } from '@/lib/utils/match-calculation'
import { SERVICE_CONFIGS, type ServiceType, formatBudget } from '@/lib/types/services'

export interface LeadCardProps {
  lead: {
    id: string
    business_name?: string
    website_url?: string
    city?: string
    category?: string
    phone?: string
    email?: string
    address?: string
    score: number
    crm_status?: string
    created_at?: string
    analysis?: any
    website_analysis?: any
  }
  isUnlocked: boolean
  isSelected?: boolean
  isProUser?: boolean
  userServices?: ServiceType[] // Servizi offerti dall'utente per match calculation
  onUnlock?: (lead: LeadCardProps['lead']) => void
  onView?: (lead: LeadCardProps['lead']) => void
  onSelect?: (id: string) => void
  onContact?: (lead: LeadCardProps['lead'], method: 'email' | 'phone') => void
  onMarkContacted?: (lead: LeadCardProps['lead']) => void
  className?: string
}

/**
 * EXPANDED CARD - Vista completa con tutte le informazioni
 */
export default function LeadCard({
  lead,
  isUnlocked,
  isSelected = false,
  isProUser = false,
  userServices = [],
  onUnlock,
  onView,
  onSelect,
  onContact,
  onMarkContacted,
  className = ''
}: LeadCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  const analysis = lead.website_analysis || lead.analysis
  const availableData = extractAvailableData(lead)
  const availableCount = getAvailableDataCount(availableData)
  const problems = extractProblems(analysis)
  const criticality = getCriticalityConfig(lead.score)
  const CriticalityIcon = criticality.icon
  const isNew = lead.created_at ? isNewLead(lead.created_at) : false
  const budget = estimateBudget(lead.score, problems)

  // Service detection e match calculation
  const detectedServices = detectServices(analysis)
  const matchResult = calculateMatch(detectedServices, userServices)
  const matchColors = getMatchColor(matchResult.score)

  return (
    <div
      className={`
        relative bg-white dark:bg-gray-800 rounded-2xl border-2 transition-all duration-200 overflow-hidden
        ${isSelected
          ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg'
        }
        ${className}
      `}
    >
      {/* ===== HEADER ROW ===== */}
      <div className="flex flex-wrap items-center gap-2 p-4 pb-3 border-b border-gray-100 dark:border-gray-700">
        {/* Selection checkbox */}
        {isUnlocked && onSelect && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelect(lead.id)
            }}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-blue-600" />
            ) : (
              <Square className="w-5 h-5 text-gray-400" />
            )}
          </button>
        )}

        {/* Criticality badge */}
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${criticality.bgColor} ${criticality.textColor}`}>
          <CriticalityIcon className="w-3 h-3" />
          {criticality.label} ({lead.score})
        </span>

        {/* Location */}
        {lead.city && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            <MapPin className="w-3 h-3" />
            {lead.city}
          </span>
        )}

        {/* New badge */}
        {isNew && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 animate-pulse">
            ✨ Nuovo
          </span>
        )}

        {/* Match score badge (solo se user ha configurato servizi) */}
        {userServices.length > 0 && (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${matchColors.bgColor} ${matchColors.textColor}`}>
            {getMatchIcon(matchResult.score)} {matchResult.score}% match
          </span>
        )}

        {/* Unlock status - pushed to right */}
        <span className={`ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
          isUnlocked
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}>
          {isUnlocked ? (
            <><Unlock className="w-3 h-3" /> Sbloccato</>
          ) : (
            <><Lock className="w-3 h-3" /> Bloccato</>
          )}
        </span>
      </div>

      {/* ===== BUSINESS INFO ROW ===== */}
      <div className="flex justify-between items-start p-4 pb-3">
        <div className="flex-1 min-w-0 pr-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">
            {isUnlocked ? (lead.business_name || 'Nome non disponibile') : (lead.category || 'Azienda')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {lead.category || 'Categoria non specificata'}
          </p>
        </div>

        {/* Score prominente */}
        <div className="text-right flex-shrink-0">
          <div className={`text-3xl font-bold ${criticality.textColor}`}>
            {lead.score}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">/100</div>
          {/* Progress bar */}
          <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
            <div
              className={`h-full ${getScoreBarColor(lead.score)} transition-all duration-300`}
              style={{ width: `${lead.score}%` }}
            />
          </div>
        </div>
      </div>

      {/* ===== CONTACT INFO (se sbloccato) ===== */}
      {isUnlocked && (lead.website_url || lead.phone || lead.email) && (
        <div className="mx-4 mb-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="flex flex-wrap gap-4 text-sm">
            {lead.website_url && (
              <a
                href={lead.website_url.startsWith('http') ? lead.website_url : `https://${lead.website_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Globe className="w-4 h-4" />
                {getDomain(lead.website_url)}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400 hover:underline"
              >
                <Phone className="w-4 h-4" />
                {lead.phone}
              </a>
            )}
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="inline-flex items-center gap-1.5 text-purple-600 dark:text-purple-400 hover:underline truncate"
              >
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{lead.email}</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* ===== DATA AVAILABILITY (CRUCIALE - sempre visibile) ===== */}
      <div className="mx-4 mb-3 p-3 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
          📋 Dati disponibili {isUnlocked ? '' : 'dopo sblocco'}:
        </div>
        <div className="flex flex-wrap gap-2">
          {(['hasPhone', 'hasEmail', 'hasAddress', 'hasWebsite', 'hasSocial'] as const).map((key) => (
            <div
              key={key}
              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                availableData[key]
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              }`}
            >
              <span>{DATA_ICONS[key]}</span>
              <span>{DATA_LABELS[key]}</span>
              <span>{availableData[key] ? '✓' : '✗'}</span>
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
          {availableCount}/5 informazioni disponibili
        </div>
      </div>

      {/* ===== SERVICE TAGS (Servizi richiesti) ===== */}
      {detectedServices.services.length > 0 && (
        <div className="mx-4 mb-3">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            🛠️ Servizi richiesti:
          </div>
          <div className="flex flex-wrap gap-2">
            {detectedServices.services.slice(0, 5).map((service) => {
              const config = SERVICE_CONFIGS[service.type]
              const isMatched = matchResult.matchedServices.includes(service.type)

              return (
                <div
                  key={service.type}
                  className={`
                    inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs
                    ${config.bgColor} ${config.textColor}
                    ${isMatched ? 'ring-2 ring-green-400 ring-offset-1 dark:ring-offset-gray-800' : ''}
                  `}
                  title={service.specificIssues.slice(0, 3).join(', ')}
                >
                  <span>{config.icon}</span>
                  <span className="font-medium">{config.label}</span>
                  <span className="opacity-70">({service.issueCount})</span>
                  {isMatched && (
                    <CheckCircle className="w-3 h-3 text-green-500 ml-0.5" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Budget totale stimato */}
          {detectedServices.totalBudget.max > 0 && (
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400">💰 Budget stimato:</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {formatBudget(detectedServices.totalBudget)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ===== PROBLEMS SUMMARY ===== */}
      {(problems.total > 0 || problems.topIssues.length > 0) && (
        <div className="mx-4 mb-3">
          <div className="flex items-center gap-2 text-sm mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="font-semibold text-gray-900 dark:text-white">
              {problems.high} problemi alta priorità
            </span>
            {problems.medium > 0 && (
              <span className="text-gray-600 dark:text-gray-400">• {problems.medium} media</span>
            )}
            {problems.low > 0 && (
              <span className="text-gray-600 dark:text-gray-400">• {problems.low} bassa</span>
            )}
          </div>

          {problems.topIssues.length > 0 && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Top issues: {problems.topIssues.slice(0, 3).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* ===== METADATA ROW ===== */}
      <div className="flex flex-wrap items-center gap-4 mx-4 mb-3 pb-3 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        {lead.created_at && (
          <div className="inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Scansione: {formatDate(lead.created_at)}
          </div>
        )}

        {budget && (
          <div className="inline-flex items-center gap-1">
            <Zap className="w-3 h-3 text-yellow-500" />
            Potenziale: {budget}
          </div>
        )}

        {lead.created_at && (
          <div className="inline-flex items-center gap-1 ml-auto">
            <Clock className="w-3 h-3" />
            {getTimeAgo(lead.created_at)}
          </div>
        )}
      </div>

      {/* ===== DISCLAIMER (sempre visibile) ===== */}
      <div className="mx-4 mb-3 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Analisi automatica</span> - verifica sempre manualmente prima di contattare.
            {lead.created_at && (
              <span className="block text-amber-600 dark:text-amber-400 mt-0.5">
                Ultimo aggiornamento: {formatDate(lead.created_at)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ===== ACTIONS ===== */}
      <div className="flex gap-2 p-4 pt-0">
        {isUnlocked ? (
          <>
            {/* Primary CTA - Solo se sbloccato */}
            <button
              onClick={() => onView?.(lead)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Eye className="w-4 h-4" />
              Analisi Completa
            </button>

            {/* Call CTA */}
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors"
              >
                <Phone className="w-4 h-4" />
                Chiama
              </a>
            )}

            {/* Email CTA */}
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors"
              >
                <Mail className="w-4 h-4" />
                Email
              </a>
            )}
          </>
        ) : (
          /* Unlock CTA - Unico pulsante quando locked */
          <button
            onClick={() => onUnlock?.(lead)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Unlock className="w-4 h-4" />
            Sblocca per vedere analisi e contatti (1 ⚡)
          </button>
        )}

        {/* More menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="inline-flex items-center justify-center p-2.5 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 rounded-xl transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                {/* Visita sito web - Solo se sbloccato */}
                {isUnlocked && lead.website_url && (
                  <button
                    onClick={() => {
                      window.open(lead.website_url?.startsWith('http') ? lead.website_url : `https://${lead.website_url}`, '_blank')
                      setShowMenu(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Visita sito web
                  </button>
                )}
                {isUnlocked && lead.phone && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(lead.phone || '')
                      setShowMenu(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copia telefono
                  </button>
                )}
                {isUnlocked && lead.email && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(lead.email || '')
                      setShowMenu(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copia email
                  </button>
                )}
                <button
                  onClick={() => setShowMenu(false)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Flag className="w-4 h-4" />
                  Segnala errore
                </button>
                <button
                  onClick={() => setShowMenu(false)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Archive className="w-4 h-4" />
                  Archivia
                </button>
                {isUnlocked && onMarkContacted && (
                  <button
                    onClick={() => {
                      onMarkContacted(lead)
                      setShowMenu(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Segna contattato
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * COMPACT CARD - Vista compressa per scan veloce
 */
export function LeadCardCompact({
  lead,
  isUnlocked,
  isSelected = false,
  userServices = [],
  onUnlock,
  onView,
  onSelect,
  className = ''
}: Omit<LeadCardProps, 'isProUser' | 'onContact' | 'onMarkContacted'>) {
  const analysis = lead.website_analysis || lead.analysis
  const availableData = extractAvailableData(lead)
  const availableCount = getAvailableDataCount(availableData)
  const problems = extractProblems(analysis)
  const criticality = getCriticalityConfig(lead.score)
  const CriticalityIcon = criticality.icon
  const isNew = lead.created_at ? isNewLead(lead.created_at) : false

  // Service detection e match calculation
  const detectedServices = detectServices(analysis)
  const matchResult = calculateMatch(detectedServices, userServices)
  const matchColors = getMatchColor(matchResult.score)

  return (
    <div
      className={`
        flex flex-col p-4 bg-white dark:bg-gray-800 rounded-xl border-2 transition-all duration-200
        ${isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
        }
        ${className}
      `}
    >
      {/* Row 1: Main info */}
      <div className="flex items-center gap-3">
        {/* Selection */}
        {isUnlocked && onSelect && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelect(lead.id)
            }}
            className="flex-shrink-0"
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-blue-600" />
            ) : (
              <Square className="w-5 h-5 text-gray-400" />
            )}
          </button>
        )}

        {/* Avatar/Initial */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold flex-shrink-0 ${criticality.bgColor} ${criticality.textColor}`}>
          {isUnlocked ? (lead.business_name?.charAt(0) || '?') : lead.score}
        </div>

        {/* Name & Category */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {isUnlocked ? (lead.business_name || 'Azienda') : (lead.category || 'Lead')}
            </h3>
            {isNew && (
              <span className="text-xs px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded">
                🆕
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {lead.city && <span>📍 {lead.city}</span>}
            {lead.city && lead.category && <span> • </span>}
            {lead.category && <span>{lead.category}</span>}
          </div>
        </div>

        {/* Score badge */}
        <span className={`px-2 py-1 rounded-lg text-sm font-bold flex-shrink-0 ${criticality.bgColor} ${criticality.textColor}`}>
          {lead.score}
        </span>

        {/* Match score badge */}
        {userServices.length > 0 && (
          <span className={`px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0 ${matchColors.bgColor} ${matchColors.textColor}`}>
            {getMatchIcon(matchResult.score)} {matchResult.score}%
          </span>
        )}

        {/* Action */}
        {isUnlocked ? (
          <button
            onClick={() => onView?.(lead)}
            className="flex-shrink-0 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors font-medium"
          >
            Dettagli →
          </button>
        ) : (
          <button
            onClick={() => onUnlock?.(lead)}
            className="flex-shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-1"
          >
            <Unlock className="w-3.5 h-3.5" />
            Sblocca
          </button>
        )}
      </div>

      {/* Row 2: Data availability + Issues + Date */}
      <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        {/* Data availability icons */}
        <div className="inline-flex items-center gap-1">
          {availableData.hasPhone && <span title="Telefono">📞</span>}
          {availableData.hasWebsite && <span title="Sito Web">🌐</span>}
          {availableData.hasEmail && <span title="Email">📧</span>}
          {availableData.hasAddress && <span title="Indirizzo">📍</span>}
          {availableData.hasSocial && <span title="Social">👥</span>}
          <span className="ml-1">{availableCount}/5</span>
        </div>

        <span className="text-gray-300 dark:text-gray-600">•</span>

        {/* Service tags (primi 4 con label) */}
        {detectedServices.services.length > 0 && (
          <div className="inline-flex items-center gap-1.5 flex-wrap">
            {detectedServices.services.slice(0, 4).map((service) => {
              const config = SERVICE_CONFIGS[service.type]
              const isMatched = matchResult.matchedServices.includes(service.type)
              return (
                <span
                  key={service.type}
                  className={`
                    inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium
                    ${isMatched
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 ring-1 ring-green-400'
                      : `${config.bgColor} ${config.textColor}`
                    }
                  `}
                  title={`${config.label}: ${service.issueCount} problemi`}
                >
                  <span>{config.icon}</span>
                  <span>{config.label}</span>
                </span>
              )
            })}
            {detectedServices.services.length > 4 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">+{detectedServices.services.length - 4}</span>
            )}
          </div>
        )}

        <span className="text-gray-300 dark:text-gray-600">•</span>

        {/* Problems count */}
        {problems.high > 0 && (
          <span className="text-orange-600 dark:text-orange-400 font-medium">
            ⚠️ {problems.high} problemi alta
          </span>
        )}

        {lead.created_at && (
          <>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span>{getTimeAgo(lead.created_at)}</span>
          </>
        )}
      </div>

      {/* Row 3: Mini disclaimer */}
      <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        Verifica prima di contattare
      </div>
    </div>
  )
}
