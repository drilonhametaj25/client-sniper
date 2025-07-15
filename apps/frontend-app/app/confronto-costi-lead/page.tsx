'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingUp, Target, Users, CheckCircle, ArrowRight, DollarSign, Clock, Zap, Shield } from 'lucide-react'
import LeadCostComparison from '@/components/LeadCostComparison'
import UpgradeUrgencyBanner from '@/components/UpgradeUrgencyBanner'

// Componente del calcolatore interattivo
function InteractiveCalculator() {
  const [leadsMensili, setLeadsMensili] = useState(50)
  const [costoGoogleAds, setCostoGoogleAds] = useState(85)
  const [costoFacebookAds, setCostoFacebookAds] = useState(125)
  const [tassoConversione, setTassoConversione] = useState(15)
  const [valoreMedioCliente, setValoreMedioCliente] = useState(2500)

  // Calcoli automatici
  const costoTrovaMi = 2.5
  const leadConvertiti = Math.round((leadsMensili * tassoConversione) / 100)
  const costoMensileGoogleAds = leadsMensili * costoGoogleAds
  const costoMensileFacebookAds = leadsMensili * costoFacebookAds
  const costoMensileTrovaMi = leadsMensili * costoTrovaMi
  const fatturatoMensile = leadConvertiti * valoreMedioCliente

  // Risparmi
  const risparmioVsGoogle = costoMensileGoogleAds - costoMensileTrovaMi
  const risparmioVsFacebook = costoMensileFacebookAds - costoMensileTrovaMi
  const risparmioPercentualeGoogle = ((risparmioVsGoogle / costoMensileGoogleAds) * 100).toFixed(1)
  const risparmioPercentualeFacebook = ((risparmioVsFacebook / costoMensileFacebookAds) * 100).toFixed(1)

  // ROI
  const roiGoogle = ((fatturatoMensile - costoMensileGoogleAds) / costoMensileGoogleAds * 100).toFixed(1)
  const roiFacebook = ((fatturatoMensile - costoMensileFacebookAds) / costoMensileFacebookAds * 100).toFixed(1)
  const roiTrovaMi = ((fatturatoMensile - costoMensileTrovaMi) / costoMensileTrovaMi * 100).toFixed(1)

  const scenari = [
    { nome: 'Freelancer', leads: 25, google: 95, facebook: 140, conversione: 20, valore: 1800 },
    { nome: 'Piccola Agenzia', leads: 50, google: 85, facebook: 125, conversione: 15, valore: 2500 },
    { nome: 'Media Agenzia', leads: 100, google: 75, facebook: 110, conversione: 18, valore: 3200 },
    { nome: 'Grande Agenzia', leads: 200, google: 65, facebook: 95, conversione: 22, valore: 4500 }
  ]

  const applicaScenario = (scenario: typeof scenari[0]) => {
    setLeadsMensili(scenario.leads)
    setCostoGoogleAds(scenario.google)
    setCostoFacebookAds(scenario.facebook)
    setTassoConversione(scenario.conversione)
    setValoreMedioCliente(scenario.valore)
  }

  return (
    <div className="bg-white rounded-3xl p-8 shadow-2xl">
      <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        🧮 Calcolatore Risparmio Personalizzato
      </h3>
      
      {/* Scenari predefiniti */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Scenari Predefiniti:</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {scenari.map((scenario) => (
            <button
              key={scenario.nome}
              onClick={() => applicaScenario(scenario)}
              className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              {scenario.nome}
            </button>
          ))}
        </div>
      </div>

      {/* Input Parameters */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lead necessari al mese
          </label>
          <input
            type="number"
            value={leadsMensili}
            onChange={(e) => setLeadsMensili(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="1"
            max="1000"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Costo per lead Google Ads (€)
          </label>
          <input
            type="number"
            value={costoGoogleAds}
            onChange={(e) => setCostoGoogleAds(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="1"
            max="500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Costo per lead Facebook Ads (€)
          </label>
          <input
            type="number"
            value={costoFacebookAds}
            onChange={(e) => setCostoFacebookAds(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="1"
            max="500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tasso di conversione (%)
          </label>
          <input
            type="number"
            value={tassoConversione}
            onChange={(e) => setTassoConversione(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="1"
            max="100"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valore medio cliente (€)
          </label>
          <input
            type="number"
            value={valoreMedioCliente}
            onChange={(e) => setValoreMedioCliente(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="100"
            max="50000"
          />
        </div>
      </div>

      {/* Risultati del calcolo */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Google Ads */}
        <div className="bg-red-50 rounded-xl p-6 border-2 border-red-200">
          <h4 className="text-lg font-semibold text-red-700 mb-4">Google Ads</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Costo mensile:</span>
              <span className="font-bold text-red-600">€{costoMensileGoogleAds.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Lead convertiti:</span>
              <span className="font-medium">{leadConvertiti}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fatturato:</span>
              <span className="font-medium text-green-600">€{fatturatoMensile.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-gray-900 font-semibold">ROI:</span>
              <span className="font-bold text-green-600">{roiGoogle}%</span>
            </div>
          </div>
        </div>

        {/* Facebook Ads */}
        <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
          <h4 className="text-lg font-semibold text-blue-700 mb-4">Facebook Ads</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Costo mensile:</span>
              <span className="font-bold text-blue-600">€{costoMensileFacebookAds.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Lead convertiti:</span>
              <span className="font-medium">{leadConvertiti}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fatturato:</span>
              <span className="font-medium text-green-600">€{fatturatoMensile.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-gray-900 font-semibold">ROI:</span>
              <span className="font-bold text-green-600">{roiFacebook}%</span>
            </div>
          </div>
        </div>

        {/* TrovaMi */}
        <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
          <h4 className="text-lg font-semibold text-green-700 mb-4">TrovaMi</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Costo mensile:</span>
              <span className="font-bold text-green-600">€{costoMensileTrovaMi.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Lead convertiti:</span>
              <span className="font-medium">{leadConvertiti}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fatturato:</span>
              <span className="font-medium text-green-600">€{fatturatoMensile.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-gray-900 font-semibold">ROI:</span>
              <span className="font-bold text-green-600">{roiTrovaMi}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Riepilogo risparmi */}
      <div className="mt-8 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-6">
        <h4 className="text-xl font-bold text-gray-900 mb-4 text-center">
          💰 Il Tuo Risparmio Mensile
        </h4>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">vs Google Ads</div>
            <div className="text-3xl font-bold text-green-600 mb-1">
              €{risparmioVsGoogle.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">
              (-{risparmioPercentualeGoogle}%)
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">vs Facebook Ads</div>
            <div className="text-3xl font-bold text-green-600 mb-1">
              €{risparmioVsFacebook.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">
              (-{risparmioPercentualeFacebook}%)
            </div>
          </div>
        </div>
        <div className="mt-6 text-center">
          <div className="text-sm text-gray-600 mb-2">Risparmio annuale stimato:</div>
          <div className="text-4xl font-bold text-green-600">
            €{((risparmioVsGoogle + risparmioVsFacebook) / 2 * 12).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Insights automatici */}
      <div className="mt-8 bg-gray-50 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">📊 Insights Automatici</h4>
        <div className="space-y-2 text-sm">
          {parseInt(roiTrovaMi) > parseInt(roiGoogle) && (
            <div className="flex items-center text-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              TrovaMi ha un ROI superiore del {(parseInt(roiTrovaMi) - parseInt(roiGoogle)).toFixed(1)}% rispetto a Google Ads
            </div>
          )}
          {parseInt(roiTrovaMi) > parseInt(roiFacebook) && (
            <div className="flex items-center text-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              TrovaMi ha un ROI superiore del {(parseInt(roiTrovaMi) - parseInt(roiFacebook)).toFixed(1)}% rispetto a Facebook Ads
            </div>
          )}
          {risparmioVsGoogle > 10000 && (
            <div className="flex items-center text-blue-700">
              <Target className="w-4 h-4 mr-2" />
              Con questi risparmi potresti assumere un nuovo dipendente o investire in crescita
            </div>
          )}
          {leadConvertiti > 10 && (
            <div className="flex items-center text-purple-700">
              <TrendingUp className="w-4 h-4 mr-2" />
              Ottimo tasso di conversione! Stai massimizzando il valore di ogni lead
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-8 text-center">
        <Link
          href="/register"
          className="inline-flex items-center px-8 py-4 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          Inizia a Risparmiare Ora
          <ArrowRight className="ml-2 w-5 h-5" />
        </Link>
      </div>
    </div>
  )
}

// Componente principale della pagina
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

      {/* Calcolatore Interattivo */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Calcola il Tuo <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">Risparmio</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Usa il nostro calcolatore per vedere quanto potresti risparmiare con TrovaMi rispetto a Google Ads e Facebook Ads
            </p>
          </div>
          
          <InteractiveCalculator />
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

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Domande Frequenti
            </h2>
            <p className="text-xl text-gray-600">
              Risposte alle domande più comuni sui costi per lead
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Come fa TrovaMi ad avere costi così bassi?
              </h3>
              <p className="text-gray-700">
                TrovaMi automatizza completamente il processo di identificazione e qualificazione dei lead. 
                Non paghiamo per click o impression, ma identifichiamo direttamente le aziende con problemi 
                tecnici reali sui loro siti web.
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                I lead sono della stessa qualità di Google Ads?
              </h3>
              <p className="text-gray-700">
                I lead di TrovaMi sono spesso di qualità superiore perché hanno problemi tecnici 
                verificati e documentati. Sai già esattamente cosa proporre al primo contatto, 
                a differenza dei lead generici da ads.
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

      {/* Servizi Digitali PRO - NUOVA */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-emerald-100 border border-emerald-200 rounded-full text-emerald-700 text-sm font-medium mb-6">
              <Zap className="w-4 h-4 mr-2" />
              Esclusivo Account PRO
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Servizi Digitali <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Ottimizzati</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              Oltre ai lead a basso costo, <strong>gli account PRO ricevono suggerimenti automatici sui servizi digitali da offrire</strong> 
              con prezzi ottimizzati per massimizzare conversioni e profitto
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            {/* Vantaggi economici */}
            <div className="bg-white rounded-3xl p-8 shadow-xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">ROI Massimizzato</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                  <span className="text-gray-700">Costo per lead</span>
                  <span className="text-xl font-bold text-green-600">€2.50</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                  <span className="text-gray-700">Valore servizio medio</span>
                  <span className="text-xl font-bold text-blue-600">€1.800</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
                  <span className="text-gray-700">Tasso conversione</span>
                  <span className="text-xl font-bold text-purple-600">35%</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border-2 border-orange-200">
                  <span className="text-gray-900 font-semibold">ROI per lead</span>
                  <span className="text-2xl font-bold text-orange-600">25.200%</span>
                </div>
              </div>
            </div>

            {/* Esempi servizi */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Servizi Suggeriti Automaticamente</h3>
              <div className="space-y-4">
                <div className="flex items-start p-4 bg-white rounded-xl border border-gray-200">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-4">
                    <Target className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Audit SEO Tecnico</h4>
                    <p className="text-gray-600 text-sm">Per siti con meta tag mancanti</p>
                    <p className="text-green-600 font-semibold">€800-€1.500</p>
                  </div>
                </div>
                
                <div className="flex items-start p-4 bg-white rounded-xl border border-gray-200">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                    <Zap className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Ottimizzazione Performance</h4>
                    <p className="text-gray-600 text-sm">Per siti lenti (&gt;3 secondi)</p>
                    <p className="text-orange-600 font-semibold">€600-€1.200</p>
                  </div>
                </div>
                
                <div className="flex items-start p-4 bg-white rounded-xl border border-gray-200">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Compliance GDPR</h4>
                    <p className="text-gray-600 text-sm">Per siti non conformi</p>
                    <p className="text-blue-600 font-semibold">€400-€800</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-4">💰 Trasforma Lead Low-Cost in Fatturato Alto</h3>
            <p className="text-lg mb-6 text-emerald-100">
              Combina lead a €2.50 con servizi da €1.800 per il <strong>ROI più alto del mercato</strong>. 
              Il sistema suggerisce automaticamente quale servizio offrire per ogni lead specifico.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/register" 
                className="inline-flex items-center px-6 py-3 bg-white hover:bg-gray-100 text-emerald-600 font-semibold rounded-xl transition-all duration-300"
              >
                Inizia con Account PRO
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link 
                href="/digital-services" 
                className="inline-flex items-center px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-all duration-300"
              >
                Esplora Tutti i Servizi
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
