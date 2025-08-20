/**
 * Helper functions per la gestione dei piani utente
 * Gestisce la logica di controllo piani con supporto per nuova nomenclatura
 * 
 * Utilizzato da: Tutti i componenti che verificano piani utente
 * Dipende da: Nessuna dipendenza specifica
 */

export type PlanType = 'free' | 'starter' | 'pro' | 'agency'

/**
 * Estrae il tipo base di piano rimuovendo suffissi _monthly/_annual
 */
export function getBasePlanType(planName: string): PlanType {
  if (!planName) return 'free'
  
  const baseName = planName.replace('_monthly', '').replace('_annual', '')
  
  switch (baseName) {
    case 'starter':
      return 'starter'
    case 'pro':
      return 'pro'
    case 'agency':
      return 'agency'
    default:
      return 'free'
  }
}

/**
 * Verifica se l'utente ha un piano specifico (ignora monthly/annual)
 */
export function hasPlan(userPlan: string, requiredPlan: PlanType): boolean {
  const userBasePlan = getBasePlanType(userPlan)
  return userBasePlan === requiredPlan
}

/**
 * Verifica se l'utente ha almeno un certo livello di piano
 */
export function hasMinimumPlan(userPlan: string, minimumPlan: PlanType): boolean {
  const userBasePlan = getBasePlanType(userPlan)
  
  const planLevels: Record<PlanType, number> = {
    'free': 0,
    'starter': 1,
    'pro': 2,
    'agency': 3
  }
  
  return planLevels[userBasePlan] >= planLevels[minimumPlan]
}

/**
 * Verifica se l'utente ha uno dei piani specificati
 */
export function hasAnyPlan(userPlan: string, allowedPlans: PlanType[]): boolean {
  const userBasePlan = getBasePlanType(userPlan)
  return allowedPlans.includes(userBasePlan)
}

/**
 * Verifica se il piano è pro o superiore (pro/agency)
 */
export function isProOrHigher(userPlan: string): boolean {
  return hasMinimumPlan(userPlan, 'pro')
}

/**
 * Verifica se il piano è starter o superiore (starter/pro/agency)
 */
export function isStarterOrHigher(userPlan: string): boolean {
  return hasMinimumPlan(userPlan, 'starter')
}
