'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { X, Zap, TrendingUp, Users, Bell, Star, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

type PromptTrigger =
  | 'credits_low'
  | 'lead_limit'
  | 'feature_locked'
  | 'usage_milestone'
  | 'time_based'
  | 'competitor_activity'

interface UpgradePromptProps {
  trigger: PromptTrigger
  context?: {
    creditsRemaining?: number
    featureName?: string
    leadsUnlocked?: number
    competitorCount?: number
  }
  onDismiss?: () => void
  variant?: 'inline' | 'modal' | 'banner'
}

const PROMPT_CONFIGS: Record<PromptTrigger, {
  icon: React.ReactNode
  title: string
  description: string
  ctaText: string
  color: string
  urgency: 'low' | 'medium' | 'high'
}> = {
  credits_low: {
    icon: <Zap className="w-5 h-5" />,
    title: 'Crediti in esaurimento',
    description: 'Non perdere l\'accesso ai migliori lead. Passa a Pro per crediti illimitati.',
    ctaText: 'Ottieni crediti illimitati',
    color: 'amber',
    urgency: 'high'
  },
  lead_limit: {
    icon: <Users className="w-5 h-5" />,
    title: 'Hai raggiunto il limite',
    description: 'Sblocca più lead ogni mese per far crescere il tuo business.',
    ctaText: 'Sblocca più lead',
    color: 'blue',
    urgency: 'medium'
  },
  feature_locked: {
    icon: <Star className="w-5 h-5" />,
    title: 'Funzionalità Premium',
    description: 'Questa funzionalità è disponibile con il piano Pro.',
    ctaText: 'Passa a Pro',
    color: 'purple',
    urgency: 'low'
  },
  usage_milestone: {
    icon: <TrendingUp className="w-5 h-5" />,
    title: 'Stai usando TrovaMi.pro come un pro!',
    description: 'Hai sbloccato molti lead. Passa a Pro per sbloccare il tuo pieno potenziale.',
    ctaText: 'Diventa Pro',
    color: 'green',
    urgency: 'medium'
  },
  time_based: {
    icon: <Bell className="w-5 h-5" />,
    title: 'Offerta speciale',
    description: 'Passa a Pro oggi e risparmia il 20% sul primo mese.',
    ctaText: 'Approfitta dell\'offerta',
    color: 'indigo',
    urgency: 'medium'
  },
  competitor_activity: {
    icon: <Users className="w-5 h-5" />,
    title: 'I tuoi competitor si stanno muovendo',
    description: 'Altri utenti stanno sbloccando lead nella tua zona. Non restare indietro.',
    ctaText: 'Resta competitivo',
    color: 'red',
    urgency: 'high'
  }
}

export default function UpgradePrompt({
  trigger,
  context,
  onDismiss,
  variant = 'inline'
}: UpgradePromptProps) {
  const { user } = useAuth()
  const [isDismissed, setIsDismissed] = useState(false)

  // Check se già dismissato oggi - DEVE essere prima di qualsiasi return condizionale
  useEffect(() => {
    const dismissKey = `upgrade_prompt_${trigger}_dismissed`
    const dismissed = localStorage.getItem(dismissKey)
    if (dismissed) {
      const dismissedDate = new Date(dismissed)
      const now = new Date()
      // Re-show dopo 24 ore
      if (now.getTime() - dismissedDate.getTime() < 24 * 60 * 60 * 1000) {
        setIsDismissed(true)
      }
    }
  }, [trigger])

  const handleDismiss = () => {
    const dismissKey = `upgrade_prompt_${trigger}_dismissed`
    localStorage.setItem(dismissKey, new Date().toISOString())
    setIsDismissed(true)
    onDismiss?.()
  }

  // Non mostrare per utenti già premium
  const isPro = user?.plan && !['free'].includes(user.plan)
  if (isPro) return null

  if (isDismissed) return null

  const config = PROMPT_CONFIGS[trigger]

  // Personalizza messaggio basato sul contesto
  let description = config.description
  if (trigger === 'credits_low' && context?.creditsRemaining !== undefined) {
    description = `Ti rimangono solo ${context.creditsRemaining} crediti. Passa a Pro per crediti illimitati.`
  }
  if (trigger === 'feature_locked' && context?.featureName) {
    description = `La funzionalità "${context.featureName}" è disponibile con il piano Pro.`
  }
  if (trigger === 'usage_milestone' && context?.leadsUnlocked) {
    description = `Hai sbloccato ${context.leadsUnlocked} lead! Passa a Pro per sbloccare il tuo pieno potenziale.`
  }
  if (trigger === 'competitor_activity' && context?.competitorCount) {
    description = `${context.competitorCount} utenti stanno sbloccando lead nella tua zona. Non restare indietro.`
  }

  const colorClasses = {
    amber: {
      bg: 'from-amber-500 to-orange-500',
      bgLight: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300'
    },
    blue: {
      bg: 'from-blue-500 to-indigo-500',
      bgLight: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300'
    },
    purple: {
      bg: 'from-purple-500 to-pink-500',
      bgLight: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800',
      text: 'text-purple-700 dark:text-purple-300'
    },
    green: {
      bg: 'from-green-500 to-emerald-500',
      bgLight: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-700 dark:text-green-300'
    },
    indigo: {
      bg: 'from-indigo-500 to-blue-500',
      bgLight: 'bg-indigo-50 dark:bg-indigo-900/20',
      border: 'border-indigo-200 dark:border-indigo-800',
      text: 'text-indigo-700 dark:text-indigo-300'
    },
    red: {
      bg: 'from-red-500 to-orange-500',
      bgLight: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-300'
    }
  }

  const colors = colorClasses[config.color as keyof typeof colorClasses]

  if (variant === 'banner') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`relative bg-gradient-to-r ${colors.bg} text-white py-3 px-4`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {config.icon}
              <span className="font-medium">{config.title}</span>
              <span className="hidden sm:inline text-white/80">—</span>
              <span className="hidden sm:inline text-white/80">{description}</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/upgrade"
                className="flex items-center gap-2 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
              >
                {config.ctaText}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  if (variant === 'modal') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
          >
            <div className={`bg-gradient-to-r ${colors.bg} p-6 text-white text-center`}>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                {config.icon}
              </div>
              <h3 className="text-xl font-bold mb-2">{config.title}</h3>
              <p className="text-white/80">{description}</p>
            </div>
            <div className="p-6">
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span>Crediti illimitati ogni mese</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <Star className="w-5 h-5 text-purple-500" />
                  <span>Accesso a tutte le funzionalità</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <span>Lead scoring avanzato</span>
                </li>
              </ul>
              <div className="flex gap-3">
                <button
                  onClick={handleDismiss}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Più tardi
                </button>
                <Link
                  href="/upgrade"
                  className={`flex-1 px-4 py-3 bg-gradient-to-r ${colors.bg} text-white rounded-lg text-center font-medium hover:opacity-90 transition-opacity`}
                >
                  {config.ctaText}
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // Default: inline
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${colors.bgLight} border ${colors.border} rounded-xl p-4`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg bg-gradient-to-r ${colors.bg} text-white`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className={`font-semibold ${colors.text}`}>{config.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {description}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <Link
            href="/upgrade"
            className={`inline-flex items-center gap-2 mt-3 px-4 py-2 bg-gradient-to-r ${colors.bg} text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity`}
          >
            {config.ctaText}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

// Hook per determinare quando mostrare prompt
export function useUpgradePrompt(profile: any) {
  const [shouldShowPrompt, setShouldShowPrompt] = useState<PromptTrigger | null>(null)
  const [promptContext, setPromptContext] = useState<any>({})

  useEffect(() => {
    if (!profile || profile.subscription_tier !== 'free') {
      setShouldShowPrompt(null)
      return
    }

    const credits = profile.credits_remaining ?? 0
    const usedCredits = profile.credits_used ?? 0

    // Priorità prompt basata su urgenza
    if (credits <= 2 && credits > 0) {
      setShouldShowPrompt('credits_low')
      setPromptContext({ creditsRemaining: credits })
    } else if (credits === 0) {
      setShouldShowPrompt('lead_limit')
    } else if (usedCredits >= 5 && usedCredits % 5 === 0) {
      setShouldShowPrompt('usage_milestone')
      setPromptContext({ leadsUnlocked: usedCredits })
    }
  }, [profile])

  return { shouldShowPrompt, promptContext }
}
