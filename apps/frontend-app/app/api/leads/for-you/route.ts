/**
 * API per Dashboard "Per Te"
 *
 * GET: Recupera lead personalizzati per l'utente
 *
 * Sezioni:
 * - daily_top_5: Top 5 lead per relevance oggi
 * - perfect_match: Lead con relevance >= 90%
 * - high_budget: Lead con budget alto
 * - near_you: Lead nella stessa città/regione
 * - new_today: Lead aggiunti nelle ultime 24h
 *
 * @file apps/frontend-app/app/api/leads/for-you/route.ts
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateRelevanceScore, LeadForRelevance } from '@/lib/utils/relevance-calculation'
import { detectServices } from '@/lib/utils/service-detection'
import { UserProfile, UserBehaviorSummary } from '@/lib/types/onboarding'
import { ServiceType } from '@/lib/types/services'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Limite di lead da processare per performance
const MAX_LEADS_TO_PROCESS = 500

/**
 * GET: Recupera lead personalizzati per l'utente
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

    // Recupera dati utente, profilo, behavior e lead sbloccati in parallelo
    const [userResult, profileResult, behaviorResult, leadsResult, unlockedResult] = await Promise.all([
      // User data
      getSupabaseAdmin()
        .from('users')
        .select('services_offered, preferred_min_budget, preferred_max_budget')
        .eq('id', user.id)
        .single(),

      // Profile data
      getSupabaseAdmin()
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single(),

      // Behavior summary
      getBehaviorSummary(user.id),

      // Leads recenti (ultimi 30 giorni, max 500)
      getSupabaseAdmin()
        .from('leads')
        .select('id, business_name, website_url, city, category, score, analysis, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(MAX_LEADS_TO_PROCESS),

      // Lead già sbloccati dall'utente (per escluderli dai Top 5)
      getSupabaseAdmin()
        .from('lead_unlocks')
        .select('lead_id')
        .eq('user_id', user.id)
    ])

    // Set di lead già sbloccati
    const unlockedLeadIds = new Set(
      (unlockedResult.data || []).map((u: { lead_id: string }) => u.lead_id)
    )

    // Prepara dati utente
    const userData = userResult.data as {
      services_offered?: string[]
      preferred_min_budget?: number
      preferred_max_budget?: number
    } | null
    const profileData = profileResult.data
    const behaviorData = behaviorResult

    // Check se profilo completo
    const profileComplete = !!(
      profileData?.onboarding_completed_at ||
      (userData?.services_offered && userData.services_offered.length > 0)
    )

    // Se nessun servizio configurato, mostra prompt
    const showOnboardingPrompt = !userData?.services_offered || userData.services_offered.length === 0

    // Se non ci sono lead, ritorna vuoto
    const leads = leadsResult.data || []
    if (leads.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          sections: {
            daily_top_5: [],
            perfect_match: [],
            high_budget: [],
            near_you: [],
            new_today: []
          },
          profileComplete,
          showOnboardingPrompt,
          totalLeadsAnalyzed: 0,
          calculatedAt: new Date().toISOString()
        }
      })
    }

    // Prepara input per relevance calculation
    const userForRelevance = {
      services_offered: (userData?.services_offered || []) as ServiceType[],
      preferred_min_budget: userData?.preferred_min_budget,
      preferred_max_budget: userData?.preferred_max_budget
    }

    const profile: UserProfile | null = profileData ? {
      id: profileData.id,
      userId: profileData.user_id,
      userType: profileData.user_type || 'freelancer',
      serviceSkillLevels: profileData.service_skill_levels || {},
      preferredCities: profileData.preferred_cities || [],
      preferredRegions: profileData.preferred_regions || [],
      locationRadiusKm: profileData.location_radius_km || 50,
      isRemoteOnly: profileData.is_remote_only || false,
      preferredIndustries: profileData.preferred_industries || [],
      excludedIndustries: profileData.excluded_industries || [],
      weeklyCapacity: profileData.weekly_capacity || 5,
      projectsInProgress: profileData.projects_in_progress || 0,
      onboardingCompletedAt: profileData.onboarding_completed_at,
      onboardingSkippedAt: profileData.onboarding_skipped_at,
      onboardingCurrentStep: profileData.onboarding_current_step || 1,
      createdAt: profileData.created_at,
      updatedAt: profileData.updated_at
    } : null

    // Calcola relevance per tutti i lead
    const leadsWithRelevance = leads.map(lead => {
      const leadForCalc: LeadForRelevance = {
        id: lead.id,
        city: lead.city || '',
        category: lead.category || '',
        score: lead.score || 50,
        analysis: lead.analysis,
        created_at: lead.created_at
      }

      const relevance = calculateRelevanceScore({
        lead: leadForCalc,
        user: userForRelevance,
        profile,
        behavior: behaviorData
      })

      return {
        lead: {
          id: lead.id,
          business_name: lead.business_name,
          website_url: lead.website_url,
          city: lead.city,
          category: lead.category,
          score: lead.score,
          analysis: lead.analysis,
          created_at: lead.created_at
        },
        relevance
      }
    })

    // Ordina per relevance
    leadsWithRelevance.sort((a, b) => b.relevance.score - a.relevance.score)

    // Prepara sezioni
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)


    // Calcola prima i Top 5 per poterli escludere da altre sezioni
    const daily_top_5 = leadsWithRelevance
      .filter(l => !unlockedLeadIds.has(l.lead.id))
      .slice(0, 5)

    // Set degli ID dei Top 5 per evitare duplicati in "Nuovi Oggi"
    const top5Ids = new Set(daily_top_5.map(l => l.lead.id))
    const sections = {
      // Top 5 per relevance - ESCLUDI lead già sbloccati dall'utente
      // Così l'utente vede sempre 5 lead "nuovi" per lui ogni giorno
      daily_top_5,

      // Perfect match (>= 90%)
      perfect_match: leadsWithRelevance
        .filter(l => l.relevance.score >= 90)
        .slice(0, 8),

      // High budget
      high_budget: leadsWithRelevance
        .filter(l => {
          const services = detectServices(l.lead.analysis)
          const minBudget = userData?.preferred_max_budget || 3000
          return services.totalBudget.max >= minBudget * 1.2
        })
        .slice(0, 6),

      // Near you (stessa città o regione)
      near_you: profile?.preferredCities?.length || profile?.preferredRegions?.length
        ? leadsWithRelevance
            .filter(l => {
              const leadCity = (l.lead.city || '').toLowerCase()
              const cityMatch = profile!.preferredCities.some(c =>
                leadCity.includes(c.toLowerCase())
              )
              // Simple region check
              const regionMatch = profile!.preferredRegions.some(r =>
                leadCity.includes(r.toLowerCase().substring(0, 4))
              )
              return cityMatch || regionMatch
            })
            .slice(0, 6)
        : [],

      // New today (ultime 24h) - ESCLUDI i Top 5 per evitare duplicati
      new_today: leadsWithRelevance
        .filter(l => new Date(l.lead.created_at) >= oneDayAgo && !top5Ids.has(l.lead.id))
        .slice(0, 10)
    }

    return NextResponse.json({
      success: true,
      data: {
        sections,
        profileComplete,
        showOnboardingPrompt,
        totalLeadsAnalyzed: leads.length,
        calculatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Errore API leads/for-you:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/**
 * Helper: Recupera summary comportamento utente
 */
async function getBehaviorSummary(userId: string): Promise<UserBehaviorSummary | null> {
  try {
    const { data: behaviors } = await getSupabaseAdmin()
      .from('user_behavior')
      .select('action, lead_category_snapshot')
      .eq('user_id', userId)

    if (!behaviors || behaviors.length === 0) {
      return null
    }

    const actionCounts: Record<string, number> = {}
    const convertedCategories: string[] = []

    for (const b of behaviors) {
      actionCounts[b.action] = (actionCounts[b.action] || 0) + 1

      if (b.action === 'converted' && b.lead_category_snapshot) {
        if (!convertedCategories.includes(b.lead_category_snapshot)) {
          convertedCategories.push(b.lead_category_snapshot)
        }
      }
    }

    // Get converted cities
    const convertedCities: string[] = []
    const { data: convertedLeads } = await getSupabaseAdmin()
      .from('user_behavior')
      .select('lead_id')
      .eq('user_id', userId)
      .eq('action', 'converted')

    if (convertedLeads && convertedLeads.length > 0) {
      const leadIds = convertedLeads.map(b => b.lead_id)
      const { data: leads } = await getSupabaseAdmin()
        .from('leads')
        .select('city')
        .in('id', leadIds)

      if (leads) {
        for (const lead of leads) {
          if (lead.city && !convertedCities.includes(lead.city)) {
            convertedCities.push(lead.city)
          }
        }
      }
    }

    return {
      totalViewed: actionCounts['viewed'] || 0,
      totalUnlocked: actionCounts['unlocked'] || 0,
      totalContacted: actionCounts['contacted'] || 0,
      totalConverted: actionCounts['converted'] || 0,
      totalSkipped: actionCounts['skipped'] || 0,
      totalSaved: actionCounts['saved'] || 0,
      convertedCategories,
      convertedCities,
      avgConvertedRelevance: null,
      lastActivity: new Date().toISOString()
    }

  } catch (error) {
    console.error('Errore getBehaviorSummary:', error)
    return null
  }
}
