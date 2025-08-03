'use client'

/*
 * Componente per filtri avanzati nella ricerca lead
 * 
 * Permette agli utenti di applicare filtri tecnici e CRM specifici per trovare
 * lead con caratteristiche precise. Include persistenza in localStorage e reset.
 * 
 * Usato da: dashboard lead, pagina ricerca lead
 * Integrazione: stato filtri globale dashboard
 */

import { useState, useEffect } from 'react'
import { 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw,
  Zap,
  Mail,
  Phone,
  Shield,
  Gauge,
  TrendingUp,
  Eye,
  Calendar,
  AlertTriangle
} from 'lucide-react'

export interface AdvancedFiltersState {
  scoreRange: {
    min: number
    max: number
  }
  hasEmail: boolean
  hasPhone: boolean
  technicalIssues: {
    noGoogleAds: boolean
    noFacebookPixel: boolean
    slowLoading: boolean
    noSSL: boolean
  }
  crmFilters: {
    onlyUncontacted: boolean
    followUpOverdue: boolean
    crmStatus: string // 'all' | 'new' | 'contacted' | 'in_negotiation' | 'won' | 'lost'
  }
}

interface AdvancedFiltersProps {
  isOpen: boolean
  onToggle: () => void
  filters: AdvancedFiltersState
  onFiltersChange: (filters: AdvancedFiltersState) => void
  leadCount: number
}

const DEFAULT_FILTERS: AdvancedFiltersState = {
  scoreRange: { min: 0, max: 100 },
  hasEmail: false,
  hasPhone: false,
  technicalIssues: {
    noGoogleAds: false,
    noFacebookPixel: false,
    slowLoading: false,
    noSSL: false
  },
  crmFilters: {
    onlyUncontacted: false,
    followUpOverdue: false,
    crmStatus: 'all'
  }
}

const CRM_STATUS_OPTIONS = [
  { value: 'all', label: 'Tutti gli stati' },
  { value: 'new', label: 'Nuovo' },
  { value: 'contacted', label: 'Contattato' },
  { value: 'in_negotiation', label: 'In Trattativa' },
  { value: 'won', label: 'Acquisito' },
  { value: 'lost', label: 'Perso' }
]

export default function AdvancedFilters({ 
  isOpen, 
  onToggle, 
  filters, 
  onFiltersChange, 
  leadCount 
}: AdvancedFiltersProps) {
  
  const handleFilterChange = (newFilters: Partial<AdvancedFiltersState>) => {
    const updatedFilters = { ...filters, ...newFilters }
    onFiltersChange(updatedFilters)
    
    // Salva in localStorage
    localStorage.setItem('advancedFilters', JSON.stringify(updatedFilters))
  }

  const handleScoreRangeChange = (type: 'min' | 'max', value: number) => {
    const newRange = { ...filters.scoreRange, [type]: value }
    
    // Assicura che min <= max
    if (type === 'min' && value > filters.scoreRange.max) {
      newRange.max = value
    } else if (type === 'max' && value < filters.scoreRange.min) {
      newRange.min = value
    }
    
    handleFilterChange({ scoreRange: newRange })
  }

  const handleTechnicalIssueChange = (issue: keyof AdvancedFiltersState['technicalIssues'], value: boolean) => {
    handleFilterChange({
      technicalIssues: {
        ...filters.technicalIssues,
        [issue]: value
      }
    })
  }

  const handleCRMFilterChange = (filter: keyof AdvancedFiltersState['crmFilters'], value: boolean | string) => {
    handleFilterChange({
      crmFilters: {
        ...filters.crmFilters,
        [filter]: value
      }
    })
  }

  const handleReset = () => {
    onFiltersChange(DEFAULT_FILTERS)
    localStorage.removeItem('advancedFilters')
  }

  const getActiveFiltersCount = () => {
    let count = 0
    
    // Range punteggio (attivo se non è 0-100)
    if (filters.scoreRange.min > 0 || filters.scoreRange.max < 100) count++
    
    // Filtri booleani semplici
    if (filters.hasEmail) count++
    if (filters.hasPhone) count++
    
    // Problemi tecnici
    Object.values(filters.technicalIssues).forEach(issue => {
      if (issue) count++
    })
    
    // Filtri CRM
    if (filters.crmFilters.onlyUncontacted) count++
    if (filters.crmFilters.followUpOverdue) count++
    if (filters.crmFilters.crmStatus !== 'all') count++
    
    return count
  }

  const activeFiltersCount = getActiveFiltersCount()
  const hasActiveFilters = activeFiltersCount > 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            {hasActiveFilters && (
              <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                {activeFiltersCount}
              </div>
            )}
          </div>
          <span className="font-medium text-gray-900 dark:text-white">
            Filtri Avanzati
          </span>
          {leadCount > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
              {leadCount} lead
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <div
              onClick={(e) => {
                e.stopPropagation()
                handleReset()
              }}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors cursor-pointer"
              title="Reset Filtri"
            >
              <RotateCcw className="h-4 w-4" />
            </div>
          )}
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Contenuto Filtri */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-6 border-t border-gray-100 dark:border-gray-700 pt-4">
          
          {/* Range Punteggio */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
              <TrendingUp className="h-4 w-4" />
              Punteggio Lead
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.scoreRange.min}
                    onChange={(e) => handleScoreRangeChange('min', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    style={{
                      background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${filters.scoreRange.min}%, #E5E7EB ${filters.scoreRange.min}%, #E5E7EB 100%)`
                    }}
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.scoreRange.max}
                    onChange={(e) => handleScoreRangeChange('max', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    style={{
                      background: `linear-gradient(to right, #E5E7EB 0%, #E5E7EB ${filters.scoreRange.max}%, #3B82F6 ${filters.scoreRange.max}%, #3B82F6 100%)`
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Min: {filters.scoreRange.min}</span>
                <span>Max: {filters.scoreRange.max}</span>
              </div>
            </div>
          </div>

          {/* Filtri Contatti */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Informazioni Contatto</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hasEmail}
                  onChange={(e) => handleFilterChange({ hasEmail: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Solo con email</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hasPhone}
                  onChange={(e) => handleFilterChange({ hasPhone: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Solo con telefono</span>
              </label>
            </div>
          </div>

          {/* Problemi Tecnici */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Problemi Tecnici
            </h4>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.technicalIssues.noGoogleAds}
                  onChange={(e) => handleTechnicalIssueChange('noGoogleAds', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Zap className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Senza Google Ads</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.technicalIssues.noFacebookPixel}
                  onChange={(e) => handleTechnicalIssueChange('noFacebookPixel', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Eye className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Senza Facebook Pixel</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.technicalIssues.slowLoading}
                  onChange={(e) => handleTechnicalIssueChange('slowLoading', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Gauge className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Caricamento lento (&gt;3s)</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.technicalIssues.noSSL}
                  onChange={(e) => handleTechnicalIssueChange('noSSL', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Shield className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Senza SSL</span>
              </label>
            </div>
          </div>

          {/* Filtri CRM */}


          {/* Reset Button */}
          {hasActiveFilters && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Tutti i Filtri
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
