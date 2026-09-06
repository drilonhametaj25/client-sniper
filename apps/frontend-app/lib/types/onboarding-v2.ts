/**
 * Tipi per l'onboarding a 3 step (~60 secondi)
 *
 * Step 1: Cosa vendi (services_offered — il campo che guida il matching!)
 * Step 2: Dove lavori (operating_city / tutta Italia)
 * Step 3: Riepilogo → dashboard con filtro pre-applicato
 */

import type { ServiceType } from './services'

// Specializzazioni disponibili
export type Specialization =
  | 'web_development'
  | 'seo'
  | 'marketing'
  | 'design'
  | 'social'
  | 'other'

// Configurazione specializzazioni per UI
export const SPECIALIZATION_CONFIG: Record<Specialization, {
  label: string
  icon: string
  description: string
}> = {
  web_development: {
    label: 'Web Development',
    icon: '💻',
    description: 'Siti web, web app, e-commerce'
  },
  seo: {
    label: 'SEO',
    icon: '🔍',
    description: 'Ottimizzazione motori di ricerca'
  },
  marketing: {
    label: 'Marketing',
    icon: '📈',
    description: 'Campagne, ads, email marketing'
  },
  design: {
    label: 'Design',
    icon: '🎨',
    description: 'UI/UX, grafica, branding'
  },
  social: {
    label: 'Social Media',
    icon: '📱',
    description: 'Gestione social, content'
  },
  other: {
    label: 'Altro',
    icon: '✨',
    description: 'Altri servizi digitali'
  }
}

// Dati raccolti durante l'onboarding
export interface OnboardingV2Data {
  // Step 1: Cosa vendi — scrive users.services_offered (guida il matching)
  services_offered: ServiceType[]

  // Legacy: derivato lato server da services_offered (non più chiesto all'utente)
  specialization: Specialization[]

  // Step 2: Zona
  operating_city: string
  is_remote_nationwide: boolean

  // Branding (non più nel wizard: si imposta da /settings)
  company_name?: string
  company_logo_url?: string
  company_phone?: string
  company_website?: string
}

// Stato iniziale
export const INITIAL_ONBOARDING_DATA: OnboardingV2Data = {
  services_offered: [],
  specialization: [],
  operating_city: '',
  is_remote_nationwide: false,
  company_name: '',
  company_logo_url: '',
  company_phone: '',
  company_website: ''
}

// Step configuration
export interface OnboardingStep {
  id: number
  title: string
  subtitle?: string
  isOptional: boolean
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: 'Cosa vendi',
    subtitle: 'Seleziona i servizi che offri',
    isOptional: false
  },
  {
    id: 2,
    title: 'Dove lavori',
    subtitle: 'La tua zona operativa',
    isOptional: false
  },
  {
    id: 3,
    title: 'Pronto',
    subtitle: 'I tuoi primi clienti ti aspettano',
    isOptional: false
  }
]

// Props comuni per i componenti step
export interface StepProps {
  data: OnboardingV2Data
  onUpdate: (updates: Partial<OnboardingV2Data>) => void
  onNext: () => void
  onBack?: () => void
  onSkip?: () => void
}

// Validazione step
export function validateStep1(data: OnboardingV2Data): boolean {
  return data.services_offered.length > 0
}

export function validateStep2(data: OnboardingV2Data): boolean {
  return data.operating_city.trim().length > 0 || data.is_remote_nationwide
}

// API request/response types
export interface SaveOnboardingRequest {
  services_offered: ServiceType[]
  operating_city: string
  is_remote_nationwide: boolean
  company_name?: string
  company_logo_url?: string
  company_phone?: string
  company_website?: string
}

export interface SaveOnboardingResponse {
  success: boolean
  message: string
  user?: {
    id: string
    email: string
    specialization: Specialization[]
    operating_city: string
    is_remote_nationwide: boolean
  }
}

export interface UploadLogoResponse {
  success: boolean
  url?: string
  error?: string
}
