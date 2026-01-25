/**
 * Lead Carousel Component
 *
 * Carousel orizzontale scrollabile di lead card.
 *
 * @file apps/frontend-app/components/dashboard/LeadCarousel.tsx
 */

'use client'

import { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ForYouLeadCard from './ForYouLeadCard'
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

interface LeadCarouselProps {
  leads: LeadWithRelevance[]
  onUnlock?: (leadId: string) => void
  onViewLead?: (leadId: string) => void
  unlockedLeads?: Set<string>
  showRelevance?: boolean
  cardSize?: 'normal' | 'compact'
  emptyMessage?: string
}

export default function LeadCarousel({
  leads,
  onUnlock,
  onViewLead,
  unlockedLeads = new Set(),
  showRelevance = true,
  cardSize = 'normal',
  emptyMessage = 'Nessun lead disponibile'
}: LeadCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Check scroll position
  const checkScroll = () => {
    const container = scrollContainerRef.current
    if (!container) return

    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    )
  }

  useEffect(() => {
    checkScroll()
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', checkScroll)
      window.addEventListener('resize', checkScroll)
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkScroll)
      }
      window.removeEventListener('resize', checkScroll)
    }
  }, [leads])

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current
    if (!container) return

    // Tutte le card hanno la stessa larghezza ora
    const cardWidth = 300
    const scrollAmount = cardWidth * 2

    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
  }

  if (leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="relative group">
      {/* Scroll Left Button */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Scroll Right Button */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Cards Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {leads.map((item, index) => (
          <div
            key={item.lead.id}
            className="flex-shrink-0"
            style={{
              width: '300px',
              scrollSnapAlign: 'start'
            }}
          >
            <ForYouLeadCard
              lead={item.lead}
              relevance={showRelevance ? item.relevance : undefined}
              onUnlock={onUnlock}
              onViewLead={onViewLead}
              isUnlocked={unlockedLeads.has(item.lead.id)}
              rank={index + 1}
            />
          </div>
        ))}
      </div>

      {/* Scroll Indicator */}
      {leads.length > 3 && (
        <div className="flex justify-center gap-1 mt-3">
          {Array.from({ length: Math.ceil(leads.length / 3) }).map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"
            />
          ))}
        </div>
      )}
    </div>
  )
}
