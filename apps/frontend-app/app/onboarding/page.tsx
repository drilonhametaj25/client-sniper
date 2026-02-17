/**
 * Pagina Onboarding V2
 *
 * Flow semplificato a 4 step:
 * 1. Benvenuto (value proposition)
 * 2. Specializzazione (cosa offri)
 * 3. Zona (dove lavori)
 * 4. Branding (opzionale - personalizza proposte)
 *
 * @file apps/frontend-app/app/onboarding/page.tsx
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  INITIAL_ONBOARDING_DATA,
  ONBOARDING_STEPS,
  type OnboardingV2Data
} from '@/lib/types/onboarding-v2'

// Step Components (V2)
import StepWelcome from './components/StepWelcome'
import StepSpecialization from './components/StepSpecialization'
import StepLocationSimple from './components/StepLocationSimple'
import StepBranding from './components/StepBranding'

export default function OnboardingPage() {
  const router = useRouter()
  const { user, getAccessToken, refreshProfile } = useAuth()

  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<OnboardingV2Data>(INITIAL_ONBOARDING_DATA)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalSteps = ONBOARDING_STEPS.length

  // Check if onboarding already completed
  useEffect(() => {
    checkOnboardingStatus()
  }, [user])

  /**
   * Verifica se l'onboarding è già completato
   */
  const checkOnboardingStatus = async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/onboarding/v2')

      if (response.ok) {
        const { completed, data } = await response.json()

        // Se già completato, redirect alla dashboard
        if (completed) {
          router.push('/dashboard')
          return
        }

        // Pre-popola con dati esistenti se presenti
        if (data) {
          setFormData(prev => ({
            ...prev,
            ...data
          }))
        }
      }
    } catch (err) {
      console.error('Errore verifica onboarding:', err)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Aggiorna i dati del form
   */
  const handleUpdate = (updates: Partial<OnboardingV2Data>) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }))
    setError(null)
  }

  /**
   * Vai allo step successivo
   */
  const handleNext = async () => {
    setError(null)

    // Se siamo all'ultimo step, salva tutto
    if (currentStep === totalSteps) {
      await completeOnboarding()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  /**
   * Torna allo step precedente
   */
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  /**
   * Salta onboarding (va alla dashboard senza salvare)
   */
  const handleSkip = () => {
    router.push('/dashboard')
  }

  /**
   * Completa onboarding salvando tutti i dati
   */
  const completeOnboarding = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/onboarding/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Errore durante il salvataggio')
      }

      // Refresh profilo utente
      await refreshProfile()

      // Redirect alla dashboard con messaggio di benvenuto
      router.push('/dashboard?welcome=true')
    } catch (err) {
      console.error('Errore completamento onboarding:', err)
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
      setIsSaving(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Caricamento...</p>
        </div>
      </div>
    )
  }

  // Componenti comuni props
  const stepProps = {
    data: formData,
    onUpdate: handleUpdate,
    onNext: handleNext,
    onBack: handleBack,
    onSkip: handleSkip
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Progress bar (solo dopo step 1) */}
      {currentStep > 1 && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 h-1">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          />
        </div>
      )}

      {/* Step indicator (solo dopo step 1) */}
      {currentStep > 1 && (
        <div className="py-4 px-6 flex items-center justify-center gap-2">
          {ONBOARDING_STEPS.slice(1).map((step, idx) => {
            const stepNum = idx + 2
            const isActive = currentStep === stepNum
            const isCompleted = currentStep > stepNum

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                    ${isActive
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    stepNum - 1
                  )}
                </div>

                {idx < ONBOARDING_STEPS.length - 2 && (
                  <div
                    className={`
                      w-12 h-0.5 mx-1
                      ${currentStep > stepNum
                        ? 'bg-green-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                      }
                    `}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center py-8 px-4">
        <div className="w-full max-w-2xl">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
            </div>
          )}

          {/* Step Content */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-10">
            {currentStep === 1 && <StepWelcome {...stepProps} />}
            {currentStep === 2 && <StepSpecialization {...stepProps} />}
            {currentStep === 3 && <StepLocationSimple {...stepProps} />}
            {currentStep === 4 && <StepBranding {...stepProps} />}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Hai bisogno di aiuto?{' '}
        <a
          href="mailto:support@trovami.pro"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Contattaci
        </a>
      </div>
    </div>
  )
}
