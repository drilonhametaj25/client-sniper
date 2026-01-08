/**
 * Servizio Klaviyo SERVER-SIDE
 * Per uso in API routes e cron jobs (non usa fetch su /api)
 * Chiama direttamente le API Klaviyo
 */

interface KlaviyoEventPayload {
  event: string
  email: string
  properties?: Record<string, any>
  firstName?: string
  lastName?: string
}

interface KlaviyoProfilePayload {
  email: string
  firstName?: string
  lastName?: string
  properties?: Record<string, any>
}

class KlaviyoServerService {
  private apiKey: string
  private listId: string
  private baseUrl = 'https://a.klaviyo.com/api'

  constructor() {
    this.apiKey = process.env.KLAVIYO_PRIVATE_KEY || process.env.KLAVIYO_API_KEY || ''
    this.listId = process.env.KLAVIYO_LIST_ID || ''

    if (!this.apiKey) {
      console.warn('⚠️ KLAVIYO_PRIVATE_KEY mancante')
    }
  }

  /**
   * Traccia evento direttamente su Klaviyo
   */
  async trackEvent(payload: KlaviyoEventPayload): Promise<boolean> {
    if (!this.apiKey) {
      console.error('Klaviyo API key mancante')
      return false
    }

    try {
      const eventPayload = {
        data: {
          type: 'event',
          attributes: {
            metric: {
              data: {
                type: 'metric',
                attributes: {
                  name: payload.event
                }
              }
            },
            profile: {
              data: {
                type: 'profile',
                attributes: {
                  email: payload.email,
                  first_name: payload.firstName,
                  last_name: payload.lastName
                }
              }
            },
            properties: payload.properties || {},
            time: new Date().toISOString()
          }
        }
      }

      const response = await fetch(`${this.baseUrl}/events/`, {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${this.apiKey}`,
          'Content-Type': 'application/json',
          'revision': '2024-06-15'
        },
        body: JSON.stringify(eventPayload)
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('Errore Klaviyo trackEvent:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Errore Klaviyo trackEvent:', error)
      return false
    }
  }

  /**
   * Aggiorna o crea profilo su Klaviyo
   */
  async upsertProfile(payload: KlaviyoProfilePayload): Promise<string | null> {
    if (!this.apiKey) return null

    try {
      const profilePayload = {
        data: {
          type: 'profile',
          attributes: {
            email: payload.email,
            first_name: payload.firstName,
            last_name: payload.lastName,
            properties: payload.properties || {}
          }
        }
      }

      const response = await fetch(`${this.baseUrl}/profiles/`, {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${this.apiKey}`,
          'Content-Type': 'application/json',
          'revision': '2024-06-15'
        },
        body: JSON.stringify(profilePayload)
      })

      if (response.status === 409) {
        // Profilo già esistente, aggiorna
        return await this.updateProfileByEmail(payload)
      }

      if (!response.ok) {
        const error = await response.text()
        console.error('Errore Klaviyo upsertProfile:', error)
        return null
      }

      const data = await response.json()
      return data?.data?.id || null
    } catch (error) {
      console.error('Errore Klaviyo upsertProfile:', error)
      return null
    }
  }

  /**
   * Aggiorna profilo esistente tramite email
   */
  private async updateProfileByEmail(payload: KlaviyoProfilePayload): Promise<string | null> {
    try {
      // Prima ottieni l'ID del profilo
      const searchResponse = await fetch(
        `${this.baseUrl}/profiles/?filter=equals(email,"${encodeURIComponent(payload.email)}")`,
        {
          headers: {
            'Authorization': `Klaviyo-API-Key ${this.apiKey}`,
            'revision': '2024-06-15'
          }
        }
      )

      if (!searchResponse.ok) return null

      const searchData = await searchResponse.json()
      const profileId = searchData?.data?.[0]?.id

      if (!profileId) return null

      // Aggiorna il profilo
      const updatePayload = {
        data: {
          type: 'profile',
          id: profileId,
          attributes: {
            first_name: payload.firstName,
            last_name: payload.lastName,
            properties: payload.properties || {}
          }
        }
      }

      const updateResponse = await fetch(`${this.baseUrl}/profiles/${profileId}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Klaviyo-API-Key ${this.apiKey}`,
          'Content-Type': 'application/json',
          'revision': '2024-06-15'
        },
        body: JSON.stringify(updatePayload)
      })

      return updateResponse.ok ? profileId : null
    } catch (error) {
      console.error('Errore updateProfileByEmail:', error)
      return null
    }
  }

  /**
   * Aggiungi profilo a una lista
   */
  async addToList(email: string, listId?: string): Promise<boolean> {
    const targetListId = listId || this.listId
    if (!this.apiKey || !targetListId) return false

    try {
      const payload = {
        data: [{
          type: 'profile',
          attributes: {
            email
          }
        }]
      }

      const response = await fetch(`${this.baseUrl}/lists/${targetListId}/relationships/profiles/`, {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${this.apiKey}`,
          'Content-Type': 'application/json',
          'revision': '2024-06-15'
        },
        body: JSON.stringify(payload)
      })

      return response.ok || response.status === 204
    } catch (error) {
      console.error('Errore addToList:', error)
      return false
    }
  }

  // =====================================================
  // METODI HELPER PER EVENTI SPECIFICI
  // =====================================================

  async trackLeadUnlocked(
    email: string,
    leadData: { leadId: string; businessName: string; category: string; score: number; city?: string },
    userStats: { creditsRemaining: number; totalUnlocked: number; plan: string }
  ) {
    return this.trackEvent({
      event: 'Lead Unlocked',
      email,
      properties: {
        lead_id: leadData.leadId,
        business_name: leadData.businessName,
        category: leadData.category,
        lead_score: leadData.score,
        city: leadData.city || 'N/A',
        credits_remaining: userStats.creditsRemaining,
        total_leads_unlocked: userStats.totalUnlocked,
        user_plan: userStats.plan,
        unlocked_at: new Date().toISOString()
      }
    })
  }

  async trackCreditsLow(email: string, creditsRemaining: number, plan: string) {
    return this.trackEvent({
      event: 'Credits Low',
      email,
      properties: {
        credits_remaining: creditsRemaining,
        user_plan: plan,
        upgrade_url: 'https://trovami.pro/upgrade'
      }
    })
  }

  async trackCreditsDepleted(email: string, plan: string) {
    return this.trackEvent({
      event: 'Credits Depleted',
      email,
      properties: {
        user_plan: plan,
        upgrade_url: 'https://trovami.pro/upgrade'
      }
    })
  }

  async trackInactiveUser(
    email: string,
    data: { daysSinceLastLogin: number; lastLoginDate: string; creditsRemaining: number; plan: string }
  ) {
    return this.trackEvent({
      event: 'Inactive User',
      email,
      properties: {
        days_inactive: data.daysSinceLastLogin,
        last_login: data.lastLoginDate,
        credits_remaining: data.creditsRemaining,
        user_plan: data.plan,
        reactivation_url: 'https://trovami.pro/dashboard'
      }
    })
  }

  async trackCreditsRenewed(
    email: string,
    data: { plan: string; newCredits: number; nextRenewalDate: string }
  ) {
    return this.trackEvent({
      event: 'Credits Renewed',
      email,
      properties: {
        user_plan: data.plan,
        new_credits: data.newCredits,
        next_renewal: data.nextRenewalDate
      }
    })
  }

  async trackSubscriptionChanged(
    email: string,
    data: { previousPlan: string; newPlan: string; isUpgrade: boolean; newCredits: number }
  ) {
    return this.trackEvent({
      event: 'Subscription Changed',
      email,
      properties: {
        previous_plan: data.previousPlan,
        new_plan: data.newPlan,
        is_upgrade: data.isUpgrade,
        new_credits: data.newCredits
      }
    })
  }

  async trackNewLeadsAvailable(
    email: string,
    data: { count: number; topCategories: string[]; cities: string[]; bestScore: number }
  ) {
    return this.trackEvent({
      event: 'New Leads Available',
      email,
      properties: {
        new_leads_count: data.count,
        top_categories: data.topCategories.join(', '),
        cities: data.cities.join(', '),
        best_lead_score: data.bestScore,
        dashboard_url: 'https://trovami.pro/dashboard'
      }
    })
  }
}

export const klaviyoServer = new KlaviyoServerService()
export default klaviyoServer
