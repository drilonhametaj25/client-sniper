// Componente per la selezione del piano utente
// Utilizzato sia durante la registrazione che per l'upgrade
// Integra con Stripe Checkout per i pagamenti

'use client'

import { useState } from 'react'
import { Check, Star } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import LeadCostComparison, { calculateLeadCost, getLeadCostMessage } from './LeadCostComparison'

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
      '2 lead totali (lifetime)',
      'Informazioni base',
      'Supporto community'
    ]
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 19,
    credits: 25,
    features: [
      '25 lead al mese',
      'Analisi tecnica completa',
      'Supporto email',
      'Filtri avanzati'
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    credits: 100,
    features: [
      '100 lead al mese',
      'Analisi tecnica completa',
      'CRM personale integrato',
      'Gestione lead avanzata',
      'Note e follow-up',
      'Upload allegati',
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
  const { session } = useAuth()

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

    if (!session) {
      console.error('No user session available')
      alert('Devi essere loggato per effettuare l\'upgrade.')
      return
    }

    setLoading(plan.id)

    try {
      // Ottieni il token di accesso corrente dalla sessione Supabase
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !currentSession?.access_token) {
        throw new Error('Sessione non valida o token mancante')
      }

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
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
        <div className="flex items-center justify-center mb-4">
          <p className="text-lg text-gray-600 mr-3">
            Trova clienti potenziali analizzando siti web con problemi tecnici
          </p>
          <LeadCostComparison variant="tooltip" />
        </div>
        <div className="max-w-2xl mx-auto">
          <LeadCostComparison variant="compact" />
        </div>
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
                {plan.id === 'free' ? '2 lead totali' : `${plan.credits} lead al mese`}
              </p>
              {plan.price > 0 && (
                <div className="mt-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                  {getLeadCostMessage(plan.price, plan.credits)}
                </div>
              )}
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

      {/* Sezione comparativa costi lead */}
      <div className="mt-16 max-w-4xl mx-auto">
        <LeadCostComparison />
      </div>
    </div>
  )
}
