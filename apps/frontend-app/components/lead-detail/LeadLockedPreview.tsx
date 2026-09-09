/**
 * LeadLockedPreview — l'unica cosa che manca è il contatto.
 *
 * La pagina bloccata mostra già l'attività, il problema principale e cosa gli si
 * può vendere (LeadHeader + LeadPitch): qui si dice, senza giri di parole, cosa
 * resta nascosto e quanto costa vederlo. Nessuna urgenza finta, nessun contatore:
 * costo e saldo scritti chiari, e la conferma passa sempre da UnlockLeadModal
 * (l'unico flusso che può consumare un credito).
 *
 * Guardare questa pagina non costa mai nulla.
 *
 * Usato da: app/lead/[id]/page.tsx
 */

'use client'

import { useMemo } from 'react'
import { Check } from 'lucide-react'
import {
  extractProblemKeysFromAnalysis,
  translateProblems
} from '@/lib/utils/problem-translator'
import { hasCredits, isUnlimitedCredits } from '@/lib/utils/credits-display'
import { Button, Card, CardTitle } from '@/components/ui'

interface LeadLockedPreviewProps {
  analysis?: any
  /** saldo crediti attuale; -1 = piano illimitato */
  creditsRemaining: number
  onUnlock: () => void
}

export default function LeadLockedPreview({
  analysis,
  creditsRemaining,
  onUnlock
}: LeadLockedPreviewProps) {
  const problemCount = useMemo(
    () => translateProblems(extractProblemKeysFromAnalysis(analysis)).length,
    [analysis]
  )

  const unlimited = isUnlimitedCredits(creditsRemaining)
  const canUnlock = hasCredits(creditsRemaining)

  const items = [
    "Nome dell'attività, telefono ed email",
    'Sito web e indirizzo, con copia negli appunti',
    problemCount > 0
      ? `Tutti i ${problemCount} problemi del sito, spiegati uno per uno`
      : "L'analisi completa del sito, spiegata in italiano",
    'Template pronti per email, WhatsApp e telefonata',
    'Preventivo automatico basato sui difetti rilevati'
  ]

  const costLine = unlimited
    ? 'Il tuo piano ha crediti illimitati: lo sblocco non consuma nulla.'
    : canUnlock
      ? `Costa 1 credito e te ne restano ${creditsRemaining}. Prima di usarlo ti chiediamo conferma.`
      : 'Non hai più crediti disponibili: nella finestra di sblocco trovi i piani.'

  return (
    <Card>
      <CardTitle>Cosa manca ancora</CardTitle>
      <p className="mt-2 max-w-xl text-body text-content-muted">
        Di questa attività hai già il quadro: quello che resta nascosto è come
        raggiungerla.
      </p>

      <ul className="mt-5 space-y-3">
        {items.map(item => (
          <li key={item} className="flex items-start gap-3">
            <Check className="mt-1 h-4 w-4 shrink-0 text-content-subtle" aria-hidden="true" />
            <span className="text-body text-content">{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 border-t border-edge pt-6">
        <Button size="lg" onClick={onUnlock} className="w-full sm:w-auto">
          Sblocca il lead
        </Button>
        <p className="mt-3 text-caption text-content-subtle">{costLine}</p>
      </div>
    </Card>
  )
}
