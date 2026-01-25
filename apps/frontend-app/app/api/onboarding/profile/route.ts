/**
 * API per User Profile (Onboarding Preferences)
 *
 * GET: Recupera profilo utente con preferenze
 * PUT: Aggiorna profilo utente
 * POST: Crea profilo utente (se non esiste)
 *
 * @file apps/frontend-app/app/api/onboarding/profile/route.ts
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET: Recupera profilo utente con preferenze
 *
 * Include anche dati dalla tabella users (services_offered, budget)
 */
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    // Recupera profilo da user_profiles
    let { data: profile, error: profileError } = await getSupabaseAdmin()
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Se non esiste, crea profilo vuoto
    if (profileError && profileError.code === 'PGRST116') {
      const { data: newProfile, error: createError } = await getSupabaseAdmin()
        .from('user_profiles')
        .insert({ user_id: user.id })
        .select()
        .single()

      if (createError) {
        console.error('Errore creazione profilo:', createError)
        return NextResponse.json({ error: 'Errore creazione profilo' }, { status: 500 })
      }

      profile = newProfile
    } else if (profileError) {
      console.error('Errore recupero profilo:', profileError)
      return NextResponse.json({ error: 'Errore recupero profilo' }, { status: 500 })
    }

    // Recupera dati utente per servizi e budget
    const { data: userData, error: userError } = await getSupabaseAdmin()
      .from('users')
      .select('services_offered, preferred_min_budget, preferred_max_budget')
      .eq('id', user.id)
      .single()

    if (userError) {
      console.error('Errore recupero dati utente:', userError)
    }

    // Combina dati profilo e utente
    const response = {
      id: profile.id,
      userId: profile.user_id,

      // Step 1: Tipo utente
      userType: profile.user_type || 'freelancer',

      // Step 2: Servizi (da users) + skill levels (da profile)
      servicesOffered: userData?.services_offered || [],
      serviceSkillLevels: profile.service_skill_levels || {},

      // Step 3: Budget (da users)
      preferredMinBudget: userData?.preferred_min_budget || 500,
      preferredMaxBudget: userData?.preferred_max_budget || 5000,

      // Step 4: Location
      preferredCities: profile.preferred_cities || [],
      preferredRegions: profile.preferred_regions || [],
      locationRadiusKm: profile.location_radius_km || 50,
      isRemoteOnly: profile.is_remote_only || false,

      // Step 5: Industries
      preferredIndustries: profile.preferred_industries || [],
      excludedIndustries: profile.excluded_industries || [],

      // Step 6: Capacity
      weeklyCapacity: profile.weekly_capacity || 5,
      projectsInProgress: profile.projects_in_progress || 0,

      // Metadata
      onboardingCompletedAt: profile.onboarding_completed_at,
      onboardingSkippedAt: profile.onboarding_skipped_at,
      onboardingCurrentStep: profile.onboarding_current_step || 1,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    }

    return NextResponse.json({ success: true, data: response })

  } catch (error) {
    console.error('Errore API profile GET:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/**
 * PUT: Aggiorna profilo utente
 *
 * Body può contenere qualsiasi campo del profilo
 */
export async function PUT(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    const body = await request.json()
    const now = new Date().toISOString()

    // Separa campi per user_profiles e users
    const profileUpdate: Record<string, any> = {
      updated_at: now
    }
    const userUpdate: Record<string, any> = {
      updated_at: now
    }

    // Campi per user_profiles
    if (body.userType !== undefined) {
      const validTypes = ['freelancer', 'agency', 'consultant']
      if (validTypes.includes(body.userType)) {
        profileUpdate.user_type = body.userType
      }
    }

    if (body.serviceSkillLevels !== undefined) {
      profileUpdate.service_skill_levels = body.serviceSkillLevels
    }

    if (body.preferredCities !== undefined) {
      profileUpdate.preferred_cities = body.preferredCities
    }

    if (body.preferredRegions !== undefined) {
      profileUpdate.preferred_regions = body.preferredRegions
    }

    if (body.locationRadiusKm !== undefined) {
      profileUpdate.location_radius_km = Math.max(0, Math.min(1000, body.locationRadiusKm))
    }

    if (body.isRemoteOnly !== undefined) {
      profileUpdate.is_remote_only = !!body.isRemoteOnly
    }

    if (body.preferredIndustries !== undefined) {
      profileUpdate.preferred_industries = body.preferredIndustries
    }

    if (body.excludedIndustries !== undefined) {
      profileUpdate.excluded_industries = body.excludedIndustries
    }

    if (body.weeklyCapacity !== undefined) {
      profileUpdate.weekly_capacity = Math.max(1, Math.min(100, body.weeklyCapacity))
    }

    if (body.projectsInProgress !== undefined) {
      profileUpdate.projects_in_progress = Math.max(0, body.projectsInProgress)
    }

    if (body.onboardingCurrentStep !== undefined) {
      profileUpdate.onboarding_current_step = body.onboardingCurrentStep
    }

    // Completamento/skip onboarding
    if (body.completeOnboarding === true) {
      profileUpdate.onboarding_completed_at = now
    }

    if (body.skipOnboarding === true) {
      profileUpdate.onboarding_skipped_at = now
      profileUpdate.onboarding_completed_at = now
    }

    // Campi per users table
    if (body.servicesOffered !== undefined) {
      userUpdate.services_offered = body.servicesOffered
    }

    if (body.preferredMinBudget !== undefined) {
      userUpdate.preferred_min_budget = Math.max(0, body.preferredMinBudget)
    }

    if (body.preferredMaxBudget !== undefined) {
      userUpdate.preferred_max_budget = Math.max(0, body.preferredMaxBudget)
    }

    // Aggiorna user_profiles
    const { data: updatedProfile, error: profileError } = await getSupabaseAdmin()
      .from('user_profiles')
      .update(profileUpdate)
      .eq('user_id', user.id)
      .select()
      .single()

    if (profileError) {
      // Se non esiste, crea
      if (profileError.code === 'PGRST116') {
        const { error: insertError } = await getSupabaseAdmin()
          .from('user_profiles')
          .insert({ user_id: user.id, ...profileUpdate })

        if (insertError) {
          console.error('Errore creazione profilo:', insertError)
          return NextResponse.json({ error: 'Errore salvataggio profilo' }, { status: 500 })
        }
      } else {
        console.error('Errore aggiornamento profilo:', profileError)
        return NextResponse.json({ error: 'Errore salvataggio profilo' }, { status: 500 })
      }
    }

    // Aggiorna users se necessario
    if (Object.keys(userUpdate).length > 1) {
      const { error: userError } = await getSupabaseAdmin()
        .from('users')
        .update(userUpdate)
        .eq('id', user.id)

      if (userError) {
        console.error('Errore aggiornamento utente:', userError)
        // Non fallire, il profilo è già aggiornato
      }
    }

    // Se onboarding completato, aggiorna anche user_onboarding
    if (body.completeOnboarding === true || body.skipOnboarding === true) {
      await getSupabaseAdmin()
        .from('user_onboarding')
        .update({
          completed_profile: true,
          profile_completed_at: now,
          updated_at: now
        })
        .eq('user_id', user.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Profilo aggiornato',
      data: updatedProfile
    })

  } catch (error) {
    console.error('Errore API profile PUT:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/**
 * POST: Crea profilo utente (usato raramente, GET lo crea automaticamente)
 */
export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    // Verifica se esiste già
    const { data: existing } = await getSupabaseAdmin()
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Profilo già esistente',
        data: { id: existing.id }
      })
    }

    // Crea nuovo profilo
    const body = await request.json().catch(() => ({}))

    const { data: newProfile, error } = await getSupabaseAdmin()
      .from('user_profiles')
      .insert({
        user_id: user.id,
        user_type: body.userType || 'freelancer',
        service_skill_levels: body.serviceSkillLevels || {},
        preferred_cities: body.preferredCities || [],
        preferred_regions: body.preferredRegions || [],
        preferred_industries: body.preferredIndustries || [],
        excluded_industries: body.excludedIndustries || [],
        weekly_capacity: body.weeklyCapacity || 5
      })
      .select()
      .single()

    if (error) {
      console.error('Errore creazione profilo:', error)
      return NextResponse.json({ error: 'Errore creazione profilo' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Profilo creato',
      data: newProfile
    }, { status: 201 })

  } catch (error) {
    console.error('Errore API profile POST:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
