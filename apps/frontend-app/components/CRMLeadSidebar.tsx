/**
 * CRM Lead Sidebar - Pannello laterale per dettaglio rapido lead
 * Slide-in da destra con quick edit di status, note, follow-up
 * Mostra anche le proposte servizi collegate
 */

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Globe,
  MapPin,
  Star,
  Calendar,
  FileText,
  Briefcase,
  ExternalLink,
  Phone,
  TrendingUp,
  CheckCircle,
  XCircle,
  Pause,
  RotateCcw,
  Save,
  Loader2
} from 'lucide-react'
import Button from '@/components/ui/Button'

// Status configuration
const STATUS_CONFIG: Record<string, {
  label: string
  color: string
  bgColor: string
  icon: any
}> = {
  to_contact: {
    label: 'Da Contattare',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: Phone
  },
  in_negotiation: {
    label: 'In Trattativa',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: TrendingUp
  },
  follow_up: {
    label: 'Follow-up',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: RotateCcw
  },
  on_hold: {
    label: 'In Attesa',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    icon: Pause
  },
  closed_positive: {
    label: 'Chiuso OK',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: CheckCircle
  },
  closed_negative: {
    label: 'Chiuso KO',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: XCircle
  }
}

interface CrmEntry {
  id: string
  lead_id: string
  status: string
  note: string | null
  follow_up_date: string | null
  lead_business_name: string
  lead_website_url: string
  lead_city: string
  lead_category: string
  lead_score: number
  attachments?: any[]
  created_at?: string
  updated_at?: string
  lead_analysis?: any
}

interface ProposedService {
  id: string
  service_id: string
  status: string
  custom_price_eur: number | null
  notes: string | null
  digital_services: {
    id: string
    name: string
    price_freelance_eur: number
  }
}

interface CRMLeadSidebarProps {
  entry: CrmEntry | null
  isOpen: boolean
  onClose: () => void
  onSave: (entryId: string, data: { status: string; note: string; follow_up_date: string | null }) => Promise<void>
  onViewDetail: (leadId: string) => void
}

export default function CRMLeadSidebar({
  entry,
  isOpen,
  onClose,
  onSave,
  onViewDetail
}: CRMLeadSidebarProps) {
  const [status, setStatus] = useState(entry?.status || 'to_contact')
  const [note, setNote] = useState(entry?.note || '')
  const [followUpDate, setFollowUpDate] = useState(entry?.follow_up_date || '')
  const [proposals, setProposals] = useState<ProposedService[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [loadingProposals, setLoadingProposals] = useState(false)

  // Reset form when entry changes
  useEffect(() => {
    if (entry) {
      setStatus(entry.status)
      setNote(entry.note || '')
      setFollowUpDate(entry.follow_up_date || '')
      loadProposals(entry.lead_id)
    }
  }, [entry])

  // Load proposals for this lead
  const loadProposals = async (leadId: string) => {
    setLoadingProposals(true)
    try {
      const response = await fetch(`/api/lead-proposed-services?lead_id=${leadId}`)
      if (response.ok) {
        const data = await response.json()
        setProposals(data.data?.proposedServices || [])
      }
    } catch (error) {
      console.error('Error loading proposals:', error)
    } finally {
      setLoadingProposals(false)
    }
  }

  // Handle save
  const handleSave = async () => {
    if (!entry) return

    setIsSaving(true)
    try {
      await onSave(entry.id, {
        status,
        note,
        follow_up_date: followUpDate || null
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400'
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  // Get score badge color
  const getScoreBgColor = (score: number) => {
    if (score >= 70) return 'bg-green-100 dark:bg-green-900/30'
    if (score >= 40) return 'bg-yellow-100 dark:bg-yellow-900/30'
    return 'bg-red-100 dark:bg-red-900/30'
  }

  // Check if follow-up is overdue
  const isOverdue = followUpDate && new Date(followUpDate) < new Date()

  // Calculate total proposal value
  const totalProposalValue = proposals.reduce((sum, p) => {
    return sum + (p.custom_price_eur || p.digital_services.price_freelance_eur)
  }, 0)

  if (!entry) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full sm:max-w-md bg-white dark:bg-gray-900 shadow-xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 z-10">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {entry.lead_business_name}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
              {/* Lead Info */}
              <div className="space-y-3">
                {/* Score Badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${getScoreBgColor(entry.lead_score)}`}>
                  <Star className={`w-4 h-4 ${getScoreColor(entry.lead_score)}`} />
                  <span className={`font-medium ${getScoreColor(entry.lead_score)}`}>
                    Score: {entry.lead_score}/100
                  </span>
                </div>

                {/* Location & Category */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                  {entry.lead_city && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{entry.lead_city}</span>
                    </div>
                  )}
                  {entry.lead_category && (
                    <div className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      <span>{entry.lead_category}</span>
                    </div>
                  )}
                </div>

                {/* Website */}
                {entry.lead_website_url && (
                  <a
                    href={entry.lead_website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    <Globe className="w-4 h-4" />
                    <span className="truncate">{entry.lead_website_url}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                )}
              </div>

              {/* Divider */}
              <hr className="border-gray-200 dark:border-gray-700" />

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stato
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                    const Icon = config.icon
                    const isSelected = status === key
                    return (
                      <button
                        key={key}
                        onClick={() => setStatus(key)}
                        className={`flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-lg border-2 transition-all text-sm ${
                          isSelected
                            ? `${config.bgColor} ${config.color} border-current`
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate text-left">{config.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Follow-up Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Data Follow-up
                </label>
                <input
                  type="date"
                  value={followUpDate ? followUpDate.split('T')[0] : ''}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className={`w-full px-3 py-2.5 min-h-[44px] text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 ${
                    isOverdue
                      ? 'border-red-300 dark:border-red-700 text-red-600 dark:text-red-400'
                      : 'border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100'
                  }`}
                />
                {isOverdue && (
                  <p className="text-xs text-red-500 mt-1">Follow-up scaduto!</p>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Note
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Aggiungi note sul lead..."
                  rows={4}
                  className="w-full px-3 py-2.5 text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Divider */}
              <hr className="border-gray-200 dark:border-gray-700" />

              {/* Proposals Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Proposte ({proposals.length})
                  </h3>
                  {totalProposalValue > 0 && (
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      Totale: €{totalProposalValue.toLocaleString()}
                    </span>
                  )}
                </div>

                {loadingProposals ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : proposals.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                    Nessuna proposta servizi
                  </p>
                ) : (
                  <div className="space-y-2">
                    {proposals.map((proposal) => (
                      <div
                        key={proposal.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {proposal.digital_services.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {proposal.status}
                          </p>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          €{(proposal.custom_price_eur || proposal.digital_services.price_freelance_eur).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions - Safe area for mobile */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-3 sm:p-4 pb-safe space-y-2 sm:space-y-3">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full min-h-[48px]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salva Modifiche
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => onViewDetail(entry.lead_id)}
                className="w-full min-h-[48px]"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Vedi Dettaglio Completo
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
