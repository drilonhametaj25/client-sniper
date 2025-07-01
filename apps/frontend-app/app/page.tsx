'use client'

// Homepage moderna redesignata con stile Apple/Linear
// Design pulito, minimale con gradients e glassmorphism
// Integrata con la Navbar globale per evitare duplicazioni
// ⚠️ Aggiornare se si modificano contenuti o CTA

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowRight, Target, BarChart3, Users, CheckCircle, Zap, Shield, Globe } from 'lucide-react'
import NewsletterForm from '@/components/NewsletterForm'
import StructuredFAQ from '@/components/StructuredFAQ'

export default function HomePage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      
      {/* Schema Markup per SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "TrovaMi",
            "description": "Piattaforma di lead generation automatica per agenzie web e freelancer. Analisi tecnica siti web e identificazione clienti potenziali.",
            "url": "https://trovami.pro",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "EUR",
              "description": "2 lead gratuiti per iniziare"
            },
            "creator": {
              "@type": "Organization",
              "name": "TrovaMi Team"
            },
            "featureList": [
              "Lead generation automatica",
              "Analisi tecnica siti web",
              "Identificazione clienti potenziali",
              "Dashboard gestione lead",
              "Sistema crediti flessibile"
            ]
          })
        }}
      />
      
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "TrovaMi",
            "url": "https://trovami.pro",
            "logo": "https://trovami.pro/logo.png",
            "description": "Piattaforma professionale per audit digitali automatizzati. Aiutiamo agenzie web e consulenti a identificare opportunità di business attraverso analisi tecniche avanzate.",
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "customer service",
              "email": "support@trovami.pro"
            },
            "sameAs": [
              "https://linkedin.com/company/trovami",
              "https://twitter.com/trovami_pro"
            ]
          })
        }}
      />
      
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "Audit Digitale Automatizzato per Agenzie Web",
            "description": "Servizio professionale di audit digitale che identifica aziende con criticità tecniche attraverso analisi automatizzate di SEO, performance e compliance.",
            "provider": {
              "@type": "Organization",
              "name": "TrovaMi"
            },
            "areaServed": "IT",
            "serviceType": "Audit Digitale Automatizzato",
            "audience": {
              "@type": "BusinessAudience",
              "audienceType": "Agenzie Web, Consulenti Digitali, SEO Specialist, Web Agency"
            }
          })
        }}
      />

      {/* Header per utenti non loggati */}
      {!user && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">TrovaMi</span>
              </div>
              <nav className="hidden md:flex items-center space-x-8">
                <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Funzionalità
                </a>
                <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Prezzi
                </a>
                <Link href="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Accedi
                </Link>
                <Link 
                  href="/register" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  Inizia Gratis
                </Link>
              </nav>
            </div>
          </div>
        </header>
      )}

      {/* Hero Section */}
      <section className={`${user ? 'pt-24' : 'pt-32'} pb-20 px-4 sm:px-6 lg:px-8`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge di benvenuto */}
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-sm font-medium mb-8">
              <Zap className="w-4 h-4 mr-2" />
              Analisi tecnica avanzata basata su algoritmi proprietari
            </div>

            {/* Titolo principale SEO-optimized */}
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Trova Lead Qualificati
              <span className="block">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800">
                  per la Tua Agenzia
                </span>
              </span>
              <span className="block">con l'Audit Automatizzato</span>
            </h1>

            {/* Sottotitolo ottimizzato per SEO */}
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              <strong>TrovaMi</strong> esegue <strong>audit digitali automatizzati</strong> per identificare aziende con 
              <strong className="text-gray-900"> criticità tecniche sui loro siti web</strong>. La piattaforma professionale per agenzie, freelancer e consulenti digitali.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link 
                href="/register" 
                className="group inline-flex items-center justify-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Inizia con 2 Lead Gratuiti
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/tools/public-scan"
                className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Zap className="mr-2 w-5 h-5" />
                Prova Gratis (2 al giorno)
              </Link>
              <button 
                onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center px-8 py-4 bg-white hover:bg-gray-50 text-gray-900 text-lg font-semibold rounded-2xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-300"
              >
                Vedi Come Funziona
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">5000+</div>
                <div className="text-gray-600">Audit Completati</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">78+</div>
                <div className="text-gray-600">Parametri Analizzati</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">24/7</div>
                <div className="text-gray-600">Monitoraggio Attivo</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">0€</div>
                <div className="text-gray-600">Per Iniziare</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 bg-green-50 border border-green-200 rounded-full text-green-700 text-sm font-medium mb-6">
              <Shield className="w-4 h-4 mr-2" />
              Tecnologia proprietaria basata su algoritmi deterministici
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Come <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">Funziona</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Sistema di audit digitale automatizzato che analizza oltre 78 parametri tecnici per identificare opportunità di business
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {/* Feature 1 */}
            <div className="group relative">
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-gray-200/50 hover:shadow-xl transition-all duration-500 group-hover:-translate-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Ricerca Automatizzata</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Sistema di intelligence digitale che monitora directory business e fonti pubbliche per identificare aziende target
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">Business Directory</span>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">Geolocalizzazione</span>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">Targeting</span>
                </div>
              </div>
            </div>
            
            {/* Feature 2 */}
            <div className="group relative">
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-gray-200/50 hover:shadow-xl transition-all duration-500 group-hover:-translate-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Audit Digitale Completo</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Analisi multi-livello che valuta SEO tecnico, performance, sicurezza, UX e compliance GDPR in tempo reale
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm font-medium">SEO Tecnico</span>
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm font-medium">Performance</span>
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm font-medium">GDPR Check</span>
                </div>
              </div>
            </div>
            
            {/* Feature 3 */}
            <div className="group relative">
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-gray-200/50 hover:shadow-xl transition-all duration-500 group-hover:-translate-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Lead Intelligence</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Scoring proprietario che prioritizza le opportunità in base a criticità tecniche e potenziale di conversione
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium">Scoring 0-100</span>
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium">Priorità</span>
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium">Report Tecnico</span>
                </div>
              </div>
            </div>
          </div>

          {/* Demo Section */}
          <div id="demo" className="mt-24 text-center">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-12 text-white">
              <h3 className="text-3xl font-bold mb-6">Esempio di Audit Completo</h3>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-2xl mx-auto text-left">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xl font-semibold">Ristorante Da Mario</h4>
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">Score: 25/100</span>
                </div>
                <p className="text-gray-300 mb-4">📍 Milano • 🌐 damario-milano.it • ☎️ +39 02 1234567</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-red-400">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Meta tag SEO mancanti (Title, Description)
                  </div>
                  <div className="flex items-center text-red-400">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Performance critica: 4.2s di caricamento
                  </div>
                  <div className="flex items-center text-red-400">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Tracking analytics non configurato
                  </div>
                  <div className="flex items-center text-orange-400">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Cookie banner GDPR non conforme
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/20">
                  <p className="text-green-400 font-medium">💡 Opportunità ideale per: Web Agency, SEO Specialist, Consulenti Digitali</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 bg-purple-50 border border-purple-200 rounded-full text-purple-700 text-sm font-medium mb-6">
              <Target className="w-4 h-4 mr-2" />
              Scegli il piano perfetto per te
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Prezzi <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">Trasparenti</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Inizia gratis con 2 lead, poi scala quando la tua agenzia cresce
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="group relative">
              <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Target className="w-8 h-8 text-gray-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Free</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">€0</span>
                    <span className="text-gray-600 ml-2">/mese</span>
                  </div>
                  <ul className="space-y-4 mb-8 text-left">
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">2 lead qualificati gratuiti</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Dati base (nome, sito, score)</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Accesso dashboard</span>
                    </li>
                  </ul>
                  <Link 
                    href="/register" 
                    className="w-full inline-flex items-center justify-center px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
                  >
                    Inizia Gratis
                  </Link>
                </div>
              </div>
            </div>

            {/* Starter Plan */}
            <div className="group relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
                  Più Popolare
                </span>
              </div>
              <div className="bg-white rounded-3xl p-8 border-2 border-blue-500 hover:border-blue-600 transition-all duration-300 hover:shadow-xl relative">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Starter</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">€19</span>
                    <span className="text-gray-600 ml-2">/mese</span>
                  </div>
                  <ul className="space-y-4 mb-8 text-left">
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">25 lead qualificati al mese</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Dati completi + contatti</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Analisi tecnica dettagliata</span>
                    </li>

                  </ul>
                  <Link 
                    href="/register" 
                    className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Inizia Starter
                  </Link>
                </div>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="group relative">
              <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 hover:border-purple-300 transition-all duration-300 hover:shadow-lg">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Pro</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">€49</span>
                    <span className="text-gray-600 ml-2">/mese</span>
                  </div>
                  <ul className="space-y-4 mb-8 text-left">
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">100 lead qualificati al mese</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Tutti i dati disponibili</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Report personalizzati</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">API access</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Supporto prioritario</span>
                    </li>
                  </ul>
                  <Link 
                    href="/register" 
                    className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Inizia Pro
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800"></div>
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Pronto a Trovare i Tuoi 
              <span className="block">Primi Lead?</span>
            </h2>
            <p className="text-xl md:text-2xl text-blue-100 mb-12 leading-relaxed">
              Registrati ora e ricevi <strong className="text-white">2 lead qualificati</strong> completamente gratis. 
              Nessuna carta di credito richiesta.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link 
                href="/register" 
                className="group inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 text-lg font-bold rounded-2xl hover:bg-gray-100 transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1"
              >
                Inizia Subito - È Gratis
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/login" 
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-white/30 text-white text-lg font-semibold rounded-2xl hover:bg-white/10 transition-all duration-300"
              >
                Hai già un account?
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-16 pt-12 border-t border-white/20">
              <p className="text-blue-100 mb-8">Unisciti a centinaia di agenzie e freelancer che hanno già trovato clienti con TrovaMi</p>
              <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-white" />
                  <span className="text-white font-medium">100% GDPR Compliant</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-white" />
                  <span className="text-white font-medium">Dati Verificati</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-white" />
                  <span className="text-white font-medium">Aggiornamento Continuo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <StructuredFAQ className="bg-gray-50" />

      {/* Newsletter Section */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <NewsletterForm
              title="Ricevi Lead Gratuiti ogni Mese"
              description="Unisciti a oltre 500+ agenzie e freelancer che ricevono lead qualificati e strategie di acquisizione clienti direttamente nella loro inbox"
              source="homepage_cta"
              className="mx-auto"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Newsletter compatta nel footer */}
          <div className="mb-16 p-8 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl border border-white/10">
            <NewsletterForm
              title="Newsletter per Professionisti"
              description="Lead gratuiti e strategie di crescita per la tua agenzia"
              placeholder="Il tuo indirizzo email"
              buttonText="Iscriviti"
              source="footer"
              variant="compact"
              className="max-w-2xl mx-auto"
            />
          </div>

          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold">TrovaMi</span>
              </div>
              <p className="text-gray-400 text-lg leading-relaxed max-w-md">
                La piattaforma più avanzata per trovare lead qualificati attraverso l'analisi automatizzata di siti web aziendali.
              </p>
              <div className="mt-6 flex space-x-4">
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                  <span className="sr-only">Twitter</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Prodotto</h3>
              <ul className="space-y-3">
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Funzionalità</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Prezzi</a></li>
                <li><a href="#demo" className="text-gray-400 hover:text-white transition-colors">Demo</a></li>
                <li><Link href="/login" className="text-gray-400 hover:text-white transition-colors">Login</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Risorse</h3>
              <ul className="space-y-3">
                <li><Link href="/come-trovare-clienti" className="text-gray-400 hover:text-white transition-colors">Come Trovare Clienti</Link></li>
                <li><Link href="/lead-generation-agenzie" className="text-gray-400 hover:text-white transition-colors">Lead Generation Agenzie</Link></li>
                <li><Link href="/help" className="text-gray-400 hover:text-white transition-colors">Centro Assistenza</Link></li>
                <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors">Contatti</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 mb-4 md:mb-0">
              <p className="text-gray-400">
                &copy; 2025 TrovaMi. Tutti i diritti riservati.
              </p>
              <div className="flex items-center space-x-4 text-sm">
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <span className="text-gray-600">•</span>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                  Termini e Condizioni
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <span>Made in Italy 🇮🇹</span>
              <span>•</span>
              <span>Powered by Drilon Hametaj</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
