/**
 * Pagina prezzi pubblica - TrovaMi
 * Unica pagina prezzi accessibile senza account: hero, piani dal DB
 * (via PublicPricingSection -> /api/plans/public) e FAQ oneste.
 * Chiamata da: AccountStatusBar, UnlockConfirmModal, link interni a /pricing
 */

import Link from 'next/link'
import { ArrowRight, Wrench } from 'lucide-react'
import PublicPricingSection from '@/components/pricing/PublicPricingSection'

const FAQ_ITEMS = [
  {
    question: 'Cosa è un credito?',
    answer:
      '1 credito = 1 lead sbloccato. Sbloccando un lead vedi i dati completi dell\'azienda: contatti, sito web e analisi tecnica dei problemi trovati. Un lead sbloccato resta tuo per sempre, senza consumare altri crediti.',
  },
  {
    question: 'Posso disdire quando voglio?',
    answer:
      'Sì. Puoi annullare l\'abbonamento in qualsiasi momento dalle impostazioni del tuo account. Continuerai ad avere accesso fino alla fine del periodo già pagato, senza costi aggiuntivi.',
  },
  {
    question: 'Che differenza c\'è tra abbonamento e pacchetti crediti?',
    answer:
      'L\'abbonamento ricarica i crediti ogni mese al prezzo più conveniente. I pacchetti crediti sono acquisti una tantum: li compri solo quando ti servono e non scadono mai. Puoi anche combinarli.',
  },
  {
    question: 'Il primo sblocco è gratis sui piani a pagamento?',
    answer:
      'Sì. Sui piani a pagamento il primo lead che sblocchi non consuma crediti: è incluso per farti valutare subito la qualità dei dati.',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero */}
      <section className="pt-16 pb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Prezzi semplici e trasparenti
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            1 credito = 1 lead sbloccato. Nessun costo nascosto.
          </p>
        </div>
      </section>

      {/* Piani dal database */}
      <PublicPricingSection showTitle={false} />

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white text-center mb-10">
            Domande frequenti
          </h2>
          <div className="space-y-6">
            {FAQ_ITEMS.map((item) => (
              <div
                key={item.question}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {item.question}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA finale */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Non sei ancora sicuro?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Registrati gratis e sblocca il tuo primo lead di prova, oppure prova i nostri
            strumenti gratuiti di analisi senza creare un account.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              Inizia gratis
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="/tools"
              className="inline-flex items-center justify-center px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Wrench className="mr-2 w-5 h-5" />
              Prova i tool gratuiti
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
