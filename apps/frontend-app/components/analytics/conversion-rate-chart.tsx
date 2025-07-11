/**
 * Conversion Rate Chart Component
 * Componente per visualizzare i tassi di conversione nel tempo
 * 
 * Utilizzato da: analytics dashboard page
 * Dipende da: analyticsService per i dati
 */

'use client'

import { useEffect, useState } from 'react'
import { analyticsService, ConversionData } from '@/lib/services/analytics'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { TrendingUp, TrendingDown, BarChart3, Activity } from 'lucide-react'

export function ConversionRateChart() {
  const [data, setData] = useState<ConversionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const conversionData = await analyticsService.getConversionData(period)
        setData(conversionData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore nel caricamento dei dati di conversione')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [period])

  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">Errore nel caricamento dei dati</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Nessun dato di conversione disponibile</p>
          <p className="text-gray-500 text-sm">I dati di conversione verranno mostrati qui quando disponibili</p>
        </div>
      </div>
    )
  }

  // Calcola statistiche rapide
  const totalLeads = data.reduce((sum, item) => sum + item.leads, 0)
  const totalConversions = data.reduce((sum, item) => sum + item.conversions, 0)
  const averageConversionRate = totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0
  const trend = data.length > 1 ? data[data.length - 1].conversionRate - data[0].conversionRate : 0

  // Trova il valore massimo per la scala
  const maxValue = Math.max(...data.map(item => Math.max(item.leads, item.conversions)))

  return (
    <div className="h-80">
      {/* Header con controlli */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-lg ${trend >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              {trend >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{averageConversionRate.toFixed(1)}%</p>
              <p className="text-xs text-gray-500">Tasso medio</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as '7d' | '30d' | '90d')}
            className="text-sm border border-gray-300 rounded-md px-2 py-1"
          >
            <option value="7d">7 giorni</option>
            <option value="30d">30 giorni</option>
            <option value="90d">90 giorni</option>
          </select>
        </div>
      </div>

      {/* Grafico semplificato con barre */}
      <div className="h-48 mb-4">
        <div className="flex items-end justify-between h-full space-x-1">
          {data.map((item, index) => {
            const leadHeight = maxValue > 0 ? (item.leads / maxValue) * 100 : 0
            const conversionHeight = maxValue > 0 ? (item.conversions / maxValue) * 100 : 0
            const date = new Date(item.date).toLocaleDateString('it-IT', { 
              month: 'short', 
              day: 'numeric' 
            })
            
            return (
              <div 
                key={index} 
                className="flex-1 flex flex-col items-center space-y-1"
                title={`${date}: ${item.leads} lead, ${item.conversions} conversioni, ${item.conversionRate.toFixed(1)}% tasso`}
              >
                <div className="w-full flex justify-center space-x-1">
                  <div 
                    className="w-3 bg-blue-200 rounded-t"
                    style={{ height: `${leadHeight}%` }}
                  />
                  <div 
                    className="w-3 bg-blue-600 rounded-t"
                    style={{ height: `${conversionHeight}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 text-center transform rotate-45 origin-bottom-left">
                  {date}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-center space-x-4 mb-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-200 rounded"></div>
          <span>Lead</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-600 rounded"></div>
          <span>Conversioni</span>
        </div>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <Activity className="h-4 w-4 text-blue-600 mr-1" />
            <span className="font-medium text-gray-900">{totalLeads.toLocaleString()}</span>
          </div>
          <p className="text-gray-500">Lead Totali</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
            <span className="font-medium text-gray-900">{totalConversions.toLocaleString()}</span>
          </div>
          <p className="text-gray-500">Conversioni</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            {trend >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
            )}
            <span className={`font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
            </span>
          </div>
          <p className="text-gray-500">Tendenza</p>
        </div>
      </div>
    </div>
  )
}
