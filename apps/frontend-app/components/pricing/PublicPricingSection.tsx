/**
 * PublicPricingSection - Unica sezione prezzi pubblica di TrovaMi
 * Fonte di verità: tabella `plans` via GET /api/plans/public (nessuna auth,
 * funziona per visitatori anonimi indipendentemente dalle RLS).
 * Usata da: landing page (app/page.tsx) e pagina prezzi pubblica (app/pricing).
 * CTA: redirect a /register (con piano preselezionato per i piani a pagamento).
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Check, Star, ChevronRight } from 'lucide-react'

interface PlanFromApi {
  id: number
  name: string
  price_monthly: number // in centesimi; per le righe *_annual è il prezzo annuale totale
  original_price_monthly: number | null
  max_credits: number
  is_unlimited: boolean | null
  features: string[] | null
  badge_text: string | null
  sort_order: number
  is_visible: boolean
  has_daily_alerts: boolean
  has_lead_history: boolean
  has_csv_export: boolean
  has_statistics: boolean
  stripe_price_id_monthly: string | null
  stripe_price_id_annual: string | null
}

interface PlanVariant {
  price: number // euro
  originalPrice: number // euro
  credits: number
  isUnlimited: boolean
  features: string[]
}

interface DisplayPlan {
  base: string // 'free' | 'starter' | 'agency' | ...
  displayName: string
  badge: string | null
  sortOrder: number
  monthly: PlanVariant | null
  annual: PlanVariant | null
}

interface PublicPricingSectionProps {
  className?: string
  showTitle?: boolean
}

// Fallback curato per piano base, usato solo se il campo `features` del DB
// non è utilizzabile (vuoto o malformato). Niente promesse gonfiate.
const FALLBACK_FEATURES: Record<string, string[]> = {
  free: [
    '1 credito di prova alla registrazione',
    'Analisi tecnica completa del sito',
    'CRM per gestire i contatti',
  ],
  starter: [
    'Crediti ricaricati ogni mese',
    'Analisi tecnica completa dei lead',
    'Alert nuove opportunità',
    'Storico lead consultabile',
  ],
  agency: [
    'Crediti ricaricati ogni mese',
    'Accesso a tutte le nicchie',
    'Esportazione CSV/Excel',
    'Supporto dedicato',
  ],
}

const DISPLAY_NAMES: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  agency: 'Agency',
}

function formatEuro(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(2).replace('.', ',')
}

function toVariant(plan: PlanFromApi): PlanVariant {
  return {
    price: plan.price_monthly / 100,
    originalPrice: (plan.original_price_monthly ?? plan.price_monthly) / 100,
    credits: plan.max_credits,
    isUnlimited: Boolean(plan.is_unlimited),
    features: Array.isArray(plan.features)
      ? plan.features.filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
      : [],
  }
}

function groupPlans(plans: PlanFromApi[]): DisplayPlan[] {
  const groups = new Map<string, DisplayPlan>()

  for (const plan of plans) {
    const base = plan.name.replace('_monthly', '').replace('_annual', '')
    if (!groups.has(base)) {
      groups.set(base, {
        base,
        displayName: DISPLAY_NAMES[base] || base.charAt(0).toUpperCase() + base.slice(1),
        badge: null,
        sortOrder: plan.sort_order,
        monthly: null,
        annual: null,
      })
    }

    const group = groups.get(base)!
    group.sortOrder = Math.min(group.sortOrder, plan.sort_order)
    if (plan.badge_text && !group.badge) group.badge = plan.badge_text

    if (plan.name.endsWith('_annual')) {
      group.annual = toVariant(plan)
    } else {
      group.monthly = toVariant(plan)
    }
  }

  return Array.from(groups.values())
    .filter((g) => g.monthly !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export default function PublicPricingSection({
  className = '',
  showTitle = true,
}: PublicPricingSectionProps) {
  const [plans, setPlans] = useState<DisplayPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isAnnual, setIsAnnual] = useState(false)

  useEffect(() => {
    let cancelled = false

    const fetchPlans = async () => {
      try {
        setLoading(true)
        setError(false)
        const response = await fetch('/api/plans/public')
        if (!response.ok) throw new Error('Errore caricamento piani')

        const data = await response.json()
        if (!data.success || !Array.isArray(data.plans)) {
          throw new Error('Dati piani non validi')
        }

        if (!cancelled) {
          setPlans(groupPlans(data.plans))
        }
      } catch (err) {
        console.error('Errore caricamento piani pubblici:', err)
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchPlans()
    return () => {
      cancelled = true
    }
  }, [])

  const hasAnnualPlans = plans.some((p) => p.annual !== null)

  const getCtaHref = (plan: DisplayPlan): string => {
    if (plan.base === 'free') return '/register'
    const cycle = isAnnual && plan.annual ? 'annual' : 'monthly'
    return `/register?plan=${plan.base}_${cycle}&step=2`
  }

  const getCreditsLabel = (plan: DisplayPlan, variant: PlanVariant): string => {
    if (variant.isUnlimited) return 'Crediti illimitati'
    if (plan.base === 'free') return '1 credito di prova'
    return `${variant.credits} crediti/mese`
  }

  const isPopular = (plan: DisplayPlan): boolean =>
    Boolean(plan.badge && plan.badge.toLowerCase().includes('popular'))

  // Skeleton di caricamento
  if (loading) {
    return (
      <section id="pricing" className={`py-16 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {showTitle && (
            <div className="text-center mb-12">
              <div className="h-9 w-72 max-w-full bg-gray-200 dark:bg-gray-700 rounded-lg mx-auto animate-pulse" />
              <div className="h-5 w-96 max-w-full bg-gray-200 dark:bg-gray-700 rounded-lg mx-auto mt-4 animate-pulse" />
            </div>
          )}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-96 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    )
  }

  // Stato di errore onesto: nessun prezzo inventato, solo un rimando
  if (error || plans.length === 0) {
    return (
      <section id="pricing" className={`py-16 ${className}`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Prezzi non disponibili al momento
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Non siamo riusciti a caricare i piani. Riprova tra qualche istante oppure
            registrati gratis: potrai vedere i piani dal tuo account.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Registrati gratis
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section id="pricing" className={`py-16 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          {showTitle && (
            <>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Prezzi semplici e trasparenti
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                1 credito = 1 lead sbloccato. Inizia gratis, passa a un piano quando sei pronto.
              </p>
            </>
          )}

          {/* Toggle Mensile/Annuale */}
          {hasAnnualPlans && (
            <div className={`${showTitle ? 'mt-8' : ''} inline-flex items-center gap-3 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl`}>
              <button
                type="button"
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
                type="button"
                onClick={() => setIsAnnual(true)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isAnnual
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Annuale
              </button>
            </div>
          )}
        </div>

        {/* Cards */}
        <div className={`grid gap-8 max-w-5xl mx-auto ${plans.length >= 4 ? 'md:grid-cols-2 lg:grid-cols-4 max-w-7xl' : 'md:grid-cols-3'}`}>
          {plans.map((plan) => {
            const variant = isAnnual && plan.annual ? plan.annual : plan.monthly!
            const usingAnnual = isAnnual && plan.annual !== null
            const popular = isPopular(plan)
            const hasDiscount = variant.originalPrice > variant.price
            const annualSavings =
              plan.annual && plan.monthly ? plan.monthly.price * 12 - plan.annual.price : 0
            const features =
              variant.features.length > 0
                ? variant.features
                : FALLBACK_FEATURES[plan.base] || FALLBACK_FEATURES.starter

            return (
              <div
                key={plan.base}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl border-2 p-6 flex flex-col transition-all duration-300 ${
                  popular
                    ? 'border-blue-500 shadow-xl md:scale-105'
                    : 'border-gray-200 dark:border-gray-700 hover:shadow-lg'
                }`}
              >
                {/* Badge dal DB */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full shadow-lg text-white ${
                        popular ? 'bg-blue-600' : 'bg-gray-900 dark:bg-gray-600'
                      }`}
                    >
                      {popular && <Star className="w-3 h-3" />}
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Nome piano */}
                <div className="text-center mb-6 mt-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {plan.displayName}
                  </h3>
                </div>

                {/* Prezzo */}
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-2">
                    {hasDiscount && (
                      <span className="text-lg text-gray-400 dark:text-gray-500 line-through">
                        €{formatEuro(variant.originalPrice)}
                      </span>
                    )}
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      {variant.price === 0 ? 'Gratis' : `€${formatEuro(variant.price)}`}
                    </span>
                    {variant.price > 0 && (
                      <span className="text-gray-500 dark:text-gray-400">
                        /{usingAnnual ? 'anno' : 'mese'}
                      </span>
                    )}
                  </div>
                  {usingAnnual && annualSavings > 0 && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1 font-medium">
                      Risparmi €{formatEuro(annualSavings)} rispetto al mensile
                    </p>
                  )}
                </div>

                {/* Crediti */}
                <div className="text-center py-4 mb-4 border-y border-gray-200 dark:border-gray-700">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {getCreditsLabel(plan, variant)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {plan.base === 'free'
                      ? 'Solo alla registrazione'
                      : variant.isUnlimited
                        ? 'Nessun limite mensile'
                        : 'Ricaricati ogni mese'}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6 flex-1">
                  {features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={getCtaHref(plan)}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-center transition-all flex items-center justify-center gap-2 ${
                    popular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : plan.base === 'free'
                        ? 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                        : 'bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white'
                  }`}
                >
                  {plan.base === 'free' ? 'Inizia gratis' : `Scegli ${plan.displayName}`}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <div className="text-center mt-12 text-sm text-gray-500 dark:text-gray-400">
          <p>Puoi disdire in qualsiasi momento. Pagamenti sicuri con Stripe.</p>
          <p className="mt-1">P.IVA 07327360488</p>
        </div>
      </div>
    </section>
  )
}
