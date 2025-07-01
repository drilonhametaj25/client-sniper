/**
 * Pagina pubblica per analisi freemium di siti web
 * Permette 2 analisi gratuite al giorno per IP senza registrazione
 * Ottimizzata per SEO con schema markup e meta tag avanzati
 * Include footer e struttura completa per migliorare il ranking
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Crown, 
  Zap, 
  Eye,
  BarChart3,
  ArrowRight,
  Sparkles,
  Lock,
  Gift,
  Target,
  Shield,
  Globe,
  TrendingUp
} from 'lucide-react'
import NewsletterForm from '@/components/NewsletterForm'

interface PublicAnalysisResult {
  url: string
  finalUrl: string
  isAccessible: boolean
  httpStatus: number
  seo: {
    hasTitle: boolean
    hasMetaDescription: boolean
    hasH1: boolean
    score: number
  }
  performance: {
    loadTime: number
    isResponsive: boolean
    score: number
  }
  social: {
    hasAnySocial: boolean
    socialCount: number
  }
  tracking: {
    hasAnyTracking: boolean
  }
  overallScore: number
  isLimitedAnalysis: boolean
  upgradeMessage: string
}

interface PublicAnalysisResponse {
  success: boolean
  analysis?: PublicAnalysisResult
  existingLead?: boolean
  leadInfo?: {
    businessName: string
    score: number
    analyzedDate: string
  }
  message: string
  upgradeMessage?: string
  remainingAnalyses: number
}

interface UsageInfo {
  used: number
  limit: number
  remaining: number
  canAnalyze: boolean
}

export default function PublicScanPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PublicAnalysisResult | null>(null)
  const [responseData, setResponseData] = useState<PublicAnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<UsageInfo | null>(null)

  // Carica info utilizzo all'avvio
  useEffect(() => {
    loadUsageInfo()
  }, [])

  const loadUsageInfo = async () => {
    try {
      const response = await fetch('/api/tools/public-scan')
      const data = await response.json()
      setUsage(data)
    } catch (error) {
      console.error('Errore caricamento info utilizzo:', error)
    }
  }

  const handleAnalyze = async () => {
    if (!url.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/tools/public-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setError(data.message || 'Limite giornaliero raggiunto')
        } else {
          setError(data.error || 'Errore durante l\'analisi')
        }
        return
      }

      // Gestisce sia analisi nuove che lead esistenti
      setResponseData(data)
      if (data.analysis) {
        console.log('Analisi pubblica ricevuta:', data.analysis)
        console.log('Overall Score:', data.analysis.overallScore)
        console.log('Lead Info Score:', data.leadInfo?.score)
        console.log('Oggetto completo data:', data)
        setResult(data.analysis)
      }
      
      // Rimuovi eventuali errori precedenti per lead esistenti
      if (data.existingLead) {
        setError(null)
      }

      await loadUsageInfo() // Ricarica info utilizzo

    } catch (error) {
      console.error('Errore analisi:', error)
      setError('Errore di connessione. Riprova tra qualche minuto.')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 70) return 'bg-green-50 border-green-200'
    if (score >= 40) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b" role="banner">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center space-x-3" aria-label="Torna alla homepage di TrovaMi">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">TrovaMi</span>
              </Link>
              
              <nav className="flex items-center space-x-4" aria-label="Navigazione principale">
                <Link 
                  href="/login"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Accedi
                </Link>
                <Link 
                  href="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Registrati Gratis
                </Link>
              </nav>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12" role="main">
          {/* Hero Section */}
          <section className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Gift className="h-8 w-8 text-purple-600 mr-3" />
              <h1 className="text-4xl font-bold text-gray-900">
                Audit Digitale Gratuito
              </h1>
            </div>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Audit tecnico professionale gratuito del tuo sito web. Analisi completa di oltre 70 parametri: 
              performance, SEO tecnico, sicurezza e compliance GDPR in tempo reale.
            </p>
            
            {/* Features highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span>Audit Performance</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <Shield className="h-4 w-4 text-blue-600" />
                <span>SEO Tecnico</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <Globe className="h-4 w-4 text-purple-600" />
                <span>Compliance Check</span>
              </div>
            </div>
          </section>

          {/* Usage Info */}
          {usage && (
            <section className="mb-8" aria-labelledby="usage-info">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <Eye className="h-5 w-5 text-purple-600 mr-2" />
                  <h2 id="usage-info" className="text-lg font-semibold text-gray-900">
                    Utilizzo Giornaliero
                  </h2>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">
                    Analisi utilizzate oggi: <strong>{usage.used}/{usage.limit}</strong>
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(usage.used / usage.limit) * 100}%` }}
                      ></div>
                    </div>
                    <span className={`text-sm font-medium ${usage.canAnalyze ? 'text-green-600' : 'text-red-600'}`}>
                      {usage.remaining} rimaste
                    </span>
                  </div>
                </div>
                {!usage.canAnalyze && (
                  <div className="mt-3 text-sm text-orange-600">
                    Hai utilizzato tutte le <strong>{usage.limit}</strong> analisi gratuite di oggi. 
                    <Link href="/register" className="text-blue-600 hover:text-blue-800 font-medium ml-1">
                      Registrati gratis per analisi illimitate!
                    </Link>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Analysis Form */}
          <section className="mb-12" aria-labelledby="analysis-form">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
              <h2 id="analysis-form" className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Inserisci l'URL del sito da analizzare
              </h2>
              <form onSubmit={(e) => { e.preventDefault(); handleAnalyze(); }} className="space-y-6">
                <div>
                  <label htmlFor="website-url" className="block text-sm font-medium text-gray-700 mb-2">
                    URL Sito Web
                  </label>
                  <div className="relative">
                    <input
                      id="website-url"
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://esempio.com"
                      className="w-full px-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                      disabled={loading || (usage ? !usage.canAnalyze : false)}
                      required
                      aria-describedby="url-help"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  <p id="url-help" className="mt-2 text-sm text-gray-500">
                    Inserisci l'URL completo del sito web che vuoi analizzare (es. https://tuosito.com)
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
                    <div className="flex">
                      <AlertTriangle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-red-700 text-sm">{error}</p>
                        {error.includes('limite') && (
                          <p className="mt-2 text-sm text-red-600">
                            💡 <Link href="/register" className="underline font-medium">Registrati gratuitamente</Link> per ottenere analisi illimitate!
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Messaggio Lead Esistente */}
                {responseData?.existingLead && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4" role="status">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="h-5 w-5 text-blue-500 mr-2" />
                      <span className="text-blue-800 font-medium">Sito già nel nostro database!</span>
                    </div>
                    <p className="text-blue-700 text-sm mb-3">{responseData.message}</p>
                    {responseData.leadInfo && (
                      <div className="bg-blue-100 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          <strong>Business:</strong> {responseData.leadInfo.businessName || 'N/A'}<br />
                          <strong>Punteggio:</strong> {responseData.leadInfo.score}/100<br />
                          <strong>Analizzato il:</strong> {new Date(responseData.leadInfo.analyzedDate).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !url.trim() || (usage ? !usage.canAnalyze : false)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Analisi in corso...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5 mr-2" />
                      {usage ? !usage.canAnalyze ? 'Limite Giornaliero Raggiunto' : 'Analizza Gratis' : 'Analizza Gratis'}
                    </>
                  )}
                </button>
              </form>
            </div>
          </section>

          {/* Results Section */}
          {result && (
            <section className="mb-12" aria-labelledby="analysis-results">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                <h2 id="analysis-results" className="text-2xl font-bold text-gray-900 mb-6 text-center">
                  Risultati Analisi per <span className="text-blue-600">{result.url || result.finalUrl || 'Sito Web'}</span>
                </h2>
                
                {/* Overall Score */}
                <div className={`border-2 rounded-xl p-6 mb-8 text-center ${getScoreBgColor(result.overallScore || responseData?.leadInfo?.score || 0)}`}>
                  <div className={`text-6xl font-bold mb-2 ${getScoreColor(result.overallScore || responseData?.leadInfo?.score || 0)}`}>
                    {result.overallScore || responseData?.leadInfo?.score || 0}/100
                  </div>
                  <div className="text-lg font-semibold text-gray-700 mb-2">
                    Punteggio Complessivo
                  </div>
                  <div className="text-sm text-gray-600">
                    {(result.overallScore || responseData?.leadInfo?.score || 0) >= 70 && 'Sito ben ottimizzato - Poche opportunità di miglioramento'}
                    {(result.overallScore || responseData?.leadInfo?.score || 0) >= 40 && (result.overallScore || responseData?.leadInfo?.score || 0) < 70 && 'Sito discreto - Buone opportunità di ottimizzazione'}
                    {(result.overallScore || responseData?.leadInfo?.score || 0) < 40 && 'Molte opportunità di miglioramento - Potenziale lead caldo!'}
                  </div>
                  
                  {result.isLimitedAnalysis && (
                    <div className="mt-4 bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                      <div className="flex items-center justify-center">
                        <Lock className="h-4 w-4 text-yellow-600 mr-2" />
                        <span className="text-sm text-yellow-800 font-medium">
                          Analisi limitata - Registrati per vedere tutti i dettagli
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Analysis Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* SEO Score */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">SEO Base</h3>
                      <div className={`text-2xl font-bold ${getScoreColor(result.seo?.score || 0)}`}>
                        {result.seo?.score || 0}/100
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Title Tag</span>
                        {result.seo?.hasTitle ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Meta Description</span>
                        {result.seo?.hasMetaDescription ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Heading H1</span>
                        {result.seo?.hasH1 ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Performance Score */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Performance</h3>
                      <div className={`text-2xl font-bold ${getScoreColor(result.performance?.score || 0)}`}>
                        {result.performance?.score || 0}/100
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Responsive Design</span>
                        {result.performance?.isResponsive ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">Tempo di Caricamento</span>
                        <span className={`text-sm font-medium ${(result.performance?.loadTime || 0) > 3000 ? 'text-red-600' : (result.performance?.loadTime || 0) > 2000 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {Math.round((result.performance?.loadTime || 0) / 1000 * 10) / 10}s
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Sicurezza HTTPS</span>
                        {(result.url || result.finalUrl || '').startsWith('https://') ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Tracking & Analytics */}
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">🔍 Tracking & Analytics</h3>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${result.tracking?.hasAnyTracking ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {result.tracking?.hasAnyTracking ? 'Installato' : 'Non rilevato'}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Sistema di Tracciamento</span>
                        {result.tracking?.hasAnyTracking ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      {!result.tracking?.hasAnyTracking && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-xs text-yellow-800">
                            💡 Nessun pixel di tracking rilevato. Opportunità per migliorare l'analisi dei visitatori.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Social Presence */}
                  <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">📱 Presenza Social</h3>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${result.social?.hasAnySocial ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {result.social?.socialCount || 0} link
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Link Social Media</span>
                        {result.social?.hasAnySocial ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      {!result.social?.hasAnySocial && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs text-blue-800">
                            💡 Nessun link ai social media trovato. Opportunità per aumentare la presenza online.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Upgrade CTA */}
          <section className="mb-16" aria-labelledby="upgrade-cta">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white text-center">
              <Crown className="h-12 w-12 mx-auto mb-4 text-yellow-300" />
              <h2 id="upgrade-cta" className="text-2xl font-bold mb-4">
                Ottieni l'Analisi Completa
              </h2>
              <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                L'analisi gratuita mostra solo il 20% dei problemi. 
                Registrati gratuitamente per vedere l'analisi completa con raccomandazioni dettagliate, 
                tracking avanzato, conformità GDPR e molto altro!
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-left">
                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">✅ Analisi Completa</h4>
                  <p className="text-sm text-blue-100">Tutti i 50+ controlli tecnici</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">📊 Raccomandazioni</h4>
                  <p className="text-sm text-blue-100">Lista prioritizzata di miglioramenti</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">🔄 Analisi Illimitate</h4>
                  <p className="text-sm text-blue-100">Nessun limite giornaliero</p>
                </div>
              </div>
              
              <Link 
                href="/register"
                className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Registrati Gratis
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </div>
          </section>

          {/* SEO Content Section */}
          <section className="mb-16" aria-labelledby="seo-content">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
              <h2 id="seo-content" className="text-2xl font-bold text-gray-900 mb-6">
                Perché Analizzare il Tuo Sito Web?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    🚀 Migliora le Performance
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Un sito veloce migliora l'esperienza utente e il ranking sui motori di ricerca. 
                    La nostra analisi identifica i colli di bottiglia che rallentano il tuo sito.
                  </p>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    📈 Ottimizza per i Motori di Ricerca
                  </h3>
                  <p className="text-gray-600">
                    Verifica se il tuo sito ha tutti gli elementi SEO essenziali: 
                    title tag, meta description, heading strutturati e molto altro.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    📱 Controlla la Responsività
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Oltre il 60% del traffico web arriva da mobile. 
                    Assicurati che il tuo sito sia perfettamente visualizzabile su tutti i dispositivi.
                  </p>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    🛡️ Verifica la Sicurezza
                  </h3>
                  <p className="text-gray-600">
                    Controlla se il tuo sito utilizza HTTPS e ha le configurazioni di sicurezza corrette 
                    per proteggere i dati dei tuoi utenti.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Newsletter Section */}
          <section className="mb-16" aria-labelledby="newsletter-section">
            <div className="max-w-2xl mx-auto">
              <NewsletterForm
                title="Vuoi Altri Consigli Gratuiti?"
                description="Iscriviti e ricevi ogni mese lead gratuiti e strategie avanzate per l'acquisizione clienti"
                source="public_scan"
                variant="default"
              />
            </div>
          </section>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Newsletter compatta nel footer */}
          <div className="mb-16 p-8 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl border border-white/10">
            <NewsletterForm
              title="Newsletter Professionale"
              description="Lead qualificati e strategie di acquisizione clienti"
              placeholder="Il tuo indirizzo email"
              buttonText="Iscriviti"
              source="public_scan_footer"
              variant="compact"
              className="max-w-2xl mx-auto"
            />
          </div>

          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold">TrovaMi</span>
              </div>
              <p className="text-gray-400 text-lg leading-relaxed max-w-md">
                La piattaforma più avanzata per trovare lead qualificati attraverso l'analisi automatizzata di siti web aziendali.
              </p>
              <div className="mt-6 flex space-x-4">
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors" aria-label="Twitter">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors" aria-label="LinkedIn">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Prodotto</h3>
              <ul className="space-y-3">
                <li><Link href="/#features" className="text-gray-400 hover:text-white transition-colors">Funzionalità</Link></li>
                <li><Link href="/#pricing" className="text-gray-400 hover:text-white transition-colors">Prezzi</Link></li>
                <li><Link href="/tools/public-scan" className="text-gray-400 hover:text-white transition-colors">Analisi Gratuita</Link></li>
                <li><Link href="/login" className="text-gray-400 hover:text-white transition-colors">Login</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Risorse</h3>
              <ul className="space-y-3">
                <li><Link href="/come-trovare-clienti" className="text-gray-400 hover:text-white transition-colors">Come Trovare Clienti</Link></li>
                <li><Link href="/lead-generation-agenzie" className="text-gray-400 hover:text-white transition-colors">Lead Generation Agenzie</Link></li>
                <li><Link href="/help" className="text-gray-400 hover:text-white transition-colors">Centro Assistenza</Link></li>
                <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors">Contatti</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 mb-4 md:mb-0">
              <p className="text-gray-400">
                &copy; 2025 TrovaMi. Tutti i diritti riservati.
              </p>
              <div className="flex items-center space-x-4 text-sm">
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <span className="text-gray-600">•</span>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                  Termini e Condizioni
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <span>Made in Italy 🇮🇹</span>
              <span>•</span>
              <span>Powered by Drilon Hametaj</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
