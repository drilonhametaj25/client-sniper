/**
 * Pagina dedicata ai servizi digitali con prezzi - ClientSniper
 * Usato per: Visualizzare catalogo completo servizi digitali per tutti gli utenti
 * Chiamato da: Link dalla sezione servizi suggeriti nel dettaglio lead
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useDigitalServices, type DigitalService } from '@/hooks/useDigitalServices'
import {
  Zap,
  DollarSign,
  Tag,
  Clock,
  Search,
  Filter,
  Star,
  TrendingUp,
  Repeat,
  Target,
  ChevronDown,
  ChevronUp,
  Euro,
  User,
  Building2,
  BookOpen,
  ArrowLeft,
  Briefcase,
  BarChart3,
  PieChart,
  Globe,
  Shield,
  Smartphone,
  Mail,
  MessageSquare,
  Camera,
  Palette,
  Code,
  Settings,
  Megaphone,
  Share2,
  AlertCircle
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { useRouter } from 'next/navigation'

export default function DigitalServicesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { services, servicesByCategory, stats, isLoading, error, fetchServices } = useDigitalServices()

  // Stati per filtri e UI
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [priceType, setPriceType] = useState<'freelance' | 'agency'>('freelance')
  const [showFilters, setShowFilters] = useState(false)
  const [onlyPopular, setOnlyPopular] = useState(false)
  const [onlyRecurring, setOnlyRecurring] = useState(false)
  const [onlyHighProfit, setOnlyHighProfit] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc' | 'popularity'>('name')

  // Carica servizi per tutti gli utenti autenticati
  useEffect(() => {
    if (user) {
      fetchServices()
    }
  }, [user?.id])

  // Funzione per filtrare servizi
  const filteredServices = services.filter(service => {
    if (searchTerm && !service.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !service.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    
    if (selectedCategory !== 'all' && service.category !== selectedCategory) {
      return false
    }
    
    if (onlyPopular && !service.is_popular) {
      return false
    }
    
    if (onlyRecurring && !service.is_recurring) {
      return false
    }
    
    if (onlyHighProfit && !service.is_high_profit) {
      return false
    }
    
    return true
  })

  // Ordinamento servizi
  const sortedServices = [...filteredServices].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'price_asc':
        const priceA = priceType === 'freelance' ? a.price_freelance_eur : a.price_agency_eur
        const priceB = priceType === 'freelance' ? b.price_freelance_eur : b.price_agency_eur
        return priceA - priceB
      case 'price_desc':
        const priceA2 = priceType === 'freelance' ? a.price_freelance_eur : a.price_agency_eur
        const priceB2 = priceType === 'freelance' ? b.price_freelance_eur : b.price_agency_eur
        return priceB2 - priceA2
      case 'popularity':
        return (b.is_popular ? 1 : 0) - (a.is_popular ? 1 : 0)
      default:
        return 0
    }
  })

  // Icone per categorie
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'web development': return <Code className="w-5 h-5" />
      case 'digital marketing': return <Megaphone className="w-5 h-5" />
      case 'seo': return <Search className="w-5 h-5" />
      case 'social media': return <Share2 className="w-5 h-5" />
      case 'design': return <Palette className="w-5 h-5" />
      case 'content creation': return <Camera className="w-5 h-5" />
      case 'email marketing': return <Mail className="w-5 h-5" />
      case 'e-commerce': return <Globe className="w-5 h-5" />
      case 'mobile apps': return <Smartphone className="w-5 h-5" />
      case 'analytics': return <BarChart3 className="w-5 h-5" />
      case 'security': return <Shield className="w-5 h-5" />
      case 'automation': return <Settings className="w-5 h-5" />
      default: return <Briefcase className="w-5 h-5" />
    }
  }

  // Colori per livello di complessità
  const getComplexityColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getComplexityText = (level: string) => {
    switch (level) {
      case 'low': return 'Bassa'
      case 'medium': return 'Media'
      case 'high': return 'Alta'
      default: return 'Non definita'
    }
  }

  // Mostra loading se i servizi non sono ancora caricati
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 h-64"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Mostra errore se non può caricare i servizi
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
              <div className="text-red-600 dark:text-red-400 mb-2">
                <AlertCircle className="w-8 h-8 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                Errore nel caricamento
              </h3>
              <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
              <Button onClick={() => fetchServices()} variant="secondary">
                Riprova
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Indietro
            </Button>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <Briefcase className="w-8 h-8 text-white" />
            </div>
            Catalogo Servizi Digitali
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Scopri i prezzi medi per tutti i servizi digitali che puoi offrire ai tuoi lead
          </p>
        </div>

        {/* Statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Servizi Totali</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {stats.total}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <Euro className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">Prezzo Medio Freelance</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  €{stats.avgPriceFreelance}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">Prezzo Medio Agenzia</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  €{stats.avgPriceAgency}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Tag className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">Categorie</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {stats.categories}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filtri */}
        <Card className="p-6 mb-8">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Cerca servizi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">Tutte le categorie</option>
              {Object.keys(servicesByCategory).map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="name">Nome A-Z</option>
              <option value="price_asc">Prezzo crescente</option>
              <option value="price_desc">Prezzo decrescente</option>
              <option value="popularity">Popolarità</option>
            </select>

            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtri avanzati
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          {/* Tipo di prezzo */}
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Tipo di prezzo:
            </span>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setPriceType('freelance')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  priceType === 'freelance'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <User className="w-4 h-4 inline mr-1" />
                Freelance
              </button>
              <button
                onClick={() => setPriceType('agency')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  priceType === 'agency'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4 inline mr-1" />
                Agenzia
              </button>
            </div>
          </div>

          {/* Filtri avanzati */}
          {showFilters && (
            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={onlyPopular}
                    onChange={(e) => setOnlyPopular(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Solo servizi popolari
                  </span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={onlyRecurring}
                    onChange={(e) => setOnlyRecurring(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Solo servizi ricorrenti
                  </span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={onlyHighProfit}
                    onChange={(e) => setOnlyHighProfit(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Solo alta marginalità
                  </span>
                </label>
              </div>
            </div>
          )}
        </Card>

        {/* Griglia servizi */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedServices.map(service => (
            <Card key={service.id} className="p-6 hover:shadow-lg transition-all duration-200 hover:scale-105 border-0 shadow-md">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                    {getCategoryIcon(service.category)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {service.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {service.category}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-1 flex-wrap">
                  {service.is_popular && (
                    <Badge variant="warning" className="flex items-center gap-1 text-xs">
                      <Star className="w-3 h-3" />
                      Popolare
                    </Badge>
                  )}
                  {service.is_recurring && (
                    <Badge variant="success" className="flex items-center gap-1 text-xs">
                      <Repeat className="w-3 h-3" />
                      Ricorrente
                    </Badge>
                  )}
                  {service.is_high_profit && (
                    <Badge variant="info" className="flex items-center gap-1 text-xs">
                      <TrendingUp className="w-3 h-3" />
                      Alta marginalità
                    </Badge>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {service.description}
              </p>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Prezzo {priceType === 'freelance' ? 'freelance' : 'agenzia'}:
                  </span>
                  <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                    €{priceType === 'freelance' ? service.price_freelance_eur : service.price_agency_eur}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Ore stimate:
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {service.estimated_hours}h
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Complessità:
                  </span>
                  <Badge className={`${getComplexityColor(service.complexity_level)} text-xs`}>
                    {getComplexityText(service.complexity_level)}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {service.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="default" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {service.tags.length > 3 && (
                  <Badge variant="default" className="text-xs">
                    +{service.tags.length - 3}
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Messaggio se nessun servizio trovato */}
        {sortedServices.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Nessun servizio trovato
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Prova a modificare i filtri di ricerca
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
