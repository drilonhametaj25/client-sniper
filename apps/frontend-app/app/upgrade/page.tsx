// Pagina "Piano e crediti" (autenticata) - TrovaMi
// Unico punto per gestire l'economia dell'account:
// - Abbonamenti (NewPlanSelector, piani dal DB, checkout Stripe)
// - Pacchetti crediti una tantum (sezione #pacchetti, API /api/credits/purchase)
// I redirect da /credits (inclusi i ritorni dal checkout Stripe) atterrano qui.

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import NewPlanSelector from '@/components/NewPlanSelector'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getBasePlanType } from '@/lib/utils/plan-helpers'
import {
  Coins,
  Check,
  Zap,
  TrendingUp,
  Package,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react'

interface CreditPack {
  id: string
  name: string
  credits: number
  price_cents: number
  price: string
  pricePerCredit: string
  currency: string
  discount_percentage: number
}

function UpgradePageContent() {
  const { user, loading, refreshProfile } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Stato pacchetti crediti
  const [packs, setPacks] = useState<CreditPack[]>([])
  const [packsLoading, setPacksLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [packError, setPackError] = useState<string | null>(null)

  // Esito acquisto pacchetto (forwarded dal redirect di /credits dopo Stripe)
  const purchaseStatus = searchParams.get('purchase')
  const purchasedCredits = searchParams.get('credits')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/upgrade')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return

    loadCreditPacks()

    if (purchaseStatus === 'success') {
      refreshProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, purchaseStatus])

  // Scroll alla sezione pacchetti quando si arriva con l'anchor #pacchetti
  useEffect(() => {
    if (loading || !user) return
    if (typeof window !== 'undefined' && window.location.hash === '#pacchetti') {
      requestAnimationFrame(() => {
        document.getElementById('pacchetti')?.scrollIntoView({ behavior: 'smooth' })
      })
    }
  }, [loading, user])

  const loadCreditPacks = async () => {
    try {
      setPacksLoading(true)
      const response = await fetch('/api/credits/purchase')

      if (!response.ok) {
        throw new Error('Errore nel caricamento dei pacchetti')
      }

      const data = await response.json()

      if (data.success && data.packs) {
        setPacks(data.packs)
      } else {
        throw new Error('Dati pacchetti non validi')
      }
    } catch (err) {
      console.error('Errore caricamento pacchetti:', err)
      setPackError('Impossibile caricare i pacchetti crediti. Riprova più tardi.')
    } finally {
      setPacksLoading(false)
    }
  }

  const handlePackPurchase = async (packId: string) => {
    try {
      setPurchasing(packId)
      setPackError(null)

      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        router.push('/login?redirect=/upgrade')
        return
      }

      const response = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ packId }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Errore durante l\'acquisto')
      }
    } catch (err: any) {
      console.error('Errore acquisto:', err)
      setPackError(err.message || 'Errore durante l\'acquisto. Riprova.')
    } finally {
      setPurchasing(null)
    }
  }

  const getPackIcon = (index: number) => {
    const icons = [Package, Coins, Zap, TrendingUp, Sparkles]
    return icons[index] || Coins
  }

  const getPackColor = (discount: number) => {
    if (discount >= 40) return 'from-purple-500 to-pink-500'
    if (discount >= 30) return 'from-blue-500 to-purple-500'
    if (discount >= 20) return 'from-green-500 to-teal-500'
    if (discount >= 10) return 'from-yellow-500 to-orange-500'
    return 'from-gray-500 to-gray-600'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Piano e crediti</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Ciao, {user.email}
              </span>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Torna alla Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Banner esito acquisto pacchetto */}
        {purchaseStatus === 'success' && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center">
            <CheckCircle className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-800">
                Acquisto completato con successo!
              </p>
              <p className="text-sm text-green-600">
                {purchasedCredits} crediti sono stati aggiunti al tuo account.
              </p>
            </div>
          </div>
        )}

        {purchaseStatus === 'cancelled' && (
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center">
            <AlertCircle className="w-6 h-6 text-yellow-500 mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-800">
                Acquisto annullato
              </p>
              <p className="text-sm text-yellow-600">
                Non è stato effettuato alcun addebito. Puoi riprovare quando vuoi.
              </p>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Scala il tuo business con più lead
          </h2>
          <p className="text-xl text-gray-600 mb-6">
            Piano attuale: <span className="font-semibold capitalize text-blue-600">
              {user?.plan ? (
                user.plan.includes('_')
                  ? `${getBasePlanType(user.plan)} (${user.plan.includes('monthly') ? 'Mensile' : 'Annuale'})`
                  : getBasePlanType(user.plan)
              ) : 'free'}
            </span>
          </p>
          <div className="bg-gray-50 rounded-lg p-4 inline-block">
            <p className="text-gray-700">
              Crediti rimanenti: <span className="font-semibold text-2xl text-blue-600">
                {user?.credits_remaining || 0}
              </span>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              1 credito = 1 lead sbloccato
            </p>
          </div>
          <p className="text-gray-600 mt-6 max-w-2xl mx-auto">
            L'abbonamento ricarica i crediti ogni mese; i pacchetti sono una tantum e non scadono.
          </p>
        </div>

        {/* Abbonamenti */}
        <NewPlanSelector
          currentPlan={user?.plan || 'free'}
          showFree={false}
        />

        {/* Pacchetti crediti una tantum */}
        <div id="pacchetti" className="mt-16 scroll-mt-24">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Pacchetti crediti
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Ti servono crediti extra senza cambiare piano? Compra un pacchetto una tantum:
              i crediti non scadono mai.
            </p>
          </div>

          {packError && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center max-w-3xl mx-auto">
              <AlertCircle className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800">Errore</p>
                <p className="text-sm text-red-600">{packError}</p>
              </div>
            </div>
          )}

          {packsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-80 bg-gray-100 border border-gray-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : packs.length === 0 ? (
            !packError && (
              <div className="text-center py-12">
                <Coins className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Pacchetti non disponibili
                </h4>
                <p className="text-gray-600">
                  I pacchetti crediti non sono al momento disponibili. Riprova più tardi.
                </p>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {packs.map((pack, index) => {
                const Icon = getPackIcon(index)
                const gradientColor = getPackColor(pack.discount_percentage)
                const isPopular = pack.discount_percentage >= 30

                return (
                  <div
                    key={pack.id}
                    className={`relative bg-white rounded-2xl border-2 transition-all duration-300 hover:shadow-xl overflow-hidden ${
                      isPopular
                        ? 'border-blue-500 ring-4 ring-blue-100'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Discount Badge */}
                    {pack.discount_percentage > 0 && (
                      <div className="absolute -top-0 -right-0 w-24 h-24 overflow-hidden">
                        <div className={`absolute top-4 right-[-40px] transform rotate-45 bg-gradient-to-r ${gradientColor} text-white text-xs font-bold py-1 w-32 text-center shadow-lg`}>
                          -{pack.discount_percentage}%
                        </div>
                      </div>
                    )}

                    {/* Popular Badge */}
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-xs font-medium rounded-full z-10">
                        Più popolare
                      </div>
                    )}

                    <div className="p-6">
                      {/* Icon */}
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradientColor} flex items-center justify-center mb-4 mx-auto`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>

                      {/* Name */}
                      <h4 className="text-xl font-bold text-center text-gray-900 mb-2">
                        {pack.name}
                      </h4>

                      {/* Credits */}
                      <div className="text-center mb-4">
                        <span className="text-4xl font-bold text-gray-900">
                          {pack.credits}
                        </span>
                        <span className="text-gray-600 ml-2">crediti</span>
                      </div>

                      {/* Price */}
                      <div className="text-center mb-4">
                        <span className="text-2xl font-bold text-gray-900">
                          {pack.price}
                        </span>
                        <span className="text-gray-600 ml-1">EUR</span>
                      </div>

                      {/* Price per credit */}
                      <div className="text-center mb-6">
                        <span className={`text-sm font-medium ${
                          pack.discount_percentage >= 30
                            ? 'text-green-600'
                            : 'text-gray-600'
                        }`}>
                          {pack.pricePerCredit} EUR/credito
                        </span>
                      </div>

                      {/* Features */}
                      <ul className="space-y-2 mb-6">
                        <li className="flex items-center text-sm text-gray-600">
                          <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          Nessuna scadenza
                        </li>
                        <li className="flex items-center text-sm text-gray-600">
                          <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          Uso immediato
                        </li>
                        <li className="flex items-center text-sm text-gray-600">
                          <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          Pagamento una tantum
                        </li>
                      </ul>

                      {/* CTA Button */}
                      <button
                        onClick={() => handlePackPurchase(pack.id)}
                        disabled={purchasing !== null}
                        className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center ${
                          isPopular
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {purchasing === pack.id ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Elaborazione...
                          </>
                        ) : (
                          <>
                            <Coins className="w-5 h-5 mr-2" />
                            Acquista
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Benefits Section */}
        <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Perché passare a TrovaMi Premium?
          </h3>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Risparmia tempo prezioso
              </h4>
              <p className="text-gray-600">
                Invece di ore di ricerca manuale, ottieni lead qualificati in pochi click.
                Più tempo per la vendita, meno tempo per la ricerca.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Lead già qualificati
              </h4>
              <p className="text-gray-600">
                Ogni lead ha problemi tecnici reali identificati dal nostro sistema.
                Sai già cosa proporre al primo contatto.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Organizzazione completa
              </h4>
              <p className="text-gray-600">
                CRM integrato per gestire tutti i lead: note, follow-up, allegati,
                timeline e stati personalizzati per non perdere nessuna opportunità.
              </p>
            </div>
          </div>

          {/* ROI Section */}
          <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
            <h4 className="text-xl font-semibold text-gray-900 text-center mb-4">
              Calcolo del valore
            </h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">1 credito</div>
                <div className="text-sm text-gray-600">= 1 lead sbloccato con analisi completa</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">1 cliente</div>
                <div className="text-sm text-gray-600">Acquisito ripaga il piano</div>
              </div>
            </div>
            <p className="text-center text-gray-600 mt-4">
              Se converti anche solo 1 lead in cliente, hai già recuperato l'investimento
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Domande Frequenti
          </h3>

          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="font-semibold text-gray-900 mb-2">
                Che differenza c'è tra abbonamento e pacchetti crediti?
              </h4>
              <p className="text-gray-600">
                L'abbonamento ricarica i crediti ogni mese al prezzo più conveniente.
                I pacchetti crediti sono acquisti una tantum: li compri solo quando ti servono
                e non scadono mai. Puoi anche combinarli.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="font-semibold text-gray-900 mb-2">
                Come funziona il CRM integrato?
              </h4>
              <p className="text-gray-600">
                I piani premium includono un CRM completo per gestire i tuoi lead: puoi aggiungere note,
                impostare follow-up, caricare allegati, tracciare la timeline delle attività e
                organizzare i contatti per stato (da contattare, in negoziazione, chiuso, ecc.).
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="font-semibold text-gray-900 mb-2">
                Che tipo di problemi tecnici identificate?
              </h4>
              <p className="text-gray-600">
                Il nostro sistema identifica: SEO scadente, performance lente, problemi di sicurezza,
                design obsoleto, mancanza di pixel di tracking, errori tecnici. Hai già l'argomento
                perfetto per il primo contatto.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="font-semibold text-gray-900 mb-2">
                Posso cancellare in qualsiasi momento?
              </h4>
              <p className="text-gray-600">
                Sì, puoi cancellare la tua sottoscrizione in qualsiasi momento.
                Continuerai ad avere accesso fino alla fine del periodo di fatturazione.
                I crediti dei pacchetti una tantum restano tuoi anche senza abbonamento.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function UpgradePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <UpgradePageContent />
    </Suspense>
  )
}
