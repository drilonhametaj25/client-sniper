/**
 * CRM Stats Header - Dashboard metriche pipeline
 * Mostra KPI chiave: pipeline value, conversion rate, attività mensile
 */

'use client'

import { useMemo } from 'react'
import {
  TrendingUp,
  Target,
  Calendar,
  DollarSign,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react'

interface CrmEntry {
  id: string
  status: string
  follow_up_date: string | null
  created_at?: string
  lead_score: number
}

interface CrmStats {
  total_entries: number
  to_contact: number
  in_negotiation: number
  closed_positive: number
  closed_negative: number
  on_hold: number
  follow_up: number
  overdue_follow_ups: number
}

interface CRMStatsHeaderProps {
  stats: CrmStats | null
  entries: CrmEntry[]
}

export default function CRMStatsHeader({ stats, entries }: CRMStatsHeaderProps) {
  // Calcola metriche avanzate
  const metrics = useMemo(() => {
    if (!stats || !entries.length) {
      return {
        pipelineValue: 0,
        conversionRate: 0,
        avgScore: 0,
        thisMonthNew: 0,
        thisMonthClosed: 0,
        activeDeals: 0
      }
    }

    // Pipeline attiva (in trattativa + follow-up)
    const activeDeals = stats.in_negotiation + stats.follow_up + stats.to_contact

    // Conversion rate (chiusi positivi / totale chiusi)
    const totalClosed = stats.closed_positive + stats.closed_negative
    const conversionRate = totalClosed > 0
      ? Math.round((stats.closed_positive / totalClosed) * 100)
      : 0

    // Score medio dei lead attivi
    const activeEntries = entries.filter(e =>
      !['closed_positive', 'closed_negative'].includes(e.status)
    )
    const avgScore = activeEntries.length > 0
      ? Math.round(activeEntries.reduce((sum, e) => sum + e.lead_score, 0) / activeEntries.length)
      : 0

    // Lead di questo mese (basato su created_at se disponibile)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthEntries = entries.filter(e =>
      e.created_at && new Date(e.created_at) >= startOfMonth
    )

    // Stima valore pipeline (basato su score - maggiore il problema, maggiore l'opportunità)
    // Score basso = più problemi = più valore potenziale
    const pipelineValue = activeEntries.reduce((sum, e) => {
      // Stima valore basata su score inverso (0-30 = €2000, 30-60 = €1000, 60-100 = €500)
      const estimatedValue = e.lead_score < 30 ? 2000 : e.lead_score < 60 ? 1000 : 500
      return sum + estimatedValue
    }, 0)

    return {
      pipelineValue,
      conversionRate,
      avgScore,
      thisMonthNew: thisMonthEntries.length,
      thisMonthClosed: entries.filter(e =>
        ['closed_positive', 'closed_negative'].includes(e.status) &&
        e.created_at && new Date(e.created_at) >= startOfMonth
      ).length,
      activeDeals
    }
  }, [stats, entries])

  if (!stats) return null

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
      {/* Pipeline Value */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between mb-2">
          <DollarSign className="w-5 h-5 opacity-80" />
          <span className="text-xs opacity-80">Pipeline</span>
        </div>
        <p className="text-2xl font-bold">€{metrics.pipelineValue.toLocaleString()}</p>
        <p className="text-xs opacity-80 mt-1">{metrics.activeDeals} deal attivi</p>
      </div>

      {/* Conversion Rate */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between mb-2">
          <Target className="w-5 h-5 opacity-80" />
          <span className="text-xs opacity-80">Conversione</span>
        </div>
        <p className="text-2xl font-bold">{metrics.conversionRate}%</p>
        <p className="text-xs opacity-80 mt-1">{stats.closed_positive} vinti su {stats.closed_positive + stats.closed_negative}</p>
      </div>

      {/* Da Contattare */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <Users className="w-5 h-5 text-blue-500" />
          <span className="text-xs text-gray-500">Da Contattare</span>
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.to_contact}</p>
        <p className="text-xs text-gray-500 mt-1">lead in attesa</p>
      </div>

      {/* In Trattativa */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <TrendingUp className="w-5 h-5 text-yellow-500" />
          <span className="text-xs text-gray-500">In Trattativa</span>
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.in_negotiation}</p>
        <p className="text-xs text-gray-500 mt-1">negoziazioni attive</p>
      </div>

      {/* Chiusi Positivi */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <span className="text-xs text-gray-500">Vinti</span>
        </div>
        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.closed_positive}</p>
        <p className="text-xs text-gray-500 mt-1">clienti acquisiti</p>
      </div>

      {/* Follow-up Scaduti */}
      <div className={`rounded-xl p-4 border ${
        stats.overdue_follow_ups > 0
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <AlertTriangle className={`w-5 h-5 ${stats.overdue_follow_ups > 0 ? 'text-red-500' : 'text-gray-400'}`} />
          <span className="text-xs text-gray-500">Scaduti</span>
        </div>
        <p className={`text-2xl font-bold ${stats.overdue_follow_ups > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
          {stats.overdue_follow_ups}
        </p>
        <p className="text-xs text-gray-500 mt-1">follow-up urgenti</p>
      </div>
    </div>
  )
}
