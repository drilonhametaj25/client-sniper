/**
 * Context Provider per il sistema di User Onboarding Tour
 * Gestisce stato globale dei tour, avvio automatico e controllo utente
 * Integrato con react-joyride per tour guidati eleganti
 */

'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { STATUS, EVENTS, ACTIONS, CallBackProps, Step } from 'react-joyride'
import JoyrideWrapper from '@/components/JoyrideWrapper'
import { TourSection, OnboardingContextType } from '@/../../libs/types/onboarding'
import { useTourProgress } from '@/hooks/useTourProgress'
import { tourConfigurations, getTourConfig, isTourAvailable } from '@/lib/onboarding/tourConfigurations'
import { useAuth } from '@/contexts/AuthContext'
import { usePathname } from 'next/navigation'

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

interface OnboardingProviderProps {
  children: React.ReactNode
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const { user } = useAuth()
  const pathname = usePathname()
  const {
    getTourProgress,
    isTourCompleted,
    isTourSkipped,
    markTourCompleted,
    markTourSkipped,
    updateTourProgress,
    resetTourProgress,
    resetAllTours: resetAllToursProgress
  } = useTourProgress()

  // Stati tour
  const [isRunning, setIsRunning] = useState(false)
  const [currentTour, setCurrentTour] = useState<TourSection | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [autoToursEnabled, setAutoToursEnabled] = useState(true)
  
  // Ref per evitare avvio automatico multiplo
  const autoTourTriggered = useRef<Set<TourSection>>(new Set())
  const tourJustCompleted = useRef(false)

  // Ottieni configurazione tour corrente
  const getCurrentTourConfig = useCallback(() => {
    return currentTour ? getTourConfig(currentTour) : null
  }, [currentTour])

  // Ottieni step correnti
  const getCurrentSteps = useCallback((): Step[] => {
    const config = getCurrentTourConfig()
    if (!config) return []
    
    return config.steps.map(step => ({
      target: step.target,
      content: step.content,
      placement: step.placement,
      disableBeacon: step.disableBeacon,
      styles: {
        options: {
          primaryColor: '#3b82f6', // Blue-500
          textColor: '#374151', // Gray-700
          backgroundColor: '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.4)',
          arrowColor: '#ffffff',
          width: 380,
          zIndex: 10000,
        },
        spotlight: {
          borderRadius: '8px',
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipTitle: {
          fontSize: '18px',
          fontWeight: '600',
          marginBottom: '8px',
          color: '#111827',
        },
        tooltipContent: {
          fontSize: '14px',
          lineHeight: '1.5',
          color: '#4b5563',
        },
        buttonNext: {
          backgroundColor: '#3b82f6',
          borderRadius: '8px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: '500',
        },
        buttonBack: {
          backgroundColor: 'transparent',
          color: '#6b7280',
          borderRadius: '8px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: '500',
        },
        buttonSkip: {
          backgroundColor: 'transparent',
          color: '#ef4444',
          borderRadius: '8px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: '500',
        },
      },
      locale: {
        back: 'Indietro',
        close: 'Chiudi',
        last: 'Finito',
        next: 'Avanti',
        skip: 'Salta tour',
      }
    }))
  }, [getCurrentTourConfig])

  // Avvia tour
  const startTour = useCallback((section: TourSection) => {
    const config = getTourConfig(section)
    
    if (!config || !isTourAvailable(config, user)) {
      console.warn(`Tour ${section} non disponibile per questo utente`)
      return
    }

    // Controlla se già completato o saltato
    if (isTourCompleted(section) || isTourSkipped(section)) {
      console.log(`Tour ${section} già completato o saltato`)
      return
    }

    console.log(`🎯 Avvio tour: ${section}`)
    setCurrentTour(section)
    setCurrentStepIndex(0)
    setIsRunning(true)
    tourJustCompleted.current = false
  }, [user, isTourCompleted, isTourSkipped])

  // Ferma tour
  const stopTour = useCallback(() => {
    console.log('🛑 Tour fermato')
    setIsRunning(false)
    setCurrentTour(null)
    setCurrentStepIndex(0)
  }, [])

  // Salta tour
  const skipTour = useCallback(() => {
    if (currentTour) {
      console.log(`⏭️ Tour saltato: ${currentTour}`)
      markTourSkipped(currentTour)
      tourJustCompleted.current = true
    }
    stopTour()
  }, [currentTour, markTourSkipped, stopTour])

  // Reset tour
  const resetTour = useCallback((section: TourSection) => {
    console.log(`🔄 Reset tour: ${section}`)
    resetTourProgress(section)
    autoTourTriggered.current.delete(section)
  }, [resetTourProgress])

  // Step successivo
  const nextStep = useCallback(() => {
    const config = getCurrentTourConfig()
    if (!config) return

    const nextIndex = currentStepIndex + 1
    if (nextIndex < config.steps.length) {
      setCurrentStepIndex(nextIndex)
      if (currentTour) {
        updateTourProgress(currentTour, nextIndex)
      }
    } else {
      // Tour completato
      if (currentTour) {
        console.log(`✅ Tour completato: ${currentTour}`)
        markTourCompleted(currentTour, config.steps.length - 1)
        tourJustCompleted.current = true
      }
      stopTour()
    }
  }, [currentStepIndex, currentTour, getCurrentTourConfig, updateTourProgress, markTourCompleted, stopTour])

  // Step precedente
  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1
      setCurrentStepIndex(prevIndex)
      if (currentTour) {
        updateTourProgress(currentTour, prevIndex)
      }
    }
  }, [currentStepIndex, currentTour, updateTourProgress])

  // Reset tutti i tour
  const resetAllTours = useCallback(() => {
    console.log('🔄 Reset tutti i tour')
    resetAllToursProgress()
    autoTourTriggered.current.clear()
    stopTour()
  }, [resetAllToursProgress, stopTour])

  // Abilita/disabilita tour automatici
  const enableAutoTours = useCallback((enabled: boolean) => {
    setAutoToursEnabled(enabled)
    try {
      localStorage.setItem('autoToursEnabled', enabled.toString())
    } catch (error) {
      console.warn('Errore salvataggio preferenza auto tour:', error)
    }
  }, [])

  // Carica preferenze auto tour
  useEffect(() => {
    try {
      const saved = localStorage.getItem('autoToursEnabled')
      if (saved !== null) {
        setAutoToursEnabled(saved === 'true')
      }
    } catch (error) {
      console.warn('Errore caricamento preferenze auto tour:', error)
    }
  }, [])

  // Auto-trigger tour basato su pathname
  useEffect(() => {
    if (!user || !autoToursEnabled || tourJustCompleted.current) return

    // Mappa pathname -> tour section
    const pathToSection: Record<string, TourSection> = {
      '/dashboard': 'dashboard',
      '/lead/': 'lead-detail', // prefix match
      '/crm': 'crm',
      '/tools/manual-scan': 'manual-scan',
      '/admin/dashboard': 'admin',
    }

    let targetSection: TourSection | null = null

    // Trova sezione corrispondente
    for (const [path, section] of Object.entries(pathToSection)) {
      if (pathname === path || (path.endsWith('/') && pathname.startsWith(path))) {
        targetSection = section
        break
      }
    }

    if (!targetSection) return

    // Evita trigger multipli per la stessa sezione
    if (autoTourTriggered.current.has(targetSection)) return

    // Controlla se tour è disponibile e non completato
    const config = getTourConfig(targetSection)
    if (!config || !config.autoTrigger || !isTourAvailable(config, user)) return

    if (isTourCompleted(targetSection) || isTourSkipped(targetSection)) return

    // Ritardo per assicurarsi che la pagina sia renderizzata
    const timer = setTimeout(() => {
      console.log(`🚀 Auto-avvio tour: ${targetSection}`)
      autoTourTriggered.current.add(targetSection)
      startTour(targetSection)
    }, 1500) // 1.5s delay

    return () => clearTimeout(timer)
  }, [pathname, user, autoToursEnabled, isTourCompleted, isTourSkipped, startTour])

  // Reset flag completion quando cambia pagina
  useEffect(() => {
    tourJustCompleted.current = false
  }, [pathname])

  // Callback joyride
  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, action, index, type, step } = data

    console.log('🎯 Joyride callback:', { status, action, index, type, target: step?.target })

    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        nextStep()
      } else if (action === ACTIONS.PREV) {
        previousStep()
      }
    } else if (type === EVENTS.TARGET_NOT_FOUND) {
      console.warn(`❌ Tour target non trovato per step ${index}:`, step.target)
      console.warn('Step details:', step)
      
      // Prova selettori alternativi se disponibili
      const config = getCurrentTourConfig()
      if (config && config.steps[index]) {
        const currentStep = config.steps[index]
        console.log('Tentativo con selettori alternativi per step:', currentStep.id)
      }
      
      // Continua al prossimo step dopo un breve delay
      setTimeout(() => {
        nextStep()
      }, 1000)
    } else if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      if (status === STATUS.SKIPPED) {
        skipTour()
      } else {
        if (currentTour) {
          markTourCompleted(currentTour, index)
          tourJustCompleted.current = true
        }
        stopTour()
      }
    }
  }, [nextStep, previousStep, skipTour, currentTour, markTourCompleted, stopTour, getCurrentTourConfig])

  // Context value
  const contextValue: OnboardingContextType = {
    isRunning,
    currentTour,
    currentStepIndex,
    startTour,
    stopTour,
    resetTour,
    skipTour,
    nextStep,
    previousStep,
    getTourProgress,
    isTourCompleted,
    getTourConfiguration: getTourConfig,
    resetAllTours,
    enableAutoTours,
  }

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
      
      {/* Joyride Component */}
      {isRunning && (
        <JoyrideWrapper
          steps={getCurrentSteps()}
          run={isRunning}
          stepIndex={currentStepIndex}
          callback={handleJoyrideCallback}
          continuous={true}
          showProgress={true}
          showSkipButton={true}
          scrollToFirstStep={true}
          scrollOffset={100}
          disableOverlayClose={false}
          disableCloseOnEsc={false}
          hideCloseButton={false}
          spotlightClicks={false}
          styles={{
            options: {
              primaryColor: '#3b82f6',
              textColor: '#374151',
              backgroundColor: '#ffffff',
              overlayColor: 'rgba(0, 0, 0, 0.4)',
              arrowColor: '#ffffff',
              width: 380,
              zIndex: 10000,
            }
          }}
        />
      )}
    </OnboardingContext.Provider>
  )
}

// Hook per usare il context
export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding deve essere usato dentro OnboardingProvider')
  }
  return context
}

export default OnboardingProvider
