/**
 * Servizio per l'integrazione con Klaviyo
 * Gestisce iscrizioni newsletter e tracking eventi
 * Usato da: Newsletter form, popup, landing pages
 */

interface KlaviyoProfile {
  email: string
  first_name?: string
  last_name?: string
  phone_number?: string
  properties?: {
    source?: string
    interests?: string[]
    company?: string
    role?: string
    website?: string
    subscription_page?: string
    [key: string]: any // Permette proprietà aggiuntive
  }
}

interface KlaviyoEvent {
  event: string
  customer_properties: {
    $email: string
    $first_name?: string
    $last_name?: string
  }
  properties?: Record<string, any>
}

class KlaviyoService {
  private apiKey: string
  private baseUrl = 'https://a.klaviyo.com/api'

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_KLAVIYO_PUBLIC_KEY || ''
    if (!this.apiKey) {
      console.warn('⚠️ Klaviyo API key mancante')
    }
  }

  /**
   * Iscrivi utente alla newsletter
   */
  async subscribeToNewsletter(profile: KlaviyoProfile): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/klaviyo/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile,
          listId: process.env.NEXT_PUBLIC_KLAVIYO_NEWSLETTER_LIST_ID
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Errore durante l\'iscrizione')
      }

      return {
        success: true,
        message: 'Iscrizione completata! Controlla la tua email per confermare.'
      }
    } catch (error) {
      console.error('Errore iscrizione Klaviyo:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Errore imprevisto'
      }
    }
  }

  /**
   * Traccia evento personalizzato
   */
  async trackEvent(event: KlaviyoEvent): Promise<boolean> {
    try {
      const response = await fetch('/api/klaviyo/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
      })

      return response.ok
    } catch (error) {
      console.error('Errore tracking Klaviyo:', error)
      return false
    }
  }

  /**
   * Traccia analisi completata (per nurturing)
   */
  async trackAnalysisCompleted(email: string, websiteUrl: string, score: number) {
    return this.trackEvent({
      event: 'Completed Website Analysis',
      customer_properties: {
        $email: email
      },
      properties: {
        website_url: websiteUrl,
        analysis_score: score,
        analysis_date: new Date().toISOString(),
        source: 'public_scan'
      }
    })
  }

  /**
   * Traccia registrazione utente
   */
  async trackRegistration(email: string, plan: string, source: string = 'website') {
    return this.trackEvent({
      event: 'User Registered',
      customer_properties: {
        $email: email
      },
      properties: {
        plan_selected: plan,
        registration_source: source,
        registration_date: new Date().toISOString()
      }
    })
  }
}

export const klaviyo = new KlaviyoService()
export default klaviyo
