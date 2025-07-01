// Componente per la selezione del piano utente
// Utilizzato sia durante la registrazione che per l'upgrade
// Integra con Stripe Checkout per i pagamenti

'use client'

import { useState } from 'react'
import { Check, Star } from 'lucide-react'

interface Plan {
  id: string
  name: string
  price: number
  credits: number
  features: string[]
  popular?: boolean
  stripePriceId?: string
}

interface PlanSelectorProps {
  currentPlan?: string
  onPlanSelect?: (planId: string) => void
  showFree?: boolean
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    credits: 2,
    features: [
      '2 lead al mese',
      'Informazioni base',
      'Supporto community'
    ]
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    credits: 50,
    features: [
      '50 lead al mese',
      'Analisi tecnica completa',
      'Supporto email',
      'Filtri avanzati'
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    credits: 200,
    features: [
      '200 lead al mese',
      'Analisi tecnica completa',
      'Supporto prioritario',
      'Filtri avanzati',
      'API access',
      'Lead scoring avanzato'
    ],
    popular: true,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
  }
]

export default function PlanSelector({ 
  currentPlan = 'free', 
  onPlanSelect,
  showFree = true 
}: PlanSelectorProps) {
  const [selectedPlan, setSelectedPlan] = useState(currentPlan)
  const [loading, setLoading] = useState<string | null>(null)

  const visiblePlans = showFree ? plans : plans.filter(p => p.id !== 'free')

  const handlePlanSelect = async (plan: Plan) => {
    if (plan.id === 'free' && onPlanSelect) {
      onPlanSelect(plan.id)
      return
    }

    if (!plan.stripePriceId) {
      console.error('Missing Stripe Price ID for plan:', plan.id)
      return
    }

    setLoading(plan.id)

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.stripePriceId,
          planId: plan.id
        })
      })

      const { url, error } = await response.json()

      if (error) {
        throw new Error(error)
      }

      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Errore durante il checkout:', error)
      alert('Errore durante il checkout. Riprova.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Scegli il tuo piano
        </h2>
        <p className="text-lg text-gray-600">
          Trova clienti potenziali analizzando siti web con problemi tecnici
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {visiblePlans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-2xl p-8 ${
              plan.popular
                ? 'border-2 border-blue-500 shadow-xl'
                : 'border border-gray-200 shadow-lg'
            } ${
              selectedPlan === plan.id
                ? 'ring-2 ring-blue-500'
                : ''
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                  <Star className="w-4 h-4 mr-1" />
                  Più popolare
                </div>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">
                  €{plan.price}
                </span>
                {plan.price > 0 && (
                  <span className="text-gray-600">/mese</span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {plan.credits} lead al mese
              </p>
            </div>

            <ul className="space-y-4 mb-8">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handlePlanSelect(plan)}
              disabled={loading === plan.id || currentPlan === plan.id}
              className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                currentPlan === plan.id
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : plan.popular
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {loading === plan.id ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span className="ml-2">Caricamento...</span>
                </div>
              ) : currentPlan === plan.id ? (
                'Piano attuale'
              ) : plan.price === 0 ? (
                'Inizia gratis'
              ) : (
                `Passa a ${plan.name}`
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
