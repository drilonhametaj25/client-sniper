/**
 * Sezione pricing completa con tutti i piani - TrovaMi.pro
 * Ottimizzata per SEO e conversione con toggle mensile/annuale
 * Usata da: Homepage, ads page (multipli posizionamenti)
 * Features: Schema markup, analytics tracking, responsive design, caricamento dinamico da DB
 */

'use client'

import { useState, useEffect } from 'react'
import { Check, Star, Zap, TrendingUp, Users } from 'lucide-react'
import Button from '@/components/ui/Button'

interface Plan {
  id: number
  name: string
  price_monthly: number
  price_annual: number
  original_price_monthly?: number
  original_price_annual?: number
  max_credits: number
  credits_annual: number
  description: string
  features: string[]
  badge_text?: string
  stripe_price_id_monthly?: string
  stripe_price_id_annual?: string
  max_replacements_monthly: number
  max_niches: number
  has_daily_alerts: boolean
  has_lead_history: boolean
  has_csv_export: boolean
  has_statistics: boolean
}

interface PlanWithUI extends Plan {
  icon: React.ComponentType<{ className?: string }>
  popular?: boolean
  ctaVariant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  displayName: string
  cta: string
}

// Funzione per mappare i piani dal DB ai piani con UI
const mapPlanToUI = (plan: Plan): PlanWithUI => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    'free': Users,
    'starter': TrendingUp,
    'pro': Zap,
    'agency': Star
  }

  const displayNameMap: Record<string, string> = {
    'free': 'Starter Gratuito',
    'starter': 'Starter Pro', 
    'pro': 'Professional',
    'agency': 'Agenzia Enterprise'
  }

  const ctaMap: Record<string, string> = {
    'free': 'Inizia Gratis',
    'starter': 'Inizia 7 giorni gratis',
    'pro': 'Inizia 7 giorni gratis',
    'agency': 'Contatta il team'
  }

  return {
    ...plan,
    icon: iconMap[plan.name.toLowerCase()] || Users,
    displayName: displayNameMap[plan.name.toLowerCase()] || plan.name,
    cta: ctaMap[plan.name.toLowerCase()] || 'Inizia ora',
    popular: plan.name.toLowerCase() === 'pro',
    ctaVariant: plan.name.toLowerCase() === 'agency' ? 'primary' : 'secondary'
  }
}

interface CompletePricingSectionProps {
  title?: string
  subtitle?: string
  showTitle?: boolean
  className?: string
  position?: 'hero' | 'bottom' | 'middle'
}

export default function CompletePricingSection({ 
  title = "Prezzi Trasparenti, Risultati Garantiti",
  subtitle = "Scegli il piano perfetto per la tua attività. Cambia o cancella quando vuoi.",
  showTitle = true,
  className = "",
  position = 'hero'
}: CompletePricingSectionProps) {
  const [isAnnual, setIsAnnual] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [plans, setPlans] = useState<PlanWithUI[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Carica i piani dinamicamente dall'API
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/plans/public')
        
        if (!response.ok) {
          throw new Error('Errore caricamento piani')
        }
        
        const data = await response.json()
        
        if (data.success && data.plans) {
          const uiPlans = data.plans.map(mapPlanToUI)
          setPlans(uiPlans)
        } else {
          throw new Error('Dati piani non validi')
        }
      } catch (err) {
        console.error('Errore caricamento piani:', err)
        setError('Errore caricamento piani')
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return <div className="animate-pulse bg-gray-100 h-96 rounded-lg" />
  }

  if (error || plans.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Errore caricamento piani. Riprova più tardi.</p>
      </div>
    )
  }

  const trackPlanClick = (planId: number, isAnnual: boolean) => {
    // Analytics tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'pricing_plan_click', {
        plan_id: planId,
        billing_cycle: isAnnual ? 'annual' : 'monthly',
        position: position,
        value: isAnnual ? plans.find(p => p.id === planId)?.price_annual : plans.find(p => p.id === planId)?.price_monthly
      })
    }
  }

  const handlePlanSelect = (plan: PlanWithUI, isAnnual: boolean) => {
    trackPlanClick(plan.id, isAnnual)
    
    // Problema 2: Redirect corretto al register con piano preselezionato
    const planType = isAnnual ? `${plan.name.toLowerCase()}_annual` : `${plan.name.toLowerCase()}_monthly`
    
    if (plan.name.toLowerCase() === 'free') {
      // Piano gratuito va direttamente al register
      window.location.href = '/register'
    } else {
      // Piani a pagamento vanno al register con piano preselezionato
      window.location.href = `/register?plan=${planType}&step=2`
    }
  }

  return (
    <section className={`py-16 px-4 ${className}`} id={`pricing-${position}`}>
      <div className="max-w-7xl mx-auto">
        {showTitle && (
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {title}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {subtitle}
            </p>
          </div>
        )}

        {/* Toggle Mensile/Annuale */}
        <div className="flex justify-center mb-12">
          <div className="relative bg-gray-100 p-1 rounded-lg">
            <div
              className={`absolute top-1 h-8 bg-white rounded-md shadow-sm transition-all duration-300 ${
                isAnnual ? 'right-1 w-24' : 'left-1 w-20'
              }`}
            />
            <div className="relative flex">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  !isAnnual ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mensile
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  isAnnual ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Annuale
                <span className="ml-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                  -20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Grid dei piani */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {plans.map((plan) => {
            const currentPrice = isAnnual ? plan.price_annual : plan.price_monthly
            const originalPrice = isAnnual ? plan.original_price_annual : plan.original_price_monthly
            const credits = isAnnual ? plan.credits_annual : plan.max_credits
            const Icon = plan.icon

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl p-8 border-2 transition-all duration-300 hover:shadow-lg ${
                  plan.popular
                    ? 'border-blue-500 ring-4 ring-blue-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Badge */}
                {plan.badge_text && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-sm font-medium rounded-full">
                    {plan.badge_text}
                  </div>
                )}

                <div className="text-center">
                  {/* Icona */}
                  <Icon className={`h-12 w-12 mx-auto mb-4 ${plan.popular ? 'text-blue-600' : 'text-gray-600'}`} />
                  
                  {/* Nome piano */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.displayName}</h3>
                  
                  {/* Descrizione */}
                  <p className="text-gray-600 mb-6">{plan.description}</p>
                  
                  {/* Prezzo */}
                  <div className="mb-6">
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-gray-900">€{currentPrice}</span>
                      <span className="text-gray-600 ml-2">/{isAnnual ? 'anno' : 'mese'}</span>
                    </div>
                    
                    {originalPrice && originalPrice > currentPrice && (
                      <div className="text-sm text-gray-500 line-through mt-1">
                        Era €{originalPrice}/{isAnnual ? 'anno' : 'mese'}
                      </div>
                    )}
                    
                    {currentPrice > 0 && credits > 0 && (
                      <div className="text-sm text-green-600 font-medium mt-1">
                        €{(currentPrice / credits).toFixed(2)} per lead
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8 text-left">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    onClick={() => handlePlanSelect(plan, isAnnual)}
                    variant={plan.popular ? 'primary' : plan.ctaVariant || 'secondary'}
                    className="w-full"
                  >
                    {plan.cta}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Schema.org structured data per SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "PriceSpecification",
              "name": "TrovaMi Pricing Plans",
              "description": "Piani di prezzo per la piattaforma di lead generation TrovaMi",
              "priceCurrency": "EUR",
              "offers": plans.map(plan => ({
                "@type": "Offer",
                "name": plan.displayName,
                "description": plan.description,
                "price": isAnnual ? plan.price_annual : plan.price_monthly,
                "priceCurrency": "EUR",
                "billingIncrement": isAnnual ? "P1Y" : "P1M"
              }))
            })
          }}
        />

        {/* Garanzia sostituzione */}
        <div className="mt-16 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            💡 Garanzia Sostituzione Inclusa
          </h3>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto">
            Tutti i piani a pagamento includono <strong>sostituzioni gratuite</strong>. 
            Se un lead non è di qualità o ha dati errati, lo sostituiamo immediatamente senza costi aggiuntivi.
          </p>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-center text-green-700">
              <Check className="h-5 w-5 mr-2" />
              <span className="font-medium">Sostituzione immediata</span>
            </div>
            <div className="flex items-center justify-center text-green-700">
              <Check className="h-5 w-5 mr-2" />
              <span className="font-medium">Nessun costo extra</span>
            </div>
            <div className="flex items-center justify-center text-green-700">
              <Check className="h-5 w-5 mr-2" />
              <span className="font-medium">Qualità garantita</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
