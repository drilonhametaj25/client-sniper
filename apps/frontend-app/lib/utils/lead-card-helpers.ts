/**
 * Helper functions per i componenti LeadCard
 * Funzioni per calcolo criticità, formattazione date, colori
 */

/**
 * Ritorna il colore di criticità basato sullo score
 * Score basso = più critico (più opportunità per agenzie digitali)
 * 0-30: rosso (critico), 31-60: arancione (medio), 61-80: giallo (ok), 81-100: verde (ottimo)
 */
export function getCriticityColor(score: number): {
  bg: string
  text: string
  border: string
  label: string
  priority: 'critical' | 'medium' | 'low' | 'good'
} {
  if (score <= 30) {
    return {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800',
      label: 'Critico',
      priority: 'critical'
    }
  }
  if (score <= 60) {
    return {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-700 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-800',
      label: 'Migliorabile',
      priority: 'medium'
    }
  }
  if (score <= 80) {
    return {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-800',
      label: 'Discreto',
      priority: 'low'
    }
  }
  return {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
    label: 'Ottimo',
    priority: 'good'
  }
}

/**
 * Ritorna il colore per la progress bar dello score
 */
export function getScoreBarColor(score: number): string {
  if (score <= 30) return 'bg-red-500'
  if (score <= 60) return 'bg-orange-500'
  if (score <= 80) return 'bg-yellow-500'
  return 'bg-green-500'
}

/**
 * Formatta la data di scansione in modo leggibile
 */
export function formatScanDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  // Meno di 24 ore fa
  if (diffHours < 24) {
    if (diffHours < 1) {
      const minutes = Math.floor(diffMs / (1000 * 60))
      return `${minutes} min fa`
    }
    return `${Math.floor(diffHours)} ore fa`
  }

  // Meno di 7 giorni
  if (diffDays < 7) {
    return `${Math.floor(diffDays)} giorni fa`
  }

  // Altrimenti mostra data completa
  return date.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

/**
 * Ritorna badge di freschezza
 */
export function getFreshnessBadge(dateString: string | Date): {
  label: string
  color: string
  show: boolean
} {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  const now = new Date()
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

  if (diffHours < 24) {
    return {
      label: 'Nuovo',
      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      show: true
    }
  }
  if (diffHours < 72) {
    return {
      label: 'Recente',
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      show: true
    }
  }
  return { label: '', color: '', show: false }
}

/**
 * Estrae i dati disponibili da un lead per la preview
 */
export interface LeadAvailableData {
  hasPhone: boolean
  hasEmail: boolean
  hasAddress: boolean
  hasWebsite: boolean
  hasSocial: boolean
  socialCount: number
  socialPlatforms: string[]
}

export function extractAvailableData(lead: {
  phone?: string
  email?: string
  address?: string
  website_url?: string
  analysis?: any
  website_analysis?: any
}): LeadAvailableData {
  const analysis = lead.website_analysis || lead.analysis

  // Estrai social platforms
  const socialPlatforms: string[] = []
  const social = analysis?.social || analysis?.content

  if (social) {
    const platforms = social.platforms || social
    if (platforms?.facebook || social?.socialLinks?.some((l: string) => l.includes('facebook'))) socialPlatforms.push('facebook')
    if (platforms?.instagram || social?.socialLinks?.some((l: string) => l.includes('instagram'))) socialPlatforms.push('instagram')
    if (platforms?.linkedin || social?.socialLinks?.some((l: string) => l.includes('linkedin'))) socialPlatforms.push('linkedin')
    if (platforms?.twitter || social?.socialLinks?.some((l: string) => l.includes('twitter'))) socialPlatforms.push('twitter')
    if (platforms?.youtube || social?.socialLinks?.some((l: string) => l.includes('youtube'))) socialPlatforms.push('youtube')
    if (platforms?.tiktok || social?.socialLinks?.some((l: string) => l.includes('tiktok'))) socialPlatforms.push('tiktok')
  }

  return {
    hasPhone: !!lead.phone,
    hasEmail: !!lead.email,
    hasAddress: !!lead.address,
    hasWebsite: !!lead.website_url,
    hasSocial: socialPlatforms.length > 0 || (social?.hasAnySocial === true),
    socialCount: socialPlatforms.length || (social?.socialCount ?? 0),
    socialPlatforms
  }
}

/**
 * Genera i badge da mostrare (max 3)
 */
export interface LeadBadge {
  label: string
  color: string
  icon?: string
}

export function generateLeadBadges(lead: {
  city?: string
  category?: string
  created_at?: string
  score?: number
}, maxBadges: number = 3): LeadBadge[] {
  const badges: LeadBadge[] = []

  // 1. Badge criticità (priorità alta)
  if (lead.score !== undefined) {
    const criticality = getCriticityColor(lead.score)
    badges.push({
      label: criticality.label,
      color: `${criticality.bg} ${criticality.text}`,
      icon: 'alert'
    })
  }

  // 2. Badge freschezza (se nuovo/recente)
  if (lead.created_at) {
    const freshness = getFreshnessBadge(lead.created_at)
    if (freshness.show) {
      badges.push({
        label: freshness.label,
        color: freshness.color,
        icon: 'clock'
      })
    }
  }

  // 3. Categoria
  if (lead.category && badges.length < maxBadges) {
    badges.push({
      label: lead.category,
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      icon: 'tag'
    })
  }

  return badges.slice(0, maxBadges)
}

/**
 * Costanti CRM status
 */
export const CRM_STATUS_CONFIG = {
  new: { label: 'Nuovo', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  to_contact: { label: 'Da contattare', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  contacted: { label: 'Contattato', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' },
  in_negotiation: { label: 'In trattativa', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' },
  won: { label: 'Vinto', color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
  lost: { label: 'Perso', color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' }
} as const

export type CrmStatus = keyof typeof CRM_STATUS_CONFIG
