/**
 * UnlockConfirmModal - Modal di conferma sblocco lead
 *
 * Mostra:
 * - Preview lead che si sta per sbloccare
 * - Costo in crediti
 * - Crediti rimanenti dopo sblocco
 * - Bottoni conferma/annulla
 */

'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Zap, AlertCircle, X } from 'lucide-react'

interface Lead {
  id: string
  business_name?: string
  website_url?: string
  city?: string
  category?: string
  score: number
}

interface UnlockConfirmModalProps {
  isOpen: boolean
  lead: Lead | null
  creditsRemaining: number
  isLoading: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function UnlockConfirmModal({
  isOpen,
  lead,
  creditsRemaining,
  isLoading,
  onConfirm,
  onCancel
}: UnlockConfirmModalProps) {
  const hasCredits = creditsRemaining > 0
  const creditsAfterUnlock = creditsRemaining - 1

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onCancel}>
        {/* Overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                {/* Close button */}
                <button
                  onClick={onCancel}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    hasCredits
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {hasCredits ? (
                      <Zap className="w-8 h-8 text-green-500" />
                    ) : (
                      <AlertCircle className="w-8 h-8 text-red-500" />
                    )}
                  </div>
                </div>

                {/* Title */}
                <Dialog.Title className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
                  {hasCredits ? 'Sblocca questo lead?' : 'Crediti esauriti'}
                </Dialog.Title>

                {/* Lead preview */}
                {lead && hasCredits && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {lead.category || 'Lead'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {lead.city || 'Posizione non disponibile'}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Score:</span>
                      <span className={`font-bold ${
                        lead.score <= 30 ? 'text-red-500' :
                        lead.score <= 60 ? 'text-amber-500' :
                        'text-green-500'
                      }`}>
                        {lead.score}/100
                      </span>
                    </div>
                  </div>
                )}

                {/* Credits info */}
                {hasCredits ? (
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
                        Dopo: <span className="font-semibold">{creditsAfterUnlock}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center mb-6">
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      Hai esaurito i crediti disponibili.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Passa a un piano superiore per ottenere più crediti.
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={onCancel}
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Annulla
                  </button>

                  {hasCredits ? (
                    <button
                      onClick={onConfirm}
                      disabled={isLoading}
                      className="flex-1 py-3 px-4 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
                    <button
                      onClick={() => window.location.href = '/pricing'}
                      className="flex-1 py-3 px-4 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors"
                    >
                      Upgrade
                    </button>
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
