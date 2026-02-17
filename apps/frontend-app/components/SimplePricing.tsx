/**
 * SimplePricing - Tabella prezzi semplificata TrovaMi
 *
 * 3 piani chiari:
 * - FREE: 1 proposta/settimana, €0
 * - STARTER: 25 proposte/mese, €19/mese
 * - AGENCY: Illimitate, €99/mese
 *
 * NO trial, upgrade immediato richiesto.
 * Design pulito, focus sulla value proposition.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Zap, TrendingUp, Crown, ChevronRight, Star } from 'lucide-react'

interface SimplePricingProps {
  currentPlan?: string
  showAnnual?: boolean
  redirectToCheckout?: boolean
  className?: string
}

export default function SimplePricing({
  currentPlan = '',
  showAnnual = true,
  redirectToCheckout = false,
  className = ''
}: SimplePricingProps) {
  const [isAnnual, setIsAnnual] = useState(false)

  const plans = [
    {
      id: 'free',
      name: 'Free',
      description: 'Per iniziare a esplorare',
      icon: Zap,
      iconColor: 'text-gray-500',
      bgGradient: 'from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900',
      borderColor: 'border-gray-200 dark:border-gray-700',
      price: { monthly: 0, annual: 0 },
      proposals: '1 proposta/settimana',
      resetType: 'Reset ogni domenica',
      features: [
        'Analisi completa del sito',
        'Report PDF scaricabile',
        'Template outreach base',
        'CRM per gestire contatti'
      ],
      cta: 'Inizia Gratis',
      ctaVariant: 'secondary' as const,
      popular: false
    },
    {
      id: 'starter',
      name: 'Starter',
      description: 'Per freelancer seri',
      icon: TrendingUp,
      iconColor: 'text-blue-600',
      bgGradient: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
      borderColor: 'border-blue-300 dark:border-blue-700',
      price: { monthly: 19, annual: 190 },
      proposals: '25 proposte/mese',
      resetType: 'Reset mensile',
      features: [
        'Tutto di Free, più:',
        'Analisi avanzata 78+ parametri',
        'Template outreach premium',
        'Report PDF brandizzabile',
        'Alert nuove opportunità',
        'Supporto prioritario'
      ],
      cta: 'Scegli Starter',
      ctaVariant: 'primary' as const,
      popular: true,
      badge: 'Consigliato'
    },
    {
      id: 'agency',
      name: 'Agency',
      description: 'Per chi scala forte',
      icon: Crown,
      iconColor: 'text-purple-600',
      bgGradient: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
      borderColor: 'border-purple-300 dark:border-purple-700',
      price: { monthly: 99, annual: 990 },
      proposals: 'Proposte illimitate',
      resetType: 'Nessun limite',
      features: [
        'Tutto di Starter, più:',
        'Proposte ILLIMITATE',
        'Accesso a tutte le nicchie',
        'Logo personalizzato sui report',
        'API per integrazioni',
        'Account manager dedicato'
      ],
      cta: 'Scegli Agency',
      ctaVariant: 'gradient' as const,
      popular: false
    }
  ]

  const getCtaHref = (planId: string) => {
    if (currentPlan === planId) return '#'
    if (redirectToCheckout && planId !== 'free') {
      return `/checkout?plan=${planId}${isAnnual ? '_annual' : '_monthly'}`
    }
    return `/register?plan=${planId}`
  }

  const isCurrentPlan = (planId: string) => {
    return currentPlan.toLowerCase().includes(planId.toLowerCase())
  }

  return (
    <section id="pricing" className={`py-16 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Prezzi Semplici e Trasparenti
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Inizia gratis, upgrade quando sei pronto. Nessun costo nascosto.
          </p>

          {/* Toggle Mensile/Annuale */}
          {showAnnual && (
            <div className="mt-8 inline-flex items-center gap-3 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  !isAnnual
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Mensile
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  isAnnual
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Annuale
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full">
                  -17%
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon
            const price = isAnnual ? plan.price.annual : plan.price.monthly
            const pricePerMonth = isAnnual ? Math.round(plan.price.annual / 12) : plan.price.monthly
            const isCurrent = isCurrentPlan(plan.id)

            return (
              <div
                key={plan.id}
                className={`
                  relative bg-gradient-to-br ${plan.bgGradient} rounded-2xl border-2 ${plan.borderColor}
                  p-6 flex flex-col transition-all duration-300
                  ${plan.popular ? 'md:scale-105 shadow-xl' : 'hover:shadow-lg'}
                `}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full shadow-lg">
                      <Star className="w-3 h-3" />
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="text-center mb-6">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white dark:bg-gray-800 shadow-sm mb-4`}>
                    <Icon className={`w-6 h-6 ${plan.iconColor}`} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {plan.description}
                  </p>
                </div>

                {/* Prezzo */}
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      {price === 0 ? 'Gratis' : `€${pricePerMonth}`}
                    </span>
                    {price > 0 && (
                      <span className="text-gray-500 dark:text-gray-400">/mese</span>
                    )}
                  </div>
                  {isAnnual && price > 0 && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      €{plan.price.annual}/anno (risparmi €{plan.price.monthly * 12 - plan.price.annual})
                    </p>
                  )}
                </div>

                {/* Proposte */}
                <div className="text-center py-4 mb-4 border-y border-gray-200 dark:border-gray-700">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {plan.proposals}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {plan.resetType}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={getCtaHref(plan.id)}
                  className={`
                    w-full py-3 px-4 rounded-xl font-semibold text-center transition-all
                    flex items-center justify-center gap-2
                    ${isCurrent
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-default'
                      : plan.ctaVariant === 'primary'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : plan.ctaVariant === 'gradient'
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                          : 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {isCurrent ? (
                    'Piano Attuale'
                  ) : (
                    <>
                      {plan.cta}
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Link>
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <div className="text-center mt-12 text-sm text-gray-500 dark:text-gray-400">
          <p>Tutti i piani includono accesso immediato. Puoi annullare in qualsiasi momento.</p>
          <p className="mt-1">Pagamenti sicuri con Stripe. P.IVA 07327360488</p>
        </div>
      </div>
    </section>
  )
}
