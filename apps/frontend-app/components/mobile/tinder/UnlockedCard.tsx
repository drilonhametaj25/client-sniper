/**
 * UnlockedCard - Vista post-sblocco con contatti e analisi
 *
 * Mostra:
 * - Animazione di successo
 * - Tab navigation: Analisi | Contatti
 * - Tab Analisi: score breakdown, servizi, budget stimato
 * - Tab Contatti: telefono, email, website
 * - Pulsante "Vedi Analisi Completa" → apre vista fullscreen
 * - Vista fullscreen: analisi dettagliata completa
 * - Pulsante per passare al prossimo lead
 */

'use client'

import { useEffect, useState } from 'react'
import {
  Phone,
  Mail,
  Globe,
  ExternalLink,
  ChevronRight,
  CheckCircle,
  Copy,
  Check,
  BarChart3,
  Users,
  AlertTriangle,
  TrendingUp,
  X,
  ChevronDown,
  Search,
  Zap,
  Smartphone,
  Shield,
  Cookie,
  Eye,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowLeft
} from 'lucide-react'
import { detectServices } from '@/lib/utils/service-detection'
import { SERVICE_CONFIGS, type DetectedServices } from '@/lib/types/services'

interface Lead {
  id: string
  business_name?: string
  website_url?: string
  city?: string
  category?: string
  score: number
  issues?: string[]
  analysis?: any
  website_analysis?: any
}

interface UnlockedCardProps {
  lead: Lead
  phone?: string
  email?: string
  onNext: () => void
}

type TabType = 'analysis' | 'contacts'

export default function UnlockedCard({
  lead,
  phone,
  email,
  onNext
}: UnlockedCardProps) {
  const [showContent, setShowContent] = useState(false)
  const [copiedField, setCopiedField] = useState<'phone' | 'email' | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('analysis')
  const [showFullAnalysis, setShowFullAnalysis] = useState(false)

  // Analisi lead
  const analysis = lead.website_analysis || lead.analysis
  const detectedServices: DetectedServices | null = analysis ? detectServices(analysis) : null

  // Animazione di entrata
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300)
    return () => clearTimeout(timer)
  }, [])

  // Copia negli appunti
  const handleCopy = async (text: string, field: 'phone' | 'email') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      console.warn('Clipboard API non supportata')
    }
  }

  // Formatta numero telefono per chiamata
  const formatPhoneForCall = (phoneNumber: string) => {
    return phoneNumber.replace(/\s/g, '').replace(/[^\d+]/g, '')
  }

  // Calcola score colore
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    if (score >= 40) return 'text-orange-500'
    return 'text-red-500'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30'
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30'
    if (score >= 40) return 'bg-orange-100 dark:bg-orange-900/30'
    return 'bg-red-100 dark:bg-red-900/30'
  }

  // Get score dal analysis
  const getAnalysisScore = (key: string): number | null => {
    if (!analysis) return null

    const scores: Record<string, number | undefined> = {
      seo: analysis.seo?.score ?? analysis.seoScore,
      performance: analysis.performance?.score ?? analysis.performanceScore,
      mobile: analysis.mobile?.score ?? analysis.mobileScore,
      security: analysis.security?.score ?? analysis.securityScore,
      tracking: analysis.tracking?.score ?? (analysis.tracking?.hasGoogleAnalytics ? 70 : 30),
    }

    return scores[key] ?? null
  }

  // Estrai problemi dall'analisi
  const getIssues = (): string[] => {
    if (lead.issues && lead.issues.length > 0) return lead.issues
    if (!analysis) return []

    const issues: string[] = []

    // SEO issues
    if (analysis.seo) {
      if (!analysis.seo.hasTitle) issues.push('Manca il tag title')
      if (!analysis.seo.hasMetaDescription) issues.push('Manca la meta description')
      if (!analysis.seo.hasH1) issues.push('Manca il tag H1')
      if (!analysis.seo.hasSitemap) issues.push('Sitemap non trovata')
      if (!analysis.seo.hasRobotsTxt) issues.push('File robots.txt mancante')
    }

    // Performance issues
    if (analysis.performance) {
      if (analysis.performance.loadTime > 3) issues.push(`Tempo di caricamento lento: ${analysis.performance.loadTime.toFixed(1)}s`)
      if (analysis.performance.pageSize > 3000000) issues.push('Pagina troppo pesante')
    }

    // Security issues
    if (analysis.security) {
      if (!analysis.security.hasSSL) issues.push('Manca certificato SSL')
      if (!analysis.security.hasSecurityHeaders) issues.push('Header di sicurezza mancanti')
    }

    // Mobile issues
    if (analysis.mobile) {
      if (!analysis.mobile.isResponsive) issues.push('Sito non responsive')
      if (!analysis.mobile.hasViewport) issues.push('Meta viewport mancante')
    }

    // Tracking issues
    if (analysis.tracking) {
      if (!analysis.tracking.hasGoogleAnalytics) issues.push('Google Analytics non configurato')
      if (!analysis.tracking.hasFacebookPixel) issues.push('Facebook Pixel non installato')
    }

    // GDPR issues
    if (analysis.gdpr || analysis.legal) {
      const gdpr = analysis.gdpr || analysis.legal
      if (!gdpr.hasCookieBanner) issues.push('Cookie banner mancante')
      if (!gdpr.hasPrivacyPolicy) issues.push('Privacy policy non trovata')
    }

    return issues
  }

  // Genera raccomandazioni
  const getRecommendations = (): { priority: 'high' | 'medium' | 'low'; text: string }[] => {
    const recommendations: { priority: 'high' | 'medium' | 'low'; text: string }[] = []

    if (!analysis) return recommendations

    // SEO
    const seoScore = getAnalysisScore('seo')
    if (seoScore !== null && seoScore < 60) {
      recommendations.push({ priority: 'high', text: 'Ottimizzazione SEO urgente: migliorare title, meta description e struttura H1-H6' })
    }

    // Performance
    const perfScore = getAnalysisScore('performance')
    if (perfScore !== null && perfScore < 50) {
      recommendations.push({ priority: 'high', text: 'Performance critica: ottimizzare immagini, ridurre JS/CSS, implementare caching' })
    }

    // Mobile
    const mobileScore = getAnalysisScore('mobile')
    if (mobileScore !== null && mobileScore < 60) {
      recommendations.push({ priority: 'high', text: 'Esperienza mobile da migliorare: implementare design responsive' })
    }

    // Security
    if (analysis.security && !analysis.security.hasSSL) {
      recommendations.push({ priority: 'high', text: 'Installare certificato SSL per sicurezza e SEO' })
    }

    // Tracking
    if (analysis.tracking && !analysis.tracking.hasGoogleAnalytics) {
      recommendations.push({ priority: 'medium', text: 'Configurare Google Analytics per monitorare il traffico' })
    }

    // GDPR
    const gdpr = analysis.gdpr || analysis.legal
    if (gdpr && !gdpr.hasCookieBanner) {
      recommendations.push({ priority: 'high', text: 'Implementare cookie banner per conformità GDPR' })
    }

    return recommendations.slice(0, 5)
  }

  const issues = getIssues()
  const recommendations = getRecommendations()

  // FULLSCREEN ANALYSIS VIEW
  if (showFullAnalysis) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setShowFullAnalysis(false)}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Indietro</span>
            </button>
            <div className="text-center">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                Analisi Completa
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {lead.category} • {lead.city}
              </p>
            </div>
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 pb-24 space-y-6">
          {/* Score Overview */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Score Generale
              </h2>
              <div className={`text-3xl font-bold ${getScoreColor(lead.score)}`}>
                {lead.score}/100
              </div>
            </div>

            {/* Score Breakdown Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'seo', label: 'SEO', icon: Search },
                { key: 'performance', label: 'Performance', icon: Zap },
                { key: 'mobile', label: 'Mobile', icon: Smartphone },
                { key: 'security', label: 'Sicurezza', icon: Shield },
              ].map(({ key, label, icon: Icon }) => {
                const score = getAnalysisScore(key)
                return (
                  <div
                    key={key}
                    className={`p-4 rounded-xl ${score !== null ? getScoreBgColor(score) : 'bg-gray-100 dark:bg-gray-700'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                    </div>
                    <div className={`text-2xl font-bold ${score !== null ? getScoreColor(score) : 'text-gray-400'}`}>
                      {score !== null ? `${score}%` : 'N/A'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Servizi Richiesti */}
          {detectedServices && detectedServices.services.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Servizi Richiesti
              </h2>
              <div className="space-y-3">
                {detectedServices.services.map((service) => {
                  const config = SERVICE_CONFIGS[service.type]
                  return (
                    <div
                      key={service.type}
                      className={`flex items-center justify-between p-4 rounded-xl ${config.bgColor}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{config.icon}</span>
                        <div>
                          <div className={`font-semibold ${config.textColor}`}>
                            {config.label}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {service.issueCount} problemi rilevati
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${config.textColor}`}>
                          €{config.baseBudget.min} - €{config.baseBudget.max}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          budget stimato
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Budget Totale */}
              <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                    Budget Totale Stimato
                  </span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    €{detectedServices.totalBudget.min.toLocaleString()} - €{detectedServices.totalBudget.max.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Problemi Rilevati */}
          {issues.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Problemi Rilevati ({issues.length})
              </h2>
              <div className="space-y-2">
                {issues.map((issue, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
                  >
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-red-700 dark:text-red-300">{issue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raccomandazioni */}
          {recommendations.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                Raccomandazioni
              </h2>
              <div className="space-y-3">
                {recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      rec.priority === 'high'
                        ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500'
                        : rec.priority === 'medium'
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500'
                        : 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold uppercase ${
                          rec.priority === 'high' ? 'text-red-600' :
                          rec.priority === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                        }`}>
                          {rec.priority === 'high' ? 'Priorità Alta' :
                           rec.priority === 'medium' ? 'Priorità Media' : 'Priorità Bassa'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{rec.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dettagli Tecnici */}
          {analysis && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Dettagli Tecnici
              </h2>
              <div className="space-y-4">
                {/* SEO Details */}
                {analysis.seo && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Search className="w-4 h-4" /> SEO
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        {analysis.seo.hasTitle ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                        <span className="text-gray-600 dark:text-gray-400">Title tag</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {analysis.seo.hasMetaDescription ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                        <span className="text-gray-600 dark:text-gray-400">Meta description</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {analysis.seo.hasH1 ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                        <span className="text-gray-600 dark:text-gray-400">H1 tag</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {analysis.seo.hasSitemap ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                        <span className="text-gray-600 dark:text-gray-400">Sitemap</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Performance Details */}
                {analysis.performance && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Zap className="w-4 h-4" /> Performance
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {analysis.performance.loadTime && (
                        <div className="flex items-center gap-2">
                          <span className={analysis.performance.loadTime < 3 ? 'text-green-500' : 'text-red-500'}>●</span>
                          <span className="text-gray-600 dark:text-gray-400">
                            Load time: {analysis.performance.loadTime.toFixed(1)}s
                          </span>
                        </div>
                      )}
                      {analysis.performance.pageSize && (
                        <div className="flex items-center gap-2">
                          <span className={analysis.performance.pageSize < 2000000 ? 'text-green-500' : 'text-orange-500'}>●</span>
                          <span className="text-gray-600 dark:text-gray-400">
                            Dimensione: {(analysis.performance.pageSize / 1000000).toFixed(1)}MB
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tracking Details */}
                {analysis.tracking && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Tracking
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        {analysis.tracking.hasGoogleAnalytics ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                        <span className="text-gray-600 dark:text-gray-400">Google Analytics</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {analysis.tracking.hasFacebookPixel ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                        <span className="text-gray-600 dark:text-gray-400">Facebook Pixel</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {analysis.tracking.hasGoogleTagManager ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                        <span className="text-gray-600 dark:text-gray-400">GTM</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Website Link */}
          {lead.website_url && (
            <a
              href={lead.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Globe className="w-5 h-5" />
              <span>Visita il sito web</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3 max-w-lg mx-auto">
            <button
              onClick={() => setShowFullAnalysis(false)}
              className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Chiudi
            </button>
            <button
              onClick={() => {
                setShowFullAnalysis(false)
                onNext()
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              Prossimo Lead
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // NORMAL VIEW (Card compatta)
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-green-50 to-white dark:from-green-900/20 dark:to-gray-900">
      {/* Header con animazione successo */}
      <div className="flex flex-col items-center justify-center pt-6 pb-4">
        <div className={`transform transition-all duration-500 ${showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-3 shadow-lg shadow-green-500/30">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className={`text-xl font-bold text-gray-900 dark:text-white transition-all duration-500 delay-100 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          Lead Sbloccato!
        </h2>
        {/* Score badge */}
        <div className={`mt-2 px-3 py-1 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold transition-all duration-500 delay-150 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          Score: {lead.score}/100
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={`px-4 mb-4 transition-all duration-500 delay-200 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 max-w-sm mx-auto">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'analysis'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-1.5" />
            Analisi
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'contacts'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Users className="w-4 h-4 inline mr-1.5" />
            Contatti
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className={`flex-1 px-4 overflow-y-auto transition-all duration-500 delay-200 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-5 max-w-sm mx-auto">
          {/* Business info header */}
          <div className="text-center mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              {lead.category || 'Lead'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {lead.city || 'Posizione non disponibile'}
            </p>
          </div>

          {/* Tab Content */}
          {activeTab === 'analysis' ? (
            /* ANALYSIS TAB */
            <div className="space-y-4">
              {/* Score Breakdown */}
              {analysis && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Score Breakdown
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'seo', label: 'SEO', icon: '🔍' },
                      { key: 'performance', label: 'Performance', icon: '⚡' },
                      { key: 'mobile', label: 'Mobile', icon: '📱' },
                      { key: 'security', label: 'Sicurezza', icon: '🔒' },
                    ].map(({ key, label, icon }) => {
                      const score = getAnalysisScore(key)
                      return (
                        <div
                          key={key}
                          className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                        >
                          <span className="text-lg">{icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
                            <div className={`text-sm font-bold ${score !== null ? getScoreColor(score) : 'text-gray-400'}`}>
                              {score !== null ? `${score}%` : 'N/A'}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Servizi Rilevati - Preview */}
              {detectedServices && detectedServices.services.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Servizi Richiesti
                  </h4>
                  <div className="space-y-2">
                    {detectedServices.services.slice(0, 3).map((service) => {
                      const config = SERVICE_CONFIGS[service.type]
                      return (
                        <div
                          key={service.type}
                          className={`flex items-center justify-between p-2.5 rounded-lg ${config.bgColor}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{config.icon}</span>
                            <span className={`text-sm font-medium ${config.textColor}`}>
                              {config.label}
                            </span>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 ${config.textColor}`}>
                            {service.issueCount} problemi
                          </span>
                        </div>
                      )
                    })}
                    {detectedServices.services.length > 3 && (
                      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                        +{detectedServices.services.length - 3} altri servizi
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Budget Stimato */}
              {detectedServices && detectedServices.totalBudget && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Budget Stimato
                  </h4>
                  <div className="flex items-center justify-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      €{detectedServices.totalBudget.min.toLocaleString()} - €{detectedServices.totalBudget.max.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Pulsante Vedi Analisi Completa */}
              <button
                onClick={() => setShowFullAnalysis(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
              >
                <Eye className="w-5 h-5" />
                Vedi Analisi Completa
              </button>

              {/* No analysis fallback */}
              {!analysis && (
                <div className="text-center py-6">
                  <div className="text-gray-400 dark:text-gray-500">
                    Analisi non disponibile per questo lead
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* CONTACTS TAB */
            <div className="space-y-4">
              {/* Telefono */}
              {phone && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      Telefono
                    </div>
                    <div className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {phone}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleCopy(phone, 'phone')}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                      title="Copia"
                    >
                      {copiedField === 'phone' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <a
                      href={`tel:${formatPhoneForCall(phone)}`}
                      className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      title="Chiama"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

              {/* Email */}
              {email && (
                <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                      Email
                    </div>
                    <div className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {email}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleCopy(email, 'email')}
                      className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg transition-colors"
                      title="Copia"
                    >
                      {copiedField === 'email' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <a
                      href={`mailto:${email}`}
                      className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                      title="Invia email"
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

              {/* Website */}
              {lead.website_url && (
                <a
                  href={lead.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      Sito Web
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {lead.website_url.replace(/^https?:\/\//, '')}
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
              )}

              {/* No contacts available */}
              {!phone && !email && (
                <div className="text-center py-6">
                  <div className="text-gray-400 dark:text-gray-500 mb-2">
                    Nessun contatto disponibile
                  </div>
                  {lead.website_url && (
                    <a
                      href={lead.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 flex items-center justify-center gap-1 text-sm"
                    >
                      Visita il sito web <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer con pulsante next */}
      <div className={`p-4 transition-all duration-500 delay-300 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <button
          onClick={onNext}
          className="w-full max-w-sm mx-auto flex items-center justify-center gap-2 py-3.5 px-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
        >
          Prossimo Lead
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
