/**
 * Analytics Overview Component
 * Componente che mostra le metriche principali dell'analytics in card
 * Include trend indicators con variazione % rispetto al periodo precedente
 *
 * Utilizzato da: analytics dashboard page
 * Dipende da: analyticsService per il recupero dati
 */

'use client'

import { useEffect, useState } from 'react'
import { analyticsService, AnalyticsOverview as AnalyticsOverviewType } from '@/lib/services/analytics'
import { TrendingUp, TrendingDown, Users, Target, DollarSign, BarChart3, ArrowUp, ArrowDown, Minus } from 'lucide-react'

// Componente per il trend indicator
function TrendIndicator({ value, label }: { value: number; label?: string }) {
  if (value === 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Minus className="w-3 h-3" />
        <span>Stabile</span>
      </div>
    )
  }

  const isPositive = value > 0
  return (
    <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
      {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      <span>{isPositive ? '+' : ''}{value.toFixed(1)}%</span>
      {label && <span className="text-gray-400">{label}</span>}
    </div>
  )
}

export function AnalyticsOverview() {
  const [data, setData] = useState<AnalyticsOverviewType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const overview = await analyticsService.getAnalyticsOverview()
        setData(overview)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore nel caricamento dei dati')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-6 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-400">
          {error || 'Errore nel caricamento dei dati di overview'}
        </p>
      </div>
    )
  }

  const metrics = [
    {
      name: 'Lead Totali',
      value: data.totalLeads.toLocaleString(),
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      trend: data.weeklyGrowth || 0,
      trendLabel: 'vs sett. scorsa'
    },
    {
      name: 'Conversioni',
      value: data.totalConversions.toLocaleString(),
      icon: Target,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      trend: 0, // Conversioni non hanno trend calcolato
      trendLabel: ''
    },
    {
      name: 'Tasso Conversione',
      value: `${data.conversionRate.toFixed(1)}%`,
      icon: BarChart3,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      trend: 0,
      trendLabel: ''
    },
    {
      name: 'ROI Medio',
      value: `${data.averageROI.toFixed(1)}%`,
      icon: data.averageROI >= 0 ? TrendingUp : TrendingDown,
      color: data.averageROI >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
      bgColor: data.averageROI >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
      trend: 0,
      trendLabel: ''
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
      {metrics.map((metric) => {
        const Icon = metric.icon
        return (
          <div key={metric.name} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0">
              <div className={`p-2 sm:p-3 rounded-lg ${metric.bgColor} w-fit`}>
                <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${metric.color}`} />
              </div>
              <div className="sm:ml-4 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">{metric.name}</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
                {metric.trend !== 0 && (
                  <TrendIndicator value={metric.trend} label={metric.trendLabel} />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
