'use client'

// Pagina di dettaglio del lead con analisi completa e grafici
// Mostra tutte le informazioni disponibili, l'analisi tecnica e visualizzazioni interattive
// Consuma 1 credito per l'accesso ai dettagli completi

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
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
  Activity
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
  analysis: any
  created_at: string
  last_seen_at: string
  assigned_to: string
}

interface LeadAnalysis {
  has_website: boolean
  website_load_time: number
  missing_meta_tags: string[]
  has_tracking_pixel: boolean
  broken_images: boolean
  gtm_installed: boolean
  overall_score: number
  mobile_friendly: boolean
  ssl_certificate: boolean
  page_speed_score: number
  seo_score: number
  accessibility_score: number
}

export default function LeadDetailPage() {
  const { user, refreshProfile } = useAuth()
  const router = useRouter()
  const params = useParams()
  const leadId = params.id as string
  
  const [lead, setLead] = useState<Lead | null>(null)
  const [analysis, setAnalysis] = useState<LeadAnalysis | null>(null)
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
      
      // Prima verifica se l'utente ha crediti sufficienti
      if (!user || (user.credits_remaining || 0) <= 0) {
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
      if (user.role !== 'admin' && leadData.assigned_to && leadData.assigned_to !== user.id) {
        setError('Non hai i permessi per visualizzare questo lead')
        return
      }

      setLead(leadData)

      // Carica l'analisi se disponibile
      if (leadData.analysis) {
        setAnalysis(leadData.analysis)
      }

      // Consuma 1 credito se non già consumato
      if (!creditConsumed) {
        await consumeCredit()
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

            {/* Problemi Identificati */}
            {lead.issues && lead.issues.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Problemi Identificati
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
                  </h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div className={`text-2xl font-bold ${getScoreColor(analysis.seo_score || 0)}`}>
                        {analysis.seo_score || 0}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">SEO Score</div>
                    </div>
                    
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div className={`text-2xl font-bold ${getScoreColor(analysis.page_speed_score || 0)}`}>
                        {analysis.page_speed_score || 0}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Velocità</div>
                    </div>
                    
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div className={`text-2xl font-bold ${getScoreColor(analysis.accessibility_score || 0)}`}>
                        {analysis.accessibility_score || 0}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Accessibilità</div>
                    </div>
                    
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div className={`text-2xl font-bold ${analysis.website_load_time ? 'text-orange-600' : 'text-green-600'}`}>
                        {analysis.website_load_time ? `${analysis.website_load_time}s` : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Caricamento</div>
                    </div>
                  </div>
                </div>

                {/* Dettagli Tecnici */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Checklist Tecnica
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Sito Web Attivo</span>
                      {analysis.has_website ? (
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
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Mobile Friendly</span>
                      {analysis.mobile_friendly ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Google Analytics</span>
                      {analysis.gtm_installed ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Pixel di Tracking</span>
                      {analysis.has_tracking_pixel ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Immagini Funzionanti</span>
                      {!analysis.broken_images ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Meta Tags Mancanti */}
                {analysis.missing_meta_tags && analysis.missing_meta_tags.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Meta Tags Mancanti
                    </h3>
                    
                    <div className="space-y-2">
                      {analysis.missing_meta_tags.map((tag, index) => (
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
                        <span className={getScoreColor(analysis.seo_score || 0)}>
                          {analysis.seo_score || 0}/100
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            (analysis.seo_score || 0) >= 80 ? 'bg-green-500' :
                            (analysis.seo_score || 0) >= 60 ? 'bg-yellow-500' :
                            (analysis.seo_score || 0) >= 40 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${analysis.seo_score || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">Velocità</span>
                        <span className={getScoreColor(analysis.page_speed_score || 0)}>
                          {analysis.page_speed_score || 0}/100
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            (analysis.page_speed_score || 0) >= 80 ? 'bg-green-500' :
                            (analysis.page_speed_score || 0) >= 60 ? 'bg-yellow-500' :
                            (analysis.page_speed_score || 0) >= 40 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${analysis.page_speed_score || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">Accessibilità</span>
                        <span className={getScoreColor(analysis.accessibility_score || 0)}>
                          {analysis.accessibility_score || 0}/100
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            (analysis.accessibility_score || 0) >= 80 ? 'bg-green-500' :
                            (analysis.accessibility_score || 0) >= 60 ? 'bg-yellow-500' :
                            (analysis.accessibility_score || 0) >= 40 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${analysis.accessibility_score || 0}%` }}
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
                    {!analysis.has_website && (
                      <div className="flex items-start">
                        <Zap className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Sito Web:</strong> Creare un sito web professionale per aumentare la presenza online
                        </span>
                      </div>
                    )}
                    
                    {analysis.missing_meta_tags && analysis.missing_meta_tags.length > 0 && (
                      <div className="flex items-start">
                        <Zap className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>SEO:</strong> Ottimizzare i meta tag per migliorare la visibilità sui motori di ricerca
                        </span>
                      </div>
                    )}
                    
                    {!analysis.has_tracking_pixel && (
                      <div className="flex items-start">
                        <Zap className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Analytics:</strong> Installare pixel di tracking per monitorare le conversioni
                        </span>
                      </div>
                    )}
                    
                    {(analysis.page_speed_score || 0) < 70 && (
                      <div className="flex items-start">
                        <Zap className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Performance:</strong> Ottimizzare la velocità di caricamento per migliorare l'user experience
                        </span>
                      </div>
                    )}
                    
                    {!analysis.mobile_friendly && (
                      <div className="flex items-start">
                        <Zap className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Mobile:</strong> Rendere il sito responsive per dispositivi mobili
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
