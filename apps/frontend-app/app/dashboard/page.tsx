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
import { TourTarget } from '@/components/onboarding/TourTarget'
import UpgradeUrgencyBanner from '@/components/UpgradeUrgencyBanner'

interface Lead extends LeadWithCRM {
  phone?: string
  email?: string
  address?: string
  last_seen_at?: string
  needed_roles?: string[] // Può essere null o undefined
  issues?: string[] // Può essere null o undefined
}

interface Settings {
  free_limit: number
  starter_limit: number
  pro_limit: number
}

export default function ClientDashboard() {
  const { user, loading, refreshProfile } = useAuth()
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [settings, setSettings] = useState<Settings>({ free_limit: 2, starter_limit: 50, pro_limit: 200 })
  
  // Stato per paginazione
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLeads, setTotalLeads] = useState(0)
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

  // Filtri avanzati
  const [filterNoWebsite, setFilterNoWebsite] = useState(false)
  const [filterNoPixel, setFilterNoPixel] = useState(false)
  const [filterNoAnalytics, setFilterNoAnalytics] = useState(false)
  const [filterNoPrivacy, setFilterNoPrivacy] = useState(false)
  const [filterLowScore, setFilterLowScore] = useState(false)

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
      const cacheKey = `leads-${page}-${filterCategory}-${filterCity}-${filterRole}-${searchTerm}-${showOnlyUnlocked}-${filterNoWebsite}-${filterNoPixel}-${filterNoAnalytics}-${filterNoPrivacy}-${filterLowScore}-${sortBy}-${sortOrder}`
      if (useCache && localStorage.getItem(cacheKey)) {
        try {
          const cached = JSON.parse(localStorage.getItem(cacheKey)!)
          if (Date.now() - cached.timestamp < 30000) { // Cache per 30 secondi
            setLeads(cached.data.leads)
            setUserProfile(cached.data.user_profile)
            setTotalLeads(cached.data.pagination.total)
            setTotalPages(cached.data.pagination.totalPages)
            setCurrentPage(cached.data.pagination.page)
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
        ...(filterNoWebsite && { noWebsite: '1' }),
        ...(filterNoPixel && { noPixel: '1' }),
        ...(filterNoAnalytics && { noAnalytics: '1' }),
        ...(filterNoPrivacy && { noPrivacy: '1' }),
        ...(filterLowScore && { lowScore: '1' }),
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
  }, [filterCategory, filterCity, filterRole, searchTerm, showOnlyUnlocked, filterNoWebsite, filterNoPixel, filterNoAnalytics, filterNoPrivacy, filterLowScore, sortBy, sortOrder])

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

  // Funzione per eseguire ricerca immediata
  const executeSearch = () => {
    setSearchTerm(searchInput)
  }

  // Funzione per pulire ricerca
  const clearSearch = () => {
    setSearchInput('')
    setSearchTerm('')
  }

  // Carica le città disponibili
  const loadAvailableCities = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('city')
        .not('city', 'is', null)
        .not('city', 'eq', '')
        .order('city')
      
      if (error) throw error
      
      // Rimuovi duplicati e ordina
      const citySet = new Set(data.map(item => item.city))
      const uniqueCities = Array.from(citySet)
        .filter(city => city && city.trim().length > 0)
        .sort()
      
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
          free_limit: settingsObj.free_limit || 2,
          starter_limit: settingsObj.starter_limit || 50,
          pro_limit: settingsObj.pro_limit || 200
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
    switch (user?.plan) {
      case 'starter': return settings.starter_limit
      case 'pro': return settings.pro_limit
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

  const getPlanBadge = () => {
    const badges = {
      free: { label: 'Free', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', icon: null },
      starter: { label: 'Starter', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: Zap },
      pro: { label: 'Pro', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', icon: Crown }
    }
    return badges[user?.plan as keyof typeof badges] || badges.free
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 pt-24">
      
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
                  {remainingCredits <= 1 && (
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
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalLeads}</p>
                  <p className="text-xs text-gray-500">totali nel database</p>
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
          {user?.plan === 'free' && (
            <div className="mb-8">
              <UpgradeUrgencyBanner variant="compact" />
            </div>
          )}

          {/* Banner Informativo sui Crediti */}
          {remainingCredits <= 2 && remainingCredits > 0 && (
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
                {/* Filtri avanzati */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="filterNoWebsite" checked={filterNoWebsite} onChange={e => setFilterNoWebsite(e.target.checked)} />
                    <label htmlFor="filterNoWebsite" className="text-sm text-gray-700 dark:text-gray-300">Senza sito web</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="filterNoPixel" checked={filterNoPixel} onChange={e => setFilterNoPixel(e.target.checked)} />
                    <label htmlFor="filterNoPixel" className="text-sm text-gray-700 dark:text-gray-300">Senza pixel tracking</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="filterNoAnalytics" checked={filterNoAnalytics} onChange={e => setFilterNoAnalytics(e.target.checked)} />
                    <label htmlFor="filterNoAnalytics" className="text-sm text-gray-700 dark:text-gray-300">Senza analytics</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="filterNoPrivacy" checked={filterNoPrivacy} onChange={e => setFilterNoPrivacy(e.target.checked)} />
                    <label htmlFor="filterNoPrivacy" className="text-sm text-gray-700 dark:text-gray-300">Senza privacy policy</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="filterLowScore" checked={filterLowScore} onChange={e => setFilterLowScore(e.target.checked)} />
                    <label htmlFor="filterLowScore" className="text-sm text-gray-700 dark:text-gray-300">Score basso (&lt;= 40)</label>
                  </div>
                </div>
              </div>
            )}
          </TourTarget>

          {/* Lista Lead */}
          <TourTarget tourId="dashboard-lead-list" className="space-y-4">
            {(() => {
              // Applica filtro per lead sbloccati se attivo
              let filteredLeads = showOnlyUnlocked 
                ? leads.filter(lead => unlockedLeads.has(lead.id))
                : leads

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

              return filteredLeads.map((lead, index) => {
                const isUnlocked = unlockedLeads.has(lead.id)
                const isLastUnlocked = lastUnlockedLeadId === lead.id
                
                // Gestisce l'id in base al caso
                const cardProps = index === 0 
                  ? { id: 'dashboard-first-lead', 'data-tour': 'dashboard-first-lead' }
                  : { id: `lead-${lead.id}` }
                
                return (
                  <div
                    key={lead.id}
                    {...cardProps}
                    className={`bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border transition-all duration-300 ${
                      isLastUnlocked 
                        ? 'ring-2 ring-green-500 ring-offset-2 border-green-200 dark:border-green-700 shadow-lg shadow-green-100 dark:shadow-green-900/20'
                        : isUnlocked 
                        ? 'border-green-200 dark:border-green-700 shadow-lg shadow-green-100 dark:shadow-green-900/20'
                        : 'border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                        {/* Info Principale */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            {isUnlocked ? (
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {lead.business_name}
                              </h3>
                            ) : (
                              <div className="flex items-center space-x-3">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                  🔒 {translateCategory(lead.category)} in {lead.city}
                                </h3>
                                <div className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold rounded-full animate-pulse">
                                  LEAD QUALIFICATO
                                </div>
                              </div>
                            )}
                            <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getScoreColor(lead.score)}`}>
                              {getScoreLabel(lead.score)} ({lead.score})
                            </div>
                            {isUnlocked && (
                              <div className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full border border-green-200">
                                ✓ Sbloccato
                              </div>
                            )}
                          </div>
                          
                          {/* Badge CRM Status per utenti PRO - Solo per lead sbloccati */}
                          {isUnlocked && userProfile?.plan === 'pro' && (
                            <div className="mb-3">
                              <LeadStatusBadge 
                                status={lead.crm_status} 
                                nextFollowUp={lead.next_follow_up}
                                size="sm"
                              />
                            </div>
                          )}
                        
                        {/* Informazioni strategiche per incentivare lo sblocco */}
                        {!isUnlocked ? (
                          <div className="space-y-3">
                            {/* Problemi identificati */}
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                              <span className="text-sm font-medium text-red-600">
                                {lead.score <= 20 ? 'Sito con gravi problemi tecnici critici' : 
                                 lead.score <= 40 ? 'Problemi SEO e performance critici identificati' :
                                 lead.score <= 60 ? 'Opportunità di miglioramento evidenti' :
                                 'Potenziale cliente con margini di crescita'}
                              </span>
                            </div>
                            
                            {/* Valore stimato articolato */}
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                💰 Valore progetto stimato: €{(() => {
                                  const { min, max } = calculateProjectValue(lead.score, lead.category)
                                  return `${min.toLocaleString()}-${max.toLocaleString()}`
                                })()}
                              </span>
                            </div>
                            
                            {/* Urgenza con emoji dinamica */}
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {(() => {
                                  const urgency = getUrgencyLevel(lead.score)
                                  return `${urgency.icon} Priorità: ${urgency.level}`
                                })()}
                              </span>
                            </div>
                            
                            {/* Servizi suggeriti più specifici */}
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                🎯 Servizi richiesti: {(() => {
                                  const services = getServicesNeeded(lead.score, lead.category)
                                  return services.slice(0, 2).join(', ')
                                })()}
                              </span>
                            </div>

                            {/* Suggerimenti per la conversione */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg p-3 mt-2">
                              <div className="flex items-start space-x-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                                <div className="flex-1">
                                  <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
                                    📈 Analisi commerciale
                                  </h4>
                                  <div className="space-y-1">
                                    {getConversionTips(lead.score).map((tip, i) => (
                                      <div key={i} className="text-xs text-blue-700 dark:text-blue-300">
                                        • {tip}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                            <div className="flex items-center space-x-1">
                              <ExternalLink className="h-4 w-4" />
                              <span className="hover:text-blue-600 transition-colors">
                                {lead.website_url}
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>{lead.city}</span>
                            </div>
                            
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full">
                              {translateCategory(lead.category)}
                            </span>
                          </div>
                        )}

                        {/* Contatti - Solo se sbloccato */}
                        {isUnlocked ? (
                          <div className="flex flex-wrap gap-4 mb-3">
                            {lead.phone && typeof lead.phone === 'string' && lead.phone.trim() !== '' && (
                              <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                                <Phone className="h-4 w-4" />
                                <span>{lead.phone}</span>
                              </div>
                            )}
                            {lead.email && typeof lead.email === 'string' && lead.email.trim() !== '' && lead.email !== 'null' && (
                              <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                                <Mail className="h-4 w-4" />
                                <span>{lead.email}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-xl p-4 mt-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                {/* Contiamo i dati disponibili SOLO se il piano li supporta */}
                                {(() => {
                                  const userPlan = userProfile?.plan || 'free'
                                  const isProOrAdmin = userPlan === 'pro' || userProfile?.role === 'admin'
                                  
                                  // Solo per piani Pro/Admin controlliamo i contatti (perché l'API li restituisce)
                                  if (isProOrAdmin) {
                                    // Verifica più rigorosa: controlla che i campi esistano e non siano vuoti
                                    const hasPhone = lead.phone && typeof lead.phone === 'string' && lead.phone.trim() !== ''
                                    const hasEmail = lead.email && typeof lead.email === 'string' && lead.email.trim() !== '' && lead.email !== 'null'
                                    const hasAddress = lead.address && typeof lead.address === 'string' && lead.address.trim() !== ''
                                    
                                    const availableContacts = [
                                      hasPhone && '📱 Numero di telefono diretto',
                                      hasEmail && '✉️ Email aziendale verificata', 
                                      hasAddress && '📍 Indirizzo completo ufficio'
                                    ].filter(Boolean)
                                    
                                    const hasContactData = availableContacts.length > 0
                                    
                                    return hasContactData ? (
                                      <>
                                        <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                                          📞 {availableContacts.length} Contatt{availableContacts.length === 1 ? 'o' : 'i'} Disponibil{availableContacts.length === 1 ? 'e' : 'i'}
                                        </h4>
                                        <div className="space-y-2">
                                          {hasPhone && (
                                            <div className="flex items-center space-x-2 text-sm text-yellow-700 dark:text-yellow-300">
                                              <Phone className="h-4 w-4" />
                                              <span>📱 Numero di telefono diretto</span>
                                            </div>
                                          )}
                                          {hasEmail && (
                                            <div className="flex items-center space-x-2 text-sm text-yellow-700 dark:text-yellow-300">
                                              <Mail className="h-4 w-4" />
                                              <span>✉️ Email aziendale verificata</span>
                                            </div>
                                          )}
                                          {hasAddress && (
                                            <div className="flex items-center space-x-2 text-sm text-yellow-700 dark:text-yellow-300">
                                              <MapPin className="h-4 w-4" />
                                              <span>📍 Indirizzo completo ufficio</span>
                                            </div>
                                          )}
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                                          🏢 Dettagli Azienda Completi
                                        </h4>
                                        <div className="space-y-2">
                                          <div className="flex items-center space-x-2 text-sm text-yellow-700 dark:text-yellow-300">
                                            <span>📄 Nome e dettagli azienda completi</span>
                                          </div>
                                          <div className="flex items-center space-x-2 text-sm text-yellow-700 dark:text-yellow-300">
                                            <span>🌐 Analisi tecnica dettagliata del sito</span>
                                          </div>
                                        </div>
                                      </>
                                    )
                                  } else {
                                    // Per piani Free/Starter: mostra benefici generici
                                    return (
                                      <>
                                        <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                                          🔓 Dettagli Completi Disponibili
                                        </h4>
                                        <div className="space-y-2">
                                          <div className="flex items-center space-x-2 text-sm text-yellow-700 dark:text-yellow-300">
                                            <span>🏢 Nome e informazioni azienda</span>
                                          </div>
                                          <div className="flex items-center space-x-2 text-sm text-yellow-700 dark:text-yellow-300">
                                            <span>🔗 Accesso diretto al sito web</span>
                                          </div>
                                          {userPlan === 'free' && (
                                            <div className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
                                              <Crown className="h-4 w-4" />
                                              <span>💎 Upgrade per contatti diretti</span>
                                            </div>
                                          )}
                                        </div>
                                      </>
                                    )
                                  }
                                })()}
                              </div>
                              <div className="text-2xl">🔓</div>
                            </div>
                          </div>
                        )}

                        {/* Ruoli Necessari - Solo se sbloccato */}
                        {isUnlocked ? (
                          <div className="flex flex-wrap gap-2">
                            {(lead.needed_roles && Array.isArray(lead.needed_roles) && lead.needed_roles.length > 0) ? (
                              <>
                                {lead.needed_roles.slice(0, 3).map(role => (
                                  <span 
                                    key={role}
                                    className={`px-2 py-1 text-xs font-medium rounded-lg ${getRoleColor(role)}`}
                                  >
                                    {translateRole(role)}
                                  </span>
                                ))}
                                {lead.needed_roles.length > 3 && (
                                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-lg">
                                    +{lead.needed_roles.length - 3} altri
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-lg">
                                Nessun ruolo specificato
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-lg blur-sm">
                              ••••••••••
                            </span>
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-lg blur-sm">
                              ••••••••
                            </span>
                            <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-200">
                              Ruoli nascosti - Sblocca per vedere
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Insights e suggerimenti personalizzati */}
                      {isUnlocked && (
                        <LeadInsights 
                          lead={lead} 
                          userPlan={(userProfile?.plan as 'free' | 'starter' | 'pro') || 'free'}
                        />
                      )}

                      {/* Score e Actions */}
                      <div className="flex items-center space-x-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                            {lead.score}
                          </div>
                          <div className="text-xs text-gray-500">Score</div>
                        </div>
                        
                        {!isUnlocked ? (
                          <div className="flex flex-col items-center space-y-2">
                            <button
                              onClick={() => unlockLead(lead.id)}
                              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl transition-all duration-300 relative disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105"
                              disabled={remainingCredits <= 0}
                              title={remainingCredits <= 0 ? "Non hai crediti sufficienti" : "Costa 1 credito per sbloccare tutti i dettagli"}
                              {...(index === 0 ? { id: 'dashboard-unlock-button', 'data-tour': 'dashboard-unlock-button' } : {})}
                            >
                              <div className="flex items-center space-x-2">
                                <Eye className="h-4 w-4" />
                                <span>SBLOCCA LEAD</span>
                              </div>
                              <div className="text-xs opacity-90 mt-1">
                                💳 1 credito
                              </div>
                              {remainingCredits > 0 && (
                                <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-bounce">
                                  1
                                </span>
                              )}
                            </button>
                            
                            <div className="text-xs text-center text-gray-500 max-w-[140px]">
                              {(() => {
                                // Verifica rigorosa dei contatti disponibili
                                const hasPhone = lead.phone && typeof lead.phone === 'string' && lead.phone.trim() !== ''
                                const hasEmail = lead.email && typeof lead.email === 'string' && lead.email.trim() !== '' && lead.email !== 'null'
                                const hasAddress = lead.address && typeof lead.address === 'string' && lead.address.trim() !== ''
                                
                                const hasContacts = hasPhone || hasEmail || hasAddress
                                const contactCount = [hasPhone, hasEmail, hasAddress].filter(Boolean).length
                                
                                if (hasContacts && contactCount > 1) {
                                  return `Ottieni ${contactCount} contatti e dettagli completi`
                                } else if (hasContacts) {
                                  return 'Ottieni contatti e nome azienda'
                                } else {
                                  return 'Ottieni nome azienda e dettagli'
                                }
                              })()}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center space-y-2">
                            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span>✅ SBLOCCATO</span>
                            </div>
                            
                            {/* Azioni standard */}
                            <div className="flex space-x-2">
                              <button
                                onClick={() => window.open(lead.website_url, '_blank')}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg transition-colors text-xs"
                              >
                                <ExternalLink className="h-3 w-3 inline mr-1" />
                                Visita
                              </button>
                              <button
                                onClick={() => router.push(`/lead/${lead.id}`)}
                                className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg transition-colors text-xs"
                              >
                                <Eye className="h-3 w-3 inline mr-1" />
                                Analisi
                              </button>
                            </div>
                            
                            {/* Azioni rapide CRM per utenti PRO */}
                            {userProfile?.plan === 'pro' && (
                              <div className="border-t border-gray-200 pt-2 mt-2 w-full">
                                <div className="text-xs text-gray-500 text-center mb-2">🎯 Azioni rapide CRM</div>
                                <div className="flex flex-col space-y-1 w-full">
                                  {lead.crm_status === 'new' && (
                                    <button
                                      onClick={() => handleQuickStatusUpdate(lead.id, 'contacted')}
                                      disabled={updatingCRM === lead.id}
                                      className="w-full px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {updatingCRM === lead.id ? '...' : '📞 Segna come contattato'}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => router.push(`/crm/${lead.id}`)}
                                    className="w-full px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded transition-colors inline-flex items-center justify-center gap-1"
                                  >
                                    <MessageCircle className="h-3 w-3" />
                                    Gestisci nel CRM
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
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
    </div>
  )
}
