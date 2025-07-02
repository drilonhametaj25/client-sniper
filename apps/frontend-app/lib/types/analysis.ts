/**
 * Tipi per l'analisi dei siti web - copiati dal backend scraping-engine
 * Usati per l'analisi manuale e la tipizzazione dei risultati
 * Mantiene compatibilità con il backend senza dipendenze cross-package
 */

export interface ContactInfo {
  phone?: string
  email?: string
  website?: string
  address?: string
  partitaIva?: string
}

export interface PerformanceMetrics {
  loadTime: number // millisecondi
  totalImages: number
  brokenImages: number
  averageImageSize?: number // KB
  networkRequests?: number
  isResponsive: boolean
}

export interface SEOAnalysis {
  hasTitle: boolean
  titleLength: number
  hasMetaDescription: boolean
  metaDescriptionLength: number
  hasH1: boolean
  h1Count: number
  hasStructuredData: boolean
}

export interface TrackingAnalysis {
  hasGoogleAnalytics: boolean
  hasFacebookPixel: boolean
  hasGoogleTagManager: boolean
  hasHotjar: boolean
  hasClarityMicrosoft: boolean
  customTracking: string[] // altri script di tracking rilevati
}

export interface GDPRCompliance {
  hasCookieBanner: boolean
  hasPrivacyPolicy: boolean
  privacyPolicyUrl?: string
  hasTermsOfService: boolean
  cookieConsentMethod?: 'banner' | 'popup' | 'none'
  riskyEmbeds: string[] // iframe senza consenso (YouTube, etc)
}

export interface LegalCompliance {
  hasVisiblePartitaIva: boolean
  partitaIvaLocation?: 'footer' | 'header' | 'contact' | 'privacy'
  hasBusinessAddress: boolean
  hasContactInfo: boolean
  complianceScore: number // 0-100
}

export interface SocialPresence {
  facebook?: string
  instagram?: string
  linkedin?: string
  tiktok?: string
  youtube?: string
  twitter?: string
  hasAnySocial: boolean
  socialCount: number
}

export interface TechnicalIssues {
  missingTitle: boolean
  shortTitle: boolean // <30 caratteri
  missingMetaDescription: boolean
  shortMetaDescription: boolean // <50 caratteri
  missingH1: boolean
  brokenImages: boolean
  slowLoading: boolean
  noTracking: boolean
  noCookieConsent: boolean
  missingPartitaIva: boolean
  noSocialPresence: boolean
  httpsIssues: boolean
}

export interface WebsiteAnalysis {
  url: string
  finalUrl?: string // dopo redirect
  isAccessible: boolean
  httpStatus: number
  redirectChain: string[]
  performance: PerformanceMetrics
  seo: SEOAnalysis
  tracking: TrackingAnalysis
  gdpr: GDPRCompliance
  legal: LegalCompliance
  social: SocialPresence
  issues: TechnicalIssues
  overallScore: number // 0-100
  analysisDate: Date
  analysisTime: number // millisecondi per completare l'analisi
  analysisType?: 'full' | 'simplified' // tipo di analisi effettuata
}

export interface LeadData {
  id?: string
  business_name?: string
  website_url: string
  city?: string
  category?: string
  score: number
  analysis: WebsiteAnalysis
  assigned_to?: string
  origin: 'scraping' | 'manual'
  created_at?: Date
  unique_key: string
  content_hash: string
}
