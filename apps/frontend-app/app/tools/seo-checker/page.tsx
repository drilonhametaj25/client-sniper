/**
 * SEO Quick Checker - Tool gratuito per analisi SEO
 * Verifica gli elementi SEO fondamentali di un sito web
 * Parte della strategia di lead generation tramite tool gratuiti
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Globe,
  FileText,
  Hash,
  Image,
  Link2,
  Share2,
  Smartphone,
  Lock,
  Languages,
  Target,
  TrendingUp,
  Activity,
  Code
} from 'lucide-react'
import NewsletterForm from '@/components/NewsletterForm'

interface SEOCheck {
  name: string
  status: 'pass' | 'warning' | 'fail'
  value?: string
  recommendation?: string
  importance: 'critical' | 'important' | 'optional'
}

interface SEOResult {
  url: string
  finalUrl: string
  isAccessible: boolean
  score: number
  checks: SEOCheck[]
  summary: {
    passed: number
    warnings: number
    failed: number
    critical: number
  }
  analysisDate: string
  remaining: number
}

interface UsageInfo {
  used: number
  limit: number
  remaining: number
  canAnalyze: boolean
}

const checkIcons: Record<string, any> = {
  'Title Tag': FileText,
  'Meta Description': FileText,
  'H1 Tag': Hash,
  'Viewport Meta': Smartphone,
  'Lang Attribute': Languages,
  'Canonical URL': Link2,
  'Open Graph Tags': Share2,
  'Alt Text Immagini': Image,
  'Link Interni': Link2,
  'Struttura Heading': Hash,
  'HTTPS': Lock,
}

export default function SEOCheckerPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SEOResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<UsageInfo | null>(null)

  useEffect(() => {
    loadUsageInfo()
  }, [])

  const loadUsageInfo = async () => {
    try {
      const response = await fetch('/api/tools/seo-checker')
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
      const response = await fetch('/api/tools/seo-checker', {
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-600'
    if (score >= 60) return 'from-yellow-500 to-orange-500'
    return 'from-red-500 to-rose-600'
  }

  const getStatusIcon = (status: 'pass' | 'warning' | 'fail') => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />
    }
  }

  const getImportanceBadge = (importance: 'critical' | 'important' | 'optional') => {
    const colors = {
      critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      important: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      optional: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    }
    const labels = {
      critical: 'Critico',
      important: 'Importante',
      optional: 'Opzionale',
    }
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${colors[importance]}`}>
        {labels[importance]}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
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
                href="/tools/tech-detector"
                className="text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 text-sm font-medium"
              >
                Tech Detector
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
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
          <div className="inline-flex items-center px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium mb-6">
            <TrendingUp className="w-4 h-4 mr-2" />
            Tool Gratuito - {usage?.remaining ?? 3} analisi rimaste oggi
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            SEO{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">
              Quick Checker
            </span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Analizza gli elementi SEO fondamentali del tuo sito: title, meta description,
            heading, Open Graph e molto altro. Gratis e istantaneo.
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
                  className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                  disabled={loading || (usage !== null && !usage.canAnalyze)}
                />
              </div>
              <button
                type="submit"
                disabled={loading || (usage !== null && !usage.canAnalyze)}
                className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analizzando...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Analizza SEO
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
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
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
            {/* Score Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Punteggio SEO
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400">
                    {new URL(result.finalUrl).hostname}
                  </p>
                </div>

                <div className={`relative w-32 h-32 rounded-full bg-gradient-to-br ${getScoreBg(result.score)} p-1`}>
                  <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${getScoreColor(result.score)}`}>
                        {result.score}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">/100</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{result.summary.passed}</div>
                  <div className="text-sm text-green-700 dark:text-green-300">Passati</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{result.summary.warnings}</div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">Warning</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{result.summary.failed}</div>
                  <div className="text-sm text-red-700 dark:text-red-300">Falliti</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">{result.checks.length}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Totale Check</div>
                </div>
              </div>

              {/* Checks List */}
              <div className="space-y-4">
                {result.checks.map((check, idx) => {
                  const IconComponent = checkIcons[check.name] || FileText

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border ${
                        check.status === 'pass' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' :
                        check.status === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800' :
                        'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {getStatusIcon(check.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white">{check.name}</h4>
                            {getImportanceBadge(check.importance)}
                          </div>
                          {check.value && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{check.value}</p>
                          )}
                          {check.recommendation && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{check.recommendation}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8 text-center text-white">
              <h3 className="text-2xl font-bold mb-4">
                Vuoi migliorare il SEO dei tuoi clienti?
              </h3>
              <p className="text-green-100 mb-6 max-w-2xl mx-auto">
                TrovaMi ti trova automaticamente aziende con problemi SEO sui loro siti.
                Lead perfetti per i tuoi servizi di ottimizzazione.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center px-8 py-4 bg-white text-green-600 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
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
              Cosa analizza il SEO Checker
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: FileText, label: 'Title Tag', desc: 'Presenza e lunghezza ottimale' },
                { icon: FileText, label: 'Meta Description', desc: 'Testo accattivante per SERP' },
                { icon: Hash, label: 'Heading H1-H3', desc: 'Struttura gerarchica corretta' },
                { icon: Smartphone, label: 'Mobile Ready', desc: 'Viewport e responsività' },
                { icon: Share2, label: 'Open Graph', desc: 'Condivisione sui social' },
                { icon: Image, label: 'Alt Text', desc: 'Accessibilità immagini' },
                { icon: Link2, label: 'Canonical', desc: 'Gestione contenuti duplicati' },
                { icon: Lock, label: 'HTTPS', desc: 'Sicurezza e trust' },
              ].map((item, idx) => (
                <div key={idx} className="text-center p-6 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                  <item.icon className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-3" />
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
              href="/tools/tech-detector"
              className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Code className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-600">
                    Tech Stack Detector
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Scopri le tecnologie di un sito web
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 ml-auto group-hover:text-purple-600" />
              </div>
            </Link>
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
                    Analisi Completa Sito
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    SEO, performance e problemi tecnici
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 ml-auto group-hover:text-blue-600" />
              </div>
            </Link>
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
            Iscriviti per sapere quando lanceremo nuovi strumenti gratuiti.
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
