/**
 * Relevance Calculation Algorithm
 *
 * Calcola la rilevanza di un lead per un utente specifico
 * basandosi su: servizi, budget, location, industry, urgency, behavioral.
 *
 * Pesi:
 * - Service Match: 40%
 * - Budget Match: 20%
 * - Location Match: 15%
 * - Industry Match: 10%
 * - Urgency: 10%
 * - Behavioral: 5%
 *
 * @file apps/frontend-app/lib/utils/relevance-calculation.ts
 */

import { ServiceType, DetectedServices } from '@/lib/types/services'
import { detectServices } from '@/lib/utils/service-detection'
import { calculateMatch } from '@/lib/utils/match-calculation'
import {
  UserProfile,
  UserBehaviorSummary,
  LeadRelevance,
  RelevanceBreakdown,
  SkillLevel,
  RELEVANCE_WEIGHTS,
  RELEVANCE_THRESHOLDS,
  ITALIAN_REGIONS
} from '@/lib/types/onboarding'

// =====================================================
// TYPES
// =====================================================

/**
 * Lead data minimale per calcolo relevance
 */
export interface LeadForRelevance {
  id: string
  city: string
  category: string
  score: number
  analysis: unknown
  created_at?: string
}

/**
 * User data minimale per calcolo relevance
 */
export interface UserForRelevance {
  services_offered: ServiceType[]
  preferred_min_budget?: number
  preferred_max_budget?: number
}

/**
 * Input completo per calcolo relevance
 */
export interface RelevanceInput {
  lead: LeadForRelevance
  user: UserForRelevance
  profile: UserProfile | null
  behavior: UserBehaviorSummary | null
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Ottiene la regione da una città (approssimativo)
 * Cerca match parziale nel nome città
 */
export function getRegionFromCity(city: string): string | null {
  if (!city) return null

  const cityLower = city.toLowerCase().trim()

  // Mapping diretto città principali -> regioni
  const cityToRegion: Record<string, string> = {
    // Lombardia
    'milano': 'Lombardia',
    'bergamo': 'Lombardia',
    'brescia': 'Lombardia',
    'como': 'Lombardia',
    'monza': 'Lombardia',
    // Lazio
    'roma': 'Lazio',
    'latina': 'Lazio',
    'frosinone': 'Lazio',
    // Campania
    'napoli': 'Campania',
    'salerno': 'Campania',
    'caserta': 'Campania',
    // Piemonte
    'torino': 'Piemonte',
    'novara': 'Piemonte',
    'alessandria': 'Piemonte',
    // Veneto
    'venezia': 'Veneto',
    'verona': 'Veneto',
    'padova': 'Veneto',
    'vicenza': 'Veneto',
    'treviso': 'Veneto',
    // Emilia-Romagna
    'bologna': 'Emilia-Romagna',
    'modena': 'Emilia-Romagna',
    'parma': 'Emilia-Romagna',
    'reggio emilia': 'Emilia-Romagna',
    'rimini': 'Emilia-Romagna',
    // Toscana
    'firenze': 'Toscana',
    'pisa': 'Toscana',
    'livorno': 'Toscana',
    'siena': 'Toscana',
    'arezzo': 'Toscana',
    // Sicilia
    'palermo': 'Sicilia',
    'catania': 'Sicilia',
    'messina': 'Sicilia',
    'siracusa': 'Sicilia',
    // Puglia
    'bari': 'Puglia',
    'lecce': 'Puglia',
    'taranto': 'Puglia',
    'foggia': 'Puglia',
    // Liguria
    'genova': 'Liguria',
    'la spezia': 'Liguria',
    'savona': 'Liguria',
    // Sardegna
    'cagliari': 'Sardegna',
    'sassari': 'Sardegna',
    // Altre
    'trieste': 'Friuli-Venezia Giulia',
    'udine': 'Friuli-Venezia Giulia',
    'trento': 'Trentino-Alto Adige',
    'bolzano': 'Trentino-Alto Adige',
    'ancona': 'Marche',
    'perugia': 'Umbria',
    'aosta': "Valle d'Aosta",
    'potenza': 'Basilicata',
    'catanzaro': 'Calabria',
    'reggio calabria': 'Calabria',
    'campobasso': 'Molise',
    "l'aquila": 'Abruzzo',
    'pescara': 'Abruzzo'
  }

  // Cerca match diretto
  for (const [cityName, region] of Object.entries(cityToRegion)) {
    if (cityLower.includes(cityName) || cityName.includes(cityLower)) {
      return region
    }
  }

  return null
}

/**
 * Calcola la distanza temporale in giorni
 */
function daysSince(dateStr: string | undefined): number {
  if (!dateStr) return 999
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Genera reason text dal punteggio
 */
function getReasonFromScore(score: number, breakdown: RelevanceBreakdown): string {
  if (score >= RELEVANCE_THRESHOLDS.PERFECT) {
    return 'Match perfetto!'
  }
  if (score >= RELEVANCE_THRESHOLDS.EXCELLENT) {
    return 'Ottima compatibilità'
  }
  if (score >= RELEVANCE_THRESHOLDS.GOOD) {
    return 'Molto compatibile'
  }
  if (score >= RELEVANCE_THRESHOLDS.FAIR) {
    return 'Parzialmente compatibile'
  }
  if (score >= RELEVANCE_THRESHOLDS.LOW) {
    return 'Match limitato'
  }
  return 'Non nel tuo target'
}

/**
 * Determina confidence level
 */
function getConfidence(
  score: number,
  breakdown: RelevanceBreakdown,
  hasProfile: boolean,
  hasBehavior: boolean
): 'high' | 'medium' | 'low' {
  // Se non ha profilo completo, confidence bassa
  if (!hasProfile) return 'low'

  // Se score alto e service match buono
  if (score >= 80 && breakdown.serviceMatch >= 30) {
    return 'high'
  }

  // Se score medio e almeno 2 fattori forti
  const strongFactors = [
    breakdown.serviceMatch >= 25,
    breakdown.budgetMatch >= 15,
    breakdown.locationMatch >= 10,
    breakdown.industryMatch >= 8
  ].filter(Boolean).length

  if (score >= 60 && strongFactors >= 2) {
    return 'medium'
  }

  return 'low'
}

// =====================================================
// MAIN CALCULATION FUNCTION
// =====================================================

/**
 * Calcola la rilevanza di un lead per un utente
 *
 * @param input - Dati lead, utente, profilo e comportamento
 * @returns LeadRelevance con score, breakdown e metadata
 */
export function calculateRelevanceScore(input: RelevanceInput): LeadRelevance {
  const { lead, user, profile, behavior } = input

  const breakdown: RelevanceBreakdown = {
    serviceMatch: 0,
    budgetMatch: 0,
    locationMatch: 0,
    industryMatch: 0,
    urgency: 0,
    behavioral: 0
  }

  let matchedServices: ServiceType[] = []

  // =====================================================
  // 1. SERVICE MATCH (40%)
  // =====================================================

  const detectedServices = detectServices(lead.analysis)
  const userServices = user.services_offered || []

  if (userServices.length === 0) {
    // Utente non ha configurato servizi -> neutro
    breakdown.serviceMatch = 50 * RELEVANCE_WEIGHTS.SERVICE_MATCH
  } else if (detectedServices.services.length === 0) {
    // Lead non ha servizi rilevati -> neutro
    breakdown.serviceMatch = 30 * RELEVANCE_WEIGHTS.SERVICE_MATCH
  } else {
    // Calcola match usando funzione esistente
    const matchResult = calculateMatch(detectedServices, userServices, {
      userMinBudget: user.preferred_min_budget,
      userMaxBudget: user.preferred_max_budget
    })

    matchedServices = matchResult.matchedServices

    // Base score from existing match calculation
    let serviceScore = matchResult.score

    // Bonus per skill level (se profilo disponibile)
    if (profile?.serviceSkillLevels) {
      let skillBonus = 0
      matchedServices.forEach(service => {
        const level = profile.serviceSkillLevels[service] as SkillLevel | undefined
        if (level === 3) skillBonus += 5  // Expert
        else if (level === 2) skillBonus += 2  // Intermedio
      })
      serviceScore = Math.min(100, serviceScore + skillBonus)
    }

    breakdown.serviceMatch = serviceScore * RELEVANCE_WEIGHTS.SERVICE_MATCH
  }

  // =====================================================
  // 2. BUDGET MATCH (20%)
  // =====================================================

  const leadBudget = detectedServices.totalBudget
  const userMinBudget = user.preferred_min_budget ?? 500
  const userMaxBudget = user.preferred_max_budget ?? 5000

  if (leadBudget.max === 0 || leadBudget.min === 0) {
    // Nessun budget stimato per il lead -> neutro
    breakdown.budgetMatch = 50 * RELEVANCE_WEIGHTS.BUDGET_MATCH
  } else {
    const leadMidpoint = (leadBudget.min + leadBudget.max) / 2
    const userMidpoint = (userMinBudget + userMaxBudget) / 2

    // Perfect match: lead budget nel range utente
    if (leadMidpoint >= userMinBudget && leadMidpoint <= userMaxBudget) {
      // Bonus se vicino al midpoint utente
      const distanceFromIdeal = Math.abs(leadMidpoint - userMidpoint)
      const rangeSize = userMaxBudget - userMinBudget
      const idealBonus = rangeSize > 0
        ? Math.max(0, 20 - (distanceFromIdeal / rangeSize) * 20)
        : 0

      breakdown.budgetMatch = (80 + idealBonus) * RELEVANCE_WEIGHTS.BUDGET_MATCH
    }
    // Partial match: lead budget vicino al range
    else if (
      leadMidpoint >= userMinBudget * 0.7 &&
      leadMidpoint <= userMaxBudget * 1.3
    ) {
      breakdown.budgetMatch = 60 * RELEVANCE_WEIGHTS.BUDGET_MATCH
    }
    // Budget troppo diverso
    else {
      const distance = leadMidpoint < userMinBudget
        ? (userMinBudget - leadMidpoint) / userMinBudget
        : (leadMidpoint - userMaxBudget) / userMaxBudget

      breakdown.budgetMatch = Math.max(0, 40 - distance * 30) * RELEVANCE_WEIGHTS.BUDGET_MATCH
    }
  }

  // =====================================================
  // 3. LOCATION MATCH (15%)
  // =====================================================

  const leadCity = lead.city?.toLowerCase().trim() || ''
  const preferredCities = profile?.preferredCities?.map(c => c.toLowerCase().trim()) || []
  const preferredRegions = profile?.preferredRegions?.map(r => r.toLowerCase().trim()) || []
  const isRemoteOnly = profile?.isRemoteOnly ?? false

  if (preferredCities.length === 0 && preferredRegions.length === 0) {
    // Nessuna preferenza location -> neutro (o bonus se remote)
    breakdown.locationMatch = (isRemoteOnly ? 80 : 50) * RELEVANCE_WEIGHTS.LOCATION_MATCH
  } else {
    // Check città esatta
    const cityMatch = preferredCities.some(pc =>
      leadCity.includes(pc) || pc.includes(leadCity)
    )

    if (cityMatch) {
      breakdown.locationMatch = 100 * RELEVANCE_WEIGHTS.LOCATION_MATCH
    } else {
      // Check regione
      const leadRegion = getRegionFromCity(leadCity)?.toLowerCase()
      const regionMatch = leadRegion && preferredRegions.some(pr =>
        pr.includes(leadRegion) || leadRegion.includes(pr)
      )

      if (regionMatch) {
        breakdown.locationMatch = 70 * RELEVANCE_WEIGHTS.LOCATION_MATCH
      } else if (isRemoteOnly) {
        // Lavora solo da remoto, location non importante
        breakdown.locationMatch = 60 * RELEVANCE_WEIGHTS.LOCATION_MATCH
      } else {
        breakdown.locationMatch = 20 * RELEVANCE_WEIGHTS.LOCATION_MATCH
      }
    }
  }

  // =====================================================
  // 4. INDUSTRY MATCH (10%)
  // =====================================================

  const leadCategory = lead.category?.toLowerCase().trim() || ''
  const preferredIndustries = profile?.preferredIndustries?.map(i => i.toLowerCase()) || []
  const excludedIndustries = profile?.excludedIndustries?.map(i => i.toLowerCase()) || []

  // Check esclusione (penalty forte)
  if (excludedIndustries.some(ei => leadCategory.includes(ei) || ei.includes(leadCategory))) {
    breakdown.industryMatch = 0 // Penalità massima
  }
  // Check preferenza
  else if (preferredIndustries.length === 0) {
    // Nessuna preferenza -> neutro
    breakdown.industryMatch = 50 * RELEVANCE_WEIGHTS.INDUSTRY_MATCH
  }
  else if (preferredIndustries.some(pi => leadCategory.includes(pi) || pi.includes(leadCategory))) {
    breakdown.industryMatch = 100 * RELEVANCE_WEIGHTS.INDUSTRY_MATCH
  }
  // Categoria non in preferiti ma nemmeno esclusa
  else {
    breakdown.industryMatch = 30 * RELEVANCE_WEIGHTS.INDUSTRY_MATCH
  }

  // =====================================================
  // 5. URGENCY SCORE (10%)
  // =====================================================

  // Score lead basso = più problemi = più urgente = migliore opportunità
  const leadScore = lead.score ?? 50

  if (leadScore <= 20) {
    // Critico - urgenza massima
    breakdown.urgency = 100 * RELEVANCE_WEIGHTS.URGENCY
  } else if (leadScore <= 35) {
    // Alto - buona urgenza
    breakdown.urgency = 85 * RELEVANCE_WEIGHTS.URGENCY
  } else if (leadScore <= 50) {
    // Medio - urgenza discreta
    breakdown.urgency = 70 * RELEVANCE_WEIGHTS.URGENCY
  } else if (leadScore <= 70) {
    // Basso - poca urgenza
    breakdown.urgency = 40 * RELEVANCE_WEIGHTS.URGENCY
  } else {
    // Minimo - sito già buono
    breakdown.urgency = 20 * RELEVANCE_WEIGHTS.URGENCY
  }

  // Bonus per lead freschi
  const daysOld = daysSince(lead.created_at)
  if (daysOld <= 1) {
    breakdown.urgency = Math.min(
      RELEVANCE_WEIGHTS.URGENCY * 100,
      breakdown.urgency + 2
    )
  } else if (daysOld <= 7) {
    breakdown.urgency = Math.min(
      RELEVANCE_WEIGHTS.URGENCY * 100,
      breakdown.urgency + 1
    )
  }

  // =====================================================
  // 6. BEHAVIORAL SIGNALS (5%)
  // =====================================================

  if (!behavior || behavior.totalConverted === 0) {
    // Nessun dato comportamentale -> neutro
    breakdown.behavioral = 50 * RELEVANCE_WEIGHTS.BEHAVIORAL
  } else {
    let behaviorScore = 50

    // Bonus se categoria già convertita
    if (behavior.convertedCategories?.some(cc =>
      leadCategory.includes(cc.toLowerCase()) || cc.toLowerCase().includes(leadCategory)
    )) {
      behaviorScore += 30
    }

    // Bonus se città già convertita
    if (behavior.convertedCities?.some(cc =>
      leadCity.includes(cc.toLowerCase()) || cc.toLowerCase().includes(leadCity)
    )) {
      behaviorScore += 20
    }

    breakdown.behavioral = Math.min(100, behaviorScore) * RELEVANCE_WEIGHTS.BEHAVIORAL
  }

  // =====================================================
  // CALCOLO FINALE
  // =====================================================

  const totalScore = Math.round(
    breakdown.serviceMatch +
    breakdown.budgetMatch +
    breakdown.locationMatch +
    breakdown.industryMatch +
    breakdown.urgency +
    breakdown.behavioral
  )

  const finalScore = Math.min(100, Math.max(0, totalScore))

  return {
    leadId: lead.id,
    score: finalScore,
    breakdown,
    matchedServices,
    reason: getReasonFromScore(finalScore, breakdown),
    confidence: getConfidence(finalScore, breakdown, !!profile, !!behavior)
  }
}

// =====================================================
// BATCH CALCULATION
// =====================================================

/**
 * Calcola relevance per multipli lead
 */
export function calculateRelevanceForLeads(
  leads: LeadForRelevance[],
  user: UserForRelevance,
  profile: UserProfile | null,
  behavior: UserBehaviorSummary | null
): LeadRelevance[] {
  return leads.map(lead =>
    calculateRelevanceScore({ lead, user, profile, behavior })
  )
}

/**
 * Ordina lead per relevance score (decrescente)
 */
export function sortLeadsByRelevance<T extends LeadForRelevance>(
  leads: T[],
  user: UserForRelevance,
  profile: UserProfile | null,
  behavior: UserBehaviorSummary | null
): Array<{ lead: T; relevance: LeadRelevance }> {
  const withRelevance = leads.map(lead => ({
    lead,
    relevance: calculateRelevanceScore({ lead, user, profile, behavior })
  }))

  return withRelevance.sort((a, b) => b.relevance.score - a.relevance.score)
}

/**
 * Filtra lead per score minimo
 */
export function filterLeadsByMinRelevance<T extends LeadForRelevance>(
  leads: T[],
  user: UserForRelevance,
  profile: UserProfile | null,
  behavior: UserBehaviorSummary | null,
  minScore: number
): Array<{ lead: T; relevance: LeadRelevance }> {
  return sortLeadsByRelevance(leads, user, profile, behavior)
    .filter(item => item.relevance.score >= minScore)
}

// =====================================================
// UTILITY EXPORTS
// =====================================================

export {
  getReasonFromScore,
  getConfidence
}
