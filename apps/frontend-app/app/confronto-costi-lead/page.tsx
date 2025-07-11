import { Metadata } from 'next'
import Link from 'next/link'
import { TrendingUp, Target, Users, CheckCircle, ArrowRight, DollarSign, Clock, Zap } from 'lucide-react'
import LeadCostComparison from '@/components/LeadCostComparison'
import UpgradeUrgencyBanner from '@/components/UpgradeUrgencyBanner'

export const metadata: Metadata = {
  title: 'Confronto Costi per Lead: TrovaMi vs Google Ads vs Facebook Ads | TrovaMi',
  description: 'Analisi dettagliata dei costi per lead tra TrovaMi, Google Ads, Facebook Ads e agenzie tradizionali. Scopri come risparmiare fino al 90% con lead generation automatica.',
  keywords: 'costi per lead, lead generation economica, google ads vs facebook ads, confronto costi marketing, lead generation automatica, roi marketing digitale, acquisizione clienti',
  robots: 'index, follow',
  alternates: {
    canonical: 'https://trovami.pro/confronto-costi-lead'
  },
  openGraph: {
    title: 'Confronto Costi per Lead: TrovaMi vs Competitori 2025',
    description: 'Analisi completa dei costi per lead. Scopri come TrovaMi riduce i costi di acquisizione clienti del 90% rispetto a Google Ads e Facebook Ads.',
    url: 'https://trovami.pro/confronto-costi-lead',
    type: 'article',
    images: [
      {
        url: 'https://trovami.pro/images/confronto-costi-lead-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Confronto Costi per Lead - TrovaMi vs Competitori'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Confronto Costi per Lead: TrovaMi vs Competitori',
    description: 'Scopri come ridurre i costi di acquisizione clienti del 90% con la lead generation automatica.',
    images: ['https://trovami.pro/images/confronto-costi-lead-og.jpg']
  }
}

export default function ConfrontoCostiLeadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      
      {/* Schema Markup per SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "Confronto Costi per Lead: TrovaMi vs Google Ads vs Facebook Ads 2025",
            "description": "Analisi dettagliata dei costi per lead tra diverse piattaforme di marketing digitale. Scopri come ridurre i costi di acquisizione clienti.",
            "image": "https://trovami.pro/images/confronto-costi-lead-og.jpg",
            "datePublished": "2025-01-11",
            "dateModified": "2025-01-11",
            "author": {
              "@type": "Organization",
              "name": "TrovaMi Team"
            },
            "publisher": {
              "@type": "Organization",
              "name": "TrovaMi",
              "logo": {
                "@type": "ImageObject",
                "url": "https://trovami.pro/logo.png"
              }
            },
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": "https://trovami.pro/confronto-costi-lead"
            }
          })
        }}
      />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-green-50 border border-green-200 rounded-full text-green-700 text-sm font-medium mb-8">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analisi Costi 2025
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Confronto <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">Costi per Lead</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
              <strong>Analisi dettagliata dei costi</strong> per acquisire lead qualificati tra TrovaMi, Google Ads, Facebook Ads e agenzie tradizionali. 
              Scopri come <strong>risparmiare fino al 90%</strong> sui costi di acquisizione clienti.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/register" 
                className="inline-flex items-center px-8 py-4 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Prova TrovaMi Gratis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link 
                href="#confronto-dettagliato" 
                className="inline-flex items-center px-8 py-4 bg-white hover:bg-gray-50 text-gray-900 text-lg font-semibold rounded-2xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-300"
              >
                Vedi il Confronto
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Upgrade Urgency Banner */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border-t border-b border-green-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <UpgradeUrgencyBanner variant="full" />
        </div>
      </div>

      {/* Statistiche Shock */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              La Verità sui <span className="text-red-600">Costi di Acquisizione</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Mentre i costi pubblicitari continuano a salire, le aziende pagano sempre di più per lead di qualità sempre minore
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center p-8 bg-red-50 rounded-2xl border-2 border-red-200">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-4xl font-bold text-red-600 mb-2">+127%</div>
              <h3 className="text-lg font-semibold mb-2">Aumento CPC Google Ads</h3>
              <p className="text-gray-600 text-sm">Negli ultimi 3 anni nel settore web design</p>
            </div>
            
            <div className="text-center p-8 bg-orange-50 rounded-2xl border-2 border-orange-200">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-4xl font-bold text-orange-600 mb-2">€125</div>
              <h3 className="text-lg font-semibold mb-2">Costo Medio per Lead</h3>
              <p className="text-gray-600 text-sm">Facebook Ads settore B2B tech</p>
            </div>
            
            <div className="text-center p-8 bg-yellow-50 rounded-2xl border-2 border-yellow-200">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="text-4xl font-bold text-yellow-600 mb-2">156h</div>
              <h3 className="text-lg font-semibold mb-2">Tempo Medio Setup</h3>
              <p className="text-gray-600 text-sm">Per una campagna ads efficace</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-red-100 to-orange-100 rounded-2xl p-8 border-2 border-red-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              ⚠️ Il Problema delle Piattaforme Tradizionali
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Google Ads</h4>
                <ul className="space-y-1 text-gray-700">
                  <li>• Costi sempre in aumento</li>
                  <li>• Competizione aggressiva</li>
                  <li>• Lead spesso non qualificati</li>
                  <li>• Richiede gestione costante</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Facebook Ads</h4>
                <ul className="space-y-1 text-gray-700">
                  <li>• Targeting sempre meno preciso</li>
                  <li>• Costi in crescita del 89%</li>
                  <li>• Blocco frequente account</li>
                  <li>• Conversioni B2B limitate</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Confronto Dettagliato */}
      <section id="confronto-dettagliato" className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Confronto <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">Completo</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Analisi dettagliata dei costi, qualità e ROI di ogni piattaforma di lead generation
            </p>
          </div>
          
          <LeadCostComparison variant="full" />
        </div>
      </section>

      {/* Vantaggi TrovaMi */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Perché <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">TrovaMi</span> è Diverso
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Non siamo una piattaforma pubblicitaria. Siamo un sistema di intelligence che trova opportunità reali.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Lead Pre-Qualificati</h3>
              <p className="text-gray-700">
                Ogni lead ha problemi tecnici verificati sul sito web. Non sprechi tempo con prospect non interessati.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 border border-green-200">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Costi Fissi</h3>
              <p className="text-gray-700">
                Paghi una tariffa mensile fissa, non per click o impression. Prevedibilità totale del budget.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 border border-purple-200">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Setup Immediato</h3>
              <p className="text-gray-700">
                Non serve creare campagne, keyword research o A/B test. Accedi e trova subito i tuoi lead.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-8 border border-orange-200">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Targeting Perfetto</h3>
              <p className="text-gray-700">
                Identifichiamo aziende che hanno esattamente i problemi che tu risolvi. Matching automatico.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-8 border border-red-200">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Qualità Garantita</h3>
              <p className="text-gray-700">
                Ogni lead ha un punteggio di priorità basato sui problemi riscontrati. Focus sui migliori.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-8 border border-teal-200">
              <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Tempo Risparmiato</h3>
              <p className="text-gray-700">
                Niente ricerca manuale, cold calling o prospecting. Ricevi lead pronti all'uso.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Case Study */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Case Study: <span className="text-green-600">-87% Costi di Acquisizione</span>
            </h2>
            <p className="text-xl text-gray-600">
              Come Web Agency Milano ha ridotto i costi per lead da €150 a €19
            </p>
          </div>
          
          <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-xl">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Prima (Google Ads)</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                    <span>€150 costo per lead</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                    <span>12% tasso di conversione</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                    <span>20h/settimana gestione</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                    <span>3 clienti acquisiti/mese</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Dopo (TrovaMi)</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span>€19 costo per lead</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span>34% tasso di conversione</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span>2h/settimana gestione</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span>11 clienti acquisiti/mese</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mt-8 p-6 bg-green-50 rounded-2xl border border-green-200">
              <blockquote className="text-lg text-gray-700 italic mb-4">
                "TrovaMi ha trasformato completamente il nostro approccio al business development. 
                Non solo spendiamo molto meno per lead, ma la qualità è incredibilmente superiore. 
                Ogni contatto che riceviamo ha problemi reali che possiamo risolvere."
              </blockquote>
              <div className="font-semibold text-gray-900">— Alessandro M., CEO Web Agency Milano</div>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Calcola il Tuo <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">Risparmio</span>
            </h2>
            <p className="text-xl text-gray-600">
              Stima quanto potresti risparmiare passando a TrovaMi
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8 border-2 border-blue-200">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Il Tuo Scenario Attuale</h3>
                <div className="space-y-4">
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Budget mensile attuale</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="es. 2000"
                    />
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lead mensili attuali</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="es. 15"
                    />
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tasso di conversione (%)</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="es. 8"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Con TrovaMi</h3>
                <div className="space-y-4">
                  <div className="bg-green-100 rounded-xl p-4 border border-green-200">
                    <div className="text-sm font-medium text-green-800 mb-1">Costo mensile</div>
                    <div className="text-2xl font-bold text-green-600">€99/mese</div>
                  </div>
                  <div className="bg-green-100 rounded-xl p-4 border border-green-200">
                    <div className="text-sm font-medium text-green-800 mb-1">Lead mensili</div>
                    <div className="text-2xl font-bold text-green-600">100 lead</div>
                  </div>
                  <div className="bg-green-100 rounded-xl p-4 border border-green-200">
                    <div className="text-sm font-medium text-green-800 mb-1">Tasso di conversione</div>
                    <div className="text-2xl font-bold text-green-600">25-35%</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 p-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl text-white text-center">
              <div className="text-3xl font-bold mb-2">Risparmio Stimato: €1,901/mese</div>
              <div className="text-lg opacity-90">€22,812 all'anno + tempo risparmiato</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Domande <span className="text-blue-600">Frequenti</span>
            </h2>
          </div>
          
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Come fa TrovaMi ad essere così economico?
              </h3>
              <p className="text-gray-700">
                TrovaMi non è una piattaforma pubblicitaria. Analizziamo automaticamente siti web esistenti per identificare problemi tecnici, 
                eliminando i costi di intermediazione tipici delle ads. Il nostro sistema è completamente automatizzato.
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                I lead di TrovaMi sono davvero qualificati?
              </h3>
              <p className="text-gray-700">
                Sì, ogni lead ha problemi tecnici verificati sul sito web (SEO, performance, tracking, etc.). 
                Non sono contatti generici, ma aziende che hanno bisogno specifico dei tuoi servizi.
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Posso usare TrovaMi insieme a Google Ads?
              </h3>
              <p className="text-gray-700">
                Assolutamente! Molti clienti usano TrovaMi come fonte primaria per ridurre i costi, 
                mantenendo le ads per specifiche keyword ad alto valore. È la strategia più efficace.
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Quanto tempo serve per vedere risultati?
              </h3>
              <p className="text-gray-700">
                Immediato! Accedi alla dashboard e trovi subito i tuoi primi lead. 
                Nessun setup, nessuna approvazione account, nessuna attesa.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Finale */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Pronto a Ridurre i Costi del 90%?
          </h2>
          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            Registrati gratis e ricevi 2 lead qualificati per testare la differenza. 
            Nessuna carta di credito richiesta.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/register" 
              className="inline-flex items-center px-8 py-4 bg-white text-green-600 text-lg font-bold rounded-2xl hover:bg-gray-100 transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1"
            >
              Inizia Gratis Ora
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link 
              href="/lead-generation-agenzie" 
              className="inline-flex items-center px-8 py-4 border-2 border-white/30 text-white text-lg font-semibold rounded-2xl hover:bg-white/10 transition-all duration-300"
            >
              Scopri di Più
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
