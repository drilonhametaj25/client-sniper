/**
 * Pagina di recupero password
 * Usato per: Permettere agli utenti di richiedere un link di reset password
 * Chiamato da: Link "Password dimenticata?" nella pagina di login
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Mail,
  ArrowLeft,
  Target,
  KeyRound,
  CheckCircle,
  AlertCircle,
  Search
} from 'lucide-react'
import ThemeToggle from '@/components/theme/ThemeToggle'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante la richiesta')
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Errore durante la richiesta. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-3" aria-label="Torna alla homepage di TrovaMi">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">TrovaMi</span>
            </Link>

            <nav className="flex items-center space-x-4" aria-label="Navigazione principale">
              <Link
                href="/tools/public-scan"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <Search className="w-4 h-4 inline mr-1" />
                Analisi Gratuita
              </Link>
              <ThemeToggle variant="compact" showLabel={false} />
              <Link
                href="/login"
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
              >
                Accedi
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">

          {/* Back button */}
          <div className="mb-6">
            <Link
              href="/login"
              className="inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Torna al login
            </Link>
          </div>

          {/* Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">

            {/* Header del form */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <KeyRound className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Password dimenticata?
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Nessun problema! Inserisci la tua email e ti invieremo un link per reimpostare la password.
              </p>
            </div>

            {success ? (
              // Messaggio di successo
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Email inviata!
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Se l'indirizzo <strong>{email}</strong> esiste nel nostro sistema, riceverai un'email con le istruzioni per reimpostare la password.
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Non hai ricevuto l'email? Controlla la cartella spam o{' '}
                    <button
                      onClick={() => {
                        setSuccess(false)
                        setEmail('')
                      }}
                      className="text-blue-600 hover:text-blue-500 font-medium"
                    >
                      riprova con un altro indirizzo
                    </button>
                  </p>
                </div>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Torna al Login
                </Link>
              </div>
            ) : (
              // Form
              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Errore</p>
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Indirizzo Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                    placeholder="la-tua-email@esempio.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Mail className="h-5 w-5 mr-2" />
                      Invia link di reset
                    </>
                  )}
                </button>

                <div className="text-center pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-gray-600 dark:text-gray-400">
                    Ricordi la password?{' '}
                    <Link
                      href="/login"
                      className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                    >
                      Torna al login
                    </Link>
                  </p>
                </div>
              </form>
            )}
          </div>

          {/* Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Il link di reset scade dopo 1 ora per motivi di sicurezza.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
