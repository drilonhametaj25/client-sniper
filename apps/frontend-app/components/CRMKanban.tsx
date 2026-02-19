/**
 * Componente Kanban Board per CRM
 * Visualizzazione drag-and-drop dei lead per stato
 * Usa HTML5 Drag and Drop API nativa
 * Mobile: Vista accordion collapsabile
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Phone,
  TrendingUp,
  CheckCircle,
  XCircle,
  Pause,
  RotateCcw,
  Globe,
  MapPin,
  Star,
  GripVertical,
  ExternalLink,
  Briefcase,
  MoreVertical,
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

// Configurazione stati
const STATUS_CONFIG: Record<string, {
  label: string
  color: string
  bgColor: string
  icon: any
}> = {
  to_contact: {
    label: 'Da Contattare',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    icon: Phone
  },
  in_negotiation: {
    label: 'In Trattativa',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    icon: TrendingUp
  },
  follow_up: {
    label: 'Follow-up',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    icon: RotateCcw
  },
  on_hold: {
    label: 'In Attesa',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
    icon: Pause
  },
  closed_positive: {
    label: 'Chiuso OK',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    icon: CheckCircle
  },
  closed_negative: {
    label: 'Chiuso KO',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    icon: XCircle
  }
}

// Ordine colonne
const COLUMN_ORDER = [
  'to_contact',
  'in_negotiation',
  'follow_up',
  'on_hold',
  'closed_positive',
  'closed_negative'
]

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
  // Campi opzionali (usati dalla pagina CRM ma non dal Kanban)
  attachments?: any[]
  created_at?: string
  updated_at?: string
  lead_analysis?: any
  // Campi proposte servizi
  proposals_count?: number
  proposals_value?: number
}

interface CRMKanbanProps {
  entries: CrmEntry[]
  onStatusChange: (entryId: string, newStatus: string) => Promise<void>
  onEntryClick: (entry: CrmEntry) => void
  onQuickAction?: (entry: CrmEntry, action: string) => void
}

export default function CRMKanban({ entries, onStatusChange, onEntryClick, onQuickAction }: CRMKanbanProps) {
  const [draggedEntry, setDraggedEntry] = useState<CrmEntry | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [expandedColumns, setExpandedColumns] = useState<string[]>(['to_contact', 'in_negotiation'])

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Toggle column expansion for mobile accordion
  const toggleColumn = (status: string) => {
    setExpandedColumns(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }

  // Chiudi menu quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = () => setOpenMenu(null)
    if (openMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openMenu])

  // Raggruppa entries per stato
  const entriesByStatus = COLUMN_ORDER.reduce((acc, status) => {
    acc[status] = entries.filter(e => e.status === status)
    return acc
  }, {} as Record<string, CrmEntry[]>)

  // Handlers drag and drop
  const handleDragStart = useCallback((e: React.DragEvent, entry: CrmEntry) => {
    setDraggedEntry(entry)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', entry.id)

    // Aggiungi classe per stile durante drag
    const target = e.target as HTMLElement
    setTimeout(() => target.classList.add('opacity-50'), 0)
  }, [])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedEntry(null)
    setDragOverColumn(null)

    const target = e.target as HTMLElement
    target.classList.remove('opacity-50')
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, status: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(status)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    setDragOverColumn(null)

    if (!draggedEntry || draggedEntry.status === newStatus) {
      return
    }

    setIsUpdating(draggedEntry.id)

    try {
      await onStatusChange(draggedEntry.id, newStatus)
    } catch (error) {
      console.error('Errore cambio stato:', error)
    } finally {
      setIsUpdating(null)
      setDraggedEntry(null)
    }
  }, [draggedEntry, onStatusChange])

  // Calcola score color
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400'
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  // Mobile Accordion View
  if (isMobile) {
    return (
      <div className="space-y-2">
        {COLUMN_ORDER.map(status => {
          const config = STATUS_CONFIG[status]
          const Icon = config.icon
          const columnEntries = entriesByStatus[status] || []
          const isExpanded = expandedColumns.includes(status)

          return (
            <div
              key={status}
              className={`rounded-lg border-2 overflow-hidden ${config.bgColor}`}
            >
              {/* Accordion Header - Touch friendly 48px height */}
              <button
                onClick={() => toggleColumn(status)}
                className={`w-full p-3 min-h-[48px] flex items-center justify-between ${config.bgColor}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${config.color}`} />
                  <span className={`font-medium ${config.color}`}>
                    {config.label}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 ${config.color}`}>
                    {columnEntries.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className={`w-5 h-5 ${config.color}`} />
                ) : (
                  <ChevronRight className={`w-5 h-5 ${config.color}`} />
                )}
              </button>

              {/* Accordion Content */}
              {isExpanded && (
                <div className="p-2 space-y-2 bg-white/50 dark:bg-black/20">
                  {columnEntries.length === 0 ? (
                    <p className="text-center py-4 text-sm text-gray-400">Nessun lead</p>
                  ) : (
                    columnEntries.map(entry => (
                      <div
                        key={entry.id}
                        onClick={() => onEntryClick(entry)}
                        className={`
                          bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700
                          p-3 active:bg-gray-50 dark:active:bg-gray-700
                          ${isUpdating === entry.id ? 'opacity-50 pointer-events-none' : ''}
                        `}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">
                              {entry.lead_business_name}
                            </h4>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              {entry.lead_city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {entry.lead_city}
                                </span>
                              )}
                              <span className={`flex items-center gap-1 ${getScoreColor(entry.lead_score)}`}>
                                <Star className="w-3 h-3" />
                                {entry.lead_score}
                              </span>
                            </div>
                            {entry.follow_up_date && (
                              <div className={`mt-2 text-xs px-2 py-1 rounded inline-block ${
                                new Date(entry.follow_up_date) < new Date()
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                                  : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                              }`}>
                                {new Date(entry.follow_up_date).toLocaleDateString('it-IT')}
                              </div>
                            )}
                          </div>

                          {/* Mobile Quick Actions */}
                          <div className="flex flex-col gap-1">
                            {entry.status !== 'closed_positive' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onStatusChange(entry.id, 'closed_positive')
                                }}
                                className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 min-h-[40px] min-w-[40px] flex items-center justify-center"
                              >
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </button>
                            )}
                            {entry.lead_website_url && (
                              <a
                                href={entry.lead_website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 min-h-[40px] min-w-[40px] flex items-center justify-center"
                              >
                                <Globe className="w-4 h-4 text-blue-600" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Desktop Kanban View
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMN_ORDER.map(status => {
        const config = STATUS_CONFIG[status]
        const Icon = config.icon
        const columnEntries = entriesByStatus[status] || []
        const isOver = dragOverColumn === status

        return (
          <div
            key={status}
            className={`flex-shrink-0 w-72 rounded-lg border-2 transition-colors ${
              isOver
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                : config.bgColor
            }`}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Header colonna */}
            <div className={`p-3 border-b ${config.bgColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className={`font-medium text-sm ${config.color}`}>
                    {config.label}
                  </span>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${config.bgColor} ${config.color}`}>
                  {columnEntries.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 min-h-[400px]">
              {columnEntries.map(entry => (
                <div
                  key={entry.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, entry)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onEntryClick(entry)}
                  className={`
                    bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700
                    p-3 cursor-grab active:cursor-grabbing
                    hover:shadow-md transition-all
                    ${isUpdating === entry.id ? 'opacity-50 pointer-events-none' : ''}
                  `}
                >
                  {/* Grip handle + Quick Actions */}
                  <div className="flex items-start gap-2">
                    <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />

                    <div className="flex-1 min-w-0">
                      {/* Header con nome e menu */}
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {entry.lead_business_name}
                        </h4>

                        {/* Quick Actions Menu */}
                        <div className="relative flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenMenu(openMenu === entry.id ? null : entry.id)
                            }}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                          </button>

                          {/* Dropdown Menu */}
                          {openMenu === entry.id && (
                            <div className="absolute right-0 top-6 z-50 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                              {/* Quick Status Changes */}
                              {entry.status !== 'in_negotiation' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onStatusChange(entry.id, 'in_negotiation')
                                    setOpenMenu(null)
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <TrendingUp className="w-4 h-4 text-yellow-500" />
                                  Inizia Trattativa
                                </button>
                              )}
                              {entry.status !== 'follow_up' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onStatusChange(entry.id, 'follow_up')
                                    setOpenMenu(null)
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <Calendar className="w-4 h-4 text-purple-500" />
                                  Imposta Follow-up
                                </button>
                              )}
                              {entry.status !== 'closed_positive' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onStatusChange(entry.id, 'closed_positive')
                                    setOpenMenu(null)
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  Chiudi Positivo
                                </button>
                              )}
                              {entry.status !== 'closed_negative' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onStatusChange(entry.id, 'closed_negative')
                                    setOpenMenu(null)
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <XCircle className="w-4 h-4 text-red-500" />
                                  Chiudi Negativo
                                </button>
                              )}

                              <hr className="my-1 border-gray-200 dark:border-gray-700" />

                              {/* Open Website */}
                              {entry.lead_website_url && (
                                <a
                                  href={entry.lead_website_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenMenu(null)
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <Globe className="w-4 h-4 text-blue-500" />
                                  Apri Sito Web
                                </a>
                              )}

                              {/* View Details */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenMenu(null)
                                  onEntryClick(entry)
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <MessageSquare className="w-4 h-4 text-gray-500" />
                                Dettagli e Note
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="mt-1 space-y-1">
                        {entry.lead_city && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{entry.lead_city}</span>
                          </div>
                        )}

                        {entry.lead_category && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {entry.lead_category}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="mt-2 flex items-center justify-between">
                        {/* Score */}
                        <div className={`flex items-center gap-1 text-xs font-medium ${getScoreColor(entry.lead_score)}`}>
                          <Star className="w-3 h-3" />
                          <span>{entry.lead_score}</span>
                        </div>

                        {/* Link sito */}
                        {entry.lead_website_url && (
                          <a
                            href={entry.lead_website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-400 hover:text-blue-500 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {/* Proposals indicator */}
                      {entry.proposals_count && entry.proposals_count > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                          <Briefcase className="w-3 h-3" />
                          <span>{entry.proposals_count} {entry.proposals_count === 1 ? 'proposta' : 'proposte'}</span>
                          {entry.proposals_value && entry.proposals_value > 0 && (
                            <span className="font-medium ml-auto">€{entry.proposals_value.toLocaleString()}</span>
                          )}
                        </div>
                      )}

                      {/* Follow-up indicator */}
                      {entry.follow_up_date && (
                        <div className={`mt-2 text-xs px-2 py-1 rounded ${
                          new Date(entry.follow_up_date) < new Date()
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                        }`}>
                          Follow-up: {new Date(entry.follow_up_date).toLocaleDateString('it-IT')}
                        </div>
                      )}

                      {/* Note preview */}
                      {entry.note && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 italic">
                          {entry.note}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {columnEntries.length === 0 && (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                  Nessun lead
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
