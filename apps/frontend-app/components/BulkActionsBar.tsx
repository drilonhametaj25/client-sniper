/**
 * BulkActionsBar - Barra azioni bulk per lead selezionati
 * Appare quando almeno un lead e' selezionato
 * Supporta: export, tag, cambio stato CRM, email bulk
 */

'use client'

import { useState } from 'react'
import {
  X,
  Download,
  Tag,
  Mail,
  Trash2,
  CheckSquare,
  Square,
  FileSpreadsheet,
  FileText,
  MoreHorizontal
} from 'lucide-react'

interface Lead {
  id: string
  business_name?: string
  website_url?: string
  city?: string
  category?: string
  email?: string
  phone?: string
  score?: number
  crm_status?: string
  [key: string]: any
}

interface BulkActionsBarProps {
  selectedLeads: string[]
  leads: Lead[]
  onClearSelection: () => void
  onSelectAll: () => void
  totalLeads: number
  allSelected: boolean
  onExportCSV: (leadIds: string[]) => void
  onExportExcel?: (leadIds: string[]) => void
  onBulkStatusChange?: (leadIds: string[], status: string) => void
  onBulkTag?: (leadIds: string[], tag: string) => void
  onBulkEmail?: (leadIds: string[]) => void
}

export default function BulkActionsBar({
  selectedLeads,
  leads,
  onClearSelection,
  onSelectAll,
  totalLeads,
  allSelected,
  onExportCSV,
  onExportExcel,
  onBulkStatusChange,
  onBulkTag,
  onBulkEmail
}: BulkActionsBarProps) {
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  if (selectedLeads.length === 0) return null

  const selectedCount = selectedLeads.length

  const crmStatuses = [
    { value: 'new', label: 'Nuovo', color: 'bg-gray-100 text-gray-800' },
    { value: 'to_contact', label: 'Da contattare', color: 'bg-blue-100 text-blue-800' },
    { value: 'contacted', label: 'Contattato', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'in_negotiation', label: 'In trattativa', color: 'bg-purple-100 text-purple-800' },
    { value: 'won', label: 'Vinto', color: 'bg-green-100 text-green-800' },
    { value: 'lost', label: 'Perso', color: 'bg-red-100 text-red-800' }
  ]

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-blue-600 dark:bg-blue-700 shadow-lg animate-in slide-in-from-top duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left: Selection info */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onClearSelection}
              className="p-1.5 hover:bg-blue-700 dark:hover:bg-blue-600 rounded-lg transition-colors"
              title="Deseleziona tutto"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={allSelected ? onClearSelection : onSelectAll}
                className="p-1.5 hover:bg-blue-700 dark:hover:bg-blue-600 rounded-lg transition-colors"
                title={allSelected ? 'Deseleziona tutto' : 'Seleziona tutto'}
              >
                {allSelected ? (
                  <CheckSquare className="w-5 h-5 text-white" />
                ) : (
                  <Square className="w-5 h-5 text-white" />
                )}
              </button>
              <span className="text-white font-medium">
                {selectedCount} {selectedCount === 1 ? 'lead selezionato' : 'lead selezionati'}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2">
            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowExportMenu(!showExportMenu)
                  setShowStatusMenu(false)
                  setShowMoreMenu(false)
                }}
                className="flex items-center space-x-2 px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Esporta</span>
              </button>

              {showExportMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-20">
                    <button
                      onClick={() => {
                        onExportCSV(selectedLeads)
                        setShowExportMenu(false)
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Esporta CSV</span>
                    </button>
                    {onExportExcel && (
                      <button
                        onClick={() => {
                          onExportExcel(selectedLeads)
                          setShowExportMenu(false)
                        }}
                        className="w-full flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Esporta Excel</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Status Change Dropdown */}
            {onBulkStatusChange && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowStatusMenu(!showStatusMenu)
                    setShowExportMenu(false)
                    setShowMoreMenu(false)
                  }}
                  className="flex items-center space-x-2 px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                >
                  <Tag className="w-4 h-4" />
                  <span className="hidden sm:inline">Stato</span>
                </button>

                {showStatusMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowStatusMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-20">
                      {crmStatuses.map(status => (
                        <button
                          key={status.value}
                          onClick={() => {
                            onBulkStatusChange(selectedLeads, status.value)
                            setShowStatusMenu(false)
                          }}
                          className="w-full flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <span className={`w-3 h-3 rounded-full ${status.color.split(' ')[0]}`} />
                          <span>{status.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Email Bulk */}
            {onBulkEmail && (
              <button
                onClick={() => onBulkEmail(selectedLeads)}
                className="flex items-center space-x-2 px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                title="Invia email ai selezionati"
              >
                <Mail className="w-4 h-4" />
                <span className="hidden sm:inline">Email</span>
              </button>
            )}

            {/* More Actions */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowMoreMenu(!showMoreMenu)
                  setShowExportMenu(false)
                  setShowStatusMenu(false)
                }}
                className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMoreMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMoreMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-20">
                    <button
                      onClick={() => {
                        onSelectAll()
                        setShowMoreMenu(false)
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>Seleziona tutti ({totalLeads})</span>
                    </button>
                    <button
                      onClick={() => {
                        onClearSelection()
                        setShowMoreMenu(false)
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <X className="w-4 h-4" />
                      <span>Deseleziona tutti</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
