/**
 * Pagina per l'analisi manuale di siti web
 * Permette agli utenti di inserire un URL e ottenere un'analisi completa
 * Consuma 1 credito per ogni analisi e salva il risultato come lead
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { WebsiteAnalysis } from '../../../lib/types/analysis'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface AnalysisResult {
  leadId: string | undefined
  analysis: WebsiteAnalysis
  creditsRemaining: number
  isSimplifiedAnalysis?: boolean
}

export default function ManualScanPage() {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [responseData, setResponseData] = useState<any>(null)
  const [error, setError] = useState('')
  const [userCredits, setUserCredits] = useState<number | null>(null)
  const router = useRouter()

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Carica crediti utente all'inizio
  useEffect(() => {
    loadUserCredits()
  }, [])

  async function loadUserCredits() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('users')
        .select('credits_remaining')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Errore caricamento crediti:', error)
        return
      }

      setUserCredits(data.credits_remaining)
    } catch (error) {
      console.error('Errore caricamento crediti:', error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!url.trim()) {
      setError('Inserisci un URL valido')
      return
    }

    if (userCredits === null || userCredits < 1) {
      setError('Crediti insufficienti. Effettua l\'upgrade del piano per continuare.')
      return
    }

    setIsLoading(true)
    setError('')
    setResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/tools/manual-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ url: url.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante l\'analisi')
      }

      // Salva i risultati dell'analisi
      setResponseData(data)
      setResult(data.data)
      setUserCredits(data.data.creditsRemaining)

      
    } catch (error) {
      console.error('Errore analisi:', error)
      setError(error instanceof Error ? error.message : 'Errore durante l\'analisi')
    } finally {
      setIsLoading(false)
    }
  }

  function getScoreColor(score: number) {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  function getScoreDescription(score: number) {
    if (score >= 80) return 'Sito ottimizzato - Poche opportunità'
    if (score >= 60) return 'Sito discreto - Alcune opportunità'
    if (score >= 40) return 'Sito migliorabile - Buone opportunità'
    return 'Sito problematico - Ottime opportunità!'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            🔍 Analisi Manuale Siti Web
          </h1>
          <p className="mt-2 text-gray-600">
            Analizza qualsiasi sito web per identificare opportunità di business.
            Ogni analisi costa <span className="font-semibold">1 credito</span>.
          </p>
          
          {userCredits !== null && (
            <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              💳 Crediti rimanenti: {userCredits}
            </div>
          )}
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                URL del sito da analizzare
              </label>
              <div className="flex gap-3">
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://esempio.com"
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                  required
                />
                <button
                  type="submit"
                  disabled={isLoading || (userCredits !== null && userCredits < 1)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analizzando...
                    </>
                  ) : (
                    '🔍 Analizza Sito'
                  )}
                </button>
              </div>
            </div>

            {/* Warning crediti */}
            {userCredits !== null && userCredits < 1 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Crediti insufficienti
                    </h3>
                    <p className="mt-1 text-sm text-yellow-700">
                      Hai bisogno di almeno 1 credito per eseguire un'analisi. 
                      <a href="/upgrade" className="font-medium underline hover:text-yellow-600 ml-1">
                        Effettua l'upgrade del piano
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Conferma costo */}
            {userCredits !== null && userCredits >= 1 && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      💳 Costo analisi: 1 credito
                    </h3>
                    <p className="mt-1 text-sm text-blue-700">
                      L'analisi includerà: SEO, Performance, Tracking, GDPR, Presenza Social e Score complessivo.
                      Il sito analizzato verrà salvato anche come lead per altri utenti.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Errore */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Errore durante l'analisi
                </h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Messaggio Lead Esistente */}
        {responseData?.existingLead && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  🔍 Lead già presente nel database
                </h3>
                <p className="mt-1 text-sm text-blue-700">{responseData.message}</p>
                {responseData.leadInfo && (
                  <div className="mt-3 p-3 bg-blue-100 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
                      <div><strong>Nome Business:</strong> {responseData.leadInfo.businessName || 'Non disponibile'}</div>
                      <div><strong>Punteggio:</strong> <span className={getScoreColor(responseData.leadInfo.score)}>{responseData.leadInfo.score}/100</span></div>
                      <div><strong>Origine:</strong> {responseData.leadInfo.origin === 'manual' ? '🔍 Analisi Manuale' : '🤖 Scraping Automatico'}</div>
                      <div><strong>Data Analisi:</strong> {new Date(responseData.leadInfo.analyzedDate).toLocaleDateString('it-IT')}</div>
                      <div className="md:col-span-2"><strong>URL Originale:</strong> {responseData.leadInfo.websiteUrl}</div>
                    </div>
                  </div>
                )}
                <div className="mt-3 flex items-center space-x-2">
                  <div className="flex items-center text-sm text-green-600 font-medium">
                    <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    ✅ Nessun credito consumato
                  </div>
                  <div className="text-sm text-blue-600">
                    • Analisi completa disponibile qui sotto
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Risultati */}
        {result && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {/* Header risultato */}
            <div className="px-6 py-4 bg-gray-50 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    📊 Risultati Analisi
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {result.analysis.finalUrl}
                  </p>
                  {responseData?.existingLead ? (
                    <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      ♻️ Lead esistente - Nessun credito consumato
                    </div>
                  ) : result.isSimplifiedAnalysis ? (
                    <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      ⚡ Analisi semplificata - 1 credito utilizzato
                    </div>
                  ) : (
                    <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✨ Nuovo lead creato - 1 credito utilizzato
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getScoreColor(result.analysis.overallScore || 0)}`}>
                    {result.analysis.overallScore || 0}/100
                  </div>
                  <div className="text-xs text-gray-500">Score Tecnico</div>
                </div>
              </div>
              <div className="mt-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreColor(result.analysis.overallScore || 0)} bg-opacity-10`}>
                  {getScoreDescription(result.analysis.overallScore || 0)}
                </span>
              </div>
            </div>

            {/* Banner per analisi semplificata */}
            {result.isSimplifiedAnalysis && (
              <div className="mx-6 mt-4 mb-0 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Analisi Semplificata</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        Questa è un'analisi semplificata eseguita senza browser. Alcune metriche come performance, immagini rotte e layout responsivo potrebbero non essere precise. 
                        L'analisi semplificata non viene salvata nel database.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Contenuto risultato */}
            <div className="p-6 space-y-6">
              
              {/* Status generale */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className={`text-lg font-semibold ${result.analysis.isAccessible ? 'text-green-600' : 'text-red-600'}`}>
                    {result.analysis.isAccessible ? '✅' : '❌'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {result.analysis.isAccessible ? 'Sito Accessibile' : 'Sito Non Accessibile'}
                  </div>
                  <div className="text-xs text-gray-500">
                    HTTP {result.analysis.httpStatus}
                  </div>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className={`text-lg font-semibold ${result.analysis.performance.loadTime < 3000 ? 'text-green-600' : 'text-red-600'}`}>
                    ⚡
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Performance</div>
                  <div className="text-xs text-gray-500">
                    {(result.analysis.performance.loadTime / 1000).toFixed(1)}s caricamento
                  </div>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className={`text-lg font-semibold ${result.analysis.performance.isResponsive ? 'text-green-600' : 'text-red-600'}`}>
                    📱
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Mobile</div>
                  <div className="text-xs text-gray-500">
                    {result.analysis.performance.isResponsive ? 'Responsive' : 'Non Responsive'}
                  </div>
                </div>
              </div>

              {/* Dettagli analisi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* SEO */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">🎯 SEO Base</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Titolo</span>
                      <span className={`text-sm ${result.analysis.seo.hasTitle ? 'text-green-600' : 'text-red-600'}`}>
                        {result.analysis.seo.hasTitle ? `✅ (${result.analysis.seo.titleLength} char)` : '❌ Mancante'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Meta Description</span>
                      <span className={`text-sm ${result.analysis.seo.hasMetaDescription ? 'text-green-600' : 'text-red-600'}`}>
                        {result.analysis.seo.hasMetaDescription ? `✅ (${result.analysis.seo.metaDescriptionLength} char)` : '❌ Mancante'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Header H1</span>
                      <span className={`text-sm ${result.analysis.seo.hasH1 ? 'text-green-600' : 'text-red-600'}`}>
                        {result.analysis.seo.hasH1 ? `✅ (${result.analysis.seo.h1Count})` : '❌ Mancante'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Dati Strutturati</span>
                      <span className={`text-sm ${result.analysis.seo.hasStructuredData ? 'text-green-600' : 'text-orange-600'}`}>
                        {result.analysis.seo.hasStructuredData ? '✅ Presenti' : '⚠️ Assenti'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tracking */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">📈 Tracking & Analytics</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Google Analytics</span>
                      <span className={`text-sm ${result.analysis.tracking.hasGoogleAnalytics ? 'text-green-600' : 'text-red-600'}`}>
                        {result.analysis.tracking.hasGoogleAnalytics ? '✅ Installato' : '❌ Non rilevato'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Facebook Pixel</span>
                      <span className={`text-sm ${result.analysis.tracking.hasFacebookPixel ? 'text-green-600' : 'text-red-600'}`}>
                        {result.analysis.tracking.hasFacebookPixel ? '✅ Installato' : '❌ Non rilevato'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Google Tag Manager</span>
                      <span className={`text-sm ${result.analysis.tracking.hasGoogleTagManager ? 'text-green-600' : 'text-red-600'}`}>
                        {result.analysis.tracking.hasGoogleTagManager ? '✅ Installato' : '❌ Non rilevato'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Hotjar</span>
                      <span className={`text-sm ${result.analysis.tracking.hasHotjar ? 'text-green-600' : 'text-orange-600'}`}>
                        {result.analysis.tracking.hasHotjar ? '✅ Installato' : '⚠️ Non rilevato'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Microsoft Clarity</span>
                      <span className={`text-sm ${result.analysis.tracking.hasClarityMicrosoft ? 'text-green-600' : 'text-orange-600'}`}>
                        {result.analysis.tracking.hasClarityMicrosoft ? '✅ Installato' : '⚠️ Non rilevato'}
                      </span>
                    </div>
                    {result.analysis.tracking.customTracking.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Altri Tracking</span>
                        <span className="text-sm text-blue-600">
                          ℹ️ {result.analysis.tracking.customTracking.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Seconda riga - GDPR e Legal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* GDPR & Privacy */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">🔒 GDPR & Privacy</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Cookie Banner</span>
                      <span className={`text-sm ${result.analysis.gdpr.hasCookieBanner ? 'text-green-600' : 'text-red-600'}`}>
                        {result.analysis.gdpr.hasCookieBanner ? '✅ Presente' : '❌ Assente'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Privacy Policy</span>
                      <span className={`text-sm ${result.analysis.gdpr.hasPrivacyPolicy ? 'text-green-600' : 'text-red-600'}`}>
                        {result.analysis.gdpr.hasPrivacyPolicy ? '✅ Presente' : '❌ Assente'}
                      </span>
                    </div>
                    {result.analysis.gdpr.privacyPolicyUrl && (
                      <div className="text-xs text-blue-600 truncate">
                        🔗 {result.analysis.gdpr.privacyPolicyUrl}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Termini di Servizio</span>
                      <span className={`text-sm ${result.analysis.gdpr.hasTermsOfService ? 'text-green-600' : 'text-orange-600'}`}>
                        {result.analysis.gdpr.hasTermsOfService ? '✅ Presenti' : '⚠️ Assenti'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Metodo Consenso</span>
                      <span className="text-sm text-gray-900">
                        {result.analysis.gdpr.cookieConsentMethod === 'banner' ? '📄 Banner' : 
                         result.analysis.gdpr.cookieConsentMethod === 'popup' ? '🪟 Popup' : '❌ Nessuno'}
                      </span>
                    </div>
                    {result.analysis.gdpr.riskyEmbeds.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Embed Rischiosi</span>
                        <span className="text-sm text-orange-600">
                          ⚠️ {result.analysis.gdpr.riskyEmbeds.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Legal Compliance */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">⚖️ Compliance Legale</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Partita IVA</span>
                      <span className={`text-sm ${result.analysis.legal.hasVisiblePartitaIva ? 'text-green-600' : 'text-red-600'}`}>
                        {result.analysis.legal.hasVisiblePartitaIva ? '✅ Visibile' : '❌ Non trovata'}
                      </span>
                    </div>
                    {result.analysis.legal.partitaIvaLocation && (
                      <div className="text-xs text-gray-500">
                        📍 Posizione: {result.analysis.legal.partitaIvaLocation}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Indirizzo Business</span>
                      <span className={`text-sm ${result.analysis.legal.hasBusinessAddress ? 'text-green-600' : 'text-orange-600'}`}>
                        {result.analysis.legal.hasBusinessAddress ? '✅ Presente' : '⚠️ Non trovato'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Info Contatto</span>
                      <span className={`text-sm ${result.analysis.legal.hasContactInfo ? 'text-green-600' : 'text-red-600'}`}>
                        {result.analysis.legal.hasContactInfo ? '✅ Presenti' : '❌ Mancanti'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Score Conformità</span>
                      <span className={`text-sm font-medium ${result.analysis.legal.complianceScore >= 70 ? 'text-green-600' : 
                                                                  result.analysis.legal.complianceScore >= 40 ? 'text-orange-600' : 'text-red-600'}`}>
                        {result.analysis.legal.complianceScore}/100
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terza riga - Social e Performance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Social Presence */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">📱 Presenza Social</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Presenza Social</span>
                      <span className={`text-sm ${result.analysis.social.hasAnySocial ? 'text-green-600' : 'text-orange-600'}`}>
                        {result.analysis.social.hasAnySocial ? `✅ ${result.analysis.social.socialCount} piattaforme` : '⚠️ Nessuna'}
                      </span>
                    </div>
                    {result.analysis.social.facebook && (
                      <div className="text-xs text-blue-600 truncate">
                        📘 Facebook: {result.analysis.social.facebook}
                      </div>
                    )}
                    {result.analysis.social.instagram && (
                      <div className="text-xs text-pink-600 truncate">
                        📷 Instagram: {result.analysis.social.instagram}
                      </div>
                    )}
                    {result.analysis.social.linkedin && (
                      <div className="text-xs text-blue-700 truncate">
                        💼 LinkedIn: {result.analysis.social.linkedin}
                      </div>
                    )}
                    {result.analysis.social.youtube && (
                      <div className="text-xs text-red-600 truncate">
                        📺 YouTube: {result.analysis.social.youtube}
                      </div>
                    )}
                    {result.analysis.social.twitter && (
                      <div className="text-xs text-blue-400 truncate">
                        🐦 Twitter/X: {result.analysis.social.twitter}
                      </div>
                    )}
                    {result.analysis.social.tiktok && (
                      <div className="text-xs text-black truncate">
                        🎵 TikTok: {result.analysis.social.tiktok}
                      </div>
                    )}
                  </div>
                </div>

                {/* Performance Dettagliata */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">⚡ Performance Dettagliata</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Tempo Caricamento</span>
                      <span className={`text-sm font-medium ${result.analysis.performance.loadTime < 2000 ? 'text-green-600' : 
                                                               result.analysis.performance.loadTime < 3000 ? 'text-orange-600' : 'text-red-600'}`}>
                        {(result.analysis.performance.loadTime / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Immagini Totali</span>
                      <span className="text-sm text-gray-900">
                        {result.analysis.performance.totalImages}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Immagini Rotte</span>
                      <span className={`text-sm ${result.analysis.performance.brokenImages === 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {result.analysis.performance.brokenImages === 0 ? '✅ Nessuna' : `❌ ${result.analysis.performance.brokenImages}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Design Responsive</span>
                      <span className={`text-sm ${result.analysis.performance.isResponsive ? 'text-green-600' : 'text-red-600'}`}>
                        {result.analysis.performance.isResponsive ? '✅ Sì' : '❌ No'}
                      </span>
                    </div>
                    {result.analysis.performance.averageImageSize && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Dimensione Media Img</span>
                        <span className="text-sm text-gray-900">
                          {Math.round(result.analysis.performance.averageImageSize)}KB
                        </span>
                      </div>
                    )}
                    {result.analysis.performance.networkRequests && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Richieste di Rete</span>
                        <span className="text-sm text-gray-900">
                          {result.analysis.performance.networkRequests}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Problemi identificati */}
              {Object.values(result.analysis.issues).some(issue => issue) && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">⚠️ Problemi Identificati</h3>
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <ul className="space-y-1 text-sm text-red-700">
                      {result.analysis.issues.missingTitle && <li>• Titolo mancante</li>}
                      {result.analysis.issues.shortTitle && <li>• Titolo troppo corto</li>}
                      {result.analysis.issues.missingMetaDescription && <li>• Meta description mancante</li>}
                      {result.analysis.issues.shortMetaDescription && <li>• Meta description troppo corta</li>}
                      {result.analysis.issues.missingH1 && <li>• Header H1 mancante</li>}
                      {result.analysis.issues.slowLoading && <li>• Caricamento lento</li>}
                      {result.analysis.issues.noTracking && <li>• Nessun sistema di tracking</li>}
                      {result.analysis.issues.httpsIssues && <li>• Problemi HTTPS</li>}
                    </ul>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t">
                <button
                  onClick={() => router.push(`/lead/${result.leadId}`)}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  📄 Vedi Lead Completo
                </button>
                
                <button
                  onClick={() => {
                    setResult(null)
                    setUrl('')
                    setError('')
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  🔍 Nuova Analisi
                </button>
              </div>

              {/* Info finale */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      ✨ Analisi completata!
                    </h3>
                    <p className="mt-1 text-sm text-blue-700">
                      Il sito è stato analizzato e salvato nel database.
                      <br />
                      💳 Crediti rimanenti: {result.creditsRemaining}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
