/**
 * UnlockedCard - Vista post-sblocco con contatti e analisi
 *
 * Mostra:
 * - Animazione di successo
 * - Tab navigation: Analisi | Contatti
 * - Tab Analisi: score breakdown, servizi, budget stimato
 * - Tab Contatti: telefono, email, website
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
  TrendingUp
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

  // Get score dal analysis
  const getAnalysisScore = (key: string): number | null => {
    if (!analysis) return null

    // Map di score comuni
    const scores: Record<string, number | undefined> = {
      seo: analysis.seo?.score ?? analysis.seoScore,
      performance: analysis.performance?.score ?? analysis.performanceScore,
      mobile: analysis.mobile?.score ?? analysis.mobileScore,
      security: analysis.security?.score ?? analysis.securityScore,
      tracking: analysis.tracking?.score ?? (analysis.tracking?.hasGoogleAnalytics ? 70 : 30),
    }

    return scores[key] ?? null
  }

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

              {/* Servizi Rilevati */}
              {detectedServices && detectedServices.services.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Servizi Richiesti
                  </h4>
                  <div className="space-y-2">
                    {detectedServices.services.slice(0, 5).map((service) => {
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
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      €{detectedServices.totalBudget.min.toLocaleString()} - €{detectedServices.totalBudget.max.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

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
