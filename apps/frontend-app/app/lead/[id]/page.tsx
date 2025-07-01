'use client'

// Pagina di dettaglio del lead con analisi completa e grafici
// Mostra tutte le informazioni disponibili, l'analisi tecnica e visualizzazioni interattive
// Consuma 1 credito per l'accesso ai dettagli completi

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { WebsiteAnalysis } from '@/lib/types/analysis'
import { 
  ArrowLeft, 
  ExternalLink, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Eye,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Shield,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Search,
  Smartphone
} from 'lucide-react'

interface Lead {
  id: string
  business_name: string
  website_url: string
  phone: string
  email: string
  address: string
  city: string
  category: string
  score: number
  needed_roles: string[]
  issues: string[]
  analysis: WebsiteAnalysis | any // Può essere sia il nuovo formato che il vecchio
  created_at: string
  last_seen_at: string
  assigned_to: string
  origin?: 'scraping' | 'manual'
}

export default function LeadDetailPage() {
  const { user, refreshProfile } = useAuth()
  const router = useRouter()
  const params = useParams()
  const leadId = params.id as string
  
  const [lead, setLead] = useState<Lead | null>(null)
  const [analysis, setAnalysis] = useState<WebsiteAnalysis | any>(null)
  const [loading, setLoading] = useState(true)
  const [creditConsumed, setCreditConsumed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && leadId) {
      loadLeadDetails()
    }
  }, [user, leadId])

  const loadLeadDetails = async () => {
    try {
      setLoading(true)
      
      // Prima verifica se l'utente ha già sbloccato questo lead
      const { data: unlockedLeads, error: unlockedError } = await supabase
        .rpc('get_user_unlocked_leads', { p_user_id: user?.id })

      if (unlockedError) {
        console.error('Errore verifica lead sbloccati:', unlockedError)
      }

      const isAlreadyUnlocked = unlockedLeads?.some((ul: any) => ul.lead_id === leadId)
      
      // Se non è già sbloccato, verifica che l'utente abbia crediti sufficienti
      if (!isAlreadyUnlocked && (!user || (user.credits_remaining || 0) <= 0)) {
        setError('Crediti insufficienti per visualizzare i dettagli del lead')
        return
      }

      // Carica il lead
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single()

      if (leadError) {
        setError('Lead non trovato')
        return
      }

      // Verifica se l'utente può vedere questo lead
      if (user?.role !== 'admin' && leadData.assigned_to && leadData.assigned_to !== user?.id) {
        setError('Non hai i permessi per visualizzare questo lead')
        return
      }

      setLead(leadData)

      // Carica l'analisi se disponibile
      if (leadData.analysis) {
        setAnalysis(leadData.analysis)
      }

      // Consuma 1 credito solo se non già sbloccato
      if (!isAlreadyUnlocked && !creditConsumed) {
        await consumeCredit()
      } else if (isAlreadyUnlocked) {
        setCreditConsumed(true) // Marca come già consumato per evitare doppi consumi
      }

    } catch (error) {
      console.error('Errore caricamento lead:', error)
      setError('Errore nel caricamento del lead')
    } finally {
      setLoading(false)
    }
  }

  const consumeCredit = async () => {
    try {
      if (!user) return
      
      const currentCredits = user.credits_remaining || 0
      
      // Decrementa credito
      const { error } = await supabase
        .from('users')
        .update({ 
          credits_remaining: currentCredits - 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      // Registra il lead come sbloccato
      const { error: unlockError } = await supabase
        .rpc('unlock_lead_for_user', { 
          p_user_id: user.id, 
          p_lead_id: leadId 
        })

      if (unlockError) {
        console.error('Errore registrazione lead sbloccato:', unlockError)
      }

      // Log dell'utilizzo
      await supabase
        .from('credit_usage_log')
        .insert({
          user_id: user.id,
          action: 'lead_detail_view',
          credits_consumed: 1,
          credits_remaining: currentCredits - 1,
          metadata: { lead_id: leadId }
        })

      setCreditConsumed(true)
      await refreshProfile()

    } catch (error) {
      console.error('Errore consumo credito:', error)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/20'
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20'
    if (score >= 40) return 'bg-orange-100 dark:bg-orange-900/20'
    return 'bg-red-100 dark:bg-red-900/20'
  }

  // Funzioni helper per compatibilità con vecchio e nuovo formato
  const getSEOScore = () => {
    if (!analysis) return 0
    // Nuovo formato
    if (analysis.seo) {
      const seo = analysis.seo
      let score = 100
      if (!seo.hasTitle) score -= 20
      if (!seo.hasMetaDescription) score -= 20
      if (!seo.hasH1) score -= 15
      if (seo.titleLength < 30) score -= 10
      if (seo.metaDescriptionLength < 50) score -= 10
      if (!seo.hasStructuredData) score -= 5
      return Math.max(0, score)
    }
    // Vecchio formato
    return analysis.seo_score || 0
  }

  const getPerformanceScore = () => {
    if (!analysis) return 0
    // Nuovo formato
    if (analysis.performance) {
      const perf = analysis.performance
      let score = 100
      if (perf.loadTime > 3000) score -= 30
      else if (perf.loadTime > 2000) score -= 15
      if (perf.brokenImages > 0) score -= 20
      if (!perf.isResponsive) score -= 25
      return Math.max(0, score)
    }
    // Vecchio formato
    return analysis.page_speed_score || 0
  }

  const getOverallScore = () => {
    if (!analysis) return lead?.score || 0
    return analysis.overallScore || analysis.overall_score || lead?.score || 0
  }

  const isNewFormat = () => {
    return analysis && analysis.seo && typeof analysis.seo === 'object'
  }

  // Funzioni helper per generare raccomandazioni intelligenti
  const generateRecommendations = () => {
    const recommendations: { category: string; title: string; description: string; priority: 'high' | 'medium' | 'low' }[] = []

    if (!analysis) return recommendations

    if (isNewFormat()) {
      // SEO Raccomandazioni
      if (!analysis.seo.hasTitle) {
        recommendations.push({
          category: 'SEO',
          title: 'Aggiungi un Tag Title',
          description: 'Il sito non ha un tag title. Aggiungi un titolo descrittivo (50-60 caratteri) per migliorare la visibilità sui motori di ricerca.',
          priority: 'high'
        })
      }
      
      if (!analysis.seo.hasMetaDescription) {
        recommendations.push({
          category: 'SEO',
          title: 'Aggiungi Meta Description',
          description: 'Manca la meta description. Scrivi una descrizione accattivante (150-160 caratteri) per migliorare il click-through rate.',
          priority: 'high'
        })
      }

      if (!analysis.seo.hasH1) {
        recommendations.push({
          category: 'SEO',
          title: 'Aggiungi Tag H1',
          description: 'Il sito non ha un tag H1. Aggiungi un titolo principale che descriva chiaramente il contenuto della pagina.',
          priority: 'medium'
        })
      }

      if (!analysis.seo.hasStructuredData) {
        recommendations.push({
          category: 'SEO',
          title: 'Implementa Dati Strutturati',
          description: 'Aggiungi markup schema.org per aiutare i motori di ricerca a comprendere meglio il contenuto del sito.',
          priority: 'medium'
        })
      }

      // Performance Raccomandazioni
      if (analysis.performance.loadTime > 3000) {
        recommendations.push({
          category: 'Performance',
          title: 'Ottimizza Velocità di Caricamento',
          description: `Il sito impiega ${Math.round(analysis.performance.loadTime / 1000)}s per caricarsi. Ottimizza immagini, CSS e JavaScript per migliorare l\'esperienza utente.`,
          priority: 'high'
        })
      }

      if (analysis.performance.brokenImages > 0) {
        recommendations.push({
          category: 'Performance',
          title: 'Correggi Immagini Rotte',
          description: `Trovate ${analysis.performance.brokenImages} immagini non funzionanti. Sostituiscile o rimuovile per migliorare l\'esperienza utente.`,
          priority: 'medium'
        })
      }

      if (!analysis.performance.isResponsive) {
        recommendations.push({
          category: 'Performance',
          title: 'Rendi il Sito Responsive',
          description: 'Il sito non è ottimizzato per dispositivi mobili. Implementa un design responsive per raggiungere più utenti.',
          priority: 'high'
        })
      }

      // Tracking Raccomandazioni
      if (!analysis.tracking.hasGoogleAnalytics) {
        recommendations.push({
          category: 'Analytics',
          title: 'Installa Google Analytics',
          description: 'Aggiungi Google Analytics per monitorare il traffico del sito e comprendere meglio i visitatori.',
          priority: 'medium'
        })
      }

      if (!analysis.tracking.hasFacebookPixel) {
        recommendations.push({
          category: 'Marketing',
          title: 'Installa Facebook Pixel',
          description: 'Aggiungi il Facebook Pixel per tracciare conversioni e creare campagne pubblicitarie più efficaci su Facebook e Instagram.',
          priority: 'medium'
        })
      }

      if (!analysis.tracking.hasGoogleTagManager) {
        recommendations.push({
          category: 'Analytics',
          title: 'Implementa Google Tag Manager',
          description: 'GTM semplifica la gestione di tutti i tag di tracking senza modificare il codice del sito.',
          priority: 'low'
        })
      }

      // GDPR Raccomandazioni
      if (!analysis.gdpr.hasCookieBanner) {
        recommendations.push({
          category: 'Legale',
          title: 'Aggiungi Cookie Banner',
          description: 'Per rispettare il GDPR, aggiungi un banner per chiedere il consenso ai cookie prima di tracciare gli utenti.',
          priority: 'high'
        })
      }

      if (!analysis.gdpr.hasPrivacyPolicy) {
        recommendations.push({
          category: 'Legale',
          title: 'Crea Privacy Policy',
          description: 'Obbligatoria per legge, la privacy policy deve spiegare come vengono trattati i dati personali degli utenti.',
          priority: 'high'
        })
      }

      if (!analysis.gdpr.hasTermsOfService) {
        recommendations.push({
          category: 'Legale',
          title: 'Aggiungi Termini di Servizio',
          description: 'I termini di servizio proteggono legalmente la tua attività e definiscono le regole di utilizzo del sito.',
          priority: 'medium'
        })
      }

      // Social Raccomandazioni
      if (!analysis.social.hasAnySocial) {
        recommendations.push({
          category: 'Social Media',
          title: 'Aggiungi Presenza Social',
          description: 'Crea profili social (Facebook, Instagram, LinkedIn) e collegali al sito per aumentare la credibilità e raggiungere più clienti.',
          priority: 'medium'
        })
      }

      // Legal Raccomandazioni
      if (!analysis.legal.hasVisiblePartitaIva) {
        recommendations.push({
          category: 'Legale',
          title: 'Mostra Partita IVA',
          description: 'Per legge, i siti aziendali devono mostrare chiaramente la Partita IVA e i dati della società.',
          priority: 'high'
        })
      }

    } else {
      // Formato Legacy - Raccomandazioni basate sui campi disponibili
      if (analysis.missing_meta_tags && analysis.missing_meta_tags.length > 0) {
        recommendations.push({
          category: 'SEO',
          title: 'Aggiungi Meta Tag Mancanti',
          description: `Mancano ${analysis.missing_meta_tags.length} meta tag importanti: ${analysis.missing_meta_tags.join(', ')}. Aggiungili per migliorare la SEO.`,
          priority: 'high'
        })
      }

      if (!analysis.has_tracking_pixel) {
        recommendations.push({
          category: 'Marketing',
          title: 'Installa Pixel di Tracking',
          description: 'Aggiungi pixel di tracking (Facebook, Google) per monitorare conversioni e migliorare le campagne pubblicitarie.',
          priority: 'medium'
        })
      }

      if (!analysis.gtm_installed) {
        recommendations.push({
          category: 'Analytics',
          title: 'Implementa Google Tag Manager',
          description: 'GTM semplifica la gestione di tutti i tag di tracking senza modificare il codice del sito.',
          priority: 'low'
        })
      }

      if (analysis.broken_images) {
        recommendations.push({
          category: 'Performance',
          title: 'Correggi Immagini Rotte',
          description: 'Trovate immagini non funzionanti. Sostituiscile o rimuovile per migliorare l\'esperienza utente.',
          priority: 'medium'
        })
      }

      if (analysis.website_load_time && analysis.website_load_time > 3000) {
        recommendations.push({
          category: 'Performance',
          title: 'Ottimizza Velocità di Caricamento',
          description: `Il sito impiega ${Math.round(analysis.website_load_time / 1000)}s per caricarsi. Ottimizza per migliorare l\'esperienza utente.`,
          priority: 'high'
        })
      }
    }

    // Ordina per priorità
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    return recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
  }

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
    }
  }

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4" />
      case 'medium': return <Clock className="h-4 w-4" />
      case 'low': return <TrendingDown className="h-4 w-4" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'SEO': return <Search className="h-4 w-4 text-green-600" />
      case 'Performance': return <Zap className="h-4 w-4 text-yellow-600" />
      case 'Analytics': return <BarChart3 className="h-4 w-4 text-blue-600" />
      case 'Marketing': return <Eye className="h-4 w-4 text-purple-600" />
      case 'Legale': return <Shield className="h-4 w-4 text-red-600" />
      case 'Social Media': return <Activity className="h-4 w-4 text-pink-600" />
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Caricamento dettagli lead...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Errore</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Torna Indietro
          </button>
        </div>
      </div>
    )
  }

  if (!lead) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna ai Lead
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {lead.business_name}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {lead.city}
                </span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                  {lead.category}
                </span>
              </div>
            </div>
            
            <div className={`text-right p-4 rounded-xl ${getScoreBgColor(lead.score)}`}>
              <div className={`text-2xl font-bold ${getScoreColor(lead.score)}`}>
                {lead.score}/100
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Punteggio Tecnico
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonna Sinistra - Info Principali */}
          <div className="lg:col-span-1 space-y-6">
            {/* Informazioni di Contatto */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Informazioni di Contatto
              </h2>
              
              <div className="space-y-3">
                {lead.website_url && (
                  <div className="flex items-center">
                    <Globe className="h-4 w-4 text-gray-400 mr-3" />
                    <a
                      href={lead.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {lead.website_url}
                    </a>
                  </div>
                )}
                
                {lead.phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-gray-400 mr-3" />
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-gray-900 dark:text-white hover:text-blue-600"
                    >
                      {lead.phone}
                    </a>
                  </div>
                )}
                
                {lead.email && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-gray-400 mr-3" />
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {lead.email}
                    </a>
                  </div>
                )}
                
                {lead.address && (
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 text-gray-400 mr-3 mt-0.5" />
                    <span className="text-gray-900 dark:text-white">
                      {lead.address}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Ruoli Necessari */}
            {lead.needed_roles && lead.needed_roles.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Opportunità di Business
                </h2>
                
                <div className="flex flex-wrap gap-2">
                  {lead.needed_roles.map((role, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Raccomandazioni per il Cliente */}
            {analysis && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-green-600" />
                  Raccomandazioni per il Cliente
                </h2>
                
                <div className="space-y-4">
                  {generateRecommendations().map((rec, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(rec.category)}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {rec.title}
                          </span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getPriorityColor(rec.priority)}`}>
                          {getPriorityIcon(rec.priority)}
                          <span className="ml-1 capitalize">{rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Media' : 'Bassa'}</span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {rec.description}
                      </p>
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-400 rounded">
                          {rec.category}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {generateRecommendations().length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400">
                        Ottimo! Non sono stati identificati problemi critici.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Problemi Legacy (se presenti) */}
            {lead.issues && lead.issues.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Problemi Identificati (Legacy)
                </h2>
                
                <div className="space-y-2">
                  {lead.issues.map((issue, index) => (
                    <div key={index} className="flex items-start">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {issue}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Colonna Destra - Analisi Tecnica */}
          <div className="lg:col-span-2 space-y-6">
            {analysis && (
              <>
                {/* Overview Metriche */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                    Analisi Tecnica Completa
                    {lead.origin === 'manual' && (
                      <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                        Analisi Manuale
                      </span>
                    )}
                  </h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div className={`text-2xl font-bold ${getScoreColor(getSEOScore())}`}>
                        {getSEOScore()}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">SEO Score</div>
                    </div>
                    
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div className={`text-2xl font-bold ${getScoreColor(getPerformanceScore())}`}>
                        {getPerformanceScore()}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Velocità</div>
                    </div>
                    
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div className={`text-2xl font-bold ${getScoreColor(getOverallScore())}`}>
                        {getOverallScore()}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Punteggio</div>
                    </div>
                    
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {analysis.performance?.loadTime ? Math.round(analysis.performance.loadTime / 1000 * 10) / 10 : 
                         analysis.website_load_time ? Math.round(analysis.website_load_time / 1000 * 10) / 10 : 'N/A'}s
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Caricamento</div>
                    </div>
                  </div>
                </div>

                {/* Riepilogo Raccomandazioni */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <PieChart className="h-5 w-5 mr-2 text-purple-600" />
                    Riepilogo Opportunità
                  </h3>
                  
                  {(() => {
                    const recommendations = generateRecommendations()
                    const categoryCounts = recommendations.reduce((acc, rec) => {
                      acc[rec.category] = (acc[rec.category] || 0) + 1
                      return acc
                    }, {} as Record<string, number>)
                    
                    const priorityCounts = recommendations.reduce((acc, rec) => {
                      acc[rec.priority] = (acc[rec.priority] || 0) + 1
                      return acc
                    }, {} as Record<string, number>)

                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">
                            {priorityCounts.high || 0}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Priorità Alta</div>
                        </div>
                        
                        <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600">
                            {priorityCounts.medium || 0}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Priorità Media</div>
                        </div>
                        
                        <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {Object.keys(categoryCounts).length}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Aree Miglioramento</div>
                        </div>
                        
                        <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {recommendations.length}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Tot. Raccomandazioni</div>
                        </div>
                      </div>
                    )
                  })()}
                  
                  {generateRecommendations().length > 0 && (
                    <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        💡 <strong>Potenziale di vendita elevato!</strong> Questo cliente ha {generateRecommendations().length} opportunità di miglioramento che puoi offrire.
                      </p>
                    </div>
                  )}
                </div>

                {/* SEO Analysis */}
                {(isNewFormat() ? analysis.seo : analysis) && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Search className="h-5 w-5 mr-2 text-blue-500" />
                      Analisi SEO
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {isNewFormat() ? (
                        <>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Title Tag</span>
                            {analysis.seo.hasTitle ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Meta Description</span>
                            {analysis.seo.hasMetaDescription ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Tag H1</span>
                            {analysis.seo.hasH1 ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Dati Strutturati</span>
                            {analysis.seo.hasStructuredData ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                        </>
                      ) : (
                        // Formato vecchio
                        <>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Sito Web Attivo</span>
                            {analysis.has_website ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Meta Tags</span>
                            {!analysis.missing_meta_tags || analysis.missing_meta_tags.length === 0 ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Mobile Friendly</span>
                            {analysis.mobile_friendly ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Certificato SSL</span>
                            {analysis.ssl_certificate ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Tracking & Analytics */}
                {(isNewFormat() ? analysis.tracking : analysis) && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Activity className="h-5 w-5 mr-2 text-purple-500" />
                      Tracking & Analytics
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {isNewFormat() ? (
                        <>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <div className="flex items-center">
                              <span className="text-sm text-gray-700 dark:text-gray-300">Google Analytics</span>
                            </div>
                            {analysis.tracking.hasGoogleAnalytics ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <div className="flex items-center">
                              <Facebook className="h-4 w-4 mr-2 text-blue-600" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Facebook Pixel</span>
                            </div>
                            {analysis.tracking.hasFacebookPixel ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Google Tag Manager</span>
                            {analysis.tracking.hasGoogleTagManager ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Hotjar</span>
                            {analysis.tracking.hasHotjar ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          {analysis.tracking.customTracking && analysis.tracking.customTracking.length > 0 && (
                            <div className="md:col-span-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Altri Tracking: {analysis.tracking.customTracking.join(', ')}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        // Formato vecchio
                        <>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Pixel Tracking</span>
                            {analysis.has_tracking_pixel ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Google Tag Manager</span>
                            {analysis.gtm_installed ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* GDPR Compliance */}
                {isNewFormat() && analysis.gdpr && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Shield className="h-5 w-5 mr-2 text-green-600" />
                      Conformità GDPR
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Cookie Banner</span>
                        {analysis.gdpr.hasCookieBanner ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Privacy Policy</span>
                        {analysis.gdpr.hasPrivacyPolicy ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Termini di Servizio</span>
                        {analysis.gdpr.hasTermsOfService ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      {analysis.gdpr.riskyEmbeds && analysis.gdpr.riskyEmbeds.length > 0 && (
                        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <span className="text-sm text-gray-700 dark:text-gray-300">Embed Rischiosi</span>
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Social Presence */}
                {isNewFormat() && analysis.social && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Eye className="h-5 w-5 mr-2 text-pink-500" />
                      Presenza Social
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {analysis.social.facebook && (
                        <a 
                          href={analysis.social.facebook} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
                        >
                          <div className="flex items-center">
                            <Facebook className="h-5 w-5 text-blue-600 mr-2" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Facebook</span>
                          </div>
                          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                        </a>
                      )}
                      {analysis.social.instagram && (
                        <a 
                          href={analysis.social.instagram} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors group"
                        >
                          <div className="flex items-center">
                            <Instagram className="h-5 w-5 text-pink-600 mr-2" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Instagram</span>
                          </div>
                          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-pink-600" />
                        </a>
                      )}
                      {analysis.social.linkedin && (
                        <a 
                          href={analysis.social.linkedin} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
                        >
                          <div className="flex items-center">
                            <Linkedin className="h-5 w-5 text-blue-700 mr-2" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">LinkedIn</span>
                          </div>
                          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-700" />
                        </a>
                      )}
                      {analysis.social.twitter && (
                        <a 
                          href={analysis.social.twitter} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
                        >
                          <div className="flex items-center">
                            <Twitter className="h-5 w-5 text-blue-500 mr-2" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Twitter</span>
                          </div>
                          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
                        </a>
                      )}
                      {analysis.social.youtube && (
                        <a 
                          href={analysis.social.youtube} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors group"
                        >
                          <div className="flex items-center">
                            <Youtube className="h-5 w-5 text-red-600 mr-2" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">YouTube</span>
                          </div>
                          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-red-600" />
                        </a>
                      )}
                      {!analysis.social.hasAnySocial && (
                        <div className="col-span-full text-center p-4 text-gray-500 dark:text-gray-400">
                          Nessuna presenza social rilevata
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tracking & Analytics - Legacy Format */}
                {!isNewFormat() && (analysis.has_tracking_pixel !== undefined || analysis.gtm_installed !== undefined) && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2 text-purple-500" />
                      Tracking & Analytics
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {analysis.has_tracking_pixel !== undefined && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">Pixel Tracking</span>
                          </div>
                          {analysis.has_tracking_pixel ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      )}

                      {analysis.gtm_installed !== undefined && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">Google Tag Manager</span>
                          </div>
                          {analysis.gtm_installed ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      )}

                      {!analysis.has_tracking_pixel && !analysis.gtm_installed && (
                        <div className="col-span-full text-center p-4 text-gray-500 dark:text-gray-400">
                          Nessun sistema di tracking rilevato
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Performance Details */}
                {(isNewFormat() ? analysis.performance : analysis) && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                      Performance
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {isNewFormat() ? (
                        <>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Tempo di Caricamento</span>
                            <span className="text-sm font-medium dark:text-gray-300">
                              {Math.round(analysis.performance.loadTime / 1000 * 10) / 10}s
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Responsive</span>
                            {analysis.performance.isResponsive ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Immagini Totali</span>
                            <span className="text-sm font-medium dark:text-gray-300">{analysis.performance.totalImages}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Immagini Rotte</span>
                            <span className={`text-sm font-medium ${analysis.performance.brokenImages > 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {analysis.performance.brokenImages}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Tempo di Caricamento</span>
                            <span className="text-sm font-medium">
                              {analysis.website_load_time ? Math.round(analysis.website_load_time / 1000 * 10) / 10 : 'N/A'}s
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Immagini Rotte</span>
                            {analysis.broken_images ? (
                              <XCircle className="h-5 w-5 text-red-500" />
                            ) : (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Meta Tags Mancanti (solo formato vecchio) */}
                {!isNewFormat() && analysis.missing_meta_tags && analysis.missing_meta_tags.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Meta Tags Mancanti
                    </h3>
                    
                    <div className="space-y-2">
                      {analysis.missing_meta_tags.map((tag: string, index: number) => (
                        <div key={index} className="flex items-center">
                          <AlertTriangle className="h-4 w-4 text-orange-500 mr-2" />
                          <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-sm">
                            {tag}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Grafici e Visualizzazioni */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Visualizzazione Punteggi
              </h3>
              
              <div className="space-y-4">
                {/* Barra di progresso per ogni metrica */}
                {analysis && (
                  <>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">SEO</span>
                        <span className={getScoreColor(getSEOScore())}>
                          {getSEOScore()}/100
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            getSEOScore() >= 80 ? 'bg-green-500' :
                            getSEOScore() >= 60 ? 'bg-yellow-500' :
                            getSEOScore() >= 40 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${getSEOScore()}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">Performance</span>
                        <span className={getScoreColor(getPerformanceScore())}>
                          {getPerformanceScore()}/100
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            getPerformanceScore() >= 80 ? 'bg-green-500' :
                            getPerformanceScore() >= 60 ? 'bg-yellow-500' :
                            getPerformanceScore() >= 40 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${getPerformanceScore()}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">Punteggio Complessivo</span>
                        <span className={getScoreColor(getOverallScore())}>
                          {getOverallScore()}/100
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            getOverallScore() >= 80 ? 'bg-green-500' :
                            getOverallScore() >= 60 ? 'bg-yellow-500' :
                            getOverallScore() >= 40 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${getOverallScore()}%` }}
                        ></div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Raccomandazioni */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                💡 Raccomandazioni per il Cliente
              </h3>
              
              <div className="space-y-3">
                {analysis && (
                  <>
                    {/* SEO Issues */}
                    {((isNewFormat() && (!analysis.seo?.hasTitle || !analysis.seo?.hasMetaDescription || !analysis.seo?.hasH1)) ||
                      (!isNewFormat() && analysis.missing_meta_tags && analysis.missing_meta_tags.length > 0)) && (
                      <div className="flex items-start">
                        <Zap className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>SEO:</strong> Ottimizzare i meta tag (title, description, H1) per migliorare la visibilità sui motori di ricerca
                        </span>
                      </div>
                    )}
                    
                    {/* Tracking Issues */}
                    {((isNewFormat() && (!analysis.tracking?.hasGoogleAnalytics && !analysis.tracking?.hasFacebookPixel)) ||
                      (!isNewFormat() && !analysis.has_tracking_pixel)) && (
                      <div className="flex items-start">
                        <Zap className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Analytics:</strong> Installare Google Analytics e Facebook Pixel per monitorare le conversioni
                        </span>
                      </div>
                    )}
                    
                    {/* Performance Issues */}
                    {getPerformanceScore() < 70 && (
                      <div className="flex items-start">
                        <Zap className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Performance:</strong> Ottimizzare la velocità di caricamento per migliorare l'esperienza utente
                        </span>
                      </div>
                    )}
                    
                    {/* Mobile Issues */}
                    {((isNewFormat() && !analysis.performance?.isResponsive) ||
                      (!isNewFormat() && !analysis.mobile_friendly)) && (
                      <div className="flex items-start">
                        <Zap className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Mobile:</strong> Rendere il sito completamente responsive per dispositivi mobili
                        </span>
                      </div>
                    )}
                    
                    {/* GDPR Issues */}
                    {isNewFormat() && analysis.gdpr && !analysis.gdpr.hasCookieBanner && (
                      <div className="flex items-start">
                        <Zap className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>GDPR:</strong> Implementare un banner per i cookie per essere conformi al GDPR
                        </span>
                      </div>
                    )}
                    
                    {/* Social Media */}
                    {isNewFormat() && analysis.social && !analysis.social.hasAnySocial && (
                      <div className="flex items-start">
                        <Zap className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Social Media:</strong> Creare profili social e collegarli al sito web per aumentare la visibilità
                        </span>
                      </div>
                    )}
                    
                    {/* Website Missing */}
                    {!isNewFormat() && !analysis.has_website && (
                      <div className="flex items-start">
                        <Zap className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Sito Web:</strong> Creare un sito web professionale per stabilire una presenza online
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
