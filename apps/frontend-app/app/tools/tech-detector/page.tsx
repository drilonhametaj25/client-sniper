/**
 * Tech Stack Detector - Tool gratuito per identificare le tecnologie di un sito web
 * Analizza CMS, framework, librerie, analytics e altro
 * Parte della strategia di lead generation tramite tool gratuiti
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  Server,
  Code,
  BarChart3,
  Shield,
  Globe,
  Zap,
  CheckCircle,
  XCircle,
  ArrowRight,
  Layers,
  Database,
  Palette,
  Activity,
  Cloud,
  Type,
  Lock,
  Gift,
  Target
} from 'lucide-react'
import NewsletterForm from '@/components/NewsletterForm'

interface TechStack {
  cms: string[]
  frameworks: string[]
  jsLibraries: string[]
  cssFrameworks: string[]
  analytics: string[]
  cdn: string[]
  server: string[]
  ecommerce: string[]
  fonts: string[]
  security: string[]
  other: string[]
}

interface DetectorResult {
  url: string
  finalUrl: string
  isAccessible: boolean
  httpStatus: number
  techStack: TechStack
  totalTechnologies: number
  analysisDate: string
  remaining: number
}

interface UsageInfo {
  used: number
  limit: number
  remaining: number
  canAnalyze: boolean
}

const categoryConfig: Record<keyof TechStack, { icon: any; label: string; color: string }> = {
  cms: { icon: Database, label: 'CMS', color: 'blue' },
  frameworks: { icon: Code, label: 'Framework', color: 'purple' },
  jsLibraries: { icon: Layers, label: 'Librerie JS', color: 'yellow' },
  cssFrameworks: { icon: Palette, label: 'CSS Framework', color: 'pink' },
  analytics: { icon: BarChart3, label: 'Analytics', color: 'green' },
  cdn: { icon: Cloud, label: 'CDN', color: 'cyan' },
  server: { icon: Server, label: 'Server', color: 'gray' },
  ecommerce: { icon: Gift, label: 'E-commerce', color: 'orange' },
  fonts: { icon: Type, label: 'Font', color: 'indigo' },
  security: { icon: Shield, label: 'Sicurezza', color: 'red' },
  other: { icon: Zap, label: 'Altro', color: 'slate' },
}

export default function TechDetectorPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DetectorResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<UsageInfo | null>(null)

  useEffect(() => {
    loadUsageInfo()
  }, [])

  const loadUsageInfo = async () => {
    try {
      const response = await fetch('/api/tools/tech-detector')
      const data = await response.json()
      setUsage(data)
    } catch (error) {
      console.error('Errore caricamento info utilizzo:', error)
    }
  }

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!url.trim()) {
      setError('Inserisci un URL valido')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/tools/tech-detector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Errore durante l\'analisi')
        if (data.remaining !== undefined) {
          setUsage(prev => prev ? { ...prev, remaining: data.remaining, canAnalyze: data.remaining > 0 } : null)
        }
        return
      }

      setResult(data.result)
      setUsage(prev => prev ? { ...prev, remaining: data.remaining, canAnalyze: data.remaining > 0 } : null)

    } catch (err) {
      setError('Errore di connessione. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  const renderTechCategory = (category: keyof TechStack, techs: string[]) => {
    if (techs.length === 0) return null

    const config = categoryConfig[category]
    const IconComponent = config.icon

    return (
      <div key={category} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg bg-${config.color}-100 dark:bg-${config.color}-900/30`}>
            <IconComponent className={`w-5 h-5 text-${config.color}-600 dark:text-${config.color}-400`} />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{config.label}</h3>
          <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">{techs.length}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {techs.map((tech, idx) => (
            <span
              key={idx}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm font-medium"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Target className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">TrovaMi</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/tools/public-scan"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium"
              >
                Analisi Sito
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Inizia Gratis
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium mb-6">
            <Code className="w-4 h-4 mr-2" />
            Tool Gratuito - {usage?.remaining ?? 3} analisi rimaste oggi
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Tech Stack{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
              Detector
            </span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Scopri quali tecnologie usa un sito web: CMS, framework, librerie, analytics e molto altro.
            Analisi istantanea e gratuita.
          </p>

          {/* Search Form */}
          <form onSubmit={handleAnalyze} className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="esempio.com"
                  className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                  disabled={loading || (usage !== null && !usage.canAnalyze)}
                />
              </div>
              <button
                type="submit"
                disabled={loading || (usage !== null && !usage.canAnalyze)}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analizzando...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Analizza
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 flex items-center gap-2">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Usage Limit Warning */}
          {usage && !usage.canAnalyze && (
            <div className="mt-6 p-6 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl">
              <p className="text-yellow-800 dark:text-yellow-200 mb-4">
                Hai esaurito le {usage.limit} analisi gratuite di oggi.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Registrati per analisi illimitate
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Results Section */}
      {result && (
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            {/* Summary Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Risultati per {new URL(result.finalUrl).hostname}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Analizzato il {new Date(result.analysisDate).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`px-4 py-2 rounded-lg ${result.isAccessible ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                    {result.isAccessible ? (
                      <span className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Sito accessibile
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        Problemi di accesso
                      </span>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {result.totalTechnologies}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">tecnologie</div>
                  </div>
                </div>
              </div>

              {result.totalTechnologies === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessuna tecnologia comune rilevata.</p>
                  <p className="text-sm mt-2">Il sito potrebbe usare tecnologie personalizzate o poco diffuse.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.keys(result.techStack) as Array<keyof TechStack>).map(category =>
                    renderTechCategory(category, result.techStack[category])
                  )}
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-center text-white">
              <h3 className="text-2xl font-bold mb-4">
                Vuoi analizzare i siti dei tuoi potenziali clienti?
              </h3>
              <p className="text-purple-100 mb-6 max-w-2xl mx-auto">
                TrovaMi ti trova automaticamente aziende con problemi tecnici sui loro siti.
                Lead qualificati pronti per i tuoi servizi.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center px-8 py-4 bg-white text-purple-600 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
              >
                Inizia con 5 Lead Gratuiti
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      {!result && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              Cosa rileva il Tech Stack Detector
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: Database, label: 'CMS', desc: 'WordPress, Shopify, Wix...' },
                { icon: Code, label: 'Framework', desc: 'React, Vue, Angular...' },
                { icon: Layers, label: 'Librerie', desc: 'jQuery, GSAP, D3.js...' },
                { icon: Palette, label: 'CSS', desc: 'Bootstrap, Tailwind...' },
                { icon: BarChart3, label: 'Analytics', desc: 'GA, GTM, Meta Pixel...' },
                { icon: Cloud, label: 'CDN', desc: 'Cloudflare, Vercel...' },
                { icon: Server, label: 'Server', desc: 'Apache, Nginx, PHP...' },
                { icon: Shield, label: 'Sicurezza', desc: 'reCAPTCHA, SSL...' },
              ].map((item, idx) => (
                <div key={idx} className="text-center p-6 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                  <item.icon className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{item.label}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Other Tools Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
            Altri Tool Gratuiti
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/tools/public-scan"
              className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600">
                    Analisi Sito Web
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Verifica SEO, performance e problemi tecnici
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 ml-auto group-hover:text-blue-600" />
              </div>
            </Link>
            <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-200 dark:bg-gray-600 rounded-lg">
                  <Lock className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-500 dark:text-gray-400">
                    SEO Checker
                  </h3>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Prossimamente...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Resta aggiornato sui nuovi tool
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Iscriviti alla newsletter per sapere quando lanceremo nuovi strumenti gratuiti.
          </p>
          <NewsletterForm variant="compact" />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Target className="w-6 h-6 text-blue-400" />
              <span className="font-bold">TrovaMi</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-400">
              <Link href="/privacy" className="hover:text-white">Privacy</Link>
              <Link href="/terms" className="hover:text-white">Termini</Link>
              <Link href="/contact" className="hover:text-white">Contatti</Link>
            </div>
            <div className="text-sm text-gray-400">
              P.IVA 07327360488
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
