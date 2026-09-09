/**
 * PublicPricingSection - Unica sezione prezzi pubblica di TrovaMi
 * Fonte di verità: tabella `plans` via GET /api/plans/public (nessuna auth,
 * funziona per visitatori anonimi indipendentemente dalle RLS).
 * Usata da: landing page (app/page.tsx) e pagina prezzi pubblica (app/pricing).
 * CTA: redirect a /register (con piano preselezionato per i piani a pagamento).
 *
 * Presentazione: token di DESIGN.md. Un solo piano ha il pieno d'accento
 * (quello consigliato dal DB); tutti gli altri sono superfici neutre.
 */

'use client'

import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import LinkButton from '@/components/ui/LinkButton'
import { cn } from '@/lib/utils/cn'

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
    return `${variant.credits} crediti al mese`
  }

  const isPopular = (plan: DisplayPlan): boolean =>
    Boolean(plan.badge && plan.badge.toLowerCase().includes('popular'))

  // Un solo pieno d'accento nella sezione: il piano consigliato dal DB.
  // Se il DB non ne segnala nessuno, l'accento va al primo piano in elenco.
  const highlightedBase = (plans.find(isPopular) ?? plans[0])?.base

  // Skeleton di caricamento: stessa forma delle card, così la pagina non salta
  if (loading) {
    return (
      <section id="pricing" className={cn('py-16 sm:py-24', className)}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {showTitle && (
            <div className="mb-12 flex max-w-xl flex-col gap-3">
              <Skeleton className="h-8 w-64 max-w-full" />
              <Skeleton className="h-5 w-80 max-w-full" />
            </div>
          )}
          <div
            className="grid gap-4 md:grid-cols-3"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <span className="sr-only">Caricamento dei piani in corso</span>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-card border border-edge bg-surface-elevated p-6 shadow-card"
                aria-hidden="true"
              >
                <Skeleton className="h-5 w-24" />
                <Skeleton className="mt-5 h-10 w-32" />
                <Skeleton className="mt-6 h-4 w-40" />
                <div className="mt-6 space-y-3">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-5/6" />
                  <Skeleton className="h-3.5 w-4/6" />
                </div>
                <Skeleton className="mt-8 h-11 w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  // Stato di errore onesto: nessun prezzo inventato, solo un rimando
  if (error || plans.length === 0) {
    return (
      <section id="pricing" className={cn('py-16 sm:py-24', className)}>
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <EmptyState
            title="Non riusciamo a mostrare i piani"
            description="Riprova fra qualche istante, oppure registrati: i piani sono sempre visibili dal tuo account."
            action={
              <LinkButton href="/register" variant="secondary">
                Registrati gratis
              </LinkButton>
            }
          />
        </div>
      </section>
    )
  }

  return (
    <section id="pricing" className={cn('py-16 sm:py-24', className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Intestazione */}
        {showTitle && (
          <div className="max-w-2xl">
            <h2 className="text-title font-semibold text-content">Un credito, un lead</h2>
            <p className="mt-4 text-body-lg text-content-muted">
              Sblocchi solo i contatti che ti interessano. Si parte gratis, il piano si
              cambia o si disdice quando vuoi.
            </p>
          </div>
        )}

        {/* Mensile / Annuale */}
        {hasAnnualPlans && (
          <div className={cn('flex', showTitle ? 'mt-8' : 'mt-0')}>
            <div
              role="group"
              aria-label="Ciclo di fatturazione"
              className="inline-flex items-center gap-1 rounded-card border border-edge bg-surface-subtle p-1"
            >
              <button
                type="button"
                onClick={() => setIsAnnual(false)}
                aria-pressed={!isAnnual}
                className={cn(
                  'focus-ring h-11 rounded-control px-5 text-body font-medium',
                  'transition-colors duration-fast ease-soft',
                  !isAnnual
                    ? 'bg-surface-elevated text-content shadow-card'
                    : 'text-content-muted hover:text-content'
                )}
              >
                Mensile
              </button>
              <button
                type="button"
                onClick={() => setIsAnnual(true)}
                aria-pressed={isAnnual}
                className={cn(
                  'focus-ring h-11 rounded-control px-5 text-body font-medium',
                  'transition-colors duration-fast ease-soft',
                  isAnnual
                    ? 'bg-surface-elevated text-content shadow-card'
                    : 'text-content-muted hover:text-content'
                )}
              >
                Annuale
              </button>
            </div>
          </div>
        )}

        {/* Piani */}
        <div
          className={cn(
            'mt-10 grid gap-4',
            plans.length >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'
          )}
        >
          {plans.map((plan) => {
            const variant = isAnnual && plan.annual ? plan.annual : plan.monthly!
            const usingAnnual = isAnnual && plan.annual !== null
            const popular = isPopular(plan)
            const highlighted = plan.base === highlightedBase
            const hasDiscount = variant.originalPrice > variant.price
            const annualSavings =
              plan.annual && plan.monthly ? plan.monthly.price * 12 - plan.annual.price : 0
            const features =
              variant.features.length > 0
                ? variant.features
                : FALLBACK_FEATURES[plan.base] || FALLBACK_FEATURES.starter

            return (
              <Card
                key={plan.base}
                padding="none"
                className={cn('flex flex-col', highlighted && 'border-accent-edge')}
              >
                <div className="flex h-full flex-col p-6">
                  {/* Nome del piano + eventuale etichetta dal DB */}
                  <div className="flex min-h-[1.75rem] items-center justify-between gap-3">
                    <h3 className="text-heading font-semibold text-content">
                      {plan.displayName}
                    </h3>
                    {plan.badge && (
                      <Badge variant={popular ? 'accent' : 'neutral'} size="sm" pill>
                        {plan.badge}
                      </Badge>
                    )}
                  </div>

                  {/* Prezzo */}
                  <div className="mt-5 flex items-baseline gap-1.5">
                    <span className="text-metric font-semibold tabular-nums text-content">
                      {variant.price === 0 ? 'Gratis' : `€${formatEuro(variant.price)}`}
                    </span>
                    {variant.price > 0 && (
                      <span className="text-caption text-content-subtle">
                        al {usingAnnual ? 'anno' : 'mese'}
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 min-h-[1.25rem]">
                    {hasDiscount && (
                      <p className="text-caption text-content-subtle">
                        Listino{' '}
                        <span className="line-through tabular-nums">
                          €{formatEuro(variant.originalPrice)}
                        </span>
                      </p>
                    )}
                    {usingAnnual && annualSavings > 0 && (
                      <p className="text-caption text-success">
                        Risparmi{' '}
                        <span className="tabular-nums">€{formatEuro(annualSavings)}</span> in
                        un anno
                      </p>
                    )}
                  </div>

                  {/* Crediti: la chiave di lettura del piano */}
                  <div className="mt-5 border-t border-edge pt-5">
                    <p className="text-body font-medium text-content">
                      {getCreditsLabel(plan, variant)}
                    </p>
                    <p className="mt-1 text-caption text-content-subtle">
                      {plan.base === 'free'
                        ? 'Solo alla registrazione, senza rinnovo'
                        : variant.isUnlimited
                          ? 'Nessun limite mensile'
                          : '1 credito = 1 lead sbloccato per sempre'}
                    </p>
                  </div>

                  {/* Cosa include */}
                  <ul className="mt-5 flex-1 space-y-2.5">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-content-subtle"
                          aria-hidden="true"
                        />
                        <span className="text-caption text-content-muted">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <LinkButton
                    href={getCtaHref(plan)}
                    variant={highlighted ? 'primary' : 'secondary'}
                    fullWidth
                    className="mt-6"
                  >
                    {plan.base === 'free' ? 'Inizia gratis' : `Scegli ${plan.displayName}`}
                  </LinkButton>
                </div>
              </Card>
            )
          })}
        </div>

        <p className="mt-8 text-caption text-content-subtle">
          Pagamenti gestiti da Stripe. Puoi disdire quando vuoi. P.IVA 07327360488
        </p>
      </div>
    </section>
  )
}
