/**
 * Onboarding Prompt Banner
 *
 * Banner che invita l'utente a completare l'onboarding per personalizzare i lead.
 *
 * @file apps/frontend-app/components/dashboard/OnboardingPromptBanner.tsx
 */

'use client'

import { Sparkles, ArrowRight, X } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

interface OnboardingPromptBannerProps {
  onDismiss?: () => void
  compact?: boolean
}

export default function OnboardingPromptBanner({
  onDismiss,
  compact = false
}: OnboardingPromptBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) return null

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              Personalizza i tuoi lead
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Completa il profilo per vedere match migliori
            </p>
          </div>
        </div>
        <Link
          href="/onboarding"
          className="flex items-center gap-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Configura
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-[length:200%_100%] animate-gradient rounded-2xl p-6 sm:p-8 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
      </div>

      {/* Dismiss Button */}
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Content */}
      <div className="relative flex flex-col sm:flex-row items-center gap-6">
        {/* Icon */}
        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-10 h-10 text-white" />
        </div>

        {/* Text */}
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-2xl font-bold mb-2">
            Ricevi lead personalizzati!
          </h2>
          <p className="text-white/80 mb-4 max-w-md">
            Completa il tuo profilo in 2 minuti per vedere solo i lead che corrispondono ai tuoi servizi, budget e zona.
          </p>

          {/* Benefits */}
          <div className="flex flex-wrap gap-3 justify-center sm:justify-start mb-4">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              Match precisi
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              Risparmia tempo
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              Più conversioni
            </span>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/onboarding"
          className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors shadow-lg flex-shrink-0"
        >
          Inizia ora
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  )
}
