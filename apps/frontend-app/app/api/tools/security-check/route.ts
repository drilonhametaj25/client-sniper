/**
 * API endpoint per Security Quick Check
 * Analizza gli aspetti di sicurezza fondamentali di un sito web
 *
 * Limiti per piano (per giorno):
 *   - Non registrato/Free: 2
 *   - Starter: 10
 *   - Pro: 25
 *   - Agency: illimitato
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import {
  checkToolRateLimit,
  logToolUsage,
  rateLimitExceededResponse,
  getRemainingInfo,
  type ToolName
} from '@/lib/utils/tools-rate-limit'

const TOOL_NAME: ToolName = 'security-check'

interface SecurityCheck {
  name: string
  status: 'pass' | 'warning' | 'fail'
  value?: string
  recommendation?: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

interface SecurityResult {
  url: string
  finalUrl: string
  isAccessible: boolean
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  checks: SecurityCheck[]
  summary: {
    passed: number
    warnings: number
    failed: number
    critical: number
  }
  analysisDate: string
  remaining: number
}

function normalizeUrl(url: string): string {
  let normalized = url.trim()
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized
  }
  return normalized
}

function analyzeSecurity(html: string, headers: Headers, url: string): SecurityCheck[] {
  const checks: SecurityCheck[] = []

  // 1. HTTPS
  const isHttps = url.startsWith('https://')
  checks.push({
    name: 'HTTPS',
    status: isHttps ? 'pass' : 'fail',
    value: isHttps ? 'Connessione sicura' : 'Connessione non sicura',
    recommendation: isHttps ? undefined : 'Il sito non usa HTTPS. È fondamentale per la sicurezza dei dati.',
    severity: 'critical'
  })

  // 2. Strict-Transport-Security (HSTS)
  const hsts = headers.get('strict-transport-security')
  if (hsts) {
    const hasMaxAge = /max-age=\d+/i.test(hsts)
    const hasIncludeSubdomains = /includeSubDomains/i.test(hsts)

    if (hasMaxAge && hasIncludeSubdomains) {
      checks.push({
        name: 'HSTS',
        status: 'pass',
        value: 'Configurato correttamente',
        severity: 'high'
      })
    } else {
      checks.push({
        name: 'HSTS',
        status: 'warning',
        value: 'Configurazione parziale',
        recommendation: 'Aggiungi includeSubDomains e un max-age adeguato.',
        severity: 'high'
      })
    }
  } else {
    checks.push({
      name: 'HSTS',
      status: 'fail',
      recommendation: 'Aggiungi l\'header Strict-Transport-Security per forzare HTTPS.',
      severity: 'high'
    })
  }

  // 3. Content-Security-Policy
  const csp = headers.get('content-security-policy')
  if (csp) {
    checks.push({
      name: 'Content Security Policy',
      status: 'pass',
      value: 'Presente',
      severity: 'high'
    })
  } else {
    checks.push({
      name: 'Content Security Policy',
      status: 'warning',
      recommendation: 'Aggiungi una Content Security Policy per prevenire XSS e injection attacks.',
      severity: 'high'
    })
  }

  // 4. X-Frame-Options
  const xFrameOptions = headers.get('x-frame-options')
  if (xFrameOptions) {
    const value = xFrameOptions.toUpperCase()
    if (value === 'DENY' || value === 'SAMEORIGIN') {
      checks.push({
        name: 'X-Frame-Options',
        status: 'pass',
        value: xFrameOptions,
        severity: 'medium'
      })
    } else {
      checks.push({
        name: 'X-Frame-Options',
        status: 'warning',
        value: xFrameOptions,
        recommendation: 'Usa DENY o SAMEORIGIN per prevenire clickjacking.',
        severity: 'medium'
      })
    }
  } else {
    checks.push({
      name: 'X-Frame-Options',
      status: 'fail',
      recommendation: 'Aggiungi X-Frame-Options: DENY per prevenire clickjacking.',
      severity: 'medium'
    })
  }

  // 5. X-Content-Type-Options
  const xContentType = headers.get('x-content-type-options')
  if (xContentType && xContentType.toLowerCase() === 'nosniff') {
    checks.push({
      name: 'X-Content-Type-Options',
      status: 'pass',
      value: 'nosniff',
      severity: 'medium'
    })
  } else {
    checks.push({
      name: 'X-Content-Type-Options',
      status: 'fail',
      recommendation: 'Aggiungi X-Content-Type-Options: nosniff per prevenire MIME sniffing.',
      severity: 'medium'
    })
  }

  // 6. X-XSS-Protection (legacy but still useful)
  const xssProtection = headers.get('x-xss-protection')
  if (xssProtection) {
    checks.push({
      name: 'X-XSS-Protection',
      status: 'pass',
      value: xssProtection,
      severity: 'low'
    })
  } else {
    checks.push({
      name: 'X-XSS-Protection',
      status: 'warning',
      recommendation: 'Considera di aggiungere X-XSS-Protection: 1; mode=block (legacy ma ancora utile).',
      severity: 'low'
    })
  }

  // 7. Referrer-Policy
  const referrerPolicy = headers.get('referrer-policy')
  if (referrerPolicy) {
    const safeValues = ['no-referrer', 'no-referrer-when-downgrade', 'strict-origin', 'strict-origin-when-cross-origin']
    const isSafe = safeValues.some(v => referrerPolicy.toLowerCase().includes(v))

    checks.push({
      name: 'Referrer-Policy',
      status: isSafe ? 'pass' : 'warning',
      value: referrerPolicy,
      recommendation: isSafe ? undefined : 'Considera una policy più restrittiva.',
      severity: 'low'
    })
  } else {
    checks.push({
      name: 'Referrer-Policy',
      status: 'warning',
      recommendation: 'Aggiungi Referrer-Policy per controllare le informazioni condivise.',
      severity: 'low'
    })
  }

  // 8. Permissions-Policy (ex Feature-Policy)
  const permissionsPolicy = headers.get('permissions-policy') || headers.get('feature-policy')
  if (permissionsPolicy) {
    checks.push({
      name: 'Permissions-Policy',
      status: 'pass',
      value: 'Presente',
      severity: 'medium'
    })
  } else {
    checks.push({
      name: 'Permissions-Policy',
      status: 'warning',
      recommendation: 'Aggiungi Permissions-Policy per controllare le API del browser.',
      severity: 'medium'
    })
  }

  // 9. Server Header (information disclosure)
  const serverHeader = headers.get('server')
  if (serverHeader) {
    // Check if it reveals version info
    const hasVersion = /[\d.]+/.test(serverHeader)
    if (hasVersion) {
      checks.push({
        name: 'Server Header',
        status: 'warning',
        value: serverHeader,
        recommendation: 'Nascondi la versione del server per ridurre l\'information disclosure.',
        severity: 'low'
      })
    } else {
      checks.push({
        name: 'Server Header',
        status: 'pass',
        value: serverHeader,
        severity: 'low'
      })
    }
  } else {
    checks.push({
      name: 'Server Header',
      status: 'pass',
      value: 'Non esposto',
      severity: 'low'
    })
  }

  // 10. X-Powered-By (information disclosure)
  const poweredBy = headers.get('x-powered-by')
  if (poweredBy) {
    checks.push({
      name: 'X-Powered-By',
      status: 'warning',
      value: poweredBy,
      recommendation: 'Rimuovi l\'header X-Powered-By per ridurre l\'information disclosure.',
      severity: 'low'
    })
  } else {
    checks.push({
      name: 'X-Powered-By',
      status: 'pass',
      value: 'Non esposto',
      severity: 'low'
    })
  }

  // 11. Mixed Content Check (from HTML)
  const hasMixedContent = /src=["']http:\/\//i.test(html) || /href=["']http:\/\/(?!.*\.css)/i.test(html)
  checks.push({
    name: 'Mixed Content',
    status: hasMixedContent ? 'warning' : 'pass',
    value: hasMixedContent ? 'Rilevato contenuto misto' : 'Nessun contenuto misto',
    recommendation: hasMixedContent ? 'Aggiorna tutti i link HTTP a HTTPS.' : undefined,
    severity: 'medium'
  })

  // 12. Cookie Security (check for secure/httpOnly in meta or inline scripts)
  const hasInsecureCookie = /document\.cookie\s*=/i.test(html) && !/secure/i.test(html)
  checks.push({
    name: 'Cookie Security',
    status: hasInsecureCookie ? 'warning' : 'pass',
    value: hasInsecureCookie ? 'Possibili cookie insicuri' : 'OK',
    recommendation: hasInsecureCookie ? 'Assicurati che i cookie abbiano flag Secure e HttpOnly.' : undefined,
    severity: 'medium'
  })

  return checks
}

function calculateScore(checks: SecurityCheck[]): number {
  let score = 100

  for (const check of checks) {
    if (check.status === 'fail') {
      switch (check.severity) {
        case 'critical': score -= 25; break
        case 'high': score -= 15; break
        case 'medium': score -= 8; break
        case 'low': score -= 3; break
      }
    } else if (check.status === 'warning') {
      switch (check.severity) {
        case 'critical': score -= 12; break
        case 'high': score -= 8; break
        case 'medium': score -= 4; break
        case 'low': score -= 1; break
      }
    }
  }

  return Math.max(0, Math.min(100, score))
}

function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

export async function GET(request: NextRequest) {
  const result = await checkToolRateLimit(request, TOOL_NAME)
  const info = getRemainingInfo(result)

  return NextResponse.json({
    used: info.used,
    limit: info.limit,
    remaining: info.remaining,
    canAnalyze: result.allowed,
    isAuthenticated: result.isAuthenticated,
    plan: result.userPlan
  })
}

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimitResult = await checkToolRateLimit(request, TOOL_NAME)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        rateLimitExceededResponse(rateLimitResult, TOOL_NAME),
        { status: 429 }
      )
    }

    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json({
        success: false,
        message: 'URL richiesto'
      }, { status: 400 })
    }

    const normalizedUrl = normalizeUrl(url)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    let response: Response
    let html: string

    try {
      response = await fetch(normalizedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        redirect: 'follow'
      })

      html = await response.text()
    } catch (fetchError: any) {
      clearTimeout(timeout)

      if (fetchError.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          message: 'Il sito ha impiegato troppo tempo a rispondere.'
        }, { status: 408 })
      }

      return NextResponse.json({
        success: false,
        message: `Impossibile raggiungere il sito: ${fetchError.message}`
      }, { status: 400 })
    }

    clearTimeout(timeout)

    const checks = analyzeSecurity(html, response.headers, normalizedUrl)
    const score = calculateScore(checks)
    const grade = getGrade(score)

    const summary = {
      passed: checks.filter(c => c.status === 'pass').length,
      warnings: checks.filter(c => c.status === 'warning').length,
      failed: checks.filter(c => c.status === 'fail').length,
      critical: checks.filter(c => c.status === 'fail' && c.severity === 'critical').length
    }

    // Log utilizzo dopo analisi riuscita
    await logToolUsage(request, {
      toolName: TOOL_NAME,
      websiteUrl: normalizedUrl
    })

    const remainingInfo = getRemainingInfo(rateLimitResult, true)

    const result: SecurityResult = {
      url: normalizedUrl,
      finalUrl: response.url,
      isAccessible: response.ok,
      score,
      grade,
      checks,
      summary,
      analysisDate: new Date().toISOString(),
      remaining: typeof remainingInfo.remaining === 'number' ? remainingInfo.remaining : -1
    }

    return NextResponse.json({
      success: true,
      result,
      message: grade === 'A' ? 'Eccellente! Il sito ha una buona configurazione di sicurezza.' :
               grade === 'B' ? 'Buono, ma ci sono alcuni miglioramenti possibili.' :
               grade === 'C' ? 'Sufficiente, ma sono necessari miglioramenti.' :
               'Il sito necessita di interventi di sicurezza urgenti.',
      remaining: remainingInfo.remaining,
      isAuthenticated: rateLimitResult.isAuthenticated,
      plan: rateLimitResult.userPlan
    })

  } catch (error: any) {
    console.error('Errore Security Checker:', error)
    return NextResponse.json({
      success: false,
      message: 'Errore durante l\'analisi. Riprova più tardi.'
    }, { status: 500 })
  }
}
