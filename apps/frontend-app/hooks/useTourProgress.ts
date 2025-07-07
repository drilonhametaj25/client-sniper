/**
 * Hook per gestire il progresso e lo stato dei tour di onboarding
 * Salva il progresso in localStorage con fallback a Supabase per analisi
 * Utilizzato da: OnboardingProvider, componenti tour
 */

import { useCallback, useEffect, useState } from 'react'
import { TourSection, TourProgress } from '@/../../libs/types/onboarding'
import { useAuth } from '@/contexts/AuthContext'

interface UseTourProgressReturn {
  // Stato progresso
  getTourProgress: (section: TourSection) => TourProgress | null
  isTourCompleted: (section: TourSection) => boolean
  isTourSkipped: (section: TourSection) => boolean
  
  // Gestione progresso
  markTourCompleted: (section: TourSection, stepIndex?: number) => Promise<void>
  markTourSkipped: (section: TourSection) => Promise<void>
  updateTourProgress: (section: TourSection, stepIndex: number) => Promise<void>
  resetTourProgress: (section: TourSection) => Promise<void>
  resetAllTours: () => Promise<void>
  
  // Stato loading
  isLoading: boolean
}

export const useTourProgress = (): UseTourProgressReturn => {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [progressCache, setProgressCache] = useState<Record<TourSection, TourProgress>>({} as Record<TourSection, TourProgress>)

  // Chiave per localStorage
  const getStorageKey = useCallback((section: TourSection) => {
    return `tour_progress_${user?.id || 'anonymous'}_${section}`
  }, [user?.id])

  // Carica progresso da localStorage
  const loadProgressFromStorage = useCallback((section: TourSection): TourProgress | null => {
    try {
      const stored = localStorage.getItem(getStorageKey(section))
      if (stored) {
        const progress = JSON.parse(stored) as TourProgress
        // Verifica che la versione sia compatibile
        if (progress.version && progress.userId === (user?.id || 'anonymous')) {
          return progress
        }
      }
    } catch (error) {
      console.warn('Errore caricamento progresso tour da localStorage:', error)
    }
    return null
  }, [getStorageKey, user?.id])

  // Salva progresso in localStorage
  const saveProgressToStorage = useCallback((section: TourSection, progress: TourProgress) => {
    try {
      localStorage.setItem(getStorageKey(section), JSON.stringify(progress))
      // Aggiorna cache locale
      setProgressCache(prev => ({ ...prev, [section]: progress }))
    } catch (error) {
      console.warn('Errore salvataggio progresso tour in localStorage:', error)
    }
  }, [getStorageKey])

  // Salva progresso nel database per analisi (opzionale, non bloccante)
  const saveProgressToDatabase = useCallback(async (progress: TourProgress) => {
    if (!user?.id) return

    try {
      // Import dinamico per evitare errori se Supabase non è disponibile
      const { supabase } = await import('@/lib/supabase')
      
      await supabase
        .from('tour_progress')
        .upsert({
          user_id: user.id,
          section: progress.section,
          completed: progress.completed,
          last_step_index: progress.lastStepIndex,
          completed_at: progress.completedAt?.toISOString(),
          skipped_at: progress.skippedAt?.toISOString(),
          version: progress.version,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,section'
        })
    } catch (error) {
      // Non bloccante - il progresso è già salvato in localStorage
      console.warn('Errore salvataggio progresso tour nel database:', error)
    }
  }, [user?.id])

  // Ottieni progresso per una sezione
  const getTourProgress = useCallback((section: TourSection): TourProgress | null => {
    // Prima controlla cache
    if (progressCache[section]) {
      return progressCache[section]
    }

    // Poi localStorage
    const stored = loadProgressFromStorage(section)
    if (stored) {
      setProgressCache(prev => ({ ...prev, [section]: stored }))
      return stored
    }

    return null
  }, [progressCache, loadProgressFromStorage])

  // Verifica se tour è completato
  const isTourCompleted = useCallback((section: TourSection): boolean => {
    const progress = getTourProgress(section)
    return progress?.completed === true
  }, [getTourProgress])

  // Verifica se tour è stato saltato
  const isTourSkipped = useCallback((section: TourSection): boolean => {
    const progress = getTourProgress(section)
    return progress?.skippedAt !== undefined
  }, [getTourProgress])

  // Marca tour come completato
  const markTourCompleted = useCallback(async (section: TourSection, stepIndex: number = -1) => {
    if (!user?.id) return

    const progress: TourProgress = {
      userId: user.id,
      section,
      completed: true,
      lastStepIndex: stepIndex,
      completedAt: new Date(),
      version: '1.0'
    }

    saveProgressToStorage(section, progress)
    
    // Salva nel database in background
    saveProgressToDatabase(progress).catch(() => {})
  }, [user?.id, saveProgressToStorage, saveProgressToDatabase])

  // Marca tour come saltato
  const markTourSkipped = useCallback(async (section: TourSection) => {
    if (!user?.id) return

    const progress: TourProgress = {
      userId: user.id,
      section,
      completed: false,
      lastStepIndex: 0,
      skippedAt: new Date(),
      version: '1.0'
    }

    saveProgressToStorage(section, progress)
    
    // Salva nel database in background
    saveProgressToDatabase(progress).catch(() => {})
  }, [user?.id, saveProgressToStorage, saveProgressToDatabase])

  // Aggiorna progresso step
  const updateTourProgress = useCallback(async (section: TourSection, stepIndex: number) => {
    if (!user?.id) return

    const existing = getTourProgress(section)
    const progress: TourProgress = {
      userId: user.id,
      section,
      completed: false,
      lastStepIndex: stepIndex,
      version: '1.0',
      ...(existing && {
        completedAt: existing.completedAt,
        skippedAt: existing.skippedAt
      })
    }

    saveProgressToStorage(section, progress)
  }, [user?.id, getTourProgress, saveProgressToStorage])

  // Reset progresso tour
  const resetTourProgress = useCallback(async (section: TourSection) => {
    try {
      localStorage.removeItem(getStorageKey(section))
      setProgressCache(prev => {
        const updated = { ...prev }
        delete updated[section]
        return updated
      })
    } catch (error) {
      console.warn('Errore reset progresso tour:', error)
    }
  }, [getStorageKey])

  // Reset tutti i tour
  const resetAllTours = useCallback(async () => {
    try {
      const allSections: TourSection[] = ['dashboard', 'filters', 'lead-card', 'lead-detail', 'crm', 'manual-scan', 'admin']
      
      allSections.forEach(section => {
        localStorage.removeItem(getStorageKey(section))
      })
      
      setProgressCache({} as Record<TourSection, TourProgress>)
    } catch (error) {
      console.warn('Errore reset tutti i tour:', error)
    }
  }, [getStorageKey])

  // Precarica progresso tour al mount
  useEffect(() => {
    if (user?.id) {
      setIsLoading(true)
      
      const allSections: TourSection[] = ['dashboard', 'filters', 'lead-card', 'lead-detail', 'crm', 'manual-scan', 'admin']
      const cache: Record<TourSection, TourProgress> = {} as Record<TourSection, TourProgress>
      
      allSections.forEach(section => {
        const progress = loadProgressFromStorage(section)
        if (progress) {
          cache[section] = progress
        }
      })
      
      setProgressCache(cache)
      setIsLoading(false)
    }
  }, [user?.id, loadProgressFromStorage])

  return {
    getTourProgress,
    isTourCompleted,
    isTourSkipped,
    markTourCompleted,
    markTourSkipped,
    updateTourProgress,
    resetTourProgress,
    resetAllTours,
    isLoading
  }
}
