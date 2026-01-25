/**
 * Step 4: Location Preferences
 *
 * Selezione città e regioni preferite per lead locali.
 *
 * @file apps/frontend-app/app/onboarding/components/StepLocation.tsx
 */

'use client'

import { useState } from 'react'
import { OnboardingStep4Data, ITALIAN_REGIONS } from '@/lib/types/onboarding'
import { MapPin, Globe, X, Search, Check } from 'lucide-react'

interface StepLocationProps {
  data: OnboardingStep4Data
  onChange: (data: OnboardingStep4Data) => void
}

// Common Italian cities
const POPULAR_CITIES = [
  'Milano',
  'Roma',
  'Torino',
  'Napoli',
  'Bologna',
  'Firenze',
  'Genova',
  'Venezia',
  'Palermo',
  'Bari',
  'Verona',
  'Padova'
]

export default function StepLocation({ data, onChange }: StepLocationProps) {
  const [citySearch, setCitySearch] = useState('')
  const [showRegions, setShowRegions] = useState(false)

  const toggleRemoteOnly = () => {
    onChange({ ...data, isRemoteOnly: !data.isRemoteOnly })
  }

  const addCity = (city: string) => {
    if (!data.cities.includes(city)) {
      onChange({ ...data, cities: [...data.cities, city] })
    }
    setCitySearch('')
  }

  const removeCity = (city: string) => {
    onChange({ ...data, cities: data.cities.filter((c) => c !== city) })
  }

  const toggleRegion = (region: string) => {
    const newRegions = data.regions.includes(region)
      ? data.regions.filter((r) => r !== region)
      : [...data.regions, region]
    onChange({ ...data, regions: newRegions })
  }

  const handleCityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && citySearch.trim()) {
      e.preventDefault()
      addCity(citySearch.trim())
    }
  }

  // Filter cities based on search
  const filteredCities = POPULAR_CITIES.filter(
    (city) =>
      city.toLowerCase().includes(citySearch.toLowerCase()) &&
      !data.cities.includes(city)
  )

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-gray-600 dark:text-gray-400">
          Indica dove preferisci trovare clienti. Puoi selezionare città specifiche o intere regioni.
        </p>
      </div>

      {/* Remote Only Toggle */}
      <div
        className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
          data.isRemoteOnly
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
        onClick={toggleRemoteOnly}
      >
        <div className="flex items-center gap-3">
          <Globe
            className={`w-6 h-6 ${
              data.isRemoteOnly
                ? 'text-blue-500'
                : 'text-gray-400'
            }`}
          />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              Lavoro solo in remoto
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Non ho preferenze geografiche specifiche
            </p>
          </div>
        </div>
        <div
          className={`w-12 h-6 rounded-full transition-colors ${
            data.isRemoteOnly ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${
              data.isRemoteOnly ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </div>
      </div>

      {/* Location Selection (hidden if remote only) */}
      {!data.isRemoteOnly && (
        <>
          {/* City Search */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MapPin className="w-4 h-4" />
              Città preferite
            </label>

            {/* Selected Cities */}
            {data.cities.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {data.cities.map((city) => (
                  <span
                    key={city}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                  >
                    {city}
                    <button
                      type="button"
                      onClick={() => removeCity(city)}
                      className="hover:text-blue-900 dark:hover:text-blue-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                onKeyDown={handleCityKeyDown}
                placeholder="Cerca o aggiungi città..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* City Suggestions */}
            {(citySearch || filteredCities.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {filteredCities.slice(0, 6).map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => addCity(city)}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    + {city}
                  </button>
                ))}
                {citySearch && !filteredCities.includes(citySearch) && (
                  <button
                    type="button"
                    onClick={() => addCity(citySearch)}
                    className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    + Aggiungi "{citySearch}"
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Region Selection */}
          <div>
            <button
              type="button"
              onClick={() => setShowRegions(!showRegions)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
            >
              <span>Seleziona per regione</span>
              <span className="text-gray-400">{showRegions ? '▲' : '▼'}</span>
              {data.regions.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                  {data.regions.length} selezionate
                </span>
              )}
            </button>

            {showRegions && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1">
                {ITALIAN_REGIONS.map((region) => {
                  const isSelected = data.regions.includes(region.name)
                  return (
                    <button
                      key={region.code}
                      type="button"
                      onClick={() => toggleRegion(region.name)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                        isSelected
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span className="truncate">{region.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Radius Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Raggio di ricerca
              </label>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {data.radiusKm} km
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={200}
              step={10}
              value={data.radiusKm}
              onChange={(e) =>
                onChange({ ...data, radiusKm: parseInt(e.target.value) })
              }
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>10 km</span>
              <span>200 km</span>
            </div>
          </div>
        </>
      )}

      {/* Summary */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {data.isRemoteOnly ? (
            'Vedrai lead da tutta Italia senza filtri geografici.'
          ) : data.cities.length === 0 && data.regions.length === 0 ? (
            'Seleziona almeno una città o regione per filtrare i lead.'
          ) : (
            <>
              Lead da:{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {[...data.cities, ...data.regions].slice(0, 3).join(', ')}
                {data.cities.length + data.regions.length > 3 &&
                  ` e altre ${data.cities.length + data.regions.length - 3}`}
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
