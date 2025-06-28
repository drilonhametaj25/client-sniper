// Pagina per l'upgrade del piano utente
// Permette agli utenti di selezionare e passare a un piano superiore
// Integra il componente PlanSelector con Stripe Checkout

'use client'

import { useAuth } from '@/contexts/AuthContext'
import PlanSelector from '@/components/PlanSelector'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function UpgradePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

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
              <h1 className="text-2xl font-bold text-gray-900">TrovaMi</h1>
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
        <div className="text-center mb-8">
          <h2 className="text-xl text-gray-600 mb-2">
            Piano attuale: <span className="font-semibold capitalize text-gray-900">
              {user?.plan || 'free'}
            </span>
          </h2>
          <p className="text-gray-600">
            Crediti rimanenti: <span className="font-semibold">
              {user?.credits_remaining || 0}
            </span>
          </p>
        </div>

        <PlanSelector 
          currentPlan={user?.plan || 'free'}
          showFree={false}
        />

        {/* Benefits Section */}
        <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Perché scegliere TrovaMi Pro?
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Analisi Automatica
              </h4>
              <p className="text-gray-600">
                Il nostro sistema analizza automaticamente migliaia di siti web per trovare quelli con problemi tecnici
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Lead Qualificati
              </h4>
              <p className="text-gray-600">
                Ogni lead include dettagli tecnici specifici e problemi identificati per facilitare il tuo approccio
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Export & Filtri
              </h4>
              <p className="text-gray-600">
                Esporta i dati in CSV e usa filtri avanzati per trovare esattamente quello che cerchi
              </p>
            </div>
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
                Posso cancellare in qualsiasi momento?
              </h4>
              <p className="text-gray-600">
                Sì, puoi cancellare la tua sottoscrizione in qualsiasi momento. Continuerai ad avere accesso fino alla fine del periodo di fatturazione.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="font-semibold text-gray-900 mb-2">
                I crediti si accumulano?
              </h4>
              <p className="text-gray-600">
                No, i crediti si rinnovano ogni mese. Se non li usi, non si accumulano al mese successivo.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="font-semibold text-gray-900 mb-2">
                Che tipo di lead ottengo?
              </h4>
              <p className="text-gray-600">
                Ottieni aziende con siti web che hanno problemi tecnici specifici: SEO scadente, performance lente, problemi di sicurezza, design obsoleto, ecc.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
