'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { CheckCircle, Circle, ChevronRight, X, Gift } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface OnboardingStep {
  id: string
  key: string
  title: string
  description: string
  icon: string
  ctaText: string
  ctaUrl: string
  completedMessage: string
  order: number
  requiresPro?: boolean
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'profile',
    key: 'completedProfile',
    title: 'Completa il tuo profilo',
    description: 'Aggiungi le informazioni della tua agenzia per personalizzare i template',
    icon: '👤',
    ctaText: 'Vai al Profilo',
    ctaUrl: '/settings',
    completedMessage: 'Profilo completato!',
    order: 1
  },
  {
    id: 'first_unlock',
    key: 'completedFirstUnlock',
    title: 'Sblocca il tuo primo lead',
    description: 'Scopri tutte le informazioni di un potenziale cliente',
    icon: '🔓',
    ctaText: 'Vai ai Lead',
    ctaUrl: '/dashboard',
    completedMessage: 'Primo lead sbloccato!',
    order: 2
  },
  {
    id: 'first_contact',
    key: 'completedFirstContact',
    title: 'Contatta il tuo primo lead',
    description: 'Usa i template per inviare il tuo primo messaggio',
    icon: '📧',
    ctaText: 'Vedi Template',
    ctaUrl: '/dashboard',
    completedMessage: 'Primo contatto inviato!',
    order: 3
  },
  {
    id: 'crm_setup',
    key: 'completedCrmSetup',
    title: 'Configura il CRM',
    description: 'Organizza i tuoi lead con il sistema CRM integrato',
    icon: '📊',
    ctaText: 'Vai al CRM',
    ctaUrl: '/crm',
    completedMessage: 'CRM configurato!',
    order: 4,
    requiresPro: true
  },
  {
    id: 'saved_search',
    key: 'completedSavedSearch',
    title: 'Crea un Alert personalizzato',
    description: 'Ricevi notifiche quando arrivano lead che ti interessano',
    icon: '🔔',
    ctaText: 'Crea Alert',
    ctaUrl: '/dashboard?openAlerts=true',
    completedMessage: 'Alert creato!',
    order: 5
  },
  {
    id: 'first_deal',
    key: 'completedFirstDeal',
    title: 'Chiudi il tuo primo deal',
    description: 'Segna un lead come cliente acquisito',
    icon: '🎉',
    ctaText: 'Vai al CRM',
    ctaUrl: '/crm',
    completedMessage: 'Primo cliente acquisito!',
    order: 6,
    requiresPro: true
  }
]

interface OnboardingData {
  steps: Record<string, boolean>
  progress: {
    completedSteps: number
    totalSteps: number
    percentage: number
    nextStep: string | null
  }
  status: {
    isCompleted: boolean
    isSkipped: boolean
  }
}

export default function OnboardingChecklist() {
  const { session, profile } = useAuth()
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    if (session?.access_token) {
      fetchOnboarding()
    }
  }, [session?.access_token])

  useEffect(() => {
    // Check if dismissed in localStorage
    const dismissed = localStorage.getItem('onboarding_dismissed')
    if (dismissed === 'true') {
      setIsDismissed(true)
    }
  }, [])

  const fetchOnboarding = async () => {
    try {
      const res = await fetch('/api/onboarding', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      const data = await res.json()
      if (data.success) {
        setOnboarding(data.data)
      }
    } catch (err) {
      console.error('Error fetching onboarding:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = async () => {
    try {
      await fetch('/api/onboarding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ skip: true })
      })
      setIsDismissed(true)
      localStorage.setItem('onboarding_dismissed', 'true')
    } catch (err) {
      console.error('Error skipping onboarding:', err)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('onboarding_dismissed', 'true')
  }

  // Non mostrare se completato, saltato, dismissed, o in loading
  if (isLoading || isDismissed || !onboarding || onboarding.status.isCompleted || onboarding.status.isSkipped) {
    return null
  }

  const isPro = profile?.subscription_tier && profile.subscription_tier !== 'free'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-blue-100 dark:border-gray-600 shadow-sm overflow-hidden mb-6"
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-blue-100 dark:border-gray-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Inizia con TrovaMi.pro
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {onboarding.progress.completedSteps}/{onboarding.progress.totalSteps} completati
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 hover:bg-blue-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${isMinimized ? '' : 'rotate-90'}`} />
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-blue-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-blue-100 dark:bg-gray-600">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${onboarding.progress.percentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Steps */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="divide-y divide-blue-100 dark:divide-gray-600"
            >
              {ONBOARDING_STEPS.map((step) => {
                const isCompleted = onboarding.steps[step.key]
                const isLocked = step.requiresPro && !isPro
                const isNextStep = onboarding.progress.nextStep === step.key

                return (
                  <div
                    key={step.id}
                    className={`p-4 flex items-center gap-4 ${
                      isCompleted ? 'bg-green-50/50 dark:bg-green-900/10' : ''
                    } ${isLocked ? 'opacity-60' : ''}`}
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      {isCompleted ? (
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isNextStep
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-600'
                        }`}>
                          {isLocked ? '🔒' : step.icon}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-medium ${
                          isCompleted
                            ? 'text-green-700 dark:text-green-400 line-through'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {step.title}
                        </h4>
                        {step.requiresPro && (
                          <span className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                            PRO
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {isCompleted ? step.completedMessage : step.description}
                      </p>
                    </div>

                    {/* Action */}
                    {!isCompleted && !isLocked && (
                      <Link
                        href={step.ctaUrl}
                        className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isNextStep
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500'
                        }`}
                      >
                        {step.ctaText}
                      </Link>
                    )}
                    {isLocked && (
                      <Link
                        href="/upgrade"
                        className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/70 transition-colors"
                      >
                        Upgrade
                      </Link>
                    )}
                  </div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        {!isMinimized && (
          <div className="p-4 bg-blue-50/50 dark:bg-gray-700/50 border-t border-blue-100 dark:border-gray-600">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Salta per ora
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
