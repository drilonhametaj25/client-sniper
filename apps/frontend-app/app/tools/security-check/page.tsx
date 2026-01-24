/**
 * Security Quick Check - Tool gratuito per analisi sicurezza
 * Verifica gli header di sicurezza e la configurazione HTTPS
 * Parte della strategia di lead generation tramite tool gratuiti
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Globe,
  Lock,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Eye,
  EyeOff,
  Server,
  Cookie,
  Target,
  Code,
  TrendingUp,
  Activity
} from 'lucide-react'
import NewsletterForm from '@/components/NewsletterForm'

interface SecurityCheck {
  name: string
  status: 'pass' | 'warning' | 'fail'
  value?: string
  recommendation?: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

interface SecurityResult {
  url: string
  finalUrl: string
  isAccessible: boolean
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  checks: SecurityCheck[]
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
  'HTTPS': Lock,
  'HSTS': ShieldCheck,
  'Content Security Policy': Shield,
  'X-Frame-Options': Eye,
  'X-Content-Type-Options': Server,
  'X-XSS-Protection': ShieldAlert,
  'Referrer-Policy': EyeOff,
  'Permissions-Policy': Shield,
  'Server Header': Server,
  'X-Powered-By': Server,
  'Mixed Content': AlertTriangle,
  'Cookie Security': Cookie,
}

export default function SecurityCheckPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SecurityResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<UsageInfo | null>(null)

  useEffect(() => {
    loadUsageInfo()
  }, [])

  const loadUsageInfo = async () => {
    try {
      const response = await fetch('/api/tools/security-check')
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
      const response = await fetch('/api/tools/security-check', {
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

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
      case 'B': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30'
      case 'C': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30'
      case 'D': return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30'
      case 'F': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30'
    }
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

  const getSeverityBadge = (severity: 'critical' | 'high' | 'medium' | 'low') => {
    const colors = {
      critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    }
    const labels = {
      critical: 'Critico',
      high: 'Alto',
      medium: 'Medio',
      low: 'Basso',
    }
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${colors[severity]}`}>
        {labels[severity]}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
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
                href="/tools/seo-checker"
                className="text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 text-sm font-medium"
              >
                SEO Checker
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
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
          <div className="inline-flex items-center px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-medium mb-6">
            <Shield className="w-4 h-4 mr-2" />
            Tool Gratuito - {usage?.remaining ?? 3} analisi rimaste oggi
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Security{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600">
              Quick Check
            </span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Analizza la sicurezza del tuo sito: HTTPS, header di sicurezza, CSP e altro.
            Ottieni un voto da A a F con raccomandazioni.
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
                  className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-lg"
                  disabled={loading || (usage !== null && !usage.canAnalyze)}
                />
              </div>
              <button
                type="submit"
                disabled={loading || (usage !== null && !usage.canAnalyze)}
                className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-700 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analizzando...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
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
          {usage !== null && !usage.canAnalyze && (
            <div className="mt-6 p-6 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl">
              <p className="text-yellow-800 dark:text-yellow-200 mb-4">
                Hai esaurito le {usage.limit} analisi gratuite di oggi.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
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
            {/* Grade Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Rapporto Sicurezza
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400">
                    {new URL(result.finalUrl).hostname}
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <div className={`w-24 h-24 rounded-2xl flex items-center justify-center ${getGradeColor(result.grade)}`}>
                    <span className="text-5xl font-bold">{result.grade}</span>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {result.score}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">/100</div>
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
                  const IconComponent = checkIcons[check.name] || Shield

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
                            {getSeverityBadge(check.severity)}
                          </div>
                          {check.value && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1 font-mono">{check.value}</p>
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
            <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-8 text-center text-white">
              <h3 className="text-2xl font-bold mb-4">
                Vuoi aiutare i tuoi clienti con la sicurezza?
              </h3>
              <p className="text-red-100 mb-6 max-w-2xl mx-auto">
                TrovaMi ti trova automaticamente aziende con problemi di sicurezza sui loro siti.
                Lead perfetti per i tuoi servizi di consulenza.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center px-8 py-4 bg-white text-red-600 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
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
              Cosa analizza il Security Check
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: Lock, label: 'HTTPS', desc: 'Certificato SSL/TLS' },
                { icon: ShieldCheck, label: 'HSTS', desc: 'HTTP Strict Transport' },
                { icon: Shield, label: 'CSP', desc: 'Content Security Policy' },
                { icon: Eye, label: 'X-Frame', desc: 'Protezione clickjacking' },
                { icon: Server, label: 'Server Info', desc: 'Information disclosure' },
                { icon: ShieldAlert, label: 'XSS Protection', desc: 'Cross-Site Scripting' },
                { icon: EyeOff, label: 'Referrer', desc: 'Privacy policy' },
                { icon: Cookie, label: 'Cookie', desc: 'Secure & HttpOnly' },
              ].map((item, idx) => (
                <div key={idx} className="text-center p-6 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                  <item.icon className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto mb-3" />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/tools/seo-checker"
              className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-500 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-green-600">
                    SEO Checker
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Analisi SEO on-page
                  </p>
                </div>
              </div>
            </Link>
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
                    Tech Detector
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Scopri le tecnologie
                  </p>
                </div>
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
                    Analisi Completa
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Audit tecnico full
                  </p>
                </div>
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
