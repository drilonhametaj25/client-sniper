/**
 * /credits - Redirect permanente verso la sezione pacchetti di /upgrade
 * La pagina dedicata è stata unificata in "Piano e crediti" (/upgrade#pacchetti).
 * Inoltra i parametri di ritorno del checkout Stripe (?purchase=success|cancelled&credits=N)
 * perché /api/credits/purchase (frozen) usa ancora /credits come success/cancel URL.
 */

import { redirect } from 'next/navigation'

export default function CreditsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') {
      params.set(key, value)
    } else if (Array.isArray(value) && value.length > 0) {
      params.set(key, value[0])
    }
  }

  const query = params.toString()
  redirect(`/upgrade${query ? `?${query}` : ''}#pacchetti`)
}
