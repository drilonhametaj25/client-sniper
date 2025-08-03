/**
 * ROI Calculator Component
 * Componente per calcolare e visualizzare il ritorno sull'investimento
 * 
 * Utilizzato da: analytics dashboard page
 * Dipende da: analyticsService per i dati storici
 */

'use client'

import { useEffect, useState } from 'react'
import { analyticsService } from '@/lib/services/analytics'
import { Calculator, DollarSign, TrendingUp, TrendingDown, Info } from 'lucide-react'

interface ROICalculation {
  investment: number
  revenue: number
  profit: number
  roi: number
  paybackPeriod: number
}

export function ROICalculator() {
  const [investment, setInvestment] = useState<number>(1000)
  const [leads, setLeads] = useState<number>(100)
  const [conversionRate, setConversionRate] = useState<number>(5)
  const [averageOrderValue, setAverageOrderValue] = useState<number>(500)
  const [calculation, setCalculation] = useState<ROICalculation | null>(null)
  const [historicalData, setHistoricalData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchHistoricalData = async () => {
      try {
        // SISTEMATO: Ora usa tutti i dati storici invece che solo 30 giorni
        const data = await analyticsService.getROIData('all')
        setHistoricalData(data)
        
        // Imposta valori predefiniti basati sui dati storici
        if (data.length > 0) {
          const avgInvestment = data.reduce((sum, item) => sum + item.investment, 0) / data.length
          const avgRevenue = data.reduce((sum, item) => sum + item.revenue, 0) / data.length
          if (avgInvestment > 0) setInvestment(Math.round(avgInvestment))
        }
      } catch (error) {
        console.error('Error fetching historical ROI data:', error)
      }
    }

    fetchHistoricalData()
  }, [])

  useEffect(() => {
    const calculateROI = () => {
      const conversions = leads * (conversionRate / 100)
      const revenue = conversions * averageOrderValue
      const profit = revenue - investment
      const roi = investment > 0 ? (profit / investment) * 100 : 0
      const paybackPeriod = profit > 0 ? investment / (profit / 30) : 0 // giorni

      setCalculation({
        investment,
        revenue,
        profit,
        roi,
        paybackPeriod
      })
    }

    calculateROI()
  }, [investment, leads, conversionRate, averageOrderValue])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getROIColor = (roi: number) => {
    if (roi >= 100) return 'text-green-600'
    if (roi >= 50) return 'text-yellow-600'
    if (roi >= 0) return 'text-orange-600'
    return 'text-red-600'
  }

  const getROIBgColor = (roi: number) => {
    if (roi >= 100) return 'bg-green-50'
    if (roi >= 50) return 'bg-yellow-50'
    if (roi >= 0) return 'bg-orange-50'
    return 'bg-red-50'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Calculator className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Calcolatore ROI</h3>
      </div>

      {/* Input Form */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Investimento Totale
          </label>
          <div className="relative">
            <input
              type="number"
              value={investment}
              onChange={(e) => setInvestment(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="10"
            />
            <span className="absolute right-3 top-2 text-gray-500">€</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numero di Lead
          </label>
          <input
            type="number"
            value={leads}
            onChange={(e) => setLeads(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tasso di Conversione
          </label>
          <div className="relative">
            <input
              type="number"
              value={conversionRate}
              onChange={(e) => setConversionRate(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max="100"
              step="0.1"
            />
            <span className="absolute right-3 top-2 text-gray-500">%</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valore Medio Ordine
          </label>
          <div className="relative">
            <input
              type="number"
              value={averageOrderValue}
              onChange={(e) => setAverageOrderValue(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="10"
            />
            <span className="absolute right-3 top-2 text-gray-500">€</span>
          </div>
        </div>
      </div>

      {/* Results */}
      {calculation && (
        <div className="space-y-4">
          <div className="border-t pt-4">
            <h4 className="font-semibold text-gray-800 mb-3">Risultati del Calcolo</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Ricavi Previsti</span>
                </div>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(calculation.revenue)}
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">Profitto</span>
                </div>
                <p className="text-xl font-bold text-purple-600">
                  {formatCurrency(calculation.profit)}
                </p>
              </div>

              <div className={`rounded-lg p-3 ${getROIBgColor(calculation.roi)}`}>
                <div className="flex items-center space-x-2">
                  {calculation.roi >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-current" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-current" />
                  )}
                  <span className="text-sm font-medium text-gray-700">ROI</span>
                </div>
                <p className={`text-xl font-bold ${getROIColor(calculation.roi)}`}>
                  {formatPercentage(calculation.roi)}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Info className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Tempo di Recupero</span>
                </div>
                <p className="text-xl font-bold text-gray-600">
                  {calculation.paybackPeriod > 0 ? `${Math.ceil(calculation.paybackPeriod)} giorni` : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="font-semibold text-gray-800 mb-2">Dettagli Calcolo</h5>
            <div className="space-y-1 text-sm text-gray-600">
              <p>• Conversioni previste: {Math.round(leads * (conversionRate / 100))}</p>
              <p>• Costo per lead: {formatCurrency(investment / leads)}</p>
              <p>• Costo per conversione: {formatCurrency(investment / (leads * (conversionRate / 100)))}</p>
              <p>• Margine di profitto: {formatPercentage((calculation.profit / calculation.revenue) * 100)}</p>
            </div>
          </div>

          {/* ROI Guide */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h5 className="font-semibold text-blue-800 mb-2">Guida alla Valutazione ROI</h5>
            <div className="space-y-1 text-sm text-blue-700">
              <p>• <strong>ROI &gt; 100%:</strong> Ottimo rendimento</p>
              <p>• <strong>ROI 50-100%:</strong> Buon rendimento</p>
              <p>• <strong>ROI 0-50%:</strong> Rendimento accettabile</p>
              <p>• <strong>ROI &lt; 0%:</strong> Investimento in perdita</p>
            </div>
          </div>

          {/* Historical Comparison */}
          {historicalData.length > 0 && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <h5 className="font-semibold text-yellow-800 mb-2">Confronto con Dati Storici</h5>
              <div className="text-sm text-yellow-700">
                <p>ROI medio ultimi 30 giorni: {formatPercentage(
                  historicalData.reduce((sum, item) => sum + item.roi, 0) / historicalData.length
                )}</p>
                <p>Il tuo calcolo è {calculation.roi > (historicalData.reduce((sum, item) => sum + item.roi, 0) / historicalData.length) ? 'superiore' : 'inferiore'} alla media storica</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
