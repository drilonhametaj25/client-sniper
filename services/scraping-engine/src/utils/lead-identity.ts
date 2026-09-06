/**
 * Identità del lead: unique_key e content_hash DETERMINISTICI.
 * Unica fonte di verità per l'identità di un business nel database.
 *
 * Problemi risolti:
 * - unique_key era derivato dal NOME del business: un rename su Google Maps
 *   creava un duplicato. Ora: dominio+città -> telefono -> nome (solo tier 3).
 * - content_hash includeva Date.now(): ogni re-scrape produceva un hash nuovo
 *   e l'INSERT cieco veniva rigettato dal vincolo unique -> i lead non venivano
 *   MAI aggiornati. Ora l'hash dipende solo dai fatti osservati.
 *
 * Usato da: lead-generator.ts (upsert) e dagli script di dedup/backfill.
 * Parte del modulo services/scraping-engine.
 */

import { createHash } from 'crypto'

export interface LeadIdentityInput {
  source?: string
  name?: string
  website?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  category?: string | null
}

/** Hostname senza www, minuscolo. null se l'URL non è valido/assente. */
export function normalizeDomain(website?: string | null): string | null {
  if (!website) return null
  try {
    const host = new URL(website.includes('://') ? website : `https://${website}`)
      .hostname.toLowerCase().replace(/^www\./, '')
    return host || null
  } catch {
    return null
  }
}

/** Ultime 9 cifre del numero (il prefisso internazionale/nazionale varia). */
export function normalizePhoneTail(phone?: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return null
  return digits.slice(-9)
}

export function normalizeToken(value?: string | null, maxLen = 60): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // rimuove accenti
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, maxLen) || 'unknown'
}

/**
 * unique_key con priorità:
 *  1. dominio del sito (+ città: le catene hanno una riga per città)
 *  2. telefono normalizzato
 *  3. nome + città + fonte (ultimo ricorso: è l'unico tier sensibile ai rename)
 */
export function computeUniqueKey(input: LeadIdentityInput): string {
  const domain = normalizeDomain(input.website)
  if (domain) {
    return `domain:${domain}:${normalizeToken(input.city)}`
  }

  const phoneTail = normalizePhoneTail(input.phone)
  if (phoneTail) {
    return `phone:${phoneTail}`
  }

  const source = normalizeToken(input.source || 'google_maps', 20)
  return `place:${source}:${normalizeToken(input.name)}:${normalizeToken(input.city)}`
}

export interface ContentHashInput extends LeadIdentityInput {
  /** lista ordinabile dei difetti CONFERMATI (issues critical+high) */
  confirmedIssues?: string[]
  /** technicalHealth a bucket di 10 (piccole oscillazioni non sono "cambiamenti") */
  technicalHealth?: number | null
  hasWebsite?: boolean
}

/**
 * Hash deterministico dei fatti osservati: due scrape dello stesso business
 * nello stesso stato producono lo STESSO hash (così l'upsert può dire
 * "nessun cambiamento -> aggiorna solo last_seen_at").
 */
export function computeContentHash(input: ContentHashInput): string {
  const stable = {
    domain: normalizeDomain(input.website) || '',
    phone: normalizePhoneTail(input.phone) || '',
    address: normalizeToken(input.address, 80),
    category: normalizeToken(input.category, 40),
    hasWebsite: input.hasWebsite ?? !!input.website,
    issues: [...(input.confirmedIssues || [])].sort(),
    healthBucket: input.technicalHealth === null || input.technicalHealth === undefined
      ? null
      : Math.round(input.technicalHealth / 10) * 10
  }
  return createHash('sha256').update(JSON.stringify(stable)).digest('hex')
}
