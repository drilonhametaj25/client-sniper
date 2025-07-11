/**
 * Geographic Heatmap Component
 * Componente per la visualizzazione geografica dei lead con mappa interattiva
 * 
 * Utilizzato da: analytics dashboard page
 * Dipende da: react-leaflet per la mappa, analyticsService per i dati
 */

'use client'

import { useEffect, useState } from 'react'
import { analyticsService, GeographicData } from '@/lib/services/analytics'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { MapPin, Users, Target } from 'lucide-react'

// Componente semplificato senza mappe per ora
export function GeographicHeatmap() {
  const [data, setData] = useState<GeographicData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const geoData = await analyticsService.getGeographicData()
        setData(geoData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore nel caricamento dei dati geografici')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">Errore nel caricamento dei dati geografici</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Nessun dato geografico disponibile</p>
          <p className="text-gray-500 text-sm">I dati di geolocalizzazione verranno mostrati qui quando disponibili</p>
        </div>
      </div>
    )
  }

  // Raggruppa i dati per regione
  const sortedData = [...data].sort((a, b) => b.leadCount - a.leadCount)
  const topCities = sortedData.slice(0, 10)

  const getIntensityColor = (leadCount: number, maxLeads: number) => {
    const intensity = leadCount / maxLeads
    if (intensity >= 0.8) return 'bg-red-500'
    if (intensity >= 0.6) return 'bg-orange-500'
    if (intensity >= 0.4) return 'bg-yellow-500'
    if (intensity >= 0.2) return 'bg-green-500'
    return 'bg-blue-500'
  }

  const maxLeads = Math.max(...data.map(item => item.leadCount))

  return (
    <div className="h-96 overflow-hidden">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Distribuzione per Città</h3>
        <div className="text-sm text-gray-500">
          Top {topCities.length} città per numero di lead
        </div>
      </div>
      
      <div className="h-80 overflow-y-auto space-y-3">
        {topCities.map((city, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div 
                  className={`w-3 h-3 rounded-full ${getIntensityColor(city.leadCount, maxLeads)}`}
                />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{city.city}</h4>
                <p className="text-sm text-gray-600">{city.region}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{city.leadCount}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Target className="h-4 w-4 text-green-500" />
                <span className="font-medium">{city.conversionCount}</span>
              </div>
              <div className="text-right">
                <div className="font-medium">{city.score.toFixed(1)}</div>
                <div className="text-xs text-gray-500">Score</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Legenda */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold mb-2">Intensità Lead</h4>
        <div className="flex space-x-4 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
            <span>Molto alta</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-orange-500 mr-1"></div>
            <span>Alta</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
            <span>Media</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
            <span>Bassa</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
            <span>Molto bassa</span>
          </div>
        </div>
      </div>
    </div>
  )
}
