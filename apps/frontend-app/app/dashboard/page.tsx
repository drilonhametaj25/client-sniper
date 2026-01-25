'use client'

// UI restyling stile Apple + Linear: Dashboard client completamente ridisegnata
// Layout moderno con cards glassmorphism, tipografia pulita, spaziature ampie
// Aggiunta gestione limiti configurabili e filtri avanzati
// FIX: Risolto loop infinito di autenticazione e caricamento

import { Metadata } from 'next'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getDaysUntilReset, formatResetDate } from '@/lib/auth'
import { isProOrHigher, getBasePlanType } from '@/lib/utils/plan-helpers'
import { createPortal } from 'react-dom'
import { LeadStatusBadge } from '@/components/LeadStatusBadge'
import { LeadWithCRM, CRMStatusType } from '@/lib/types/crm'
import LeadInsights from '@/components/LeadInsights'
import { 
  Target, 
  CreditCard,
  Filter,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Crown,
  Zap,
  Search,
  RefreshCw,
  Settings,
  ChevronDown,
  Users,
  Calendar,
  Eye,
  MessageCircle
} from 'lucide-react'
import AdvancedFilters, { AdvancedFiltersState } from '@/components/AdvancedFilters'
import { TourTarget } from '@/components/onboarding/TourTarget'
import UpgradeUrgencyBanner from '@/components/UpgradeUrgencyBanner'
import BulkActionsBar from '@/components/BulkActionsBar'
import ExportDropdown from '@/components/ExportDropdown'
import ViewSwitcher, { ViewType } from '@/components/ViewSwitcher'
import LeadCard, { LeadCardCompact } from '@/components/LeadCard'
import { TinderStack } from '@/components/mobile/tinder'
import type { ServiceType } from '@/lib/types/services'
import { detectServices } from '@/lib/utils/service-detection'
import { calculateMatch } from '@/lib/utils/match-calculation'
import FirstTimeUserModal from '@/components/FirstTimeUserModal'
import EmailTemplatePreview from '@/components/EmailTemplatePreview'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { CheckSquare, Square, LayoutGrid, List, Utensils, Building2, Stethoscope, ShoppingCart, Briefcase, GraduationCap as Education, Dumbbell, Car, Scissors, HelpCircle } from 'lucide-react'

// Helper: Get category icon
const getCategoryIcon = (category: string) => {
  const icons: Record<string, React.ReactNode> = {
    'ristoranti': <Utensils className="w-4 h-4" />,
    'hotel': <Building2 className="w-4 h-4" />,
    'medici': <Stethoscope className="w-4 h-4" />,
    'negozi': <ShoppingCart className="w-4 h-4" />,
    'servizi': <Briefcase className="w-4 h-4" />,
    'formazione': <Education className="w-4 h-4" />,
    'fitness': <Dumbbell className="w-4 h-4" />,
    'automotive': <Car className="w-4 h-4" />,
    'bellezza': <Scissors className="w-4 h-4" />,
  }
  return icons[category?.toLowerCase()] || <HelpCircle className="w-4 h-4" />
}

// Helper: Get freshness badge based on creation date
const getFreshnessBadge = (createdAt: string) => {
  const now = new Date()
  const created = new Date(createdAt)
  const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60)

  if (diffHours < 24) {
    return { label: 'Nuovo', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
  } else if (diffHours < 72) {
    return { label: 'Recente', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
  } else if (diffHours < 168) {
    return { label: 'Questa settimana', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' }
  }
  return { label: '', color: '' }
}

interface Lead extends LeadWithCRM {
  phone?: string
  email?: string
  address?: string
  last_seen_at?: string
  needed_roles?: string[] // Può essere null o undefined
  issues?: string[] // Può essere null o undefined
  website_analysis?: any // Analisi sito web per service detection
}

interface Settings {
  free_limit: number
  starter_limit: number
  pro_limit: number
  agency_limit: number
}

export default function ClientDashboard() {
  const { user, loading, refreshProfile } = useAuth()
  const router = useRouter()
  const { startTour } = useOnboarding()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [settings, setSettings] = useState<Settings>({ free_limit: 2, starter_limit: 50, pro_limit: 200, agency_limit: 500 })
  
  // Stato per paginazione
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLeads, setTotalLeads] = useState(0) // Lead totali con filtri applicati
  const [allLeadsCount, setAllLeadsCount] = useState(0) // Tutti i lead nel database (senza filtri)
  const LEADS_PER_PAGE = 20

  // Stato per API
  const [userProfile, setUserProfile] = useState<{role: string, plan: string, credits_remaining: number} | null>(null)
  
  // Filtri
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterCity, setFilterCity] = useState<string>('')
  const [filterRole, setFilterRole] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [searchInput, setSearchInput] = useState<string>('') // Input separato per digitazione
  const [showFilters, setShowFilters] = useState(false)
  const [showOnlyUnlocked, setShowOnlyUnlocked] = useState(false) // Nuovo filtro per lead sbloccati
  const [showWelcomeModal, setShowWelcomeModal] = useState(false) // Modal per nuovi utenti

  // Filtri avanzati - sostituiti con sistema unificato
  const [advancedFilters, setAdvancedFilters] = useState({
    scoreRange: { min: 0, max: 100 },
    hasEmail: false,
    hasPhone: false,
    technicalIssues: {
      noGoogleAds: false,
      noFacebookPixel: false,
      slowLoading: false,
      noSSL: false
    },
    crmFilters: {
      onlyUncontacted: false,
      followUpOverdue: false,
      crmStatus: 'all'
    },
    serviceTypes: [] as ServiceType[],
    minMatchScore: 0
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Ordinamento
  const [sortBy, setSortBy] = useState<'score' | 'created_at' | 'last_seen_at' | 'business_name'>('score')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Stato per tracciare quali lead sono stati "sbloccati"
  const [unlockedLeads, setUnlockedLeads] = useState<Set<string>>(new Set())
  
  // Stati per gestire scroll e effetto visivo dopo sblocco
  const [scrollPosition, setScrollPosition] = useState(0)
  const [lastUnlockedLeadId, setLastUnlockedLeadId] = useState<string | null>(null)
  
  // Stato per le città disponibili
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [citySearchTerm, setCitySearchTerm] = useState<string>('')
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  
  // Stato per CRM
  const [updatingCRM, setUpdatingCRM] = useState<string | null>(null)
  const cityInputRef = useRef<HTMLInputElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

  // Stato per bulk selection e view
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [currentView, setCurrentView] = useState<ViewType>('list')

  // Calcola posizione del dropdown
  const calculateDropdownPosition = () => {
    if (cityInputRef.current) {
      const rect = cityInputRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
  }

  // Aggiorna posizione quando si apre il dropdown
  useEffect(() => {
    if (showCityDropdown) {
      calculateDropdownPosition()
    }
  }, [showCityDropdown])

  // ⚡ REF per controllo anti-loop (definiti prima dei useEffect)
  const [isLoadingLeads, setIsLoadingLeads] = useState(false)
  const hasInitialized = useRef(false)
  const lastUserRef = useRef<string | null>(null)

  // Funzione per caricare via API - NON MEMOIZZATA per evitare loop infiniti
  const loadLeadsFromAPI = async (page = 1, useCache = false) => {
    
    // Evita chiamate multiple contemporanee
    if (isLoadingLeads) {
      return
    }

    try {
      setIsLoadingLeads(true)
      setLoadingData(true)
      
      
      // ⚡ CACHE semplice per evitare richieste duplicate
      const filtersHash = JSON.stringify(advancedFilters)
      const cacheKey = `leads-${page}-${filterCategory}-${filterCity}-${filterRole}-${searchTerm}-${showOnlyUnlocked}-${filtersHash}-${sortBy}-${sortOrder}`
      if (useCache && localStorage.getItem(cacheKey)) {
        try {
          const cached = JSON.parse(localStorage.getItem(cacheKey)!)
          if (Date.now() - cached.timestamp < 30000) { // Cache per 30 secondi
            setLeads(cached.data.leads)
            setUserProfile(cached.data.user_profile)
            setTotalLeads(cached.data.pagination.total)
            setTotalPages(cached.data.pagination.totalPages)
            setCurrentPage(cached.data.pagination.page)
            
            // Carica anche il conteggio totale dal cache se disponibile
            if (cached.data.all_leads_count !== undefined) {
              setAllLeadsCount(cached.data.all_leads_count)
            }
            
            return
          }
        } catch (e) {
          console.warn('Cache corrotta, rimuovo:', e)
          localStorage.removeItem(cacheKey)
        }
      }
      
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        console.error('❌ Nessuna sessione attiva')
        return
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: LEADS_PER_PAGE.toString(),
        ...(filterCategory && { category: filterCategory }),
        ...(filterCity && { city: filterCity }),
        ...(filterRole && { neededRoles: filterRole }),
        ...(searchTerm && { search: searchTerm }),
        ...(showOnlyUnlocked && { showOnlyUnlocked: '1' }),
        // Filtri avanzati - range punteggio
        ...(advancedFilters.scoreRange.min > 0 && { scoreMin: advancedFilters.scoreRange.min.toString() }),
        ...(advancedFilters.scoreRange.max < 100 && { scoreMax: advancedFilters.scoreRange.max.toString() }),
        // Filtri contatti
        ...(advancedFilters.hasEmail && { hasEmail: '1' }),
        ...(advancedFilters.hasPhone && { hasPhone: '1' }),
        // Problemi tecnici
        ...(advancedFilters.technicalIssues.noGoogleAds && { noGoogleAds: '1' }),
        ...(advancedFilters.technicalIssues.noFacebookPixel && { noFacebookPixel: '1' }),
        ...(advancedFilters.technicalIssues.slowLoading && { slowLoading: '1' }),
        ...(advancedFilters.technicalIssues.noSSL && { noSSL: '1' }),
        // Filtri CRM
        ...(advancedFilters.crmFilters.onlyUncontacted && { onlyUncontacted: '1' }),
        ...(advancedFilters.crmFilters.followUpOverdue && { followUpOverdue: '1' }),
        ...(advancedFilters.crmFilters.crmStatus !== 'all' && { crmStatus: advancedFilters.crmFilters.crmStatus }),
        sortBy: sortBy,
        sortOrder: sortOrder
      })
      
      const startTime = Date.now()
      const response = await fetch(`/api/leads?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // Timeout di 10 secondi
      })
      const requestTime = Date.now() - startTime
    

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Errore HTTP ${response.status}:`, errorText)
        
        if (response.status === 401) {
          // Qui potresti reindirizzare al login
        }
        return
      }

      const result = await response.json()
      
      if (result.success) {
        
        setLeads(result.data.leads)
        setUserProfile(result.data.user_profile)
        setTotalLeads(result.data.pagination.total)
        setTotalPages(result.data.pagination.totalPages)
        setCurrentPage(result.data.pagination.page)
        
        // Aggiorna anche il conteggio totale (senza filtri) se disponibile
        if (result.data.all_leads_count !== undefined) {
          setAllLeadsCount(result.data.all_leads_count)
        }
        
        // Cache dei risultati (solo se validi)
        if (result.data.leads.length >= 0) {
          localStorage.setItem(cacheKey, JSON.stringify({
            data: result.data,
            timestamp: Date.now()
          }))
        }
        
      } else {
        console.error('❌ Errore API:', result.error)
      }

    } catch (error) {
      console.error('💥 Errore caricamento leads da API:', error)
      
      if (error instanceof Error) {
        if (error.name === 'TimeoutError') {
          console.error('⏰ Timeout della richiesta API')
        } else if (error.name === 'AbortError') {
          console.error('🛑 Richiesta API interrotta')
        }
      }
    } finally {
      setIsLoadingLeads(false)
      setLoadingData(false)
    }
  }

  // Funzione per applicare filtri avanzati lato client (fallback)
  // NOTA: Non applica filtri per campi che non esistono nei dati (per utenti FREE/STARTER)
  const applyAdvancedFilters = (leadsToFilter: Lead[]) => {
    // Determina se l'utente ha accesso ai campi avanzati
    const hasAdvancedAccess = isProOrHigher(userProfile?.plan || 'free')

    return leadsToFilter.filter(lead => {
      // Range punteggio - sempre disponibile
      if (lead.score < advancedFilters.scoreRange.min || lead.score > advancedFilters.scoreRange.max) {
        return false
      }

      // Filtri contatti - solo se utente ha accesso E il campo esiste nei dati
      // (l'API gestisce il filtro server-side, qui è solo un fallback di sicurezza)
      if (hasAdvancedAccess) {
        if (advancedFilters.hasEmail && 'email' in lead && (!lead.email || lead.email.trim() === '')) {
          return false
        }
        if (advancedFilters.hasPhone && 'phone' in lead && (!lead.phone || lead.phone.trim() === '')) {
          return false
        }
      }

      // Problemi tecnici - solo se utente ha accesso E analysis esiste
      if (hasAdvancedAccess && lead.analysis) {
        if (advancedFilters.technicalIssues.noGoogleAds) {
          const hasGoogleAds = lead.analysis?.tracking?.hasGoogleAds === true
          if (hasGoogleAds) return false
        }

        if (advancedFilters.technicalIssues.noFacebookPixel) {
          const hasFacebookPixel = lead.analysis?.tracking?.hasFacebookPixel === true
          if (hasFacebookPixel) return false
        }

        if (advancedFilters.technicalIssues.slowLoading) {
          const loadTime = lead.analysis?.performance?.loadTime
          if (!loadTime || loadTime < 3.0) return false
        }

        if (advancedFilters.technicalIssues.noSSL) {
          const hasSSL = lead.analysis?.security?.hasSSL === true
          if (hasSSL) return false
        }
      }

      // Filtri CRM (solo per utenti PRO)
      if (hasAdvancedAccess) {
        if (advancedFilters.crmFilters.onlyUncontacted) {
          const crmStatus = (lead as LeadWithCRM).crm_status
          if (crmStatus && crmStatus !== 'new') return false
        }

        if (advancedFilters.crmFilters.followUpOverdue) {
          const nextFollowUp = (lead as LeadWithCRM).next_follow_up
          if (!nextFollowUp) return false

          const today = new Date().toISOString().split('T')[0]
          if (nextFollowUp >= today) return false
        }

        if (advancedFilters.crmFilters.crmStatus !== 'all') {
          const crmStatus = (lead as LeadWithCRM).crm_status
          if (crmStatus !== advancedFilters.crmFilters.crmStatus) return false
        }
      }

      // Filtri servizi - disponibili per tutti
      if (advancedFilters.serviceTypes && advancedFilters.serviceTypes.length > 0) {
        const analysis = lead.website_analysis || lead.analysis
        if (!analysis) return false

        // Calcola i servizi rilevati per questo lead
        const detectedServicesResult = detectServices(analysis)
        const detectedServiceTypes = detectedServicesResult.services.map(s => s.type)

        // Verifica che almeno uno dei servizi filtrati sia presente
        const hasMatchingService = advancedFilters.serviceTypes.some(
          serviceType => detectedServiceTypes.includes(serviceType)
        )
        if (!hasMatchingService) return false
      }

      // Filtro match score minimo (esplicito da UI)
      if (advancedFilters.minMatchScore && advancedFilters.minMatchScore > 0) {
        const userServicesOffered = (user?.services_offered || []) as ServiceType[]
        if (userServicesOffered.length === 0) {
          // Se l'utente non ha configurato servizi, non può filtrare per match
          // ma lasciamo passare tutti
        } else {
          const analysis = lead.website_analysis || lead.analysis
          if (!analysis) return false

          const detectedServicesResult = detectServices(analysis)
          const matchResult = calculateMatch(detectedServicesResult, userServicesOffered)

          if (matchResult.score < advancedFilters.minMatchScore) return false
        }
      }

      // FILTRO AUTOMATICO: Se utente ha configurato servizi, nascondi lead con 0 match
      // Questo filtro si applica SEMPRE quando l'utente ha servizi configurati
      const userServicesForAutoFilter = (user?.services_offered || []) as ServiceType[]
      if (userServicesForAutoFilter.length > 0) {
        const analysis = lead.website_analysis || lead.analysis
        if (analysis) {
          const detectedServicesResult = detectServices(analysis)
          const matchResult = calculateMatch(detectedServicesResult, userServicesForAutoFilter)

          // Escludi lead che NON hanno NESSUN servizio in comune con l'utente
          if (matchResult.matchedServices.length === 0) {
            return false
          }
        }
      }

      return true
    })
  }

  // Carica filtri salvati dal localStorage all'avvio
  useEffect(() => {
    try {
      const savedFilters = localStorage.getItem('advancedFilters')
      if (savedFilters) {
        const parsedFilters = JSON.parse(savedFilters)
        setAdvancedFilters(parsedFilters)
      }
    } catch (error) {
      console.warn('Errore caricando filtri salvati:', error)
      localStorage.removeItem('advancedFilters')
    }
  }, [])

  // Pulisci filtri non disponibili per il piano utente
  useEffect(() => {
    if (!userProfile?.plan) return

    const hasAdvancedAccess = isProOrHigher(userProfile.plan)

    // Se l'utente non ha accesso ai filtri avanzati, resetta quelli che richiedono PRO
    if (!hasAdvancedAccess) {
      const needsReset =
        advancedFilters.hasEmail ||
        advancedFilters.hasPhone ||
        advancedFilters.technicalIssues.noGoogleAds ||
        advancedFilters.technicalIssues.noFacebookPixel ||
        advancedFilters.technicalIssues.slowLoading ||
        advancedFilters.technicalIssues.noSSL ||
        advancedFilters.crmFilters.onlyUncontacted ||
        advancedFilters.crmFilters.followUpOverdue ||
        advancedFilters.crmFilters.crmStatus !== 'all'

      if (needsReset) {
        const cleanedFilters = {
          ...advancedFilters,
          hasEmail: false,
          hasPhone: false,
          technicalIssues: {
            noGoogleAds: false,
            noFacebookPixel: false,
            slowLoading: false,
            noSSL: false
          },
          crmFilters: {
            onlyUncontacted: false,
            followUpOverdue: false,
            crmStatus: 'all'
          }
        }
        setAdvancedFilters(cleanedFilters)
        localStorage.setItem('advancedFilters', JSON.stringify(cleanedFilters))
      }
    }
  }, [userProfile?.plan])

  // ⚡ ULTRA-OTTIMIZZATO: Redirect ottimizzato per performance
  useEffect(() => {
    // ⚡ CONTROLLO IMMEDIATO: Se non c'è sessione o loading è false e nessun user, redirect veloce
    if (!loading && !user) {
      router.push('/login')
      return
    }
    
    // ⚡ TIMEOUT AGGRESSIVO: Se il loading dura troppo, mostra comunque la UI
    const maxLoadingTime = setTimeout(() => {
      if (loading && !user) {
        // Non possiamo forzare setLoading dal contesto, ma possiamo assumere che l'auth sia fallita
        router.push('/login')
      }
    }, 3000) // Dopo 3 secondi di loading, redirect per non bloccare
    
    return () => clearTimeout(maxLoadingTime)
  }, [user, loading, router])

  // Carica settings e leads - CON CONTROLLO ANTI-LOOP
  useEffect(() => {
    if (!user?.id) return
    
    // Evita chiamate multiple per lo stesso utente
    if (lastUserRef.current === user.id) return
    lastUserRef.current = user.id
    
    hasInitialized.current = true
    loadSettings()
    loadLeadsFromAPI(1, true) // Metodo API con paginazione
    loadUnlockedLeads() // Carica i lead sbloccati dal database
    loadAvailableCities() // Carica le città disponibili
  }, [user?.id]) // Solo user.id come dipendenza

  // useEffect per ripristinare la posizione dello scroll dopo sblocco
  useEffect(() => {
    if (scrollPosition > 0 && lastUnlockedLeadId) {
      const timer = setTimeout(() => {
        window.scrollTo({ 
          top: scrollPosition,
          behavior: 'smooth' 
        })
      }, 100) // Piccolo delay per assicurarsi che il DOM sia aggiornato

      // Timer per rimuovere l'effetto visivo dopo 2 secondi
      const effectTimer = setTimeout(() => {
        setLastUnlockedLeadId(null)
      }, 2000)

      return () => {
        clearTimeout(timer)
        clearTimeout(effectTimer)
      }
    }
  }, [unlockedLeads, scrollPosition, lastUnlockedLeadId])

  // Ricarica quando cambiano i filtri (con debounce più lungo per la ricerca) - CON CONTROLLO INIZIALIZZAZIONE
  useEffect(() => {
    if (!user?.id || !hasInitialized.current) return
    
    const timeoutId = setTimeout(() => {
      loadLeadsFromAPI(1, false) // Reset alla pagina 1, no cache per filtri
    }, 300) // Debounce di 300ms
    
    return () => clearTimeout(timeoutId)
  }, [filterCategory, filterCity, filterRole, searchTerm, showOnlyUnlocked, advancedFilters, sortBy, sortOrder])

  // Stato per indicatore di ricerca
  const [isSearching, setIsSearching] = useState(false)

  // Debounce intelligente per ricerca: minimo 3 caratteri o stringa vuota
  useEffect(() => {
    // Mostra indicatore di ricerca solo se stiamo per fare una ricerca valida
    if (searchInput.length === 0 || searchInput.length >= 3) {
      setIsSearching(true)
    }
    
    const timeoutId = setTimeout(() => {
      // Ricerca solo se stringa vuota (per resettare) o almeno 3 caratteri
      if (searchInput.length === 0 || searchInput.length >= 3) {
        setSearchTerm(searchInput)
      }
      setIsSearching(false)
    }, 1500) // Debounce di 1.5 secondi per dare tempo all'utente di digitare
    
    return () => {
      clearTimeout(timeoutId)
      setIsSearching(false)
    }
  }, [searchInput])

  // Carica il conteggio totale di TUTTI i lead (senza filtri) una sola volta
  const loadAllLeadsCount = async () => {
    if (!user) return
    
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) return
      
      const response = await fetch('/api/leads/count', {
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setAllLeadsCount(result.count)
        }
      }
    } catch (error) {
      console.error('Errore caricamento conteggio totale lead:', error)
    }
  }

  // Carica il conteggio totale solo una volta all'inizio
  useEffect(() => {
    if (user) {
      loadAllLeadsCount()
    }
  }, [user])

  // Mostra FirstTimeUserModal per nuovi utenti
  useEffect(() => {
    if (!user || !userProfile) return

    // Verifica se l'utente è nuovo (ha tutti i 5 crediti gratuiti e non ha mai visto il welcome)
    const hasSeenWelcome = localStorage.getItem('trovami_welcome_seen') === 'true'
    const isNewUser = userProfile.credits_remaining === 5 && userProfile.plan === 'free'

    if (isNewUser && !hasSeenWelcome) {
      // Mostra il modal dopo un breve delay per permettere alla pagina di caricarsi
      const timer = setTimeout(() => {
        setShowWelcomeModal(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [user, userProfile])

  // Funzione per eseguire ricerca immediata
  const executeSearch = () => {
    setSearchTerm(searchInput)
  }

  // Funzione per pulire ricerca
  const clearSearch = () => {
    setSearchInput('')
    setSearchTerm('')
  }

  // Carica le città disponibili usando RPC per bypassare RLS policy
  const loadAvailableCities = async () => {
    try {
      const { data, error } = await supabase.rpc('get_all_available_cities')
      
      if (error) throw error
      
      // La funzione RPC già restituisce città uniche e ordinate
      const uniqueCities = (data || [])
        .map((item: any) => item.city)
        .filter((city: any) => city && city.trim().length > 0)
      
      setAvailableCities(uniqueCities)
    } catch (error) {
      console.error('Errore caricamento città:', error)
    }
  }

  // Filtra città in base al termine di ricerca
  const filteredCities = availableCities.filter(city => 
    city.toLowerCase().includes(citySearchTerm.toLowerCase())
  ).slice(0, 10) // Limita a 10 risultati per performance

  // Chiudi dropdown città quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.city-dropdown-container') && 
          !target.closest('[data-dropdown-portal]')) {
        setShowCityDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Effetto per cambio pagina (usa cache se disponibile) - CON CONTROLLO INIZIALIZZAZIONE
  useEffect(() => {
    if (!user?.id || !hasInitialized.current || currentPage <= 1) return
    
    loadLeadsFromAPI(currentPage, true)
  }, [currentPage, user?.id]) // Senza loadLeadsFromAPI

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['free_limit', 'starter_limit', 'pro_limit'])

      if (data && data.length > 0) {
        const settingsObj = data.reduce((acc, item) => {
          acc[item.key as keyof Settings] = parseInt(item.value)
          return acc
        }, {} as Settings)
        
        const newSettings = {
          free_limit: settingsObj.free_limit || 5,
          starter_limit: settingsObj.starter_limit || 25,
          pro_limit: settingsObj.pro_limit || 100,
          agency_limit: settingsObj.agency_limit || 300
        }
        
        setSettings(newSettings)
      }
    } catch (error) {
      console.error('Errore caricamento settings:', error)
    }
  }

  // Carica i lead sbloccati dall'utente dal database
  const loadUnlockedLeads = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase.rpc('get_user_unlocked_leads', {
        p_user_id: user.id
      })

      if (error) {
        console.error('Errore caricamento lead sbloccati:', error)
        return
      }

      // Controlla che data sia definito e sia un array
      if (data && Array.isArray(data)) {
        const unlockedSet = new Set(data.map((item: any) => String(item.lead_id)))
        setUnlockedLeads(unlockedSet)
      }
    } catch (error) {
      console.error('Errore caricamento lead sbloccati:', error)
    }
  }

  const getPlanLimit = () => {
    const basePlan = getBasePlanType(user?.plan || '')
    switch (basePlan) {
      case 'starter': return settings.starter_limit
      case 'pro': return settings.pro_limit
      case 'agency': return settings.agency_limit
      default: return settings.free_limit
    }
  }

  const getAvailableCredits = () => {
    return user?.credits_remaining || 0
  }

  // Funzione per consumare un credito
  const consumeCredit = async (action: string, leadId?: string): Promise<boolean> => {
    if (!user) return false

    try {
      const { data, error } = await supabase
        .from('users')
        .update({ 
          credits_remaining: Math.max(0, (user.credits_remaining || 0) - 1)
        })
        .eq('id', user.id)
        .select()

      if (error) {
        console.error('Errore consumo credito:', error)
        return false
      }

      // Log dell'azione per audit
      await supabase
        .from('credit_usage_log')
        .insert({
          user_id: user.id,
          action: action,
          lead_id: leadId || null,
          credits_consumed: 1,
          credits_remaining: Math.max(0, (user.credits_remaining || 0) - 1),
          created_at: new Date().toISOString()
        })

      return true
    } catch (error) {
      console.error('Errore nel consumo credito:', error)
      return false
    }
  }

  // Funzione per aggiornare solo i crediti senza toccare il profilo completo
  const refreshCredits = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('credits_remaining')
        .eq('id', user?.id)
        .single()
      
      if (data && userProfile) {
        setUserProfile(prev => prev ? {
          ...prev,
          credits_remaining: data.credits_remaining
        } : null)
      }
    } catch (error) {
      console.error('Errore aggiornamento crediti:', error)
    }
  }

  // Aggiorna crediti ogni 30 secondi in background
  useEffect(() => {
    if (!user?.id) return
    
    const interval = setInterval(refreshCredits, 30000)
    return () => clearInterval(interval)
  }, [user?.id])
  const unlockLead = async (leadId: string) => {
    if (!user) return
    
    const remainingCredits = getAvailableCredits()
    if (remainingCredits <= 0) {
      alert('Non hai più crediti disponibili. Aggiorna il tuo piano per continuare.')
      router.push('/upgrade')
      return
    }

    // Salva la posizione corrente dello scroll
    setScrollPosition(window.scrollY)

    // Sblocca il lead usando l'API REST
    try {
      // Ottieni la sessione per il token
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        alert('Errore di autenticazione. Ricarica la pagina.')
        return
      }

      const response = await fetch(`/api/leads/${leadId}/unlock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies per l'autenticazione
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Errore API unlock:', data.error)
        alert(data.error || 'Errore nel sbloccare il lead. Riprova.')
        return
      }

      // Aggiorna solo il lead specifico nello stato invece di ricaricare tutto
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId 
            ? { ...lead, ...(data.lead || {}) } // Aggiorna con i dati restituiti dall'API se presenti
            : lead
        )
      )
      
      // Aggiorna lo stato dei lead sbloccati
      setUnlockedLeads(prev => {
        const newSet = new Set(prev)
        newSet.add(leadId)
        return newSet
      })

      // Imposta il lead come ultimo sbloccato per l'effetto visivo
      setLastUnlockedLeadId(leadId)
      
      // Aggiorna solo i crediti senza ricaricare tutto il profilo
      if (userProfile) {
        setUserProfile(prev => prev ? {
          ...prev,
          credits_remaining: Math.max(0, prev.credits_remaining - 1)
        } : null)
      }
    } catch (error) {
      console.error('Errore generale:', error)
      alert('Errore nel sbloccare il lead. Riprova.')
    }
  }

  // Gestione aggiornamento rapido stato CRM
  const handleQuickStatusUpdate = async (leadId: string, newStatus: CRMStatusType) => {
    if (!user) return
    
    setUpdatingCRM(leadId)
    
    try {
      // Ottieni il token corrente
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        alert('Sessione scaduta, effettua nuovamente il login')
        return
      }

      const response = await fetch('/api/crm/quick-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          leadId,
          status: newStatus,
          notes: `Stato aggiornato da dashboard a ${newStatus}`
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Aggiorna lo stato locale del lead
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === leadId 
              ? { ...lead, crm_status: newStatus }
              : lead
          )
        )
        
        // Mostra feedback positivo (senza alert per UX migliore)
        console.log(`Status CRM aggiornato con successo a "${newStatus}"`)
      } else {
        alert(`Errore: ${result.error}`)
      }
    } catch (error) {
      console.error('Errore aggiornamento CRM:', error)
      alert('Errore durante l\'aggiornamento dello stato CRM')
    } finally {
      setUpdatingCRM(null)
    }
  }



  // Funzioni per migliorare le informazioni delle card dei lead
  const translateCategory = (category: string) => {
    const translations: Record<string, string> = {
      // Traduzioni base
      'restaurants': 'Ristoranti',
      'plumbers': 'Idraulici', 
      'dentists': 'Dentisti',
      'lawyers': 'Avvocati',
      'photographers': 'Fotografi',
      'hotels': 'Hotel',
      'cafes': 'Bar e Caffè',
      'beauty': 'Bellezza',
      'fitness': 'Fitness',
      'mechanics': 'Meccanici',
      'electricians': 'Elettricisti',
      'construction': 'Edilizia',
      'real_estate': 'Immobiliare',
      'medical': 'Medico',
      'veterinary': 'Veterinario',
      'accounting': 'Contabilità',
      'insurance': 'Assicurazioni',
      'travel': 'Viaggi',
      'education': 'Istruzione',
      'automotive': 'Automotive',
      'retail': 'Retail',
      'technology': 'Tecnologia',
      'consulting': 'Consulenza',
      'finance': 'Finanza',
      'healthcare': 'Sanità',
      'entertainment': 'Intrattenimento',
      'sports': 'Sport',
      'fashion': 'Moda',
      'food': 'Alimentari',
      'home_services': 'Servizi Casa',
      'professional_services': 'Servizi Professionali',
      // Traduzioni specifiche per categorie che potrebbero apparire nel database
      'restaurant': 'Ristorante',
      'tuscan restaurant': 'Ristorante Toscano',
      'italian restaurant': 'Ristorante Italiano',
      'pizza restaurant': 'Pizzeria',
      'chinese restaurant': 'Ristorante Cinese',
      'japanese restaurant': 'Ristorante Giapponese',
      'sushi restaurant': 'Ristorante Sushi',
      'seafood restaurant': 'Ristorante di Pesce',
      'mediterranean restaurant': 'Ristorante Mediterraneo',
      'bar': 'Bar',
      'cafe': 'Caffè',
      'bakery': 'Panificio',
      'pizzeria': 'Pizzeria',
      'hotel': 'Hotel',
      'bed and breakfast': 'Bed & Breakfast',
      'apartment': 'Appartamento',
      'villa': 'Villa',
      'resort': 'Resort',
      'dentist': 'Dentista',
      'doctor': 'Medico',
      'medical center': 'Centro Medico',
      'pharmacy': 'Farmacia',
      'veterinarian': 'Veterinario',
      'lawyer': 'Avvocato',
      'law firm': 'Studio Legale',
      'notary': 'Notaio',
      'accountant': 'Commercialista',
      'beauty salon': 'Salone di Bellezza',
      'hair salon': 'Parrucchiere',
      'barber shop': 'Barbiere',
      'spa': 'Centro Benessere',
      'gym': 'Palestra',
      'fitness center': 'Centro Fitness',
      'personal trainer': 'Personal Trainer',
      'mechanic': 'Meccanico',
      'auto repair': 'Autofficina',
      'electrician': 'Elettricista',
      'plumber': 'Idraulico',
      'contractor': 'Impresa Edile',
      'real estate agency': 'Agenzia Immobiliare',
      'photographer': 'Fotografo',
      'travel agency': 'Agenzia Viaggi',
      'tour operator': 'Tour Operator',
      'school': 'Scuola',
      'university': 'Università',
      'training center': 'Centro Formazione',
      'clothing store': 'Negozio di Abbigliamento',
      'shoe store': 'Negozio di Scarpe',
      'electronics store': 'Negozio di Elettronica',
      'furniture store': 'Negozio di Mobili',
      'bookstore': 'Libreria',
      'florist': 'Fiorista',
      'pet store': 'Negozio Animali',
      'jewelry store': 'Gioielleria',
      'optician': 'Ottico',
      'other': 'Altro'
    }
    
    // Prova prima con la stringa esatta (case-insensitive)
    const exactMatch = translations[category.toLowerCase()]
    if (exactMatch) return exactMatch
    
    // Se non trova corrispondenza esatta, cerca parole chiave
    const categoryLower = category.toLowerCase()
    
    if (categoryLower.includes('restaurant') || categoryLower.includes('ristorante')) {
      if (categoryLower.includes('pizza')) return 'Pizzeria'
      if (categoryLower.includes('chinese') || categoryLower.includes('cinese')) return 'Ristorante Cinese'
      if (categoryLower.includes('japanese') || categoryLower.includes('giapponese')) return 'Ristorante Giapponese'
      if (categoryLower.includes('sushi')) return 'Ristorante Sushi'
      if (categoryLower.includes('seafood') || categoryLower.includes('pesce')) return 'Ristorante di Pesce'
      if (categoryLower.includes('tuscan') || categoryLower.includes('toscano')) return 'Ristorante Toscano'
      if (categoryLower.includes('italian') || categoryLower.includes('italiano')) return 'Ristorante Italiano'
      if (categoryLower.includes('mediterranean') || categoryLower.includes('mediterraneo')) return 'Ristorante Mediterraneo'
      return 'Ristorante'
    }
    
    if (categoryLower.includes('hotel') || categoryLower.includes('albergo')) return 'Hotel'
    if (categoryLower.includes('bar') && !categoryLower.includes('barber')) return 'Bar'
    if (categoryLower.includes('cafe') || categoryLower.includes('caffè')) return 'Caffè'
    if (categoryLower.includes('pizza')) return 'Pizzeria'
    if (categoryLower.includes('bakery') || categoryLower.includes('panificio')) return 'Panificio'
    if (categoryLower.includes('dentist') || categoryLower.includes('dentista')) return 'Dentista'
    if (categoryLower.includes('doctor') || categoryLower.includes('medico')) return 'Medico'
    if (categoryLower.includes('lawyer') || categoryLower.includes('avvocato')) return 'Avvocato'
    if (categoryLower.includes('beauty') || categoryLower.includes('bellezza')) return 'Salone di Bellezza'
    if (categoryLower.includes('hair') || categoryLower.includes('parrucchiere')) return 'Parrucchiere'
    if (categoryLower.includes('barber') || categoryLower.includes('barbiere')) return 'Barbiere'
    if (categoryLower.includes('gym') || categoryLower.includes('palestra')) return 'Palestra'
    if (categoryLower.includes('mechanic') || categoryLower.includes('meccanico')) return 'Meccanico'
    if (categoryLower.includes('electrician') || categoryLower.includes('elettricista')) return 'Elettricista'
    if (categoryLower.includes('plumber') || categoryLower.includes('idraulico')) return 'Idraulico'
    
    // Se non trova nessuna corrispondenza, capitalizza la prima lettera
    return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
  }

  const translateRole = (role: string) => {
    const translations: Record<string, string> = {
      'designer': 'Web Designer',
      'developer': 'Sviluppatore',
      'seo': 'SEO Specialist',
      'copywriter': 'Copywriter',
      'photographer': 'Fotografo',
      'adv': 'Advertising',
      'social': 'Social Media',
      'gdpr': 'Privacy/GDPR'
    }
    return translations[role.toLowerCase()] || role
  }

  const calculateProjectValue = (score: number, category: string) => {
    // Calcolo più articolato basato su score e categoria
    let baseValue = 0
    let maxValue = 0
    
    // Normalizza la categoria per il calcolo
    const normalizedCategory = category.toLowerCase()
    
    // Valori base per categoria
    const categoryMultipliers: Record<string, { base: number, max: number }> = {
      'restaurants': { base: 1500, max: 4000 },
      'restaurant': { base: 1500, max: 4000 },
      'tuscan restaurant': { base: 1800, max: 4500 },
      'italian restaurant': { base: 1700, max: 4200 },
      'pizza restaurant': { base: 1400, max: 3500 },
      'pizzeria': { base: 1400, max: 3500 },
      'bar': { base: 1200, max: 3000 },
      'cafe': { base: 1200, max: 3000 },
      'hotel': { base: 4000, max: 12000 },
      'hotels': { base: 4000, max: 12000 },
      'lawyers': { base: 2500, max: 8000 },
      'lawyer': { base: 2500, max: 8000 },
      'law firm': { base: 3000, max: 10000 },
      'medical': { base: 2000, max: 6000 },
      'dentist': { base: 2200, max: 6500 },
      'doctor': { base: 2000, max: 6000 },
      'real_estate': { base: 3000, max: 10000 },
      'real estate agency': { base: 3000, max: 10000 },
      'construction': { base: 2000, max: 7000 },
      'automotive': { base: 1800, max: 5000 },
      'mechanic': { base: 1500, max: 4000 },
      'retail': { base: 1200, max: 4000 },
      'clothing store': { base: 1300, max: 4200 },
      'technology': { base: 3500, max: 15000 },
      'finance': { base: 4000, max: 12000 },
      'healthcare': { base: 2500, max: 8000 },
      'education': { base: 1500, max: 5000 },
      'beauty': { base: 1400, max: 3800 },
      'beauty salon': { base: 1400, max: 3800 },
      'hair salon': { base: 1300, max: 3500 },
      'fitness': { base: 1600, max: 4500 },
      'gym': { base: 1600, max: 4500 },
      'photography': { base: 1800, max: 5000 },
      'photographer': { base: 1800, max: 5000 },
      'default': { base: 1000, max: 3000 }
    }
    
    // Cerca corrispondenza esatta prima
    let categoryValues = categoryMultipliers[normalizedCategory]
    
    // Se non trova corrispondenza esatta, cerca per parole chiave
    if (!categoryValues) {
      if (normalizedCategory.includes('restaurant') || normalizedCategory.includes('ristorante')) {
        categoryValues = categoryMultipliers['restaurant']
      } else if (normalizedCategory.includes('hotel') || normalizedCategory.includes('albergo')) {
        categoryValues = categoryMultipliers['hotel']
      } else if (normalizedCategory.includes('lawyer') || normalizedCategory.includes('avvocato')) {
        categoryValues = categoryMultipliers['lawyer']
      } else if (normalizedCategory.includes('medical') || normalizedCategory.includes('medico') || normalizedCategory.includes('dentist')) {
        categoryValues = categoryMultipliers['medical']
      } else if (normalizedCategory.includes('beauty') || normalizedCategory.includes('bellezza') || normalizedCategory.includes('hair')) {
        categoryValues = categoryMultipliers['beauty']
      } else if (normalizedCategory.includes('fitness') || normalizedCategory.includes('gym') || normalizedCategory.includes('palestra')) {
        categoryValues = categoryMultipliers['fitness']
      } else if (normalizedCategory.includes('mechanic') || normalizedCategory.includes('auto')) {
        categoryValues = categoryMultipliers['mechanic']
      } else if (normalizedCategory.includes('real estate') || normalizedCategory.includes('immobiliare')) {
        categoryValues = categoryMultipliers['real_estate']
      } else if (normalizedCategory.includes('technology') || normalizedCategory.includes('tech')) {
        categoryValues = categoryMultipliers['technology']
      } else {
        categoryValues = categoryMultipliers['default']
      }
    }
    
    // Più basso è il score, più alto è il valore del progetto
    if (score <= 20) {
      baseValue = Math.round(categoryValues.max * 0.8)
      maxValue = categoryValues.max
    } else if (score <= 40) {
      baseValue = Math.round(categoryValues.max * 0.6)
      maxValue = Math.round(categoryValues.max * 0.9)
    } else if (score <= 60) {
      baseValue = Math.round(categoryValues.max * 0.4)
      maxValue = Math.round(categoryValues.max * 0.7)
    } else {
      baseValue = Math.round(categoryValues.base * 0.8)
      maxValue = Math.round(categoryValues.max * 0.5)
    }
    
    return { min: baseValue, max: maxValue }
  }

  const getUrgencyLevel = (score: number) => {
    if (score <= 20) return { level: 'CRITICA', color: 'text-red-600', icon: '🚨' }
    if (score <= 40) return { level: 'ALTA', color: 'text-orange-600', icon: '⚡' }
    if (score <= 60) return { level: 'MEDIA', color: 'text-yellow-600', icon: '⚠️' }
    return { level: 'BASSA', color: 'text-green-600', icon: '💡' }
  }

  const getServicesNeeded = (score: number, category: string) => {
    const services = []
    
    if (score <= 30) {
      services.push('Rifacimento sito web completo')
      services.push('SEO tecnico urgente')
      services.push('Ottimizzazione performance')
    } else if (score <= 50) {
      services.push('Restyling sito web')
      services.push('Miglioramento SEO')
      services.push('Integrazione analytics')
    } else if (score <= 70) {
      services.push('Ottimizzazioni SEO')
      services.push('Miglioramento UX')
      services.push('Content marketing')
    } else {
      services.push('Ottimizzazioni minori')
      services.push('Manutenzione periodica')
    }
    
    // Servizi specifici per categoria
    if (category === 'restaurants') {
      services.push('Marketing locale')
      services.push('Social media management')
    } else if (category === 'lawyers') {
      services.push('Content legale')
      services.push('Compliance GDPR')
    } else if (category === 'medical') {
      services.push('Booking online')
      services.push('Telemedicina')
    }
    
    return services.slice(0, 3) // Max 3 servizi
  }

  const getConversionTips = (score: number) => {
    if (score <= 30) {
      return [
        'Sito con problemi critici - cliente molto ricettivo',
        'Probabilità di conversione: 85%',
        'Approccio: Urgenza e soluzioni immediate'
      ]
    } else if (score <= 50) {
      return [
        'Evidenti opportunità di miglioramento',
        'Probabilità di conversione: 70%', 
        'Approccio: Mostra ROI concreto'
      ]
    } else if (score <= 70) {
      return [
        'Potenziale di crescita identificato',
        'Probabilità di conversione: 55%',
        'Approccio: Focus su competitività'
      ]
    } else {
      return [
        'Opportunità di ottimizzazione minori',
        'Probabilità di conversione: 35%',
        'Approccio: Manutenzione e crescita'
      ]
    }
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      designer: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      developer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      seo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      copywriter: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      photographer: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
      adv: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      social: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
      gdpr: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
    }
    return colors[role] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
  }

  const getScoreColor = (score: number) => {
    if (score <= 30) return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
    if (score <= 50) return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
    if (score <= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
    return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
  }

  const getScoreLabel = (score: number) => {
    if (score <= 30) return 'Critico'
    if (score <= 50) return 'Alto Potenziale'
    if (score <= 70) return 'Buone Opportunità'
    return 'Basso Potenziale'
  }

  // === BULK SELECTION HELPERS ===
  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    )
  }

  const selectAllLeads = () => {
    const unlockedLeadIds = leads
      .filter(lead => unlockedLeads.has(lead.id))
      .map(lead => lead.id)
    setSelectedLeads(unlockedLeadIds)
  }

  const clearSelection = () => {
    setSelectedLeads([])
  }

  const handleExportCSV = (leadIds: string[]) => {
    const leadsToExport = leads.filter(lead => leadIds.includes(lead.id))
    const headers = ['business_name', 'website_url', 'email', 'phone', 'city', 'category', 'score']
    const rows = leadsToExport.map(lead =>
      headers.map(h => {
        const value = lead[h as keyof Lead]
        if (value === null || value === undefined) return ''
        return String(value).replace(/"/g, '""')
      })
    )

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'leads_export.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    // Clear selection after export
    setSelectedLeads([])
  }

  const handleBulkStatusChange = async (leadIds: string[], newStatus: string) => {
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) return

      // Update each lead's status
      for (const leadId of leadIds) {
        await fetch('/api/crm/quick-update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session.access_token}`
          },
          body: JSON.stringify({
            leadId,
            status: newStatus
          })
        })
      }

      // Refresh leads
      loadLeadsFromAPI(currentPage, false)
      setSelectedLeads([])
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }
  // === END BULK SELECTION HELPERS ===

  const getPlanBadge = () => {
    const badges = {
      free: { label: 'Free', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', icon: null },
      starter: { label: 'Starter', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: Zap },
      pro: { label: 'Pro', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', icon: Crown },
      agency: { label: 'Agency', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', icon: Crown }
    }
    const basePlan = getBasePlanType(user?.plan || '')
    return badges[basePlan as keyof typeof badges] || badges.free
  }

  // Opzioni per i filtri - per ora uso i dati della pagina corrente
  // TODO: In futuro potremmo creare un endpoint separato per ottenere tutte le categorie/città
  const categories = Array.from(new Set(leads.map(lead => lead.category)))
  const cities = Array.from(new Set(leads.map(lead => lead.city)))
  const roles = ['designer', 'developer', 'seo', 'copywriter', 'photographer', 'adv', 'social', 'gdpr']

  // Opzioni di ordinamento
  const sortOptions = [
    { value: 'score', label: 'Punteggio (peggiore prima)', order: 'asc' },
    { value: 'score', label: 'Punteggio (migliore prima)', order: 'desc' },
    { value: 'created_at', label: 'Data inserimento (più recenti)', order: 'desc' },
    { value: 'created_at', label: 'Data inserimento (meno recenti)', order: 'asc' },
    { value: 'last_seen_at', label: 'Ultimo aggiornamento (più recenti)', order: 'desc' },
    { value: 'business_name', label: 'Nome azienda (A-Z)', order: 'asc' },
    { value: 'business_name', label: 'Nome azienda (Z-A)', order: 'desc' }
  ]

  const getCurrentSortLabel = () => {
    const currentSort = sortOptions.find(opt => opt.value === sortBy && opt.order === sortOrder)
    return currentSort?.label || 'Ordina per...'
  }

  // ⚡ ULTRA-VELOCITÀ: Rendering semplice e diretto (ora che l'auth è veloce con cache)
  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Caricamento ultra-veloce dashboard...</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">Cache intelligente attiva</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const planBadge = getPlanBadge()
  const currentLimit = getPlanLimit()
  const remainingCredits = getAvailableCredits()

  // Check se utente è nuovo (ha tutti i 5 crediti gratuiti = non ha mai usato il tool)
  const isNewUser = userProfile?.credits_remaining === 5 && userProfile?.plan === 'free'

  // Lead consigliati per nuovi utenti (primi 3 lead con score alto)
  const recommendedLeads = isNewUser ? leads.filter(l => l.score >= 50).slice(0, 3) : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 pt-24">

      {/* Bulk Actions Bar - appare quando ci sono lead selezionati */}
      <BulkActionsBar
        selectedLeads={selectedLeads}
        leads={leads}
        onClearSelection={clearSelection}
        onSelectAll={selectAllLeads}
        totalLeads={leads.filter(l => unlockedLeads.has(l.id)).length}
        allSelected={selectedLeads.length === leads.filter(l => unlockedLeads.has(l.id)).length && selectedLeads.length > 0}
        onExportCSV={handleExportCSV}
        onBulkStatusChange={isProOrHigher(userProfile?.plan || 'free') ? handleBulkStatusChange : undefined}
      />

      {/* Hero Section */}
      <div className="pb-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              I tuoi <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Lead</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Scopri aziende con problemi tecnici sui loro siti web e convertile in clienti
            </p>
          </div>

          {/* Stats Cards */}
          <div id="dashboard-stats" data-tour="dashboard-stats" className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-12">
            {/* Piano Attuale */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Piano Attuale</p>
                  <div className="flex items-center space-x-2">
                    {planBadge.icon && <planBadge.icon className="h-5 w-5" />}
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${planBadge.color}`}>
                      {planBadge.label}
                    </span>
                  </div>
                </div>
                <Settings className="h-8 w-8 text-gray-400" />
              </div>
            </div>

            {/* Crediti Rimanenti */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Crediti</p>
                  <p className={`text-2xl font-bold mb-1 ${remainingCredits <= 1 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                    {remainingCredits}
                  </p>
                  {remainingCredits <= 1 && getBasePlanType(user?.plan || '') !== 'free' &&  (
                    <p className="text-xs text-red-500 font-medium">Crediti in esaurimento!</p>
                  )}
                </div>
                <CreditCard className={`h-8 w-8 ${remainingCredits <= 1 ? 'text-red-500' : 'text-blue-500'}`} />
              </div>
              {remainingCredits === 0 && (
                <button
                  onClick={() => router.push('/upgrade')}
                  className="mt-3 w-full bg-red-500 hover:bg-red-600 text-white text-sm py-2 rounded-lg transition-colors"
                >
                  Ricarica Crediti
                </button>
              )}
            </div>

            {/* Reset Crediti */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Prossimo Reset</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user?.credits_reset_date ? getDaysUntilReset(user) : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.credits_reset_date ? 'giorni' : 'Non disponibile'}
                  </p>
                </div>
                <RefreshCw className="h-8 w-8 text-green-500" />
              </div>
              {user?.credits_reset_date && (
                <p className="text-xs text-gray-500 mt-2">
                  {formatResetDate(user)}
                </p>
              )}
            </div>
            

            {/* Lead Disponibili */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Lead Disponibili</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalLeads}</p>
                    {totalLeads !== allLeadsCount && allLeadsCount > 0 && (
                      <span className="text-sm text-gray-500">/ {allLeadsCount}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {totalLeads !== allLeadsCount && allLeadsCount > 0 
                      ? 'filtrati / totali nel database'
                      : 'totali nel database'
                    }
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
            </div>

            {/* Lead Sbloccati */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Lead Sbloccati</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{unlockedLeads.size}</p>
                  <p className="text-xs text-gray-500">
                    {unlockedLeads.size > 0 
                      ? `${Math.round((unlockedLeads.size / Math.max(totalLeads, 1)) * 100)}% del totale`
                      : 'Nessuno ancora'
                    }
                  </p>
                </div>
                <div className="relative">
                  <Eye className="h-8 w-8 text-blue-500" />
                  {unlockedLeads.size > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
              {unlockedLeads.size > 0 && (
                <button
                  onClick={() => setShowOnlyUnlocked(true)}
                  className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 rounded-lg transition-colors"
                >
                  Visualizza Solo Sbloccati
                </button>
              )}
            </div>

            {/* Upgrade Button */}
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 mb-1 text-sm">Vuoi di più?</p>
                  <p className="font-semibold">Upgrade Piano</p>
                </div>
                <button
                  onClick={() => router.push('/upgrade')}
                  className="bg-white/20 hover:bg-white/30 rounded-xl p-2 transition-colors"
                >
                  <Crown className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Banner Urgenza per Upgrade (solo utenti free) */}
          {getBasePlanType(user?.plan || '') === 'free' && (
            <div className="mb-8">
              <UpgradeUrgencyBanner variant="compact" />
            </div>
          )}

          {/* Sezione Lead Consigliati per Nuovi Utenti */}
          {isNewUser && recommendedLeads.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <span className="mr-2">🎯</span>
                    Lead Consigliati per Te
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Abbiamo selezionato questi lead con alta opportunità per iniziare
                  </p>
                </div>
                <div className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 px-3 py-1 rounded-full text-sm font-medium">
                  {recommendedLeads.length} lead
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recommendedLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-green-100 dark:border-green-700 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {lead.business_name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {lead.category} • {lead.city}
                        </p>
                      </div>
                      <div className={`flex-shrink-0 ml-2 px-2 py-1 rounded-full text-xs font-bold ${
                        lead.score >= 70
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                          : lead.score >= 50
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                      }`}>
                        {lead.score}
                      </div>
                    </div>

                    {/* Tooltip Perché questo lead */}
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2 mb-3">
                      <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                        💡 Perché questo lead?
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Score {lead.score} = sito con problemi tecnici risolvibili
                      </p>
                    </div>

                    <button
                      onClick={() => unlockLead(lead.id)}
                      disabled={unlockedLeads.has(lead.id) || remainingCredits === 0}
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                        unlockedLeads.has(lead.id)
                          ? 'bg-green-100 text-green-700 cursor-default'
                          : remainingCredits === 0
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {unlockedLeads.has(lead.id)
                        ? '✓ Sbloccato'
                        : remainingCredits === 0
                          ? 'Crediti esauriti'
                          : '🔓 Sblocca (1 credito)'
                      }
                    </button>
                  </div>
                ))}
              </div>

              {/* Preview Template Email */}
              <div className="mt-6">
                <EmailTemplatePreview />
              </div>

              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Scorri in basso per vedere tutti i {totalLeads} lead disponibili →
                </p>
              </div>
            </div>
          )}

          {/* Banner Informativo sui Crediti */}
          {remainingCredits <= 2 && remainingCredits > 0 && getBasePlanType(user?.plan || '') !== 'free' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-8">
              <div className="flex items-center space-x-3">
                <div className="bg-yellow-100 rounded-full p-2">
                  <CreditCard className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-yellow-800 font-semibold">Crediti in esaurimento</h3>
                  <p className="text-yellow-700 text-sm">
                    Ti rimangono solo {remainingCredits} crediti. Ogni azione (sblocca dettagli) costa 1 credito.
                  </p>
                </div>
                <button
                  onClick={() => router.push('/upgrade')}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Ricarica Ora
                </button>
              </div>
            </div>
          )}

          {/* Filtri e Controlli */}
          <TourTarget tourId="dashboard-filters" className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 mb-8 overflow-visible relative">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              {/* Search */}
              <TourTarget tourId="dashboard-search" className="relative flex-1 max-w-md">
                <Search className={`absolute left-3 top-3 h-5 w-5 transition-colors ${
                  isSearching ? 'text-blue-500 animate-pulse' : 'text-gray-400'
                }`} />
                <input
                  data-tour="dashboard-search"
                  type="text"
                  placeholder={searchInput.length > 0 && searchInput.length < 3 ? "Digita almeno 3 caratteri..." : "Cerca aziende..."}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && executeSearch()}
                  className={`w-full pl-10 pr-20 py-3 bg-gray-50 dark:bg-gray-900/50 border transition-colors text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    searchInput.length > 0 && searchInput.length < 3 
                      ? 'border-yellow-300 dark:border-yellow-600' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                />
                {searchInput && (
                  <div className="absolute right-2 top-2 flex items-center space-x-1">
                    {searchInput.length > 0 && searchInput.length < 3 && (
                      <span className="text-xs text-yellow-600 dark:text-yellow-400 mr-1">
                        {3 - searchInput.length} car.
                      </span>
                    )}
                    {isSearching && searchInput.length >= 3 && (
                      <div className="flex items-center text-xs text-blue-600 dark:text-blue-400 mr-1">
                        <div className="animate-spin h-3 w-3 border border-blue-600 border-t-transparent rounded-full mr-1"></div>
                        Ricerca...
                      </div>
                    )}
                    <button
                      onClick={executeSearch}
                      className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                      title="Cerca ora"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                    <button
                      onClick={clearSearch}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Pulisci"
                    >
                      ×
                    </button>
                  </div>
                )}
                {searchTerm && searchTerm !== searchInput && (
                  <div className="absolute top-full left-0 mt-1 text-xs text-blue-600 dark:text-blue-400">
                    Cercando: "{searchTerm}"
                  </div>
                )}
              </TourTarget>

              {/* Actions */}
              <div className="flex items-center space-x-3">
                {/* Toggle per lead sbloccati */}
                <TourTarget tourId="dashboard-filter-toggle" className="flex items-center space-x-2">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOnlyUnlocked}
                      onChange={(e) => setShowOnlyUnlocked(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${
                      showOnlyUnlocked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                        showOnlyUnlocked ? 'translate-x-5' : 'translate-x-0'
                      }`}></div>
                    </div>
                  </label>
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    Solo sbloccati
                  </span>
                  {showOnlyUnlocked && (
                    <div className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      ✓ Attivo
                    </div>
                  )}
                </TourTarget>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Filter className="h-4 w-4" />
                  <span>Filtri</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Ordinamento */}
                <div className="relative">
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [newSortBy, newSortOrder] = e.target.value.split('-')
                      setSortBy(newSortBy as 'score' | 'created_at' | 'last_seen_at' | 'business_name')
                      setSortOrder(newSortOrder as 'asc' | 'desc')
                    }}
                    className="appearance-none bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    {sortOptions.map((option, index) => (
                      <option key={index} value={`${option.value}-${option.order}`}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>

                {/* View Switcher */}
                <ViewSwitcher
                  currentView={currentView}
                  onViewChange={setCurrentView}
                  availableViews={['list', 'grid', 'tinder']}
                  showLabels={false}
                  size="md"
                />

                {/* Export Dropdown */}
                <ExportDropdown
                  leads={leads.filter(l => unlockedLeads.has(l.id))}
                  selectedLeadIds={selectedLeads.length > 0 ? selectedLeads : undefined}
                />

                <TourTarget tourId="dashboard-refresh" className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors">
                  <button
                    onClick={() => loadLeadsFromAPI(currentPage, false)}
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Aggiorna</span>
                  </button>
                </TourTarget>


              </div>
            </div>

            {/* Filtri Espandibili */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 overflow-visible">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categoria</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-gray-900 dark:text-white"
                    >
                      <option value="">Tutte le categorie</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{translateCategory(category)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="relative z-50">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Città</label>
                    <div className="relative city-dropdown-container">
                      <input
                        ref={cityInputRef}
                        type="text"
                        placeholder="Cerca città..."
                        value={citySearchTerm}
                        onChange={(e) => {
                          setCitySearchTerm(e.target.value)
                          setShowCityDropdown(true)
                        }}
                        onFocus={() => setShowCityDropdown(true)}
                        className="w-full p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      />
                      {filterCity && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <button
                            onClick={() => {
                              setFilterCity('')
                              setCitySearchTerm('')
                            }}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      )}
                      {/* Dropdown renderizzato con Portal */}
                      {showCityDropdown && filteredCities.length > 0 && typeof window !== 'undefined' && createPortal(
                        <div 
                          data-dropdown-portal
                          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-100"
                          style={{
                            position: 'absolute',
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            width: dropdownPosition.width,
                            zIndex: 99999,
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                          }}
                        >
                          {filteredCities.map((city) => (
                            <button
                              key={city}
                              onClick={() => {
                                setFilterCity(city)
                                setCitySearchTerm(city)
                                setShowCityDropdown(false)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white first:rounded-t-xl last:rounded-b-xl"
                            >
                              {city}
                            </button>
                          ))}
                        </div>,
                        document.body
                      )}
                    </div>
                    {filterCity && (
                      <div className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                        Filtrando per: {filterCity}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ruolo Necessario</label>
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-gray-900 dark:text-white"
                    >
                      <option value="">Tutti i ruoli</option>
                      {roles.map(role => (
                        <option key={role} value={role}>{translateRole(role)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Nuovo Sistema Filtri Avanzati - Nascosto per nuovi utenti */}
            {!isNewUser && (
              <AdvancedFilters
                isOpen={showAdvancedFilters}
                onToggle={() => setShowAdvancedFilters(!showAdvancedFilters)}
                filters={advancedFilters}
                onFiltersChange={(filters: AdvancedFiltersState) => setAdvancedFilters(filters)}
                leadCount={leads.length}
                userPlan={userProfile?.plan}
              />
            )}
          </TourTarget>

          {/* Lista Lead */}
          <TourTarget tourId="dashboard-lead-list" className="space-y-4">
            {(() => {
              // Applica filtro per lead sbloccati se attivo
              let filteredLeads = showOnlyUnlocked
                ? leads.filter(lead => unlockedLeads.has(lead.id))
                : leads

              // Applica filtri avanzati lato client (in aggiunta a quelli server-side)
              // Questo serve come fallback e per garantire consistenza
              filteredLeads = applyAdvancedFilters(filteredLeads)

              // Mantieni l'ordine naturale quando non usiamo il filtro "solo sbloccati"
              // Il riordinamento avviene solo quando si attiva il toggle specifico

              if (filteredLeads.length === 0) {
                return (
                  <div className="text-center py-12">
                    <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {showOnlyUnlocked ? 'Nessun lead sbloccato trovato' : 'Nessun lead trovato'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {showOnlyUnlocked
                        ? 'Sblocca alcuni lead per vederli qui, oppure disattiva il filtro'
                        : 'Prova a modificare i filtri o aggiorna i dati'}
                    </p>
                  </div>
                )
              }

              // === TINDER VIEW ===
              if (currentView === 'tinder') {
                // Filtra solo lead non ancora sbloccati per il Tinder mode
                const tinderLeads = filteredLeads.filter(lead => !unlockedLeads.has(lead.id))

                // Servizi offerti dall'utente
                const userServicesOffered = (user?.services_offered || []) as ServiceType[]

                return (
                  <div className="h-[70vh] min-h-[500px]">
                    <TinderStack
                      leads={tinderLeads}
                      userServices={userServicesOffered}
                      creditsRemaining={user?.credits_remaining || 0}
                      onUnlock={async (leadId) => {
                        // Usa la logica di sblocco esistente
                        const remainingCredits = getAvailableCredits()
                        if (remainingCredits <= 0) {
                          return { success: false }
                        }

                        try {
                          const session = await supabase.auth.getSession()
                          if (!session.data.session) {
                            return { success: false }
                          }

                          const response = await fetch(`/api/leads/${leadId}/unlock`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${session.data.session.access_token}`
                            }
                          })

                          if (!response.ok) {
                            return { success: false }
                          }

                          const result = await response.json()

                          // Aggiorna stato locale
                          setUnlockedLeads(prev => new Set([...prev, leadId]))

                          // Aggiorna entrambi i profili per mantenerli sincronizzati
                          await refreshProfile()
                          setUserProfile(prev => prev ? {
                            ...prev,
                            credits_remaining: Math.max(0, prev.credits_remaining - 1)
                          } : null)

                          return {
                            success: true,
                            phone: result.phone,
                            email: result.email
                          }
                        } catch (error) {
                          console.error('Errore sblocco:', error)
                          return { success: false }
                        }
                      }}
                      onSkip={(leadId) => {
                        // Per ora solo logga lo skip - in futuro potrebbe salvare preferenza
                        console.log('Lead skipped:', leadId)
                      }}
                      onArchive={async (leadId) => {
                        // Archivia il lead
                        try {
                          await supabase
                            .from('leads')
                            .update({ status: 'archived' })
                            .eq('id', leadId)
                        } catch (error) {
                          console.error('Errore archiviazione:', error)
                        }
                      }}
                      onRefresh={() => loadLeadsFromAPI(1, false)}
                    />
                  </div>
                )
              }

              // === GRID VIEW ===
              if (currentView === 'grid') {
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredLeads.map((lead, index) => (
                      <div
                        key={lead.id}
                        {...(index === 0 ? { id: 'dashboard-first-lead', 'data-tour': 'lead-card' } : {})}
                      >
                        <LeadCard
                          lead={lead}
                          isUnlocked={unlockedLeads.has(lead.id)}
                          isSelected={selectedLeads.includes(lead.id)}
                          isProUser={isProOrHigher(userProfile?.plan || 'free')}
                          onUnlock={(lead) => unlockLead(lead.id)}
                          onView={(lead) => router.push(`/lead/${lead.id}`)}
                          onSelect={toggleLeadSelection}
                          onContact={(lead, method) => {
                            if (method === 'email' && lead.email) {
                              window.location.href = `mailto:${lead.email}`
                            } else if (method === 'phone' && lead.phone) {
                              window.location.href = `tel:${lead.phone}`
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )
              }

              // === LIST VIEW ===
              return (
                <div className="space-y-3">
                  {filteredLeads.map((lead, index) => (
                    <LeadCardCompact
                      key={lead.id}
                      lead={lead}
                      isUnlocked={unlockedLeads.has(lead.id)}
                      isSelected={selectedLeads.includes(lead.id)}
                      onUnlock={(lead) => unlockLead(lead.id)}
                      onView={(lead) => router.push(`/lead/${lead.id}`)}
                      onSelect={toggleLeadSelection}
                      className={index === 0 ? 'dashboard-first-lead' : ''}
                    />
                  ))}
                </div>
              )
            })()}
          </TourTarget>

          {/* Controlli Paginazione */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((currentPage - 1) * LEADS_PER_PAGE) + 1} to {Math.min(currentPage * LEADS_PER_PAGE, totalLeads)} of {totalLeads} leads
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                    if (pageNum > totalPages) return null
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          pageNum === currentPage
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FirstTimeUserModal per nuovi utenti */}
      <FirstTimeUserModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        onStartTour={() => startTour('dashboard', true)}
        userName={user?.email?.split('@')[0]}
        creditsRemaining={user?.credits_remaining || 5}
      />
    </div>
  )
}
