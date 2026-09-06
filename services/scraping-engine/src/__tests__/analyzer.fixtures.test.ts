/**
 * Golden-fixture test suite per EnhancedWebsiteAnalyzer.
 *
 * Serve fixture HTML sintetici (deterministici, nessuna dipendenza dal
 * contenuto remoto) da un server HTTP locale su porta effimera e verifica che
 * il motore di analisi produca ESATTAMENTE i difetti reali e ZERO difetti
 * fabbricati. La regola di accettazione più importante: un sito tecnicamente
 * pulito non deve produrre alcun difetto critical/high/medium/low.
 *
 * Note operative:
 * - /sitemap.xml e /robots.txt sono controllabili per scenario: 'absent' (404),
 *   'valid' (contenuto reale) o 'html' (200 con pagina HTML, come le SPA con
 *   catch-all routing: NON deve contare come sitemap/robots valido).
 * - Il server invia security header per non fabbricare difetti di sicurezza.
 * - I placeholder {{CURRENT_YEAR}}/{{TODAY_ISO}} tengono i fixture "freschi".
 * - hasSSL sarà false (nessun endpoint https su 127.0.0.1): è un fatto del
 *   probe, NON deve comparire come difetto nelle issues.
 *
 * Parte del modulo services/scraping-engine.
 */

import { createServer, type Server } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import * as path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { EnhancedWebsiteAnalyzer } from '../analyzers/enhanced-website-analyzer'
import { BrowserManager } from '../utils/browser-manager'

type SeoFilesMode = 'absent' | 'valid' | 'html'

const FIXTURES_DIR = path.join(__dirname, 'fixtures')

/** Header di sicurezza inviati con ogni fixture: evitano che il punteggio
 *  security scenda sotto le soglie che generano issues (difetti fabbricati). */
const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'",
  'X-Frame-Options': 'SAMEORIGIN',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=()',
}

let server: Server
let baseUrl = ''
let seoFilesMode: SeoFilesMode = 'absent'

function renderFixture(fileName: string): string {
  const raw = readFileSync(path.join(FIXTURES_DIR, fileName), 'utf8')
  const now = new Date()
  const todayIso = now.toISOString().slice(0, 10)
  return raw
    .replace(/\{\{CURRENT_YEAR\}\}/g, String(now.getFullYear()))
    .replace(/\{\{TODAY_ISO\}\}/g, todayIso)
}

function startServer(): Promise<void> {
  server = createServer((req, res) => {
    const pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname

    if (pathname === '/sitemap.xml') {
      if (seoFilesMode === 'valid') {
        res.writeHead(200, { 'Content-Type': 'application/xml' })
        res.end('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>' + baseUrl + '/clean-site.html</loc></url>\n</urlset>')
      } else if (seoFilesMode === 'html') {
        // SPA con catch-all: HTTP 200 ma è una pagina HTML, non una sitemap.
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<!DOCTYPE html><html><head><title>SPA</title></head><body>App</body></html>')
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Not found')
      }
      return
    }

    if (pathname === '/robots.txt') {
      if (seoFilesMode === 'valid') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('User-agent: *\nDisallow:\n')
      } else if (seoFilesMode === 'html') {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<!DOCTYPE html><html><head><title>SPA</title></head><body>App</body></html>')
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Not found')
      }
      return
    }

    const fileName = pathname.replace(/^\//, '')
    if (/^[a-z0-9-]+\.html$/.test(fileName) && existsSync(path.join(FIXTURES_DIR, fileName))) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS })
      res.end(renderFixture(fileName))
      return
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
  })

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address && typeof address === 'object') {
        baseUrl = `http://127.0.0.1:${address.port}`
        resolve()
      } else {
        reject(new Error('Impossibile determinare la porta del server di test'))
      }
    })
  })
}

async function analyze(fixture: string, mode: SeoFilesMode = 'absent') {
  seoFilesMode = mode
  const analyzer = new EnhancedWebsiteAnalyzer()
  return analyzer.analyzeWebsite(`${baseUrl}/${fixture}`)
}

function allIssues(analysis: Awaited<ReturnType<EnhancedWebsiteAnalyzer['analyzeWebsite']>>): string[] {
  return [
    ...analysis.issues.critical,
    ...analysis.issues.high,
    ...analysis.issues.medium,
    ...analysis.issues.low,
  ]
}

beforeAll(async () => {
  await startServer()
})

afterAll(async () => {
  await BrowserManager.getInstance().cleanup()
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

describe('EnhancedWebsiteAnalyzer - golden fixtures', () => {
  it('sito tecnicamente pulito: ZERO difetti fabbricati', async () => {
    const a = await analyze('clean-site.html', 'valid')

    // La pagina è raggiungibile e l'analisi è completa e affidabile
    expect(a.isAccessible).toBe(true)
    expect(a.reachabilityVerdict).toBe('online')
    expect(a.reliability).toBeDefined()
    expect(a.reliability!.failedModules).toEqual([])
    expect(a.reliability!.analysisMethod).toBe('full')
    expect(a.leadConfidence?.status).toBe('published')

    // REGOLA DI ACCETTAZIONE PRINCIPALE: nessun difetto, di nessuna severità
    expect(a.issues.critical).toEqual([])
    expect(a.issues.high).toEqual([])
    expect(a.issues.medium).toEqual([])
    expect(a.issues.low).toEqual([])

    // Difetti storici fabbricati: non devono comparire in NESSUN array
    const fabricated = [
      'Manca il tag title',
      'Nessun sistema di tracciamento',
      'Mancano i dati strutturati',
      'Manca la privacy policy',
      'Manca la meta description',
      'Manca il tag H1',
      'Non ottimizzato per mobile',
      'Sito non accessibile',
    ]
    const issues = allIssues(a)
    for (const text of fabricated) {
      expect(issues.some((i) => i.includes(text)), `difetto fabbricato presente: ${text}`).toBe(false)
    }

    // I singoli moduli vedono la pagina per quello che è
    expect(a.seo.hasTitle).toBe(true)
    expect(a.seo.hasMetaDescription).toBe(true)
    expect(a.seo.hasH1).toBe(true)
    expect(a.seo.hasStructuredData).toBe(true)
    expect(a.seo.hasSitemap).toBe(true) // sitemap VALIDA servita dal test server
    expect(a.seo.hasRobotsTxt).toBe(true) // robots VALIDO servito dal test server
    expect(a.tracking.googleAnalytics).toBe(true)
    expect(a.tracking.detectionConfidence).toBe('confirmed')
    expect(a.gdpr.hasCookieBanner).toBe(true)
    expect(a.gdpr.hasPrivacyPolicy).toBe(true)
    expect(a.gdpr.hasContactInfo).toBe(true)
    expect(a.mobile.isMobileFriendly).toBe(true)
    expect(a.mobile.hasViewportMeta).toBe(true)
    expect(a.mobile.hasResponsiveCss).toBe(true)
    expect(a.images.total).toBeGreaterThan(0)
    expect(a.images.broken).toBe(0)
    expect(a.images.withoutAlt).toBe(0)
    expect(a.content.phoneNumbers).toContain('+390212345678')
    expect(a.content.emailAddresses).toContain('info@idraulicarossi.it')

    // 127.0.0.1 non espone un endpoint https: hasSSL false è un FATTO del
    // probe, non un difetto — non deve comparire nelle issues.
    expect(a.hasSSL).toBe(false)
    expect(issues.join(' ')).not.toMatch(/https|ssl/i)
  })

  it('SEO mancante: segnala title/description/H1 assenti (e una risposta HTML non conta come sitemap/robots)', async () => {
    const a = await analyze('missing-seo.html', 'html')

    expect(a.isAccessible).toBe(true)
    expect(a.seo.hasTitle).toBe(false)
    expect(a.seo.hasMetaDescription).toBe(false)
    expect(a.seo.hasH1).toBe(false)
    expect(a.issues.critical).toContain('Manca il tag title')
    expect(a.issues.high).toContain('Manca la meta description')
    expect(a.issues.medium).toContain('Manca il tag H1')

    // /sitemap.xml e /robots.txt rispondono 200 ma con una pagina HTML
    // (comportamento SPA catch-all): la validazione del CONTENUTO deve
    // impedire il falso positivo "sitemap presente".
    expect(a.seo.hasSitemap).toBe(false)
    expect(a.seo.hasRobotsTxt).toBe(false)
  })

  it('nessun tracking: difetto CONFERMATO, senza altri difetti fabbricati', async () => {
    const a = await analyze('no-tracking.html', 'absent')

    expect(a.isAccessible).toBe(true)
    expect(a.tracking.googleAnalytics).toBe(false)
    expect(a.tracking.googleTagManager).toBe(false)
    expect(a.tracking.trackingScore).toBe(0)
    // La pagina non fa richieste esterne: il rendering completa e l'assenza
    // di tracker è una PROVA, non un dubbio.
    expect(a.tracking.detectionConfidence).toBe('confirmed')

    // L'unico difetto high deve essere l'assenza di tracciamento.
    expect(a.issues.high).toEqual(['Nessun sistema di tracciamento installato'])
    expect(a.issues.critical).toEqual([])

    const fabricated = ['Manca il tag title', 'Manca la meta description', 'Manca il tag H1', 'Manca la privacy policy', 'Non ottimizzato per mobile']
    const issues = allIssues(a)
    for (const text of fabricated) {
      expect(issues.some((i) => i.includes(text)), `difetto fabbricato presente: ${text}`).toBe(false)
    }
  })

  it('immagini lazy mai caricate: non sono immagini rotte', async () => {
    const a = await analyze('lazy-images.html', 'absent')

    expect(a.isAccessible).toBe(true)
    expect(a.images.total).toBe(4)
    expect(a.images.broken).toBe(0)
    expect(a.images.withoutAlt).toBe(0)
  })

  it('JSON-LD con @graph: LocalBusiness rilevato ricorsivamente', async () => {
    const a = await analyze('structured-data.html', 'absent')

    expect(a.isAccessible).toBe(true)
    expect(a.seo.hasStructuredData).toBe(true)
    expect(a.issues.low).not.toContain('Mancano i dati strutturati')
    // Il telefono dichiarato nel JSON-LD (dentro @graph) viene estratto
    expect(a.content.phoneNumbers).toContain('+390655501234')
  })

  it('CMP via rete (Iubenda): cookie banner rilevato senza banner nel DOM', async () => {
    const a = await analyze('cookie-banner-cmp.html', 'absent')

    expect(a.isAccessible).toBe(true)
    // La richiesta verso cdn.iubenda.com viene emessa (anche se fallisce):
    // è quella che l'analyzer intercetta dalla lista delle request.
    expect(a.gdpr.hasCookieBanner).toBe(true)
    expect(a.gdpr.cookieBannerConfidence).toBe('confirmed')
  })

  it('contatti: tel/mailto/JSON-LD/social estratti dalle fonti affidabili', async () => {
    const a = await analyze('contacts.html', 'absent')

    expect(a.isAccessible).toBe(true)
    expect(a.content.hasPhoneNumbers).toBe(true)
    expect(a.content.phoneNumbers).toContain('+390212345678')
    expect(a.content.hasEmailAddresses).toBe(true)
    expect(a.content.emailAddresses).toContain('info@studiorossi.it')
    expect(a.content.hasSocialLinks).toBe(true)
    expect(a.content.socialLinks.some((l) => l.includes('instagram.com'))).toBe(true)
    expect(a.content.socialLinks.some((l) => l.includes('facebook.com'))).toBe(true)

    // buildSocialFromLinks: 2 profili, uno per piattaforma
    expect(a.social).toBeDefined()
    expect(a.social!.profiles).toHaveLength(2)
    const platforms = a.social!.profiles.map((p) => p.platform).sort()
    expect(platforms).toEqual(['facebook', 'instagram'])
  })
})
