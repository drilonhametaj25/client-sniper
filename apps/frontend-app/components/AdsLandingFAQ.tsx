// FAQ component specifico per la landing page /ads
// Domande frequenti ottimizzate per convertire gli utenti provenienti da campagne pubblicitarie
// Design accordion con risposta immediata ai dubbi più comuni

'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
  category: 'pricing' | 'quality' | 'usage' | 'support'
}

const faqData: FAQItem[] = [
  {
    question: 'Come funzionano i 2 lead gratuiti?',
    answer: 'Ti registri in 2 minuti e ricevi subito 2 lead completi senza costi. Puoi scaricare i dati, vedere i contatti e testare la qualità prima di decidere se acquistare crediti aggiuntivi.',
    category: 'usage'
  },
  {
    question: 'Cosa include ogni lead?',
    answer: 'Ogni lead include: nome azienda, sito web, email, telefono, P.IVA, indirizzo, analisi SEO completa, problemi identificati (meta tag, velocità, pixel tracking, immagini rotte), punteggio di qualità e suggerimenti per il contatto.',
    category: 'quality'
  },
  {
    question: 'Perché costa così poco rispetto a Google Ads?',
    answer: 'Non paghiamo per i click come Google Ads. I nostri algoritmi analizzano automaticamente migliaia di siti web e identificano solo quelli con problemi reali. Questo ci permette di offrire lead qualificati a partire da 0,33€ invece di 5-20€ per click.',
    category: 'pricing'
  },
  {
    question: 'Posso scegliere la zona geografica?',
    answer: 'Sì, puoi filtrare per regione, provincia e città. Il sistema ti mostrerà solo i lead nella tua area di interesse per massimizzare le possibilità di conversione.',
    category: 'usage'
  },
  {
    question: 'Come faccio a sapere se il lead è interessato?',
    answer: 'Ogni lead ha un punteggio di qualità (0-100) basato sui problemi identificati. Lead con punteggi bassi (0-40) hanno maggiori probabilità di essere interessati a miglioramenti. Includiamo anche suggerimenti per l\'approccio iniziale.',
    category: 'quality'
  },
  {
    question: 'Posso disdire quando voglio?',
    answer: 'Assolutamente sì. Non ci sono contratti o vincoli. Puoi usare i crediti acquistati quando vuoi e sospendere o riattivare il tuo piano in qualsiasi momento dal dashboard.',
    category: 'pricing'
  }
]

export default function AdsLandingFAQ() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems)
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index)
    } else {
      newOpenItems.add(index)
    }
    setOpenItems(newOpenItems)
  }

  const getCategoryColor = (category: FAQItem['category']) => {
    const colors = {
      pricing: 'text-green-600 bg-green-50',
      quality: 'text-blue-600 bg-blue-50',
      usage: 'text-purple-600 bg-purple-50',
      support: 'text-orange-600 bg-orange-50'
    }
    return colors[category] || colors.usage
  }

  const getCategoryLabel = (category: FAQItem['category']) => {
    const labels = {
      pricing: 'Prezzi',
      quality: 'Qualità',
      usage: 'Utilizzo',
      support: 'Supporto'
    }
    return labels[category] || 'Generale'
  }

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-4">
            <HelpCircle className="h-8 w-8 text-blue-600 mr-3" />
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Domande Frequenti
            </h2>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Risposte immediate ai dubbi più comuni sui nostri lead
          </p>
        </div>

        <div className="space-y-4">
          {faqData.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center flex-1">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium mr-4 ${getCategoryColor(item.category)}`}>
                    {getCategoryLabel(item.category)}
                  </div>
                  <span className="text-lg font-semibold text-gray-900 flex-1">
                    {item.question}
                  </span>
                </div>
                <div className="ml-4 flex-shrink-0">
                  {openItems.has(index) ? (
                    <ChevronUp className="h-5 w-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-600" />
                  )}
                </div>
              </button>
              
              {openItems.has(index) && (
                <div className="px-6 pb-4 border-t border-gray-100">
                  <div className="pt-4 text-gray-700 leading-relaxed">
                    {item.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA dopo le FAQ */}
        <div className="mt-16 text-center">
          <div className="bg-blue-50 rounded-2xl p-8 border border-blue-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Altre domande?
            </h3>
            <p className="text-gray-600 mb-6">
              Il nostro team è qui per aiutarti. Contattaci o inizia subito con 2 lead gratuiti.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/register"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Inizia con 2 Lead Gratuiti
              </a>
              <a
                href="mailto:support@trovami.pro"
                className="inline-flex items-center px-6 py-3 border border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
              >
                Contatta il Supporto
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
