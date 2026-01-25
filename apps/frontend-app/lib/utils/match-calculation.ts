/**
 * Match Calculation
 *
 * Calcola la compatibilità tra un lead e il profilo servizi dell'utente.
 * Usato per ordinare/filtrare lead in base alla rilevanza per l'utente.
 */

import {
  ServiceType,
  DetectedServices,
  MatchResult
} from '@/lib/types/services'

/**
 * Calcola il match tra i servizi richiesti da un lead e i servizi offerti dall'utente
 *
 * @param leadServices - Servizi rilevati per il lead
 * @param userServices - Servizi offerti dall'utente
 * @param options - Opzioni aggiuntive (budget range, location preferences)
 */
export function calculateMatch(
  leadServices: DetectedServices,
  userServices: ServiceType[],
  options?: {
    userMinBudget?: number
    userMaxBudget?: number
  }
): MatchResult {
  // Se utente non ha configurato servizi, default 50% (neutro)
  if (!userServices || userServices.length === 0) {
    return {
      score: 50,
      matchedServices: [],
      unmatchedServices: leadServices.services.map(s => s.type),
      reason: 'Configura i tuoi servizi per vedere il match'
    }
  }

  // Se lead non ha servizi rilevati
  if (!leadServices.services || leadServices.services.length === 0) {
    return {
      score: 0,
      matchedServices: [],
      unmatchedServices: [],
      reason: 'Nessun servizio rilevato per questo lead'
    }
  }

  const leadServiceTypes = leadServices.services.map(s => s.type)

  // Calcola servizi matchati e non matchati
  const matchedServices = leadServiceTypes.filter(service =>
    userServices.includes(service)
  )

  const unmatchedServices = leadServiceTypes.filter(service =>
    !userServices.includes(service)
  )

  // EARLY RETURN: Se NESSUN servizio corrisponde → 0% match
  if (matchedServices.length === 0) {
    return {
      score: 0,
      matchedServices: [],
      unmatchedServices,
      reason: 'Nessun servizio corrisponde al tuo profilo'
    }
  }

  // ===== CALCOLO SCORE =====
  let score = 0

  // 1. Base match: % servizi lead che user offre (60% peso)
  const serviceMatchPercent = (matchedServices.length / leadServiceTypes.length) * 100
  score += serviceMatchPercent * 0.6

  // 2. Bonus se match servizio primario (20% peso)
  if (leadServices.primaryService && userServices.includes(leadServices.primaryService)) {
    score += 20
  }

  // 3. Bonus budget (20% peso)
  if (options?.userMinBudget !== undefined && options?.userMaxBudget !== undefined) {
    const leadBudget = leadServices.totalBudget
    const budgetInRange =
      leadBudget.min >= options.userMinBudget * 0.8 && // 20% tolerance
      leadBudget.max <= options.userMaxBudget * 1.2

    if (budgetInRange) {
      score += 20
    } else if (leadBudget.min >= options.userMinBudget * 0.5) {
      // Partial match
      score += 10
    }
  } else {
    // Default bonus se no preferenze budget
    score += 10
  }

  // 4. Bonus per alta priorità match (extra)
  const highPriorityMatched = leadServices.services
    .filter(s => s.priority === 'high' && userServices.includes(s.type))
    .length

  if (highPriorityMatched > 0) {
    score += Math.min(highPriorityMatched * 5, 10) // Max +10 extra
  }

  // Clamp score 0-100
  score = Math.round(Math.max(0, Math.min(100, score)))

  // ===== DETERMINA REASON =====
  let reason: string

  if (score >= 90) {
    reason = 'Match perfetto!'
  } else if (score >= 80) {
    reason = 'Ottima compatibilità'
  } else if (score >= 70) {
    reason = 'Molto compatibile'
  } else if (score >= 50) {
    reason = 'Parzialmente compatibile'
  } else if (score >= 30) {
    reason = 'Match limitato'
  } else {
    reason = 'Non nel tuo target'
  }

  return {
    score,
    matchedServices,
    unmatchedServices,
    reason
  }
}

/**
 * Versione semplificata per UI veloce
 */
export function getQuickMatchScore(
  leadServices: DetectedServices,
  userServices: ServiceType[]
): number {
  const result = calculateMatch(leadServices, userServices)
  return result.score
}

/**
 * Determina il colore del badge match basato sullo score
 */
export function getMatchColor(score: number): {
  bgColor: string
  textColor: string
  borderColor: string
} {
  if (score >= 80) {
    return {
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      textColor: 'text-green-700 dark:text-green-400',
      borderColor: 'border-green-200 dark:border-green-800'
    }
  }
  if (score >= 60) {
    return {
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      textColor: 'text-blue-700 dark:text-blue-400',
      borderColor: 'border-blue-200 dark:border-blue-800'
    }
  }
  if (score >= 40) {
    return {
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      textColor: 'text-yellow-700 dark:text-yellow-400',
      borderColor: 'border-yellow-200 dark:border-yellow-800'
    }
  }
  return {
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-600 dark:text-gray-400',
    borderColor: 'border-gray-200 dark:border-gray-700'
  }
}

/**
 * Icona match basata sullo score
 */
export function getMatchIcon(score: number): string {
  if (score >= 80) return '🎯'
  if (score >= 60) return '✓'
  if (score >= 40) return '~'
  return '•'
}

/**
 * Filtra lead per match minimo
 */
export function filterByMinMatch<T extends { detectedServices?: DetectedServices }>(
  leads: T[],
  userServices: ServiceType[],
  minMatch: number
): T[] {
  return leads.filter(lead => {
    if (!lead.detectedServices) return false
    const match = calculateMatch(lead.detectedServices, userServices)
    return match.score >= minMatch
  })
}

/**
 * Ordina lead per match score (decrescente)
 */
export function sortByMatch<T extends { analysis?: any }>(
  leads: T[],
  userServices: ServiceType[],
  detectServicesFn: (analysis: any) => DetectedServices
): T[] {
  return [...leads].sort((a, b) => {
    const aServices = detectServicesFn(a.analysis)
    const bServices = detectServicesFn(b.analysis)
    const aMatch = calculateMatch(aServices, userServices)
    const bMatch = calculateMatch(bServices, userServices)
    return bMatch.score - aMatch.score
  })
}
