/**
 * Pagina Onboarding
 *
 * Flow di 6 step per configurare preferenze utente:
 * 1. Tipo utente (Freelancer/Agency/Consultant)
 * 2. Servizi offerti + skill level
 * 3. Budget range preferito
 * 4. Location preferences
 * 5. Industry preferences
 * 6. Capacity settimanale
 *
 * @file apps/frontend-app/app/onboarding/page.tsx
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  OnboardingFormData,
  OnboardingStep1Data,
  OnboardingStep2Data,
  OnboardingStep3Data,
  OnboardingStep4Data,
  OnboardingStep5Data,
  OnboardingStep6Data,
  ONBOARDING_STEPS
} from '@/lib/types/onboarding'

// Step Components
import StepUserType from './components/StepUserType'
import StepServices from './components/StepServices'
import StepBudget from './components/StepBudget'
import StepLocation from './components/StepLocation'
import StepIndustries from './components/StepIndustries'
import StepCapacity from './components/StepCapacity'
import OnboardingProgress from './components/OnboardingProgress'

// Default form data
const DEFAULT_FORM_DATA: OnboardingFormData = {
  step1: { userType: 'freelancer' },
  step2: { services: [], skillLevels: {} },
  step3: { budgetMin: 500, budgetMax: 5000 },
  step4: { cities: [], regions: [], isRemoteOnly: false, radiusKm: 50 },
  step5: { preferredIndustries: [], excludedIndustries: [] },
  step6: { weeklyCapacity: 5, projectsInProgress: 0 }
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, getAccessToken, refreshProfile } = useAuth()

  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<OnboardingFormData>(DEFAULT_FORM_DATA)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalSteps = ONBOARDING_STEPS.length

  // Load existing profile data on mount
  useEffect(() => {
    loadExistingProfile()
  }, [user])

  /**
   * Carica profilo esistente se presente
   */
  const loadExistingProfile = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const token = getAccessToken()
      if (!token) return

      const response = await fetch('/api/onboarding/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const { data } = await response.json()

        // Pre-populate form with existing data
        setFormData({
          step1: { userType: data.userType || 'freelancer' },
          step2: {
            services: data.servicesOffered || [],
            skillLevels: data.serviceSkillLevels || {}
          },
          step3: {
            budgetMin: data.preferredMinBudget || 500,
            budgetMax: data.preferredMaxBudget || 5000
          },
          step4: {
            cities: data.preferredCities || [],
            regions: data.preferredRegions || [],
            isRemoteOnly: data.isRemoteOnly || false,
            radiusKm: data.locationRadiusKm || 50
          },
          step5: {
            preferredIndustries: data.preferredIndustries || [],
            excludedIndustries: data.excludedIndustries || []
          },
          step6: {
            weeklyCapacity: data.weeklyCapacity || 5,
            projectsInProgress: data.projectsInProgress || 0
          }
        })

        // Resume from last step if not completed
        if (data.onboardingCurrentStep && !data.onboardingCompletedAt) {
          setCurrentStep(data.onboardingCurrentStep)
        }

        // If already completed, redirect to dashboard
        if (data.onboardingCompletedAt) {
          router.push('/dashboard')
        }
      }
    } catch (err) {
      console.error('Errore caricamento profilo:', err)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Salva step corrente
   */
  const saveCurrentStep = async () => {
    const token = getAccessToken()
    if (!token) return

    setIsSaving(true)
    try {
      // Prepara payload basato su step corrente
      let payload: Record<string, any> = {
        onboardingCurrentStep: currentStep
      }

      switch (currentStep) {
        case 1:
          payload.userType = formData.step1.userType
          break
        case 2:
          payload.servicesOffered = formData.step2.services
          payload.serviceSkillLevels = formData.step2.skillLevels
          break
        case 3:
          payload.preferredMinBudget = formData.step3.budgetMin
          payload.preferredMaxBudget = formData.step3.budgetMax
          break
        case 4:
          payload.preferredCities = formData.step4.cities
          payload.preferredRegions = formData.step4.regions
          payload.isRemoteOnly = formData.step4.isRemoteOnly
          payload.locationRadiusKm = formData.step4.radiusKm
          break
        case 5:
          payload.preferredIndustries = formData.step5.preferredIndustries
          payload.excludedIndustries = formData.step5.excludedIndustries
          break
        case 6:
          payload.weeklyCapacity = formData.step6.weeklyCapacity
          payload.projectsInProgress = formData.step6.projectsInProgress
          break
      }

      await fetch('/api/onboarding/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
    } catch (err) {
      console.error('Errore salvataggio step:', err)
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Vai allo step successivo
   */
  const handleNext = async () => {
    setError(null)

    // Validazione step corrente
    if (!validateCurrentStep()) {
      return
    }

    // Salva step corrente
    await saveCurrentStep()

    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1)
    } else {
      // Completa onboarding
      await completeOnboarding()
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
   * Salta onboarding
   */
  const handleSkip = async () => {
    const token = getAccessToken()
    if (!token) {
      router.push('/dashboard')
      return
    }

    try {
      await fetch('/api/onboarding/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ skipOnboarding: true })
      })
    } catch (err) {
      console.error('Errore skip onboarding:', err)
    }

    router.push('/dashboard')
  }

  /**
   * Completa onboarding
   */
  const completeOnboarding = async () => {
    const token = getAccessToken()
    if (!token) {
      router.push('/dashboard')
      return
    }

    setIsLoading(true)
    try {
      // Salva ultimo step
      await saveCurrentStep()

      // Marca come completato
      await fetch('/api/onboarding/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ completeOnboarding: true })
      })

      // Refresh user profile
      await refreshProfile()

      // Redirect to dashboard
      router.push('/dashboard?onboarding=complete')
    } catch (err) {
      console.error('Errore completamento onboarding:', err)
      setError('Errore nel completamento. Riprova.')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Validazione step corrente
   */
  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 2:
        // Almeno un servizio selezionato
        if (formData.step2.services.length === 0) {
          setError('Seleziona almeno un servizio che offri')
          return false
        }
        break
      case 3:
        // Budget min < max
        if (formData.step3.budgetMin >= formData.step3.budgetMax) {
          setError('Il budget minimo deve essere inferiore al massimo')
          return false
        }
        break
    }
    return true
  }

  /**
   * Aggiorna dati step
   */
  const updateStepData = <K extends keyof OnboardingFormData>(
    step: K,
    data: OnboardingFormData[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      [step]: data
    }))
    setError(null)
  }

  // Loading state
  if (isLoading && currentStep === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Benvenuto in TrovaMi!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configura il tuo profilo per ricevere lead personalizzati
          </p>
        </div>

        {/* Progress */}
        <OnboardingProgress
          currentStep={currentStep}
          totalSteps={totalSteps}
          steps={ONBOARDING_STEPS}
        />

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 mb-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Steps */}
          {currentStep === 1 && (
            <StepUserType
              data={formData.step1}
              onChange={(data) => updateStepData('step1', data)}
            />
          )}

          {currentStep === 2 && (
            <StepServices
              data={formData.step2}
              onChange={(data) => updateStepData('step2', data)}
            />
          )}

          {currentStep === 3 && (
            <StepBudget
              data={formData.step3}
              onChange={(data) => updateStepData('step3', data)}
            />
          )}

          {currentStep === 4 && (
            <StepLocation
              data={formData.step4}
              onChange={(data) => updateStepData('step4', data)}
            />
          )}

          {currentStep === 5 && (
            <StepIndustries
              data={formData.step5}
              onChange={(data) => updateStepData('step5', data)}
            />
          )}

          {currentStep === 6 && (
            <StepCapacity
              data={formData.step6}
              onChange={(data) => updateStepData('step6', data)}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1 || isLoading}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              currentStep === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Indietro
          </button>

          <div className="flex items-center gap-3">
            {/* Skip button (only on optional steps) */}
            {ONBOARDING_STEPS[currentStep - 1]?.isOptional && (
              <button
                onClick={handleSkip}
                disabled={isLoading}
                className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Salta per ora
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={isLoading || isSaving}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading || isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvataggio...
                </>
              ) : currentStep === totalSteps ? (
                'Completa'
              ) : (
                'Avanti'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
