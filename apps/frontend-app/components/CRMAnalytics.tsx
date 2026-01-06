/**
 * Componente Analytics Dashboard per CRM
 * Visualizza metriche, grafici e KPI della pipeline
 */

'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Clock,
  AlertTriangle,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'
import Card from '@/components/ui/Card'

interface AnalyticsData {
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
  avgTimePerStatus: Record<string, number>
  avgScoreByStatus: Record<string, number>
  topCategories: Array<{ name: string; count: number }>
  topCities: Array<{ name: string; count: number }>
}

interface CRMAnalyticsProps {
  data: AnalyticsData | null
  loading?: boolean
}

const STATUS_LABELS: Record<string, string> = {
  to_contact: 'Da Contattare',
  in_negotiation: 'In Trattativa',
  closed_positive: 'Chiuso OK',
  closed_negative: 'Chiuso KO',
  on_hold: 'In Attesa',
  follow_up: 'Follow-up'
}

const STATUS_COLORS: Record<string, string> = {
  to_contact: 'bg-blue-500',
  in_negotiation: 'bg-yellow-500',
  closed_positive: 'bg-green-500',
  closed_negative: 'bg-red-500',
  on_hold: 'bg-gray-500',
  follow_up: 'bg-purple-500'
}

export default function CRMAnalytics({ data, loading }: CRMAnalyticsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          </Card>
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nessun dato disponibile
      </div>
    )
  }

  const { summary, distribution, avgTimePerStatus, topCategories, topCities } = data

  // Calcola totale per percentuali
  const totalDistribution = Object.values(distribution).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Totale Lead */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Lead Totali</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary.totalEntries}
              </p>
              <p className="text-xs text-gray-500">
                +{summary.newInPeriod} nel periodo
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        {/* Conversion Rate */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tasso Conversione</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary.conversionRate}%
              </p>
              <p className="text-xs text-gray-500">
                Contatto: {summary.contactRate}%
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              summary.conversionRate >= 20
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-yellow-100 dark:bg-yellow-900/30'
            }`}>
              {summary.conversionRate >= 20 ? (
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              )}
            </div>
          </div>
        </Card>

        {/* Pipeline Value */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Valore Pipeline</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary.pipelineValue.toLocaleString('it-IT')}
              </p>
              <p className="text-xs text-green-600">
                Chiusi: {summary.closedValue.toLocaleString('it-IT')}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        {/* Follow-up */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Follow-up</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary.upcomingFollowUps}
              </p>
              {summary.overdueFollowUps > 0 && (
                <p className="text-xs text-red-600">
                  {summary.overdueFollowUps} scaduti
                </p>
              )}
            </div>
            <div className={`p-3 rounded-full ${
              summary.overdueFollowUps > 0
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-purple-100 dark:bg-purple-900/30'
            }`}>
              {summary.overdueFollowUps > 0 ? (
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              ) : (
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuzione Stati */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Distribuzione Pipeline
          </h3>
          <div className="space-y-3">
            {Object.entries(distribution).map(([status, count]) => {
              const percentage = totalDistribution > 0
                ? Math.round((count / totalDistribution) * 100)
                : 0

              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">
                      {STATUS_LABELS[status] || status}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`${STATUS_COLORS[status] || 'bg-gray-500'} h-2 rounded-full transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Tempo Medio per Stato */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Tempo Medio per Stato (giorni)
          </h3>
          <div className="space-y-3">
            {Object.entries(avgTimePerStatus).map(([status, days]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {STATUS_LABELS[status] || status}
                </span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {days} {days === 1 ? 'giorno' : 'giorni'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categorie */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Top 5 Categorie
          </h3>
          {topCategories.length > 0 ? (
            <div className="space-y-2">
              {topCategories.map((cat, index) => (
                <div
                  key={cat.name}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500 w-6">
                      #{index + 1}
                    </span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {cat.name}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {cat.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nessuna categoria</p>
          )}
        </Card>

        {/* Top Città */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Top 5 Città
          </h3>
          {topCities.length > 0 ? (
            <div className="space-y-2">
              {topCities.map((city, index) => (
                <div
                  key={city.name}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500 w-6">
                      #{index + 1}
                    </span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {city.name}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {city.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nessuna città</p>
          )}
        </Card>
      </div>
    </div>
  )
}
