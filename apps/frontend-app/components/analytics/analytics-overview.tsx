/**
 * Analytics Overview Component
 * Componente che mostra le metriche principali dell'analytics in card
 * 
 * Utilizzato da: analytics dashboard page
 * Dipende da: analyticsService per il recupero dati
 */

'use client'

import { useEffect, useState } from 'react'
import { analyticsService, AnalyticsOverview as AnalyticsOverviewType } from '@/lib/services/analytics'
import { TrendingUp, TrendingDown, Users, Target, DollarSign, BarChart3 } from 'lucide-react'

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
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
    },
    {
      name: 'Conversioni',
      value: data.totalConversions.toLocaleString(),
      icon: Target,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      name: 'Tasso Conversione',
      value: `${data.conversionRate.toFixed(1)}%`,
      icon: BarChart3,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      name: 'ROI Medio',
      value: `${data.averageROI.toFixed(1)}%`,
      icon: data.averageROI >= 0 ? TrendingUp : TrendingDown,
      color: data.averageROI >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
      bgColor: data.averageROI >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric) => {
        const Icon = metric.icon
        return (
          <div key={metric.name} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                <Icon className={`h-6 w-6 ${metric.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{metric.name}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
