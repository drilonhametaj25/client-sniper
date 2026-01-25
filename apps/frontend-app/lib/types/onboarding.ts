/**
 * Onboarding Types
 *
 * Tipi TypeScript per il sistema di onboarding, matching algorithm,
 * e dashboard "Per Te" personalizzata.
 *
 * @file apps/frontend-app/lib/types/onboarding.ts
 */

import { ServiceType } from './services'

// =====================================================
// USER PROFILE TYPES
// =====================================================

/**
 * Tipo utente selezionato nell'onboarding
 */
export type UserType = 'freelancer' | 'agency' | 'consultant'

/**
 * Livello di skill per un servizio
 * 1 = Base, 2 = Intermedio, 3 = Expert
 */
export type SkillLevel = 1 | 2 | 3

/**
 * Labels per i livelli di skill
 */
export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  1: 'Base',
  2: 'Intermedio',
  3: 'Expert'
}

/**
 * Configurazione visiva per i tipi utente
 */
export const USER_TYPE_CONFIG: Record<UserType, {
  label: string
  description: string
  icon: string
}> = {
  freelancer: {
    label: 'Freelancer',
    description: 'Lavori da solo, gestisci i progetti personalmente',
    icon: '👤'
  },
  agency: {
    label: 'Agenzia',
    description: 'Hai un team, gestisci più progetti in parallelo',
    icon: '🏢'
  },
  consultant: {
    label: 'Consulente',
    description: 'Offri consulenza specializzata a business',
    icon: '🎓'
  }
}

/**
 * Profilo utente completo dal database
 */
export interface UserProfile {
  id: string
  userId: string
  userType: UserType
  serviceSkillLevels: Record<ServiceType, SkillLevel>
  preferredCities: string[]
  preferredRegions: string[]
  locationRadiusKm: number
  isRemoteOnly: boolean
  preferredIndustries: string[]
  excludedIndustries: string[]
  weeklyCapacity: number
  projectsInProgress: number
  onboardingCompletedAt: string | null
  onboardingSkippedAt: string | null
  onboardingCurrentStep: number
  createdAt: string
  updatedAt: string
}

/**
 * Profilo utente per creazione/update (campi opzionali)
 */
export interface UserProfileInput {
  userType?: UserType
  serviceSkillLevels?: Record<ServiceType, SkillLevel>
  preferredCities?: string[]
  preferredRegions?: string[]
  locationRadiusKm?: number
  isRemoteOnly?: boolean
  preferredIndustries?: string[]
  excludedIndustries?: string[]
  weeklyCapacity?: number
  projectsInProgress?: number
  onboardingCompletedAt?: string | null
  onboardingSkippedAt?: string | null
  onboardingCurrentStep?: number
}

// =====================================================
// ONBOARDING FORM TYPES
// =====================================================

/**
 * Dati Step 1: Tipo utente
 */
export interface OnboardingStep1Data {
  userType: UserType
}

/**
 * Dati Step 2: Servizi e skill levels
 */
export interface OnboardingStep2Data {
  services: ServiceType[]
  skillLevels: Partial<Record<ServiceType, SkillLevel>>
}

/**
 * Dati Step 3: Budget range
 */
export interface OnboardingStep3Data {
  budgetMin: number
  budgetMax: number
}

/**
 * Dati Step 4: Location preferences
 */
export interface OnboardingStep4Data {
  cities: string[]
  regions: string[]
  isRemoteOnly: boolean
  radiusKm: number
}

/**
 * Dati Step 5: Industry preferences
 */
export interface OnboardingStep5Data {
  preferredIndustries: string[]
  excludedIndustries: string[]
}

/**
 * Dati Step 6: Capacity
 */
export interface OnboardingStep6Data {
  weeklyCapacity: number
  projectsInProgress: number
}

/**
 * Form data completo onboarding
 */
export interface OnboardingFormData {
  step1: OnboardingStep1Data
  step2: OnboardingStep2Data
  step3: OnboardingStep3Data
  step4: OnboardingStep4Data
  step5: OnboardingStep5Data
  step6: OnboardingStep6Data
}

/**
 * Stato onboarding
 */
export interface OnboardingState {
  currentStep: number
  totalSteps: number
  formData: OnboardingFormData
  isSubmitting: boolean
  error: string | null
}

/**
 * Step onboarding singolo
 */
export interface OnboardingStepConfig {
  id: number
  title: string
  subtitle: string
  icon: string
  isOptional: boolean
}

/**
 * Configurazione steps onboarding
 */
export const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  {
    id: 1,
    title: 'Chi sei?',
    subtitle: 'Seleziona il tuo profilo professionale',
    icon: '👤',
    isOptional: false
  },
  {
    id: 2,
    title: 'Cosa offri?',
    subtitle: 'Seleziona i servizi che offri ai clienti',
    icon: '🛠️',
    isOptional: false
  },
  {
    id: 3,
    title: 'Budget progetti',
    subtitle: 'Indica il range di budget che preferisci',
    icon: '💰',
    isOptional: false
  },
  {
    id: 4,
    title: 'Dove operi?',
    subtitle: 'Seleziona le aree geografiche di interesse',
    icon: '📍',
    isOptional: true
  },
  {
    id: 5,
    title: 'Settori preferiti',
    subtitle: 'Indica i settori che preferisci o vuoi evitare',
    icon: '🎯',
    isOptional: true
  },
  {
    id: 6,
    title: 'Capacità',
    subtitle: 'Quanti lead riesci a gestire?',
    icon: '⚡',
    isOptional: true
  }
]

// =====================================================
// BEHAVIOR TRACKING TYPES
// =====================================================

/**
 * Tipi di azione tracciabili
 */
export type BehaviorAction =
  | 'viewed'
  | 'unlocked'
  | 'contacted'
  | 'converted'
  | 'skipped'
  | 'saved'

/**
 * Metadata per azione 'viewed'
 */
export interface ViewedMetadata {
  source: 'dashboard' | 'for_you' | 'search' | 'detail'
}

/**
 * Metadata per azione 'contacted'
 */
export interface ContactedMetadata {
  method: 'email' | 'phone' | 'whatsapp' | 'other'
}

/**
 * Metadata per azione 'converted'
 */
export interface ConvertedMetadata {
  dealValue: number
  services: ServiceType[]
  notes?: string
}

/**
 * Metadata per azione 'skipped'
 */
export interface SkippedMetadata {
  reason: 'budget_mismatch' | 'location_far' | 'not_interested' | 'already_contacted' | 'other'
}

/**
 * Union type per metadata azioni
 */
export type BehaviorMetadata =
  | ViewedMetadata
  | ContactedMetadata
  | ConvertedMetadata
  | SkippedMetadata
  | Record<string, unknown>

/**
 * Record behavior dal database
 */
export interface UserBehaviorRecord {
  id: string
  userId: string
  leadId: string
  action: BehaviorAction
  actionMetadata: BehaviorMetadata
  leadScoreSnapshot: number | null
  leadCategorySnapshot: string | null
  relevanceScoreSnapshot: number | null
  createdAt: string
}

/**
 * Summary comportamento utente (per algoritmo)
 */
export interface UserBehaviorSummary {
  totalViewed: number
  totalUnlocked: number
  totalContacted: number
  totalConverted: number
  totalSkipped: number
  totalSaved: number
  convertedCategories: string[]
  convertedCities: string[]
  avgConvertedRelevance: number | null
  lastActivity: string | null
}

// =====================================================
// RELEVANCE CALCULATION TYPES
// =====================================================

/**
 * Breakdown score rilevanza
 */
export interface RelevanceBreakdown {
  serviceMatch: number    // 40% max
  budgetMatch: number     // 20% max
  locationMatch: number   // 15% max
  industryMatch: number   // 10% max
  urgency: number         // 10% max
  behavioral: number      // 5% max
}

/**
 * Risultato calcolo rilevanza
 */
export interface LeadRelevance {
  leadId: string
  score: number // 0-100
  breakdown: RelevanceBreakdown
  matchedServices: ServiceType[]
  reason: string
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Lead con rilevanza calcolata (per UI)
 */
export interface LeadWithRelevance {
  lead: {
    id: string
    business_name: string
    website_url: string
    city: string
    category: string
    score: number
    analysis: unknown
    created_at: string
  }
  relevance: LeadRelevance
}

/**
 * Pesi per calcolo rilevanza
 */
export const RELEVANCE_WEIGHTS = {
  SERVICE_MATCH: 0.40,
  BUDGET_MATCH: 0.20,
  LOCATION_MATCH: 0.15,
  INDUSTRY_MATCH: 0.10,
  URGENCY: 0.10,
  BEHAVIORAL: 0.05
} as const

/**
 * Soglie per reason text
 */
export const RELEVANCE_THRESHOLDS = {
  PERFECT: 90,
  EXCELLENT: 80,
  GOOD: 70,
  FAIR: 50,
  LOW: 30
} as const

// =====================================================
// FOR YOU DASHBOARD TYPES
// =====================================================

/**
 * Sezione dashboard "Per Te"
 */
export type ForYouSectionType =
  | 'daily_top_5'
  | 'perfect_match'
  | 'high_budget'
  | 'near_you'
  | 'new_today'

/**
 * Configurazione sezione
 */
export interface ForYouSectionConfig {
  type: ForYouSectionType
  title: string
  subtitle: string
  icon: string
  limit: number
  minScore?: number
  filterFn?: string // Nome funzione filtro
}

/**
 * Configurazioni sezioni dashboard
 */
export const FOR_YOU_SECTIONS: ForYouSectionConfig[] = [
  {
    type: 'daily_top_5',
    title: 'I tuoi Top 5 di oggi',
    subtitle: 'Lead selezionati per te',
    icon: '🎯',
    limit: 5,
    minScore: 0
  },
  {
    type: 'perfect_match',
    title: 'Match Perfetto',
    subtitle: 'Compatibilità 90%+',
    icon: '✨',
    limit: 8,
    minScore: 90
  },
  {
    type: 'high_budget',
    title: 'Budget Alto',
    subtitle: 'Opportunità di valore',
    icon: '💰',
    limit: 6,
    minScore: 0
  },
  {
    type: 'near_you',
    title: 'Vicino a te',
    subtitle: 'Nella tua zona',
    icon: '📍',
    limit: 6,
    minScore: 0
  },
  {
    type: 'new_today',
    title: 'Nuovi oggi',
    subtitle: 'Appena aggiunti',
    icon: '🆕',
    limit: 10,
    minScore: 0
  }
]

/**
 * Response API /api/leads/for-you
 */
export interface ForYouApiResponse {
  sections: {
    daily_top_5: LeadWithRelevance[]
    perfect_match: LeadWithRelevance[]
    high_budget: LeadWithRelevance[]
    near_you: LeadWithRelevance[]
    new_today: LeadWithRelevance[]
  }
  profileComplete: boolean
  showOnboardingPrompt: boolean
  totalLeadsAnalyzed: number
  calculatedAt: string
}

// =====================================================
// LOCATION HELPERS
// =====================================================

/**
 * Regione italiana
 */
export interface ItalianRegion {
  code: string
  name: string
  provinces: string[]
}

/**
 * Categoria business
 */
export interface BusinessCategory {
  code: string
  name: string
  namePlural: string
  icon: string
}

/**
 * Regioni italiane (per UI)
 */
export const ITALIAN_REGIONS: ItalianRegion[] = [
  { code: 'ABR', name: 'Abruzzo', provinces: ['AQ', 'CH', 'PE', 'TE'] },
  { code: 'BAS', name: 'Basilicata', provinces: ['MT', 'PZ'] },
  { code: 'CAL', name: 'Calabria', provinces: ['CS', 'CZ', 'KR', 'RC', 'VV'] },
  { code: 'CAM', name: 'Campania', provinces: ['AV', 'BN', 'CE', 'NA', 'SA'] },
  { code: 'EMR', name: 'Emilia-Romagna', provinces: ['BO', 'FC', 'FE', 'MO', 'PC', 'PR', 'RA', 'RE', 'RN'] },
  { code: 'FVG', name: 'Friuli-Venezia Giulia', provinces: ['GO', 'PN', 'TS', 'UD'] },
  { code: 'LAZ', name: 'Lazio', provinces: ['FR', 'LT', 'RI', 'RM', 'VT'] },
  { code: 'LIG', name: 'Liguria', provinces: ['GE', 'IM', 'SP', 'SV'] },
  { code: 'LOM', name: 'Lombardia', provinces: ['BG', 'BS', 'CO', 'CR', 'LC', 'LO', 'MB', 'MI', 'MN', 'PV', 'SO', 'VA'] },
  { code: 'MAR', name: 'Marche', provinces: ['AN', 'AP', 'FM', 'MC', 'PU'] },
  { code: 'MOL', name: 'Molise', provinces: ['CB', 'IS'] },
  { code: 'PIE', name: 'Piemonte', provinces: ['AL', 'AT', 'BI', 'CN', 'NO', 'TO', 'VB', 'VC'] },
  { code: 'PUG', name: 'Puglia', provinces: ['BA', 'BT', 'BR', 'FG', 'LE', 'TA'] },
  { code: 'SAR', name: 'Sardegna', provinces: ['CA', 'NU', 'OR', 'SS', 'SU'] },
  { code: 'SIC', name: 'Sicilia', provinces: ['AG', 'CL', 'CT', 'EN', 'ME', 'PA', 'RG', 'SR', 'TP'] },
  { code: 'TOS', name: 'Toscana', provinces: ['AR', 'FI', 'GR', 'LI', 'LU', 'MS', 'PI', 'PO', 'PT', 'SI'] },
  { code: 'TAA', name: 'Trentino-Alto Adige', provinces: ['BZ', 'TN'] },
  { code: 'UMB', name: 'Umbria', provinces: ['PG', 'TR'] },
  { code: 'VDA', name: "Valle d'Aosta", provinces: ['AO'] },
  { code: 'VEN', name: 'Veneto', provinces: ['BL', 'PD', 'RO', 'TV', 'VE', 'VI', 'VR'] }
]

/**
 * Categorie business comuni (per UI)
 */
export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  { code: 'restaurant', name: 'Ristorante', namePlural: 'Ristoranti', icon: '🍽️' },
  { code: 'bar', name: 'Bar', namePlural: 'Bar', icon: '☕' },
  { code: 'hotel', name: 'Hotel', namePlural: 'Hotel', icon: '🏨' },
  { code: 'beauty', name: 'Centro Estetico', namePlural: 'Centri Estetici', icon: '💅' },
  { code: 'hairdresser', name: 'Parrucchiere', namePlural: 'Parrucchieri', icon: '💇' },
  { code: 'dentist', name: 'Dentista', namePlural: 'Dentisti', icon: '🦷' },
  { code: 'doctor', name: 'Medico', namePlural: 'Medici', icon: '🩺' },
  { code: 'lawyer', name: 'Avvocato', namePlural: 'Avvocati', icon: '⚖️' },
  { code: 'accountant', name: 'Commercialista', namePlural: 'Commercialisti', icon: '📊' },
  { code: 'real_estate', name: 'Agenzia Immobiliare', namePlural: 'Agenzie Immobiliari', icon: '🏠' },
  { code: 'gym', name: 'Palestra', namePlural: 'Palestre', icon: '🏋️' },
  { code: 'mechanic', name: 'Officina', namePlural: 'Officine', icon: '🔧' },
  { code: 'plumber', name: 'Idraulico', namePlural: 'Idraulici', icon: '🔩' },
  { code: 'electrician', name: 'Elettricista', namePlural: 'Elettricisti', icon: '⚡' },
  { code: 'photographer', name: 'Fotografo', namePlural: 'Fotografi', icon: '📷' },
  { code: 'florist', name: 'Fiorista', namePlural: 'Fioristi', icon: '💐' },
  { code: 'bakery', name: 'Panificio', namePlural: 'Panifici', icon: '🥖' },
  { code: 'pharmacy', name: 'Farmacia', namePlural: 'Farmacie', icon: '💊' },
  { code: 'veterinary', name: 'Veterinario', namePlural: 'Veterinari', icon: '🐾' },
  { code: 'school', name: 'Scuola', namePlural: 'Scuole', icon: '📚' },
  { code: 'shop', name: 'Negozio', namePlural: 'Negozi', icon: '🛍️' }
]
