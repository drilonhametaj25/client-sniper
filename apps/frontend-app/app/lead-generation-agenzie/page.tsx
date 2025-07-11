import { Metadata } from 'next'
import Link from 'next/link'
import { Target, BarChart3, Users, Zap, ArrowRight, CheckCircle } from 'lucide-react'
import LeadCostComparison from '@/components/LeadCostComparison'
import UpgradeUrgencyBanner from '@/components/UpgradeUrgencyBanner'

export const metadata: Metadata = {
  title: 'Lead Generation per Agenzie Web: Strategie e Strumenti 2025 | TrovaMi',
  description: 'Scopri come implementare un sistema di lead generation efficace per la tua agenzia web. Strumenti automatici, strategie comprovate e case study per agenzie digitali.',
  keywords: 'lead generation agenzia web, lead generation automatica, strumenti lead generation, agenzia digitale, prospecting automatico, clienti agenzia web, business development',
  robots: 'index, follow',
  alternates: {
    canonical: 'https://trovami.pro/lead-generation-agenzie'
  },
  openGraph: {
    title: 'Lead Generation per Agenzie Web: Guida Completa 2025',
    description: 'Sistema completo di lead generation per agenzie web. Automatizza la ricerca clienti e scala il tuo business.',
    url: 'https://trovami.pro/lead-generation-agenzie',
    type: 'article'
  }
}

export default function LeadGenerationAgenzie() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-purple-50 border border-purple-200 rounded-full text-purple-700 text-sm font-medium mb-8">
              <Users className="w-4 h-4 mr-2" />
              Per Agenzie Web & Digital
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Lead Generation per <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">Agenzie Web</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Implementa un <strong>sistema di lead generation automatico</strong> per la tua agenzia web. 
              Trova clienti qualificati, scala il business e aumenta i ricavi con strategie comprovate.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/register" 
                className="inline-flex items-center px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Prova TrovaMi Gratis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link 
                href="/confronto-costi-lead" 
                className="inline-flex items-center px-8 py-4 bg-white hover:bg-gray-50 text-gray-900 text-lg font-semibold rounded-2xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-300"
              >
                Confronta i Costi
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Upgrade Urgency Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-t border-b border-purple-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <UpgradeUrgencyBanner variant="compact" />
        </div>
      </div>

      {/* Problemi delle Agenzie */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Le Sfide del <span className="text-purple-600">Lead Generation</span> per Agenzie
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-red-50 rounded-2xl">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold mb-4">Difficoltà a Scalare</h3>
              <p className="text-gray-600">
                I metodi tradizionali (referral, networking) non sono scalabili. 
                Difficile crescere oltre una certa dimensione.
              </p>
            </div>
            
            <div className="text-center p-8 bg-orange-50 rounded-2xl">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold mb-4">Lead Non Qualificati</h3>
              <p className="text-gray-600">
                Molti contatti non hanno budget, autorità decisionale o reale necessità dei servizi.
              </p>
            </div>
            
            <div className="text-center p-8 bg-yellow-50 rounded-2xl">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold mb-4">Tempo & Risorse</h3>
              <p className="text-gray-600">
                Il team passa troppo tempo a cercare clienti invece di lavorare sui progetti.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* La Soluzione */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">
              Il Sistema di <span className="text-green-600">Lead Generation Automatico</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              TrovaMi rivoluziona il way le agenzie trovano clienti, automatizzando l'identificazione 
              di aziende con reali problemi tecnici sui loro siti web.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold mb-6">Come Funziona per le Agenzie</h3>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1 mr-4">
                    <span className="text-green-600 font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2">Analisi Automatica Massiva</h4>
                    <p className="text-gray-600">
                      La piattaforma scansiona migliaia di siti web locali identificando problemi tecnici, 
                      SEO carente, performance scadenti.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1 mr-4">
                    <span className="text-green-600 font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2">Qualificazione Intelligente</h4>
                    <p className="text-gray-600">
                      Ogni lead ha un punteggio basato sulla gravità dei problemi. 
                      Ti concentri solo sui prospect più promettenti.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1 mr-4">
                    <span className="text-green-600 font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2">Outreach Personalizzato</h4>
                    <p className="text-gray-600">
                      Con dati specifici sui problemi, puoi creare proposte mirate e 
                      dimostrare valore fin dal primo contatto.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl p-8 text-white">
              <h4 className="text-2xl font-bold mb-6">Risultati Tipici per Agenzie</h4>
              <div className="space-y-4">
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 mr-3" />
                  <span>300% aumento lead qualificati</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 mr-3" />
                  <span>70% riduzione tempo prospecting</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 mr-3" />
                  <span>50% migliore tasso conversione</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 mr-3" />
                  <span>ROI 800% primo anno</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Case Study */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-6">Case Study: Agenzia Web Milano</h2>
            <p className="text-xl text-gray-600">
              Come un'agenzia di 5 persone ha raddoppiato il fatturato in 6 mesi
            </p>
          </div>
          
          <div className="bg-white rounded-3xl p-8 shadow-lg">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4 text-red-600">Prima di TrovaMi</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• 2-3 lead/mese da referral</li>
                  <li>• 20% tasso di conversione</li>
                  <li>• 60h/mese per prospecting</li>
                  <li>• Fatturato: €15k/mese</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-bold mb-4 text-green-600">Dopo TrovaMi</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• 25-30 lead/mese qualificati</li>
                  <li>• 45% tasso di conversione</li>
                  <li>• 5h/mese per prospecting</li>
                  <li>• Fatturato: €32k/mese</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-8 p-6 bg-blue-50 rounded-2xl">
              <blockquote className="text-lg italic text-gray-700">
                "TrovaMi ha completamente trasformato il nostro business. Invece di sperare che arrivino clienti, 
                ora abbiamo un flusso costante di lead qualificati. Il team può concentrarsi su quello che sa fare meglio: 
                creare siti web straordinari."
              </blockquote>
              <div className="mt-4 font-semibold">— Marco R., Founder WebStudio Milano</div>
            </div>
          </div>
        </div>
      </section>

      {/* Lead Cost Comparison */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Confronta i <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">Costi per Lead</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Vedi quanto la tua agenzia può risparmiare con TrovaMi rispetto ai metodi tradizionali
            </p>
          </div>
          <LeadCostComparison variant="full" />
        </div>
      </section>

      {/* CTA Finale */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Scala la Tua Agenzia con Lead Generation Automatica
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Unisciti a centinaia di agenzie che hanno già trasformato il loro business development. 
            Inizia con 2 lead gratuiti e vedi la differenza.
          </p>
          <Link 
            href="/register" 
            className="inline-flex items-center px-8 py-4 bg-white text-purple-600 text-lg font-bold rounded-2xl hover:bg-gray-100 transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1"
          >
            Trasforma la Tua Agenzia Ora
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}
