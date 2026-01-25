/**
 * LeadCard - Componente principale per visualizzare un lead
 * Design pulito e scannable con:
 * - Dati disponibili visibili PRIMA dello sblocco
 * - Max 3 badge, max 3 CTA
 * - Disclaimer fisso sempre visibile
 * - Data scansione visibile
 * - Progress bar per lo score
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
  MoreHorizontal,
  Calendar,
  AlertCircle,
  CheckSquare,
  Square,
  Eye,
  Copy,
  MessageSquare,
  Send
} from 'lucide-react'
import DataAvailability, { DataAvailabilityCompact } from './DataAvailability'
import {
  getCriticityColor,
  getScoreBarColor,
  formatScanDate,
  getFreshnessBadge,
  extractAvailableData,
  generateLeadBadges,
  CRM_STATUS_CONFIG,
  type CrmStatus
} from '@/lib/utils/lead-card-helpers'

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
  onUnlock?: (lead: LeadCardProps['lead']) => void
  onView?: (lead: LeadCardProps['lead']) => void
  onSelect?: (id: string) => void
  onContact?: (lead: LeadCardProps['lead'], method: 'email' | 'phone') => void
  className?: string
}

export default function LeadCard({
  lead,
  isUnlocked,
  isSelected = false,
  isProUser = false,
  onUnlock,
  onView,
  onSelect,
  onContact,
  className = ''
}: LeadCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  const availableData = extractAvailableData(lead)
  const badges = generateLeadBadges(lead, 3)
  const criticality = getCriticityColor(lead.score)
  const freshness = lead.created_at ? getFreshnessBadge(lead.created_at) : null

  return (
    <div
      className={`
        relative bg-white dark:bg-gray-800 rounded-2xl border-2 transition-all duration-200
        ${isSelected
          ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
        ${className}
      `}
    >
      {/* Header: Selection + Badges */}
      <div className="flex items-start justify-between p-4 pb-2">
        {/* Selection checkbox (solo se sbloccato) */}
        <div className="flex items-center gap-2">
          {isUnlocked && onSelect && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSelect(lead.id)
              }}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={isSelected ? 'Deseleziona' : 'Seleziona'}
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-blue-600" />
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
            </button>
          )}

          {/* Badges (max 3) */}
          <div className="flex flex-wrap gap-1.5">
            {badges.map((badge, index) => (
              <span
                key={index}
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        </div>

        {/* Menu azioni extra */}
        {isUnlocked && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-500" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(lead.email || '')
                      setShowMenu(false)
                    }}
                    disabled={!lead.email}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Copy className="w-4 h-4" />
                    Copia email
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(lead.phone || '')
                      setShowMenu(false)
                    }}
                    disabled={!lead.phone}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Copy className="w-4 h-4" />
                    Copia telefono
                  </button>
                  <button
                    onClick={() => {
                      window.open(lead.website_url?.startsWith('http') ? lead.website_url : `https://${lead.website_url}`, '_blank')
                      setShowMenu(false)
                    }}
                    disabled={!lead.website_url}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Apri sito web
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="px-4 pb-2">
        {isUnlocked ? (
          // --- STATO SBLOCCATO ---
          <>
            {/* Business Name */}
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg truncate mb-1">
              {lead.business_name || 'Nome azienda'}
            </h3>

            {/* Location */}
            {lead.city && (
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                <MapPin className="w-3.5 h-3.5 mr-1" />
                <span>{lead.city}</span>
              </div>
            )}

            {/* Contact Info */}
            <div className="space-y-2 mb-3">
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center text-sm text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  <Phone className="w-4 h-4 mr-2 text-green-500" />
                  <span>{lead.phone}</span>
                </a>
              )}
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate"
                >
                  <Mail className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0" />
                  <span className="truncate">{lead.email}</span>
                </a>
              )}
              {lead.website_url && (
                <a
                  href={lead.website_url.startsWith('http') ? lead.website_url : `https://${lead.website_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline truncate"
                >
                  <Globe className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{lead.website_url.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink className="w-3 h-3 ml-1 flex-shrink-0" />
                </a>
              )}
            </div>

            {/* CRM Status (solo Pro) */}
            {isProUser && lead.crm_status && lead.crm_status !== 'new' && (
              <div className="mb-3">
                <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${CRM_STATUS_CONFIG[lead.crm_status as CrmStatus]?.color || CRM_STATUS_CONFIG.new.color}`}>
                  {CRM_STATUS_CONFIG[lead.crm_status as CrmStatus]?.label || 'Nuovo'}
                </span>
              </div>
            )}
          </>
        ) : (
          // --- STATO BLOCCATO ---
          <>
            {/* Lock icon + location preview */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Lock className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {lead.city || 'Azienda'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {lead.category || 'Lead disponibile'}
                </p>
              </div>
            </div>

            {/* Dati disponibili preview */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-1.5">Dati disponibili:</p>
              <DataAvailabilityCompact data={availableData} />
            </div>
          </>
        )}
      </div>

      {/* Score Section */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Score sito web
          </span>
          <span className={`text-sm font-bold ${criticality.text}`}>
            {lead.score}/100
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getScoreBarColor(lead.score)} transition-all duration-300`}
            style={{ width: `${lead.score}%` }}
          />
        </div>
      </div>

      {/* Scan Date */}
      {lead.created_at && (
        <div className="px-4 pb-2">
          <div className="flex items-center text-xs text-gray-400 dark:text-gray-500">
            <Calendar className="w-3 h-3 mr-1" />
            <span>Scansionato {formatScanDate(lead.created_at)}</span>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="px-4 pb-3">
        <div className="flex items-start gap-1.5 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/50 rounded-lg px-2 py-1.5">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>Analisi automatica - verifica prima di contattare</span>
        </div>
      </div>

      {/* CTAs (max 3) */}
      <div className="px-4 pb-4">
        {isUnlocked ? (
          // CTA per lead sbloccato
          <div className="flex gap-2">
            {/* CTA primario: Dettagli */}
            <button
              onClick={() => onView?.(lead)}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Eye className="w-4 h-4" />
              Dettagli
            </button>

            {/* CTA secondario: Contatta (se ha email o telefono) */}
            {(lead.email || lead.phone) && (
              <button
                onClick={() => onContact?.(lead, lead.email ? 'email' : 'phone')}
                className="py-2 px-3 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5"
                title={lead.email ? 'Invia email' : 'Chiama'}
              >
                {lead.email ? <Send className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
              </button>
            )}
          </div>
        ) : (
          // CTA per lead bloccato
          <button
            onClick={() => onUnlock?.(lead)}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Unlock className="w-4 h-4" />
            Sblocca (1 credito)
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Variante compatta per liste
 */
export function LeadCardCompact({
  lead,
  isUnlocked,
  isSelected = false,
  onUnlock,
  onView,
  onSelect,
  className = ''
}: Omit<LeadCardProps, 'isProUser' | 'onContact'>) {
  const availableData = extractAvailableData(lead)
  const criticality = getCriticityColor(lead.score)

  return (
    <div
      className={`
        flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-xl border
        ${isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
        transition-all duration-200 ${className}
      `}
    >
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

      {/* Lock/Info */}
      <div className="flex-shrink-0">
        {isUnlocked ? (
          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg font-bold text-gray-700 dark:text-gray-300">
            {lead.business_name?.charAt(0) || '?'}
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Lock className="w-5 h-5 text-gray-400" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">
            {isUnlocked ? (lead.business_name || 'Azienda') : (lead.city || 'Lead')}
          </h3>
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${criticality.bg} ${criticality.text}`}>
            {lead.score}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          {isUnlocked ? (
            <>
              {lead.city && <span className="truncate">{lead.city}</span>}
              {lead.category && <span className="truncate">{lead.category}</span>}
            </>
          ) : (
            <DataAvailabilityCompact data={availableData} />
          )}
        </div>
      </div>

      {/* Action */}
      {isUnlocked ? (
        <button
          onClick={() => onView?.(lead)}
          className="flex-shrink-0 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
        >
          Dettagli
        </button>
      ) : (
        <button
          onClick={() => onUnlock?.(lead)}
          className="flex-shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
        >
          <Unlock className="w-3.5 h-3.5" />
          Sblocca
        </button>
      )}
    </div>
  )
}
