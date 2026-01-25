/**
 * API endpoint per Tech Stack Detector
 * Analizza un sito web e identifica le tecnologie utilizzate
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

const TOOL_NAME: ToolName = 'tech-detector'

interface TechStack {
  cms: string[]
  frameworks: string[]
  jsLibraries: string[]
  cssFrameworks: string[]
  analytics: string[]
  cdn: string[]
  server: string[]
  ecommerce: string[]
  fonts: string[]
  security: string[]
  other: string[]
}

interface DetectorResult {
  url: string
  finalUrl: string
  isAccessible: boolean
  httpStatus: number
  techStack: TechStack
  totalTechnologies: number
  analysisDate: string
  remaining: number
}

// Pattern per rilevare tecnologie
const techPatterns = {
  cms: [
    { name: 'WordPress', patterns: [/wp-content/i, /wp-includes/i, /wordpress/i, /<meta name="generator" content="WordPress/i] },
    { name: 'Drupal', patterns: [/drupal/i, /sites\/default\/files/i, /<meta name="generator" content="Drupal/i] },
    { name: 'Joomla', patterns: [/joomla/i, /\/media\/system\/js/i, /<meta name="generator" content="Joomla/i] },
    { name: 'Shopify', patterns: [/cdn\.shopify\.com/i, /shopify\.com/i, /Shopify\.theme/i] },
    { name: 'Wix', patterns: [/wix\.com/i, /wixsite\.com/i, /static\.wixstatic\.com/i] },
    { name: 'Squarespace', patterns: [/squarespace\.com/i, /sqsp\.com/i, /static1\.squarespace/i] },
    { name: 'Webflow', patterns: [/webflow\.com/i, /assets\.website-files\.com/i] },
    { name: 'Ghost', patterns: [/ghost\.io/i, /<meta name="generator" content="Ghost/i] },
    { name: 'Prestashop', patterns: [/prestashop/i, /\/modules\/ps_/i] },
    { name: 'Magento', patterns: [/magento/i, /mage\/cookies\.js/i, /skin\/frontend/i] },
  ],
  frameworks: [
    { name: 'React', patterns: [/__NEXT_DATA__/i, /react/i, /data-reactroot/i, /_next\/static/i] },
    { name: 'Next.js', patterns: [/__NEXT_DATA__/i, /_next\//i, /next\/dist/i] },
    { name: 'Vue.js', patterns: [/vue\.js/i, /data-v-/i, /vue\.runtime/i, /__VUE__/i] },
    { name: 'Nuxt.js', patterns: [/__NUXT__/i, /_nuxt\//i, /nuxt/i] },
    { name: 'Angular', patterns: [/angular/i, /ng-version/i, /ng-app/i] },
    { name: 'Svelte', patterns: [/svelte/i, /svelte-/i] },
    { name: 'Gatsby', patterns: [/gatsby/i, /___gatsby/i] },
    { name: 'Laravel', patterns: [/laravel/i, /csrf-token/i] },
    { name: 'Django', patterns: [/csrfmiddlewaretoken/i, /django/i] },
    { name: 'Ruby on Rails', patterns: [/rails/i, /turbolinks/i, /data-turbo/i] },
  ],
  jsLibraries: [
    { name: 'jQuery', patterns: [/jquery/i, /jQuery/] },
    { name: 'Lodash', patterns: [/lodash/i] },
    { name: 'Moment.js', patterns: [/moment\.js/i, /moment\.min\.js/i] },
    { name: 'Axios', patterns: [/axios/i] },
    { name: 'GSAP', patterns: [/gsap/i, /TweenMax/i, /TweenLite/i] },
    { name: 'Three.js', patterns: [/three\.js/i, /three\.min\.js/i] },
    { name: 'D3.js', patterns: [/d3\.js/i, /d3\.min\.js/i] },
    { name: 'Chart.js', patterns: [/chart\.js/i, /Chart\.min\.js/i] },
    { name: 'Alpine.js', patterns: [/alpine\.js/i, /x-data/i] },
    { name: 'HTMX', patterns: [/htmx\.js/i, /hx-/i] },
  ],
  cssFrameworks: [
    { name: 'Bootstrap', patterns: [/bootstrap/i, /\.container-fluid/i] },
    { name: 'Tailwind CSS', patterns: [/tailwind/i, /tailwindcss/i] },
    { name: 'Bulma', patterns: [/bulma/i, /\.is-primary/i] },
    { name: 'Foundation', patterns: [/foundation/i] },
    { name: 'Material UI', patterns: [/material-ui/i, /MuiButton/i, /@mui/i] },
    { name: 'Chakra UI', patterns: [/chakra-ui/i] },
    { name: 'Ant Design', patterns: [/antd/i, /ant-design/i] },
    { name: 'Semantic UI', patterns: [/semantic-ui/i, /semantic\.min/i] },
  ],
  analytics: [
    { name: 'Google Analytics', patterns: [/google-analytics/i, /gtag/i, /ga\.js/i, /analytics\.js/i, /UA-\d{4,}-\d/i, /G-[A-Z0-9]+/i] },
    { name: 'Google Tag Manager', patterns: [/googletagmanager/i, /GTM-[A-Z0-9]+/i] },
    { name: 'Meta Pixel', patterns: [/facebook\.net\/en_US\/fbevents/i, /fbq\(/i, /connect\.facebook\.net/i] },
    { name: 'Hotjar', patterns: [/hotjar/i, /static\.hotjar\.com/i] },
    { name: 'Matomo', patterns: [/matomo/i, /piwik/i] },
    { name: 'Mixpanel', patterns: [/mixpanel/i] },
    { name: 'Segment', patterns: [/segment\.com/i, /analytics\.js\/v1/i] },
    { name: 'Amplitude', patterns: [/amplitude/i] },
    { name: 'Plausible', patterns: [/plausible\.io/i] },
    { name: 'Fathom', patterns: [/usefathom\.com/i] },
  ],
  cdn: [
    { name: 'Cloudflare', patterns: [/cloudflare/i, /cdnjs\.cloudflare\.com/i] },
    { name: 'AWS CloudFront', patterns: [/cloudfront\.net/i] },
    { name: 'Fastly', patterns: [/fastly/i] },
    { name: 'Akamai', patterns: [/akamai/i] },
    { name: 'jsDelivr', patterns: [/jsdelivr\.net/i] },
    { name: 'unpkg', patterns: [/unpkg\.com/i] },
    { name: 'Vercel', patterns: [/vercel\.app/i, /\.vercel\.com/i] },
    { name: 'Netlify', patterns: [/netlify/i] },
  ],
  server: [
    { name: 'Apache', patterns: [/apache/i] },
    { name: 'Nginx', patterns: [/nginx/i] },
    { name: 'IIS', patterns: [/microsoft-iis/i, /iis/i] },
    { name: 'LiteSpeed', patterns: [/litespeed/i] },
    { name: 'Node.js', patterns: [/node\.js/i, /express/i] },
    { name: 'PHP', patterns: [/\.php/i, /X-Powered-By: PHP/i] },
  ],
  ecommerce: [
    { name: 'WooCommerce', patterns: [/woocommerce/i, /wc-/i] },
    { name: 'Shopify', patterns: [/shopify/i] },
    { name: 'BigCommerce', patterns: [/bigcommerce/i] },
    { name: 'Stripe', patterns: [/stripe\.js/i, /js\.stripe\.com/i] },
    { name: 'PayPal', patterns: [/paypal/i, /paypalobjects\.com/i] },
  ],
  fonts: [
    { name: 'Google Fonts', patterns: [/fonts\.googleapis\.com/i, /fonts\.gstatic\.com/i] },
    { name: 'Adobe Fonts', patterns: [/use\.typekit\.net/i, /typekit/i] },
    { name: 'Font Awesome', patterns: [/fontawesome/i, /font-awesome/i, /fa-/i] },
  ],
  security: [
    { name: 'reCAPTCHA', patterns: [/recaptcha/i, /google\.com\/recaptcha/i] },
    { name: 'hCaptcha', patterns: [/hcaptcha/i] },
    { name: 'Cloudflare Security', patterns: [/cf-ray/i, /challenge-platform/i] },
  ],
}

function normalizeUrl(url: string): string {
  let normalized = url.trim()
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized
  }
  return normalized
}

function detectTechnologies(html: string, headers: Headers): TechStack {
  const techStack: TechStack = {
    cms: [],
    frameworks: [],
    jsLibraries: [],
    cssFrameworks: [],
    analytics: [],
    cdn: [],
    server: [],
    ecommerce: [],
    fonts: [],
    security: [],
    other: [],
  }

  // Analizza HTML
  for (const [category, patterns] of Object.entries(techPatterns)) {
    for (const tech of patterns) {
      for (const pattern of tech.patterns) {
        if (pattern.test(html)) {
          const categoryKey = category as keyof TechStack
          if (!techStack[categoryKey].includes(tech.name)) {
            techStack[categoryKey].push(tech.name)
          }
          break
        }
      }
    }
  }

  // Analizza headers
  const serverHeader = headers.get('server')
  const poweredBy = headers.get('x-powered-by')

  if (serverHeader) {
    if (/apache/i.test(serverHeader) && !techStack.server.includes('Apache')) {
      techStack.server.push('Apache')
    }
    if (/nginx/i.test(serverHeader) && !techStack.server.includes('Nginx')) {
      techStack.server.push('Nginx')
    }
    if (/cloudflare/i.test(serverHeader) && !techStack.cdn.includes('Cloudflare')) {
      techStack.cdn.push('Cloudflare')
    }
  }

  if (poweredBy) {
    if (/php/i.test(poweredBy) && !techStack.server.includes('PHP')) {
      techStack.server.push('PHP')
    }
    if (/asp\.net/i.test(poweredBy) && !techStack.server.includes('ASP.NET')) {
      techStack.server.push('ASP.NET')
    }
    if (/express/i.test(poweredBy) && !techStack.frameworks.includes('Express.js')) {
      techStack.frameworks.push('Express.js')
    }
  }

  // Check Cloudflare headers
  if (headers.get('cf-ray')) {
    if (!techStack.cdn.includes('Cloudflare')) {
      techStack.cdn.push('Cloudflare')
    }
  }

  return techStack
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

    // Fetch del sito
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    let response: Response
    let html: string
    let finalUrl: string

    try {
      response = await fetch(normalizedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
        },
        redirect: 'follow'
      })

      finalUrl = response.url
      html = await response.text()
    } catch (fetchError: any) {
      clearTimeout(timeout)

      if (fetchError.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          message: 'Il sito ha impiegato troppo tempo a rispondere. Riprova più tardi.'
        }, { status: 408 })
      }

      return NextResponse.json({
        success: false,
        message: `Impossibile raggiungere il sito: ${fetchError.message}`
      }, { status: 400 })
    }

    clearTimeout(timeout)

    // Rileva tecnologie
    const techStack = detectTechnologies(html, response.headers)

    // Conta totale tecnologie
    const totalTechnologies = Object.values(techStack).reduce((sum, arr) => sum + arr.length, 0)

    // Log utilizzo dopo analisi riuscita
    await logToolUsage(request, {
      toolName: TOOL_NAME,
      websiteUrl: normalizedUrl
    })

    const remainingInfo = getRemainingInfo(rateLimitResult, true)

    const result: DetectorResult = {
      url: normalizedUrl,
      finalUrl,
      isAccessible: response.ok,
      httpStatus: response.status,
      techStack,
      totalTechnologies,
      analysisDate: new Date().toISOString(),
      remaining: typeof remainingInfo.remaining === 'number' ? remainingInfo.remaining : -1
    }

    return NextResponse.json({
      success: true,
      result,
      message: totalTechnologies > 0
        ? `Trovate ${totalTechnologies} tecnologie!`
        : 'Nessuna tecnologia comune rilevata. Il sito potrebbe usare tecnologie personalizzate.',
      remaining: remainingInfo.remaining,
      isAuthenticated: rateLimitResult.isAuthenticated,
      plan: rateLimitResult.userPlan
    })

  } catch (error: any) {
    console.error('Errore Tech Detector:', error)
    return NextResponse.json({
      success: false,
      message: 'Errore durante l\'analisi. Riprova più tardi.'
    }, { status: 500 })
  }
}
