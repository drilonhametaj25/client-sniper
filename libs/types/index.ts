// Questo file definisce i tipi TypeScript condivisi tra tutti i moduli
// È parte del modulo libs/types
// Viene importato da frontend-app e scraping-engine
// ⚠️ Aggiornare se si modifica la struttura del database

// Export onboarding tour types
export * from './onboarding'

export interface User {
  id: string;
  email: string;
  plan: 'free' | 'starter' | 'pro';
  credits_remaining: number;
  billing_cycle_start?: string;
  credits_reset_date?: string;
  total_credits_used_this_cycle?: number;
  stripe_subscription_id?: string;
  stripe_current_period_end?: string;
  created_at: string;
}

export interface Plan {
  id: number;
  name: 'free' | 'starter' | 'pro';
  price_monthly: number;
  max_credits: number;
  visible_fields: string[];
}

export interface Lead {
  id: string;
  assigned_to: string;
  business_name: string;
  website_url: string;
  city: string;
  category: string;
  score: number; // 0-100
  analysis: LeadAnalysis;
  created_at: string;
}

export interface LeadAnalysis {
  has_website: boolean;
  website_load_time: number;
  missing_meta_tags: string[];
  has_tracking_pixel: boolean;
  broken_images: boolean;
  gtm_installed: boolean;
  overall_score: number;
  // Dettagli aggiuntivi dell'analisi
  meta_title_missing?: boolean;
  meta_description_missing?: boolean;
  h1_missing?: boolean;
  alt_tags_missing?: boolean;
  mobile_friendly?: boolean;
  ssl_certificate?: boolean;
  page_speed_score?: number;
  facebook_pixel?: boolean;
  google_analytics?: boolean;
  google_tag_manager?: boolean;
}

export interface Settings {
  id: number;
  key: string;
  value: string;
}

// Tipi per il scraping engine
export interface ScrapingTarget {
  source: 'google_maps' | 'yelp' | 'directory';
  query: string;
  location: string;
  category: string;
}

export interface BusinessData {
  name: string;
  website?: string;
  phone?: string;
  address?: string;
  city: string;
  category: string;
  rating?: number;
  reviews_count?: number;
}

export interface TechnicalAnalysis {
  url: string;
  load_time: number;
  status_code: number;
  has_ssl: boolean;
  meta_tags: {
    title?: string;
    description?: string;
    keywords?: string;
  };
  h_tags: {
    h1: string[];
    h2: string[];
  };
  images: {
    total: number;
    without_alt: number;
    broken: number;
  };
  tracking: {
    google_analytics: boolean;
    google_tag_manager: boolean;
    facebook_pixel: boolean;
  };
  performance: {
    page_size: number;
    requests_count: number;
    speed_score: number;
  };
  mobile_friendly: boolean;
}

// Tipi per le API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LeadsApiParams {
  page?: number;
  limit?: number;
  category?: string;
  min_score?: number;
  max_score?: number;
  city?: string;
}

export interface StripeCheckoutData {
  plan: 'starter' | 'pro';
  user_id: string;
  success_url: string;
  cancel_url: string;
}

// Costanti
export const PLANS_CONFIG = {
  free: {
    name: 'Free',
    max_credits: 5,
    price_monthly: 0,
    visible_fields: ['business_name', 'website_url', 'score']
  },
  starter: {
    name: 'Starter',
    max_credits: 50,
    price_monthly: 29,
    visible_fields: ['business_name', 'website_url', 'city', 'category', 'score']
  },
  pro: {
    name: 'Pro',
    max_credits: 200,
    price_monthly: 79,
    visible_fields: ['business_name', 'website_url', 'city', 'category', 'phone', 'email', 'score', 'analysis']
  }
} as const;

export const SCORE_RANGES = {
  CRITICAL: { min: 0, max: 20, label: 'Critico', color: '#dc2626' },
  POOR: { min: 21, max: 40, label: 'Scarso', color: '#ea580c' },
  AVERAGE: { min: 41, max: 60, label: 'Medio', color: '#ca8a04' },
  GOOD: { min: 61, max: 80, label: 'Buono', color: '#16a34a' },
  EXCELLENT: { min: 81, max: 100, label: 'Eccellente', color: '#059669' }
} as const;

// Feedback System Types
export interface FeedbackReport {
  id: string;
  user_id?: string;
  email?: string;
  type: 'bug' | 'suggestion' | 'contact' | 'other';
  message: string;
  title?: string;
  is_public?: boolean;
  upvotes?: number;
  downvotes?: number;
  created_at: string;
  status: 'open' | 'in_review' | 'closed';
  response?: string;
  admin_note?: string;
  user_agent?: string;
  ip_address?: string;
  page_url?: string;
}

export interface FeedbackSubmissionData {
  type: 'bug' | 'suggestion' | 'contact' | 'other';
  message: string;
  email?: string;
  pageUrl?: string;
  userAgent?: string;
}

export interface FeedbackStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  lastWeek: number;
}

// Tipi per il sistema di feedback pubblico esteso
export interface PublicFeedback {
  id: string;
  title: string;
  type: 'bug' | 'suggestion' | 'contact' | 'other';
  message: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  has_admin_response: boolean;
  user_vote?: 'up' | 'down' | null;
}

export interface FeedbackDetails extends PublicFeedback {
  admin_response?: string;
}

export interface FeedbackVote {
  id: string;
  feedback_id: string;
  user_id: string;
  vote_type: 'up' | 'down';
  created_at: string;
}

export interface FeedbackAbuseReport {
  id: string;
  feedback_id: string;
  reporter_user_id: string;
  reason: string;
  created_at: string;
}

// Tipo per i feedback dell'utente nella dashboard personale
export interface UserFeedback {
  id: string;
  title: string | null;
  type: 'bug' | 'suggestion' | 'contact' | 'other';
  message: string;
  is_public: boolean;
  status: 'open' | 'in_review' | 'closed';
  response: string | null;
  created_at: string;
  upvotes: number;
  downvotes: number;
}

// Estensione del tipo FeedbackSubmissionData esistente
export interface FeedbackSubmissionDataExtended extends FeedbackSubmissionData {
  title?: string;
  isPublic?: boolean;
}
