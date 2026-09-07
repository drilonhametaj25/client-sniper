/**
 * Accessibility Quick Audit - Tool gratuito
 * Analizza l'accessibilità di base di un sito (WCAG A/AA)
 * Limite: 3 analisi/giorno per IP
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface AccessibilityCheck {
  name: string
  status: 'pass' | 'warning' | 'fail'
  value?: string
  details?: string[]
  recommendation?: string
  wcagLevel: 'A' | 'AA' | 'AAA'
  wcagCriteria?: string
}

interface AccessibilityResult {
  url: string
  finalUrl: string
  isAccessible: boolean
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  checks: AccessibilityCheck[]
  summary: {
    passed: number
    warnings: number
    failed: number
    levelA: { passed: number; failed: number }
    levelAA: { passed: number; failed: number }
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

export default function AccessibilityCheckPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AccessibilityResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<UsageInfo | null>(null)

  useEffect(() => {
    fetch('/api/tools/accessibility-check')
      .then(res => res.json())
      .then(data => setUsage(data))
      .catch(() => {})
  }, [])

  const handleAnalyze = async () => {
    if (!url.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/tools/accessibility-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Errore durante l\'analisi')
        return
      }

      setResult(data.result)
      if (usage) {
        setUsage({
          ...usage,
          remaining: data.remaining,
          used: usage.limit - data.remaining,
          canAnalyze: data.remaining > 0
        })
      }
    } catch (err) {
      setError('Errore di connessione. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-500'
      case 'B': return 'text-lime-500'
      case 'C': return 'text-yellow-500'
      case 'D': return 'text-orange-500'
      case 'F': return 'text-red-500'
      default: return 'text-gray-500 dark:text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✅'
      case 'warning': return '⚠️'
      case 'fail': return '❌'
      default: return '❓'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      case 'fail': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      default: return 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
    }
  }

  const getWcagBadge = (level: string) => {
    switch (level) {
      case 'A': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
      case 'AA': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
      case 'AAA': return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800'
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 dark:from-gray-900 to-white dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">TrovaMi</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600 dark:text-gray-400">Accessibility Audit</span>
          </Link>
          <Link
            href="/register"
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm"
          >
            Registrati Gratis
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Accessibility Quick Audit
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
            Verifica l'accessibilità del tuo sito secondo le linee guida WCAG
          </p>
          <p className="text-gray-500 dark:text-gray-400">
            Analisi gratuita - {usage ? `${usage.remaining}/${usage.limit}` : '3'} analisi rimanenti oggi
          </p>
        </div>

        {/* Input */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="flex gap-4">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://esempio.it"
              className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading || (usage !== null && !usage.canAnalyze)}
              className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Analisi...' : 'Analizza'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Score Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Risultato Analisi</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    {result.finalUrl}
                  </p>
                </div>
                <div className="text-center">
                  <div className={`text-6xl font-bold ${getGradeColor(result.grade)}`}>
                    {result.grade}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 text-sm">Voto</div>
                </div>
              </div>

              {/* Score Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Punteggio Accessibilita</span>
                  <span className="font-semibold">{result.score}/100</span>
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      result.score >= 90 ? 'bg-green-500' :
                      result.score >= 75 ? 'bg-lime-500' :
                      result.score >= 60 ? 'bg-yellow-500' :
                      result.score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${result.score}%` }}
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{result.summary.passed}</div>
                  <div className="text-sm text-green-700 dark:text-green-400">Superati</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{result.summary.warnings}</div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-400">Warning</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{result.summary.failed}</div>
                  <div className="text-sm text-red-700 dark:text-red-400">Falliti</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{result.summary.levelA.passed}/{result.summary.levelA.passed + result.summary.levelA.failed}</div>
                  <div className="text-sm text-blue-700 dark:text-blue-400">Livello A</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{result.summary.levelAA.passed}/{result.summary.levelAA.passed + result.summary.levelAA.failed}</div>
                  <div className="text-sm text-purple-700 dark:text-purple-400">Livello AA</div>
                </div>
              </div>
            </div>

            {/* Checks Detail */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Dettaglio Controlli WCAG</h3>

              <div className="space-y-3">
                {result.checks.map((check, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${getStatusBg(check.status)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{getStatusIcon(check.status)}</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{check.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${getWcagBadge(check.wcagLevel)}`}>
                            WCAG {check.wcagLevel}
                            {check.wcagCriteria && ` - ${check.wcagCriteria}`}
                          </span>
                        </div>
                        {check.value && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 ml-7">
                            {check.value}
                          </div>
                        )}
                        {check.details && check.details.length > 0 && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 ml-7 mt-1">
                            {check.details.map((detail, i) => (
                              <span key={i} className="block">{detail}</span>
                            ))}
                          </div>
                        )}
                        {check.recommendation && (
                          <div className="text-sm text-gray-700 dark:text-gray-300 ml-7 mt-2 p-2 bg-white/50 rounded">
                            <span className="font-medium">Raccomandazione:</span> {check.recommendation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-8 text-center text-white">
              <h3 className="text-2xl font-bold mb-3">
                Vuoi un audit completo di accessibilita?
              </h3>
              <p className="text-purple-100 mb-6 max-w-2xl mx-auto">
                TrovaMi ti connette con aziende che hanno bisogno di migliorare il loro sito.
                Registrati gratis e prova il servizio!
              </p>
              <div className="flex gap-4 justify-center">
                <Link
                  href="/register"
                  className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition"
                >
                  Inizia Gratis
                </Link>
                <Link
                  href="/tools/security-check"
                  className="border border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition"
                >
                  Prova Security Check
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Features when no result */}
        {!result && !loading && (
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border">
              <div className="text-3xl mb-3">♿</div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Controlli WCAG</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Verifichiamo conformita ai criteri WCAG 2.1 livello A e AA per garantire l'accessibilita.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border">
              <div className="text-3xl mb-3">🏷️</div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Semantica HTML</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Analizziamo heading, landmark ARIA, alt text e struttura semantica della pagina.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border">
              <div className="text-3xl mb-3">⌨️</div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Navigazione Tastiera</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Controlliamo skip link, focus visibile e elementi interattivi accessibili.
              </p>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-12 bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6 border border-purple-100">
          <h3 className="font-bold text-purple-900 mb-2">Perché l'accessibilità è importante?</h3>
          <p className="text-purple-800 dark:text-purple-300 text-sm mb-4">
            Oltre 1 miliardo di persone nel mondo hanno disabilita. Un sito accessibile:
          </p>
          <ul className="text-purple-700 dark:text-purple-400 text-sm space-y-1">
            <li>• Raggiunge un pubblico piu ampio</li>
            <li>• Migliora la SEO (Google premia i siti accessibili)</li>
            <li>• E spesso obbligatorio per legge (Legge Stanca, EAA 2025)</li>
            <li>• Migliora l'usabilita per tutti gli utenti</li>
          </ul>
        </div>

        {/* Other Tools */}
        <div className="mt-12">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">Altri Tool Gratuiti</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              href="/tools/seo-checker"
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border hover:border-purple-300 hover:shadow-md transition text-center"
            >
              <div className="text-2xl mb-2">🔍</div>
              <div className="font-semibold text-gray-900 dark:text-white">SEO Checker</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Analisi SEO on-page</div>
            </Link>
            <Link
              href="/tools/tech-detector"
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border hover:border-purple-300 hover:shadow-md transition text-center"
            >
              <div className="text-2xl mb-2">🔧</div>
              <div className="font-semibold text-gray-900 dark:text-white">Tech Detector</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Rileva tecnologie usate</div>
            </Link>
            <Link
              href="/tools/security-check"
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border hover:border-purple-300 hover:shadow-md transition text-center"
            >
              <div className="text-2xl mb-2">🔒</div>
              <div className="font-semibold text-gray-900 dark:text-white">Security Check</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Verifica sicurezza</div>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="mb-2">
            <Link href="/" className="text-white hover:text-purple-400">TrovaMi</Link>
            {' - '}Tool gratuiti per analisi siti web
          </p>
          <p className="text-sm">
            P.IVA 07327360488 |{' '}
            <Link href="/privacy" className="hover:text-white">Privacy</Link> |{' '}
            <Link href="/terms" className="hover:text-white">Termini</Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
