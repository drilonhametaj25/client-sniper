/**
 * Servizio per l'integrazione con Klaviyo
 * Gestisce iscrizioni newsletter e tracking eventi per retention
 * Usato da: Newsletter, tracking eventi, email automation
 *
 * EVENTI TRACCIATI:
 * - User Registered: Alla registrazione
 * - Lead Unlocked: Quando sblocca un lead
 * - Credits Low: Quando crediti <= 3
 * - Credits Depleted: Quando crediti = 0
 * - Daily Login: Login giornaliero (per streak)
 * - Deal Closed: Quando segna un deal come vinto
 * - Inactive User: Dopo 3+ giorni di inattività
 * - Subscription Changed: Upgrade/downgrade piano
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
    plan?: string
    credits_remaining?: number
    total_leads_unlocked?: number
    current_streak?: number
    [key: string]: any
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

  // =====================================================
  // EVENTI RETENTION - Per far tornare l'utente
  // =====================================================

  /**
   * Traccia sblocco lead - trigger per email "continua così!"
   */
  async trackLeadUnlocked(
    email: string,
    leadData: {
      leadId: string
      businessName: string
      category: string
      score: number
      city?: string
    },
    userStats: {
      creditsRemaining: number
      totalUnlocked: number
      plan: string
    }
  ) {
    return this.trackEvent({
      event: 'Lead Unlocked',
      customer_properties: {
        $email: email
      },
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

  /**
   * Traccia crediti bassi - trigger per email "stai finendo i crediti"
   */
  async trackCreditsLow(
    email: string,
    creditsRemaining: number,
    plan: string
  ) {
    return this.trackEvent({
      event: 'Credits Low',
      customer_properties: {
        $email: email
      },
      properties: {
        credits_remaining: creditsRemaining,
        user_plan: plan,
        upgrade_url: 'https://trovami.pro/upgrade',
        triggered_at: new Date().toISOString()
      }
    })
  }

  /**
   * Traccia crediti esauriti - trigger per email urgente upgrade
   */
  async trackCreditsDepleted(email: string, plan: string) {
    return this.trackEvent({
      event: 'Credits Depleted',
      customer_properties: {
        $email: email
      },
      properties: {
        user_plan: plan,
        upgrade_url: 'https://trovami.pro/upgrade',
        triggered_at: new Date().toISOString()
      }
    })
  }

  /**
   * Traccia login giornaliero - per streak e engagement
   */
  async trackDailyLogin(
    email: string,
    streakData: {
      currentStreak: number
      longestStreak: number
      lastLoginDate: string
    }
  ) {
    return this.trackEvent({
      event: 'Daily Login',
      customer_properties: {
        $email: email
      },
      properties: {
        current_streak: streakData.currentStreak,
        longest_streak: streakData.longestStreak,
        last_login: streakData.lastLoginDate,
        login_date: new Date().toISOString()
      }
    })
  }

  /**
   * Traccia deal chiuso - per congratulazioni e social proof
   */
  async trackDealClosed(
    email: string,
    dealData: {
      leadId: string
      businessName: string
      dealValue?: number
      totalDeals: number
    }
  ) {
    return this.trackEvent({
      event: 'Deal Closed',
      customer_properties: {
        $email: email
      },
      properties: {
        lead_id: dealData.leadId,
        business_name: dealData.businessName,
        deal_value: dealData.dealValue || 0,
        total_deals_closed: dealData.totalDeals,
        closed_at: new Date().toISOString()
      }
    })
  }

  /**
   * Traccia cambio piano - per email conferma e onboarding nuovo piano
   */
  async trackSubscriptionChanged(
    email: string,
    changeData: {
      previousPlan: string
      newPlan: string
      isUpgrade: boolean
      newCredits: number
    }
  ) {
    return this.trackEvent({
      event: 'Subscription Changed',
      customer_properties: {
        $email: email
      },
      properties: {
        previous_plan: changeData.previousPlan,
        new_plan: changeData.newPlan,
        is_upgrade: changeData.isUpgrade,
        new_credits: changeData.newCredits,
        changed_at: new Date().toISOString()
      }
    })
  }

  /**
   * Traccia utente inattivo - per email re-engagement
   * Chiamato da cron job
   */
  async trackInactiveUser(
    email: string,
    inactivityData: {
      daysSinceLastLogin: number
      lastLoginDate: string
      creditsRemaining: number
      plan: string
    }
  ) {
    return this.trackEvent({
      event: 'Inactive User',
      customer_properties: {
        $email: email
      },
      properties: {
        days_inactive: inactivityData.daysSinceLastLogin,
        last_login: inactivityData.lastLoginDate,
        credits_remaining: inactivityData.creditsRemaining,
        user_plan: inactivityData.plan,
        reactivation_url: 'https://trovami.pro/dashboard',
        triggered_at: new Date().toISOString()
      }
    })
  }

  /**
   * Traccia rinnovo crediti - per email "i tuoi crediti sono stati rinnovati"
   */
  async trackCreditsRenewed(
    email: string,
    renewalData: {
      plan: string
      newCredits: number
      nextRenewalDate: string
    }
  ) {
    return this.trackEvent({
      event: 'Credits Renewed',
      customer_properties: {
        $email: email
      },
      properties: {
        user_plan: renewalData.plan,
        new_credits: renewalData.newCredits,
        next_renewal: renewalData.nextRenewalDate,
        renewed_at: new Date().toISOString()
      }
    })
  }

  /**
   * Traccia nuovi lead disponibili nella zona dell'utente
   * Per email digest "Nuovi lead per te"
   */
  async trackNewLeadsAvailable(
    email: string,
    leadsData: {
      count: number
      topCategories: string[]
      cities: string[]
      bestScore: number
    }
  ) {
    return this.trackEvent({
      event: 'New Leads Available',
      customer_properties: {
        $email: email
      },
      properties: {
        new_leads_count: leadsData.count,
        top_categories: leadsData.topCategories.join(', '),
        cities: leadsData.cities.join(', '),
        best_lead_score: leadsData.bestScore,
        dashboard_url: 'https://trovami.pro/dashboard',
        triggered_at: new Date().toISOString()
      }
    })
  }

  /**
   * Traccia achievement sbloccato - per gamification
   */
  async trackAchievementUnlocked(
    email: string,
    achievement: {
      id: string
      name: string
      description: string
      xpReward: number
    }
  ) {
    return this.trackEvent({
      event: 'Achievement Unlocked',
      customer_properties: {
        $email: email
      },
      properties: {
        achievement_id: achievement.id,
        achievement_name: achievement.name,
        achievement_description: achievement.description,
        xp_reward: achievement.xpReward,
        unlocked_at: new Date().toISOString()
      }
    })
  }
}

export const klaviyo = new KlaviyoService()
export default klaviyo
