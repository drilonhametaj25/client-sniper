/**
 * CRM Analytics Widget
 * Mostra metriche CRM: pipeline value, distribuzione status, conversion rate
 * Dati da: /api/crm/analytics
 */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  TrendingUp,
  DollarSign,
  Target,
  Phone,
  CheckCircle,
  XCircle,
  Pause,
  RotateCcw,
  Clock,
  AlertTriangle,
  Calendar,
  Loader2
} from 'lucide-react'

// Configurazione stati con colori
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  to_contact: { label: 'Da Contattare', color: 'text-blue-600', bgColor: 'bg-blue-500', icon: Phone },
  in_negotiation: { label: 'In Trattativa', color: 'text-yellow-600', bgColor: 'bg-yellow-500', icon: TrendingUp },
  follow_up: { label: 'Follow-up', color: 'text-purple-600', bgColor: 'bg-purple-500', icon: RotateCcw },
  on_hold: { label: 'In Attesa', color: 'text-gray-600', bgColor: 'bg-gray-400', icon: Pause },
  closed_positive: { label: 'Chiuso OK', color: 'text-green-600', bgColor: 'bg-green-500', icon: CheckCircle },
  closed_negative: { label: 'Chiuso KO', color: 'text-red-600', bgColor: 'bg-red-500', icon: XCircle }
}

interface CrmAnalyticsData {
  period: {
    days: number
    from: string
    to: string
  }
  summary: {
    totalEntries: number
    newInPeriod: number
    conversionRate: number
    contactRate: number
    pipelineValue: number
    closedValue: number
    overdueFollowUps: number
    upcomingFollowUps: number
  }
  distribution: Record<string, number>
  activityByWeek: Record<string, number>
  topCategories: Array<{ name: string; count: number }>
  topCities: Array<{ name: string; count: number }>
}

export function CrmAnalyticsWidget() {
  const [data, setData] = useState<CrmAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    loadData()
  }, [period])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        setError('Non autenticato')
        return
      }

      const response = await fetch(`/api/crm/analytics?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Errore caricamento dati')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('CRM Analytics error:', err)
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="text-center py-8 text-red-500">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Riprova
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const maxStatusCount = Math.max(...Object.values(data.distribution))

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          CRM Analytics
        </h3>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="7">Ultimi 7 giorni</option>
          <option value="30">Ultimi 30 giorni</option>
          <option value="90">Ultimi 90 giorni</option>
          <option value="365">Ultimo anno</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Pipeline Value */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 opacity-80" />
            <span className="text-xs opacity-80">Pipeline</span>
          </div>
          <p className="text-xl font-bold">€{data.summary.pipelineValue.toLocaleString()}</p>
        </div>

        {/* Closed Value */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 opacity-80" />
            <span className="text-xs opacity-80">Chiuso</span>
          </div>
          <p className="text-xl font-bold">€{data.summary.closedValue.toLocaleString()}</p>
        </div>

        {/* Conversion Rate */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 opacity-80" />
            <span className="text-xs opacity-80">Conversione</span>
          </div>
          <p className="text-xl font-bold">{data.summary.conversionRate}%</p>
        </div>

        {/* Contact Rate */}
        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Phone className="w-4 h-4 opacity-80" />
            <span className="text-xs opacity-80">Contattati</span>
          </div>
          <p className="text-xl font-bold">{data.summary.contactRate}%</p>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Distribuzione Status
        </h4>
        <div className="space-y-2">
          {Object.entries(data.distribution).map(([status, count]) => {
            const config = STATUS_CONFIG[status]
            if (!config) return null
            const percentage = maxStatusCount > 0 ? (count / maxStatusCount) * 100 : 0
            const Icon = config.icon

            return (
              <div key={status} className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${config.color} flex-shrink-0`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{config.label}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${config.bgColor} rounded-full transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Follow-up Alerts */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={`rounded-lg p-3 border ${
          data.summary.overdueFollowUps > 0
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={`w-4 h-4 ${data.summary.overdueFollowUps > 0 ? 'text-red-500' : 'text-gray-400'}`} />
            <span className="text-xs text-gray-600 dark:text-gray-400">Follow-up Scaduti</span>
          </div>
          <p className={`text-lg font-bold ${data.summary.overdueFollowUps > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
            {data.summary.overdueFollowUps}
          </p>
        </div>

        <div className="rounded-lg p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Prossimi 7 giorni</span>
          </div>
          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {data.summary.upcomingFollowUps}
          </p>
        </div>
      </div>

      {/* Activity Chart */}
      {Object.keys(data.activityByWeek).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Attivita' Settimanale
          </h4>
          <div className="flex items-end gap-1 h-20">
            {Object.entries(data.activityByWeek)
              .sort(([a], [b]) => a.localeCompare(b))
              .slice(-8)
              .map(([week, count]) => {
                const maxActivity = Math.max(...Object.values(data.activityByWeek))
                const height = maxActivity > 0 ? (count / maxActivity) * 100 : 0
                return (
                  <div
                    key={week}
                    className="flex-1 bg-blue-500 dark:bg-blue-400 rounded-t transition-all hover:bg-blue-600"
                    style={{ height: `${Math.max(height, 5)}%` }}
                    title={`${week}: ${count} lead`}
                  />
                )
              })}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>8 sett. fa</span>
            <span>Oggi</span>
          </div>
        </div>
      )}

      {/* Stats Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between text-xs text-gray-500">
        <span>Totale: {data.summary.totalEntries} lead</span>
        <span>Nuovi nel periodo: {data.summary.newInPeriod}</span>
      </div>
    </div>
  )
}
