/**
 * ExportDropdown - Dropdown per esportare lead in vari formati
 * Supporta: CSV, Excel, Mailchimp, HubSpot
 */

'use client'

import { useState } from 'react'
import {
  Download,
  FileText,
  FileSpreadsheet,
  Mail,
  Database,
  ChevronDown,
  Check,
  Loader2
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
  address?: string
  analysis?: any
  [key: string]: any
}

interface ExportDropdownProps {
  leads: Lead[]
  selectedLeadIds?: string[]
  disabled?: boolean
}

type ExportFormat = 'csv' | 'excel' | 'mailchimp' | 'hubspot' | 'json'

interface ExportOption {
  id: ExportFormat
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  pro?: boolean
}

const exportOptions: ExportOption[] = [
  {
    id: 'csv',
    label: 'CSV Standard',
    description: 'Compatibile con Excel e Google Sheets',
    icon: FileText
  },
  {
    id: 'excel',
    label: 'Excel Formattato',
    description: 'Con colori e formattazione',
    icon: FileSpreadsheet,
    pro: true
  },
  {
    id: 'mailchimp',
    label: 'Per Mailchimp',
    description: 'Formato ottimizzato per import',
    icon: Mail,
    pro: true
  },
  {
    id: 'hubspot',
    label: 'Per HubSpot',
    description: 'Formato CRM compatibile',
    icon: Database,
    pro: true
  },
  {
    id: 'json',
    label: 'JSON',
    description: 'Per sviluppatori e API',
    icon: FileText,
    pro: true
  }
]

export default function ExportDropdown({
  leads,
  selectedLeadIds,
  disabled = false
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const [showColumnSelector, setShowColumnSelector] = useState(false)
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'business_name',
    'website_url',
    'email',
    'phone',
    'city',
    'category',
    'score'
  ])

  const availableColumns = [
    { key: 'business_name', label: 'Nome Azienda' },
    { key: 'website_url', label: 'Sito Web' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Telefono' },
    { key: 'city', label: 'Citta' },
    { key: 'category', label: 'Categoria' },
    { key: 'score', label: 'Score' },
    { key: 'address', label: 'Indirizzo' },
    { key: 'crm_status', label: 'Stato CRM' },
    { key: 'created_at', label: 'Data Creazione' }
  ]

  const leadsToExport = selectedLeadIds?.length
    ? leads.filter(l => selectedLeadIds.includes(l.id))
    : leads

  const exportCSV = () => {
    const headers = selectedColumns.map(col =>
      availableColumns.find(c => c.key === col)?.label || col
    )

    const rows = leadsToExport.map(lead =>
      selectedColumns.map(col => {
        const value = lead[col]
        if (value === null || value === undefined) return ''
        if (typeof value === 'object') return JSON.stringify(value)
        return String(value).replace(/"/g, '""')
      })
    )

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    downloadFile(csvContent, 'leads_export.csv', 'text/csv;charset=utf-8;')
  }

  const exportJSON = () => {
    const data = leadsToExport.map(lead => {
      const filtered: any = {}
      selectedColumns.forEach(col => {
        filtered[col] = lead[col]
      })
      return filtered
    })

    const jsonContent = JSON.stringify(data, null, 2)
    downloadFile(jsonContent, 'leads_export.json', 'application/json')
  }

  const exportMailchimp = () => {
    // Mailchimp format: Email, First Name, Last Name, Tags
    const headers = ['Email Address', 'Company', 'City', 'Tags']
    const rows = leadsToExport
      .filter(lead => lead.email)
      .map(lead => [
        lead.email || '',
        lead.business_name || '',
        lead.city || '',
        lead.category || ''
      ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    downloadFile(csvContent, 'leads_mailchimp.csv', 'text/csv;charset=utf-8;')
  }

  const exportHubSpot = () => {
    // HubSpot format
    const headers = [
      'Company name',
      'Website URL',
      'Company Domain Name',
      'City',
      'Industry',
      'Email',
      'Phone Number',
      'Lead Status'
    ]

    const rows = leadsToExport.map(lead => {
      const domain = lead.website_url
        ? new URL(lead.website_url.startsWith('http') ? lead.website_url : `https://${lead.website_url}`).hostname
        : ''

      return [
        lead.business_name || '',
        lead.website_url || '',
        domain,
        lead.city || '',
        lead.category || '',
        lead.email || '',
        lead.phone || '',
        mapCrmStatusToHubSpot(lead.crm_status)
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    downloadFile(csvContent, 'leads_hubspot.csv', 'text/csv;charset=utf-8;')
  }

  const mapCrmStatusToHubSpot = (status?: string) => {
    const mapping: Record<string, string> = {
      new: 'New',
      to_contact: 'Open',
      contacted: 'In Progress',
      in_negotiation: 'Open Deal',
      won: 'Customer',
      lost: 'Unqualified'
    }
    return mapping[status || ''] || 'New'
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExport = async (format: ExportFormat) => {
    setExporting(format)

    try {
      switch (format) {
        case 'csv':
          exportCSV()
          break
        case 'json':
          exportJSON()
          break
        case 'mailchimp':
          exportMailchimp()
          break
        case 'hubspot':
          exportHubSpot()
          break
        case 'excel':
          // For Excel, we'd need a library like xlsx
          // For now, export as CSV with .xlsx extension
          exportCSV()
          break
      }
    } finally {
      setTimeout(() => {
        setExporting(null)
        setIsOpen(false)
      }, 500)
    }
  }

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev =>
      prev.includes(key)
        ? prev.filter(c => c !== key)
        : [...prev, key]
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || leadsToExport.length === 0}
        className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all ${
          disabled || leadsToExport.length === 0
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900'
        }`}
      >
        <Download className="w-4 h-4" />
        <span>Esporta</span>
        {selectedLeadIds?.length ? (
          <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
            {selectedLeadIds.length}
          </span>
        ) : null}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false)
              setShowColumnSelector(false)
            }}
          />
          <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Esporta {leadsToExport.length} lead
              </h3>
              <button
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showColumnSelector ? 'Nascondi colonne' : 'Seleziona colonne'}
              </button>
            </div>

            {/* Column Selector */}
            {showColumnSelector && (
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {availableColumns.map(col => (
                    <label
                      key={col.key}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedColumns.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {col.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Export Options */}
            <div className="py-2">
              {exportOptions.map(option => {
                const Icon = option.icon
                const isExporting = exporting === option.id

                return (
                  <button
                    key={option.id}
                    onClick={() => handleExport(option.id)}
                    disabled={isExporting}
                    className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      {isExporting ? (
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      ) : (
                        <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {option.label}
                        </span>
                        {option.pro && (
                          <span className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
                            PRO
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {option.description}
                      </span>
                    </div>
                    {isExporting && (
                      <Check className="w-5 h-5 text-green-500" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
