/**
 * Pagina di login migliorata con design moderno
 * Include header, footer e UX ottimizzata coerente con la registrazione
 * SEO-friendly con struttura semantica e accessibilità migliorata
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Eye, 
  EyeOff, 
  LogIn, 
  Target, 
  ArrowLeft,
  Search,
  Mail,
  Lock,
  ExternalLink
} from 'lucide-react'
import NewsletterForm from '@/components/NewsletterForm'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await signIn(email, password)
      
      if (error) {
        setError(error.message || 'Errore durante il login')
        return
      }

      if (data.user) {
        // Attendi che l'AuthContext carichi il profilo
        // Il redirect sarà gestito automaticamente dal dashboard
        router.push('/dashboard')
      }

    } catch (err) {
      setError('Errore durante il login')
    } finally {
      setLoading(false)
    }
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
                  <Target className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">TrovaMi</span>
              </Link>
              
              <nav className="flex items-center space-x-4" aria-label="Navigazione principale">
                <Link 
                  href="/tools/public-scan"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Search className="w-4 h-4 inline mr-1" />
                  Analisi Gratuita
                </Link>
                <Link 
                  href="/register"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                >
                  Registrati
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
                href="/" 
                className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Torna alla homepage
              </Link>
            </div>

            {/* Login Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
              
              {/* Header del form */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <LogIn className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Bentornato!
                </h1>
                <p className="text-gray-600">
                  Accedi al tuo account per trovare lead qualificati
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start space-x-3">
                    <div className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-800 text-xs font-bold">!</span>
                    </div>
                    <div>
                      <p className="font-medium">Errore di login</p>
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 hover:bg-white"
                      placeholder="la-tua-email@esempio.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                      <Lock className="w-4 h-4 inline mr-2" />
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 hover:bg-white"
                        placeholder="La tua password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <Link
                      href="/forgot-password"
                      className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                    >
                      Password dimenticata?
                    </Link>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5 mr-2" />
                      Accedi al Dashboard
                    </>
                  )}
                </button>

                <div className="text-center pt-4 border-t border-gray-100">
                  <p className="text-gray-600 mb-3">Non hai ancora un account?</p>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center w-full bg-gray-50 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-100 transition-colors border border-gray-200"
                  >
                    Crea un account gratuito
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Link>
                </div>
              </form>
            </div>

            {/* Features highlight */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600 mb-4">Una volta loggato potrai:</p>
              <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500">
                <span className="bg-white px-3 py-1 rounded-full border">🎯 Trova lead qualificati</span>
                <span className="bg-white px-3 py-1 rounded-full border">📊 Analisi siti web complete</span>
                <span className="bg-white px-3 py-1 rounded-full border">⚡ Risultati in tempo reale</span>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Newsletter compatta nel footer */}
          <div className="mb-12 p-6 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-xl border border-white/10">
            <NewsletterForm
              title="Prima di Accedere..."
              description="Iscriviti e ricevi lead gratuiti ogni mese"
              placeholder="Il tuo indirizzo email"
              buttonText="Iscriviti"
              source="login_footer"
              variant="compact"
              className="max-w-xl mx-auto"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">TrovaMi</span>
              </div>
              <p className="text-gray-300 mb-6 max-w-md">
                La piattaforma italiana per trovare clienti analizzando siti web con problemi tecnici. 
                Perfetta per agenzie web e professionisti digitali.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Prodotto</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/tools/public-scan" className="text-gray-300 hover:text-white transition-colors">
                    Analisi Gratuita
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="text-gray-300 hover:text-white transition-colors">
                    Piani e Prezzi
                  </Link>
                </li>
                <li>
                  <Link href="/help" className="text-gray-300 hover:text-white transition-colors">
                    Come Funziona
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Supporto</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/help" className="text-gray-300 hover:text-white transition-colors">
                    Centro Assistenza
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-300 hover:text-white transition-colors">
                    Contattaci
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-gray-300 hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-gray-300 hover:text-white transition-colors">
                    Termini di Servizio
                  </Link>
                </li>
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
