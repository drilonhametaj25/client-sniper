// Nuovo componente PlanSelector configurabile - TrovaMi.pro
// Carica i piani dal database in modo dinamico
// Supporta piani mensili/annuali e prezzi scontati
// Usato per: Pricing table, upgrade, registrazione

'use client'

import { useState, useEffect } from 'react'
import { Check, Star, Zap, Award, Clock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface PlanFromDB {
  name: string
  price_monthly: number
  original_price_monthly: number
  max_credits: number
  description: string
  stripe_price_id_monthly: string
  stripe_price_id_annual: string
  max_replacements_monthly: number
  features: string[]
  is_visible: boolean
  sort_order: number
  badge_text: string
  max_niches: number
  has_daily_alerts: boolean
  has_lead_history: boolean
  has_csv_export: boolean
  has_statistics: boolean
  is_annual: boolean
}

interface PlanDisplay {
  id: string
  name: string
  displayName: string
  monthlyPrice: number
  originalPrice: number
  annualPrice: number
  originalAnnualPrice: number
  credits: number
  description: string
  features: string[]
  stripePriceIdMonthly?: string
  stripePriceIdAnnual?: string
  replacements: number
  badge?: string
  maxNiches: number
  isPopular: boolean
  savings: number // per piano annuale
}

interface PlanSelectorProps {
  currentPlan?: string
  onPlanSelect?: (planId: string, isAnnual: boolean) => void
  showFree?: boolean
  redirectToRegister?: boolean // Nuova prop per gestire redirect
}

export default function PlanSelector({ 
  currentPlan = 'free', 
  onPlanSelect,
  showFree = true,
  redirectToRegister = false
}: PlanSelectorProps) {
  const [plans, setPlans] = useState<PlanDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState(currentPlan)
  const [isAnnual, setIsAnnual] = useState(false)
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)
  const { session } = useAuth()

  // Carica piani dal database
  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    try {
      const { data: dbPlans, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order')

      if (error) throw error

      // Raggruppa piani mensili e annuali
      const planGroups = new Map<string, { monthly?: PlanFromDB; annual?: PlanFromDB }>()
      
      dbPlans.forEach(plan => {
        const baseName = plan.name.replace('_monthly', '').replace('_annual', '')
        if (!planGroups.has(baseName)) {
          planGroups.set(baseName, {})
        }
        
        if (plan.name.includes('_annual')) {
          planGroups.get(baseName)!.annual = plan
        } else {
          planGroups.get(baseName)!.monthly = plan
        }
      })

      // Converte in formato display
      const displayPlans: PlanDisplay[] = []
      
      planGroups.forEach(({ monthly, annual }, baseName) => {
        if (!monthly) return // Skip se non c'è versione mensile
        
        const monthlyPrice = monthly.price_monthly / 100 // da centesimi a euro
        const originalPrice = monthly.original_price_monthly / 100
        const annualPrice = annual ? (annual.price_monthly / 100) : (monthlyPrice * 10) // default 10x se non specificato
        const originalAnnualPrice = annual ? (annual.original_price_monthly / 100) : (originalPrice * 12)
        const savings = originalAnnualPrice - annualPrice

        displayPlans.push({
          id: baseName,
          name: baseName,
          displayName: getDisplayName(baseName),
          monthlyPrice,
          originalPrice,
          annualPrice,
          originalAnnualPrice,
          credits: monthly.max_credits,
          description: monthly.description,
          features: monthly.features,
          stripePriceIdMonthly: monthly.stripe_price_id_monthly,
          stripePriceIdAnnual: annual?.stripe_price_id_annual,
          replacements: monthly.max_replacements_monthly,
          badge: monthly.badge_text,
          maxNiches: monthly.max_niches,
          isPopular: monthly.badge_text?.includes('Popular') || false,
          savings
        })
      })

      setPlans(showFree ? displayPlans : displayPlans.filter(p => p.id !== 'free'))
      setLoading(false)
    } catch (error) {
      console.error('Errore caricamento piani:', error)
      setLoading(false)
    }
  }

  const getDisplayName = (planName: string): string => {
    switch (planName) {
      case 'free': return 'Free'
      case 'starter': return 'Starter'
      case 'pro': return 'Pro'
      case 'agency': return 'Agency'
      default: return planName.charAt(0).toUpperCase() + planName.slice(1)
    }
  }

  const handlePlanSelect = async (plan: PlanDisplay) => {
    // Se c'è una funzione callback personalizzata, usala (per pagina register)
    if (onPlanSelect) {
      onPlanSelect(plan.id, isAnnual)
      return
    }

    // Se redirectToRegister è true (per homepage/ads), vai al register
    if (redirectToRegister) {
      const planType = isAnnual ? `${plan.id}_annual` : `${plan.id}_monthly`
      
      if (plan.id === 'free') {
        window.location.href = '/register'
      } else {
        window.location.href = `/register?plan=${planType}&step=2`
      }
      return
    }

    // Comportamento originale per utenti loggati
    if (plan.id === 'free') {
      return // Piano free non ha checkout
    }

    const priceId = isAnnual ? plan.stripePriceIdAnnual : plan.stripePriceIdMonthly
    if (!priceId) {
      console.error('Missing Stripe Price ID for plan:', plan.id, isAnnual ? 'annual' : 'monthly')
      alert('Piano non configurato. Contatta il supporto.')
      return
    }

    if (!session) {
      alert('Devi essere loggato per effettuare l\'upgrade.')
      return
    }

    setProcessingPlan(plan.id)

    try {
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !currentSession?.access_token) {
        throw new Error('Sessione non valida')
      }

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({
          priceId,
          planId: plan.id + (isAnnual ? '_annual' : '_monthly'),
          isAnnual
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
      setProcessingPlan(null)
    }
  }

  const getCurrentPrice = (plan: PlanDisplay) => {
    return isAnnual ? plan.annualPrice : plan.monthlyPrice
  }

  const getOriginalPrice = (plan: PlanDisplay) => {
    return isAnnual ? plan.originalAnnualPrice : plan.originalPrice
  }

  const hasDiscount = (plan: PlanDisplay) => {
    const current = getCurrentPrice(plan)
    const original = getOriginalPrice(plan)
    return current < original
  }

  const getDiscountPercentage = (plan: PlanDisplay) => {
    const current = getCurrentPrice(plan)
    const original = getOriginalPrice(plan)
    return Math.round(((original - current) / original) * 100)
  }

  if (loading) {
    return (
      <div className="py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Caricamento piani...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Scegli il tuo piano TrovaMi
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          Trova clienti potenziali analizzando siti web con problemi tecnici
        </p>
        
        {/* Toggle mensile/annuale */}
        <div className="flex items-center justify-center mb-8">
          <span className={`mr-3 ${!isAnnual ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
            Mensile
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isAnnual ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isAnnual ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`ml-3 ${isAnnual ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
            Annuale
          </span>
          {isAnnual && (
            <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
              Risparmi 2 mesi
            </span>
          )}
        </div>
      </div>

      {/* Piani */}
      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-2xl p-8 transition-all duration-200 hover:shadow-xl ${
              plan.isPopular
                ? 'border-2 border-blue-500 shadow-xl scale-105'
                : 'border border-gray-200 shadow-lg'
            } ${
              selectedPlan === plan.id
                ? 'ring-2 ring-blue-500'
                : ''
            }`}
          >
            {/* Badge */}
            {plan.badge && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className={`px-4 py-1 rounded-full text-sm font-medium flex items-center ${
                  plan.badge.includes('Popular') 
                    ? 'bg-blue-500 text-white'
                    : 'bg-orange-500 text-white'
                }`}>
                  {plan.badge.includes('Popular') ? (
                    <Star className="w-4 h-4 mr-1" />
                  ) : (
                    <Zap className="w-4 h-4 mr-1" />
                  )}
                  {plan.badge}
                </div>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">{plan.displayName}</h3>
              
              {/* Prezzo */}
              <div className="mt-4">
                <div className="flex items-center justify-center">
                  {hasDiscount(plan) && (
                    <span className="text-lg text-gray-400 line-through mr-2">
                      €{getOriginalPrice(plan)}
                    </span>
                  )}
                  <span className="text-4xl font-bold text-gray-900">
                    €{getCurrentPrice(plan)}
                  </span>
                </div>
                {plan.id !== 'free' && (
                  <p className="text-sm text-gray-600 mt-1">
                    {isAnnual ? '/anno' : '/mese'}
                  </p>
                )}
                
                {/* Sconto badge */}
                {hasDiscount(plan) && (
                  <div className="mt-2 inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                    <Award className="w-3 h-3 mr-1" />
                    -{getDiscountPercentage(plan)}% Early Adopter
                  </div>
                )}

                {/* Savings per piano annuale */}
                {isAnnual && plan.savings > 0 && (
                  <p className="text-sm text-green-600 mt-2 font-medium">
                    Risparmi €{plan.savings}/anno
                  </p>
                )}
              </div>

              {/* Descrizione breve */}
              <p className="text-sm text-gray-600 mt-3">
                {plan.id === 'free' ? 
                  '5 lead immediati + crescita settimanale' : 
                  `${plan.credits} lead/${isAnnual ? 'anno' : 'mese'} + ${plan.replacements} sostituzioni gratuite`
                }
              </p>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5 mr-3" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <button
              onClick={() => handlePlanSelect(plan)}
              disabled={processingPlan === plan.id}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                plan.isPopular
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                  : plan.id === 'free'
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  : 'bg-gray-900 hover:bg-gray-800 text-white'
              } ${processingPlan === plan.id ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {processingPlan === plan.id ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Elaborazione...
                </div>
              ) : (
                plan.id === 'free' ? 'Inizia Gratis' :
                selectedPlan === plan.id ? 'Piano Attuale' : 
                'Scegli Piano'
              )}
            </button>

            {/* Garanzie per piani a pagamento */}
            {plan.id !== 'free' && (
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500 flex items-center justify-center">
                  <Clock className="w-3 h-3 mr-1" />
                  Cancellazione in qualsiasi momento
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* FAQ sezione */}
      <div className="mt-16 text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Domande Frequenti
        </h3>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              Cosa sono le sostituzioni gratuite?
            </h4>
            <p className="text-sm text-gray-600">
              Se un lead non è valido o già contattato, puoi richiedere una sostituzione gratuita. 
              Ogni piano include un numero limitato di sostituzioni al mese.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              Posso cambiare piano in qualsiasi momento?
            </h4>
            <p className="text-sm text-gray-600">
              Sì, puoi fare upgrade o downgrade del piano in qualsiasi momento. 
              I cambiamenti si applicano dal prossimo ciclo di fatturazione.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              I lead sono esclusivi?
            </h4>
            <p className="text-sm text-gray-600">
              No, i lead sono condivisi tra gli utenti. Tuttavia, utilizziamo algoritmi 
              per distribuirli in modo equo e ridurre la sovrapposizione.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              Cosa significa "Early Adopter"?
            </h4>
            <p className="text-sm text-gray-600">
              Sono prezzi scontati per i primi utenti della piattaforma. 
              I prezzi potrebbero aumentare in futuro, ma il tuo piano manterrà il prezzo scontato.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
