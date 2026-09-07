/**
 * useLeads — hook dati per la lista lead della dashboard.
 *
 * Responsabilità:
 * - Chiama GET /api/leads con i filtri correnti (tutti server-side).
 * - Keep-previous-data: durante un refetch la lista NON viene svuotata,
 *   si espone solo isFetching per un indicatore discreto.
 * - UNICO debounce (400ms) per la ricerca testuale, nessun minimo di caratteri.
 * - Auth via Bearer token (supabase.auth.getSession()).
 * - Nessuna cache in localStorage.
 * - Risposte stale ignorate (sequence id + AbortController).
 *
 * Usato da: app/dashboard/page.tsx
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { AdvancedFiltersState } from '@/components/AdvancedFilters'
import type { CRMStatusType } from '@/lib/types/crm'

export const LEADS_PER_PAGE = 20

export type LeadSortBy = 'score' | 'created_at' | 'last_seen_at' | 'business_name'

export interface LeadsFilterState {
  page: number
  search: string
  category: string
  city: string
  showOnlyUnlocked: boolean
  showOnlyMatching: boolean
  sortBy: LeadSortBy
  sortOrder: 'asc' | 'desc'
  advanced: AdvancedFiltersState
}

/** Forma del lead restituita da /api/leads (contatti mascherati se non sbloccato). */
export interface DashboardLead {
  id: string
  business_name?: string | null
  website_url?: string | null
  address?: string | null
  city?: string | null
  category?: string | null
  score: number
  score_version?: number | null
  analysis?: any
  website_analysis?: any
  created_at?: string
  last_seen_at?: string
  has_phone?: boolean
  has_email?: boolean
  phone?: string | null
  email?: string | null
  is_unlocked?: boolean
  global_unlock_count?: number
  // Solo Starter+
  crm_status?: CRMStatusType
  next_follow_up?: string | null
  crm_notes?: string | null
}

export interface LeadsUserProfile {
  role: string
  plan: string
  credits_remaining: number
}

export interface UseLeadsResult {
  leads: DashboardLead[]
  total: number
  totalPages: number
  userProfile: LeadsUserProfile | null
  /** true solo al primo caricamento (nessun dato ancora mostrabile) */
  isLoading: boolean
  /** true per ogni richiesta in corso (anche refetch con dati già visibili) */
  isFetching: boolean
  error: string | null
  refetch: () => void
  /** aggiorna un lead in place (es. dopo sblocco) senza rifare la fetch */
  patchLead: (leadId: string, patch: Partial<DashboardLead>) => void
}

function buildParams(filters: LeadsFilterState, search: string): URLSearchParams {
  const { advanced } = filters
  return new URLSearchParams({
    page: String(filters.page),
    limit: String(LEADS_PER_PAGE),
    ...(filters.category && { category: filters.category }),
    ...(filters.city && { city: filters.city }),
    ...(search && { search }),
    ...(filters.showOnlyUnlocked && { showOnlyUnlocked: '1' }),
    // Range punteggio
    ...(advanced.scoreRange.min > 0 && { scoreMin: String(advanced.scoreRange.min) }),
    ...(advanced.scoreRange.max < 100 && { scoreMax: String(advanced.scoreRange.max) }),
    // Contatti
    ...(advanced.hasEmail && { hasEmail: '1' }),
    ...(advanced.hasPhone && { hasPhone: '1' }),
    // Problemi tecnici
    ...(advanced.technicalIssues.noGoogleAds && { noGoogleAds: '1' }),
    ...(advanced.technicalIssues.noFacebookPixel && { noFacebookPixel: '1' }),
    ...(advanced.technicalIssues.slowLoading && { slowLoading: '1' }),
    ...(advanced.technicalIssues.noSSL && { noSSL: '1' }),
    // CRM
    ...(advanced.crmFilters.onlyUncontacted && { onlyUncontacted: '1' }),
    ...(advanced.crmFilters.followUpOverdue && { followUpOverdue: '1' }),
    ...(advanced.crmFilters.crmStatus !== 'all' && { crmStatus: advanced.crmFilters.crmStatus }),
    // Servizi richiesti / match (calcolati server-side)
    ...(advanced.serviceTypes.length > 0 && { serviceTypes: advanced.serviceTypes.join(',') }),
    ...(advanced.minMatchScore > 0 && { minMatchScore: String(advanced.minMatchScore) }),
    ...(filters.showOnlyMatching && { onlyMatching: '1' }),
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder
  })
}

export function useLeads(filters: LeadsFilterState, enabled: boolean): UseLeadsResult {
  const [leads, setLeads] = useState<DashboardLead[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [userProfile, setUserProfile] = useState<LeadsUserProfile | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  // === UNICO debounce per la ricerca testuale (400ms, nessun minimo) ===
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 400)
    return () => clearTimeout(timer)
  }, [filters.search])

  // Ref sempre aggiornata: l'effect di fetch dipende solo dalla chiave serializzata
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const requestSeq = useRef(0)

  const fetchKey = JSON.stringify({
    ...filters,
    search: debouncedSearch,
    refreshTick,
    enabled
  })

  useEffect(() => {
    if (!enabled) return

    const seq = ++requestSeq.current
    const controller = new AbortController()

    const run = async () => {
      setIsFetching(true)
      setError(null)
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) {
          if (seq === requestSeq.current) {
            setError('Sessione scaduta: ricarica la pagina.')
            setIsFetching(false)
          }
          return
        }

        const params = buildParams(filtersRef.current, debouncedSearch)
        const response = await fetch(`/api/leads?${params}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || 'Errore API')
        }

        // Risposta stale (nel frattempo è partita una richiesta più recente): ignora
        if (seq !== requestSeq.current) return

        setLeads(result.data.leads || [])
        setTotal(result.data.pagination?.total ?? 0)
        setTotalPages(result.data.pagination?.totalPages ?? 1)
        setUserProfile(result.data.user_profile ?? null)
        setHasLoaded(true)
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
        if (seq !== requestSeq.current) return
        console.error('Errore caricamento lead:', err)
        // Keep-previous-data: la lista esistente resta visibile, mostriamo solo l'errore
        setError('Impossibile caricare i lead. Riprova.')
      } finally {
        if (seq === requestSeq.current) setIsFetching(false)
      }
    }

    run()
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey])

  const refetch = useCallback(() => setRefreshTick(tick => tick + 1), [])

  const patchLead = useCallback((leadId: string, patch: Partial<DashboardLead>) => {
    setLeads(prev => prev.map(lead => (lead.id === leadId ? { ...lead, ...patch } : lead)))
  }, [])

  return {
    leads,
    total,
    totalPages,
    userProfile,
    isLoading: !hasLoaded,
    isFetching,
    error,
    refetch,
    patchLead
  }
}
