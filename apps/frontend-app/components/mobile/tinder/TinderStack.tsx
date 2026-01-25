/**
 * TinderStack - Container per stack di card swipeable
 *
 * Gestisce:
 * - Stack di 3 card visibili (effetto depth)
 * - Stato unlock/skip/archive per ogni lead
 * - Modal di conferma sblocco
 * - Statistiche sessione
 */

'use client'

import { useState, useCallback } from 'react'
import { Archive, RotateCcw, Zap, X, ChevronUp } from 'lucide-react'
import SwipeableCard from './SwipeableCard'
import UnlockConfirmModal from './UnlockConfirmModal'
import UnlockedCard from './UnlockedCard'
import { triggerFullUnlockCelebration } from '@/lib/animations'
import type { ServiceType } from '@/lib/types/services'

interface Lead {
  id: string
  business_name?: string
  website_url?: string
  city?: string
  category?: string
  phone?: string
  email?: string
  score: number
  created_at?: string
  analysis?: any
  website_analysis?: any
}

interface TinderStackProps {
  leads: Lead[]
  userServices: ServiceType[]
  creditsRemaining: number
  onUnlock: (leadId: string) => Promise<{ success: boolean; phone?: string; email?: string }>
  onSkip: (leadId: string) => void
  onArchive: (leadId: string) => void
  onRefresh: () => void
}

interface SessionStats {
  viewed: number
  unlocked: number
  skipped: number
  archived: number
}

export default function TinderStack({
  leads,
  userServices,
  creditsRemaining,
  onUnlock,
  onSkip,
  onArchive,
  onRefresh
}: TinderStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingUnlockLead, setPendingUnlockLead] = useState<Lead | null>(null)
  const [unlockedLead, setUnlockedLead] = useState<Lead | null>(null)
  const [unlockedData, setUnlockedData] = useState<{ phone?: string; email?: string } | null>(null)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [stats, setStats] = useState<SessionStats>({
    viewed: 0,
    unlocked: 0,
    skipped: 0,
    archived: 0
  })

  // Lead visibili nello stack (max 3)
  const visibleLeads = leads.slice(currentIndex, currentIndex + 3)
  const hasMoreLeads = currentIndex < leads.length

  // Handler swipe right - mostra confirm modal
  const handleSwipeRight = useCallback((lead: Lead) => {
    setPendingUnlockLead(lead)
    setShowConfirmModal(true)
  }, [])

  // Handler swipe left - skip
  const handleSwipeLeft = useCallback((lead: Lead) => {
    onSkip(lead.id)
    setStats(prev => ({ ...prev, viewed: prev.viewed + 1, skipped: prev.skipped + 1 }))
    setCurrentIndex(prev => prev + 1)
  }, [onSkip])

  // Handler swipe up - archive
  const handleSwipeUp = useCallback((lead: Lead) => {
    onArchive(lead.id)
    setStats(prev => ({ ...prev, viewed: prev.viewed + 1, archived: prev.archived + 1 }))
    setCurrentIndex(prev => prev + 1)
  }, [onArchive])

  // Conferma sblocco
  const handleConfirmUnlock = useCallback(async () => {
    if (!pendingUnlockLead) return

    setIsUnlocking(true)
    try {
      const result = await onUnlock(pendingUnlockLead.id)

      if (result.success) {
        // Celebra!
        triggerFullUnlockCelebration()

        // Mostra card sbloccata
        setUnlockedLead(pendingUnlockLead)
        setUnlockedData({ phone: result.phone, email: result.email })
        setStats(prev => ({ ...prev, viewed: prev.viewed + 1, unlocked: prev.unlocked + 1 }))
      }
    } finally {
      setIsUnlocking(false)
      setShowConfirmModal(false)
      setPendingUnlockLead(null)
    }
  }, [pendingUnlockLead, onUnlock])

  // Chiudi modal conferma
  const handleCancelUnlock = useCallback(() => {
    setShowConfirmModal(false)
    setPendingUnlockLead(null)
  }, [])

  // Passa al prossimo lead dopo aver visto quello sbloccato
  const handleNextAfterUnlock = useCallback(() => {
    setUnlockedLead(null)
    setUnlockedData(null)
    setCurrentIndex(prev => prev + 1)
  }, [])

  // Bottoni azioni manuali
  const handleManualSkip = useCallback(() => {
    if (visibleLeads[0]) {
      handleSwipeLeft(visibleLeads[0])
    }
  }, [visibleLeads, handleSwipeLeft])

  const handleManualUnlock = useCallback(() => {
    if (visibleLeads[0]) {
      handleSwipeRight(visibleLeads[0])
    }
  }, [visibleLeads, handleSwipeRight])

  const handleManualArchive = useCallback(() => {
    if (visibleLeads[0]) {
      handleSwipeUp(visibleLeads[0])
    }
  }, [visibleLeads, handleSwipeUp])

  // Se stiamo mostrando un lead sbloccato
  if (unlockedLead && unlockedData) {
    return (
      <UnlockedCard
        lead={unlockedLead}
        phone={unlockedData.phone}
        email={unlockedData.email}
        onNext={handleNextAfterUnlock}
      />
    )
  }

  // Se non ci sono più lead
  if (!hasMoreLeads || visibleLeads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Hai visto tutti i lead!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Torna più tardi per nuove opportunità
        </p>

        {/* Stats sessione */}
        <div className="grid grid-cols-3 gap-4 mb-6 w-full max-w-xs">
          <div className="bg-green-100 dark:bg-green-900/30 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.unlocked}
            </div>
            <div className="text-xs text-green-700 dark:text-green-300">Sbloccati</div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {stats.skipped}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Saltati</div>
          </div>
          <div className="bg-purple-100 dark:bg-purple-900/30 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.archived}
            </div>
            <div className="text-xs text-purple-700 dark:text-purple-300">Archiviati</div>
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Ricarica lead
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header con stats */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {currentIndex + 1} / {leads.length}
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-full">
          <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="font-semibold text-amber-700 dark:text-amber-300">
            {creditsRemaining} crediti
          </span>
        </div>
      </div>

      {/* Stack di card */}
      <div className="flex-1 relative overflow-hidden p-4">
        <div className="relative w-full h-full max-w-sm mx-auto">
          {visibleLeads.map((lead, i) => (
            <SwipeableCard
              key={lead.id}
              lead={lead}
              userServices={userServices}
              index={i}
              total={visibleLeads.length}
              isTop={i === 0}
              onSwipeRight={() => handleSwipeRight(lead)}
              onSwipeLeft={() => handleSwipeLeft(lead)}
              onSwipeUp={() => handleSwipeUp(lead)}
            />
          ))}
        </div>
      </div>

      {/* Bottoni azione */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center gap-6">
          {/* Skip */}
          <button
            onClick={handleManualSkip}
            className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors shadow-lg"
            title="Salta"
          >
            <X className="w-7 h-7" />
          </button>

          {/* Archive */}
          <button
            onClick={handleManualArchive}
            className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-500 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors shadow-lg"
            title="Archivia"
          >
            <ChevronUp className="w-6 h-6" />
          </button>

          {/* Unlock */}
          <button
            onClick={handleManualUnlock}
            disabled={creditsRemaining <= 0}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${
              creditsRemaining > 0
                ? 'bg-green-100 dark:bg-green-900/30 text-green-500 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
            title="Sblocca"
          >
            <Zap className="w-7 h-7" />
          </button>
        </div>

        {/* Legenda swipe */}
        <div className="flex justify-center gap-6 mt-3 text-xs text-gray-500 dark:text-gray-400">
          <span>← Salta</span>
          <span>↑ Archivia</span>
          <span>Sblocca →</span>
        </div>
      </div>

      {/* Modal conferma */}
      <UnlockConfirmModal
        isOpen={showConfirmModal}
        lead={pendingUnlockLead}
        creditsRemaining={creditsRemaining}
        isLoading={isUnlocking}
        onConfirm={handleConfirmUnlock}
        onCancel={handleCancelUnlock}
      />
    </div>
  )
}
