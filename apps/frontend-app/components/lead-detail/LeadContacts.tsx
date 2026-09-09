/**
 * LeadContacts — quello che l'utente ha comprato con il credito.
 *
 * È la prima cosa che vede dopo lo sblocco, quindi è la più leggibile della
 * pagina: etichetta piccola, valore grande e cliccabile, copia negli appunti a
 * un tocco (feedback via toast). Niente icone decorative: il contenuto è
 * l'interfaccia.
 *
 * Sotto la card resta VerifiedContactsCard con l'arricchimento on-demand.
 *
 * Usato da: app/lead/[id]/page.tsx (solo vista sbloccata)
 */

'use client'

import { Copy } from 'lucide-react'
import { useToast } from '@/components/ToastProvider'
import VerifiedContactsCard from '@/components/VerifiedContactsCard'
import { Button, Card, CardTitle, cn } from '@/components/ui'

interface LeadContactsProps {
  leadId: string
  businessName?: string | null
  phone?: string | null
  email?: string | null
  websiteUrl?: string | null
  address?: string | null
  city?: string | null
}

export default function LeadContacts({
  leadId,
  businessName,
  phone,
  email,
  websiteUrl,
  address,
  city
}: LeadContactsProps) {
  const { success, error: toastError } = useToast()

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      success('Copiato negli appunti', label)
    } catch {
      toastError('Copia non riuscita', 'Seleziona e copia il testo manualmente.')
    }
  }

  const mapsQuery = address || [businessName, city].filter(Boolean).join(' ')
  const mapsUrl = mapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
    : null

  const rows: Array<{
    label: string
    value: string
    href: string
    external?: boolean
    /** valore da copiare: se assente la riga non ha il pulsante copia */
    copyValue?: string
    numeric?: boolean
  }> = []

  if (phone) {
    rows.push({ label: 'Telefono', value: phone, href: `tel:${phone}`, copyValue: phone, numeric: true })
  }
  if (email) {
    rows.push({ label: 'Email', value: email, href: `mailto:${email}`, copyValue: email })
  }
  if (websiteUrl) {
    rows.push({
      label: 'Sito web',
      value: websiteUrl,
      // Molti lead hanno il dominio senza schema: senza https:// il link
      // diventa relativo e porta dentro l'app invece che sul sito.
      href: websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`,
      external: true,
      copyValue: websiteUrl
    })
  }
  if (mapsUrl) {
    rows.push({
      label: 'Indirizzo',
      value: address || 'Apri su Google Maps',
      href: mapsUrl,
      external: true,
      copyValue: address || undefined
    })
  }

  return (
    <>
      <Card padding="none">
        <div className="px-6 pt-6">
          <CardTitle>Contatti</CardTitle>
        </div>

        {rows.length === 0 ? (
          <p className="px-6 pb-6 pt-3 text-body text-content-muted">
            Per questo lead non abbiamo contatti diretti. Puoi comunque usare i dati
            azienda qui sotto per raggiungerlo.
          </p>
        ) : (
          <ul className="mt-4 pb-3">
            {rows.map((row, index) => (
              <li
                key={row.label}
                className={cn(
                  'flex items-center gap-3 px-6 py-3',
                  index > 0 && 'border-t border-edge'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-micro text-content-subtle">{row.label}</div>
                  <a
                    href={row.href}
                    {...(row.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className={cn(
                      'focus-ring mt-0.5 block break-words rounded-sm text-body-lg text-content',
                      'underline-offset-4 transition-colors duration-fast ease-soft',
                      'hover:text-accent-ink hover:underline',
                      row.numeric && 'tabular-nums'
                    )}
                  >
                    {row.value}
                  </a>
                </div>

                {row.copyValue && (
                  <Button
                    variant="ghost"
                    size="md"
                    iconOnly
                    icon={<Copy />}
                    aria-label={`Copia ${row.label.toLowerCase()}`}
                    onClick={() => copy(row.label, row.copyValue as string)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Contatti verificati e dati azienda (arricchimento on-demand) */}
      <VerifiedContactsCard leadId={leadId} phone={phone || undefined} />
    </>
  )
}
