/**
 * Tipi TypeScript per il sistema di User Onboarding Tour
 * Definisce le interfacce per gestire tour guidati nell'app
 * Utilizzato da: OnboardingTour, tour hooks e database
 */

import { Step } from 'react-joyride'

export interface TourStep extends Step {
  id: string
  section: TourSection
  order: number
  // Override del contenuto per supportare React elements
  content: React.ReactNode
  // Posizione preferita del tooltip
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  // Se true, lo step può essere saltato individualmente
  skippable?: boolean
}

export type TourSection = 
  | 'dashboard'      // Tour della dashboard principale
  | 'filters'        // Tour dei filtri di ricerca
  | 'lead-card'      // Tour delle card dei lead
  | 'lead-detail'    // Tour della pagina dettaglio lead
  | 'crm'           // Tour del sistema CRM
  | 'manual-scan'   // Tour dell'analisi manuale
  | 'admin'         // Tour pannello admin

export interface TourProgress {
  userId: string
  section: TourSection
  completed: boolean
  lastStepIndex: number
  completedAt?: Date
  skippedAt?: Date
  version: string // Per gestire aggiornamenti tour
}

export interface TourConfiguration {
  id: string
  section: TourSection
  title: string
  description: string
  steps: TourStep[]
  enabled: boolean
  version: string
  // Trigger automatico al primo accesso alla sezione
  autoTrigger: boolean
  // Prerequisiti per mostrare il tour
  prerequisites?: {
    minPlan?: 'free' | 'starter' | 'pro'
    requiresAuth: boolean
    customCondition?: () => boolean
  }
}

export interface OnboardingContextType {
  // Stato corrente del tour
  isRunning: boolean
  currentTour: TourSection | null
  currentStepIndex: number
  
  // Funzioni di controllo
  startTour: (section: TourSection, forceStart?: boolean) => void
  stopTour: () => void
  resetTour: (section: TourSection) => void
  skipTour: () => void
  nextStep: () => void
  previousStep: () => void
  
  // Stato progresso
  getTourProgress: (section: TourSection) => TourProgress | null
  isTourCompleted: (section: TourSection) => boolean
  getTourConfiguration: (section: TourSection) => TourConfiguration | null
  
  // Reset e controllo
  resetAllTours: () => void
  enableAutoTours: (enabled: boolean) => void
}

export interface TourStepContent {
  title: string
  description: string
  tips?: string[]
  actionButton?: {
    text: string
    action: () => void
  }
}

// Per database Supabase
export interface TourProgressDB {
  id: string
  user_id: string
  section: TourSection
  completed: boolean
  last_step_index: number
  completed_at?: string
  skipped_at?: string
  version: string
  created_at: string
  updated_at: string
}
