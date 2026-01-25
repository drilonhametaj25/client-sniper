/**
 * ForYou Lead Card Component
 *
 * Card compatta per lead nella sezione "Per Te" con badge relevance.
 *
 * @file apps/frontend-app/components/dashboard/ForYouLeadCard.tsx
 */

'use client'

import { useState } from 'react'
import { MapPin, Globe, Zap, Lock, ExternalLink, Star, TrendingUp } from 'lucide-react'
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
  if (score >= 90) return 'Perfect Match'
  if (score >= 70) return 'Ottimo Match'
  if (score >= 50) return 'Buon Match'
  return 'Match Parziale'
}

// Get score color (lead quality score, lower = more opportunity)
function getScoreColor(score: number): string {
  if (score <= 30) return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
  if (score <= 50) return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30'
  if (score <= 70) return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30'
  return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
}

export default function ForYouLeadCard({
  lead,
  relevance,
  onUnlock,
  rank,
  compact = false
}: ForYouLeadCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { trackViewed } = useBehaviorTracking()

  // Track view on hover
  const handleMouseEnter = () => {
    setIsHovered(true)
    trackViewed(lead.id, { source: 'for_you_section' })
  }

  // Extract domain from URL
  const domain = lead.website_url
    ? new URL(lead.website_url.startsWith('http') ? lead.website_url : `https://${lead.website_url}`).hostname.replace('www.', '')
    : null

  // Check if new (last 24h)
  const isNew = new Date(lead.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)

  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 ${
        isHovered ? 'shadow-lg border-blue-300 dark:border-blue-600' : 'shadow-sm'
      } ${compact ? 'p-4' : 'p-5'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Rank Badge (if provided) */}
      {rank && rank <= 5 && (
        <div className="absolute -top-1 -left-1 w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-br-xl rounded-tl-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">#{rank}</span>
        </div>
      )}

      {/* New Badge */}
      {isNew && (
        <div className="absolute top-2 right-2">
          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
            Nuovo
          </span>
        </div>
      )}

      {/* Relevance Badge */}
      {relevance && (
        <div className={`mb-3 ${rank ? 'mt-4' : ''}`}>
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r ${getRelevanceColor(relevance.score)} text-white text-sm font-medium`}>
            <Star className="w-3.5 h-3.5" />
            <span>{relevance.score}%</span>
            <span className="text-white/80">- {getRelevanceLabel(relevance.score)}</span>
          </div>
        </div>
      )}

      {/* Business Name */}
      <h3 className={`font-semibold text-gray-900 dark:text-white truncate ${compact ? 'text-base mb-2' : 'text-lg mb-3'}`}>
        {lead.business_name}
      </h3>

      {/* Meta Info */}
      <div className={`flex flex-wrap gap-2 ${compact ? 'mb-3' : 'mb-4'}`}>
        {/* City */}
        {lead.city && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-xs text-gray-600 dark:text-gray-300">
            <MapPin className="w-3 h-3" />
            {lead.city}
          </span>
        )}

        {/* Category */}
        {lead.category && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-md text-xs text-purple-600 dark:text-purple-400">
            {lead.category}
          </span>
        )}

        {/* Lead Score (lower = more opportunity) */}
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${getScoreColor(lead.score)}`}>
          <TrendingUp className="w-3 h-3" />
          Score: {lead.score}
        </span>
      </div>

      {/* Matched Services (from relevance) */}
      {relevance && relevance.matchedServices.length > 0 && (
        <div className={compact ? 'mb-3' : 'mb-4'}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Servizi richiesti:</p>
          <div className="flex flex-wrap gap-1">
            {relevance.matchedServices.slice(0, 3).map((service) => (
              <span
                key={service}
                className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs"
              >
                {service}
              </span>
            ))}
            {relevance.matchedServices.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded text-xs">
                +{relevance.matchedServices.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Reason */}
      {relevance?.reason && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
          {relevance.reason}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Unlock Button */}
        <button
          onClick={() => onUnlock?.(lead.id)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-purple-700 transition-all"
        >
          <Lock className="w-4 h-4" />
          Sblocca
        </button>

        {/* Website Link (if domain available) */}
        {domain && (
          <a
            href={lead.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title={`Visita ${domain}`}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  )
}
