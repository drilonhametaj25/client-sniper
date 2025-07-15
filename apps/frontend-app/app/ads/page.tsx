'use client'

// Landing page ottimizzata per le Ads - /ads
// Progettata per massimizzare la conversione con promessa chiara e CTA unica
// Include proof sociali, testimonianze e comparativa prezzi
// Utilizzata per campagne Google/Facebook Ads

import Link from 'next/link'
import { ArrowRight, Target, BarChart3, Users, CheckCircle, Zap, Shield, Globe, Star, TrendingUp } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import TestimonialCarousel from '@/components/TestimonialCarousel'
import SocialProofStats from '@/components/SocialProofStats'
import UrgencyScarcity from '@/components/UrgencyScarcity'
import AdsLandingFAQ from '@/components/AdsLandingFAQ'
import { useAdsLandingAnalytics, AdsLandingTracking } from '@/hooks/useAdsLandingAnalytics'

export default function AdsLandingPage() {
  const { user } = useAuth()
  const { trackCTAClick, trackSectionView } = useAdsLandingAnalytics()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50/30 overflow-hidden">
      
      {/* Analytics Tracking */}
      <AdsLandingTracking />
      
      {/* Schema Markup per SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LandingPage",
            "name": "TrovaMi - Trova Clienti Già Pronti a Comprare",
            "description": "Scopri clienti potenziali con problemi tecnici sui loro siti web. Lead qualificati a partire da 0,49€ - 40x meno di Google Ads",
            "url": "https://trovami.pro/ads",
            "mainEntity": {
              "@type": "Service",
              "name": "Lead Generation Automatica",
              "description": "Trova clienti già pronti a comprare i tuoi servizi",
              "provider": {
                "@type": "Organization",
                "name": "TrovaMi"
              }
            }
          })
        }}
      />

      {/* Header con Navigation minima */}
      <header className="relative z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <Target className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">TrovaMi</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <Link
                  href="/dashboard"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Dashboard
                </Link>
              ) : (              <Link
                href="/register"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                onClick={() => trackCTAClick('header')}
              >
                Inizia Gratis
              </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section con promessa chiara */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          
          {/* Badge urgency */}
          <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium mb-6">
            <Zap className="h-4 w-4 mr-2" />
            2 Lead Gratuiti - Nessuna Carta di Credito
          </div>

          {/* Headline principale */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Trova Clienti Già Pronti a
            <span className="text-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> Comprare</span>
            <br />
            i Tuoi Servizi
          </h1>

          {/* Sottotitolo con valore */}
          <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Scopri aziende con problemi tecnici sui loro siti web e convertile in clienti.
            <span className="font-semibold text-gray-900"> Lead qualificati a partire da 0,49€</span> - 40x meno di Google Ads
          </p>

          {/* CTA Principale */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link
              href="/register"
              className="inline-flex items-center px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg"
              onClick={() => trackCTAClick('hero')}
            >
              <Target className="h-5 w-5 mr-2" />
              Inizia con 2 Lead Gratuiti
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
            
            <div className="flex items-center text-gray-600 text-sm">
              <Shield className="h-4 w-4 mr-2" />
              Nessuna carta di credito richiesta
            </div>
          </div>

          {/* Social Proof Numerico */}
          <SocialProofStats />
        </div>
      </section>

      {/* Comparativa Prezzi - Sezione centrale */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Confronto Costi per Lead
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Scopri quanto puoi risparmiare rispetto alle tradizionali campagne pubblicitarie
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* TrovaMi - Highlighted */}
            <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border-2 border-blue-200 shadow-lg">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                  TrovaMi
                </div>
              </div>
              
              <div className="text-center mt-4">
                <div className="text-3xl font-bold text-blue-600 mb-2">0,49€ - 0,76€</div>
                <div className="text-gray-600 mb-4">per lead qualificato</div>
                
                <div className="flex items-center justify-center mb-4">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-600">Contatto reale profilato</span>
                </div>
                
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Analisi SEO completa
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Contatti e P.IVA
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Problemi identificati
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Pronto al contatto
                  </li>
                </ul>
              </div>
            </div>

            {/* Google Ads */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900 mb-2">Google Ads</div>
                <div className="text-3xl font-bold text-red-600 mb-2">5€ - 20€</div>
                <div className="text-gray-600 mb-4">per click (no contatto)</div>
                
                <div className="flex items-center justify-center mb-4">
                  <Target className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-sm font-medium text-red-600">Solo traffico</span>
                </div>
                
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Nessun contatto diretto</li>
                  <li>• Click da bot possibili</li>
                  <li>• Nessuna qualificazione</li>
                  <li>• Dispersione alta</li>
                </ul>
              </div>
            </div>

            {/* Facebook Ads */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900 mb-2">Facebook Ads</div>
                <div className="text-3xl font-bold text-orange-600 mb-2">2€ - 8€</div>
                <div className="text-gray-600 mb-4">per lead generico</div>
                
                <div className="flex items-center justify-center mb-4">
                  <Users className="h-5 w-5 text-orange-600 mr-2" />
                  <span className="text-sm font-medium text-orange-600">Bassa qualità</span>
                </div>
                
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Lead generici</li>
                  <li>• Poca profilazione</li>
                  <li>• Spesso non interessati</li>
                  <li>• Alta dispersione</li>
                </ul>
              </div>
            </div>

            {/* Agenzie */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900 mb-2">Agenzie Lead</div>
                <div className="text-3xl font-bold text-red-600 mb-2">10€ - 50€</div>
                <div className="text-gray-600 mb-4">per lead freddo</div>
                
                <div className="flex items-center justify-center mb-4">
                  <BarChart3 className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-sm font-medium text-red-600">Spesso rivenduti</span>
                </div>
                
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Lead freddi</li>
                  <li>• Rivenduti a più agenzie</li>
                  <li>• Qualità non garantita</li>
                  <li>• Tempi di risposta lenti</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Calcolo Risparmio */}
          <div className="mt-16 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Calcolo Risparmio
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div>
                <div className="text-lg text-gray-600 mb-2">Con Google Ads (100 lead)</div>
                <div className="text-3xl font-bold text-red-600">1.250€</div>
                <div className="text-sm text-gray-500">(12,50€ per lead medio)</div>
              </div>
              <div>
                <div className="text-lg text-gray-600 mb-2">Con TrovaMi (100 lead)</div>
                <div className="text-3xl font-bold text-green-600">62€</div>
                <div className="text-sm text-gray-500">(0,62€ per lead medio)</div>
              </div>
            </div>
            <div className="mt-6 p-4 bg-green-100 rounded-lg">
              <div className="text-xl font-bold text-green-800">
                Risparmio: 1.188€ (95% in meno!)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Esempi Lead Reali - Proof Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Esempi di Lead Reali
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Ecco alcuni esempi di lead che potresti trovare con TrovaMi
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Lead Example 1 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Globe className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-gray-900">Studio Legale Milano</h3>
                  <p className="text-sm text-gray-600">Settore: Legale</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  <span className="text-gray-600">Sito lento (4.2s caricamento)</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  <span className="text-gray-600">Meta tag mancanti</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                  <span className="text-gray-600">Nessun pixel tracking</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <div className="text-sm font-medium text-green-800">Contatto Completo</div>
                <div className="text-xs text-green-600">Email, telefono, P.IVA inclusi</div>
              </div>
              
              <div className="mt-4 text-center">
                <div className="text-2xl font-bold text-blue-600">Score: 23/100</div>
                <div className="text-sm text-gray-600">Ottimo candidato</div>
              </div>
            </div>

            {/* Lead Example 2 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-gray-900">Agenzia Viaggi Roma</h3>
                  <p className="text-sm text-gray-600">Settore: Turismo</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  <span className="text-gray-600">Immagini rotte (12 errori)</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  <span className="text-gray-600">Non mobile-friendly</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                  <span className="text-gray-600">SSL non configurato</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <div className="text-sm font-medium text-green-800">Contatto Completo</div>
                <div className="text-xs text-green-600">Email, telefono, P.IVA inclusi</div>
              </div>
              
              <div className="mt-4 text-center">
                <div className="text-2xl font-bold text-orange-600">Score: 31/100</div>
                <div className="text-sm text-gray-600">Candidato ideale</div>
              </div>
            </div>

            {/* Lead Example 3 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-gray-900">Ristorante Napoli</h3>
                  <p className="text-sm text-gray-600">Settore: Ristorazione</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  <span className="text-gray-600">Nessuna presenza social</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  <span className="text-gray-600">Menu non aggiornato</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                  <span className="text-gray-600">Prenotazioni non funzionanti</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <div className="text-sm font-medium text-green-800">Contatto Completo</div>
                <div className="text-xs text-green-600">Email, telefono, P.IVA inclusi</div>
              </div>
              
              <div className="mt-4 text-center">
                <div className="text-2xl font-bold text-red-600">Score: 18/100</div>
                <div className="text-sm text-gray-600">Urgente miglioramento</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonianze */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Cosa Dicono i Nostri Clienti
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Storie di successo di agenzie e freelancer che hanno scelto TrovaMi
            </p>
          </div>

          <TestimonialCarousel />
        </div>
      </section>

      {/* FAQ Section */}
      <AdsLandingFAQ />

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Pronto a Trovare i Tuoi Primi Clienti?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Inizia subito con 2 lead gratuiti. Nessuna carta di credito richiesta.
              Scopri perché centinaia di agenzie scelgono TrovaMi.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Link
                href="/register"
                className="inline-flex items-center px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
                onClick={() => trackCTAClick('final')}
              >
                <Target className="h-5 w-5 mr-2" />
                Inizia con 2 Lead Gratuiti
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto text-blue-100">
              <div className="flex items-center justify-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span>Setup in 2 minuti</span>
              </div>
              <div className="flex items-center justify-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span>Nessun impegno</span>
              </div>
              <div className="flex items-center justify-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span>Supporto incluso</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer minimale */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Target className="h-8 w-8 text-blue-400" />
              <span className="ml-2 text-xl font-bold">TrovaMi</span>
            </div>
            
            <div className="flex space-x-6 text-sm text-gray-400">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Termini di Servizio
              </Link>
              <Link href="/contact" className="hover:text-white transition-colors">
                Contatti
              </Link>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400 text-sm">
            <p>© 2024 TrovaMi. Tutti i diritti riservati.</p>
            <p className="mt-2">Trova clienti già pronti a comprare i tuoi servizi.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
