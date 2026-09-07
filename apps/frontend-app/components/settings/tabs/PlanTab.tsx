/**
 * Tab Piano — piano attuale, crediti, disattivazione/riattivazione - TrovaMi
 * Usato da: app/settings/page.tsx (tab "Piano")
 * API: POST /api/plan/deactivate, POST /api/plan/reactivate (Bearer token Supabase)
 * Display: getBasePlanType (supporta piani legacy es. 'pro') + formatCredits (-1 = Illimitati)
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'
import Link from 'next/link'
import {
  Crown,
  CheckCircle,
  AlertTriangle,
  Pause,
  Play,
  X,
  RefreshCw
} from 'lucide-react'
import InactivePlanBanner from '@/components/InactivePlanBanner'
import { getBasePlanType, isProOrHigher, type PlanType } from '@/lib/utils/plan-helpers'
import { formatCredits } from '@/lib/utils/credits-display'

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

const BASE_PLAN_BADGES: Record<PlanType, string> = {
  free: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  starter: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  pro: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
  agency: 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
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

  return (
    <div className="space-y-6">
      {/* Banner Piano Disattivato */}
      {planData.status !== 'active' && <InactivePlanBanner />}

      {/* Piano Attuale */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Crown className="w-5 h-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Piano Attuale</h2>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${BASE_PLAN_BADGES[basePlan]}`}>
              {planLabel(planData.plan)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Piano</label>
            <div className="text-gray-900 dark:text-white font-medium">{planLabel(planData.plan)}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Crediti Rimanenti</label>
            <div className="text-gray-900 dark:text-white font-medium">{formatCredits(planData.credits_remaining)}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stato</label>
            <div className="flex items-center">
              {planData.status === 'active' ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-600 text-sm">Attivo</span>
                </>
              ) : planData.status === 'inactive' ? (
                <>
                  <Pause className="w-4 h-4 text-orange-500 mr-1" />
                  <span className="text-orange-600 text-sm">Disattivato</span>
                </>
              ) : (
                <>
                  <X className="w-4 h-4 text-red-500 mr-1" />
                  <span className="text-red-600 text-sm">Cancellato</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Caratteristiche del piano */}
        {isProOrHigher(planData.plan) && (
          <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900 rounded-xl">
            <h3 className="text-sm font-medium text-purple-900 dark:text-purple-200 mb-2">Caratteristiche Piano Pro+</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-purple-800 dark:text-purple-300">
              {[
                '100 lead al mese',
                'CRM personale integrato',
                'Gestione lead avanzata',
                'Note e follow-up',
                'Upload allegati',
                'Supporto prioritario',
                'API access',
                'Lead scoring avanzato'
              ].map(feature => (
                <div key={feature} className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 mr-2" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        )}

        {basePlan === 'starter' && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-xl">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">Caratteristiche Piano Starter</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-800 dark:text-blue-300">
              {[
                '25 lead al mese',
                'Analisi tecnica completa',
                'Supporto email',
                'Filtri avanzati'
              ].map(feature => (
                <div key={feature} className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        )}

        {basePlan === 'free' && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">Caratteristiche Piano Gratuito</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
              {[
                '1 lead di prova',
                'Informazioni base',
                'Supporto community'
              ].map(feature => (
                <div key={feature} className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-gray-600 dark:text-gray-400 mr-2" />
                  {feature}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
              <Link
                href="/upgrade"
                className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                <Crown className="w-4 h-4 mr-1" />
                Passa al piano Pro e accedi al CRM
              </Link>
            </div>
          </div>
        )}

        {/* Dettagli disattivazione */}
        {planData.status === 'inactive' && planData.deactivated_at && (
          <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900 rounded-xl">
            <div className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
              <div>
                <strong>Disattivato il:</strong> {new Date(planData.deactivated_at).toLocaleDateString('it-IT')}
              </div>
              {planData.deactivation_reason && (
                <div>
                  <strong>Motivo:</strong> {planData.deactivation_reason}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dettagli cancellazione programmata */}
        {planData.status === 'active' && planData.deactivation_scheduled_at && planData.subscription_end_date && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-xl">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                <div className="font-medium">Cancellazione programmata</div>
                <div>
                  Il tuo abbonamento è stato cancellato ma rimane <strong>attivo fino al {new Date(planData.subscription_end_date).toLocaleDateString('it-IT')}</strong>.
                </div>
                <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                  Potrai continuare ad utilizzare tutte le funzionalità premium fino alla scadenza del periodo già pagato.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dettagli riattivazione */}
        {planData.reactivated_at && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900 rounded-xl">
            <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
              <div>
                <strong>Riattivato il:</strong> {new Date(planData.reactivated_at).toLocaleDateString('it-IT')}
              </div>
            </div>
          </div>
        )}

        {/* Azioni Piano */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Gestione Piano</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {planData.status === 'active'
                  ? 'Gestisci il tuo abbonamento e le impostazioni di fatturazione'
                  : 'Riattiva il tuo piano per accedere a tutte le funzionalità'
                }
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title="Aggiorna i dati del profilo"
              >
                <RefreshCw className="w-4 h-4 mr-2 inline" />
                Aggiorna
              </button>

              {planData.status === 'active' && planData.plan !== 'free' && (
                <button
                  onClick={() => setShowDeactivateModal(true)}
                  className="px-4 py-2 border border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-300 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900 transition-colors"
                >
                  <Pause className="w-4 h-4 mr-2 inline" />
                  Disattiva Piano
                </button>
              )}

              {planData.status === 'inactive' && (
                <button
                  onClick={handleReactivatePlan}
                  disabled={reactivating}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Play className="w-4 h-4 mr-2 inline" />
                  {reactivating ? 'Riattivando...' : 'Riattiva Piano'}
                </button>
              )}

              <Link
                href="/upgrade"
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                {planData.status === 'active' ? 'Cambia Piano' : 'Scegli Piano'}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Disattivazione */}
      {showDeactivateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-label="Disattiva Piano">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <Pause className="w-6 h-6 text-orange-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Disattiva Piano</h3>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Disattivando il piano perderai l'accesso alle funzionalità premium.
              Potrai riattivarlo in qualsiasi momento.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Motivo della disattivazione (opzionale)
              </label>
              <textarea
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
                placeholder="Aiutaci a migliorare..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                rows={3}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeactivateModal(false)}
                disabled={deactivating}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDeactivatePlan}
                disabled={deactivating}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {deactivating ? 'Disattivando...' : 'Disattiva Piano'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
