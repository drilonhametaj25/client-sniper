/**
 * API endpoint per Accessibility Quick Audit
 * Analizza gli aspetti di accessibilità fondamentali di un sito web
 * Tool gratuito - max 3 analisi al giorno per IP
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const DAILY_IP_LIMIT = 3
const ipUsageMap = new Map<string, { count: number; date: string }>()

interface AccessibilityCheck {
  name: string
  status: 'pass' | 'warning' | 'fail'
  value?: string
  details?: string[]
  recommendation?: string
  wcagLevel: 'A' | 'AA' | 'AAA'
  wcagCriteria?: string
}

interface AccessibilityResult {
  url: string
  finalUrl: string
  isAccessible: boolean
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  checks: AccessibilityCheck[]
  summary: {
    passed: number
    warnings: number
    failed: number
    levelA: { passed: number; failed: number }
    levelAA: { passed: number; failed: number }
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

function analyzeAccessibility(html: string, url: string): AccessibilityCheck[] {
  const checks: AccessibilityCheck[] = []

  // 1. Language attribute (WCAG 3.1.1)
  const hasLang = /<html[^>]*\slang=["'][^"']+["']/i.test(html)
  const langMatch = html.match(/<html[^>]*\slang=["']([^"']+)["']/i)
  checks.push({
    name: 'Attributo Lingua',
    status: hasLang ? 'pass' : 'fail',
    value: hasLang ? `lang="${langMatch?.[1]}"` : 'Mancante',
    recommendation: hasLang ? undefined : 'Aggiungi lang="it" al tag <html> per screen reader.',
    wcagLevel: 'A',
    wcagCriteria: '3.1.1'
  })

  // 2. Images with alt text (WCAG 1.1.1)
  const imgTags = html.match(/<img[^>]*>/gi) || []
  const imgsWithoutAlt = imgTags.filter(img => {
    const hasAlt = /\salt=["'][^"']*["']/i.test(img) || /\salt=""/i.test(img)
    return !hasAlt
  })
  const decorativeImgs = imgTags.filter(img => /\salt=""/i.test(img)).length

  if (imgTags.length === 0) {
    checks.push({
      name: 'Alt Text Immagini',
      status: 'pass',
      value: 'Nessuna immagine trovata',
      wcagLevel: 'A',
      wcagCriteria: '1.1.1'
    })
  } else if (imgsWithoutAlt.length === 0) {
    checks.push({
      name: 'Alt Text Immagini',
      status: 'pass',
      value: `${imgTags.length} immagini, tutte con alt`,
      details: decorativeImgs > 0 ? [`${decorativeImgs} decorative (alt="")` ] : undefined,
      wcagLevel: 'A',
      wcagCriteria: '1.1.1'
    })
  } else {
    checks.push({
      name: 'Alt Text Immagini',
      status: 'fail',
      value: `${imgsWithoutAlt.length}/${imgTags.length} senza alt`,
      recommendation: 'Aggiungi attributo alt a tutte le immagini. Usa alt="" per immagini decorative.',
      wcagLevel: 'A',
      wcagCriteria: '1.1.1'
    })
  }

  // 3. Heading structure (WCAG 1.3.1, 2.4.6)
  const headings: { level: number; text: string }[] = []
  const headingRegex = /<h([1-6])[^>]*>([^<]*(?:<[^/h][^>]*>[^<]*)*)<\/h\1>/gi
  let match
  while ((match = headingRegex.exec(html)) !== null) {
    headings.push({
      level: parseInt(match[1]),
      text: match[2].replace(/<[^>]*>/g, '').trim().substring(0, 50)
    })
  }

  const hasH1 = headings.some(h => h.level === 1)
  const h1Count = headings.filter(h => h.level === 1).length
  const hasSkippedLevels = headings.some((h, i) => {
    if (i === 0) return false
    return h.level > headings[i - 1].level + 1
  })

  if (headings.length === 0) {
    checks.push({
      name: 'Struttura Heading',
      status: 'fail',
      value: 'Nessun heading trovato',
      recommendation: 'Usa heading (H1-H6) per strutturare i contenuti. Inizia con un H1.',
      wcagLevel: 'A',
      wcagCriteria: '1.3.1'
    })
  } else if (!hasH1) {
    checks.push({
      name: 'Struttura Heading',
      status: 'fail',
      value: `${headings.length} heading, nessun H1`,
      recommendation: 'Aggiungi un H1 come titolo principale della pagina.',
      wcagLevel: 'A',
      wcagCriteria: '1.3.1'
    })
  } else if (h1Count > 1) {
    checks.push({
      name: 'Struttura Heading',
      status: 'warning',
      value: `${h1Count} H1 trovati`,
      recommendation: 'Usa un solo H1 per pagina. Usa H2-H6 per le sezioni.',
      wcagLevel: 'AA',
      wcagCriteria: '2.4.6'
    })
  } else if (hasSkippedLevels) {
    checks.push({
      name: 'Struttura Heading',
      status: 'warning',
      value: 'Livelli saltati nella gerarchia',
      recommendation: 'Non saltare livelli di heading (es. da H1 a H3).',
      wcagLevel: 'AA',
      wcagCriteria: '2.4.6'
    })
  } else {
    checks.push({
      name: 'Struttura Heading',
      status: 'pass',
      value: `${headings.length} heading ben strutturati`,
      wcagLevel: 'A',
      wcagCriteria: '1.3.1'
    })
  }

  // 4. Form labels (WCAG 1.3.1, 3.3.2)
  const inputs = html.match(/<input[^>]*>/gi) || []
  const textInputs = inputs.filter(input => {
    const type = input.match(/type=["']([^"']+)["']/i)?.[1]?.toLowerCase()
    return !type || ['text', 'email', 'password', 'tel', 'number', 'search', 'url'].includes(type)
  })

  const inputsWithoutLabel = textInputs.filter(input => {
    const hasAriaLabel = /aria-label=["'][^"']+["']/i.test(input)
    const hasAriaLabelledby = /aria-labelledby=["'][^"']+["']/i.test(input)
    const hasPlaceholder = /placeholder=["'][^"']+["']/i.test(input)
    const id = input.match(/id=["']([^"']+)["']/i)?.[1]
    const hasForLabel = id && new RegExp(`<label[^>]*for=["']${id}["']`, 'i').test(html)
    return !hasAriaLabel && !hasAriaLabelledby && !hasForLabel && !hasPlaceholder
  })

  if (textInputs.length === 0) {
    checks.push({
      name: 'Label Form',
      status: 'pass',
      value: 'Nessun campo di input trovato',
      wcagLevel: 'A',
      wcagCriteria: '1.3.1'
    })
  } else if (inputsWithoutLabel.length === 0) {
    checks.push({
      name: 'Label Form',
      status: 'pass',
      value: `${textInputs.length} input con label/aria-label`,
      wcagLevel: 'A',
      wcagCriteria: '1.3.1'
    })
  } else {
    checks.push({
      name: 'Label Form',
      status: 'fail',
      value: `${inputsWithoutLabel.length}/${textInputs.length} senza label`,
      recommendation: 'Usa <label for="id"> o aria-label per tutti i campi di input.',
      wcagLevel: 'A',
      wcagCriteria: '1.3.1'
    })
  }

  // 5. Link text (WCAG 2.4.4)
  const links = html.match(/<a[^>]*>([^<]*(?:<[^/a][^>]*>[^<]*)*)<\/a>/gi) || []
  const genericLinkTexts = ['click here', 'clicca qui', 'leggi di più', 'read more', 'here', 'qui', 'more', 'link']
  const badLinks = links.filter(link => {
    const textMatch = link.match(/<a[^>]*>([^<]*(?:<[^/a][^>]*>[^<]*)*)<\/a>/i)
    const text = textMatch?.[1]?.replace(/<[^>]*>/g, '').trim().toLowerCase() || ''
    const hasAriaLabel = /aria-label=["'][^"']+["']/i.test(link)
    return genericLinkTexts.includes(text) && !hasAriaLabel
  })

  if (links.length === 0) {
    checks.push({
      name: 'Testo Link',
      status: 'pass',
      value: 'Nessun link trovato',
      wcagLevel: 'A',
      wcagCriteria: '2.4.4'
    })
  } else if (badLinks.length === 0) {
    checks.push({
      name: 'Testo Link',
      status: 'pass',
      value: `${links.length} link con testo descrittivo`,
      wcagLevel: 'A',
      wcagCriteria: '2.4.4'
    })
  } else {
    checks.push({
      name: 'Testo Link',
      status: 'warning',
      value: `${badLinks.length} link generici`,
      recommendation: 'Evita testi come "clicca qui". Usa descrizioni significative.',
      wcagLevel: 'A',
      wcagCriteria: '2.4.4'
    })
  }

  // 6. Skip link (WCAG 2.4.1)
  const hasSkipLink = /<a[^>]*href=["']#(main|content|main-content|skip)[^"']*["'][^>]*>/i.test(html)
  checks.push({
    name: 'Skip Link',
    status: hasSkipLink ? 'pass' : 'warning',
    value: hasSkipLink ? 'Presente' : 'Non trovato',
    recommendation: hasSkipLink ? undefined : 'Aggiungi un link "Salta al contenuto" per utenti da tastiera.',
    wcagLevel: 'A',
    wcagCriteria: '2.4.1'
  })

  // 7. ARIA landmarks (WCAG 1.3.1)
  const hasMain = /<main/i.test(html) || /role=["']main["']/i.test(html)
  const hasNav = /<nav/i.test(html) || /role=["']navigation["']/i.test(html)
  const hasHeader = /<header/i.test(html) || /role=["']banner["']/i.test(html)
  const hasFooter = /<footer/i.test(html) || /role=["']contentinfo["']/i.test(html)

  const landmarks = [hasMain, hasNav, hasHeader, hasFooter].filter(Boolean).length

  if (landmarks >= 3) {
    checks.push({
      name: 'ARIA Landmarks',
      status: 'pass',
      value: `${landmarks}/4 landmark presenti`,
      details: [
        hasMain ? '✓ main' : '✗ main',
        hasNav ? '✓ nav' : '✗ nav',
        hasHeader ? '✓ header' : '✗ header',
        hasFooter ? '✓ footer' : '✗ footer'
      ],
      wcagLevel: 'A',
      wcagCriteria: '1.3.1'
    })
  } else if (landmarks >= 1) {
    checks.push({
      name: 'ARIA Landmarks',
      status: 'warning',
      value: `${landmarks}/4 landmark presenti`,
      details: [
        hasMain ? '✓ main' : '✗ main',
        hasNav ? '✓ nav' : '✗ nav',
        hasHeader ? '✓ header' : '✗ header',
        hasFooter ? '✓ footer' : '✗ footer'
      ],
      recommendation: 'Usa <main>, <nav>, <header>, <footer> per strutturare la pagina.',
      wcagLevel: 'A',
      wcagCriteria: '1.3.1'
    })
  } else {
    checks.push({
      name: 'ARIA Landmarks',
      status: 'fail',
      value: 'Nessun landmark trovato',
      recommendation: 'Usa elementi semantici HTML5 (<main>, <nav>, etc.) per strutturare la pagina.',
      wcagLevel: 'A',
      wcagCriteria: '1.3.1'
    })
  }

  // 8. Viewport meta (WCAG 1.4.4, 1.4.10)
  const viewportMeta = html.match(/<meta[^>]*name=["']viewport["'][^>]*>/i)?.[0]
  if (!viewportMeta) {
    checks.push({
      name: 'Meta Viewport',
      status: 'warning',
      value: 'Non trovato',
      recommendation: 'Aggiungi meta viewport per supporto mobile.',
      wcagLevel: 'AA',
      wcagCriteria: '1.4.10'
    })
  } else {
    const hasUserScalableNo = /user-scalable\s*=\s*(no|0)/i.test(viewportMeta)
    const hasMaxScale = /maximum-scale\s*=\s*1/i.test(viewportMeta)

    if (hasUserScalableNo || hasMaxScale) {
      checks.push({
        name: 'Meta Viewport',
        status: 'fail',
        value: 'Zoom disabilitato',
        recommendation: 'Non disabilitare lo zoom (user-scalable=no o maximum-scale=1).',
        wcagLevel: 'AA',
        wcagCriteria: '1.4.4'
      })
    } else {
      checks.push({
        name: 'Meta Viewport',
        status: 'pass',
        value: 'Zoom abilitato',
        wcagLevel: 'AA',
        wcagCriteria: '1.4.4'
      })
    }
  }

  // 9. Focus visible (checking for outline:none in inline styles)
  const hasOutlineNone = /outline\s*:\s*none/i.test(html) || /outline\s*:\s*0/i.test(html)
  checks.push({
    name: 'Focus Visibile',
    status: hasOutlineNone ? 'warning' : 'pass',
    value: hasOutlineNone ? 'Possibile rimozione focus' : 'OK (analisi parziale)',
    recommendation: hasOutlineNone ? 'Non rimuovere outline:none senza alternative visibili.' : undefined,
    wcagLevel: 'AA',
    wcagCriteria: '2.4.7'
  })

  // 10. Table headers (WCAG 1.3.1)
  const tables = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi) || []
  const tablesWithoutHeaders = tables.filter(table => {
    const hasTh = /<th/i.test(table)
    const hasScope = /scope=["'](row|col)["']/i.test(table)
    return !hasTh && !hasScope
  })

  if (tables.length === 0) {
    checks.push({
      name: 'Tabelle Accessibili',
      status: 'pass',
      value: 'Nessuna tabella trovata',
      wcagLevel: 'A',
      wcagCriteria: '1.3.1'
    })
  } else if (tablesWithoutHeaders.length === 0) {
    checks.push({
      name: 'Tabelle Accessibili',
      status: 'pass',
      value: `${tables.length} tabelle con header`,
      wcagLevel: 'A',
      wcagCriteria: '1.3.1'
    })
  } else {
    checks.push({
      name: 'Tabelle Accessibili',
      status: 'warning',
      value: `${tablesWithoutHeaders.length}/${tables.length} senza <th>`,
      recommendation: 'Usa <th> con scope per intestazioni tabella.',
      wcagLevel: 'A',
      wcagCriteria: '1.3.1'
    })
  }

  // 11. Button/link distinction
  const buttonsAsLinks = (html.match(/<a[^>]*role=["']button["']/gi) || []).length
  const linksAsButtons = (html.match(/<button[^>]*onclick=["'][^"']*location/gi) || []).length

  if (buttonsAsLinks > 0 || linksAsButtons > 0) {
    checks.push({
      name: 'Semantica Interattiva',
      status: 'warning',
      value: 'Possibile uso improprio',
      details: [
        buttonsAsLinks > 0 ? `${buttonsAsLinks} link con role=button` : '',
        linksAsButtons > 0 ? `${linksAsButtons} button usati come link` : ''
      ].filter(Boolean),
      recommendation: 'Usa <button> per azioni, <a> per navigazione.',
      wcagLevel: 'A',
      wcagCriteria: '4.1.2'
    })
  } else {
    checks.push({
      name: 'Semantica Interattiva',
      status: 'pass',
      value: 'OK',
      wcagLevel: 'A',
      wcagCriteria: '4.1.2'
    })
  }

  // 12. Title attribute (WCAG 2.4.2)
  const hasTitle = /<title[^>]*>[^<]+<\/title>/i.test(html)
  checks.push({
    name: 'Titolo Pagina',
    status: hasTitle ? 'pass' : 'fail',
    value: hasTitle ? 'Presente' : 'Mancante',
    recommendation: hasTitle ? undefined : 'Aggiungi un <title> descrittivo alla pagina.',
    wcagLevel: 'A',
    wcagCriteria: '2.4.2'
  })

  return checks
}

function calculateScore(checks: AccessibilityCheck[]): number {
  let score = 100

  for (const check of checks) {
    if (check.status === 'fail') {
      if (check.wcagLevel === 'A') {
        score -= 12
      } else if (check.wcagLevel === 'AA') {
        score -= 8
      } else {
        score -= 5
      }
    } else if (check.status === 'warning') {
      if (check.wcagLevel === 'A') {
        score -= 5
      } else if (check.wcagLevel === 'AA') {
        score -= 3
      } else {
        score -= 2
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

    const checks = analyzeAccessibility(html, normalizedUrl)
    const score = calculateScore(checks)
    const grade = getGrade(score)

    const levelAChecks = checks.filter(c => c.wcagLevel === 'A')
    const levelAAChecks = checks.filter(c => c.wcagLevel === 'AA')

    const summary = {
      passed: checks.filter(c => c.status === 'pass').length,
      warnings: checks.filter(c => c.status === 'warning').length,
      failed: checks.filter(c => c.status === 'fail').length,
      levelA: {
        passed: levelAChecks.filter(c => c.status === 'pass').length,
        failed: levelAChecks.filter(c => c.status === 'fail').length
      },
      levelAA: {
        passed: levelAAChecks.filter(c => c.status === 'pass').length,
        failed: levelAAChecks.filter(c => c.status === 'fail').length
      }
    }

    const newRemaining = updateRateLimit(ip)

    const result: AccessibilityResult = {
      url: normalizedUrl,
      finalUrl: response.url,
      isAccessible: response.ok,
      score,
      grade,
      checks,
      summary,
      analysisDate: new Date().toISOString(),
      remaining: newRemaining
    }

    return NextResponse.json({
      success: true,
      result,
      message: grade === 'A' ? 'Eccellente! Il sito ha una buona accessibilità.' :
               grade === 'B' ? 'Buono, ma ci sono alcuni miglioramenti possibili.' :
               grade === 'C' ? 'Sufficiente, sono consigliati miglioramenti.' :
               'Il sito necessita di interventi per l\'accessibilità.',
      remaining: newRemaining
    })

  } catch (error: any) {
    console.error('Errore Accessibility Checker:', error)
    return NextResponse.json({
      success: false,
      message: 'Errore durante l\'analisi. Riprova più tardi.'
    }, { status: 500 })
  }
}
