'use client'

/**
 * Dashboard "Trova clienti" — la schermata core del prodotto.
 *
 * Shell sottile: lo stato dei filtri vive qui, i dati arrivano da useLeads
 * (filtri server-side, keep-previous-data, debounce ricerca), la UI è
 * composta da FiltersBar + LeadCard + Pagination (components/leads) e lo
 * sblocco passa SEMPRE da UnlockLeadModal.
 *
 * Default di prodotto: chi ha configurato i servizi vede i lead compatibili
 * ("Solo per i miei servizi" attivo, disattivabile con un click).
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'
import { isStarterOrHigher } from '@/lib/utils/plan-helpers'
import AccountStatusBar from '@/components/AccountStatusBar'
import type { AdvancedFiltersState } from '@/components/AdvancedFilters'
import LeadCard from '@/components/leads/LeadCard'
import FiltersBar from '@/components/leads/FiltersBar'
import Pagination from '@/components/leads/Pagination'
import UnlockLeadModal, { UnlockResult } from '@/components/leads/UnlockLeadModal'
import { useLeads, LeadsFilterState, DashboardLead, LEADS_PER_PAGE } from '@/lib/hooks/useLeads'
import type { CRMStatusType } from '@/lib/types/crm'
import type { ServiceType } from '@/lib/types/services'
import { Target, X, Sparkles } from 'lucide-react'

const DEFAULT_ADVANCED_FILTERS: AdvancedFiltersState = {
  scoreRange: { min: 0, max: 100 },
  hasEmail: false,
  hasPhone: false,
  technicalIssues: { noGoogleAds: false, noFacebookPixel: false, slowLoading: false, noSSL: false },
  crmFilters: { onlyUncontacted: false, followUpOverdue: false, crmStatus: 'all' },
  serviceTypes: [],
  minMatchScore: 0
}

const DEFAULT_FILTERS: LeadsFilterState = {
  page: 1,
  search: '',
  category: '',
  city: '',
  showOnlyUnlocked: false,
  showOnlyMatching: false,
  sortBy: 'score',
  sortOrder: 'asc',
  advanced: DEFAULT_ADVANCED_FILTERS
}

const ONBOARDING_BANNER_KEY = 'trovami_onboarding_banner_dismissed'

export default function DashboardPage() {
  const { user, loading, refreshProfile } = useAuth()
  const router = useRouter()
  const { success: toastSuccess, error: toastError } = useToast()

  // === Filtri (ogni modifica riporta a pagina 1, tranne il cambio pagina) ===
  const [filters, setFilters] = useState<LeadsFilterState>(DEFAULT_FILTERS)
  const updateFilters = (patch: Partial<LeadsFilterState>) =>
    setFilters(prev => ({ ...prev, ...patch, page: patch.page ?? 1 }))

  // Ripristina i filtri avanzati salvati (AdvancedFilters li persiste da sé)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('advancedFilters')
      if (!saved) return
      const parsed = JSON.parse(saved)
      setFilters(prev => ({
        ...prev,
        advanced: {
          ...DEFAULT_ADVANCED_FILTERS,
          ...parsed,
          scoreRange: { ...DEFAULT_ADVANCED_FILTERS.scoreRange, ...parsed.scoreRange },
          technicalIssues: { ...DEFAULT_ADVANCED_FILTERS.technicalIssues, ...parsed.technicalIssues },
          crmFilters: { ...DEFAULT_ADVANCED_FILTERS.crmFilters, ...parsed.crmFilters },
          serviceTypes: Array.isArray(parsed.serviceTypes) ? parsed.serviceTypes : []
        }
      }))
    } catch {
      localStorage.removeItem('advancedFilters')
    }
  }, [])

  // DEFAULT del prodotto: chi ha configurato i servizi vede i lead COMPATIBILI
  const matchingDefaultApplied = useRef(false)
  const userServices = ((user?.services_offered as string[] | undefined) || []) as ServiceType[]
  useEffect(() => {
    if (matchingDefaultApplied.current) return
    if (userServices.length > 0) {
      matchingDefaultApplied.current = true
      setFilters(prev => ({ ...prev, showOnlyMatching: true }))
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect se non autenticato
  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  // === Dati ===
  const { leads, total, totalPages, userProfile, isLoading, isFetching, error, refetch, patchLead } =
    useLeads(filters, !!user)

  // Città disponibili (RPC che bypassa la RLS sulla tabella leads)
  const [cities, setCities] = useState<string[]>([])
  useEffect(() => {
    supabase.rpc('get_all_available_cities').then(({ data, error: rpcError }) => {
      if (rpcError) return console.error('Errore caricamento città:', rpcError)
      setCities((data || []).map((row: any) => row.city).filter(Boolean))
    })
  }, [])

  // Conteggio lead sbloccati dall'utente (riga statistiche)
  const [unlockedCount, setUnlockedCount] = useState<number | null>(null)
  useEffect(() => {
    if (!user?.id) return
    supabase.rpc('get_user_unlocked_leads', { p_user_id: user.id }).then(({ data }) => {
      if (Array.isArray(data)) setUnlockedCount(data.length)
    })
  }, [user?.id])

  // === Crediti: override locale dopo uno sblocco, poi vince il server ===
  const [creditsOverride, setCreditsOverride] = useState<number | null>(null)
  useEffect(() => { setCreditsOverride(null) }, [userProfile])
  const credits = creditsOverride
    ?? userProfile?.credits_remaining
    ?? (user as any)?.proposals_remaining
    ?? user?.credits_remaining
    ?? 0

  // === Sblocco (unico flusso: UnlockLeadModal) ===
  const [leadToUnlock, setLeadToUnlock] = useState<DashboardLead | null>(null)
  const handleUnlocked = (result: UnlockResult) => {
    patchLead(result.leadId, {
      is_unlocked: true,
      phone: result.phone,
      email: result.email,
      global_unlock_count: (leadToUnlock?.global_unlock_count ?? 0) + (result.already_opened ? 0 : 1)
    })
    setCreditsOverride(result.credits_remaining)
    if (!result.already_opened) setUnlockedCount(count => (count === null ? count : count + 1))
    refreshProfile()
    toastSuccess('Lead sbloccato', 'Contatti disponibili nella card e nel dettaglio.')
  }

  // === CRM quick update (Starter+) ===
  const [updatingCrmId, setUpdatingCrmId] = useState<string | null>(null)
  const handleQuickStatusUpdate = async (leadId: string, newStatus: CRMStatusType) => {
    setUpdatingCrmId(leadId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toastError('Sessione scaduta', 'Effettua nuovamente il login.')
        return
      }
      const response = await fetch('/api/crm/quick-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ leadId, status: newStatus, notes: `Stato aggiornato da dashboard a ${newStatus}` })
      })
      const result = await response.json()
      if (result.success) {
        patchLead(leadId, { crm_status: newStatus })
      } else {
        toastError('Errore', result.error)
      }
    } catch {
      toastError('Errore aggiornamento CRM', 'Riprova tra qualche istante.')
    } finally {
      setUpdatingCrmId(null)
    }
  }

  // === Banner onboarding (se l'utente non ha configurato i servizi) ===
  const [bannerDismissed, setBannerDismissed] = useState(true)
  useEffect(() => {
    setBannerDismissed(localStorage.getItem(ONBOARDING_BANNER_KEY) === '1')
  }, [])
  const dismissBanner = () => {
    setBannerDismissed(true)
    localStorage.setItem(ONBOARDING_BANNER_KEY, '1')
  }

  const clearAllFilters = () => {
    localStorage.removeItem('advancedFilters')
    setFilters(DEFAULT_FILTERS)
  }
  const hasActiveFilters = JSON.stringify({ ...filters, page: 1 }) !== JSON.stringify(DEFAULT_FILTERS)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }
  if (!user) return null

  const plan = userProfile?.plan || user.plan || 'free'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Trova <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">clienti</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Aziende con problemi tecnici sul sito: sblocca i contatti e proponi i tuoi servizi.
          </p>
        </div>

        <AccountStatusBar className="mb-6" variant="full" />

        {/* Banner onboarding: senza servizi configurati niente match personalizzato */}
        {userServices.length === 0 && !bannerDismissed && (
          <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 mb-6">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-gray-900 dark:text-white">Dicci cosa vendi</p>
              <p className="text-gray-600 dark:text-gray-400 mt-0.5">
                Configura i tuoi servizi per vedere subito i lead compatibili con quello che offri.{' '}
                <a href="/onboarding" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                  Configura ora →
                </a>
              </p>
            </div>
            <button onClick={dismissBanner} aria-label="Chiudi" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <FiltersBar
          filters={filters}
          onChange={updateFilters}
          cities={cities}
          hasServices={userServices.length > 0}
          plan={plan}
          unlockedLeads={leads.filter(lead => lead.is_unlocked)}
          leadCount={leads.length}
        />

        {/* Riga statistiche + indicatore refresh discreto */}
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
          <span>
            {total} lead trovati{unlockedCount !== null && <> · {unlockedCount} sbloccati</>}
          </span>
          {isFetching && !isLoading && (
            <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <span className="animate-spin h-3 w-3 border border-blue-600 border-t-transparent rounded-full" />
              aggiornamento...
            </span>
          )}
        </div>

        {error && (
          <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4 text-sm text-red-700 dark:text-red-400">
            <span>{error}</span>
            <button onClick={refetch} className="font-medium hover:underline">Riprova</button>
          </div>
        )}

        {/* Lista lead (keep-previous-data: mai svuotata durante i refetch) */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 animate-pulse" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-16">
            <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {filters.showOnlyUnlocked ? 'Nessun lead sbloccato' : 'Nessun lead trovato'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {filters.showOnlyUnlocked
                ? 'Sblocca il tuo primo lead per vederlo qui.'
                : 'Con questi filtri non ci sono risultati.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Rimuovi filtri
              </button>
            )}
          </div>
        ) : (
          <div className={`space-y-3 transition-opacity ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
            {leads.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                userServices={userServices}
                onUnlock={setLeadToUnlock}
                onOpenDetail={(l) => router.push(`/lead/${l.id}`)}
                onQuickStatus={isStarterOrHigher(plan) ? handleQuickStatusUpdate : undefined}
                isUpdatingStatus={updatingCrmId === lead.id}
              />
            ))}
          </div>
        )}

        {leads.length > 0 && (
          <Pagination
            page={filters.page}
            totalPages={totalPages}
            total={total}
            perPage={LEADS_PER_PAGE}
            onPageChange={(page) => updateFilters({ page })}
          />
        )}
      </div>

      {/* L'UNICO flusso di sblocco */}
      <UnlockLeadModal
        isOpen={leadToUnlock !== null}
        lead={leadToUnlock}
        creditsRemaining={credits}
        onClose={() => setLeadToUnlock(null)}
        onUnlocked={handleUnlocked}
      />
    </div>
  )
}
