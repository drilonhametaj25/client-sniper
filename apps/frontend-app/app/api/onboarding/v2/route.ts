/**
 * API Route - Onboarding V2
 *
 * POST: Salva i dati del nuovo onboarding semplificato a 4 step
 *
 * Campi salvati:
 * - specialization[]
 * - operating_city
 * - is_remote_nationwide
 * - company_name (opzionale)
 * - company_logo_url (opzionale)
 * - company_phone (opzionale)
 * - company_website (opzionale)
 * - onboarding_completed_at
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireUser, getSupabaseAdmin } from '@/lib/api/auth'
import type { SaveOnboardingRequest, Specialization } from '@/lib/types/onboarding-v2'
import type { ServiceType } from '@/lib/types/services'

const VALID_SERVICES: ServiceType[] = [
  'seo', 'gdpr', 'analytics', 'mobile', 'performance', 'development', 'design', 'social'
]

// Deriva il campo legacy specialization dai servizi (non più chiesto all'utente)
const SERVICE_TO_SPECIALIZATION: Record<ServiceType, Specialization> = {
  development: 'web_development',
  mobile: 'web_development',
  performance: 'web_development',
  seo: 'seo',
  design: 'design',
  social: 'social',
  analytics: 'marketing',
  gdpr: 'other'
}

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione
    // Auth unificata: accetta sia Bearer token che sessione cookie
    const auth = await requireUser(request)
    if (auth.errorResponse) {
      return NextResponse.json(
        { success: false, message: 'Non autenticato' },
        { status: 401 }
      )
    }
    const { user } = auth

    // Ottieni dati dal body
    const body: SaveOnboardingRequest = await request.json()

    // Validazione: services_offered è il campo che guida il matching
    const services = (body.services_offered || []).filter(
      (s): s is ServiceType => VALID_SERVICES.includes(s as ServiceType)
    )
    if (services.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Seleziona almeno un servizio' },
        { status: 400 }
      )
    }

    if (!body.operating_city && !body.is_remote_nationwide) {
      return NextResponse.json(
        { success: false, message: 'Inserisci una città o seleziona "lavoro in remoto"' },
        { status: 400 }
      )
    }

    // Prepara dati per update.
    // ⚠️ services_offered è ciò che il matching legge davvero (filtro "Solo per
    // i miei servizi", % match, sezione Per Te). Prima il wizard scriveva solo
    // specialization, che nessun matching leggeva: onboarding inutile.
    const updateData: Record<string, any> = {
      services_offered: services,
      specialization: [...new Set(services.map(s => SERVICE_TO_SPECIALIZATION[s]))],
      operating_city: body.operating_city?.trim() || null,
      is_remote_nationwide: body.is_remote_nationwide || false,
      onboarding_completed_at: new Date().toISOString()
    }

    // Aggiungi campi opzionali se presenti
    if (body.company_name?.trim()) {
      updateData.company_name = body.company_name.trim()
    }
    if (body.company_logo_url?.trim()) {
      updateData.company_logo_url = body.company_logo_url.trim()
    }
    if (body.company_phone?.trim()) {
      updateData.company_phone = body.company_phone.trim()
    }
    if (body.company_website?.trim()) {
      updateData.company_website = body.company_website.trim()
    }

    // Salva nel database
    const supabaseAdmin = getSupabaseAdmin()
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select('id, email, services_offered, specialization, operating_city, is_remote_nationwide')
      .single()

    if (updateError) {
      console.error('Errore aggiornamento onboarding:', updateError)
      return NextResponse.json(
        { success: false, message: 'Errore durante il salvataggio' },
        { status: 500 }
      )
    }

    console.log(`[Onboarding V2] Completato per user ${user.id}:`, {
      services: services,
      city: body.operating_city || 'remote'
    })

    return NextResponse.json({
      success: true,
      message: 'Onboarding completato!',
      user: updatedUser
    })

  } catch (error) {
    console.error('Errore API onboarding/v2:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Errore interno del server'
      },
      { status: 500 }
    )
  }
}

// GET: Controlla stato onboarding
export async function GET(request: NextRequest) {
  try {
    // Auth unificata: accetta sia Bearer token che sessione cookie
    const auth = await requireUser(request)
    if (auth.errorResponse) {
      return NextResponse.json(
        { completed: false, message: 'Non autenticato' },
        { status: 401 }
      )
    }
    const { user } = auth

    const supabaseAdmin = getSupabaseAdmin()
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('onboarding_completed_at, services_offered, specialization, operating_city, is_remote_nationwide')
      .eq('id', user.id)
      .single()

    if (userError) {
      return NextResponse.json(
        { completed: false, message: 'Errore recupero dati' },
        { status: 500 }
      )
    }

    const isCompleted = !!userData?.onboarding_completed_at

    return NextResponse.json({
      completed: isCompleted,
      data: isCompleted ? {
        services_offered: userData.services_offered || [],
        specialization: userData.specialization,
        operating_city: userData.operating_city,
        is_remote_nationwide: userData.is_remote_nationwide
      } : null
    })

  } catch (error) {
    console.error('Errore GET onboarding/v2:', error)
    return NextResponse.json(
      { completed: false, message: 'Errore interno' },
      { status: 500 }
    )
  }
}
