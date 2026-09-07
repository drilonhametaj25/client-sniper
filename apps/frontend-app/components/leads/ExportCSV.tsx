/**
 * ExportCSV — esporta in CSV i lead sbloccati (solo piani Starter+).
 *
 * Estratto dalla dashboard: stessa logica CSV di prima (colonne fisse,
 * escaping delle virgolette, download via Blob). Per i piani Free il
 * componente non viene renderizzato.
 *
 * Usato da: app/dashboard/page.tsx
 */

'use client'

import { Download } from 'lucide-react'
import { isStarterOrHigher } from '@/lib/utils/plan-helpers'
import type { DashboardLead } from '@/lib/hooks/useLeads'

const CSV_COLUMNS = ['business_name', 'website_url', 'email', 'phone', 'city', 'category', 'score'] as const

interface ExportCSVProps {
  /** lead da esportare (già filtrati: solo sbloccati) */
  leads: DashboardLead[]
  plan?: string
  className?: string
}

export default function ExportCSV({ leads, plan, className = '' }: ExportCSVProps) {
  if (!isStarterOrHigher(plan || 'free')) return null

  const handleExport = () => {
    const rows = leads.map(lead =>
      CSV_COLUMNS.map(col => {
        const value = lead[col as keyof DashboardLead]
        if (value === null || value === undefined) return ''
        return String(value).replace(/"/g, '""')
      })
    )

    const csvContent = [
      CSV_COLUMNS.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'leads_export.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      disabled={leads.length === 0}
      title={leads.length === 0 ? 'Sblocca almeno un lead per esportare' : `Esporta ${leads.length} lead sbloccati`}
      className={`inline-flex items-center gap-2 px-3 py-2 min-h-[44px] text-sm font-medium rounded-xl transition-colors ${
        leads.length === 0
          ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
      } ${className}`}
    >
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">Esporta CSV</span>
    </button>
  )
}
