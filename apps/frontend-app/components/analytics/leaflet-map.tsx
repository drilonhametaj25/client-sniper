/**
 * Mappa interattiva dell'Italia con Leaflet
 * Visualizza una heatmap dei lead su una mappa reale dell'Italia
 * 
 * Utilizzato da: GeographicHeatmap component
 * Dipende da: react-leaflet, leaflet
 */

'use client'

import React, { useEffect, useRef } from 'react'

interface MapData {
  city: string
  region: string
  lat: number
  lng: number
  leadCount: number
  conversionCount: number
  score: number
}

interface LeafletMapProps {
  data: MapData[]
  center: [number, number]
  zoom: number
}

export default function LeafletMap({ data, center, zoom }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current) return

    // Import dinamico di Leaflet per evitare problemi SSR
    import('leaflet').then((L) => {
      // Fix per le icone dei marker
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      })

      // Crea la mappa
      const map = L.map(mapRef.current!).setView(center, zoom)

      // Aggiungi layer tile con stile carino
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map)

      // Funzione per ottenere il colore del marker basato sui lead
      const getMarkerColor = (leadCount: number) => {
        if (leadCount >= 50) return '#dc2626' // Rosso intenso
        if (leadCount >= 30) return '#ea580c' // Arancione rosso
        if (leadCount >= 15) return '#f59e0b' // Arancione
        if (leadCount >= 5) return '#eab308' // Giallo
        return '#10b981' // Verde
      }

      // Funzione per ottenere la dimensione del marker
      const getMarkerSize = (leadCount: number) => {
        if (leadCount >= 50) return 20
        if (leadCount >= 30) return 16
        if (leadCount >= 15) return 12
        if (leadCount >= 5) return 8
        return 6
      }

      // Aggiungi marker per ogni città
      data.forEach((item) => {
        if (item.lat && item.lng) {
          const color = getMarkerColor(item.leadCount)
          const size = getMarkerSize(item.leadCount)
          
          // Crea un marker circolare personalizzato
          const circleMarker = L.circleMarker([item.lat, item.lng], {
            radius: size,
            fillColor: color,
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          })

          // Aggiungi popup con informazioni dettagliate
          const popupContent = `
            <div class="p-3 min-w-48">
              <h3 class="font-semibold text-gray-900 mb-1">${item.city}</h3>
              <p class="text-sm text-gray-600 mb-2">${item.region}</p>
              <div class="space-y-1">
                <div class="flex justify-between items-center">
                  <span class="text-xs text-gray-500">Lead trovati:</span>
                  <span class="font-medium text-blue-600">${item.leadCount}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-xs text-gray-500">Conversioni:</span>
                  <span class="font-medium text-green-600">${item.conversionCount}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-xs text-gray-500">Score medio:</span>
                  <span class="font-medium text-orange-600">${item.score.toFixed(1)}</span>
                </div>
              </div>
            </div>
          `

          circleMarker.bindPopup(popupContent, {
            maxWidth: 250,
            className: 'custom-popup'
          })

          // Aggiungi effetto hover
          circleMarker.on('mouseover', function(this: any) {
            this.setStyle({
              weight: 3,
              fillOpacity: 1
            })
          })

          circleMarker.on('mouseout', function(this: any) {
            this.setStyle({
              weight: 2,
              fillOpacity: 0.8
            })
          })

          circleMarker.addTo(map)
        }
      })

      // Aggiungi controllo per la legenda
      const legend = new L.Control({ position: 'bottomright' })
      legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'info legend')
        div.innerHTML = `
          <div class="bg-white p-3 rounded-lg shadow-lg border">
            <h4 class="font-semibold text-sm mb-2">Intensità Lead</h4>
            <div class="space-y-1 text-xs">
              <div class="flex items-center">
                <div class="w-4 h-4 rounded-full mr-2" style="background-color: #dc2626;"></div>
                <span>50+ lead</span>
              </div>
              <div class="flex items-center">
                <div class="w-4 h-4 rounded-full mr-2" style="background-color: #ea580c;"></div>
                <span>30-49 lead</span>
              </div>
              <div class="flex items-center">
                <div class="w-4 h-4 rounded-full mr-2" style="background-color: #f59e0b;"></div>
                <span>15-29 lead</span>
              </div>
              <div class="flex items-center">
                <div class="w-4 h-4 rounded-full mr-2" style="background-color: #eab308;"></div>
                <span>5-14 lead</span>
              </div>
              <div class="flex items-center">
                <div class="w-4 h-4 rounded-full mr-2" style="background-color: #10b981;"></div>
                <span>1-4 lead</span>
              </div>
            </div>
          </div>
        `
        return div
      }
      legend.addTo(map)

      // Salva l'istanza della mappa
      mapInstanceRef.current = map

      // Cleanup
      return () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove()
          mapInstanceRef.current = null
        }
      }
    })
  }, [data, center, zoom])

  // Cleanup quando il componente viene smontato
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full rounded-lg border border-gray-200 bg-gray-50"
      style={{ minHeight: '400px' }}
    />
  )
}
