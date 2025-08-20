/**
 * API Admin per gestione piani configurabili - TrovaMi.pro
 * CRUD completo per gestione piani dal pannello admin
 * Usato da: Admin dashboard per configurare pricing
 * Chiamato da: Pannello admin piani
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from '@/lib/auth-middleware'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface PlanData {
  name: string
  price_monthly: number
  original_price_monthly: number
  max_credits: number
  description: string
  stripe_price_id_monthly: string
  stripe_price_id_annual: string
  max_replacements_monthly: number
  features: string[]
  is_visible: boolean
  sort_order: number
  badge_text: string
  max_niches: number
  has_daily_alerts: boolean
  has_lead_history: boolean
  has_csv_export: boolean
  has_statistics: boolean
  is_annual: boolean
  visible_fields: string[]
}

// Verifica ruolo admin
async function verifyAdminAccess(userId: string) {
  const { data: userData, error } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || userData?.role !== 'admin') {
    return false
  }
  
  return true
}

export async function GET(request: NextRequest) {
  try {
    // Autenticazione unificata
    const { user, error: authError } = await authenticateUser(request)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || 'Non autenticato' },
        { status: 401 }
      )
    }

    // Verifica ruolo admin
    const isAdmin = await verifyAdminAccess(user.id)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Accesso negato' },
        { status: 403 }
      )
    }

    // Carica tutti i piani (inclusi nascosti per admin)
    const { data: plans, error: plansError } = await supabaseAdmin
      .from('plans')
      .select('*')
      .order('sort_order')

    if (plansError) {
      console.error('Errore caricamento piani:', plansError)
      return NextResponse.json(
        { error: 'Errore caricamento piani' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      plans: plans || []
    })

  } catch (error) {
    console.error('Errore GET admin plans:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Autenticazione unificata
    const { user, error: authError } = await authenticateUser(request)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || 'Non autenticato' },
        { status: 401 }
      )
    }

    // Verifica ruolo admin
    const isAdmin = await verifyAdminAccess(user.id)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Accesso negato' },
        { status: 403 }
      )
    }

    const planData: PlanData = await request.json()

    // Validazioni base
    if (!planData.name || !planData.name.trim()) {
      return NextResponse.json(
        { error: 'Nome piano obbligatorio' },
        { status: 400 }
      )
    }

    if (planData.max_credits < 0) {
      return NextResponse.json(
        { error: 'Crediti non possono essere negativi' },
        { status: 400 }
      )
    }

    // Verifica se il nome esiste già
    const { data: existingPlan } = await supabaseAdmin
      .from('plans')
      .select('name')
      .eq('name', planData.name.trim())
      .single()

    if (existingPlan) {
      return NextResponse.json(
        { error: 'Esiste già un piano con questo nome' },
        { status: 409 }
      )
    }

    // Crea nuovo piano
    const { data: newPlan, error: insertError } = await supabaseAdmin
      .from('plans')
      .insert({
        name: planData.name.trim(),
        price_monthly: planData.price_monthly || 0,
        original_price_monthly: planData.original_price_monthly || planData.price_monthly || 0,
        max_credits: planData.max_credits || 0,
        description: planData.description || '',
        stripe_price_id_monthly: planData.stripe_price_id_monthly || null,
        stripe_price_id_annual: planData.stripe_price_id_annual || null,
        max_replacements_monthly: planData.max_replacements_monthly || 0,
        features: planData.features || [],
        is_visible: planData.is_visible !== false,
        sort_order: planData.sort_order || 0,
        badge_text: planData.badge_text || null,
        max_niches: planData.max_niches || 1,
        has_daily_alerts: planData.has_daily_alerts || false,
        has_lead_history: planData.has_lead_history || false,
        has_csv_export: planData.has_csv_export || false,
        has_statistics: planData.has_statistics || false,
        is_annual: planData.is_annual || false,
        visible_fields: planData.visible_fields || ['business_name', 'website_url']
      })
      .select()
      .single()

    if (insertError) {
      console.error('Errore creazione piano:', insertError)
      return NextResponse.json(
        { error: 'Errore durante la creazione del piano' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Piano creato con successo',
      plan: newPlan
    })

  } catch (error) {
    console.error('Errore POST admin plans:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Autenticazione unificata
    const { user, error: authError } = await authenticateUser(request)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || 'Non autenticato' },
        { status: 401 }
      )
    }

    // Verifica ruolo admin
    const isAdmin = await verifyAdminAccess(user.id)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Accesso negato' },
        { status: 403 }
      )
    }

    const planData: PlanData = await request.json()

    // Validazioni base
    if (!planData.name || !planData.name.trim()) {
      return NextResponse.json(
        { error: 'Nome piano obbligatorio' },
        { status: 400 }
      )
    }

    if (planData.max_credits < 0) {
      return NextResponse.json(
        { error: 'Crediti non possono essere negativi' },
        { status: 400 }
      )
    }

    // Verifica che il piano esista
    const { data: existingPlan, error: checkError } = await supabaseAdmin
      .from('plans')
      .select('name')
      .eq('name', planData.name.trim())
      .single()

    if (checkError || !existingPlan) {
      return NextResponse.json(
        { error: 'Piano non trovato' },
        { status: 404 }
      )
    }

    // Aggiorna piano
    const { data: updatedPlan, error: updateError } = await supabaseAdmin
      .from('plans')
      .update({
        price_monthly: planData.price_monthly || 0,
        original_price_monthly: planData.original_price_monthly || planData.price_monthly || 0,
        max_credits: planData.max_credits || 0,
        description: planData.description || '',
        stripe_price_id_monthly: planData.stripe_price_id_monthly || null,
        stripe_price_id_annual: planData.stripe_price_id_annual || null,
        max_replacements_monthly: planData.max_replacements_monthly || 0,
        features: planData.features || [],
        is_visible: planData.is_visible !== false,
        sort_order: planData.sort_order || 0,
        badge_text: planData.badge_text || null,
        max_niches: planData.max_niches || 1,
        has_daily_alerts: planData.has_daily_alerts || false,
        has_lead_history: planData.has_lead_history || false,
        has_csv_export: planData.has_csv_export || false,
        has_statistics: planData.has_statistics || false,
        is_annual: planData.is_annual || false,
        visible_fields: planData.visible_fields || ['business_name', 'website_url'],
        updated_at: new Date().toISOString()
      })
      .eq('name', planData.name.trim())
      .select()
      .single()

    if (updateError) {
      console.error('Errore aggiornamento piano:', updateError)
      return NextResponse.json(
        { error: 'Errore durante l\'aggiornamento del piano' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Piano aggiornato con successo',
      plan: updatedPlan
    })

  } catch (error) {
    console.error('Errore PUT admin plans:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Autenticazione unificata
    const { user, error: authError } = await authenticateUser(request)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || 'Non autenticato' },
        { status: 401 }
      )
    }

    // Verifica ruolo admin
    const isAdmin = await verifyAdminAccess(user.id)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Accesso negato' },
        { status: 403 }
      )
    }

    const { name } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Nome piano obbligatorio' },
        { status: 400 }
      )
    }

    // Non permettere eliminazione piano free
    if (name === 'free') {
      return NextResponse.json(
        { error: 'Non puoi eliminare il piano gratuito' },
        { status: 403 }
      )
    }

    // Verifica se ci sono utenti che usano questo piano
    const { data: usersWithPlan, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('plan', name)
      .limit(1)

    if (usersError) {
      console.error('Errore verifica utenti:', usersError)
      return NextResponse.json(
        { error: 'Errore verifica utilizzo piano' },
        { status: 500 }
      )
    }

    if (usersWithPlan && usersWithPlan.length > 0) {
      return NextResponse.json(
        { error: 'Non puoi eliminare un piano in uso da alcuni utenti' },
        { status: 409 }
      )
    }

    // Elimina piano
    const { error: deleteError } = await supabaseAdmin
      .from('plans')
      .delete()
      .eq('name', name)

    if (deleteError) {
      console.error('Errore eliminazione piano:', deleteError)
      return NextResponse.json(
        { error: 'Errore durante l\'eliminazione del piano' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Piano eliminato con successo'
    })

  } catch (error) {
    console.error('Errore DELETE admin plans:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
