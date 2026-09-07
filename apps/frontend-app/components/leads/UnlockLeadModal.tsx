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
 * Usato da: dashboard (lista/griglia), pagina dettaglio lead.
 */

'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Zap, AlertCircle, X, Crown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'
import { getOpportunity } from '@/lib/utils/opportunity'
import { hasCredits as hasCreditsFn, isUnlimitedCredits } from '@/lib/utils/credits-display'

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
              <Dialog.Panel className="relative w-full max-w-sm transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Chiudi"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Icona */}
                <div className="flex justify-center mb-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    canUnlock
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {unlimited ? (
                      <Crown className="w-8 h-8 text-purple-500" />
                    ) : canUnlock ? (
                      <Zap className="w-8 h-8 text-blue-500" />
                    ) : (
                      <AlertCircle className="w-8 h-8 text-red-500" />
                    )}
                  </div>
                </div>

                <Dialog.Title className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
                  {canUnlock ? 'Sblocca questo lead?' : 'Crediti esauriti'}
                </Dialog.Title>

                {/* Anteprima lead */}
                {lead && canUnlock && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {lead.category || 'Attività locale'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {lead.city || 'Posizione non disponibile'}
                    </div>
                    {opportunity && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${opportunity.badgeClass}`}>
                          {opportunity.label} · {opportunity.value}/100
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Info costo/saldo */}
                {canUnlock ? (
                  unlimited ? (
                    <div className="text-center mb-6 text-gray-600 dark:text-gray-400">
                      Il tuo piano ha <span className="font-bold text-purple-600 dark:text-purple-400">crediti illimitati</span>:
                      lo sblocco non consuma nulla.
                    </div>
                  ) : (
                    <div className="text-center mb-6">
                      <div className="text-gray-600 dark:text-gray-400 mb-2">
                        Questo sblocco costa <span className="font-bold text-amber-600">1 credito</span>
                      </div>
                      <div className="flex items-center justify-center gap-4 text-sm">
                        <div className="text-gray-500 dark:text-gray-400">
                          Attuali: <span className="font-semibold">{creditsRemaining}</span>
                        </div>
                        <span className="text-gray-300 dark:text-gray-600">→</span>
                        <div className="text-gray-500 dark:text-gray-400">
                          Dopo: <span className="font-semibold">{creditsRemaining - 1}</span>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="text-center mb-6">
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      Hai esaurito i crediti disponibili.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Passa a un piano superiore per continuare a sbloccare lead.
                    </p>
                  </div>
                )}

                {/* Azioni */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Annulla
                  </button>

                  {canUnlock ? (
                    <button
                      onClick={handleConfirm}
                      disabled={isLoading}
                      className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sblocco...
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5" />
                          Sblocca
                        </>
                      )}
                    </button>
                  ) : (
                    <a
                      href="/upgrade"
                      className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors text-center"
                    >
                      Vedi i piani
                    </a>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
