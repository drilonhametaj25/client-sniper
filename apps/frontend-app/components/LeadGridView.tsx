/**
 * LeadGridView - Vista a griglia compatta dei lead
 * Cards piu' piccole con info essenziali
 */

'use client'

import {
  Globe,
  Mail,
  Phone,
  MapPin,
  Tag,
  Lock,
  Unlock,
  ExternalLink,
  CheckSquare,
  Square,
  TrendingUp,
  AlertCircle
} from 'lucide-react'

interface Lead {
  id: string
  business_name?: string
  website_url?: string
  city?: string
  category?: string
  email?: string
  phone?: string
  score: number
  crm_status?: string
  analysis?: any
  [key: string]: any
}

interface LeadGridViewProps {
  leads: Lead[]
  unlockedLeadIds: string[]
  selectedLeads: string[]
  onSelectLead: (id: string) => void
  onUnlockLead: (lead: Lead) => void
  onViewLead: (lead: Lead) => void
  isProUser?: boolean
}

export default function LeadGridView({
  leads,
  unlockedLeadIds,
  selectedLeads,
  onSelectLead,
  onUnlockLead,
  onViewLead,
  isProUser = false
}: LeadGridViewProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100 dark:bg-green-900/50 dark:text-green-400'
    if (score >= 60) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400'
    if (score >= 40) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-400'
    return 'text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-400'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Ottimo'
    if (score >= 60) return 'Buono'
    if (score >= 40) return 'Medio'
    return 'Basso'
  }

  const getCrmStatusColor = (status?: string) => {
    const colors: Record<string, string> = {
      new: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      to_contact: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
      contacted: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
      in_negotiation: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
      won: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      lost: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
    }
    return colors[status || 'new'] || colors.new
  }

  const getCrmStatusLabel = (status?: string) => {
    const labels: Record<string, string> = {
      new: 'Nuovo',
      to_contact: 'Da contattare',
      contacted: 'Contattato',
      in_negotiation: 'In trattativa',
      won: 'Vinto',
      lost: 'Perso'
    }
    return labels[status || 'new'] || 'Nuovo'
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {leads.map(lead => {
        const isUnlocked = unlockedLeadIds.includes(lead.id)
        const isSelected = selectedLeads.includes(lead.id)

        return (
          <div
            key={lead.id}
            className={`
              relative bg-white dark:bg-gray-800 rounded-2xl border-2 transition-all duration-200 overflow-hidden
              ${isSelected
                ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }
              ${isUnlocked ? '' : 'opacity-90'}
            `}
          >
            {/* Selection Checkbox */}
            {isUnlocked && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectLead(lead.id)
                }}
                className="absolute top-3 left-3 z-10 p-1 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-700 transition-colors"
              >
                {isSelected ? (
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400" />
                )}
              </button>
            )}

            {/* Score Badge */}
            <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-bold ${getScoreColor(lead.score)}`}>
              {lead.score}
            </div>

            {/* Content */}
            <div className="p-4 pt-10">
              {isUnlocked ? (
                // Unlocked Lead
                <>
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate mb-1">
                    {lead.business_name || 'Azienda'}
                  </h3>

                  {lead.website_url && (
                    <a
                      href={lead.website_url.startsWith('http') ? lead.website_url : `https://${lead.website_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline truncate mb-3"
                    >
                      <Globe className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{lead.website_url.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}

                  {/* Location & Category */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {lead.city && (
                      <span className="inline-flex items-center text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                        <MapPin className="w-3 h-3 mr-1" />
                        {lead.city}
                      </span>
                    )}
                    {lead.category && (
                      <span className="inline-flex items-center text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                        <Tag className="w-3 h-3 mr-1" />
                        {lead.category}
                      </span>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1 mb-3">
                    {lead.email && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Mail className="w-3 h-3 mr-2 text-blue-500" />
                        <span className="truncate">{lead.email}</span>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Phone className="w-3 h-3 mr-2 text-green-500" />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* CRM Status */}
                  {isProUser && lead.crm_status && (
                    <span className={`inline-block text-xs font-medium px-2 py-1 rounded-lg ${getCrmStatusColor(lead.crm_status)}`}>
                      {getCrmStatusLabel(lead.crm_status)}
                    </span>
                  )}

                  {/* Actions */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                    <button
                      onClick={() => onViewLead(lead)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                    >
                      Dettagli
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                </>
              ) : (
                // Locked Lead
                <>
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-gray-400" />
                    </div>
                  </div>

                  <div className="text-center mb-3">
                    <div className="flex items-center justify-center space-x-2 mb-1">
                      {lead.city && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {lead.city}
                        </span>
                      )}
                      {lead.category && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {lead.category}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Score: {getScoreLabel(lead.score)}
                    </p>
                  </div>

                  {/* Contact Indicators */}
                  <div className="flex justify-center space-x-2 mb-3">
                    {lead.email && (
                      <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <Mail className="w-3 h-3 text-blue-500" />
                      </span>
                    )}
                    {lead.phone && (
                      <span className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                        <Phone className="w-3 h-3 text-green-500" />
                      </span>
                    )}
                  </div>

                  {/* Unlock Button */}
                  <button
                    onClick={() => onUnlockLead(lead)}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center"
                  >
                    <Unlock className="w-4 h-4 mr-2" />
                    Sblocca (1 credito)
                  </button>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
