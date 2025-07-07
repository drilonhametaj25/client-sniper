/**
 * Componente FAQ con markup schema.org per rich snippets
 * Utilizzato da: homepage e pagine di servizio per SEO
 * Gestito da: team marketing per ottimizzazione ricerche
 */

'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface FAQ {
  question: string
  answer: string
}

const faqs: FAQ[] = [
  {
    question: "Come funziona l'audit digitale automatizzato di TrovaMi?",
    answer: "Il nostro sistema analizza automaticamente oltre 70 parametri tecnici di un sito web, inclusi SEO, performance, GDPR compliance, sicurezza e presenza di tracking systems. Genera un punteggio da 0 a 100 e fornisce raccomandazioni specifiche per ogni problema identificato."
  },
  {
    question: "Quanto costa utilizzare TrovaMi per trovare clienti?",
    answer: "Offriamo piani flessibili: 2 analisi gratuite al giorno per utenti non registrati, Piano Starter a €19/mese per 25 lead mensili, Piano Pro a €49/mese per 100 lead con funzionalità avanzate come CRM integrato, gestione lead completa con note e follow-up, upload allegati, API access e lead scoring avanzato."
  },
  {
    question: "Come posso trovare clienti potenziali con TrovaMi?",
    answer: "Utilizzi i nostri strumenti di audit per identificare siti web con problemi tecnici significativi (SEO mancante, performance lente, problemi GDPR). Poi contatti i proprietari proponendo servizi di consulenza digitale, web design, SEO o marketing basati sui problemi specifici identificati dall'analisi."
  },
  {
    question: "Che tipo di problemi tecnici identifica TrovaMi nei siti web?",
    answer: "Identifichiamo oltre 70 tipologie di problemi: meta tag SEO mancanti, performance di caricamento lente, mancanza di SSL, problemi di responsive design, assenza di tracking analytics, non conformità GDPR, errori di indicizzazione e molto altro."
  },
  {
    question: "Come funziona il CRM integrato nel Piano Pro?",
    answer: "Il Piano Pro include un CRM completo per gestire i tuoi lead: puoi aggiungere note personalizzate, impostare promemoria per follow-up, caricare documenti e allegati, tracciare la cronologia delle attività e organizzare i contatti per stato (da contattare, in negoziazione, chiuso positivo/negativo, ecc.). Tutto integrato direttamente nella piattaforma."
  },
  {
    question: "TrovaMi è adatto per freelancer e piccole agenzie?",
    answer: "Assolutamente sì! Il nostro piano Starter a €19/mese è perfetto per freelancer, mentre il Piano Pro a €49/mese con CRM integrato è ideale per agenzie che vogliono gestire professionalmente i loro lead e clienti potenziali."
  },
  {
    question: "Quanto tempo serve per vedere i primi risultati?",
    answer: "Puoi iniziare immediatamente con 2 analisi gratuite. La maggior parte dei nostri utenti trova i primi clienti potenziali entro la prima settimana di utilizzo sistematico della piattaforma."
  }
]

interface StructuredFAQProps {
  showTitle?: boolean
  className?: string
}

export default function StructuredFAQ({ showTitle = true, className = "" }: StructuredFAQProps) {
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

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  }

  return (
    <>
      {/* Schema.org FAQ markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      
      <section className={`py-16 ${className}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {showTitle && (
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Domande Frequenti
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Tutto quello che devi sapere su TrovaMi e la lead generation automatica
              </p>
            </div>
          )}
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  aria-expanded={openItems.has(index)}
                >
                  <h3 className="font-semibold text-lg text-gray-900 pr-4">
                    {faq.question}
                  </h3>
                  {openItems.has(index) ? (
                    <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  )}
                </button>
                
                {openItems.has(index) && (
                  <div className="px-6 pb-5">
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">
              Non trovi la risposta che cerchi?
            </p>
            <a
              href="/contact"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Contattaci
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
