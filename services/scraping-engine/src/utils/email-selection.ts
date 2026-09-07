/**
 * Selezione e verifica dell'email di contatto di un lead (Fase 6).
 *
 * Fonti (in ordine di fiducia):
 * 1. Email estratte dall'analyzer (mailto:, JSON-LD, testo VISIBILE della home)
 * 2. Pagine /contatti e /contact scaricate via axios (mailto: + testo)
 *
 * Verifica: lookup DNS MX sul dominio dell'email (gratuito, funziona anche
 * dai runner GitHub — il probing SMTP sulla porta 25 invece è bloccato e
 * NON viene promesso).
 *
 * Tier di confidenza salvato in leads.email_confidence:
 * - verified   -> email esposta esplicitamente dal sito E dominio con MX validi
 * - probable   -> email trovata su pagine di contatto, MX validi
 * - unverified -> email plausibile ma senza MX verificabili
 *
 * Parte del modulo services/scraping-engine.
 */

import { promises as dns } from 'dns'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { normalizeDomain } from './lead-identity'

export type EmailConfidence = 'verified' | 'probable' | 'unverified'

export interface SelectedEmail {
  email: string
  confidence: EmailConfidence
  source: 'analyzer' | 'contact-page'
  mxValid: boolean
}

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i

// Domini che compaiono nell'HTML ma non sono MAI contatti reali
const JUNK_DOMAINS = [
  'example.com', 'example.org', 'sentry.io', 'wixpress.com', 'sentry-next.wixpress.com',
  'domain.com', 'email.com', 'yourdomain.com', 'sito.it', 'miosito.it', 'schema.org'
]

// Estensioni-file catturate per errore dai parser di testo
const JUNK_SUFFIXES = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.css', '.js']

function isPlausibleEmail(email: string): boolean {
  const e = email.toLowerCase().trim()
  if (!EMAIL_RE.test(e)) return false
  if (JUNK_SUFFIXES.some(s => e.endsWith(s))) return false
  const domain = e.split('@')[1]
  if (JUNK_DOMAINS.some(j => domain === j || domain.endsWith(`.${j}`))) return false
  return true
}

/** Ranking: stesso dominio del sito > prefissi di contatto tipici > resto */
function rankEmail(email: string, siteDomain: string | null): number {
  const [prefix, domain] = email.toLowerCase().split('@')
  let score = 0
  if (siteDomain && (domain === siteDomain || domain.endsWith(`.${siteDomain}`))) score += 100
  if (['info', 'contatti', 'contact', 'commerciale', 'amministrazione', 'ufficio', 'segreteria', 'hello', 'ciao'].includes(prefix)) score += 20
  if (['noreply', 'no-reply', 'newsletter', 'privacy', 'pec'].some(p => prefix.includes(p))) score -= 50
  return score
}

async function hasMx(domain: string): Promise<boolean> {
  try {
    const records = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
    ])
    return Array.isArray(records) && records.length > 0
  } catch {
    return false
  }
}

/** Cerca email sulle pagine di contatto tipiche (max 2 richieste leggere) */
async function emailsFromContactPages(websiteUrl: string): Promise<string[]> {
  const found = new Set<string>()
  let origin: string
  try {
    origin = new URL(websiteUrl.includes('://') ? websiteUrl : `https://${websiteUrl}`).origin
  } catch {
    return []
  }

  for (const path of ['/contatti', '/contact']) {
    try {
      const res = await axios.get(`${origin}${path}`, {
        timeout: 8000,
        maxRedirects: 3,
        validateStatus: () => true,
        responseType: 'text',
        transformResponse: [(d) => d]
      })
      if (res.status !== 200 || typeof res.data !== 'string') continue

      const $ = cheerio.load(res.data)
      // mailto: espliciti
      $('a[href^="mailto:"], a[href^="MAILTO:"]').each((_i, el) => {
        const raw = ($(el).attr('href') || '').replace(/^mailto:/i, '').split('?')[0].trim()
        if (raw) found.add(raw.toLowerCase())
      })
      // testo visibile
      const text = $('body').text()
      for (const match of text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || []) {
        found.add(match.toLowerCase())
      }
      if (found.size > 0) break // una pagina di contatto basta
    } catch {
      // pagina assente o irraggiungibile: si prova la successiva
    }
  }

  return Array.from(found)
}

/**
 * Seleziona la migliore email di contatto per il lead e ne verifica il dominio.
 * Ritorna null se non c'è nessuna email plausibile.
 */
export async function selectBestEmail(input: {
  websiteUrl?: string | null
  /** email già estratte dall'analyzer (mailto/JSON-LD/testo visibile della home) */
  analyzerEmails?: string[]
}): Promise<SelectedEmail | null> {
  const siteDomain = normalizeDomain(input.websiteUrl)

  let candidates = (input.analyzerEmails || [])
    .map(e => e.toLowerCase().trim())
    .filter(isPlausibleEmail)
  let source: SelectedEmail['source'] = 'analyzer'

  // Fallback: pagine di contatto (solo se la home non ha dato nulla)
  if (candidates.length === 0 && input.websiteUrl) {
    candidates = (await emailsFromContactPages(input.websiteUrl)).filter(isPlausibleEmail)
    source = 'contact-page'
  }

  if (candidates.length === 0) return null

  const best = [...new Set(candidates)]
    .sort((a, b) => rankEmail(b, siteDomain) - rankEmail(a, siteDomain))[0]

  const mxValid = await hasMx(best.split('@')[1])

  const confidence: EmailConfidence = !mxValid
    ? 'unverified'
    : source === 'analyzer' ? 'verified' : 'probable'

  return { email: best, confidence, source, mxValid }
}
