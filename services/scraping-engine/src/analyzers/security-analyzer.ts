/**
 * Security Analyzer per Client Sniper
 * Analizza la sicurezza di un sito web: headers, SSL, vulnerabilità comuni
 */

import axios from 'axios'

export interface SecurityHeadersAnalysis {
  hasCSP: boolean                    // Content-Security-Policy
  hasXFrameOptions: boolean          // X-Frame-Options
  hasHSTS: boolean                   // Strict-Transport-Security
  hasXContentTypeOptions: boolean    // X-Content-Type-Options
  hasReferrerPolicy: boolean
  hasPermissionsPolicy: boolean
  headers: Record<string, string>
  score: number                      // 0-100
}

export interface SSLAnalysis {
  isValid: boolean
  hasSSL: boolean
  protocol: string | null            // TLS 1.2, TLS 1.3, etc.
  issuer: string | null
  validFrom: Date | null
  expiryDate: Date | null
  daysToExpiry: number | null
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
}

export interface VulnerabilityAnalysis {
  hasOutdatedJquery: boolean
  jqueryVersion: string | null
  hasExposedSensitiveFiles: boolean
  exposedFiles: string[]
  hasMixedContent: boolean
  hasServerVersionExposed: boolean
  serverVersion: string | null
  hasXPoweredBy: boolean
  xPoweredBy: string | null
}

export interface SecurityAnalysis {
  url: string
  analyzedAt: Date
  securityHeaders: SecurityHeadersAnalysis
  ssl: SSLAnalysis
  vulnerabilities: VulnerabilityAnalysis
  overallSecurityScore: number       // 0-100
  recommendations: SecurityRecommendation[]
}

export interface SecurityRecommendation {
  type: 'critical' | 'high' | 'medium' | 'low'
  category: 'headers' | 'ssl' | 'vulnerability'
  title: string
  description: string
  impact: string
}

// Security headers to check
const SECURITY_HEADERS = {
  'content-security-policy': { weight: 20, name: 'Content-Security-Policy' },
  'x-frame-options': { weight: 15, name: 'X-Frame-Options' },
  'strict-transport-security': { weight: 20, name: 'HSTS' },
  'x-content-type-options': { weight: 10, name: 'X-Content-Type-Options' },
  'referrer-policy': { weight: 10, name: 'Referrer-Policy' },
  'permissions-policy': { weight: 10, name: 'Permissions-Policy' }
} as const

// Sensitive files that should not be exposed
const SENSITIVE_PATHS = [
  '/.git/config',
  '/.env',
  '/.htaccess',
  '/wp-config.php.bak',
  '/wp-config.php~',
  '/phpinfo.php',
  '/web.config',
  '/.svn/entries',
  '/server-status',
  '/server-info',
  '/.DS_Store',
  '/Thumbs.db',
  '/backup.sql',
  '/database.sql',
  '/.idea/workspace.xml'
]

// Known vulnerable jQuery versions
const VULNERABLE_JQUERY_VERSIONS = [
  { version: '1.', severity: 'high', description: 'jQuery 1.x has multiple XSS vulnerabilities' },
  { version: '2.', severity: 'medium', description: 'jQuery 2.x has some security issues' },
  { version: '3.0', severity: 'low', description: 'jQuery 3.0.x has minor vulnerabilities' },
  { version: '3.1', severity: 'low', description: 'jQuery 3.1.x has minor vulnerabilities' },
  { version: '3.2', severity: 'low', description: 'jQuery 3.2.x has minor vulnerabilities' },
  { version: '3.3', severity: 'low', description: 'jQuery 3.3.x has minor vulnerabilities' },
  { version: '3.4', severity: 'low', description: 'jQuery 3.4.x has minor vulnerabilities' }
]

export class SecurityAnalyzer {
  private readonly timeout: number

  constructor(timeout = 10000) {
    this.timeout = timeout
  }

  /**
   * Analizza la sicurezza completa di un sito
   */
  async analyzeSecurityFromHtml(
    url: string,
    html: string,
    headers: Record<string, string>
  ): Promise<SecurityAnalysis> {
    const securityHeaders = this.analyzeSecurityHeaders(headers)
    const ssl = this.analyzeSSL(url, headers)
    const vulnerabilities = await this.analyzeVulnerabilities(url, html, headers)

    // Calculate overall score
    const overallSecurityScore = this.calculateOverallScore(securityHeaders, ssl, vulnerabilities)

    // Generate recommendations
    const recommendations = this.generateRecommendations(securityHeaders, ssl, vulnerabilities)

    return {
      url,
      analyzedAt: new Date(),
      securityHeaders,
      ssl,
      vulnerabilities,
      overallSecurityScore,
      recommendations
    }
  }

  /**
   * Analizza security headers
   */
  analyzeSecurityHeaders(headers: Record<string, string>): SecurityHeadersAnalysis {
    const normalizedHeaders: Record<string, string> = {}

    // Normalize header names to lowercase
    for (const [key, value] of Object.entries(headers)) {
      normalizedHeaders[key.toLowerCase()] = value
    }

    let score = 0

    const hasCSP = !!normalizedHeaders['content-security-policy']
    const hasXFrameOptions = !!normalizedHeaders['x-frame-options']
    const hasHSTS = !!normalizedHeaders['strict-transport-security']
    const hasXContentTypeOptions = !!normalizedHeaders['x-content-type-options']
    const hasReferrerPolicy = !!normalizedHeaders['referrer-policy']
    const hasPermissionsPolicy = !!normalizedHeaders['permissions-policy'] ||
                                  !!normalizedHeaders['feature-policy']

    // Calculate score based on header presence
    if (hasCSP) score += SECURITY_HEADERS['content-security-policy'].weight
    if (hasXFrameOptions) score += SECURITY_HEADERS['x-frame-options'].weight
    if (hasHSTS) {
      score += SECURITY_HEADERS['strict-transport-security'].weight
      // Bonus for long max-age
      const hstsValue = normalizedHeaders['strict-transport-security']
      const maxAgeMatch = hstsValue?.match(/max-age=(\d+)/)
      if (maxAgeMatch) {
        const maxAge = parseInt(maxAgeMatch[1], 10)
        if (maxAge >= 31536000) score += 5 // 1 year or more
        if (hstsValue.includes('includeSubDomains')) score += 3
        if (hstsValue.includes('preload')) score += 2
      }
    }
    if (hasXContentTypeOptions) score += SECURITY_HEADERS['x-content-type-options'].weight
    if (hasReferrerPolicy) score += SECURITY_HEADERS['referrer-policy'].weight
    if (hasPermissionsPolicy) score += SECURITY_HEADERS['permissions-policy'].weight

    return {
      hasCSP,
      hasXFrameOptions,
      hasHSTS,
      hasXContentTypeOptions,
      hasReferrerPolicy,
      hasPermissionsPolicy,
      headers: normalizedHeaders,
      score: Math.min(100, score)
    }
  }

  /**
   * Analizza SSL/HTTPS
   */
  analyzeSSL(url: string, headers: Record<string, string>): SSLAnalysis {
    const hasSSL = url.startsWith('https://')

    // Basic SSL analysis from URL and headers
    // Note: Full SSL analysis would require TLS library which is complex to implement
    const grade = this.calculateSSLGrade(hasSSL, headers)

    return {
      isValid: hasSSL,
      hasSSL,
      protocol: hasSSL ? 'TLS' : null,
      issuer: null, // Would need TLS inspection
      validFrom: null,
      expiryDate: null,
      daysToExpiry: null,
      grade
    }
  }

  /**
   * Calculate SSL grade based on available info
   */
  private calculateSSLGrade(hasSSL: boolean, headers: Record<string, string>): SSLAnalysis['grade'] {
    if (!hasSSL) return 'F'

    let grade: SSLAnalysis['grade'] = 'B' // Default for HTTPS

    // Check for HSTS
    const hsts = headers['strict-transport-security']
    if (hsts) {
      const maxAgeMatch = hsts.match(/max-age=(\d+)/)
      if (maxAgeMatch) {
        const maxAge = parseInt(maxAgeMatch[1], 10)
        if (maxAge >= 31536000) { // 1 year
          grade = 'A'
          if (hsts.includes('includeSubDomains') && hsts.includes('preload')) {
            grade = 'A+'
          }
        }
      }
    }

    return grade
  }

  /**
   * Analizza vulnerabilità comuni
   */
  async analyzeVulnerabilities(
    url: string,
    html: string,
    headers: Record<string, string>
  ): Promise<VulnerabilityAnalysis> {
    // Check jQuery version
    const { hasOutdated: hasOutdatedJquery, version: jqueryVersion } = this.checkJqueryVersion(html)

    // Check for mixed content
    const hasMixedContent = this.checkMixedContent(url, html)

    // Check server version exposure
    const serverHeader = headers['server'] || headers['Server'] || null
    const hasServerVersionExposed = serverHeader ? /[\d.]+/.test(serverHeader) : false

    // Check X-Powered-By
    const xPoweredBy = headers['x-powered-by'] || headers['X-Powered-By'] || null
    const hasXPoweredBy = !!xPoweredBy

    // Check sensitive files (async)
    const { hasExposed, exposedFiles } = await this.checkSensitiveFiles(url)

    return {
      hasOutdatedJquery,
      jqueryVersion,
      hasExposedSensitiveFiles: hasExposed,
      exposedFiles,
      hasMixedContent,
      hasServerVersionExposed,
      serverVersion: serverHeader,
      hasXPoweredBy,
      xPoweredBy
    }
  }

  /**
   * Check jQuery version from HTML
   */
  private checkJqueryVersion(html: string): { hasOutdated: boolean; version: string | null } {
    // Look for jQuery version patterns
    const patterns = [
      /jquery[.-]?(\d+\.\d+\.\d+)/i,
      /jQuery v(\d+\.\d+\.\d+)/i,
      /jquery\.min\.js\?ver=(\d+\.\d+\.\d+)/i,
      /jquery-(\d+\.\d+\.\d+)/i
    ]

    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match) {
        const version = match[1]
        const isOutdated = VULNERABLE_JQUERY_VERSIONS.some(v => version.startsWith(v.version))
        return { hasOutdated: isOutdated, version }
      }
    }

    return { hasOutdated: false, version: null }
  }

  /**
   * Check for mixed content (HTTP resources on HTTPS page)
   */
  private checkMixedContent(url: string, html: string): boolean {
    if (!url.startsWith('https://')) return false

    // Check for http:// in src and href attributes
    const httpPatterns = [
      /src=["']http:\/\//i,
      /href=["']http:\/\/(?!.*\.css)/i, // Exclude external links
      /url\(["']?http:\/\//i
    ]

    return httpPatterns.some(pattern => pattern.test(html))
  }

  /**
   * Check for exposed sensitive files
   */
  private async checkSensitiveFiles(baseUrl: string): Promise<{ hasExposed: boolean; exposedFiles: string[] }> {
    const exposedFiles: string[] = []

    // Only check a few critical files to avoid too many requests
    const criticalPaths = SENSITIVE_PATHS.slice(0, 5)

    for (const path of criticalPaths) {
      try {
        const testUrl = new URL(path, baseUrl).toString()
        const response = await axios.head(testUrl, {
          timeout: 3000,
          validateStatus: () => true,
          maxRedirects: 0
        })

        if (response.status === 200) {
          exposedFiles.push(path)
        }
      } catch {
        // File doesn't exist or error, which is good
      }
    }

    return {
      hasExposed: exposedFiles.length > 0,
      exposedFiles
    }
  }

  /**
   * Calculate overall security score
   */
  private calculateOverallScore(
    headers: SecurityHeadersAnalysis,
    ssl: SSLAnalysis,
    vulnerabilities: VulnerabilityAnalysis
  ): number {
    let score = 0

    // Headers: 40 points max
    score += headers.score * 0.4

    // SSL: 30 points max
    if (ssl.hasSSL) {
      score += 20
      switch (ssl.grade) {
        case 'A+': score += 10; break
        case 'A': score += 8; break
        case 'B': score += 5; break
        case 'C': score += 2; break
      }
    }

    // Vulnerabilities: 30 points max (start with 30 and subtract)
    let vulnScore = 30
    if (vulnerabilities.hasOutdatedJquery) vulnScore -= 10
    if (vulnerabilities.hasExposedSensitiveFiles) vulnScore -= 15
    if (vulnerabilities.hasMixedContent) vulnScore -= 5
    if (vulnerabilities.hasServerVersionExposed) vulnScore -= 3
    if (vulnerabilities.hasXPoweredBy) vulnScore -= 2
    score += Math.max(0, vulnScore)

    return Math.round(score)
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(
    headers: SecurityHeadersAnalysis,
    ssl: SSLAnalysis,
    vulnerabilities: VulnerabilityAnalysis
  ): SecurityRecommendation[] {
    const recommendations: SecurityRecommendation[] = []

    // SSL recommendations
    if (!ssl.hasSSL) {
      recommendations.push({
        type: 'critical',
        category: 'ssl',
        title: 'HTTPS non abilitato',
        description: 'Il sito non usa HTTPS. Tutti i dati sono trasmessi in chiaro.',
        impact: 'I dati degli utenti (password, form) possono essere intercettati.'
      })
    }

    // Header recommendations
    if (!headers.hasCSP) {
      recommendations.push({
        type: 'high',
        category: 'headers',
        title: 'Manca Content-Security-Policy',
        description: 'Il header CSP non è configurato.',
        impact: 'Il sito è vulnerabile ad attacchi XSS e injection.'
      })
    }

    if (!headers.hasXFrameOptions) {
      recommendations.push({
        type: 'medium',
        category: 'headers',
        title: 'Manca X-Frame-Options',
        description: 'Il sito può essere incluso in iframe esterni.',
        impact: 'Possibili attacchi clickjacking.'
      })
    }

    if (!headers.hasHSTS) {
      recommendations.push({
        type: 'medium',
        category: 'headers',
        title: 'Manca HSTS',
        description: 'Strict-Transport-Security non configurato.',
        impact: 'Possibili attacchi downgrade a HTTP.'
      })
    }

    if (!headers.hasXContentTypeOptions) {
      recommendations.push({
        type: 'low',
        category: 'headers',
        title: 'Manca X-Content-Type-Options',
        description: 'Il browser potrebbe interpretare file con MIME type errato.',
        impact: 'Possibili attacchi MIME-sniffing.'
      })
    }

    // Vulnerability recommendations
    if (vulnerabilities.hasOutdatedJquery) {
      recommendations.push({
        type: 'high',
        category: 'vulnerability',
        title: `jQuery obsoleto (v${vulnerabilities.jqueryVersion})`,
        description: 'La versione di jQuery in uso ha vulnerabilità note.',
        impact: 'Il sito è vulnerabile ad attacchi XSS.'
      })
    }

    if (vulnerabilities.hasExposedSensitiveFiles) {
      recommendations.push({
        type: 'critical',
        category: 'vulnerability',
        title: 'File sensibili esposti',
        description: `Trovati file sensibili: ${vulnerabilities.exposedFiles.join(', ')}`,
        impact: 'Credenziali e configurazioni potrebbero essere accessibili.'
      })
    }

    if (vulnerabilities.hasMixedContent) {
      recommendations.push({
        type: 'medium',
        category: 'vulnerability',
        title: 'Mixed Content',
        description: 'Il sito HTTPS carica risorse via HTTP.',
        impact: 'Le risorse HTTP possono essere manipolate.'
      })
    }

    if (vulnerabilities.hasXPoweredBy) {
      recommendations.push({
        type: 'low',
        category: 'vulnerability',
        title: 'X-Powered-By esposto',
        description: `Header X-Powered-By: ${vulnerabilities.xPoweredBy}`,
        impact: 'Rivela tecnologie usate, facilita attacchi mirati.'
      })
    }

    if (vulnerabilities.hasServerVersionExposed) {
      recommendations.push({
        type: 'low',
        category: 'vulnerability',
        title: 'Versione server esposta',
        description: `Server: ${vulnerabilities.serverVersion}`,
        impact: 'Rivela versione server, facilita exploit specifici.'
      })
    }

    return recommendations.sort((a, b) => {
      const priority = { critical: 0, high: 1, medium: 2, low: 3 }
      return priority[a.type] - priority[b.type]
    })
  }
}

// Singleton
let globalSecurityAnalyzer: SecurityAnalyzer | null = null

export function getGlobalSecurityAnalyzer(): SecurityAnalyzer {
  if (!globalSecurityAnalyzer) {
    globalSecurityAnalyzer = new SecurityAnalyzer()
  }
  return globalSecurityAnalyzer
}
