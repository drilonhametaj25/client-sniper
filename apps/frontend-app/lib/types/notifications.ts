/**
 * Tipi per il Sistema di Notifiche e Lead Alerts
 * Utilizzato da: API notifiche, componenti UI, email service
 */

// =====================================================
// NOTIFICATION PREFERENCES
// =====================================================

export type EmailDigestFrequency = 'realtime' | 'daily' | 'weekly'

export interface NotificationPreferences {
  id: string
  userId: string

  // Email digest
  emailDigestEnabled: boolean
  emailDigestFrequency: EmailDigestFrequency

  // Tipi di notifiche
  notifyNewLeads: boolean
  notifyHighScoreLeads: boolean
  notifyCreditsLow: boolean
  notifyCreditsReset: boolean
  notifyFollowUpReminder: boolean
  notifySavedSearchMatch: boolean

  // Soglie
  highScoreThreshold: number
  creditsLowThreshold: number

  // Orari
  preferredSendHour: number
  timezone: string

  createdAt: Date
  updatedAt: Date
}

export interface NotificationPreferencesInput {
  emailDigestEnabled?: boolean
  emailDigestFrequency?: EmailDigestFrequency
  notifyNewLeads?: boolean
  notifyHighScoreLeads?: boolean
  notifyCreditsLow?: boolean
  notifyCreditsReset?: boolean
  notifyFollowUpReminder?: boolean
  notifySavedSearchMatch?: boolean
  highScoreThreshold?: number
  creditsLowThreshold?: number
  preferredSendHour?: number
  timezone?: string
}

// =====================================================
// NOTIFICATION LOGS
// =====================================================

export type NotificationType =
  | 'new_leads'
  | 'high_score_lead'
  | 'credits_low'
  | 'credits_reset'
  | 'follow_up_reminder'
  | 'saved_search_match'
  | 'welcome'
  | 'weekly_digest'
  | 'daily_digest'

export type NotificationChannel = 'email' | 'push' | 'in_app'

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed'

export interface NotificationLog {
  id: string
  userId: string
  notificationType: NotificationType
  channel: NotificationChannel
  subject?: string
  content?: string
  metadata: Record<string, any>
  sentAt: Date
  openedAt?: Date
  clickedAt?: Date
  status: NotificationStatus
}

// =====================================================
// SAVED SEARCHES (Lead Alerts)
// =====================================================

export type AlertFrequency = 'realtime' | 'daily' | 'weekly'

export interface SavedSearch {
  id: string
  userId: string
  name: string

  // Criteri
  categories: string[]
  cities: string[]
  scoreMin: number
  scoreMax: number
  hasEmail?: boolean
  hasPhone?: boolean

  // Filtri tecnici
  filterNoSsl: boolean
  filterSlowLoading: boolean
  filterNoAnalytics: boolean
  filterNoFacebookPixel: boolean

  // Alert settings
  alertEnabled: boolean
  alertFrequency: AlertFrequency
  lastAlertSentAt?: Date
  matchesSinceLastAlert: number

  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SavedSearchInput {
  name: string
  categories?: string[]
  cities?: string[]
  scoreMin?: number
  scoreMax?: number
  hasEmail?: boolean
  hasPhone?: boolean
  filterNoSsl?: boolean
  filterSlowLoading?: boolean
  filterNoAnalytics?: boolean
  filterNoFacebookPixel?: boolean
  alertEnabled?: boolean
  alertFrequency?: AlertFrequency
}

export interface SavedSearchMatch {
  id: string
  savedSearchId: string
  leadId: string
  matchedAt: Date
  notified: boolean
  notifiedAt?: Date
}

// =====================================================
// EMAIL TEMPLATES
// =====================================================

export interface EmailTemplateData {
  userName?: string
  userEmail: string
  subject: string
  preheader?: string
  bodyHtml: string
  bodyText?: string
  ctaUrl?: string
  ctaText?: string
  unsubscribeUrl?: string
}

export interface NewLeadsEmailData {
  leads: {
    id: string
    businessName: string
    city: string
    category: string
    score: number
    issues: string[]
  }[]
  totalNewLeads: number
  period: 'daily' | 'weekly'
}

export interface SavedSearchMatchEmailData {
  searchName: string
  matchCount: number
  leads: {
    id: string
    businessName: string
    city: string
    category: string
    score: number
  }[]
}

export interface CreditsLowEmailData {
  creditsRemaining: number
  planName: string
  resetDate?: Date
}
