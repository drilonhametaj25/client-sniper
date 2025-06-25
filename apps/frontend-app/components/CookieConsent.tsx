/**
 * Componente Cookie Consent Banner per GDPR
 * Usato per: Gestire consensi utente per cookie e tracking
 * Chiamato da: Layout principale, caricato su tutte le pagine
 */

'use client'

import { useState, useEffect } from 'react'
import Button from './ui/Button'

// Estendi l'interfaccia Window per includere script di tracking
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    dataLayer?: any[]
    fbq?: any
  }
}

interface ConsentPreferences {
  essential: boolean
  functional: boolean
  analytics: boolean
  marketing: boolean
}

interface CookieConsentProps {
  onConsentChange?: (consents: ConsentPreferences) => void
}

export default function CookieConsent({ onConsentChange }: CookieConsentProps) {
  const [showBanner, setShowBanner] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [consents, setConsents] = useState<ConsentPreferences>({
    essential: true, // sempre attivi
    functional: false,
    analytics: false,
    marketing: false
  })

  useEffect(() => {
    // Controlla se l'utente ha già dato consensi
    const savedConsents = localStorage.getItem('clientsniper-cookie-consents')
    if (!savedConsents) {
      setShowBanner(true)
    } else {
      try {
        const parsed = JSON.parse(savedConsents)
        setConsents(parsed)
        // Applica i consensi salvati
        applyCookieConsents(parsed)
      } catch (error) {
        console.error('Errore parsing consensi salvati:', error)
        setShowBanner(true)
      }
    }
  }, [])

  const applyCookieConsents = (preferences: ConsentPreferences) => {
    // Applica o rimuovi script in base ai consensi

    // Google Analytics (esempio)
    if (preferences.analytics) {
      loadGoogleAnalytics()
    } else {
      removeGoogleAnalytics()
    }

    // Facebook Pixel (esempio)
    if (preferences.marketing) {
      loadFacebookPixel()
    } else {
      removeFacebookPixel()
    }

    // Altri script di tracking...
  }

  const loadGoogleAnalytics = () => {
    if (typeof window !== 'undefined' && !window.gtag) {
      const script = document.createElement('script')
      script.async = true
      script.src = 'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID'
      document.head.appendChild(script)

      window.dataLayer = window.dataLayer || []
      window.gtag = function() {
        window.dataLayer?.push(arguments)
      }
      window.gtag('js', new Date())
      window.gtag('config', 'GA_MEASUREMENT_ID')
    }
  }

  const removeGoogleAnalytics = () => {
    // Rimuovi script e dati GA
    const scripts = document.querySelectorAll('script[src*="googletagmanager"]')
    scripts.forEach(script => script.remove())
    
    // Pulisci localStorage/sessionStorage GA
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('_ga')) {
        localStorage.removeItem(key)
      }
    })
  }

  const loadFacebookPixel = () => {
    if (typeof window !== 'undefined' && !window.fbq) {
      window.fbq = function() {
        window.fbq.callMethod ? 
          window.fbq.callMethod.apply(window.fbq, arguments) : 
          window.fbq.queue.push(arguments)
      }
      window.fbq.push = window.fbq
      window.fbq.loaded = true
      window.fbq.version = '2.0'
      window.fbq.queue = []
      
      const script = document.createElement('script')
      script.async = true
      script.src = 'https://connect.facebook.net/en_US/fbevents.js'
      document.head.appendChild(script)
      
      window.fbq('init', 'YOUR_PIXEL_ID')
      window.fbq('track', 'PageView')
    }
  }

  const removeFacebookPixel = () => {
    const scripts = document.querySelectorAll('script[src*="fbevents"]')
    scripts.forEach(script => script.remove())
    if (window.fbq) {
      delete window.fbq
    }
  }

  const saveConsents = async (preferences: ConsentPreferences) => {
    // Salva in localStorage
    localStorage.setItem('clientsniper-cookie-consents', JSON.stringify(preferences))
    localStorage.setItem('clientsniper-consent-date', new Date().toISOString())

    // Invia al server per tracking GDPR
    try {
      await fetch('/api/gdpr/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consents: preferences,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          source: 'cookie_banner'
        }),
      })
    } catch (error) {
      console.error('Errore salvataggio consensi:', error)
    }

    setConsents(preferences)
    applyCookieConsents(preferences)
    onConsentChange?.(preferences)
  }

  const handleAcceptAll = () => {
    const allConsents = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true
    }
    saveConsents(allConsents)
    setShowBanner(false)
  }

  const handleRejectAll = () => {
    const minimalConsents = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false
    }
    saveConsents(minimalConsents)
    setShowBanner(false)
  }

  const handleCustomize = () => {
    setShowDetails(true)
  }

  const handleSaveCustom = () => {
    saveConsents(consents)
    setShowBanner(false)
    setShowDetails(false)
  }

  const handleConsentChange = (type: keyof ConsentPreferences, value: boolean) => {
    if (type === 'essential') return // Non modificabile
    setConsents(prev => ({ ...prev, [type]: value }))
  }

  if (!showBanner) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
      
      {/* Banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-7xl mx-auto p-6">
          {!showDetails ? (
            // Banner semplice
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  🍪 Utilizziamo i Cookie
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Utilizziamo cookie e tecnologie simili per migliorare la tua esperienza, 
                  personalizzare contenuti e analizzare il traffico. Puoi scegliere quali 
                  categorie accettare.{' '}
                  <a href="/privacy" className="text-blue-600 hover:underline">
                    Leggi la Privacy Policy
                  </a>
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 min-w-0 lg:min-w-max">
                <Button
                  onClick={handleCustomize}
                  variant="secondary"
                  className="text-sm"
                >
                  Personalizza
                </Button>
                <Button
                  onClick={handleRejectAll}
                  variant="ghost"
                  className="text-sm"
                >
                  Solo Essenziali
                </Button>
                <Button
                  onClick={handleAcceptAll}
                  className="text-sm"
                >
                  Accetta Tutti
                </Button>
              </div>
            </div>
          ) : (
            // Pannello dettagliato
            <div className="max-w-2xl mx-auto">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Preferenze Cookie
              </h3>
              
              <div className="space-y-4 mb-6">
                {/* Essenziali */}
                <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">Cookie Essenziali</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Necessari per il funzionamento del sito (login, sicurezza, preferenze).
                    </p>
                  </div>
                  <div className="ml-4">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                </div>

                {/* Funzionali */}
                <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">Cookie Funzionali</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Migliorano l'esperienza utente (chat di supporto, preferenze UI).
                    </p>
                  </div>
                  <div className="ml-4">
                    <input
                      type="checkbox"
                      checked={consents.functional}
                      onChange={(e) => handleConsentChange('functional', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Analytics */}
                <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">Cookie di Analisi</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Ci aiutano a capire come utilizzi il sito (Google Analytics).
                    </p>
                  </div>
                  <div className="ml-4">
                    <input
                      type="checkbox"
                      checked={consents.analytics}
                      onChange={(e) => handleConsentChange('analytics', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Marketing */}
                <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">Cookie di Marketing</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Per pubblicità personalizzata e retargeting (Facebook, Google Ads).
                    </p>
                  </div>
                  <div className="ml-4">
                    <input
                      type="checkbox"
                      checked={consents.marketing}
                      onChange={(e) => handleConsentChange('marketing', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <Button
                  onClick={() => setShowDetails(false)}
                  variant="ghost"
                  className="text-sm"
                >
                  Indietro
                </Button>
                <Button
                  onClick={handleSaveCustom}
                  className="text-sm"
                >
                  Salva Preferenze
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// Componente per gestire preferenze cookie nell'account utente
export function CookiePreferences() {
  const [consents, setConsents] = useState<ConsentPreferences>({
    essential: true,
    functional: false,
    analytics: false,
    marketing: false
  })

  useEffect(() => {
    const savedConsents = localStorage.getItem('clientsniper-cookie-consents')
    if (savedConsents) {
      try {
        setConsents(JSON.parse(savedConsents))
      } catch (error) {
        console.error('Errore caricamento preferenze:', error)
      }
    }
  }, [])

  const handleSave = async () => {
    localStorage.setItem('clientsniper-cookie-consents', JSON.stringify(consents))
    
    try {
      await fetch('/api/gdpr/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consents,
          timestamp: new Date().toISOString(),
          source: 'account_settings'
        }),
      })
      
      alert('Preferenze salvate con successo!')
    } catch (error) {
      console.error('Errore salvataggio:', error)
      alert('Errore nel salvataggio delle preferenze')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Preferenze Cookie e Privacy
      </h3>
      
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Cookie Essenziali</h4>
            <p className="text-sm text-gray-600">Sempre attivi</p>
          </div>
          <input type="checkbox" checked disabled className="w-4 h-4" />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Cookie Funzionali</h4>
            <p className="text-sm text-gray-600">Migliorano l'esperienza</p>
          </div>
          <input 
            type="checkbox" 
            checked={consents.functional}
            onChange={(e) => setConsents(prev => ({ ...prev, functional: e.target.checked }))}
            className="w-4 h-4 text-blue-600 rounded" 
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Cookie di Analisi</h4>
            <p className="text-sm text-gray-600">Google Analytics</p>
          </div>
          <input 
            type="checkbox" 
            checked={consents.analytics}
            onChange={(e) => setConsents(prev => ({ ...prev, analytics: e.target.checked }))}
            className="w-4 h-4 text-blue-600 rounded" 
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Cookie di Marketing</h4>
            <p className="text-sm text-gray-600">Pubblicità personalizzata</p>
          </div>
          <input 
            type="checkbox" 
            checked={consents.marketing}
            onChange={(e) => setConsents(prev => ({ ...prev, marketing: e.target.checked }))}
            className="w-4 h-4 text-blue-600 rounded" 
          />
        </div>
      </div>
      
      <Button onClick={handleSave}>
        Salva Preferenze
      </Button>
    </div>
  )
}
