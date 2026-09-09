/**
 * Tab Piano — piano attuale, crediti, disattivazione/riattivazione - TrovaMi
 * Usato da: app/settings/page.tsx (tab "Piano")
 * API: POST /api/plan/deactivate, POST /api/plan/reactivate (Bearer token Supabase)
 * Display: getBasePlanType (supporta piani legacy es. 'pro') + formatCredits (-1 = Illimitati)
 * Presentazione: guida in apps/frontend-app/DESIGN.md.
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'
import Link from 'next/link'
import { Check, Pause, Play, RefreshCw } from 'lucide-react'
import InactivePlanBanner from '@/components/InactivePlanBanner'
import { getBasePlanType, isProOrHigher, type PlanType } from '@/lib/utils/plan-helpers'
import { formatCredits } from '@/lib/utils/credits-display'
import { Badge, Button, Card, CardTitle } from '@/components/ui'
import { cn } from '@/lib/utils/cn'

interface PlanState {
  plan: string
  status: string
  credits_remaining: number
  deactivated_at?: string
  deactivation_reason?: string
  deactivation_scheduled_at?: string
  subscription_end_date?: string
  reactivated_at?: string
}

const BASE_PLAN_LABELS: Record<PlanType, string> = {
  free: 'Piano Gratuito',
  starter: 'Piano Starter',
  pro: 'Piano Pro',
  agency: 'Piano Agency'
}

/**
 * Caratteristiche mostrate sotto al piano: una lista sola, neutra.
 * Stessa selezione dell'implementazione precedente: pro+ → lista Pro,
 * starter → lista Starter, tutto il resto → lista Gratuito.
 */
const PLAN_FEATURES: Record<'free' | 'starter' | 'pro', string[]> = {
  free: ['1 lead di prova', 'Informazioni base', 'Supporto community'],
  starter: ['25 lead al mese', 'Analisi tecnica completa', 'Filtri avanzati', 'Supporto email'],
  pro: [
    '100 lead al mese',
    'CRM personale integrato',
    'Gestione lead avanzata',
    'Note e follow-up',
    'Upload allegati',
    'Lead scoring avanzato',
    'API access',
    'Supporto prioritario'
  ]
}

function planLabel(plan: string): string {
  const base = getBasePlanType(plan)
  const cycle = plan.endsWith('_annual') ? ' (Annuale)' : plan.endsWith('_monthly') ? ' (Mensile)' : ''
  return `${BASE_PLAN_LABELS[base]}${cycle}`
}

export default function PlanTab() {
  const { user, refreshProfile } = useAuth()
  const router = useRouter()
  const toast = useToast()

  const [planData, setPlanData] = useState<PlanState>({
    plan: user?.plan || 'free',
    status: 'active', // Default per compatibilità
    credits_remaining: user?.credits_remaining || 0
  })
  const [deactivating, setDeactivating] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [deactivationReason, setDeactivationReason] = useState('')

  // Sincronizza piano e crediti dall'AuthContext (preserva stato locale post-azioni)
  useEffect(() => {
    setPlanData(prev => ({
      ...prev,
      plan: user?.plan || 'free',
      credits_remaining: user?.credits_remaining || 0
    }))
  }, [user?.plan, user?.credits_remaining])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      // 1. Invalida localStorage cache
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('auth_profile_') || key.startsWith('profile_cache_')) {
          localStorage.removeItem(key)
        }
      })
      // 2. Invalida sessionStorage cache
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('auth_profile_') || key.startsWith('profile_cache_')) {
          sessionStorage.removeItem(key)
        }
      })
      // 3. Refresh del profilo AuthContext (i dati locali si aggiornano via useEffect)
      await refreshProfile()
    } finally {
      setRefreshing(false)
    }
  }

  const handleDeactivatePlan = async () => {
    setDeactivating(true)
    try {
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !currentSession?.access_token) {
        throw new Error('Sessione non valida o token mancante')
      }

      const response = await fetch('/api/plan/deactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({ reason: deactivationReason }),
      })

      const result = await response.json()

      if (result.success) {
        if (result.cancellation_scheduled) {
          // Cancellazione programmata - rimane attivo fino alla scadenza
          toast.success(result.message, 'Il tuo piano rimane attivo fino alla fine del periodo già pagato.')
          setPlanData(prev => ({
            ...prev,
            deactivation_reason: deactivationReason,
            deactivation_scheduled_at: new Date().toISOString(),
            subscription_end_date: result.access_until
          }))
        } else if (result.cleanup_performed) {
          // Pulizia automatica - piano disattivato immediatamente
          toast.success(result.message)
          setPlanData(prev => ({
            ...prev,
            status: 'inactive',
            plan: 'free',
            deactivated_at: new Date().toISOString(),
            deactivation_reason: 'Piano disattivato automaticamente'
          }))
        } else {
          // Disattivazione immediata normale
          toast.success(result.message)
          setPlanData(prev => ({
            ...prev,
            status: result.status || 'inactive',
            deactivated_at: result.deactivated_at || new Date().toISOString(),
            deactivation_reason: deactivationReason
          }))
        }

        setShowDeactivateModal(false)
        setDeactivationReason('')
      } else {
        toast.error('Errore durante la disattivazione', result.error)
      }
    } catch (error) {
      console.error('Errore disattivazione:', error)
      toast.error('Errore durante la disattivazione del piano')
    } finally {
      setDeactivating(false)
    }
  }

  const handleReactivatePlan = async () => {
    setReactivating(true)
    try {
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !currentSession?.access_token) {
        throw new Error('Sessione non valida o token mancante')
      }

      const response = await fetch('/api/plan/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      })

      const result = await response.json()

      if (result.success) {
        setPlanData(prev => ({
          ...prev,
          status: 'active',
          reactivated_at: result.reactivated_at,
          deactivation_reason: undefined
        }))
        await refreshProfile()
      } else if (result.action_required === 'checkout') {
        router.push(result.checkout_url)
      } else {
        toast.error('Errore durante la riattivazione', result.error)
      }
    } catch (error) {
      console.error('Errore riattivazione:', error)
      toast.error('Errore durante la riattivazione del piano')
    } finally {
      setReactivating(false)
    }
  }

  const basePlan = getBasePlanType(planData.plan)
  const features = isProOrHigher(planData.plan)
    ? PLAN_FEATURES.pro
    : PLAN_FEATURES[basePlan === 'starter' ? 'starter' : 'free']
  const isActive = planData.status === 'active'
  const isInactive = planData.status === 'inactive'

  // Una sola azione piena per schermata: riattivare, se il piano è fermo;
  // altrimenti cambiare piano.
  const planLinkClass = cn(
    'focus-ring inline-flex h-11 items-center justify-center rounded-control px-4',
    'text-body font-medium transition-colors duration-fast ease-soft',
    isInactive
      ? 'border border-edge bg-surface-elevated text-content hover:bg-surface-subtle'
      : 'bg-accent text-accent-on hover:bg-accent-hover'
  )

  return (
    <div className="space-y-6">
      {/* Banner Piano Disattivato */}
      {!isActive && <InactivePlanBanner />}

      {/* Piano attuale */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-micro uppercase tracking-wide text-content-subtle">
              Piano attuale
            </div>
            <h2 className="mt-1 text-heading font-semibold text-content">
              {planLabel(planData.plan)}
            </h2>
          </div>

          {isActive ? (
            <Badge variant="success" dot>Attivo</Badge>
          ) : isInactive ? (
            <Badge variant="warning" dot>Disattivato</Badge>
          ) : (
            <Badge variant="error" dot>Cancellato</Badge>
          )}
        </div>

        <div className="mt-6 flex items-baseline gap-2">
          <span className="text-metric font-semibold tabular-nums text-content">
            {formatCredits(planData.credits_remaining)}
          </span>
          <span className="text-caption text-content-subtle">crediti rimanenti</span>
        </div>

        {/* Cosa comprende */}
        <ul className="mt-6 grid grid-cols-1 gap-x-6 gap-y-2 border-t border-edge pt-6 sm:grid-cols-2">
          {features.map(feature => (
            <li key={feature} className="flex items-center gap-2 text-body text-content-muted">
              <Check className="h-4 w-4 shrink-0 text-content-subtle" aria-hidden="true" />
              {feature}
            </li>
          ))}
        </ul>

        {basePlan === 'free' && (
          <Link
            href="/upgrade"
            className="focus-ring mt-4 inline-flex h-11 items-center rounded-control text-body text-accent-ink hover:underline"
          >
            Passa a Pro e sblocca il CRM
          </Link>
        )}

        {/* Dettagli disattivazione */}
        {isInactive && planData.deactivated_at && (
          <div className="mt-6 rounded-card border border-edge bg-surface-subtle p-4">
            <p className="text-body text-content-muted">
              Disattivato il{' '}
              <span className="tabular-nums text-content">
                {new Date(planData.deactivated_at).toLocaleDateString('it-IT')}
              </span>
              {planData.deactivation_reason ? `. Motivo: ${planData.deactivation_reason}` : '.'}
            </p>
          </div>
        )}

        {/* Cancellazione programmata */}
        {isActive && planData.deactivation_scheduled_at && planData.subscription_end_date && (
          <div className="mt-6 rounded-card border border-warning-edge bg-warning-soft p-4">
            <p className="text-body font-medium text-warning">Cancellazione programmata</p>
            <p className="mt-1 text-body text-content-muted">
              Il piano resta attivo fino al{' '}
              <span className="tabular-nums text-content">
                {new Date(planData.subscription_end_date).toLocaleDateString('it-IT')}
              </span>
              : fino ad allora hai tutte le funzioni del periodo già pagato.
            </p>
          </div>
        )}

        {/* Riattivazione */}
        {planData.reactivated_at && (
          <div className="mt-6 rounded-card border border-success-edge bg-success-soft p-4">
            <p className="text-body text-content-muted">
              Riattivato il{' '}
              <span className="tabular-nums text-content">
                {new Date(planData.reactivated_at).toLocaleDateString('it-IT')}
              </span>
              .
            </p>
          </div>
        )}

        {/* Azioni */}
        <div className="mt-6 flex flex-col gap-4 border-t border-edge pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption text-content-muted">
            {isActive
              ? 'Puoi cambiare piano o metterlo in pausa quando vuoi.'
              : 'Riattiva il piano per tornare a sbloccare i contatti.'}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleRefresh}
              loading={refreshing}
              icon={<RefreshCw />}
              aria-label="Aggiorna i dati del piano"
              title="Aggiorna i dati del piano"
              iconOnly
            />

            {isActive && planData.plan !== 'free' && (
              <Button
                variant="secondary"
                onClick={() => setShowDeactivateModal(true)}
                icon={<Pause />}
              >
                Metti in pausa
              </Button>
            )}

            {isInactive && (
              <Button
                onClick={handleReactivatePlan}
                loading={reactivating}
                loadingText="Riattivazione…"
                icon={<Play />}
              >
                Riattiva piano
              </Button>
            )}

            <Link href="/upgrade" className={planLinkClass}>
              {isActive ? 'Cambia piano' : 'Scegli piano'}
            </Link>
          </div>
        </div>
      </Card>

      {/* Modale: metti in pausa */}
      {showDeactivateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deactivate-title"
        >
          <div className="animate-slide-up w-full max-w-md rounded-panel border border-edge bg-surface-overlay p-6 shadow-pop">
            <CardTitle id="deactivate-title">Metti in pausa il piano</CardTitle>
            <p className="mt-1 text-body text-content-muted">
              Perderai l'accesso alle funzioni premium. Puoi riattivarlo quando
              vuoi, senza perdere i lead già sbloccati.
            </p>

            <label
              htmlFor="deactivation-reason"
              className="mb-1.5 mt-6 block text-caption font-medium text-content"
            >
              Perché lo metti in pausa? (facoltativo)
            </label>
            <textarea
              id="deactivation-reason"
              value={deactivationReason}
              onChange={(e) => setDeactivationReason(e.target.value)}
              placeholder="Aiutaci a migliorare…"
              rows={3}
              className="focus-ring block w-full resize-none rounded-control border border-edge bg-surface-elevated p-3 text-body text-content placeholder:text-content-subtle"
            />

            <div className="mt-6 flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowDeactivateModal(false)}
                disabled={deactivating}
                fullWidth
              >
                Annulla
              </Button>
              <Button
                onClick={handleDeactivatePlan}
                loading={deactivating}
                loadingText="Attendi…"
                fullWidth
              >
                Metti in pausa
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
