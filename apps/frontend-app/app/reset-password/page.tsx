/**
 * Pagina di reset password
 * Usato per: Permettere agli utenti di impostare una nuova password dopo aver cliccato il link nell'email
 * Chiamato da: Link nell'email di reset password (contiene code nei query params)
 */

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Target,
  KeyRound,
  CheckCircle,
  AlertCircle,
  Loader
} from 'lucide-react'
import ThemeToggle from '@/components/theme/ThemeToggle'

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  // Verifica il codice all'avvio
  useEffect(() => {
    const verifyCode = async () => {
      // Supabase invia il codice come hash fragment o come query param
      // Il flusso standard di Supabase gestisce automaticamente il code
      const code = searchParams.get('code')
      const errorParam = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      if (errorParam) {
        setError(errorDescription || 'Link di reset non valido o scaduto')
        setVerifying(false)
        return
      }

      if (code) {
        try {
          // Scambia il codice per una sessione
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            console.error('Errore exchange code:', exchangeError)
            setError('Link di reset non valido o scaduto. Richiedi un nuovo link.')
            setVerifying(false)
            return
          }

          if (data.session) {
            setSessionReady(true)
          }
        } catch (err) {
          console.error('Errore verifica codice:', err)
          setError('Errore durante la verifica del link. Riprova.')
        }
      } else {
        // Controlla se c'è già una sessione attiva (utente ha già cliccato il link)
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setSessionReady(true)
        } else {
          setError('Link di reset mancante o non valido.')
        }
      }

      setVerifying(false)
    }

    verifyCode()
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validazioni
    if (password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri')
      return
    }

    if (password !== confirmPassword) {
      setError('Le password non corrispondono')
      return
    }

    setLoading(true)

    try {
      // Aggiorna la password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        throw updateError
      }

      // Logout per forzare il re-login con la nuova password
      await supabase.auth.signOut()

      setSuccess(true)

      // Redirect al login dopo 3 secondi
      setTimeout(() => {
        router.push('/login?message=Password aggiornata con successo! Effettua il login con la nuova password.')
      }, 3000)

    } catch (err: any) {
      console.error('Errore aggiornamento password:', err)
      setError(err.message || 'Errore durante l\'aggiornamento della password')
    } finally {
      setLoading(false)
    }
  }

  // Loading state durante la verifica
  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Verifica del link in corso...</p>
        </div>
      </div>
    )
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
                {success ? 'Password aggiornata!' : 'Nuova password'}
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {success
                  ? 'La tua password è stata aggiornata con successo.'
                  : 'Inserisci la tua nuova password per completare il reset.'
                }
              </p>
            </div>

            {success ? (
              // Messaggio di successo
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  Verrai reindirizzato alla pagina di login tra pochi secondi...
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Vai al Login
                </Link>
              </div>
            ) : error && !sessionReady ? (
              // Errore - link non valido
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Link non valido
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {error}
                  </p>
                </div>
                <Link
                  href="/forgot-password"
                  className="inline-flex items-center justify-center w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Richiedi nuovo link
                </Link>
              </div>
            ) : (
              // Form nuova password
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
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Nuova Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                      placeholder="Minimo 6 caratteri"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Conferma Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                      placeholder="Ripeti la password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Password requirements */}
                <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                  <p className={password.length >= 6 ? 'text-green-600 dark:text-green-400' : ''}>
                    {password.length >= 6 ? '✓' : '○'} Almeno 6 caratteri
                  </p>
                  <p className={password && password === confirmPassword ? 'text-green-600 dark:text-green-400' : ''}>
                    {password && password === confirmPassword ? '✓' : '○'} Le password corrispondono
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || password.length < 6 || password !== confirmPassword}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <KeyRound className="h-5 w-5 mr-2" />
                      Aggiorna password
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Caricamento...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
