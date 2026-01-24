/**
 * Pagina acquisto Credit Packs
 * Permette l'acquisto di crediti singoli "a gettone" senza sottoscrizione
 * Usata da: utenti che vogliono comprare crediti senza impegno mensile
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  Coins,
  ArrowLeft,
  Check,
  Zap,
  TrendingUp,
  Package,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Loader2
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

export default function CreditsPage() {
  const { user, refreshProfile } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [packs, setPacks] = useState<CreditPack[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Gestione parametri URL per success/cancelled
  const purchaseStatus = searchParams.get('purchase')
  const purchasedCredits = searchParams.get('credits')

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/credits')
      return
    }

    loadCreditPacks()

    // Se l'acquisto e' andato a buon fine, refresh del profilo
    if (purchaseStatus === 'success') {
      refreshProfile()
    }
  }, [user, purchaseStatus])

  const loadCreditPacks = async () => {
    try {
      setLoading(true)
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
      setError('Impossibile caricare i pacchetti crediti. Riprova piu\' tardi.')
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (packId: string) => {
    try {
      setPurchasing(packId)
      setError(null)

      // Ottieni il token di sessione
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        router.push('/login?redirect=/credits')
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
        // Redirect al checkout Stripe
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Errore durante l\'acquisto')
      }
    } catch (err: any) {
      console.error('Errore acquisto:', err)
      setError(err.message || 'Errore durante l\'acquisto. Riprova.')
    } finally {
      setPurchasing(null)
    }
  }

  const getPackIcon = (index: number) => {
    const icons = [Package, Coins, Zap, TrendingUp, Sparkles]
    return icons[index] || Coins
  }

  const getPackColor = (index: number, discount: number) => {
    if (discount >= 40) return 'from-purple-500 to-pink-500'
    if (discount >= 30) return 'from-blue-500 to-purple-500'
    if (discount >= 20) return 'from-green-500 to-teal-500'
    if (discount >= 10) return 'from-yellow-500 to-orange-500'
    return 'from-gray-500 to-gray-600'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Dashboard
              </Link>
            </div>
            <div className="flex items-center">
              <Coins className="w-5 h-5 text-yellow-500 mr-2" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.credits_remaining || 0} crediti disponibili
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Success Banner */}
        {purchaseStatus === 'success' && (
          <div className="mb-8 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl flex items-center">
            <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                Acquisto completato con successo!
              </p>
              <p className="text-sm text-green-600 dark:text-green-300">
                {purchasedCredits} crediti sono stati aggiunti al tuo account.
              </p>
            </div>
          </div>
        )}

        {/* Cancelled Banner */}
        {purchaseStatus === 'cancelled' && (
          <div className="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl flex items-center">
            <AlertCircle className="w-6 h-6 text-yellow-500 mr-3" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Acquisto annullato
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-300">
                Non e' stato effettuato alcun addebito. Puoi riprovare quando vuoi.
              </p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl flex items-center">
            <AlertCircle className="w-6 h-6 text-red-500 mr-3" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">
                Errore
              </p>
              <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Acquista Crediti
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Compra solo i crediti che ti servono, quando ti servono.
            Nessun abbonamento, nessun impegno.
          </p>
        </div>

        {/* Credit Packs Grid */}
        {packs.length === 0 ? (
          <div className="text-center py-12">
            <Coins className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Pacchetti non disponibili
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              I pacchetti crediti non sono ancora configurati. Contatta il supporto.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {packs.map((pack, index) => {
              const Icon = getPackIcon(index)
              const gradientColor = getPackColor(index, pack.discount_percentage)
              const isPopular = pack.discount_percentage >= 30

              return (
                <div
                  key={pack.id}
                  className={`relative bg-white dark:bg-gray-800 rounded-2xl border-2 transition-all duration-300 hover:shadow-xl overflow-hidden ${
                    isPopular
                      ? 'border-blue-500 ring-4 ring-blue-100 dark:ring-blue-900'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {/* Discount Badge */}
                  {pack.discount_percentage > 0 && (
                    <div className={`absolute -top-0 -right-0 w-24 h-24 overflow-hidden`}>
                      <div className={`absolute top-4 right-[-40px] transform rotate-45 bg-gradient-to-r ${gradientColor} text-white text-xs font-bold py-1 w-32 text-center shadow-lg`}>
                        -{pack.discount_percentage}%
                      </div>
                    </div>
                  )}

                  {/* Popular Badge */}
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-xs font-medium rounded-full z-10">
                      Piu' popolare
                    </div>
                  )}

                  <div className="p-6">
                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradientColor} flex items-center justify-center mb-4 mx-auto`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>

                    {/* Name */}
                    <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
                      {pack.name}
                    </h3>

                    {/* Credits */}
                    <div className="text-center mb-4">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        {pack.credits}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 ml-2">crediti</span>
                    </div>

                    {/* Price */}
                    <div className="text-center mb-4">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {pack.price}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 ml-1">EUR</span>
                    </div>

                    {/* Price per credit */}
                    <div className="text-center mb-6">
                      <span className={`text-sm font-medium ${
                        pack.discount_percentage >= 30
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {pack.pricePerCredit} EUR/credito
                      </span>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        Nessuna scadenza
                      </li>
                      <li className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        Uso immediato
                      </li>
                      <li className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        Supporto incluso
                      </li>
                    </ul>

                    {/* CTA Button */}
                    <button
                      onClick={() => handlePurchase(pack.id)}
                      disabled={purchasing !== null}
                      className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center ${
                        isPopular
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
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

        {/* Info Section */}
        <div className="mt-16 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Perche' scegliere i Credit Packs?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mx-auto mb-3">
                <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Flessibilita' totale
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Compra solo quando ti serve, senza impegni mensili.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Risparmia di piu'
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Pacchetti piu' grandi = prezzo per credito piu' basso.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Mai in scadenza
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                I tuoi crediti non scadono mai, usali quando vuoi.
              </p>
            </div>
          </div>
        </div>

        {/* Upgrade CTA */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Usi spesso la piattaforma? Un piano mensile potrebbe convenire di piu'.
          </p>
          <Link
            href="/upgrade"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            Scopri i piani mensili
            <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  )
}
