'use client'

// Pagina di registrazione con selezione piano integrata
// Permette all'utente di scegliere il piano durante la registrazione
// Gestisce sia piani gratuiti che a pagamento

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Check, Star, Eye, EyeOff } from 'lucide-react'

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
      '2 lead al mese',
      'Informazioni base',
      'Supporto community'
    ]
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    credits: 50,
    features: [
      '50 lead al mese',
      'Analisi tecnica completa',
      'Export CSV',
      'Supporto email',
      'Filtri avanzati'
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    credits: 200,
    features: [
      '200 lead al mese',
      'Analisi tecnica completa',
      'Export CSV illimitato',
      'Supporto prioritario',
      'Filtri avanzati',
      'API access',
      'Lead scoring avanzato'
    ],
    popular: true,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
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
  const router = useRouter()

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId)
    setStep(2) // Vai ai dati utente
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      alert('Le password non corrispondono')
      return
    }

    if (password.length < 6) {
      alert('La password deve essere di almeno 6 caratteri')
      return
    }

    setLoading(true)

    try {
      // Registrazione utente
      const { data, error } = await signUp(email, password)
      
      if (error) {
        throw error
      }

      // Se piano gratuito, vai al login
      if (selectedPlan === 'free') {
        alert('Registrazione completata! Controlla la tua email per confermare l\'account, poi effettua il login.')
        router.push('/login')
        return
      }

      // Se piano a pagamento, vai al checkout dopo conferma email
      alert('Registrazione completata! Controlla la tua email per confermare l\'account, poi effettua il login per completare il pagamento.')
      router.push('/login')

    } catch (error: any) {
      console.error('Errore durante la registrazione:', error)
      alert(error.message || 'Errore durante la registrazione')
    } finally {
      setLoading(false)
    }
  }

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Benvenuto in TrovaMi
            </h1>
            <p className="text-xl text-gray-600">
              Scegli il piano perfetto per te
            </p>
          </div>

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
                    : 'hover:scale-102'
                }`}
                onClick={() => handlePlanSelect(plan.id)}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                      <Star className="w-4 h-4 mr-1" />
                      Più popolare
                    </div>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">
                      €{plan.price}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-600">/mese</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {plan.credits} lead al mese
                  </p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className={`w-full py-3 px-6 rounded-lg font-medium text-center transition-colors ${
                  plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}>
                  Scegli {plan.name}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-600">
              Hai già un account?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Accedi qui
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Form dati utente
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Completa la registrazione
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Piano selezionato: <span className="font-medium capitalize">{selectedPlan}</span>
          </p>
          <button
            onClick={() => setStep(1)}
            className="mt-2 text-center w-full text-sm text-blue-600 hover:text-blue-700"
          >
            ← Cambia piano
          </button>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="La tua email"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Almeno 6 caratteri"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Conferma Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Ripeti la password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Registrazione...
                </div>
              ) : (
                selectedPlan === 'free' ? 'Registrati Gratis' : `Registrati (Piano ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)})`
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-600">
              Registrandoti accetti i nostri{' '}
              <a href="#" className="text-blue-600 hover:text-blue-700">
                Termini di Servizio
              </a>{' '}
              e la{' '}
              <a href="#" className="text-blue-600 hover:text-blue-700">
                Privacy Policy
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
