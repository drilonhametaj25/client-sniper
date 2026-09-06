/**
 * Autenticazione per le route cron (/api/cron/*)
 * Usato da: tutti i cron job (Vercel Cron e GitHub Actions)
 *
 * Regole:
 * - Confronto constant-time sul CRON_SECRET (header Authorization: Bearer <secret>)
 * - Fail-closed: se CRON_SECRET non è configurato, nessuna richiesta è autorizzata
 * - Nessun bypass basato su user-agent (spoofabile) e nessun secret di fallback
 *
 * Vercel Cron invia automaticamente "Authorization: Bearer $CRON_SECRET"
 * quando la env var CRON_SECRET è impostata nel progetto.
 */

import { timingSafeEqual } from 'crypto'

export function requireCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const got = Buffer.from(request.headers.get('authorization') ?? '')
  const want = Buffer.from(`Bearer ${secret}`)
  return got.length === want.length && timingSafeEqual(got, want)
}

export function unauthorizedCronResponse(): Response {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
