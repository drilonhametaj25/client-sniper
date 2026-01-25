/**
 * Hook per tracking comportamento utente - TrovaMi
 *
 * Traccia le interazioni utente-lead per migliorare l'algoritmo di matching.
 * Azioni tracciabili: viewed, unlocked, contacted, converted, skipped, saved
 *
 * @file apps/frontend-app/hooks/useBehaviorTracking.ts
 */

import { useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  BehaviorAction,
  BehaviorMetadata,
  ViewedMetadata,
  ContactedMetadata,
  ConvertedMetadata,
  SkippedMetadata
} from '@/lib/types/onboarding'

interface TrackOptions {
  /** Se true, non blocca su errori (fire-and-forget) */
  silent?: boolean
  /** Snapshot del relevance score al momento dell'azione */
  relevanceScore?: number
}

interface UseBehaviorTrackingReturn {
  /** Traccia un'azione generica */
  trackAction: (
    leadId: string,
    action: BehaviorAction,
    metadata?: BehaviorMetadata,
    options?: TrackOptions
  ) => Promise<void>

  /** Traccia visualizzazione lead */
  trackViewed: (
    leadId: string,
    source: ViewedMetadata['source'],
    options?: TrackOptions
  ) => Promise<void>

  /** Traccia unlock lead */
  trackUnlocked: (
    leadId: string,
    options?: TrackOptions
  ) => Promise<void>

  /** Traccia contatto lead */
  trackContacted: (
    leadId: string,
    method: ContactedMetadata['method'],
    options?: TrackOptions
  ) => Promise<void>

  /** Traccia conversione lead */
  trackConverted: (
    leadId: string,
    dealValue: number,
    services: string[],
    notes?: string,
    options?: TrackOptions
  ) => Promise<void>

  /** Traccia skip lead */
  trackSkipped: (
    leadId: string,
    reason: SkippedMetadata['reason'],
    options?: TrackOptions
  ) => Promise<void>

  /** Traccia salvataggio lead */
  trackSaved: (
    leadId: string,
    options?: TrackOptions
  ) => Promise<void>
}

/**
 * Hook per tracciare il comportamento utente con i lead
 */
export function useBehaviorTracking(): UseBehaviorTrackingReturn {
  const { user, getAccessToken } = useAuth()

  // Debounce per evitare chiamate duplicate ravvicinate
  const recentTracked = useRef<Set<string>>(new Set())

  /**
   * Invia tracking al backend
   */
  const sendTrackingEvent = useCallback(async (
    leadId: string,
    action: BehaviorAction,
    metadata?: BehaviorMetadata,
    options?: TrackOptions
  ): Promise<void> => {
    // Skip se utente non autenticato
    if (!user?.id) {
      if (!options?.silent) {
        console.warn('[BehaviorTracking] User not authenticated, skipping track')
      }
      return
    }

    // Debounce: evita duplicate per stessa azione negli ultimi 2 secondi
    const trackKey = `${leadId}-${action}`
    if (recentTracked.current.has(trackKey)) {
      return
    }

    recentTracked.current.add(trackKey)
    setTimeout(() => {
      recentTracked.current.delete(trackKey)
    }, 2000)

    try {
      const token = getAccessToken()
      if (!token) {
        if (!options?.silent) {
          console.warn('[BehaviorTracking] No access token available, skipping track')
        }
        return
      }

      const response = await fetch('/api/behavior', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          leadId,
          action,
          metadata: metadata || {},
          relevanceScore: options?.relevanceScore
        })
      })

      if (!response.ok && !options?.silent) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[BehaviorTracking] Error:', errorData)
      }
    } catch (error) {
      if (!options?.silent) {
        console.error('[BehaviorTracking] Network error:', error)
      }
    }
  }, [user?.id, getAccessToken])

  /**
   * Traccia azione generica
   */
  const trackAction = useCallback(async (
    leadId: string,
    action: BehaviorAction,
    metadata?: BehaviorMetadata,
    options?: TrackOptions
  ) => {
    await sendTrackingEvent(leadId, action, metadata, options)
  }, [sendTrackingEvent])

  /**
   * Traccia visualizzazione lead
   */
  const trackViewed = useCallback(async (
    leadId: string,
    source: ViewedMetadata['source'],
    options?: TrackOptions
  ) => {
    await sendTrackingEvent(leadId, 'viewed', { source }, { ...options, silent: true })
  }, [sendTrackingEvent])

  /**
   * Traccia unlock lead
   */
  const trackUnlocked = useCallback(async (
    leadId: string,
    options?: TrackOptions
  ) => {
    await sendTrackingEvent(leadId, 'unlocked', {}, options)
  }, [sendTrackingEvent])

  /**
   * Traccia contatto lead
   */
  const trackContacted = useCallback(async (
    leadId: string,
    method: ContactedMetadata['method'],
    options?: TrackOptions
  ) => {
    await sendTrackingEvent(leadId, 'contacted', { method }, options)
  }, [sendTrackingEvent])

  /**
   * Traccia conversione lead
   */
  const trackConverted = useCallback(async (
    leadId: string,
    dealValue: number,
    services: string[],
    notes?: string,
    options?: TrackOptions
  ) => {
    const metadata: ConvertedMetadata = {
      dealValue,
      services: services as any,
      ...(notes && { notes })
    }
    await sendTrackingEvent(leadId, 'converted', metadata, options)
  }, [sendTrackingEvent])

  /**
   * Traccia skip lead
   */
  const trackSkipped = useCallback(async (
    leadId: string,
    reason: SkippedMetadata['reason'],
    options?: TrackOptions
  ) => {
    await sendTrackingEvent(leadId, 'skipped', { reason }, options)
  }, [sendTrackingEvent])

  /**
   * Traccia salvataggio lead
   */
  const trackSaved = useCallback(async (
    leadId: string,
    options?: TrackOptions
  ) => {
    await sendTrackingEvent(leadId, 'saved', {}, options)
  }, [sendTrackingEvent])

  return {
    trackAction,
    trackViewed,
    trackUnlocked,
    trackContacted,
    trackConverted,
    trackSkipped,
    trackSaved
  }
}

export default useBehaviorTracking
