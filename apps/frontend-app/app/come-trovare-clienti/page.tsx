import { Metadata } from 'next'
import Link from 'next/link'
import { Target, CheckCircle, Users, BarChart3, ArrowRight } from 'lucide-react'
import LeadCostComparison from '@/components/LeadCostComparison'
import UpgradeUrgencyBanner from '@/components/UpgradeUrgencyBanner'

export const metadata: Metadata = {
  title: 'Come Trovare Clienti per la Tua Agenzia Web nel 2025 | TrovaMi',
  description: 'Scopri come trovare clienti per la tua agenzia web o attività di freelance. Strategie moderne di lead generation e prospecting automatico per web designer, SEO specialist e consulenti digitali.',
  keywords: 'come trovare clienti, agenzia web, freelancer, lead generation, prospecting, clienti web design, consulenti SEO, marketing digitale, business development',
  robots: 'index, follow',
  alternates: {
    canonical: 'https://trovami.pro/come-trovare-clienti'
  },
  openGraph: {
    title: 'Come Trovare Clienti per la Tua Agenzia Web nel 2025',
    description: 'Guida completa per trovare clienti qualificati. Strategie di lead generation per agenzie web, freelancer e consulenti digitali.',
    url: 'https://trovami.pro/come-trovare-clienti',
    type: 'article'
  }
}

export default function ComeTrovareClientiPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-sm font-medium mb-8">
              <Target className="w-4 h-4 mr-2" />
              Guida Completa 2025
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Come Trovare <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Clienti</span> per la Tua Agenzia Web
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Scopri le <strong>strategie più efficaci del 2025</strong> per trovare clienti qualificati per la tua agenzia web, 
              attività di freelance o consulenza digitale. Metodi comprovati e tecnologie innovative.
            </p>
            
            <Link 
              href="/register" 
              className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Inizia con 5 Lead Gratuiti
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Upgrade Urgency Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-t border-b border-blue-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <UpgradeUrgencyBanner variant="compact" />
        </div>
      </div>

      {/* Contenuto Articolo */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto prose prose-lg prose-blue">
          
          <h2>Il Problema: Trovare Clienti è Diventato Più Difficile</h2>
          <p>
            Nel 2025, la concorrenza tra <strong>agenzie web</strong>, <strong>freelancer</strong> e <strong>consulenti digitali</strong> 
            è più intensa che mai. I metodi tradizionali come cold calling e email a freddo hanno tassi di conversione sempre più bassi.
          </p>

          <h2>Le 5 Strategie Più Efficaci per Trovare Clienti</h2>

          <h3>1. Lead Generation Automatica</h3>
          <p>
            L'<strong>analisi automatica di siti web</strong> ti permette di identificare aziende che hanno realmente bisogno dei tuoi servizi. 
            Invece di contattare chiunque, ti concentri su prospect che hanno problemi tecnici evidenti.
          </p>
          
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 my-8">
            <p className="mb-0">
              💡 <strong>Consiglio Pro:</strong> TrovaMi analizza automaticamente migliaia di siti web e identifica quelli con problemi di SEO, 
              performance e tracking. Ogni lead ha un punteggio di priorità basato sui problemi riscontrati.
            </p>
          </div>

          <h3>2. Content Marketing Mirato</h3>
          <p>
            Crea contenuti che risolvono problemi specifici del tuo target. Articoli su "Perché il mio sito è lento" o 
            "Come migliorare il SEO locale" attirano naturalmente clienti interessati.
          </p>

          <h3>3. Networking Digitale</h3>
          <p>
            LinkedIn, community online e gruppi Facebook di imprenditori locali sono miniere d'oro per <strong>lead qualificati</strong>. 
            Partecipa alle conversazioni, offri valore genuino.
          </p>

          <h3>4. Referral e Partnership</h3>
          <p>
            I clienti soddisfatti sono la tua migliore fonte di nuovi clienti. Implementa un sistema di referral con incentivi chiari.
          </p>

          <h3>5. Local SEO e Google My Business</h3>
          <p>
            Ottimizza la tua presenza locale per intercettare ricerche come "agenzia web [tua città]" o "consulente SEO vicino a me".
          </p>

          <h2>Tecnologie Innovative per il Lead Generation</h2>
          
          <h3>Analisi Automatica di Siti Web</h3>
          <p>
            Gli strumenti moderni possono scansionare migliaia di siti web e identificare automaticamente quelli con:
          </p>
          <ul>
            <li>Problemi di velocità e performance</li>
            <li>SEO carente o assente</li>
            <li>Mancanza di pixel di tracking</li>
            <li>Design obsoleto o non mobile-friendly</li>
            <li>Problemi di sicurezza e certificati SSL</li>
          </ul>

          <h2>Metriche da Monitorare</h2>
          <p>Per ottimizzare la tua strategia di acquisizione clienti, monitora:</p>
          <ul>
            <li><strong>Costo per Lead (CPL)</strong>: Quanto spendi per ottenere un contatto qualificato</li>
            <li><strong>Tasso di Conversione</strong>: Percentuale di lead che diventano clienti</li>
            <li><strong>Lifetime Value (LTV)</strong>: Valore totale di un cliente nel tempo</li>
            <li><strong>Tempo di Acquisizione</strong>: Quanto tempo passa dal primo contatto alla firma</li>
          </ul>

          <h2>Errori Comuni da Evitare</h2>
          <ul>
            <li>Contattare aziende senza una ragione specifica</li>
            <li>Usare template generici per l'outreach</li>
            <li>Non seguire i lead in modo sistematico</li>
            <li>Concentrarsi solo sul prezzo invece che sul valore</li>
            <li>Non misurare i risultati delle diverse strategie</li>
          </ul>

          <h2>Inizia Subito con TrovaMi</h2>
          <p>
            Se vuoi <strong>automatizzare la ricerca di clienti</strong> e concentrarti su lead già qualificati, 
            TrovaMi può aiutarti. La piattaforma identifica automaticamente aziende con siti web problematici 
            e ti fornisce tutti i dati necessari per il primo contatto.
          </p>
          
        </div>
      </section>

      {/* Lead Cost Comparison */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Confronto <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Costi per Lead</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Vedi la differenza economica tra i diversi metodi di acquisizione clienti
            </p>
          </div>
          <LeadCostComparison variant="full" />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Pronto a Trovare i Tuoi Primi Lead Qualificati?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Registrati gratis e ricevi 5 lead qualificati per testare la piattaforma. 
            Nessuna carta di credito richiesta.
          </p>
          <Link 
            href="/register" 
            className="inline-flex items-center px-8 py-4 bg-white text-blue-600 text-lg font-bold rounded-2xl hover:bg-gray-100 transition-all duration-300 shadow-2xl"
          >
            Inizia Gratis Ora
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}
