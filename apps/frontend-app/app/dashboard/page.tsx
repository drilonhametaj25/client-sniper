'use client'

/**
 * Dashboard "Trova clienti" — la schermata core del prodotto.
 *
 * Shell sottile: lo stato dei filtri vive qui, i dati arrivano da useLeads
 * (filtri server-side, keep-previous-data, debounce ricerca), la UI è
 * composta da FiltersBar + LeadCard + Pagination (components/leads) e lo
 * sblocco passa SEMPRE da UnlockLeadModal.
 *
 * Gerarchia della pagina: il soggetto è la LISTA dei lead. Titolo, stato
 * account e filtri stanno sopra, ma piccoli e grigi: non devono competere.
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
import { buildCityOptions } from '@/lib/utils/city'
import AccountStatusBar from '@/components/AccountStatusBar'
import type { AdvancedFiltersState } from '@/components/AdvancedFilters'
import LeadCard from '@/components/leads/LeadCard'
import FiltersBar from '@/components/leads/FiltersBar'
import Pagination from '@/components/leads/Pagination'
import UnlockLeadModal, { UnlockResult } from '@/components/leads/UnlockLeadModal'
import { Button, Card, EmptyState, LoadingSpinner, SkeletonList } from '@/components/ui'
import { useLeads, LeadsFilterState, DashboardLead, LEADS_PER_PAGE } from '@/lib/hooks/useLeads'
import type { CRMStatusType } from '@/lib/types/crm'
import type { ServiceType } from '@/lib/types/services'
import { Search, X, Sparkles, Loader2 } from 'lucide-react'

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

  // Città disponibili (RPC che bypassa la RLS sulla tabella leads).
  // I valori grezzi sono indirizzi Google ("00144 Roma RM"): senza
  // normalizzazione il menu aveva 1000 voci ordinate per CAP, con Roma
  // ripetuta 37 volte. buildCityOptions riduce al nome e deduplica; il
  // filtro server usa ILIKE, quindi "Roma" cattura tutti i CAP.
  const [cities, setCities] = useState<string[]>([])
  useEffect(() => {
    supabase.rpc('get_all_available_cities').then(({ data, error: rpcError }) => {
      if (rpcError) return console.error('Errore caricamento città:', rpcError)
      setCities(buildCityOptions((data || []).map((row: any) => row.city)))
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
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <LoadingSpinner label="Caricamento della dashboard" />
      </div>
    )
  }
  if (!user) return null

  const plan = userProfile?.plan || user.plan || 'free'

  // Lo stato vuoto propone UNA azione, quella che sblocca davvero la situazione
  const emptyState = filters.showOnlyUnlocked
    ? {
        title: 'Non hai ancora sbloccato nessun lead',
        description: 'Togli il filtro per vedere tutti i lead disponibili.',
        action: (
          <Button variant="secondary" onClick={() => updateFilters({ showOnlyUnlocked: false })}>
            Mostra tutti i lead
          </Button>
        )
      }
    : hasActiveFilters
      ? {
          title: 'Nessun lead con questi filtri',
          description: 'Prova ad allargare la zona o a togliere qualche categoria.',
          action: (
            <Button variant="secondary" onClick={clearAllFilters}>
              Azzera i filtri
            </Button>
          )
        }
      : {
          title: 'Nessun lead disponibile',
          description: 'Stiamo analizzando nuove zone: torna a dare un’occhiata fra poco.',
          action: undefined
        }

  return (
    <div className="min-h-screen bg-surface pb-16 pt-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Intestazione: dice dove sei, poi si toglie di mezzo */}
        <header className="mb-6">
          <h1 className="text-title font-semibold text-content">Trova clienti</h1>
          <p className="mt-1 text-body text-content-muted">
            Aziende con problemi tecnici sul sito: sblocca i contatti e proponi i tuoi servizi.
          </p>
          <AccountStatusBar className="mt-5 border-t border-edge pt-4" variant="full" />
        </header>

        {/* Senza servizi configurati non c'è match personalizzato: lo diciamo una volta */}
        {userServices.length === 0 && !bannerDismissed && (
          <Card padding="none" className="mb-6 flex items-start gap-3 p-4">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-content-subtle" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-body font-semibold text-content">Dicci cosa vendi</p>
              <p className="mt-0.5 text-body text-content-muted">
                Configura i tuoi servizi e ti mostriamo per primi i lead che hanno bisogno
                proprio di quello che offri.{' '}
                <a href="/onboarding" className="focus-ring rounded-md text-accent-ink hover:underline">
                  Configura i servizi
                </a>
              </p>
            </div>
            <Button
              variant="ghost"
              iconOnly
              aria-label="Nascondi il suggerimento"
              onClick={dismissBanner}
              icon={<X />}
              className="-mr-2 -mt-2 shrink-0"
            />
          </Card>
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

        {/* Quanti sono, e se stiamo aggiornando */}
        <div className="mb-4 flex items-center gap-3 text-caption text-content-subtle">
          <span>
            <span className="tabular-nums">{total}</span> lead trovati
            {unlockedCount !== null && (
              <> · <span className="tabular-nums">{unlockedCount}</span> sbloccati</>
            )}
          </span>
          {isFetching && !isLoading && (
            <span className="inline-flex items-center gap-1.5" role="status">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              aggiornamento
            </span>
          )}
        </div>

        {error && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-card border border-danger-edge bg-danger-soft px-4 py-3">
            <p className="text-body text-danger">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={refetch}
              className="shrink-0 text-danger hover:bg-danger-soft hover:text-danger"
            >
              Riprova
            </Button>
          </div>
        )}

        {/* Lista lead (keep-previous-data: mai svuotata durante i refetch) */}
        {isLoading ? (
          <SkeletonList count={5} label="Caricamento dei lead" />
        ) : leads.length === 0 ? (
          <Card padding="none">
            <EmptyState
              icon={<Search />}
              title={emptyState.title}
              description={emptyState.description}
              action={emptyState.action}
            />
          </Card>
        ) : (
          <div
            className={`space-y-3 transition-opacity duration-base ease-soft ${
              isFetching ? 'opacity-60' : 'opacity-100'
            }`}
          >
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
