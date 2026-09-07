/**
 * LeadContacts — Contatti del lead (solo per lead sbloccati).
 *
 * Telefono, email, sito web e link Google Maps con pulsanti copia negli
 * appunti (feedback via toast). Sotto la card mostra VerifiedContactsCard
 * con i dati di arricchimento on-demand (contatti verificati, dati azienda).
 *
 * Usato da: app/lead/[id]/page.tsx (solo vista sbloccata)
 */

'use client'

import { Phone, Mail, Globe, MapPin, Copy } from 'lucide-react'
import { useToast } from '@/components/ToastProvider'
import VerifiedContactsCard from '@/components/VerifiedContactsCard'

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

  const CopyButton = ({ label, value }: { label: string; value: string }) => (
    <button
      onClick={() => copy(label, value)}
      className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      title={`Copia ${label.toLowerCase()}`}
      aria-label={`Copia ${label.toLowerCase()}`}
    >
      <Copy className="h-4 w-4" />
    </button>
  )

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Contatti
        </h2>

        <div className="space-y-3">
          {phone && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center min-w-0">
                <Phone className="h-4 w-4 text-gray-400 mr-3 shrink-0" />
                <a href={`tel:${phone}`} className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate">
                  {phone}
                </a>
              </div>
              <CopyButton label="Telefono" value={phone} />
            </div>
          )}

          {email && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center min-w-0">
                <Mail className="h-4 w-4 text-gray-400 mr-3 shrink-0" />
                <a href={`mailto:${email}`} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline truncate">
                  {email}
                </a>
              </div>
              <CopyButton label="Email" value={email} />
            </div>
          )}

          {websiteUrl && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center min-w-0">
                <Globe className="h-4 w-4 text-gray-400 mr-3 shrink-0" />
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline truncate"
                >
                  {websiteUrl}
                </a>
              </div>
              <CopyButton label="Sito web" value={websiteUrl} />
            </div>
          )}

          {mapsUrl && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-start min-w-0">
                <MapPin className="h-4 w-4 text-gray-400 mr-3 mt-0.5 shrink-0" />
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
                >
                  {address || 'Apri su Google Maps'}
                </a>
              </div>
              {address && <CopyButton label="Indirizzo" value={address} />}
            </div>
          )}

          {!phone && !email && !websiteUrl && !mapsUrl && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nessun contatto diretto disponibile per questo lead.
            </p>
          )}
        </div>
      </div>

      {/* Contatti verificati e dati azienda (arricchimento on-demand) */}
      <VerifiedContactsCard leadId={leadId} phone={phone || undefined} />
    </>
  )
}
