/**
 * Pagina prezzi pubblica - TrovaMi
 * Unica pagina prezzi accessibile senza account: hero, piani dal DB
 * (via PublicPricingSection -> /api/plans/public) e FAQ oneste.
 * Chiamata da: AccountStatusBar, UnlockConfirmModal, link interni a /pricing
 *
 * Presentazione: token di DESIGN.md. Il soggetto della pagina sono i piani:
 * l'hero e' una riga sola e le FAQ sono testo su hairline, non una griglia
 * di scatole che compete con le card dei piani.
 */

import { ArrowRight } from 'lucide-react'
import PublicPricingSection from '@/components/pricing/PublicPricingSection'
import LinkButton from '@/components/ui/LinkButton'

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
    <div className="min-h-screen bg-surface">
      {/* Hero: una riga, poi si passa subito ai piani */}
      <section className="px-4 pb-2 pt-24 sm:px-6 sm:pt-28 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h1 className="text-title font-semibold text-content sm:text-display">
              Un credito, un lead
            </h1>
            <p className="mt-4 text-body-lg text-content-muted">
              Paghi i contatti che sblocchi, non le ricerche. Nessun costo nascosto.
            </p>
          </div>
        </div>
      </section>

      {/* Piani dal database (le classi di padding sono in coda: sovrascrivono py-16) */}
      <PublicPricingSection showTitle={false} className="pt-10 sm:pt-12" />

      {/* Domande frequenti */}
      <section className="border-t border-edge px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-title font-semibold text-content">Domande frequenti</h2>

          <dl className="mt-8 max-w-3xl">
            {FAQ_ITEMS.map((item) => (
              <div key={item.question} className="border-t border-edge py-6">
                <dt className="text-heading font-semibold text-content">{item.question}</dt>
                <dd className="mt-2 text-body text-content-muted">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Chiusura */}
      <section className="border-t border-edge px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-2xl text-title font-semibold text-content">
            Vuoi prima vedere com’è fatto un lead?
          </h2>
          <p className="mt-3 max-w-2xl text-body-lg text-content-muted">
            Con l’account gratuito hai un credito di prova. Oppure analizza un sito
            qualsiasi con i tool pubblici, senza registrarti.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/register" size="lg" icon={<ArrowRight />}>
              Crea un account gratuito
            </LinkButton>
            <LinkButton href="/tools" variant="secondary" size="lg">
              Prova i tool gratuiti
            </LinkButton>
          </div>
        </div>
      </section>
    </div>
  )
}
