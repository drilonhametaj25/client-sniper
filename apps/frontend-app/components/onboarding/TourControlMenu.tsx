/**
 * Componente menu per controllo tour di onboarding
 * Permette di riavviare tour, resettare progresso e gestire impostazioni
 * Accessibile dal menu utente nella navbar
 */

'use client'

import React, { useState } from 'react'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useAuth } from '@/contexts/AuthContext'
import { TourSection } from '@/../../libs/types/onboarding'
import { isProOrHigher } from '@/lib/utils/plan-helpers'
import { 
  GraduationCap, 
  RotateCcw, 
  Play, 
  Settings, 
  CheckCircle, 
  XCircle,
  ChevronDown,
  Info
} from 'lucide-react'

interface TourControlMenuProps {
  onClose?: () => void
}

const TourControlMenu: React.FC<TourControlMenuProps> = ({ onClose }) => {
  const { user } = useAuth()
  const {
    isTourCompleted,
    startTour,
    resetTour,
    resetAllTours,
    enableAutoTours,
    currentTour,
    isRunning
  } = useOnboarding()
  
  const [showSettings, setShowSettings] = useState(false)
  const [autoEnabled, setAutoEnabled] = useState(true)

  // Sezioni disponibili per l'utente
  const availableSections: { section: TourSection; label: string; description: string; isPro?: boolean }[] = [
    {
      section: 'dashboard',
      label: '🏠 Dashboard',
      description: 'Panoramica generale e navigazione principale'
    },
    {
      section: 'lead-detail',
      label: '🔍 Dettaglio Lead',
      description: 'Analisi tecnica completa e informazioni contatto'
    },
    {
      section: 'manual-scan',
      label: '⚡ Analisi Manuale',
      description: 'Come analizzare siti web in tempo reale'
    },
    {
      section: 'crm',
      label: '📊 CRM Personale',
      description: 'Gestione lead e trattative (solo PRO)',
      isPro: true
    }
  ]

  const handleStartTour = (section: TourSection) => {
    startTour(section)
    onClose?.()
  }

  const handleResetTour = (section: TourSection) => {
    resetTour(section)
  }

  const handleResetAll = () => {
    resetAllTours()
  }

  const handleAutoToggle = (enabled: boolean) => {
    setAutoEnabled(enabled)
    enableAutoTours(enabled)
  }

  // Filtra sezioni in base al piano utente
  const userSections = availableSections.filter(item => 
    !item.isPro || (user?.plan && isProOrHigher(user.plan))
  )

  return (
    <div className="w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Tutorial Guidati</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Rivedi le funzionalità principali
        </p>
      </div>

      {/* Tour in corso */}
      {isRunning && currentTour && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Tour attivo: {userSections.find(s => s.section === currentTour)?.label}
            </span>
          </div>
        </div>
      )}

      <div className="max-h-96 overflow-y-auto">
        {/* Lista tour */}
        <div className="p-4 space-y-3">
          {userSections.map((item) => {
            const isCompleted = isTourCompleted(item.section)
            
            return (
              <div
                key={item.section}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.label}
                    </span>
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {item.description}
                  </p>
                </div>
                
                <div className="flex items-center space-x-1 ml-2">
                  <button
                    onClick={() => handleStartTour(item.section)}
                    className="p-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition-colors"
                    title="Avvia tour"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                  
                  {isCompleted && (
                    <button
                      onClick={() => handleResetTour(item.section)}
                      className="p-1.5 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                      title="Reset tour"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Impostazioni */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Impostazioni
              </span>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
          </button>
          
          {showSettings && (
            <div className="px-4 pb-4 space-y-3">
              {/* Auto tour toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Tour automatici</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Avvia automaticamente i tour</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoEnabled}
                    onChange={(e) => handleAutoToggle(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              {/* Reset all button */}
              <button
                onClick={handleResetAll}
                className="w-full flex items-center justify-center space-x-2 p-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset tutti i tour</span>
              </button>
            </div>
          )}
        </div>

        {/* Info footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                I tour ti aiutano a scoprire tutte le funzionalità della piattaforma. 
                Puoi riattivarli in qualsiasi momento.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TourControlMenu
