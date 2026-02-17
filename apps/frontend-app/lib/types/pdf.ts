/**
 * Types for PDF Report Generation
 */

export interface BrandingConfig {
  companyName: string
  companyLogo?: string // base64 or URL
  primaryColor: string
  secondaryColor: string
  accentColor: string
  contactEmail?: string
  contactPhone?: string
  website?: string
  footerText?: string
}

export interface ReportMetadata {
  reportTitle: string
  reportDate: Date
  reportId: string
  preparedBy?: string
  preparedFor?: string
}

export interface ScoreCardData {
  label: string
  score: number
  maxScore: number
  status: 'critical' | 'poor' | 'fair' | 'good' | 'excellent'
  description?: string
}

export interface IssueItem {
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  recommendation?: string
}

export interface OpportunityItem {
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  estimatedImpact?: string
}

export interface AuditReportData {
  metadata: ReportMetadata
  branding: BrandingConfig
  businessInfo: {
    name: string
    website: string
    city?: string
    category?: string
  }
  scores: {
    overall: number
    seo: number
    performance: number
    mobile: number
    tracking: number
    gdpr: number
    security: number
  }
  details: {
    seo: {
      hasTitle: boolean
      titleLength: number
      hasMetaDescription: boolean
      metaDescriptionLength: number
      hasH1: boolean
      h1Count: number
      hasStructuredData: boolean
    }
    performance: {
      loadTime: number
      isResponsive: boolean
      totalImages: number
      brokenImages: number
    }
    tracking: {
      hasGoogleAnalytics: boolean
      hasFacebookPixel: boolean
      hasGoogleTagManager: boolean
      hasHotjar: boolean
    }
    gdpr: {
      hasCookieBanner: boolean
      hasPrivacyPolicy: boolean
    }
    security: {
      hasSSL: boolean
      httpsIssues: boolean
    }
  }
  issues: IssueItem[]
  opportunities: OpportunityItem[]
}

// Default branding generico (senza menzione TrovaMi)
// L'API sovrascriverà con i dati del profilo utente se disponibili
export const defaultBranding: BrandingConfig = {
  companyName: 'Studio Digitale',
  primaryColor: '#2563EB', // Blue 600
  secondaryColor: '#1E40AF', // Blue 800
  accentColor: '#F59E0B', // Amber 500
  contactEmail: '',
  website: '',
  footerText: '' // Verrà generato dinamicamente con il nome azienda utente
}
