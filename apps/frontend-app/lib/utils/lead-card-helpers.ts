/**
 * Helper functions per i componenti LeadCard
 * Funzioni per calcolo criticità, formattazione date, problemi, budget stimato
 */

import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react'

/**
 * Configurazione criticità basata sullo score
 * Score basso = più critico (più opportunità per agenzie digitali)
 */
export function getCriticalityConfig(score: number): {
  variant: 'destructive' | 'warning' | 'default' | 'success'
  label: string
  color: string
  bgColor: string
  textColor: string
  borderColor: string
  icon: typeof AlertCircle
} {
  if (score <= 30) {
    return {
      variant: 'destructive',
      label: 'Critico',
      color: 'red',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      textColor: 'text-red-700 dark:text-red-400',
      borderColor: 'border-red-200 dark:border-red-800',
      icon: AlertCircle
    }
  }
  if (score <= 60) {
    return {
      variant: 'warning',
      label: 'Attenzione',
      color: 'orange',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      textColor: 'text-orange-700 dark:text-orange-400',
      borderColor: 'border-orange-200 dark:border-orange-800',
      icon: AlertTriangle
    }
  }
  if (score <= 80) {
    return {
      variant: 'default',
      label: 'Migliorabile',
      color: 'yellow',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      textColor: 'text-yellow-700 dark:text-yellow-400',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      icon: Info
    }
  }
  return {
    variant: 'success',
    label: 'Buono',
    color: 'green',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    borderColor: 'border-green-200 dark:border-green-800',
    icon: CheckCircle
  }
}

/**
 * Colore progress bar basato su score
 */
export function getScoreBarColor(score: number): string {
  if (score <= 30) return 'bg-red-500'
  if (score <= 60) return 'bg-orange-500'
  if (score <= 80) return 'bg-yellow-500'
  return 'bg-green-500'
}

/**
 * Formatta la data in modo leggibile
 */
export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Ritorna tempo relativo (es. "3 ore fa")
 */
export function getTimeAgo(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 60) return `${diffMinutes} min fa`
  if (diffHours < 24) return `${diffHours} ore fa`
  if (diffDays < 7) return `${diffDays} giorni fa`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} settimane fa`
  return `${Math.floor(diffDays / 30)} mesi fa`
}

/**
 * Verifica se il lead è "nuovo" (< 7 giorni)
 */
export function isNewLead(dateString: string | Date): boolean {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  const now = new Date()
  const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays < 7
}

/**
 * Estrae i dati disponibili da un lead
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

  // Check social presence
  const social = analysis?.social || analysis?.content
  const hasSocial = social?.hasAnySocial ||
    (social?.socialLinks && social.socialLinks.length > 0) ||
    (social?.platforms && Object.values(social.platforms).some(Boolean))

  // Extract social platforms
  const socialPlatforms: string[] = []
  if (social?.platforms) {
    const platformNames = ['facebook', 'instagram', 'linkedin', 'twitter', 'youtube', 'tiktok']
    for (const name of platformNames) {
      if (social.platforms[name]) {
        socialPlatforms.push(name)
      }
    }
  } else if (social?.socialLinks) {
    for (const link of social.socialLinks) {
      const url = typeof link === 'string' ? link : link?.url || ''
      if (url.includes('facebook')) socialPlatforms.push('facebook')
      else if (url.includes('instagram')) socialPlatforms.push('instagram')
      else if (url.includes('linkedin')) socialPlatforms.push('linkedin')
      else if (url.includes('twitter') || url.includes('x.com')) socialPlatforms.push('twitter')
      else if (url.includes('youtube')) socialPlatforms.push('youtube')
      else if (url.includes('tiktok')) socialPlatforms.push('tiktok')
    }
  }

  return {
    hasPhone: !!(lead.phone && lead.phone.trim() !== ''),
    hasEmail: !!(lead.email && lead.email.trim() !== '' && lead.email !== 'null'),
    hasAddress: !!(lead.address && lead.address.trim() !== ''),
    hasWebsite: !!(lead.website_url && lead.website_url.trim() !== ''),
    hasSocial: !!hasSocial,
    socialCount: socialPlatforms.length,
    socialPlatforms
  }
}

/**
 * Conta dati disponibili
 */
export function getAvailableDataCount(data: LeadAvailableData): number {
  return [data.hasPhone, data.hasEmail, data.hasAddress, data.hasWebsite, data.hasSocial]
    .filter(Boolean).length
}

/**
 * Chiavi boolean dei dati disponibili (escluse socialCount e socialPlatforms)
 */
export type LeadDataKey = 'hasPhone' | 'hasEmail' | 'hasAddress' | 'hasWebsite' | 'hasSocial'

/**
 * Etichette per i dati disponibili
 */
export const DATA_LABELS: Record<LeadDataKey, string> = {
  hasPhone: 'Telefono',
  hasEmail: 'Email',
  hasAddress: 'Indirizzo',
  hasWebsite: 'Sito Web',
  hasSocial: 'Social'
}

/**
 * Icone per i dati disponibili (emoji per semplicità)
 */
export const DATA_ICONS: Record<LeadDataKey, string> = {
  hasPhone: '📞',
  hasEmail: '📧',
  hasAddress: '📍',
  hasWebsite: '🌐',
  hasSocial: '👥'
}

/**
 * Estrae i problemi dall'analisi
 */
export interface LeadProblems {
  high: number
  medium: number
  low: number
  total: number
  topIssues: string[]
}

export function extractProblems(analysis: any): LeadProblems {
  if (!analysis) {
    return { high: 0, medium: 0, low: 0, total: 0, topIssues: [] }
  }

  const issues = analysis.issues || {}
  const topIssues: string[] = []

  // Count by severity
  const critical = issues.critical || []
  const high = issues.high || []
  const medium = issues.medium || []
  const low = issues.low || []

  // Collect top issues from various sources
  if (!analysis.seo?.hasTitle) topIssues.push('Tag Title mancante')
  if (!analysis.seo?.hasMetaDescription) topIssues.push('Meta description mancante')
  if (!analysis.seo?.hasH1) topIssues.push('Tag H1 mancante')
  if (!analysis.tracking?.googleAnalytics && !analysis.tracking?.hasGoogleAnalytics) {
    topIssues.push('Google Analytics non installato')
  }
  if (!analysis.tracking?.facebookPixel && !analysis.tracking?.hasFacebookPixel) {
    topIssues.push('Facebook Pixel mancante')
  }
  if (!analysis.gdpr?.hasPrivacyPolicy) topIssues.push('Privacy Policy assente')
  if (!analysis.gdpr?.hasCookieBanner) topIssues.push('Cookie Banner mancante')
  if (!analysis.hasSSL && analysis.hasSSL !== undefined) topIssues.push('HTTPS non attivo')
  if (analysis.performance?.loadTime > 3000) topIssues.push('Sito lento (>3s)')
  if (!analysis.mobile?.isMobileFriendly) topIssues.push('Non mobile-friendly')

  // Add issues from arrays
  topIssues.push(...critical.slice(0, 2), ...high.slice(0, 2))

  const highCount = critical.length + high.length
  const mediumCount = medium.length
  const lowCount = low.length

  // If no structured issues, estimate from score and checks
  if (highCount === 0 && mediumCount === 0 && lowCount === 0) {
    const estimatedHigh = topIssues.filter(i =>
      i.includes('mancante') || i.includes('assente') || i.includes('non attivo')
    ).length
    const estimatedMedium = topIssues.filter(i =>
      i.includes('lento') || i.includes('mobile')
    ).length

    return {
      high: Math.max(estimatedHigh, Math.min(topIssues.length, 3)),
      medium: estimatedMedium,
      low: Math.max(0, topIssues.length - estimatedHigh - estimatedMedium),
      total: topIssues.length,
      topIssues: topIssues.slice(0, 5)
    }
  }

  return {
    high: highCount,
    medium: mediumCount,
    low: lowCount,
    total: highCount + mediumCount + lowCount,
    topIssues: topIssues.slice(0, 5)
  }
}

/**
 * Stima budget potenziale basato su score e problemi
 */
export function estimateBudget(score: number, problems: LeadProblems): string | null {
  if (score > 80) return null // Sito già buono

  const baseMin = 500
  const baseMax = 800

  // Più problemi = budget più alto
  const multiplier = 1 + (problems.high * 0.3) + (problems.medium * 0.15) + (problems.low * 0.05)

  // Score basso = budget più alto
  const scoreMultiplier = score <= 30 ? 1.5 : score <= 60 ? 1.2 : 1

  const min = Math.round((baseMin * multiplier * scoreMultiplier) / 100) * 100
  const max = Math.round((baseMax * multiplier * scoreMultiplier) / 100) * 100

  return `€${min.toLocaleString('it-IT')}-${max.toLocaleString('it-IT')}`
}

/**
 * Estrae dominio da URL
 */
export function getDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
    return parsed.hostname.replace('www.', '')
  } catch {
    return url.replace(/^https?:\/\//, '').replace('www.', '').split('/')[0]
  }
}

/**
 * Formatta location completa
 */
export function formatLocation(lead: {
  city?: string
  address?: string
}): string {
  const parts: string[] = []
  if (lead.city) parts.push(lead.city)
  return parts.join(', ') || 'Posizione non disponibile'
}

/**
 * CRM Status config
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
