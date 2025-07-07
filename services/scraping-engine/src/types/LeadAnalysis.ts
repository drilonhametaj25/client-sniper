/**
 * Definizioni TypeScript per l'analisi completa dei lead
 * Usato dal sistema di scraping migliorato per tipizzare tutti i dati estratti
 * Include performance, SEO, GDPR, presenza digitale e legalità italiana
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
}

export interface BusinessLead {
  // Dati base del business
  businessName: string
  category: string
  city: string
  source: string // 'google_maps', 'yelp', etc.
  
  // Informazioni di contatto
  contacts: ContactInfo
  
  // Analisi del sito web (se presente)
  websiteAnalysis?: WebsiteAnalysis
  analysis?: WebsiteAnalysis
  
  // Punteggio e classificazione
  score: number // 0-100 (più basso = più problemi = migliore opportunità)
  priority: 'high' | 'medium' | 'low'
  
  // Opportunità identificate
  opportunities: string[]
  
  // Ruoli professionali che potrebbero aiutare
  suggestedRoles: ('web-developer' | 'seo-specialist' | 'designer' | 'marketing-specialist' | 'legal-consultant')[]
  
  // Metadati
  scrapedAt: Date
  lastAnalyzed?: Date
}

export interface ScrapingResult {
  success: boolean
  leads: BusinessLead[]
  errors: string[]
  totalFound: number
  totalAnalyzed: number
  avgAnalysisTime: number
  source: string
  query: string
  location: string
}
