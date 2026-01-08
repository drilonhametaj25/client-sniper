/**
 * API per il sistema di Onboarding Progressivo
 * GET: Recupera stato onboarding utente
 * PUT: Aggiorna step onboarding
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TOTAL_STEPS = 6

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    // Recupera o crea onboarding
    let { data: onboarding, error } = await supabaseAdmin
      .from('user_onboarding')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code === 'PGRST116') {
      // Non esiste, crea
      const { data: newData, error: insertError } = await supabaseAdmin
        .from('user_onboarding')
        .insert({ user_id: user.id })
        .select()
        .single()

      if (insertError) {
        console.error('Errore creazione onboarding:', insertError)
        return NextResponse.json({ error: 'Errore inizializzazione onboarding' }, { status: 500 })
      }
      onboarding = newData
    } else if (error) {
      console.error('Errore recupero onboarding:', error)
      return NextResponse.json({ error: 'Errore recupero dati' }, { status: 500 })
    }

    // Calcola progress
    const completedSteps = [
      onboarding.completed_profile,
      onboarding.completed_first_unlock,
      onboarding.completed_first_contact,
      onboarding.completed_crm_setup,
      onboarding.completed_saved_search,
      onboarding.completed_first_deal
    ].filter(Boolean).length

    const progressPercentage = Math.round((completedSteps / TOTAL_STEPS) * 100)

    // Trova prossimo step
    const steps = [
      { key: 'completedProfile', dbKey: 'completed_profile', completed: onboarding.completed_profile },
      { key: 'completedFirstUnlock', dbKey: 'completed_first_unlock', completed: onboarding.completed_first_unlock },
      { key: 'completedFirstContact', dbKey: 'completed_first_contact', completed: onboarding.completed_first_contact },
      { key: 'completedCrmSetup', dbKey: 'completed_crm_setup', completed: onboarding.completed_crm_setup },
      { key: 'completedSavedSearch', dbKey: 'completed_saved_search', completed: onboarding.completed_saved_search },
      { key: 'completedFirstDeal', dbKey: 'completed_first_deal', completed: onboarding.completed_first_deal }
    ]

    const nextStep = steps.find(s => !s.completed)

    const response = {
      id: onboarding.id,
      userId: onboarding.user_id,
      steps: {
        completedProfile: onboarding.completed_profile,
        completedFirstUnlock: onboarding.completed_first_unlock,
        completedFirstContact: onboarding.completed_first_contact,
        completedCrmSetup: onboarding.completed_crm_setup,
        completedSavedSearch: onboarding.completed_saved_search,
        completedFirstDeal: onboarding.completed_first_deal
      },
      timestamps: {
        profileCompletedAt: onboarding.profile_completed_at,
        firstUnlockAt: onboarding.first_unlock_at,
        firstContactAt: onboarding.first_contact_at,
        crmSetupAt: onboarding.crm_setup_at,
        savedSearchAt: onboarding.saved_search_at,
        firstDealAt: onboarding.first_deal_at
      },
      progress: {
        completedSteps,
        totalSteps: TOTAL_STEPS,
        percentage: progressPercentage,
        nextStep: nextStep?.key || null
      },
      status: {
        isCompleted: onboarding.onboarding_completed,
        completedAt: onboarding.onboarding_completed_at,
        isSkipped: onboarding.onboarding_skipped
      },
      createdAt: onboarding.created_at,
      updatedAt: onboarding.updated_at
    }

    return NextResponse.json({ success: true, data: response })

  } catch (error) {
    console.error('Errore API onboarding GET:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    const body = await request.json()
    const { step, skip } = body

    const now = new Date().toISOString()
    const updateData: Record<string, any> = { updated_at: now }

    if (skip) {
      updateData.onboarding_skipped = true
      updateData.onboarding_completed = true
      updateData.onboarding_completed_at = now
    } else if (step) {
      // Mappa step a colonne DB
      const stepMappings: Record<string, { completed: string; timestamp: string }> = {
        profile: { completed: 'completed_profile', timestamp: 'profile_completed_at' },
        first_unlock: { completed: 'completed_first_unlock', timestamp: 'first_unlock_at' },
        first_contact: { completed: 'completed_first_contact', timestamp: 'first_contact_at' },
        crm_setup: { completed: 'completed_crm_setup', timestamp: 'crm_setup_at' },
        saved_search: { completed: 'completed_saved_search', timestamp: 'saved_search_at' },
        first_deal: { completed: 'completed_first_deal', timestamp: 'first_deal_at' }
      }

      const mapping = stepMappings[step]
      if (!mapping) {
        return NextResponse.json({ error: 'Step non valido' }, { status: 400 })
      }

      updateData[mapping.completed] = true
      updateData[mapping.timestamp] = now

      // Verifica se onboarding completato
      const { data: current } = await supabaseAdmin
        .from('user_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (current) {
        const allSteps = [
          step === 'profile' || current.completed_profile,
          step === 'first_unlock' || current.completed_first_unlock,
          step === 'first_contact' || current.completed_first_contact,
          step === 'crm_setup' || current.completed_crm_setup,
          step === 'saved_search' || current.completed_saved_search,
          step === 'first_deal' || current.completed_first_deal
        ]

        if (allSteps.every(Boolean)) {
          updateData.onboarding_completed = true
          updateData.onboarding_completed_at = now
        }

        // Calcola progress
        const completedCount = allSteps.filter(Boolean).length
        updateData.progress_percentage = Math.round((completedCount / TOTAL_STEPS) * 100)
      }
    }

    const { data, error } = await supabaseAdmin
      .from('user_onboarding')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      // Se non esiste, crea
      if (error.code === 'PGRST116') {
        const { data: newData, error: insertError } = await supabaseAdmin
          .from('user_onboarding')
          .insert({ user_id: user.id, ...updateData })
          .select()
          .single()

        if (insertError) {
          console.error('Errore creazione onboarding:', insertError)
          return NextResponse.json({ error: 'Errore aggiornamento onboarding' }, { status: 500 })
        }

        return NextResponse.json({ success: true, data: newData })
      }

      console.error('Errore aggiornamento onboarding:', error)
      return NextResponse.json({ error: 'Errore aggiornamento onboarding' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('Errore API onboarding PUT:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
