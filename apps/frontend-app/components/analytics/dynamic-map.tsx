/**
 * Dynamic Map Wrapper
 * Wrapper per importare dinamicamente la mappa interattiva ed evitare problemi SSR
 * 
 * Utilizzato da: GeographicHeatmap component
 * Dipende da: interactive-map component
 */

'use client'

import dynamic from 'next/dynamic'
import LoadingSpinner from '@/components/ui/loading-spinner'

// Import dinamico per evitare problemi SSR
const DynamicMapComponent = dynamic(
  () => import('./leaflet-map'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-2 text-gray-600 text-sm">Caricamento mappa dell'Italia...</p>
        </div>
      </div>
    )
  }
)

interface MapData {
  city: string
  region: string
  lat: number
  lng: number
  leadCount: number
  conversionCount: number
  score: number
}

interface DynamicMapProps {
  data: MapData[]
  center: [number, number]
  zoom: number
}

export function DynamicMap({ data, center, zoom }: DynamicMapProps) {
  return (
    <div className="h-full w-full">
      <DynamicMapComponent
        data={data}
        center={center}
        zoom={zoom}
      />
    </div>
  )
}
