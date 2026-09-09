/**
 * Pagina di registrazione - TrovaMi
 * Percorso: apps/frontend-app/app/register/page.tsx
 *
 * Due passaggi: (1) scelta del piano, (2) dati dell'account. Il flusso resta
 * quello di prima: piano gratuito -> /onboarding, piano a pagamento -> checkout
 * Stripe. Cambia solo la presentazione (token e primitive di DESIGN.md):
 * niente header duplicato, niente newsletter, niente vetrina di funzionalita'.
 */

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { isStarterOrHigher } from '@/lib/utils/plan-helpers'
import Script from 'next/script'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ToastProvider'
import { supabase } from '@/lib/supabase'
import { validatePassword, validateEmail } from '@/lib/validation'
import { ArrowLeft, Check, Eye, EyeOff, Minus } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Skeleton from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils/cn'
import NewPlanSelector from '@/components/NewPlanSelector'

// Estende il tipo Window per includere le funzioni di tracking
declare global {
  interface Window {
    fbq?: any
    gtag?: (...args: any[]) => void
    gtag_report_conversion?: () => void
  }
}

// Requisiti della password: stessi controlli di lib/validation, mostrati
// all'utente mentre scrive. Il verdetto finale resta di validatePassword().
const PASSWORD_RULES: { label: string; test: (value: string) => boolean }[] = [
  { label: 'Almeno 8 caratteri', test: (v) => v.length >= 8 },
  { label: 'Una lettera maiuscola', test: (v) => /[A-Z]/.test(v) },
  { label: 'Una lettera minuscola', test: (v) => /[a-z]/.test(v) },
  { label: 'Un numero', test: (v) => /\d/.test(v) },
  {
    label: 'Un carattere speciale',
    test: (v) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(v),
  },
]

const STRENGTH_LABEL: Record<'weak' | 'medium' | 'strong', string> = {
  weak: 'Password debole',
  medium: 'Password discreta',
  strong: 'Password forte',
}

const STRENGTH_TEXT: Record<'weak' | 'medium' | 'strong', string> = {
  weak: 'text-danger',
  medium: 'text-warning',
  strong: 'text-success',
}

const STRENGTH_FILL: Record<'weak' | 'medium' | 'strong', string> = {
  weak: 'bg-danger w-1/3',
  medium: 'bg-warning w-2/3',
  strong: 'bg-success w-full',
}

// Componente principale con Suspense wrapper
export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface px-4 pb-20 pt-24 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-md space-y-4">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72 max-w-full" />
            <Skeleton className="h-64 w-full rounded-card" />
          </div>
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  )
}

// Componente con logica che usa useSearchParams
function RegisterPageContent() {
  // Stati piani dinamici dal database
  const [availablePlans, setAvailablePlans] = useState<any[]>([])
  const [plansLoading, setPlansLoading] = useState(true)

  // Stato per il piano selezionato
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
  const searchParams = useSearchParams()

  // Carica parametri URL per auto-selezione piano
  useEffect(() => {
    const planParam = searchParams.get('plan')
    const stepParam = searchParams.get('step')

    if (planParam) {
      // Estrae il nome base del piano (rimuove suffissi _monthly/_annual)
      const basePlanName = planParam.replace('_monthly', '').replace('_annual', '')
      setSelectedPlan(basePlanName)
    }

    if (stepParam) {
      const stepValue = parseInt(stepParam)
      if (stepValue >= 1 && stepValue <= 3) {
        setStep(stepValue)
      }
    }

    // Carica piani dal database
    loadAvailablePlans()
  }, [searchParams])

  // Carica piani disponibili dal database
  const loadAvailablePlans = async () => {
    try {
      const { data: plans, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order')

      if (error) throw error
      setAvailablePlans(plans || [])
    } catch (error) {
      console.error('Errore caricamento piani:', error)
    } finally {
      setPlansLoading(false)
    }
  }

  // Trova il piano selezionato dai dati del database
  const getSelectedPlanData = () => {
    if (!availablePlans.length) return null

    // Cerca prima la versione mensile del piano selezionato
    const monthlyPlan = availablePlans.find(plan =>
      plan.name === selectedPlan || plan.name === `${selectedPlan}_monthly`
    )

    return monthlyPlan || null
  }

  // Validazione password in tempo reale
  const passwordValidation = validatePassword(password)

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId)
    setStep(2) // Vai ai dati utente

    // Track piano selezionato
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        content_name: `Piano ${planId}`,
        content_category: 'Registration',
        value: 0,
        currency: 'EUR'
      })
    }

    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'begin_checkout', {
        event_category: 'Registration',
        event_label: `Piano ${planId}`,
        value: 0
      })
    }
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

    // Track Google Ads conversion per piani paganti (Starter e Pro) quando si clicca "Crea Account"
    if (isStarterOrHigher(selectedPlan) && typeof window !== 'undefined' && window.gtag_report_conversion) {
      window.gtag_report_conversion()
    }

    try {
      // Crea l'account
      const signUpResult = await signUp(email, password)

      if (!signUpResult.success) {
        throw new Error(signUpResult.error || 'Errore durante la registrazione')
      }

      // Track successful registration
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'CompleteRegistration', {
          content_name: `Piano ${selectedPlan}`,
          content_category: 'Registration Complete',
          value: 0,
          currency: 'EUR'
        })
      }

      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'sign_up', {
          event_category: 'Registration',
          event_label: `Piano ${selectedPlan}`,
          value: 0
        })
      }

      // Se piano gratuito, vai all'onboarding (60 secondi: cosa vendi + dove
      // lavori) così la dashboard mostra subito lead compatibili
      if (selectedPlan === 'free') {
        success('Account creato!', 'Controlla la tua email per confermare l\'account')
        router.push('/onboarding')
        return
      }

      // Se piano a pagamento, vai DIRETTAMENTE al checkout (senza conferma email)
      if (selectedPlan !== 'free') {
        success('Account creato!', 'Procediamo al pagamento...')

        // Attendiamo un momento per assicurarci che l'utente sia nel database
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Vai direttamente al checkout
        try {
          // Recupera dati del piano selezionato
          const planData = getSelectedPlanData()

          if (!planData || !planData.stripe_price_id_monthly) {
            throw new Error('Piano non configurato correttamente. Contatta il supporto.')
          }

          const response = await fetch('/api/stripe/create-checkout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              priceId: planData.stripe_price_id_monthly, // Usa il vero Stripe Price ID
              planId: selectedPlan,
              userEmail: email,
              autoConfirm: true,
              isAnnual: false // Sempre mensile per la registrazione
            })
          })

          const { url, error: checkoutError } = await response.json()

          if (checkoutError) {
            throw new Error(checkoutError)
          }

          if (url) {
            // Track payment initiation
            if (typeof window !== 'undefined' && window.fbq) {
              window.fbq('track', 'AddPaymentInfo', {
                content_name: `Piano ${selectedPlan}`,
                content_category: 'Payment Initiation',
                value: 0, // Il prezzo verrà tracciato successivamente dopo il checkout
                currency: 'EUR'
              })
            }

            if (typeof window !== 'undefined' && window.gtag) {
              window.gtag('event', 'add_payment_info', {
                event_category: 'Payment',
                event_label: `Piano ${selectedPlan}`,
                value: 0 // Il prezzo verrà tracciato successivamente dopo il checkout
              })
            }

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

  const planLabel = selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)

  if (step === 1) {
    return (
      <>
        {/* Google Analytics per pagina registrazione */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-VE3PVKHR35"
          strategy="afterInteractive"
        />
        <Script id="google-analytics-register-page" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-VE3PVKHR35', {
              page_title: 'Registrazione - Selezione Piano',
              page_location: window.location.href,
              send_page_view: true
            });
          `}
        </Script>

        {/* Google Ads Conversion Tracking */}
        <Script id="google-ads-conversion" strategy="afterInteractive">
          {`
            function gtag_report_conversion(url) {
              var callback = function () {
                if (typeof(url) != 'undefined') {
                  window.location = url;
                }
              };
              gtag('event', 'conversion', {
                  'send_to': 'AW-11367445055/zGjTCN_23oQbEL_ktawq',
                  'transaction_id': '',
                  'event_callback': callback
              });
              return false;
            }
          `}
        </Script>

        {/* Facebook Pixel per pagina registrazione */}
        <Script id="facebook-pixel-register-page" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1073364924333598');
            fbq('track', 'PageView');
            fbq('track', 'ViewContent', {
              content_name: 'Registrazione - Selezione Piano',
              content_category: 'Registration Step 1'
            });
          `}
        </Script>

        <div className="min-h-screen bg-surface px-4 pb-20 pt-24 sm:px-6 sm:pt-28 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-caption text-content-subtle">Passo 1 di 2</p>
              <h1 className="mt-2 text-title font-semibold text-content">
                Scegli da dove partire
              </h1>
              <p className="mt-3 text-body-lg text-content-muted">
                1 credito = 1 lead sbloccato. Con l’account gratuito hai un credito di
                prova; puoi passare a un piano quando ti serve, e disdire quando vuoi.
              </p>
            </div>

            <div className="mt-10">
              <NewPlanSelector
                currentPlan={selectedPlan}
                onPlanSelect={(planId, isAnnual) => handlePlanSelect(planId)}
                showFree={true}
              />
            </div>

            <p className="mt-10 text-caption text-content-muted">
              Hai già un account?{' '}
              <Link
                href="/login"
                className="focus-ring rounded-control font-medium text-accent-ink transition-colors duration-fast ease-soft hover:text-accent"
              >
                Accedi
              </Link>
            </p>
          </div>
        </div>
      </>
    )
  }

  // Step 2: Form dati utente
  return (
    <div className="min-h-screen bg-surface px-4 pb-20 pt-24 sm:px-6 sm:pt-28 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8">
          <p className="text-caption text-content-subtle">Passo 2 di 2</p>
          <h1 className="mt-2 text-title font-semibold text-content">Crea il tuo account</h1>
          <p className="mt-2 text-body text-content-muted">
            Piano {selectedPlan === 'free' ? 'gratuito' : planLabel}.{' '}
            <button
              type="button"
              onClick={() => setStep(1)}
              className="focus-ring inline-flex items-center gap-1 rounded-control text-accent-ink transition-colors duration-fast ease-soft hover:text-accent"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Cambia piano
            </button>
          </p>
        </div>

        <Card padding="lg">
          <form className="space-y-5" onSubmit={handleSignUp}>
            <Input
              id="email"
              name="email"
              type="email"
              label="Email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@esempio.com"
            />

            <div>
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                label="Password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Crea una password"
                className="pr-12"
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Nascondi la password' : 'Mostra la password'}
                    className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-control text-content-subtle transition-colors duration-fast ease-soft hover:text-content"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                }
              />

              {password && (
                <div className="mt-3">
                  <div className="h-1 w-full overflow-hidden rounded-pill bg-surface-subtle">
                    <div
                      className={cn(
                        'h-full rounded-pill transition-[width] duration-base ease-soft',
                        STRENGTH_FILL[passwordValidation.strength]
                      )}
                    />
                  </div>
                  <p
                    className={cn(
                      'mt-2 text-caption',
                      STRENGTH_TEXT[passwordValidation.strength]
                    )}
                  >
                    {STRENGTH_LABEL[passwordValidation.strength]}
                  </p>

                  {!passwordValidation.isValid && (
                    <ul className="mt-3 space-y-1.5">
                      {PASSWORD_RULES.map((rule) => {
                        const done = rule.test(password)
                        return (
                          <li
                            key={rule.label}
                            className={cn(
                              'flex items-center gap-2 text-caption',
                              done ? 'text-content-muted' : 'text-content-subtle'
                            )}
                          >
                            {done ? (
                              <Check
                                className="h-3.5 w-3.5 shrink-0 text-success"
                                aria-hidden="true"
                              />
                            ) : (
                              <Minus
                                className="h-3.5 w-3.5 shrink-0 text-content-subtle"
                                aria-hidden="true"
                              />
                            )}
                            <span className="sr-only">
                              {done ? 'Requisito soddisfatto:' : 'Requisito mancante:'}
                            </span>
                            {rule.label}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              label="Conferma password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ripeti la password"
              className="pr-12"
              error={
                confirmPassword && password !== confirmPassword
                  ? 'Le due password non corrispondono'
                  : undefined
              }
              hint={
                confirmPassword && password === confirmPassword
                  ? 'Le password corrispondono'
                  : undefined
              }
              trailing={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={
                    showConfirmPassword ? 'Nascondi la password' : 'Mostra la password'
                  }
                  className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-control text-content-subtle transition-colors duration-fast ease-soft hover:text-content"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              }
            />

            <Button
              type="submit"
              fullWidth
              loading={loading}
              loadingText="Creazione account…"
              disabled={loading || !passwordValidation.isValid || password !== confirmPassword}
            >
              {selectedPlan === 'free' ? 'Crea account gratuito' : `Crea account ${planLabel}`}
            </Button>

            <p className="text-caption text-content-subtle">
              Creando un account accetti i{' '}
              <Link
                href="/terms"
                className="focus-ring rounded-control text-accent-ink transition-colors duration-fast ease-soft hover:text-accent"
              >
                Termini di servizio
              </Link>{' '}
              e la{' '}
              <Link
                href="/privacy"
                className="focus-ring rounded-control text-accent-ink transition-colors duration-fast ease-soft hover:text-accent"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        </Card>

        <p className="mt-6 text-center text-caption text-content-muted">
          Hai già un account?{' '}
          <Link
            href="/login"
            className="focus-ring rounded-control font-medium text-accent-ink transition-colors duration-fast ease-soft hover:text-accent"
          >
            Accedi
          </Link>
        </p>
      </div>
    </div>
  )
}
