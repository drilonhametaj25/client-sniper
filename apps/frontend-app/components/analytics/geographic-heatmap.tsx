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
import { MapPin, Users, Target, Map, List } from 'lucide-react'
import { DynamicMap } from './dynamic-map'

export function GeographicHeatmap() {
  const [data, setData] = useState<GeographicData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')

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

  // Dati per la mappa
  const mapData = data.map(item => ({
    city: item.city,
    region: item.region,
    lat: item.lat,
    lng: item.lng,
    leadCount: item.leadCount,
    conversionCount: item.conversionCount,
    score: item.score,
  }))

  // Centro della mappa sull'Italia
  const mapCenter: [number, number] = [41.9028, 12.4964] // Roma
  const mapZoom = 6

  // Dati per la vista lista
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
        <div>
          <h3 className="text-lg font-semibold">Distribuzione Geografica Lead</h3>
          <p className="text-sm text-gray-600">Mappa interattiva dei lead in Italia</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'map'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Map className="h-4 w-4 inline mr-1" />
            Mappa
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <List className="h-4 w-4 inline mr-1" />
            Lista
          </button>
        </div>
      </div>

      {viewMode === 'map' ? (
        <div className="h-80 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
          <DynamicMap
            data={mapData}
            center={mapCenter}
            zoom={mapZoom}
          />
        </div>
      ) : (
        <div className="h-80 overflow-y-auto space-y-3">
          {topCities.map((city, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
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
      )}
      
      {/* Statistiche rapide */}
      <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <MapPin className="h-4 w-4 text-blue-500" />
              <span className="font-medium">{data.length}</span>
              <span className="text-gray-600">città</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4 text-green-500" />
              <span className="font-medium">{data.reduce((acc, city) => acc + city.leadCount, 0)}</span>
              <span className="text-gray-600">lead totali</span>
            </div>
            <div className="flex items-center space-x-1">
              <Target className="h-4 w-4 text-orange-500" />
              <span className="font-medium">{data.reduce((acc, city) => acc + city.conversionCount, 0)}</span>
              <span className="text-gray-600">conversioni</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {((data.reduce((acc, city) => acc + city.conversionCount, 0) / data.reduce((acc, city) => acc + city.leadCount, 0)) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Tasso conversione</div>
          </div>
        </div>
      </div>
    </div>
  )
}
