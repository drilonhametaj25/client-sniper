/**
 * Arricchimento lead con dati pubblici, gratuiti e affidabili.
 *
 * A differenza dei "numeri social" inventati, qui usiamo solo fonti deterministiche:
 *  - RDAP (registro domini): data di registrazione del dominio -> età/maturità azienda
 *  - DNS MX: il dominio può ricevere email? con quale provider (Google/Microsoft/Aruba...)
 *
 * Questi dati sono il primo mattone di una sezione "contatti tipo Apollo": sapere che
 * un dominio ha email attiva (MX) e con che provider è la base per scoprire/validare
 * gli indirizzi. Nessuna chiave API necessaria.
 *
 * Parte del modulo services/scraping-engine.
 */

import { promises as dns } from 'dns'
import axios from 'axios'

export interface LeadEnrichment {
  domain: string
  // Dominio
  domainCreatedAt?: string          // ISO date (da RDAP), se disponibile
  domainAgeYears?: number           // anni dalla registrazione
  registrar?: string
  // Email (deliverability)
  hasMxRecords: boolean             // il dominio accetta email?
  mxHosts: string[]
  emailProvider?: string            // 'Google Workspace' | 'Microsoft 365' | 'Aruba' | ...
  // Diagnostica
  sources: string[]                 // quali lookup sono riusciti
}

const TIMEOUT_MS = 8000

function extractDomain(websiteUrl: string): string | null {
  try {
    const u = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`
    return new URL(u).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

/** Deduce il provider email dai record MX (segnale utile per outreach e validazione). */
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
  if (mxHosts.length > 0) return 'Self-hosted / altro'
  return undefined
}

async function fetchMx(domain: string): Promise<{ hasMxRecords: boolean; mxHosts: string[] }> {
  try {
    const records = await dns.resolveMx(domain)
    const hosts = records
      .sort((a, b) => a.priority - b.priority)
      .map(r => r.exchange)
      .filter(Boolean)
    return { hasMxRecords: hosts.length > 0, mxHosts: hosts }
  } catch {
    // NXDOMAIN / nessun MX
    return { hasMxRecords: false, mxHosts: [] }
  }
}

async function fetchRdap(domain: string): Promise<{ createdAt?: string; registrar?: string }> {
  try {
    // rdap.org instrada verso il registry RDAP corretto per il TLD. Gratis, no key.
    const res = await axios.get(`https://rdap.org/domain/${domain}`, {
      timeout: TIMEOUT_MS,
      validateStatus: () => true,
      headers: { 'Accept': 'application/rdap+json' }
    })
    if (res.status !== 200 || !res.data) return {}

    // Data di registrazione: evento con eventAction === 'registration'
    let createdAt: string | undefined
    const events = Array.isArray(res.data.events) ? res.data.events : []
    const reg = events.find((e: any) => e.eventAction === 'registration')
    if (reg?.eventDate) createdAt = reg.eventDate

    // Registrar: entità con ruolo 'registrar'
    let registrar: string | undefined
    const entities = Array.isArray(res.data.entities) ? res.data.entities : []
    const regEnt = entities.find((e: any) => Array.isArray(e.roles) && e.roles.includes('registrar'))
    if (regEnt?.vcardArray?.[1]) {
      const fn = regEnt.vcardArray[1].find((f: any) => Array.isArray(f) && f[0] === 'fn')
      if (fn) registrar = fn[3]
    }

    return { createdAt, registrar }
  } catch {
    // Alcuni TLD (es. .it) non espongono la data di creazione via RDAP pubblico: ok.
    return {}
  }
}

/**
 * Arricchisce un lead a partire dall'URL del sito. Difensivo: ritorna comunque un
 * oggetto (con hasMxRecords:false) se i lookup falliscono, mai un throw.
 */
export async function enrichLead(websiteUrl: string | null | undefined): Promise<LeadEnrichment | null> {
  if (!websiteUrl) return null
  const domain = extractDomain(websiteUrl)
  if (!domain) return null

  const [mx, rdap] = await Promise.all([fetchMx(domain), fetchRdap(domain)])

  const sources: string[] = []
  if (mx.hasMxRecords) sources.push('dns-mx')
  if (rdap.createdAt || rdap.registrar) sources.push('rdap')

  let domainAgeYears: number | undefined
  if (rdap.createdAt) {
    const ms = Date.now() - new Date(rdap.createdAt).getTime()
    if (!isNaN(ms) && ms > 0) domainAgeYears = Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000))
  }

  return {
    domain,
    domainCreatedAt: rdap.createdAt,
    domainAgeYears,
    registrar: rdap.registrar,
    hasMxRecords: mx.hasMxRecords,
    mxHosts: mx.mxHosts,
    emailProvider: inferEmailProvider(mx.mxHosts),
    sources
  }
}
