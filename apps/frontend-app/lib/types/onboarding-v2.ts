/**
 * Tipi per il nuovo onboarding semplificato a 4 step
 *
 * Step 1: Benvenuto (nessun dato)
 * Step 2: Specializzazione
 * Step 3: Zona
 * Step 4: Branding (opzionale)
 */

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
  // Step 2: Specializzazione
  specialization: Specialization[]

  // Step 3: Zona
  operating_city: string
  is_remote_nationwide: boolean

  // Step 4: Branding (tutti opzionali)
  company_name?: string
  company_logo_url?: string
  company_phone?: string
  company_website?: string
}

// Stato iniziale
export const INITIAL_ONBOARDING_DATA: OnboardingV2Data = {
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
    title: 'Benvenuto',
    subtitle: 'Scopri come TrovaMi ti aiuta a trovare clienti',
    isOptional: false
  },
  {
    id: 2,
    title: 'Cosa offri',
    subtitle: 'Seleziona i tuoi servizi',
    isOptional: false
  },
  {
    id: 3,
    title: 'Dove lavori',
    subtitle: 'La tua zona operativa',
    isOptional: false
  },
  {
    id: 4,
    title: 'Il tuo brand',
    subtitle: 'Personalizza le proposte (opzionale)',
    isOptional: true
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
export function validateStep2(data: OnboardingV2Data): boolean {
  return data.specialization.length > 0
}

export function validateStep3(data: OnboardingV2Data): boolean {
  return data.operating_city.trim().length > 0 || data.is_remote_nationwide
}

export function validateStep4(_data: OnboardingV2Data): boolean {
  // Step 4 è sempre valido (tutto opzionale)
  return true
}

// API request/response types
export interface SaveOnboardingRequest {
  specialization: Specialization[]
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
