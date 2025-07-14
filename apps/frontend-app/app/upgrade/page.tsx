// Pagina per l'upgrade del piano utente
// Permette agli utenti di selezionare e passare a un piano superiore
// Integra il componente PlanSelector con Stripe Checkout

'use client'

import { useAuth } from '@/contexts/AuthContext'
import PlanSelector from '@/components/PlanSelector'
import UpgradeUrgencyBanner, { LiveStats } from '@/components/UpgradeUrgencyBanner'
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
        
        {/* Banner di urgenza per utenti free */}
        {user?.plan === 'free' && (
          <div className="mb-8">
            <UpgradeUrgencyBanner />
          </div>
        )}

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Scala il tuo business con più lead
          </h2>
          <p className="text-xl text-gray-600 mb-6">
            Piano attuale: <span className="font-semibold capitalize text-blue-600">
              {user?.plan || 'free'}
            </span>
          </p>
          <div className="bg-gray-50 rounded-lg p-4 inline-block">
            <p className="text-gray-700">
              Crediti rimanenti: <span className="font-semibold text-2xl text-blue-600">
                {user?.credits_remaining || 0}
              </span>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Sblocca più crediti per trovare più clienti
            </p>
          </div>
        </div>


        <PlanSelector 
          currentPlan={user?.plan || 'free'}
          showFree={false}
        />

        {/* Benefits Section */}
        <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Perché passare a TrovaMi Pro?
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
              💰 Calcolo del valore
            </h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">25-100</div>
                <div className="text-sm text-gray-600">Lead qualificati/mese</div>
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
                Quanto tempo risparmio rispetto alla ricerca manuale?
              </h4>
              <p className="text-gray-600">
                Con TrovaMi Pro eviti ore di ricerca manuale. Quello che prima richiedeva giorni di lavoro, 
                ora lo ottieni in pochi minuti. Più tempo per vendere, meno tempo per cercare.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="font-semibold text-gray-900 mb-2">
                Come funziona il CRM integrato?
              </h4>
              <p className="text-gray-600">
                Il piano Pro include un CRM completo per gestire i tuoi lead: puoi aggiungere note, 
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
                Quanto costa davvero acquisire un cliente?
              </h4>
              <p className="text-gray-600">
                Con TrovaMi Pro hai centinaia di lead qualificati ogni mese. Se converti anche solo 
                1 lead in cliente, hai già recuperato l'investimento. Il costo per acquisizione 
                diminuisce drasticamente.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="font-semibold text-gray-900 mb-2">
                Posso cancellare in qualsiasi momento?
              </h4>
              <p className="text-gray-600">
                Sì, puoi cancellare la tua sottoscrizione in qualsiasi momento. 
                Continuerai ad avere accesso fino alla fine del periodo di fatturazione.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
