/**
 * AccountStatusBar - Barra stato proposte utente
 *
 * Mostra le proposte rimanenti in base al piano:
 * - FREE: "1 proposta disponibile questa settimana"
 * - STARTER: "18/25 proposte rimaste questo mese"
 * - AGENCY: "Piano Agency — proposte illimitate"
 *
 * Include:
 * - Progress bar visuale
 * - Data prossimo reset
 * - CTA upgrade se necessario
 */

'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { Zap, TrendingUp, Crown, RefreshCw, ChevronRight } from 'lucide-react'

interface AccountStatusBarProps {
  className?: string
  showUpgradeButton?: boolean
  variant?: 'full' | 'compact' | 'minimal'
}

export default function AccountStatusBar({
  className = '',
  showUpgradeButton = true,
  variant = 'full'
}: AccountStatusBarProps) {
  const { user } = useAuth()

  if (!user) return null

  // Estrai dati dal profilo utente (cast per accedere ai nuovi campi)
  const userAny = user as any
  const plan = userAny.plan || 'free'
  const proposalsRemaining = userAny.proposals_remaining ?? userAny.credits_remaining ?? 0
  const proposalsResetDate = userAny.proposals_reset_date
  const isFirstProposalAvailable = userAny.first_proposal_used === false

  // Configurazione per piano
  const planConfig = getPlanConfig(plan)
  const isUnlimited = planConfig.isUnlimited
  const maxProposals = planConfig.maxProposals
  const resetType = planConfig.resetType

  // Calcola percentuale usata
  const usedPercentage = isUnlimited
    ? 0
    : maxProposals > 0
      ? Math.round(((maxProposals - proposalsRemaining) / maxProposals) * 100)
      : 0

  // Calcola giorni al reset
  const daysToReset = proposalsResetDate
    ? Math.max(0, Math.ceil((new Date(proposalsResetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  // Determina se mostrare warning
  const isLow = !isUnlimited && proposalsRemaining <= 3 && proposalsRemaining > 0
  const isDepleted = !isUnlimited && proposalsRemaining <= 0

  // Versione minimal
  if (variant === 'minimal') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        {isUnlimited ? (
          <span className="text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
            <Crown className="w-4 h-4" />
            Illimitate
          </span>
        ) : (
          <span className={`font-medium ${isDepleted ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-gray-700 dark:text-gray-300'}`}>
            {proposalsRemaining} proposte
          </span>
        )}
      </div>
    )
  }

  // Versione compact
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2">
          <PlanIcon plan={plan} />
          {isUnlimited ? (
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
              Proposte illimitate
            </span>
          ) : (
            <>
              <span className={`text-sm font-medium ${isDepleted ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-gray-700 dark:text-gray-300'}`}>
                {proposalsRemaining}/{maxProposals}
              </span>
              <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${getProgressColor(proposalsRemaining, maxProposals)}`}
                  style={{ width: `${100 - usedPercentage}%` }}
                />
              </div>
            </>
          )}
        </div>

        {showUpgradeButton && !isUnlimited && (
          <Link
            href="/pricing"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Upgrade
          </Link>
        )}
      </div>
    )
  }

  // Versione full (default)
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        {/* Left: Status info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <PlanIcon plan={plan} />
            <span className="font-semibold text-gray-900 dark:text-white">
              {planConfig.label}
            </span>
          </div>

          {/* Messaggio principale */}
          <div className={`text-lg font-medium ${isDepleted ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-gray-900 dark:text-white'}`}>
            {getStatusMessage(proposalsRemaining, maxProposals, isUnlimited, resetType, isFirstProposalAvailable)}
          </div>

          {/* Progress bar per piani limitati */}
          {!isUnlimited && maxProposals > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Usate: {maxProposals - proposalsRemaining}</span>
                <span>Disponibili: {proposalsRemaining}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${getProgressColor(proposalsRemaining, maxProposals)}`}
                  style={{ width: `${100 - usedPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Info reset */}
          {!isUnlimited && daysToReset !== null && (
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" />
              {resetType === 'weekly' ? 'Reset settimanale' : 'Reset mensile'} tra {daysToReset} giorni
            </div>
          )}

          {/* Prima proposta gratuita */}
          {isFirstProposalAvailable && (
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium">
              <Zap className="w-3.5 h-3.5" />
              Prima proposta GRATUITA disponibile!
            </div>
          )}
        </div>

        {/* Right: CTA */}
        {showUpgradeButton && (
          <div className="flex-shrink-0">
            {isDepleted ? (
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                Ottieni più proposte
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : isLow ? (
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-4 py-2 border border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 text-sm font-medium rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
              >
                Upgrade
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : !isUnlimited ? (
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Vedi piani
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

// Helper: Icona piano
function PlanIcon({ plan }: { plan: string }) {
  if (plan.includes('agency')) {
    return <Crown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
  }
  if (plan.includes('starter')) {
    return <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
  }
  return <Zap className="w-5 h-5 text-gray-500 dark:text-gray-400" />
}

// Helper: Configurazione piano
function getPlanConfig(plan: string): {
  label: string
  maxProposals: number
  isUnlimited: boolean
  resetType: 'weekly' | 'monthly' | 'never'
} {
  const configs: Record<string, ReturnType<typeof getPlanConfig>> = {
    free: {
      label: 'Piano Free',
      maxProposals: 1,
      isUnlimited: false,
      resetType: 'weekly'
    },
    starter_monthly: {
      label: 'Piano Starter',
      maxProposals: 25,
      isUnlimited: false,
      resetType: 'monthly'
    },
    starter_annual: {
      label: 'Piano Starter (Annuale)',
      maxProposals: 25,
      isUnlimited: false,
      resetType: 'monthly'
    },
    agency_monthly: {
      label: 'Piano Agency',
      maxProposals: -1,
      isUnlimited: true,
      resetType: 'never'
    },
    agency_annual: {
      label: 'Piano Agency (Annuale)',
      maxProposals: -1,
      isUnlimited: true,
      resetType: 'never'
    }
  }

  return configs[plan] || configs.free
}

// Helper: Messaggio stato
function getStatusMessage(
  remaining: number,
  max: number,
  isUnlimited: boolean,
  resetType: string,
  isFirstProposalAvailable: boolean
): string {
  if (isUnlimited) {
    return 'Proposte illimitate'
  }

  if (isFirstProposalAvailable) {
    return 'Prova la tua prima proposta gratuita!'
  }

  if (remaining <= 0) {
    return resetType === 'weekly'
      ? 'Proposte esaurite — reset domenica'
      : 'Proposte esaurite — upgrade per continuare'
  }

  if (remaining === 1) {
    return resetType === 'weekly'
      ? '1 proposta disponibile questa settimana'
      : '1 proposta rimasta questo mese'
  }

  return resetType === 'weekly'
    ? `${remaining} proposte disponibili questa settimana`
    : `${remaining}/${max} proposte rimaste questo mese`
}

// Helper: Colore progress bar
function getProgressColor(remaining: number, max: number): string {
  const percentage = max > 0 ? (remaining / max) * 100 : 0

  if (percentage <= 0) return 'bg-red-500'
  if (percentage <= 20) return 'bg-orange-500'
  if (percentage <= 50) return 'bg-yellow-500'
  return 'bg-green-500'
}
