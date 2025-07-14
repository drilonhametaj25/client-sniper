/**
 * Pagina di registrazione migliorata con design moderno
 * Include header, footer, selezione piano integrata e UX ottimizzata
 * SEO-friendly con struttura semantica e accessibilità migliorata
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ToastProvider'
import { validatePassword, validateEmail, getPasswordStrengthColor, getPasswordStrengthBg } from '@/lib/validation'
import { 
  Check, 
  Star, 
  Eye, 
  EyeOff, 
  Target,
  Search,
  ArrowLeft,
  Zap,
  Shield,
  Crown,
  Users,
  BarChart3,
  Mail,
  Lock
} from 'lucide-react'
import NewsletterForm from '@/components/NewsletterForm'
import ThemeToggle from '@/components/theme/ThemeToggle'

interface Plan {
  id: string
  name: string
  price: number
  credits: number
  features: string[]
  popular?: boolean
  stripePriceId?: string
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    credits: 2,
    features: [
      '2 audit al mese',
      'Report base',
      'Supporto community'
    ]
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 19,
    credits: 25,
    features: [
      '25 audit completi al mese',
      'Intelligence tecnica avanzata',
      'Supporto email',
      'Filtri di targeting'
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || 'price_starter_test'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    credits: 100,
    features: [
      '100 audit al mese',
      'Suite completa di analisi',
      'CRM personale integrato',
      'Supporto prioritario',
      'Targeting geografico',
      'API access',
      'Scoring intelligence proprietario'
    ],
    popular: true,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'price_pro_test'
  }
]

export default function RegisterPage() {
  const [selectedPlan, setSelectedPlan] = useState('free')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1 = piano, 2 = dati
  
  const { signUp } = useAuth()
  const { success, error: showError } = useToast()
  const router = useRouter()

  // Validazione password in tempo reale
  const passwordValidation = validatePassword(password)

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId)
    setStep(2) // Vai ai dati utente
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validazione email
    if (!validateEmail(email)) {
      showError('Email non valida', 'Inserisci un indirizzo email valido')
      return
    }

    // Validazione password
    if (!passwordValidation.isValid) {
      showError('Password non valida', 'La password deve essere più complessa')
      return
    }

    // Verifica conferma password
    if (password !== confirmPassword) {
      showError('Password non corrispondono', 'Controlla di aver inserito la stessa password')
      return
    }

    setLoading(true)

    try {
      const selectedPlanData = plans.find(p => p.id === selectedPlan)

      // Crea l'account
      const signUpResult = await signUp(email, password)
      
      if (!signUpResult.success) {
        throw new Error(signUpResult.error || 'Errore durante la registrazione')
      }

      // Se piano gratuito, vai alla dashboard
      if (selectedPlan === 'free') {
        success('Account creato!', 'Controlla la tua email per confermare l\'account')
        router.push('/dashboard')
        return
      }

      // Se piano a pagamento, vai DIRETTAMENTE al checkout (senza conferma email)
      if (selectedPlanData?.stripePriceId) {
        success('Account creato!', 'Procediamo al pagamento...')
        
        // Attendiamo un momento per assicurarci che l'utente sia nel database
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Vai direttamente al checkout
        try {
          const response = await fetch('/api/stripe/create-checkout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              priceId: selectedPlanData.stripePriceId,
              planId: selectedPlan,
              userEmail: email,
              autoConfirm: true
            })
          })

          const { url, error: checkoutError } = await response.json()

          if (checkoutError) {
            throw new Error(checkoutError)
          }

          if (url) {
            window.location.href = url
            return
          } else {
            throw new Error('URL di checkout non ricevuto')
          }
        } catch (checkoutErr: any) {
          console.error('Errore checkout:', checkoutErr)
          showError('Errore pagamento', checkoutErr.message || 'Errore durante l\'avvio del pagamento.')
        }
      } else {
        showError('Errore configurazione', 'Piano non configurato correttamente')
      }

    } catch (error: any) {
      console.error('Errore durante la registrazione:', error)
      showError('Errore registrazione', error.message || 'Errore durante la registrazione')
    } finally {
      setLoading(false)
    }
  }

  if (step === 1) {
    return (
      <>
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

          <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12" role="main">
            {/* Hero Section */}
            <section className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Scegli il Piano Professionale per Te
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                Inizia con audit gratuiti e scala verso l'intelligence automatizzata. 
                Tutti i piani includono accesso alla piattaforma professionale di audit digitale.
              </p>
              
              {/* Features highlights */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 max-w-3xl mx-auto">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                  <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Audit Automatizzati</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                  <BarChart3 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span>Dashboard Tecnica</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                  <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span>Dati Sicuri</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                  <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <span>Supporto 24/7</span>
                </div>
              </div>
            </section>

            {/* Plans Grid */}
            <section className="mb-12" aria-labelledby="plans-heading">
              <h2 id="plans-heading" className="sr-only">Piani disponibili</h2>
              <div className="grid md:grid-cols-3 gap-8">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl p-8 cursor-pointer transition-all ${
                      plan.popular
                        ? 'border-2 border-blue-500 shadow-xl'
                        : 'border border-gray-200 shadow-lg hover:shadow-xl'
                    } ${
                      selectedPlan === plan.id
                        ? 'ring-2 ring-blue-500 scale-105'
                        : 'hover:border-blue-300'
                    } bg-white`}
                    onClick={() => handlePlanSelect(plan.id)}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <span className="inline-flex items-center px-4 py-1 rounded-full text-xs font-medium bg-blue-500 text-white">
                          <Star className="w-3 h-3 mr-1" />
                          Più Popolare
                        </span>
                      </div>
                    )}
                    
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                      <div className="mb-4">
                        <span className="text-4xl font-bold text-gray-900">€{plan.price}</span>
                        {plan.price > 0 && <span className="text-gray-500">/mese</span>}
                      </div>
                      
                      <p className="text-gray-600 mb-6">
                        {plan.credits} audit {plan.price === 0 ? 'gratuiti' : 'inclusi'}
                      </p>
                      
                      <ul className="space-y-3 mb-8">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center text-sm text-gray-600">
                            <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className={`w-full py-3 px-4 rounded-lg font-medium text-center transition-colors ${
                      plan.popular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}>
                      Scegli {plan.name}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* CTA Section */}
            <section className="text-center mb-16">
              <p className="text-gray-600 mb-4">
                Hai già un account?{' '}
                <Link
                  href="/login"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Accedi qui
                </Link>
              </p>
              <p className="text-sm text-gray-500">
                Tutti i piani includono una garanzia di rimborso entro 30 giorni
              </p>
            </section>

            {/* Newsletter Section */}
            <section className="mb-16">
              <div className="max-w-2xl mx-auto">
                <NewsletterForm
                  title="Prima di Iniziare..."
                  description="Iscriviti alla newsletter e ricevi subito 3 lead gratuiti + strategie di acquisizione clienti"
                  source="register_page"
                  variant="default"
                />
              </div>
            </section>
          </main>

          {/* Footer */}
          <footer className="bg-gray-900 text-white py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Newsletter compatta nel footer */}
              <div className="mb-16 p-8 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl border border-white/10">
                <NewsletterForm
                  title="Newsletter Professionale"
                  description="Lead qualificati e strategie di acquisizione clienti"
                  placeholder="Il tuo indirizzo email"
                  buttonText="Iscriviti"
                  source="register_footer_step1"
                  variant="compact"
                  className="max-w-2xl mx-auto"
                />
              </div>

              <div className="grid md:grid-cols-4 gap-8 mb-12">
                <div className="col-span-2">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold">TrovaMi</span>
                  </div>
                  <p className="text-gray-400 text-lg leading-relaxed max-w-md">
                    La piattaforma più avanzata per trovare lead qualificati attraverso l'analisi automatizzata di siti web aziendali.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">Prodotto</h3>
                  <ul className="space-y-3">
                    <li><Link href="/tools/public-scan" className="text-gray-400 hover:text-white transition-colors">Analisi Gratuita</Link></li>
                    <li><Link href="/#pricing" className="text-gray-400 hover:text-white transition-colors">Prezzi</Link></li>
                    <li><Link href="/login" className="text-gray-400 hover:text-white transition-colors">Login</Link></li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">Risorse</h3>
                  <ul className="space-y-3">
                    <li><Link href="/come-trovare-clienti" className="text-gray-400 hover:text-white transition-colors">Come Trovare Clienti</Link></li>
                    <li><Link href="/help" className="text-gray-400 hover:text-white transition-colors">Centro Assistenza</Link></li>
                    <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors">Contatti</Link></li>
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
        </div>
      </>
    )
  }

  // Step 2: Form dati utente
  return (
    <>
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

        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12" role="main">
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <span className="ml-2 text-sm font-medium text-blue-600">Piano</span>
              </div>
              <div className="w-12 h-0.5 bg-blue-600"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">2</span>
                </div>
                <span className="ml-2 text-sm font-medium text-blue-600">Dati</span>
              </div>
            </div>
          </div>

          {/* Registration Form */}
          <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Completa la Registrazione
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Piano selezionato: <span className="font-semibold text-blue-600 dark:text-blue-400 capitalize">{selectedPlan}</span>
              </p>
              <button
                onClick={() => setStep(1)}
                className="mt-2 inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Cambia piano
              </button>
            </div>
            
            <form className="space-y-6" onSubmit={handleSignUp}>
              <div className="grid grid-cols-1 gap-6">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Indirizzo Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="nome@esempio.com"
                    />
                  </div>
                </div>
                
                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="Crea una password sicura"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
                      )}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="mt-2">
                      <div className={`h-2 w-full rounded-full ${getPasswordStrengthBg(passwordValidation.strength)}`}>
                        <div 
                          className={`h-2 rounded-full transition-all duration-200 ${getPasswordStrengthColor(passwordValidation.strength)}`}
                          style={{ 
                            width: `${
                              passwordValidation.strength === 'weak' ? 33 :
                              passwordValidation.strength === 'medium' ? 66 : 100
                            }%` 
                          }}
                        ></div>
                      </div>
                      <p className={`text-xs mt-1 ${getPasswordStrengthColor(passwordValidation.strength)}`}>
                        {passwordValidation.strength === 'weak' && 'Password debole'}
                        {passwordValidation.strength === 'medium' && 'Password discreta'}
                        {passwordValidation.strength === 'strong' && 'Password forte'}
                      </p>
                      {/* Password Requirements */}
                      {!passwordValidation.isValid && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">La password deve contenere:</p>
                          <ul className="space-y-1">
                            <li className={`text-xs flex items-center ${password.length >= 8 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                              <div className={`w-3 h-3 rounded-full mr-2 flex items-center justify-center ${password.length >= 8 ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                {password.length >= 8 ? (
                                  <Check className="w-2 h-2 text-green-600" />
                                ) : (
                                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                )}
                              </div>
                              Almeno 8 caratteri
                            </li>
                            <li className={`text-xs flex items-center ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-600'}`}>
                              <div className={`w-3 h-3 rounded-full mr-2 flex items-center justify-center ${/[A-Z]/.test(password) ? 'bg-green-100' : 'bg-gray-200'}`}>
                                {/[A-Z]/.test(password) ? (
                                  <Check className="w-2 h-2 text-green-600" />
                                ) : (
                                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                )}
                              </div>
                              Una lettera maiuscola (A-Z)
                            </li>
                            <li className={`text-xs flex items-center ${/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-600'}`}>
                              <div className={`w-3 h-3 rounded-full mr-2 flex items-center justify-center ${/[a-z]/.test(password) ? 'bg-green-100' : 'bg-gray-200'}`}>
                                {/[a-z]/.test(password) ? (
                                  <Check className="w-2 h-2 text-green-600" />
                                ) : (
                                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                )}
                              </div>
                              Una lettera minuscola (a-z)
                            </li>
                            <li className={`text-xs flex items-center ${/\d/.test(password) ? 'text-green-600' : 'text-gray-600'}`}>
                              <div className={`w-3 h-3 rounded-full mr-2 flex items-center justify-center ${/\d/.test(password) ? 'bg-green-100' : 'bg-gray-200'}`}>
                                {/\d/.test(password) ? (
                                  <Check className="w-2 h-2 text-green-600" />
                                ) : (
                                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                )}
                              </div>
                              Un numero (0-9)
                            </li>
                            <li className={`text-xs flex items-center ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'text-green-600' : 'text-gray-600'}`}>
                              <div className={`w-3 h-3 rounded-full mr-2 flex items-center justify-center ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'bg-green-100' : 'bg-gray-200'}`}>
                                {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? (
                                  <Check className="w-2 h-2 text-green-600" />
                                ) : (
                                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                )}
                              </div>
                              Un carattere speciale (!@#$%^&*)
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Confirm Password Field */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Conferma Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="Ripeti la password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
                      )}
                    </button>
                  </div>
                  
                  {/* Password Match Indicator */}
                  {confirmPassword && (
                    <p className={`text-xs mt-1 ${password === confirmPassword ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {password === confirmPassword ? 'Le password corrispondono' : 'Le password non corrispondono'}
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !passwordValidation.isValid || password !== confirmPassword}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creazione account...
                  </>
                ) : (
                  <>
                    <Crown className="h-5 w-5 mr-2" />
                    Crea Account {selectedPlan === 'free' ? 'Gratuito' : `${plans.find(p => p.id === selectedPlan)?.name}`}
                  </>
                )}
              </button>

              {/* Terms and Privacy */}
              <p className="text-xs text-center text-gray-600 dark:text-gray-300">
                Creando un account, accetti i nostri{' '}
                <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                  Termini di Servizio
                </Link>{' '}
                e{' '}
                <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                  Privacy Policy
                </Link>
              </p>
            </form>
          </section>

          {/* Additional Info */}
          <section className="text-center mt-8">
            <p className="text-gray-600 dark:text-gray-300">
              Hai già un account?{' '}
              <Link
                href="/login"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                Accedi qui
              </Link>
            </p>
          </section>
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Newsletter compatta nel footer */}
            <div className="mb-16 p-8 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl border border-white/10">
              <NewsletterForm
                title="Newsletter Professionale"
                description="Lead qualificati e strategie di acquisizione clienti"
                placeholder="Il tuo indirizzo email"
                buttonText="Iscriviti"
                source="register_footer_step2"
                variant="compact"
                className="max-w-2xl mx-auto"
              />
            </div>

            <div className="grid md:grid-cols-4 gap-8 mb-12">
              <div className="col-span-2">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold">TrovaMi</span>
                </div>
                <p className="text-gray-400 text-lg leading-relaxed max-w-md">
                  La piattaforma più avanzata per trovare lead qualificati attraverso l'analisi automatizzata di siti web aziendali.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Prodotto</h3>
                <ul className="space-y-3">
                  <li><Link href="/tools/public-scan" className="text-gray-400 hover:text-white transition-colors">Analisi Gratuita</Link></li>
                  <li><Link href="/#pricing" className="text-gray-400 hover:text-white transition-colors">Prezzi</Link></li>
                  <li><Link href="/login" className="text-gray-400 hover:text-white transition-colors">Login</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Risorse</h3>
                <ul className="space-y-3">
                  <li><Link href="/come-trovare-clienti" className="text-gray-400 hover:text-white transition-colors">Come Trovare Clienti</Link></li>
                  <li><Link href="/help" className="text-gray-400 hover:text-white transition-colors">Centro Assistenza</Link></li>
                  <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors">Contatti</Link></li>
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
      </div>
    </>
  )
}
