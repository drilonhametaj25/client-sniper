'use client'

// UI restyling stile Apple + Linear: Dashboard client completamente ridisegnata
// Layout moderno con cards glassmorphism, tipografia pulita, spaziature ampie
// Aggiunta gestione limiti configurabili e filtri avanzati

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
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
  Download,
  Search,
  RefreshCw,
  Settings,
  ChevronDown,
  Users,
  Calendar
} from 'lucide-react'

interface Lead {
  id: string
  business_name: string
  website_url: string
  phone: string
  email: string
  city: string
  category: string
  score: number
  needed_roles: string[]
  issues: string[]
  created_at: string
}

interface Settings {
  free_limit: number
  starter_limit: number
  pro_limit: number
}

export default function ClientDashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [settings, setSettings] = useState<Settings>({ free_limit: 2, starter_limit: 50, pro_limit: 200 })
  
  // Filtri
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterCity, setFilterCity] = useState<string>('')
  const [filterRole, setFilterRole] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  // Redirect se non autenticato
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Carica settings e leads
  useEffect(() => {
    if (user) {
      loadSettings()
      loadLeads()
    }
  }, [user])

  // Applica filtri quando cambiano
  useEffect(() => {
    applyFilters()
  }, [leads, filterCategory, filterCity, filterRole, searchTerm])

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

  const loadLeads = async () => {
    try {
      setLoadingData(true)
      
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('score', { ascending: true })
        .limit(1000) // Carichiamo tutti, poi filtriamo lato client per rispettare i limiti

      if (error) throw error
      setLeads(data || [])

    } catch (error) {
      console.error('Errore caricamento leads:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...leads]

    // Applica filtri
    if (filterCategory) {
      filtered = filtered.filter(lead => lead.category === filterCategory)
    }

    if (filterCity) {
      filtered = filtered.filter(lead => 
        lead.city.toLowerCase().includes(filterCity.toLowerCase())
      )
    }

    if (filterRole) {
      filtered = filtered.filter(lead => 
        lead.needed_roles.includes(filterRole)
      )
    }

    if (searchTerm) {
      filtered = filtered.filter(lead =>
        lead.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.website_url.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Applica limiti del piano
    const limit = getPlanLimit()
    filtered = filtered.slice(0, limit)

    setFilteredLeads(filtered)
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

  const exportToCSV = () => {
    const headers = ['Nome Business', 'Sito Web', 'Telefono', 'Email', 'Città', 'Categoria', 'Score', 'Problemi', 'Ruoli Necessari']
    const csvContent = [
      headers.join(','),
      ...filteredLeads.map(lead => [
        lead.business_name,
        lead.website_url,
        lead.phone || '',
        lead.email || '',
        lead.city,
        lead.category,
        lead.score,
        lead.issues.join('; '),
        lead.needed_roles.join('; ')
      ].map(field => `"${field}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clientsniper-leads-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
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

  const categories = Array.from(new Set(leads.map(lead => lead.category)))
  const cities = Array.from(new Set(leads.map(lead => lead.city)))
  const roles = ['designer', 'developer', 'seo', 'copywriter', 'photographer', 'adv', 'social', 'gdpr']

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Caricamento dashboard...</p>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
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
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{remainingCredits}</p>
                </div>
                <CreditCard className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            {/* Lead Totali */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Lead Disponibili</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredLeads.length}</p>
                  <p className="text-xs text-gray-500">su {currentLimit} max</p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
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

          {/* Filtri e Controlli */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca aziende..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Filter className="h-4 w-4" />
                  <span>Filtri</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>

                <button
                  onClick={loadLeads}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Aggiorna</span>
                </button>

                <button
                  onClick={exportToCSV}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Filtri Espandibili */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categoria</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    >
                      <option value="">Tutte le categorie</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Città</label>
                    <input
                      type="text"
                      placeholder="Filtra per città..."
                      value={filterCity}
                      onChange={(e) => setFilterCity(e.target.value)}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ruolo Necessario</label>
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    >
                      <option value="">Tutti i ruoli</option>
                      {roles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Lista Lead */}
          <div className="space-y-4">
            {filteredLeads.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Nessun lead trovato</h3>
                <p className="text-gray-600 dark:text-gray-400">Prova a modificare i filtri o aggiorna i dati</p>
              </div>
            ) : (
              filteredLeads.map((lead, index) => (
                <div
                  key={lead.id}
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    {/* Info Principale */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {lead.business_name}
                        </h3>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getScoreColor(lead.score)}`}>
                          {getScoreLabel(lead.score)} ({lead.score})
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <div className="flex items-center space-x-1">
                          <ExternalLink className="h-4 w-4" />
                          <a 
                            href={lead.website_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-blue-600 transition-colors"
                          >
                            {lead.website_url}
                          </a>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>{lead.city}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Contatti */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {lead.phone && (
                          <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                            <Phone className="h-4 w-4" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                            <Mail className="h-4 w-4" />
                            <span>{lead.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Ruoli Necessari */}
                      <div className="flex flex-wrap gap-2">
                        {lead.needed_roles.slice(0, 3).map(role => (
                          <span 
                            key={role}
                            className={`px-2 py-1 text-xs font-medium rounded-lg ${getRoleColor(role)}`}
                          >
                            {role}
                          </span>
                        ))}
                        {lead.needed_roles.length > 3 && (
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-lg">
                            +{lead.needed_roles.length - 3} altri
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score e Actions */}
                    <div className="flex items-center space-x-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                          {lead.score}
                        </div>
                        <div className="text-xs text-gray-500">Score</div>
                      </div>
                      
                      <button
                        onClick={() => window.open(lead.website_url, '_blank')}
                        className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-xl transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
