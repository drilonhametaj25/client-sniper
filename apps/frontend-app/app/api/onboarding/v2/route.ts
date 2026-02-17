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
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import type { SaveOnboardingRequest } from '@/lib/types/onboarding-v2'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione
    const cookieStore = await cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Non autenticato' },
        { status: 401 }
      )
    }

    // Ottieni dati dal body
    const body: SaveOnboardingRequest = await request.json()

    // Validazione base
    if (!body.specialization || body.specialization.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Seleziona almeno una specializzazione' },
        { status: 400 }
      )
    }

    if (!body.operating_city && !body.is_remote_nationwide) {
      return NextResponse.json(
        { success: false, message: 'Inserisci una città o seleziona "lavoro in remoto"' },
        { status: 400 }
      )
    }

    // Prepara dati per update
    const updateData: Record<string, any> = {
      specialization: body.specialization,
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
      .select('id, email, specialization, operating_city, is_remote_nationwide')
      .single()

    if (updateError) {
      console.error('Errore aggiornamento onboarding:', updateError)
      return NextResponse.json(
        { success: false, message: 'Errore durante il salvataggio' },
        { status: 500 }
      )
    }

    console.log(`[Onboarding V2] Completato per user ${user.id}:`, {
      specialization: body.specialization,
      city: body.operating_city || 'remote',
      hasLogo: !!body.company_logo_url
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
export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { completed: false, message: 'Non autenticato' },
        { status: 401 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('onboarding_completed_at, specialization, operating_city, is_remote_nationwide')
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
