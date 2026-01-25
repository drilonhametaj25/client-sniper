/**
 * ForYou Section Component
 *
 * Sezione dashboard con lead personalizzati per l'utente.
 * Include: Daily Top 5, Perfect Match, High Budget, Near You, New Today.
 *
 * @file apps/frontend-app/components/dashboard/ForYouSection.tsx
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Sparkles,
  Target,
  DollarSign,
  MapPin,
  Clock,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import SectionHeader from './SectionHeader'
import LeadCarousel from './LeadCarousel'
import OnboardingPromptBanner from './OnboardingPromptBanner'
import { LeadRelevance } from '@/lib/types/onboarding'

interface Lead {
  id: string
  business_name: string
  website_url: string
  city: string
  category: string
  score: number
  analysis: any
  created_at: string
}

interface LeadWithRelevance {
  lead: Lead
  relevance: LeadRelevance
}

interface ForYouSections {
  daily_top_5: LeadWithRelevance[]
  perfect_match: LeadWithRelevance[]
  high_budget: LeadWithRelevance[]
  near_you: LeadWithRelevance[]
  new_today: LeadWithRelevance[]
}

interface ForYouData {
  sections: ForYouSections
  profileComplete: boolean
  showOnboardingPrompt: boolean
  totalLeadsAnalyzed: number
  calculatedAt: string
}

interface ForYouSectionProps {
  onUnlockLead?: (leadId: string) => void
  onViewLead?: (leadId: string) => void
  unlockedLeads?: Set<string>
}

export default function ForYouSection({ onUnlockLead, onViewLead, unlockedLeads = new Set() }: ForYouSectionProps) {
  const { getAccessToken } = useAuth()
  const [data, setData] = useState<ForYouData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch data
  const fetchForYouData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      const token = getAccessToken()
      if (!token) {
        setError('Non autenticato')
        return
      }

      const response = await fetch('/api/leads/for-you', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Errore nel caricamento')
      }

      const result = await response.json()
      setData(result.data)
      setError(null)
    } catch (err) {
      console.error('Errore ForYouSection:', err)
      setError('Impossibile caricare i lead personalizzati')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchForYouData()
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-80 h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 flex items-center gap-4">
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-red-700 dark:text-red-400">{error}</p>
          <p className="text-sm text-red-600 dark:text-red-500">
            Riprova più tardi o contatta il supporto.
          </p>
        </div>
        <button
          onClick={() => fetchForYouData()}
          className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
        >
          Riprova
        </button>
      </div>
    )
  }

  // No data at all
  if (!data) return null

  const { sections, totalLeadsAnalyzed, calculatedAt } = data
  const hasAnyLeads = Object.values(sections).some((s) => s.length > 0)

  if (!hasAnyLeads) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-8 text-center">
        <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Nessun lead personalizzato
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Non ci sono ancora lead che corrispondono al tuo profilo.
          Nuovi lead vengono aggiunti ogni giorno!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Per Te
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Lead personalizzati in base al tuo profilo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {totalLeadsAnalyzed} lead analizzati
          </span>
          <button
            onClick={() => fetchForYouData(true)}
            disabled={isRefreshing}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            title="Aggiorna"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Daily Top 5 */}
      {sections.daily_top_5.length > 0 && (
        <section>
          <SectionHeader
            title="Top 5 di Oggi"
            description="I lead più rilevanti per te oggi"
            iconEmoji="🏆"
            count={sections.daily_top_5.length}
          />
          <LeadCarousel
            leads={sections.daily_top_5}
            onUnlock={onUnlockLead}
            onViewLead={onViewLead}
            unlockedLeads={unlockedLeads}
            showRelevance
          />
        </section>
      )}

      {/* Perfect Match */}
      {sections.perfect_match.length > 0 && (
        <section>
          <SectionHeader
            title="Perfect Match"
            description="Corrispondenza superiore al 90%"
            icon={Target}
            count={sections.perfect_match.length}
            viewAllHref="/dashboard?filter=perfect_match"
          />
          <LeadCarousel
            leads={sections.perfect_match}
            onUnlock={onUnlockLead}
            onViewLead={onViewLead}
            unlockedLeads={unlockedLeads}
            showRelevance
            cardSize="compact"
          />
        </section>
      )}

      {/* High Budget */}
      {sections.high_budget.length > 0 && (
        <section>
          <SectionHeader
            title="Budget Alto"
            description="Progetti sopra il tuo range abituale"
            icon={DollarSign}
            count={sections.high_budget.length}
            viewAllHref="/dashboard?filter=high_budget"
          />
          <LeadCarousel
            leads={sections.high_budget}
            onUnlock={onUnlockLead}
            onViewLead={onViewLead}
            unlockedLeads={unlockedLeads}
            showRelevance
            cardSize="compact"
          />
        </section>
      )}

      {/* Near You */}
      {sections.near_you.length > 0 && (
        <section>
          <SectionHeader
            title="Vicino a Te"
            description="Lead nella tua zona"
            icon={MapPin}
            count={sections.near_you.length}
            viewAllHref="/dashboard?filter=near_you"
          />
          <LeadCarousel
            leads={sections.near_you}
            onUnlock={onUnlockLead}
            onViewLead={onViewLead}
            unlockedLeads={unlockedLeads}
            showRelevance
            cardSize="compact"
          />
        </section>
      )}

      {/* New Today */}
      {sections.new_today.length > 0 && (
        <section>
          <SectionHeader
            title="Nuovi Oggi"
            description="Aggiunti nelle ultime 24 ore"
            icon={Clock}
            count={sections.new_today.length}
            viewAllHref="/dashboard?filter=new_today"
          />
          <LeadCarousel
            leads={sections.new_today}
            onUnlock={onUnlockLead}
            onViewLead={onViewLead}
            unlockedLeads={unlockedLeads}
            showRelevance={false}
            cardSize="compact"
          />
        </section>
      )}

      {/* Compact profile prompt if not fully completed */}
      {!data.profileComplete && (
        <OnboardingPromptBanner compact />
      )}
    </div>
  )
}
