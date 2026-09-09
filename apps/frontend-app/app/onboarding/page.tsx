/**
 * Pagina Onboarding
 *
 * Tre schermate, una domanda per schermata:
 * 1. Cosa vendi  → users.services_offered (guida il matching)
 * 2. Dove lavori → operating_city / tutta Italia
 * 3. Riepilogo   → dashboard con il filtro gia' applicato
 *
 * La pagina e' solo la cornice: progresso, errori e passaggio fra gli step.
 * Il contenuto vive in ./components/*.
 *
 * @file apps/frontend-app/app/onboarding/page.tsx
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  INITIAL_ONBOARDING_DATA,
  ONBOARDING_STEPS,
  type OnboardingV2Data
} from '@/lib/types/onboarding-v2'
import { Skeleton } from '@/components/ui'
import { cn } from '@/lib/utils/cn'

// Step Components (3 step: servizi → zona → riepilogo)
import StepServices from './components/StepServices'
import StepLocationSimple from './components/StepLocationSimple'
import StepRecap from './components/StepRecap'

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

      // Redirect alla dashboard: il filtro "Solo per i miei servizi" troverà
      // subito i lead compatibili con i servizi appena configurati
      router.push('/dashboard?onboarded=1')
    } catch (err) {
      console.error('Errore completamento onboarding:', err)
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
      setIsSaving(false)
    }
  }

  // Attesa: lo scheletro ha la forma del primo step, cosi' la pagina non salta
  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="flex items-center gap-3">
          <div className="flex flex-1 gap-1.5">
            <Skeleton className="h-1 flex-1" />
            <Skeleton className="h-1 flex-1" />
            <Skeleton className="h-1 flex-1" />
          </div>
        </div>

        <div className="mt-10 space-y-3" role="status" aria-live="polite">
          <span className="sr-only">Caricamento in corso</span>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[86px] rounded-card" />
          ))}
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

  const currentStepTitle = ONBOARDING_STEPS[currentStep - 1]?.title ?? ''

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      {/* Progresso: presente ma silenzioso */}
      <div className="flex items-center gap-4">
        <div className="flex flex-1 gap-1.5" aria-hidden="true">
          {ONBOARDING_STEPS.map((step, idx) => (
            <span
              key={step.id}
              className={cn(
                'h-1 flex-1 rounded-pill transition-colors duration-base ease-soft',
                currentStep >= idx + 1 ? 'bg-accent' : 'bg-edge'
              )}
            />
          ))}
        </div>
        <span className="shrink-0 text-micro tabular-nums text-content-subtle">
          Passo {currentStep} di {totalSteps}
        </span>
      </div>

      <p className="sr-only" aria-live="polite">
        Passo {currentStep} di {totalSteps}: {currentStepTitle}
      </p>

      {/* Errore di salvataggio */}
      {error && (
        <div
          role="alert"
          className="mt-8 flex items-start gap-2.5 rounded-card border border-danger-edge bg-danger-soft p-4"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          <p className="text-body text-danger">{error}</p>
        </div>
      )}

      {/* Una domanda per schermata */}
      <div className="mt-10">
        {currentStep === 1 && <StepServices {...stepProps} />}
        {currentStep === 2 && <StepLocationSimple {...stepProps} />}
        {currentStep === 3 && <StepRecap {...stepProps} isSaving={isSaving} />}
      </div>

      <p className="mt-12 text-center text-caption text-content-subtle">
        Hai bisogno di aiuto?{' '}
        <a
          href="mailto:support@trovami.pro"
          className="focus-ring rounded-sm text-accent-ink hover:underline"
        >
          Scrivici
        </a>
      </p>
    </div>
  )
}
