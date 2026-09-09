/**
 * UnlockLeadModal — L'UNICO flusso di sblocco lead del prodotto.
 *
 * Regole:
 * - Ogni sblocco passa da qui: costo e saldo SEMPRE espliciti, mai sblocchi
 *   silenziosi (prima esistevano 3 flussi diversi: lista senza conferma,
 *   swipe con modale, dettaglio che scalava il credito al caricamento pagina).
 * - La chiamata API vive qui dentro: i chiamanti ricevono solo il risultato.
 * - Gestisce i piani illimitati (creditsRemaining === -1).
 *
 * Presentazione: e' il momento piu' delicato del prodotto, quindi e' la
 * schermata piu' silenziosa. Nessuna icona decorativa, nessun contatore,
 * nessuna urgenza: si dice cosa si sblocca, quanto costa e quanto resta.
 * Guida: apps/frontend-app/DESIGN.md
 *
 * Usato da: dashboard (lista/griglia), pagina dettaglio lead.
 */

'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'
import { getOpportunity } from '@/lib/utils/opportunity'
import { hasCredits as hasCreditsFn, isUnlimitedCredits } from '@/lib/utils/credits-display'
import { Button, LinkButton, cn } from '@/components/ui'

export interface UnlockableLead {
  id: string
  business_name?: string | null
  city?: string | null
  category?: string | null
  score: number
  score_version?: number | null
}

export interface UnlockResult {
  leadId: string
  phone: string | null
  email: string | null
  credits_remaining: number
  already_opened: boolean
}

interface UnlockLeadModalProps {
  isOpen: boolean
  lead: UnlockableLead | null
  /** saldo crediti attuale; -1 = piano illimitato */
  creditsRemaining: number
  onClose: () => void
  /** chiamato a sblocco riuscito, con i contatti e il nuovo saldo */
  onUnlocked: (result: UnlockResult) => void
}

/** Stessa mappatura usata da LeadCard: lo stato e' un pallino, non un badge. */
function opportunityDot(label: string): string {
  if (label === 'Opportunità alta') return 'bg-success'
  if (label === 'Opportunità media') return 'bg-warning'
  return 'bg-content-subtle'
}

export default function UnlockLeadModal({
  isOpen,
  lead,
  creditsRemaining,
  onClose,
  onUnlocked
}: UnlockLeadModalProps) {
  const { error: toastError } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const unlimited = isUnlimitedCredits(creditsRemaining)
  const canUnlock = hasCreditsFn(creditsRemaining)
  const opportunity = lead ? getOpportunity(lead.score, lead.score_version) : null

  // CHE COS'E': categoria + citta'. Il nome resta nascosto: e' quello che si compra.
  const identity = lead
    ? lead.city
      ? `${lead.category || 'Attività locale'} a ${lead.city}`
      : lead.category || 'Attività locale'
    : ''

  const handleConfirm = async () => {
    if (!lead || isLoading) return
    setIsLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        toastError('Sessione scaduta', 'Effettua nuovamente il login.')
        return
      }

      const response = await fetch(`/api/leads/${lead.id}/unlock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      const data = await response.json()

      if (!response.ok) {
        toastError('Sblocco non riuscito', data.error || 'Riprova tra qualche istante.')
        return
      }

      onUnlocked({
        leadId: lead.id,
        phone: data.phone ?? null,
        email: data.email ?? null,
        credits_remaining: typeof data.credits_remaining === 'number' ? data.credits_remaining : creditsRemaining,
        already_opened: data.already_opened === true
      })
      onClose()
    } catch (err) {
      console.error('Errore sblocco lead:', err)
      toastError('Errore di rete', 'Controlla la connessione e riprova.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => !isLoading && onClose()}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative w-full max-w-md transform overflow-hidden rounded-panel bg-surface-overlay p-6 shadow-pop transition-all">
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  onClick={onClose}
                  disabled={isLoading}
                  aria-label="Chiudi"
                  icon={<X />}
                  className="absolute right-3 top-3 text-content-subtle"
                />

                <Dialog.Title className="pr-10 text-heading font-semibold text-content">
                  {canUnlock ? 'Sblocchiamo questo lead?' : 'Non hai più crediti'}
                </Dialog.Title>

                {/* Cosa stai sbloccando: identita' + stato, senza il nome. */}
                {lead && canUnlock && (
                  <div className="mt-4 border-t border-edge pt-4">
                    <p className="text-body text-content">{identity}</p>
                    {opportunity && (
                      <span className="mt-1.5 inline-flex items-center gap-1.5 text-caption text-content-muted">
                        <span
                          className={cn('h-1.5 w-1.5 rounded-pill', opportunityDot(opportunity.label))}
                          aria-hidden="true"
                        />
                        {opportunity.label}
                        <span className="tabular-nums text-content-subtle">
                          {opportunity.value}
                          <span className="sr-only"> su 100</span>
                        </span>
                      </span>
                    )}
                    <p className="mt-3 text-body text-content-muted">
                      Sbloccando vedi il nome dell&apos;attività e come contattarla:
                      telefono, email e sito.
                    </p>
                  </div>
                )}

                {/* Costo e saldo, in una frase. Nessuna urgenza. */}
                <div className="mt-5 border-t border-edge pt-5">
                  {canUnlock ? (
                    unlimited ? (
                      <p className="text-caption text-content-subtle">
                        Il tuo piano ha crediti illimitati: lo sblocco non consuma nulla.
                      </p>
                    ) : (
                      <p className="text-caption text-content-subtle">
                        Costa 1 credito. Te ne restano{' '}
                        <span className="tabular-nums text-content-muted">{creditsRemaining}</span>, dopo
                        lo sblocco{' '}
                        <span className="tabular-nums text-content-muted">{creditsRemaining - 1}</span>.
                      </p>
                    )
                  ) : (
                    <p className="text-body text-content-muted">
                      Hai usato tutti i crediti del tuo piano. Puoi continuare a sbloccare
                      lead passando a un piano superiore.
                    </p>
                  )}

                  <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button variant="secondary" onClick={onClose} disabled={isLoading}>
                      Annulla
                    </Button>

                    {canUnlock ? (
                      <Button onClick={handleConfirm} loading={isLoading} loadingText="Sblocco…">
                        Sblocca il lead
                      </Button>
                    ) : (
                      <LinkButton href="/upgrade">Vedi i piani</LinkButton>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
