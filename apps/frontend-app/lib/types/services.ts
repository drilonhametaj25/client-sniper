/**
 * Service Types and Detection
 *
 * Definisce i tipi di servizi che possono essere rilevati dall'analisi
 * di un sito web e le strutture dati associate.
 */

/**
 * Tipi di servizi offerti/richiesti
 */
export type ServiceType =
  | 'seo'
  | 'gdpr'
  | 'analytics'
  | 'mobile'
  | 'performance'
  | 'development'
  | 'design'
  | 'social'

/**
 * Configurazione visiva per ogni tipo di servizio
 */
export interface ServiceConfig {
  type: ServiceType
  icon: string
  label: string
  color: string
  bgColor: string
  textColor: string
  borderColor: string
  baseBudget: {
    min: number
    max: number
  }
  description: string
}

/**
 * Servizio rilevato con priorità e dettagli
 */
export interface ServiceTag {
  type: ServiceType
  priority: 'high' | 'medium' | 'low'
  issueCount: number
  estimatedBudget: {
    min: number
    max: number
  }
  specificIssues: string[]
}

/**
 * Risultato completo del service detection
 */
export interface DetectedServices {
  services: ServiceTag[]
  totalBudget: {
    min: number
    max: number
  }
  primaryService: ServiceType | null
}

/**
 * Risultato del match calculation
 */
export interface MatchResult {
  score: number // 0-100
  matchedServices: ServiceType[]
  unmatchedServices: ServiceType[]
  reason: string
}

/**
 * Configurazione completa per tutti i servizi
 */
export const SERVICE_CONFIGS: Record<ServiceType, ServiceConfig> = {
  seo: {
    type: 'seo',
    icon: '📊',
    label: 'SEO',
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800',
    baseBudget: { min: 400, max: 1200 },
    description: 'Ottimizzazione per motori di ricerca'
  },
  gdpr: {
    type: 'gdpr',
    icon: '⚖️',
    label: 'GDPR',
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-800',
    baseBudget: { min: 400, max: 800 },
    description: 'Privacy e conformità legale'
  },
  analytics: {
    type: 'analytics',
    icon: '📈',
    label: 'Analytics',
    color: 'purple',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-700 dark:text-purple-400',
    borderColor: 'border-purple-200 dark:border-purple-800',
    baseBudget: { min: 300, max: 600 },
    description: 'Tracking e analisi dati'
  },
  mobile: {
    type: 'mobile',
    icon: '📱',
    label: 'Mobile',
    color: 'green',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    borderColor: 'border-green-200 dark:border-green-800',
    baseBudget: { min: 600, max: 1500 },
    description: 'Ottimizzazione mobile'
  },
  performance: {
    type: 'performance',
    icon: '⚡',
    label: 'Performance',
    color: 'yellow',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    baseBudget: { min: 500, max: 1200 },
    description: 'Velocità e ottimizzazione'
  },
  development: {
    type: 'development',
    icon: '💻',
    label: 'Development',
    color: 'gray',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-700 dark:text-gray-300',
    borderColor: 'border-gray-200 dark:border-gray-700',
    baseBudget: { min: 2000, max: 5000 },
    description: 'Sviluppo e redesign'
  },
  design: {
    type: 'design',
    icon: '🎨',
    label: 'Design',
    color: 'pink',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    textColor: 'text-pink-700 dark:text-pink-400',
    borderColor: 'border-pink-200 dark:border-pink-800',
    baseBudget: { min: 800, max: 2000 },
    description: 'UI/UX e visual design'
  },
  social: {
    type: 'social',
    icon: '👥',
    label: 'Social',
    color: 'cyan',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    textColor: 'text-cyan-700 dark:text-cyan-400',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    baseBudget: { min: 300, max: 800 },
    description: 'Social media integration'
  }
}

/**
 * Lista ordinata dei servizi (per UI)
 */
export const SERVICE_LIST: ServiceType[] = [
  'seo',
  'gdpr',
  'analytics',
  'mobile',
  'performance',
  'development',
  'design',
  'social'
]

/**
 * Helper per ottenere la config di un servizio
 */
export function getServiceConfig(type: ServiceType): ServiceConfig {
  return SERVICE_CONFIGS[type]
}

/**
 * Helper per formattare il budget
 */
export function formatBudget(budget: { min: number; max: number }): string {
  return `€${budget.min.toLocaleString('it-IT')}-${budget.max.toLocaleString('it-IT')}`
}
