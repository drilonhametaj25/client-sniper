/**
 * Tipi per il Sistema di Gamification, Streak e Onboarding
 * Utilizzato da: Dashboard, componenti UI, API gamification
 */

// =====================================================
// GAMIFICATION
// =====================================================

export interface UserGamification {
  id: string
  userId: string

  // Streak
  currentStreak: number
  longestStreak: number
  lastActivityDate?: Date

  // Counters
  totalLeadsUnlocked: number
  totalLeadsContacted: number
  totalDealsWon: number
  totalDealsValue: number

  // XP & Level
  xpPoints: number
  level: number

  createdAt: Date
  updatedAt: Date
}

export type AchievementCategory = 'engagement' | 'sales' | 'exploration'

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: AchievementCategory
  xpReward: number
  sortOrder: number
  isActive: boolean
}

export interface UserAchievement {
  id: string
  odoo: string
  achievementId: string
  unlockedAt: Date
  achievement?: Achievement
}

// Achievement IDs per riferimento
export const ACHIEVEMENT_IDS = {
  FIRST_UNLOCK: 'first_unlock',
  UNLOCK_10: 'unlock_10',
  UNLOCK_50: 'unlock_50',
  UNLOCK_100: 'unlock_100',
  FIRST_CONTACT: 'first_contact',
  CONTACT_10: 'contact_10',
  FIRST_DEAL: 'first_deal',
  DEAL_5: 'deal_5',
  STREAK_3: 'streak_3',
  STREAK_7: 'streak_7',
  STREAK_30: 'streak_30',
  SAVED_SEARCH: 'saved_search',
  CRM_PRO: 'crm_pro'
} as const

// =====================================================
// ONBOARDING PROGRESSIVO
// =====================================================

export interface UserOnboarding {
  id: string
  userId: string

  // Steps completati
  completedProfile: boolean
  completedFirstUnlock: boolean
  completedFirstContact: boolean
  completedCrmSetup: boolean
  completedSavedSearch: boolean
  completedFirstDeal: boolean

  // Progress
  progressPercentage: number

  // Timestamps
  profileCompletedAt?: Date
  firstUnlockAt?: Date
  firstContactAt?: Date
  crmSetupAt?: Date
  savedSearchAt?: Date
  firstDealAt?: Date

  // Status
  onboardingCompleted: boolean
  onboardingCompletedAt?: Date
  onboardingSkipped: boolean

  createdAt: Date
  updatedAt: Date
}

export interface OnboardingStep {
  id: string
  key: keyof Pick<UserOnboarding,
    'completedProfile' |
    'completedFirstUnlock' |
    'completedFirstContact' |
    'completedCrmSetup' |
    'completedSavedSearch' |
    'completedFirstDeal'
  >
  title: string
  description: string
  icon: string
  ctaText: string
  ctaUrl: string
  completedMessage: string
  order: number
  requiresPro?: boolean
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'profile',
    key: 'completedProfile',
    title: 'Completa il tuo profilo',
    description: 'Aggiungi le informazioni della tua agenzia per personalizzare i template',
    icon: '👤',
    ctaText: 'Vai al Profilo',
    ctaUrl: '/settings',
    completedMessage: 'Profilo completato!',
    order: 1
  },
  {
    id: 'first_unlock',
    key: 'completedFirstUnlock',
    title: 'Sblocca il tuo primo lead',
    description: 'Scopri tutte le informazioni di un potenziale cliente',
    icon: '🔓',
    ctaText: 'Vai ai Lead',
    ctaUrl: '/dashboard',
    completedMessage: 'Primo lead sbloccato!',
    order: 2
  },
  {
    id: 'first_contact',
    key: 'completedFirstContact',
    title: 'Contatta il tuo primo lead',
    description: 'Usa i template per inviare il tuo primo messaggio',
    icon: '📧',
    ctaText: 'Vedi Template',
    ctaUrl: '/dashboard',
    completedMessage: 'Primo contatto inviato!',
    order: 3
  },
  {
    id: 'crm_setup',
    key: 'completedCrmSetup',
    title: 'Configura il CRM',
    description: 'Organizza i tuoi lead con il sistema CRM integrato',
    icon: '📊',
    ctaText: 'Vai al CRM',
    ctaUrl: '/crm',
    completedMessage: 'CRM configurato!',
    order: 4,
    requiresPro: true
  },
  {
    id: 'saved_search',
    key: 'completedSavedSearch',
    title: 'Crea un Alert personalizzato',
    description: 'Ricevi notifiche quando arrivano lead che ti interessano',
    icon: '🔔',
    ctaText: 'Crea Alert',
    ctaUrl: '/dashboard?openAlerts=true',
    completedMessage: 'Alert creato!',
    order: 5
  },
  {
    id: 'first_deal',
    key: 'completedFirstDeal',
    title: 'Chiudi il tuo primo deal',
    description: 'Segna un lead come cliente acquisito',
    icon: '🎉',
    ctaText: 'Vai al CRM',
    ctaUrl: '/crm',
    completedMessage: 'Primo cliente acquisito!',
    order: 6,
    requiresPro: true
  }
]

// =====================================================
// COMPETITOR INTELLIGENCE
// =====================================================

export interface LeadCompetitorStats {
  leadId: string
  viewCount: number
  unlockCount: number
  firstSeenAt?: Date
  lastUnlockedAt?: Date
  isHot: boolean // true se unlock_count > threshold in ultimi X giorni
  competitionLevel: 'low' | 'medium' | 'high'
}

export const getCompetitionLevel = (unlockCount: number): 'low' | 'medium' | 'high' => {
  if (unlockCount <= 2) return 'low'
  if (unlockCount <= 5) return 'medium'
  return 'high'
}

export const getCompetitionMessage = (stats: LeadCompetitorStats): string => {
  if (stats.competitionLevel === 'high') {
    return `🔥 Lead molto richiesto (${stats.unlockCount} utenti interessati)`
  }
  if (stats.competitionLevel === 'medium') {
    return `⚡ ${stats.unlockCount} altri utenti hanno visto questo lead`
  }
  return '✨ Lead esclusivo - pochi utenti lo hanno visto'
}
