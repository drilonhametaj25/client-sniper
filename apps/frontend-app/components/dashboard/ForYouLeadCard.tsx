/**
 * ForYou Lead Card Component
 *
 * Card per lead nella sezione "Per Te" con badge relevance.
 * Design pulito con altezza fissa e layout consistente.
 *
 * @file apps/frontend-app/components/dashboard/ForYouLeadCard.tsx
 */

'use client'

import { useState } from 'react'
import { MapPin, Lock, ExternalLink, Star, TrendingUp, Eye, CheckCircle, Sparkles } from 'lucide-react'
import { LeadRelevance } from '@/lib/types/onboarding'
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking'

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

interface ForYouLeadCardProps {
  lead: Lead
  relevance?: LeadRelevance
  onUnlock?: (leadId: string) => void
  onViewLead?: (leadId: string) => void
  isUnlocked?: boolean
  rank?: number
  compact?: boolean
}

// Get color based on relevance score
function getRelevanceColor(score: number): string {
  if (score >= 90) return 'from-green-500 to-emerald-600'
  if (score >= 70) return 'from-blue-500 to-indigo-600'
  if (score >= 50) return 'from-amber-500 to-orange-600'
  return 'from-gray-500 to-gray-600'
}

function getRelevanceLabel(score: number): string {
  if (score >= 90) return 'Perfect'
  if (score >= 70) return 'Ottimo'
  if (score >= 50) return 'Buono'
  return 'Parziale'
}

// Get score color (lead quality score, lower = more opportunity)
function getScoreBadge(score: number): { bg: string; text: string; label: string } {
  if (score <= 30) return { bg: 'bg-red-500', text: 'text-white', label: 'Alta opportunità' }
  if (score <= 50) return { bg: 'bg-amber-500', text: 'text-white', label: 'Buona opportunità' }
  if (score <= 70) return { bg: 'bg-blue-500', text: 'text-white', label: 'Opportunità' }
  return { bg: 'bg-gray-400', text: 'text-white', label: 'Sito ok' }
}

export default function ForYouLeadCard({
  lead,
  relevance,
  onUnlock,
  onViewLead,
  isUnlocked = false,
  rank,
  compact = false
}: ForYouLeadCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const { trackViewed } = useBehaviorTracking()

  // Track view on hover
  const handleMouseEnter = () => {
    setIsHovered(true)
    trackViewed(lead.id, 'for_you')
  }

  // Extract domain from URL
  const getDomain = () => {
    try {
      if (!lead.website_url) return null
      const url = lead.website_url.startsWith('http') ? lead.website_url : `https://${lead.website_url}`
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return null
    }
  }
  const domain = getDomain()

  // Check if new (last 24h)
  const isNew = new Date(lead.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)

  const scoreBadge = getScoreBadge(lead.score)

  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 flex flex-col ${
        isHovered ? 'shadow-xl border-blue-300 dark:border-blue-600 -translate-y-1' : 'shadow-md'
      }`}
      style={{ height: '320px' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header con badges - altezza fissa */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 min-h-[52px]">
        {/* Left side: Rank o Unlocked badge */}
        <div className="flex items-center gap-2">
          {isUnlocked ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-full">
              <CheckCircle className="w-3.5 h-3.5" />
              Sbloccato
            </span>
          ) : rank && rank <= 5 ? (
            <span className="inline-flex items-center justify-center w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg text-white font-bold text-sm shadow-sm">
              #{rank}
            </span>
          ) : null}
        </div>

        {/* Right side: New badge */}
        <div className="flex items-center gap-2">
          {isNew && !isUnlocked && (
            <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-full">
              Nuovo
            </span>
          )}
        </div>
      </div>

      {/* Content area - flex grow per riempire spazio */}
      <div className="flex-1 px-4 pb-2 flex flex-col min-h-0">
        {/* Relevance Badge */}
        {relevance && (
          <div className="mb-3">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r ${getRelevanceColor(relevance.score)} text-white text-sm font-semibold shadow-sm`}>
              <Star className="w-4 h-4" />
              <span>{relevance.score}%</span>
              <span className="text-white/80 font-medium">· {getRelevanceLabel(relevance.score)}</span>
            </div>
          </div>
        )}

        {/* Business Name */}
        <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight mb-2 line-clamp-2">
          {lead.business_name}
        </h3>

        {/* Location & Category row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {lead.city && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate max-w-[100px]">{lead.city}</span>
            </span>
          )}
          {lead.city && lead.category && (
            <span className="text-gray-300 dark:text-gray-600">·</span>
          )}
          {lead.category && (
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
              {lead.category}
            </span>
          )}
        </div>

        {/* Score Badge */}
        <div className="mb-3">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ${scoreBadge.bg} ${scoreBadge.text} text-xs font-medium`}>
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Score {lead.score}</span>
            <span className="opacity-75">· {scoreBadge.label}</span>
          </div>
        </div>

        {/* Matched Services - solo se c'è spazio */}
        {relevance && relevance.matchedServices.length > 0 && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="flex flex-wrap gap-1">
              {relevance.matchedServices.slice(0, 2).map((service) => (
                <span
                  key={service}
                  className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs font-medium"
                >
                  {service}
                </span>
              ))}
              {relevance.matchedServices.length > 2 && (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded text-xs">
                  +{relevance.matchedServices.length - 2}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions - sempre in fondo */}
      <div className="px-4 pb-4 pt-2 mt-auto border-t border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center gap-2">
          {/* Unlock/View Button based on state */}
          {isUnlocked ? (
            <button
              onClick={() => onViewLead?.(lead.id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-sm"
            >
              <Eye className="w-4 h-4" />
              Vedi Analisi
            </button>
          ) : (
            <button
              onClick={async () => {
                if (isUnlocking) return
                setIsUnlocking(true)
                try {
                  await onUnlock?.(lead.id)
                } finally {
                  setIsUnlocking(false)
                }
              }}
              disabled={isUnlocking}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-sm ${isUnlocking ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isUnlocking ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sblocco...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Sblocca Lead
                </>
              )}
            </button>
          )}

          {/* Website Link (if domain available) */}
          {domain && (
            <a
              href={lead.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-11 h-11 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={`Visita ${domain}`}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
