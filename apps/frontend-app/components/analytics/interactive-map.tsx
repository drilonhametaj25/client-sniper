/**
 * Interactive Map Component per visualizzazione geografica dei lead
 * Mappa interattiva dell'Italia con marker per le città
 * 
 * Utilizzato da: GeographicHeatmap component
 * Dipende da: nessuna dipendenza esterna
 */

'use client'

import { useState, useMemo } from 'react'
import { MapPin, Users, Target, TrendingUp } from 'lucide-react'

interface MapData {
  city: string
  region: string
  lat: number
  lng: number
  leadCount: number
  conversionCount: number
  score: number
}

interface InteractiveMapProps {
  data: MapData[]
  center: [number, number]
  zoom: number
}

export default function InteractiveMap({ data, center, zoom }: InteractiveMapProps) {
  const [selectedCity, setSelectedCity] = useState<MapData | null>(null)
  const [hoveredCity, setHoveredCity] = useState<MapData | null>(null)
  
  // Bounds dell'Italia per la conversione coordinate
  const italyBounds = {
    north: 47.5,
    south: 35.5,
    east: 19.0,
    west: 6.0,
  }
  
  // Converti coordinate geografiche in coordinate pixel
  const convertToPixel = (lat: number, lng: number) => {
    const x = ((lng - italyBounds.west) / (italyBounds.east - italyBounds.west)) * 100
    const y = ((italyBounds.north - lat) / (italyBounds.north - italyBounds.south)) * 100
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
  }
  
  // Calcola colori e dimensioni per i marker
  const getMarkerColor = (leadCount: number) => {
    if (leadCount >= 50) return '#dc2626' // Rosso per alta densità
    if (leadCount >= 20) return '#ea580c' // Arancione per media densità  
    if (leadCount >= 10) return '#f59e0b' // Giallo per media-bassa densità
    if (leadCount >= 5) return '#10b981' // Verde per bassa densità
    return '#3b82f6' // Blu per minima densità
  }
  
  const getMarkerSize = (leadCount: number) => {
    const baseSize = 12
    const scaleFactor = 1.2
    return Math.min(Math.max(baseSize + (leadCount * scaleFactor), baseSize), 32)
  }
  
  const getMarkerIntensity = (leadCount: number) => {
    return Math.min(0.6 + (leadCount * 0.02), 0.95)
  }
  
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => a.leadCount - b.leadCount) // Piccoli prima per evitare overlap
  }, [data])
  
  const maxLeads = Math.max(...data.map(item => item.leadCount))
  
  return (
    <div className="h-full w-full relative bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg overflow-hidden">
      {/* Mappa di base con SVG dell'Italia */}
      <div className="absolute inset-0">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Sfondo mappa */}
          <defs>
            <pattern id="mapPattern" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.5" fill="#e0e7ff" opacity="0.3"/>
            </pattern>
          </defs>
          
          {/* Contorno stilizzato dell'Italia */}
          <g opacity="0.15">
            <path
              d="M 25 15 L 30 10 L 35 12 L 40 15 L 45 20 L 50 25 L 55 30 L 60 35 L 65 40 L 60 45 L 55 50 L 50 55 L 45 60 L 40 65 L 35 70 L 30 75 L 25 80 L 20 75 L 15 70 L 10 65 L 15 60 L 20 55 L 25 50 L 30 45 L 35 40 L 30 35 L 25 30 L 20 25 L 25 20 Z"
              fill="currentColor"
              className="text-blue-300"
            />
            
            {/* Sicilia */}
            <path
              d="M 35 85 L 45 82 L 50 85 L 45 88 L 35 88 Z"
              fill="currentColor"
              className="text-blue-300"
            />
            
            {/* Sardegna */}
            <path
              d="M 15 75 L 20 72 L 22 78 L 18 82 L 15 78 Z"
              fill="currentColor"
              className="text-blue-300"
            />
          </g>
          
          {/* Pattern decorativo */}
          <rect width="100" height="100" fill="url(#mapPattern)" />
          
          {/* Heatmap background circles per densità */}
          {sortedData.map((item, index) => {
            const { x, y } = convertToPixel(item.lat, item.lng)
            const intensity = getMarkerIntensity(item.leadCount)
            const heatRadius = (item.leadCount / maxLeads) * 8
            
            return (
              <circle
                key={`heat-${index}`}
                cx={x}
                cy={y}
                r={heatRadius}
                fill={getMarkerColor(item.leadCount)}
                opacity={0.1}
                className="pointer-events-none"
              />
            )
          })}
        </svg>
      </div>
      
      {/* Marker delle città */}
      <div className="absolute inset-0">
        {sortedData.map((item, index) => {
          const { x, y } = convertToPixel(item.lat, item.lng)
          const size = getMarkerSize(item.leadCount)
          const color = getMarkerColor(item.leadCount)
          const isHovered = hoveredCity?.city === item.city
          const isSelected = selectedCity?.city === item.city
          
          return (
            <div
              key={`marker-${index}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                zIndex: isHovered || isSelected ? 50 : 10,
              }}
              onMouseEnter={() => setHoveredCity(item)}
              onMouseLeave={() => setHoveredCity(null)}
              onClick={() => setSelectedCity(selectedCity?.city === item.city ? null : item)}
            >
              {/* Marker principale */}
              <div
                className={`rounded-full border-2 border-white shadow-lg transition-all duration-200 ${
                  isHovered || isSelected ? 'scale-125 shadow-xl' : 'hover:scale-110'
                }`}
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: color,
                  boxShadow: isHovered || isSelected 
                    ? `0 8px 25px -5px ${color}40, 0 10px 10px -5px ${color}30`
                    : `0 4px 6px -1px ${color}30`,
                }}
              />
              
              {/* Pulse animation per città con molti lead */}
              {item.leadCount >= 30 && (
                <div
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full animate-ping"
                  style={{
                    width: `${size + 8}px`,
                    height: `${size + 8}px`,
                    backgroundColor: color,
                    opacity: 0.3,
                  }}
                />
              )}
              
              {/* Tooltip al hover */}
              {isHovered && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
                  <div className="bg-white rounded-lg shadow-xl p-4 text-sm min-w-[220px] border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{item.city}</h3>
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-3">{item.region}</p>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-blue-50 px-2 py-1 rounded flex items-center">
                        <Users className="h-3 w-3 text-blue-600 mr-1" />
                        <span className="text-blue-600 font-medium">{item.leadCount}</span>
                      </div>
                      
                      <div className="bg-green-50 px-2 py-1 rounded flex items-center">
                        <Target className="h-3 w-3 text-green-600 mr-1" />
                        <span className="text-green-600 font-medium">{item.conversionCount}</span>
                      </div>
                      
                      <div className="bg-purple-50 px-2 py-1 rounded col-span-2 flex items-center">
                        <TrendingUp className="h-3 w-3 text-purple-600 mr-1" />
                        <span className="text-purple-600 font-medium">{item.score.toFixed(1)}</span>
                        <span className="text-purple-500 ml-1">score</span>
                      </div>
                    </div>
                    
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white"></div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Panel laterale con dettagli */}
      {selectedCity && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-xl p-4 max-w-sm z-40 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">{selectedCity.city}</h3>
              <p className="text-sm text-gray-600">{selectedCity.region}</p>
            </div>
            <button
              onClick={() => setSelectedCity(null)}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center text-blue-600 mb-1">
                <Users className="h-4 w-4 mr-1" />
                <span className="text-xs font-medium">LEAD</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">{selectedCity.leadCount}</div>
            </div>
            
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center text-green-600 mb-1">
                <Target className="h-4 w-4 mr-1" />
                <span className="text-xs font-medium">CONVERSIONI</span>
              </div>
              <div className="text-2xl font-bold text-green-700">{selectedCity.conversionCount}</div>
            </div>
            
            <div className="bg-purple-50 p-3 rounded-lg col-span-2">
              <div className="flex items-center text-purple-600 mb-1">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="text-xs font-medium">SCORE MEDIO</span>
              </div>
              <div className="text-2xl font-bold text-purple-700">{selectedCity.score.toFixed(1)}</div>
            </div>
          </div>
          
          <div className="border-t pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Tasso di conversione</span>
              <span className="font-semibold text-gray-900">
                {selectedCity.leadCount > 0 
                  ? ((selectedCity.conversionCount / selectedCity.leadCount) * 100).toFixed(1) 
                  : 0}%
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Legenda */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-sm p-3 text-xs border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-2">Densità Lead</h4>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span className="text-gray-700">50+ lead</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-600"></div>
            <span className="text-gray-700">20-49 lead</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-700">10-19 lead</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-700">5-9 lead</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-700">1-4 lead</span>
          </div>
        </div>
      </div>
      
      {/* Statistiche generali */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-sm p-3 text-xs border border-gray-200">
        <div className="text-gray-900 font-semibold">{data.length} città monitorate</div>
        <div className="text-gray-600">
          {data.reduce((sum, item) => sum + item.leadCount, 0)} lead totali
        </div>
        <div className="text-gray-600">
          {data.reduce((sum, item) => sum + item.conversionCount, 0)} conversioni
        </div>
      </div>
    </div>
  )
}
