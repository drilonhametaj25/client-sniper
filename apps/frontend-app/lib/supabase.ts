// Questo file configura la connessione a Supabase
// È parte del modulo apps/frontend-app
// Viene utilizzato da tutto il frontend per database e auth
// ⚠️ Aggiornare le variabili d'ambiente in .env.local

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variabili d\'ambiente Supabase mancanti')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Tipi per il database
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          plan: string // Ora supporta tutti i nuovi nomi dei piani
          credits_remaining: number
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          plan?: string
          credits_remaining?: number
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          plan?: string
          credits_remaining?: number
          created_at?: string
        }
      }
      plans: {
        Row: {
          id: number
          name: 'free' | 'starter' | 'pro'
          price_monthly: number
          max_credits: number
          visible_fields: string[]
        }
        Insert: {
          id?: number
          name: 'free' | 'starter' | 'pro'
          price_monthly: number
          max_credits: number
          visible_fields: string[]
        }
        Update: {
          id?: number
          name?: 'free' | 'starter' | 'pro'
          price_monthly?: number
          max_credits?: number
          visible_fields?: string[]
        }
      }
      leads: {
        Row: {
          id: string
          assigned_to: string
          business_name: string
          website_url: string
          city: string
          category: string
          score: number
          analysis: any // JSONB
          created_at: string
        }
        Insert: {
          id?: string
          assigned_to: string
          business_name: string
          website_url: string
          city: string
          category: string
          score: number
          analysis: any
          created_at?: string
        }
        Update: {
          id?: string
          assigned_to?: string
          business_name?: string
          website_url?: string
          city?: string
          category?: string
          score?: number
          analysis?: any
          created_at?: string
        }
      }
      lead_analysis: {
        Row: {
          id: string
          has_website: boolean
          website_load_time: number
          missing_meta_tags: string[]
          has_tracking_pixel: boolean
          broken_images: boolean
          gtm_installed: boolean
          overall_score: number
        }
        Insert: {
          id: string
          has_website: boolean
          website_load_time: number
          missing_meta_tags: string[]
          has_tracking_pixel: boolean
          broken_images: boolean
          gtm_installed: boolean
          overall_score: number
        }
        Update: {
          id?: string
          has_website?: boolean
          website_load_time?: number
          missing_meta_tags?: string[]
          has_tracking_pixel?: boolean
          broken_images?: boolean
          gtm_installed?: boolean
          overall_score?: number
        }
      }
      settings: {
        Row: {
          id: number
          key: string
          value: string
        }
        Insert: {
          id?: number
          key: string
          value: string
        }
        Update: {
          id?: number
          key?: string
          value?: string
        }
      }
    }
  }
}
