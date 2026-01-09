/**
 * API endpoint per SEO Quick Checker
 * Analizza gli aspetti SEO fondamentali di un sito web
 * Tool gratuito - max 3 analisi al giorno per IP
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const DAILY_IP_LIMIT = 3
const ipUsageMap = new Map<string, { count: number; date: string }>()

interface SEOCheck {
  name: string
  status: 'pass' | 'warning' | 'fail'
  value?: string
  recommendation?: string
  importance: 'critical' | 'important' | 'optional'
}

interface SEOResult {
  url: string
  finalUrl: string
  isAccessible: boolean
  score: number
  checks: SEOCheck[]
  summary: {
    passed: number
    warnings: number
    failed: number
    critical: number
  }
  analysisDate: string
  remaining: number
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  const cfConnecting = request.headers.get('cf-connecting-ip')

  if (forwarded) return forwarded.split(',')[0].trim()
  if (real) return real
  if (cfConnecting) return cfConnecting

  return '127.0.0.1'
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().split('T')[0]
  const usage = ipUsageMap.get(ip)

  if (!usage || usage.date !== today) {
    return { allowed: true, remaining: DAILY_IP_LIMIT }
  }

  return {
    allowed: usage.count < DAILY_IP_LIMIT,
    remaining: Math.max(0, DAILY_IP_LIMIT - usage.count)
  }
}

function updateRateLimit(ip: string): number {
  const today = new Date().toISOString().split('T')[0]
  const usage = ipUsageMap.get(ip)

  if (!usage || usage.date !== today) {
    ipUsageMap.set(ip, { count: 1, date: today })
    return DAILY_IP_LIMIT - 1
  }

  usage.count++
  ipUsageMap.set(ip, usage)
  return Math.max(0, DAILY_IP_LIMIT - usage.count)
}

function normalizeUrl(url: string): string {
  let normalized = url.trim()
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized
  }
  return normalized
}

function analyzeSEO(html: string, url: string): SEOCheck[] {
  const checks: SEOCheck[] = []

  // 1. Title Tag
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : null

  if (!title) {
    checks.push({
      name: 'Title Tag',
      status: 'fail',
      recommendation: 'Aggiungi un tag <title> alla pagina. È fondamentale per il SEO.',
      importance: 'critical'
    })
  } else if (title.length < 30) {
    checks.push({
      name: 'Title Tag',
      status: 'warning',
      value: `${title.length} caratteri`,
      recommendation: 'Il title è troppo corto. Consigliati 50-60 caratteri.',
      importance: 'critical'
    })
  } else if (title.length > 60) {
    checks.push({
      name: 'Title Tag',
      status: 'warning',
      value: `${title.length} caratteri`,
      recommendation: 'Il title è troppo lungo. Potrebbe essere troncato nei risultati di ricerca.',
      importance: 'critical'
    })
  } else {
    checks.push({
      name: 'Title Tag',
      status: 'pass',
      value: `${title.length} caratteri`,
      importance: 'critical'
    })
  }

  // 2. Meta Description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                    html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i)
  const description = descMatch ? descMatch[1].trim() : null

  if (!description) {
    checks.push({
      name: 'Meta Description',
      status: 'fail',
      recommendation: 'Aggiungi una meta description. È importante per il CTR nei risultati di ricerca.',
      importance: 'critical'
    })
  } else if (description.length < 70) {
    checks.push({
      name: 'Meta Description',
      status: 'warning',
      value: `${description.length} caratteri`,
      recommendation: 'La description è troppo corta. Consigliati 150-160 caratteri.',
      importance: 'critical'
    })
  } else if (description.length > 160) {
    checks.push({
      name: 'Meta Description',
      status: 'warning',
      value: `${description.length} caratteri`,
      recommendation: 'La description potrebbe essere troncata. Consigliati max 160 caratteri.',
      importance: 'critical'
    })
  } else {
    checks.push({
      name: 'Meta Description',
      status: 'pass',
      value: `${description.length} caratteri`,
      importance: 'critical'
    })
  }

  // 3. H1 Tag
  const h1Matches = html.match(/<h1[^>]*>[\s\S]*?<\/h1>/gi) || []

  if (h1Matches.length === 0) {
    checks.push({
      name: 'H1 Tag',
      status: 'fail',
      recommendation: 'Aggiungi un tag H1. Ogni pagina dovrebbe avere esattamente un H1.',
      importance: 'critical'
    })
  } else if (h1Matches.length > 1) {
    checks.push({
      name: 'H1 Tag',
      status: 'warning',
      value: `${h1Matches.length} tag H1 trovati`,
      recommendation: 'La pagina ha più H1. Consigliato avere un solo H1 per pagina.',
      importance: 'critical'
    })
  } else {
    checks.push({
      name: 'H1 Tag',
      status: 'pass',
      value: '1 H1 trovato',
      importance: 'critical'
    })
  }

  // 4. Viewport Meta
  const hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html)

  checks.push({
    name: 'Viewport Meta',
    status: hasViewport ? 'pass' : 'fail',
    recommendation: hasViewport ? undefined : 'Aggiungi il meta viewport per la responsività mobile.',
    importance: 'important'
  })

  // 5. Lang Attribute
  const hasLang = /<html[^>]*lang=["'][^"']+["']/i.test(html)

  checks.push({
    name: 'Lang Attribute',
    status: hasLang ? 'pass' : 'warning',
    recommendation: hasLang ? undefined : 'Aggiungi l\'attributo lang al tag <html> per indicare la lingua.',
    importance: 'important'
  })

  // 6. Canonical URL
  const hasCanonical = /<link[^>]*rel=["']canonical["']/i.test(html)

  checks.push({
    name: 'Canonical URL',
    status: hasCanonical ? 'pass' : 'warning',
    recommendation: hasCanonical ? undefined : 'Aggiungi un link canonical per evitare contenuti duplicati.',
    importance: 'important'
  })

  // 7. Open Graph Tags
  const hasOgTitle = /<meta[^>]*property=["']og:title["']/i.test(html)
  const hasOgDesc = /<meta[^>]*property=["']og:description["']/i.test(html)
  const hasOgImage = /<meta[^>]*property=["']og:image["']/i.test(html)

  const ogCount = [hasOgTitle, hasOgDesc, hasOgImage].filter(Boolean).length

  if (ogCount === 3) {
    checks.push({
      name: 'Open Graph Tags',
      status: 'pass',
      value: 'Title, Description, Image',
      importance: 'important'
    })
  } else if (ogCount > 0) {
    checks.push({
      name: 'Open Graph Tags',
      status: 'warning',
      value: `${ogCount}/3 tag presenti`,
      recommendation: 'Aggiungi tutti i tag OG essenziali: og:title, og:description, og:image.',
      importance: 'important'
    })
  } else {
    checks.push({
      name: 'Open Graph Tags',
      status: 'fail',
      recommendation: 'Aggiungi i tag Open Graph per una migliore condivisione sui social.',
      importance: 'important'
    })
  }

  // 8. Images with Alt
  const imgMatches = html.match(/<img[^>]*>/gi) || []
  const imgsWithAlt = imgMatches.filter(img => /alt=["'][^"']+["']/i.test(img)).length

  if (imgMatches.length === 0) {
    checks.push({
      name: 'Alt Text Immagini',
      status: 'pass',
      value: 'Nessuna immagine trovata',
      importance: 'important'
    })
  } else if (imgsWithAlt === imgMatches.length) {
    checks.push({
      name: 'Alt Text Immagini',
      status: 'pass',
      value: `${imgsWithAlt}/${imgMatches.length} immagini con alt`,
      importance: 'important'
    })
  } else if (imgsWithAlt > imgMatches.length / 2) {
    checks.push({
      name: 'Alt Text Immagini',
      status: 'warning',
      value: `${imgsWithAlt}/${imgMatches.length} immagini con alt`,
      recommendation: 'Alcune immagini non hanno il testo alternativo. Aggiungilo per accessibilità e SEO.',
      importance: 'important'
    })
  } else {
    checks.push({
      name: 'Alt Text Immagini',
      status: 'fail',
      value: `${imgsWithAlt}/${imgMatches.length} immagini con alt`,
      recommendation: 'La maggior parte delle immagini non ha alt text. Importante per SEO e accessibilità.',
      importance: 'important'
    })
  }

  // 9. Internal Links
  const hostname = new URL(url).hostname
  const linkMatches = html.match(/<a[^>]*href=["']([^"']*)["']/gi) || []
  const internalLinks = linkMatches.filter(link => {
    const hrefMatch = link.match(/href=["']([^"']*?)["']/i)
    if (!hrefMatch) return false
    const href = hrefMatch[1]
    return href.startsWith('/') || href.includes(hostname)
  }).length

  checks.push({
    name: 'Link Interni',
    status: internalLinks > 3 ? 'pass' : 'warning',
    value: `${internalLinks} link interni`,
    recommendation: internalLinks <= 3 ? 'Aggiungi più link interni per migliorare la navigazione e il crawling.' : undefined,
    importance: 'optional'
  })

  // 10. Heading Structure
  const h2Count = (html.match(/<h2[^>]*>/gi) || []).length
  const h3Count = (html.match(/<h3[^>]*>/gi) || []).length

  if (h2Count === 0 && h3Count === 0) {
    checks.push({
      name: 'Struttura Heading',
      status: 'warning',
      recommendation: 'Utilizza heading H2 e H3 per strutturare meglio il contenuto.',
      importance: 'optional'
    })
  } else {
    checks.push({
      name: 'Struttura Heading',
      status: 'pass',
      value: `H2: ${h2Count}, H3: ${h3Count}`,
      importance: 'optional'
    })
  }

  // 11. HTTPS
  const isHttps = url.startsWith('https://')

  checks.push({
    name: 'HTTPS',
    status: isHttps ? 'pass' : 'fail',
    recommendation: isHttps ? undefined : 'Il sito non usa HTTPS. È fondamentale per sicurezza e SEO.',
    importance: 'critical'
  })

  return checks
}

function calculateScore(checks: SEOCheck[]): number {
  let score = 100

  for (const check of checks) {
    if (check.status === 'fail') {
      switch (check.importance) {
        case 'critical': score -= 15; break
        case 'important': score -= 8; break
        case 'optional': score -= 3; break
      }
    } else if (check.status === 'warning') {
      switch (check.importance) {
        case 'critical': score -= 8; break
        case 'important': score -= 4; break
        case 'optional': score -= 1; break
      }
    }
  }

  return Math.max(0, Math.min(100, score))
}

export async function GET(request: NextRequest) {
  const ip = getClientIP(request)
  const { allowed, remaining } = checkRateLimit(ip)

  return NextResponse.json({
    used: DAILY_IP_LIMIT - remaining,
    limit: DAILY_IP_LIMIT,
    remaining,
    canAnalyze: allowed
  })
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request)
    const { allowed, remaining } = checkRateLimit(ip)

    if (!allowed) {
      return NextResponse.json({
        success: false,
        message: 'Hai raggiunto il limite di 3 analisi gratuite per oggi. Registrati per analisi illimitate!',
        remaining: 0
      }, { status: 429 })
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

    const checks = analyzeSEO(html, normalizedUrl)
    const score = calculateScore(checks)

    const summary = {
      passed: checks.filter(c => c.status === 'pass').length,
      warnings: checks.filter(c => c.status === 'warning').length,
      failed: checks.filter(c => c.status === 'fail').length,
      critical: checks.filter(c => c.status === 'fail' && c.importance === 'critical').length
    }

    const newRemaining = updateRateLimit(ip)

    const result: SEOResult = {
      url: normalizedUrl,
      finalUrl: response.url,
      isAccessible: response.ok,
      score,
      checks,
      summary,
      analysisDate: new Date().toISOString(),
      remaining: newRemaining
    }

    return NextResponse.json({
      success: true,
      result,
      message: score >= 80 ? 'Ottimo lavoro! Il sito è ben ottimizzato.' :
               score >= 60 ? 'Buon lavoro, ma ci sono margini di miglioramento.' :
               'Il sito ha bisogno di ottimizzazione SEO.',
      remaining: newRemaining
    })

  } catch (error: any) {
    console.error('Errore SEO Checker:', error)
    return NextResponse.json({
      success: false,
      message: 'Errore durante l\'analisi. Riprova più tardi.'
    }, { status: 500 })
  }
}
