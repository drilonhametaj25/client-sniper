/**
 * Motore di arricchimento lead + verifica email (server-side, Node runtime).
 *
 * Obiettivo: la "sezione tipo Apollo" — da un dominio/email ricaviamo dati pubblici
 * e affidabili, SENZA API a pagamento:
 *  - Età dominio + registrar (RDAP)
 *  - Record MX + provider email (DNS)
 *  - Verifica email: sintassi, ruolo (info@), usa-e-getta, dominio con MX,
 *    probe SMTP best-effort, e inferenza di indirizzi business plausibili.
 *
 * Filosofia "trust-first": ogni email ha un livello di confidenza esplicito, mai
 * un "verificata" finto. Usato dall'endpoint /api/leads/[id]/enrich.
 *
 * @file apps/frontend-app/lib/enrichment/lead-enrichment.ts
 */

import { promises as dns } from 'dns'
import net from 'net'

export type EmailConfidence = 'verified' | 'probable' | 'risky' | 'invalid'

export interface VerifiedEmail {
  email: string
  confidence: EmailConfidence
  source: 'site' | 'inferred'   // estratta dal sito o dedotta da pattern
  isRole: boolean               // info@, sales@, ...
  isDisposable: boolean
  mxValid: boolean
  smtp?: 'accepted' | 'rejected' | 'unknown'
  reasons: string[]
}

export interface LeadEnrichmentResult {
  domain: string
  // Dominio
  domainCreatedAt?: string
  domainAgeYears?: number
  registrar?: string
  // Email
  hasMxRecords: boolean
  mxHosts: string[]
  emailProvider?: string
  emails: VerifiedEmail[]
  // meta
  generatedAt: string
}

const SMTP_TIMEOUT_MS = 5000

const ROLE_LOCALPARTS = new Set([
  'info', 'contatti', 'contact', 'sales', 'support', 'help', 'admin', 'amministrazione',
  'commerciale', 'segreteria', 'ufficio', 'noreply', 'no-reply', 'hello', 'ciao',
  'preventivi', 'ordini', 'assistenza', 'marketing', 'press', 'pec'
])

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
  'yopmail.com', 'trashmail.com', 'getnada.com', 'sharklasers.com'
])

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export function extractDomain(websiteUrl?: string | null): string | null {
  if (!websiteUrl) return null
  try {
    const u = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`
    return new URL(u).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

function inferEmailProvider(mxHosts: string[]): string | undefined {
  const blob = mxHosts.join(' ').toLowerCase()
  if (/google|googlemail|aspmx\.l\.google/.test(blob)) return 'Google Workspace'
  if (/outlook|microsoft|office365|protection\.outlook/.test(blob)) return 'Microsoft 365'
  if (/aruba|pec\.it/.test(blob)) return 'Aruba'
  if (/register\.it|registerit/.test(blob)) return 'Register.it'
  if (/ovh/.test(blob)) return 'OVH'
  if (/zoho/.test(blob)) return 'Zoho'
  if (/secureserver|godaddy/.test(blob)) return 'GoDaddy'
  if (/ionos|1and1/.test(blob)) return 'IONOS'
  if (/hostinger/.test(blob)) return 'Hostinger'
  if (mxHosts.length > 0) return 'Self-hosted / altro'
  return undefined
}

async function getMx(domain: string): Promise<string[]> {
  try {
    const records = await dns.resolveMx(domain)
    return records.sort((a, b) => a.priority - b.priority).map(r => r.exchange).filter(Boolean)
  } catch {
    return []
  }
}

async function getRdap(domain: string): Promise<{ createdAt?: string; registrar?: string }> {
  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(`https://rdap.org/domain/${domain}`, {
      headers: { Accept: 'application/rdap+json' },
      signal: controller.signal
    })
    clearTimeout(t)
    if (!res.ok) return {}
    const data: any = await res.json()
    const events = Array.isArray(data.events) ? data.events : []
    const reg = events.find((e: any) => e.eventAction === 'registration')
    let registrar: string | undefined
    const entities = Array.isArray(data.entities) ? data.entities : []
    const regEnt = entities.find((e: any) => Array.isArray(e.roles) && e.roles.includes('registrar'))
    if (regEnt?.vcardArray?.[1]) {
      const fn = regEnt.vcardArray[1].find((f: any) => Array.isArray(f) && f[0] === 'fn')
      if (fn) registrar = fn[3]
    }
    return { createdAt: reg?.eventDate, registrar }
  } catch {
    return {}
  }
}

/**
 * Probe SMTP best-effort: prova un RCPT TO verso il primo MX. Spesso bloccato
 * (porta 25 in uscita) o inconcludente (catch-all/greylisting): ritorna 'unknown'
 * in quei casi, MAI un falso "verificata".
 */
function smtpProbe(email: string, mxHost: string): Promise<'accepted' | 'rejected' | 'unknown'> {
  return new Promise((resolve) => {
    let resolved = false
    const done = (r: 'accepted' | 'rejected' | 'unknown') => {
      if (resolved) return
      resolved = true
      try { socket.destroy() } catch { /* noop */ }
      resolve(r)
    }
    const socket = net.createConnection(25, mxHost)
    socket.setTimeout(SMTP_TIMEOUT_MS)
    let stage = 0
    socket.on('data', (data) => {
      const line = data.toString()
      const code = parseInt(line.slice(0, 3), 10)
      if (stage === 0 && code === 220) {
        socket.write('HELO trovami.pro\r\n'); stage = 1
      } else if (stage === 1 && code <= 250) {
        socket.write('MAIL FROM:<verify@trovami.pro>\r\n'); stage = 2
      } else if (stage === 2 && code <= 250) {
        socket.write(`RCPT TO:<${email}>\r\n`); stage = 3
      } else if (stage === 3) {
        if (code >= 200 && code < 300) done('accepted')
        else if (code === 550 || code === 551 || code === 553) done('rejected')
        else done('unknown')
      }
    })
    socket.on('timeout', () => done('unknown'))
    socket.on('error', () => done('unknown'))
    socket.on('end', () => done('unknown'))
  })
}

function localPart(email: string): string {
  return email.toLowerCase().split('@')[0] || ''
}

/** Verifica una singola email combinando i segnali disponibili. */
async function verifyOne(
  email: string,
  source: 'site' | 'inferred',
  mxHosts: string[],
  trySmtp: boolean
): Promise<VerifiedEmail> {
  const lower = email.toLowerCase().trim()
  const reasons: string[] = []
  const domain = lower.split('@')[1] || ''
  const lp = localPart(lower)
  const isRole = ROLE_LOCALPARTS.has(lp)
  const isDisposable = DISPOSABLE_DOMAINS.has(domain)
  const mxValid = mxHosts.length > 0

  if (!EMAIL_RE.test(lower)) {
    return { email: lower, confidence: 'invalid', source, isRole, isDisposable, mxValid, reasons: ['Sintassi non valida'] }
  }
  if (isDisposable) {
    return { email: lower, confidence: 'risky', source, isRole, isDisposable, mxValid, reasons: ['Dominio usa-e-getta'] }
  }
  if (!mxValid) {
    return { email: lower, confidence: 'invalid', source, isRole, isDisposable, mxValid, reasons: ['Il dominio non riceve email (nessun MX)'] }
  }

  // SMTP best-effort (solo se richiesto e c'è un MX)
  let smtp: VerifiedEmail['smtp'] = undefined
  if (trySmtp && mxHosts[0]) {
    smtp = await smtpProbe(lower, mxHosts[0])
  }

  let confidence: EmailConfidence
  if (smtp === 'accepted') { confidence = 'verified'; reasons.push('Casella confermata dal server (SMTP)') }
  else if (smtp === 'rejected') { confidence = 'invalid'; reasons.push('Casella rifiutata dal server (SMTP)') }
  else {
    // Senza conferma SMTP: dominio con MX = "probabile". Le email dal sito sono più
    // affidabili delle dedotte.
    confidence = 'probable'
    reasons.push(mxValid ? 'Dominio con email attiva (MX)' : '')
    if (source === 'site') reasons.push('Presente sul sito')
    if (source === 'inferred') reasons.push('Indirizzo dedotto da pattern comune')
  }
  if (isRole) reasons.push('Indirizzo di reparto (info@/contatti@)')

  return { email: lower, confidence, source, isRole, isDisposable, mxValid, smtp, reasons: reasons.filter(Boolean) }
}

/**
 * Arricchisce un lead: dominio (RDAP), MX/provider, e verifica le email note +
 * inferisce indirizzi business plausibili.
 *
 * @param websiteUrl url del sito del lead
 * @param siteEmails email già trovate (dal sito / dal DB)
 * @param opts.trySmtp esegue il probe SMTP (best-effort, può essere bloccato)
 */
export async function enrichLeadFull(
  websiteUrl: string | null | undefined,
  siteEmails: string[] = [],
  opts: { trySmtp?: boolean; businessName?: string } = {}
): Promise<LeadEnrichmentResult | null> {
  const domain = extractDomain(websiteUrl)
  if (!domain) return null

  const [mxHosts, rdap] = await Promise.all([getMx(domain), getRdap(domain)])

  let domainAgeYears: number | undefined
  if (rdap.createdAt) {
    const ms = Date.now() - new Date(rdap.createdAt).getTime()
    if (!isNaN(ms) && ms > 0) domainAgeYears = Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000))
  }

  // Candidate email: quelle del sito (dello stesso dominio) + pattern business comuni.
  const candidates = new Map<string, 'site' | 'inferred'>()
  for (const e of siteEmails) {
    const lower = (e || '').toLowerCase().trim()
    if (EMAIL_RE.test(lower) && lower.endsWith('@' + domain)) candidates.set(lower, 'site')
  }
  // Pattern business plausibili (solo se il dominio ha MX, altrimenti inutile)
  if (mxHosts.length > 0) {
    for (const lp of ['info', 'contatti', 'amministrazione']) {
      const guess = `${lp}@${domain}`
      if (!candidates.has(guess)) candidates.set(guess, 'inferred')
    }
  }

  // Verifica (SMTP solo sulle email del sito per non spammare, e max 1 per non rallentare)
  const entries = Array.from(candidates.entries())
  const emails: VerifiedEmail[] = []
  let smtpBudget = opts.trySmtp ? 2 : 0
  for (const [email, source] of entries) {
    const useSmtp = smtpBudget > 0 && source === 'site'
    if (useSmtp) smtpBudget--
    emails.push(await verifyOne(email, source, mxHosts, useSmtp))
  }

  // Ordina: verificate > probabili > risky > invalid; sito prima delle dedotte.
  const rank: Record<EmailConfidence, number> = { verified: 0, probable: 1, risky: 2, invalid: 3 }
  emails.sort((a, b) => rank[a.confidence] - rank[b.confidence] || (a.source === b.source ? 0 : a.source === 'site' ? -1 : 1))

  return {
    domain,
    domainCreatedAt: rdap.createdAt,
    domainAgeYears,
    registrar: rdap.registrar,
    hasMxRecords: mxHosts.length > 0,
    mxHosts,
    emailProvider: inferEmailProvider(mxHosts),
    emails,
    generatedAt: new Date().toISOString()
  }
}
