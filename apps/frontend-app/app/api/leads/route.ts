// Questa API route gestisce il recupero dei lead per l'utente
// È parte del modulo apps/frontend-app
// Viene chiamata dalla dashboard per mostrare i lead disponibili
// ⚠️ Aggiornare se si modificano i filtri o la paginazione

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getBasePlanType, isProOrHigher, isStarterOrHigher } from '@/lib/utils/plan-helpers'
import { leadsHasStatusColumn, leadsHasColumn } from '@/lib/utils/leads-schema'
import { detectServices } from '@/lib/utils/service-detection'
import { calculateMatch } from '@/lib/utils/match-calculation'
import { getUnlockedSet } from '@/lib/api/paywall'
import type { ServiceType } from '@/lib/types/services'

// Limite del working-set quando è attivo un filtro per servizi/match: questi filtri
// si calcolano in-process (detectServices) perché non sono esprimibili in SQL, quindi
// limitiamo le righe analizzate per evitare query pesanti. Con l'ordinamento di default
// (score crescente = peggiori = migliori opportunità) i lead più rilevanti rientrano qui.
const SERVICE_FILTER_WORKING_SET = 1000

// Ricostruisce un oggetto "analysis" moderno dai sotto-oggetti di website_analysis
// selezionati via JSON-path (alias wa_*), con fallback alla colonna legacy `analysis`.
function buildDetectionInput(lead: any): any {
  const hasModern =
    lead.wa_seo || lead.wa_tracking || lead.wa_gdpr || lead.wa_mobile || lead.wa_social
  if (hasModern) {
    return {
      seo: lead.wa_seo,
      gdpr: lead.wa_gdpr,
      tracking: lead.wa_tracking,
      mobile: lead.wa_mobile,
      performance: lead.wa_performance,
      images: lead.wa_images,
      social: lead.wa_social,
      hasSSL: lead.wa_hasSSL,
      overallScore: lead.wa_overall_score
    }
  }
  return lead.analysis
}

// Rimuove gli alias tecnici wa_* prima di restituire il lead al client.
function stripDetectionFields(lead: any): any {
  const {
    wa_seo, wa_gdpr, wa_tracking, wa_mobile, wa_performance,
    wa_images, wa_social, wa_hasSSL, wa_overall_score, ...rest
  } = lead
  return rest
}

// Forza rendering dinamico per questa API route
export const dynamic = 'force-dynamic'

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  
  try {
    const { searchParams } = new URL(request.url)
    // Parametri di paginazione migliorati
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50) // Max 50 per performance
    const offset = (page - 1) * limit
    
    // Parametri di filtro estesi
    const category = searchParams.get('category')
    const city = searchParams.get('city')
    const neededRoles = searchParams.get('neededRoles')
    const search = searchParams.get('search')
    const minScore = searchParams.get('minScore')
    const maxScore = searchParams.get('maxScore')
    const showOnlyUnlocked = searchParams.get('showOnlyUnlocked') === '1'
    // Nuovi filtri avanzati
    const scoreMin = searchParams.get('scoreMin')
    const scoreMax = searchParams.get('scoreMax')
    const hasEmail = searchParams.get('hasEmail') === '1'
    const hasPhone = searchParams.get('hasPhone') === '1'
    const noGoogleAds = searchParams.get('noGoogleAds') === '1'
    const noFacebookPixel = searchParams.get('noFacebookPixel') === '1'
    const slowLoading = searchParams.get('slowLoading') === '1'
    const noSSL = searchParams.get('noSSL') === '1'
    const onlyUncontacted = searchParams.get('onlyUncontacted') === '1'
    const followUpOverdue = searchParams.get('followUpOverdue') === '1'
    const crmStatus = searchParams.get('crmStatus')
    // Filtri "Servizi Richiesti" / match — calcolati server-side per avere
    // paginazione corretta (la detection non è esprimibile in SQL puro).
    const serviceTypes = (searchParams.get('serviceTypes') || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean) as ServiceType[]
    const minMatchScore = parseInt(searchParams.get('minMatchScore') || '0') || 0
    const onlyMatching = searchParams.get('onlyMatching') === '1'
    const serviceFilterActive = serviceTypes.length > 0 || minMatchScore > 0 || onlyMatching

    // Parametri di ordinamento
    const sortBy = searchParams.get('sortBy') || 'score'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    
    
    // Verifica autenticazione
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {

      return NextResponse.json(
        { success: false, error: 'Token di autorizzazione mancante' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // ⚡ OTTIMIZZAZIONE: Verifica il JWT usando service role
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Token non valido o scaduto' },
        { status: 401 }
      )
    }
    

    // Ottieni il profilo utente con fallback creation (usa service role per scrivere)
    // I campi servizi/budget servono al match server-side ("Servizi Richiesti").
    let { data: userProfile, error: profileError } = await getSupabaseAdmin()
      .from('users')
      .select('id, role, plan, credits_remaining, services_offered, preferred_min_budget, preferred_max_budget')
      .eq('id', user.id)
      .single()

    // Se l'utente non esiste, crealo con dati di default
    if (profileError && profileError.code === 'PGRST116') {
      
      const { data: newUser, error: createError } = await getSupabaseAdmin()
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          role: 'client',
          plan: 'free',
          credits_remaining: 1,
          status: 'active',
          created_at: new Date().toISOString()
        })
        .select('id, role, plan, credits_remaining, services_offered, preferred_min_budget, preferred_max_budget')
        .single()

      if (createError) {
        console.error('Errore creazione utente:', createError)
        return NextResponse.json(
          { success: false, error: 'Errore creazione profilo utente' },
          { status: 500 }
        )
      }
      
      userProfile = newUser
    } else if (profileError) {
      console.error('Errore profilo utente:', profileError)
      return NextResponse.json(
        { success: false, error: 'Errore recupero profilo utente' },
        { status: 500 }
      )
    }

    if (!userProfile) {
      return NextResponse.json(
        { success: false, error: 'Profilo utente non disponibile' },
        { status: 404 }
      )
    }
    
    // Tutti i piani vedono tutti i dati - i piani differiscono solo per crediti e funzionalità (CRM per PRO)
    // Questo permette di mostrare informazioni REALI nelle card bloccate (contatti disponibili, problemi tecnici)
    let selectFields = `id, business_name, website_url, phone, email, address, city, category, score, analysis, created_at, last_seen_at`

    // Quando filtriamo per servizi/match, servono i sotto-oggetti di website_analysis
    // per la detection completa (gdpr/mobile/social, non presenti nella forma legacy).
    // Li selezioniamo via JSON-path solo se la colonna esiste (DB potenzialmente non migrato).
    const hasWaColumn = serviceFilterActive
      ? await leadsHasColumn(getSupabaseAdmin(), 'website_analysis')
      : false
    if (serviceFilterActive && hasWaColumn) {
      selectFields += `, wa_seo:website_analysis->seo, wa_gdpr:website_analysis->gdpr, wa_tracking:website_analysis->tracking, wa_mobile:website_analysis->mobile, wa_performance:website_analysis->performance, wa_images:website_analysis->images, wa_social:website_analysis->social, wa_hasSSL:website_analysis->hasSSL, wa_overall_score:website_analysis->overallScore`
    }

    // Con filtro servizi attivo NON usiamo il count del DB: il totale reale dipende
    // dalla detection in-process, quindi lo calcoliamo dopo aver filtrato il working-set.
    let query = serviceFilterActive
      ? getSupabaseAdmin().from('leads').select(selectFields)
      : getSupabaseAdmin().from('leads').select(selectFields, { count: 'exact' })
    
    // Filtro per lead sbloccati dall'utente
    if (showOnlyUnlocked) {
      // Recupera i lead sbloccati dall'utente dalla tabella user_unlocked_leads
      const { data: unlockedLeads, error: unlockedError } = await getSupabaseAdmin()
        .from('user_unlocked_leads')
        .select('lead_id')
        .eq('user_id', user.id)
      
      if (unlockedError) {
        console.error('Errore recupero lead sbloccati:', unlockedError)
        return NextResponse.json(
          { success: false, error: 'Errore recupero lead sbloccati' },
          { status: 500 }
        )
      }
      
      const unlockedLeadIds = unlockedLeads?.map(ul => ul.lead_id) || []
      
      if (unlockedLeadIds.length === 0) {
        // Se non ha lead sbloccati, restituisci risultato vuoto
        return NextResponse.json({
          success: true,
          data: {
            leads: [],
            user_profile: {
              role: userProfile.role,
              plan: userProfile.plan,
              credits_remaining: userProfile.credits_remaining
            },
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0
            }
          }
        })
      }
      
      query = query.in('id', unlockedLeadIds)
    }

    // Mostra solo i lead PUBBLICATI: quelli a bassa confidenza sono in quarantena e
    // restano nascosti (scelta "fiducia prima del volume"). Eccezione: i lead già
    // sbloccati dall'utente restano sempre visibili, anche se messi in quarantena dopo.
    // Il filtro si applica solo se la colonna `status` esiste (robusto pre-migration).
    if (!showOnlyUnlocked && await leadsHasStatusColumn(getSupabaseAdmin())) {
      query = query.eq('status', 'published')
    }

    // Nota: Tutti i lead sono pubblici, non c'è più il concetto di "assigned_to"
    
    // ⚡ OTTIMIZZAZIONE: Applica filtri in ordine di selettività (più selettivi prima)
    if (category) {
      query = query.eq('category', category)
    }
    
    // Range punteggio (più specifico dei filtri singoli)
    if (scoreMin) {
      query = query.gte('score', parseInt(scoreMin))
    }
    if (scoreMax) {
      query = query.lte('score', parseInt(scoreMax))
    }
    if (minScore) {
      query = query.gte('score', parseInt(minScore))
    }
    if (maxScore) {
      query = query.lte('score', parseInt(maxScore))
    }
    
    if (city) {
      query = query.ilike('city', `%${city}%`)
    }
    
    // Filtri contatti
    if (hasEmail) {
      query = query.not('email', 'is', null).not('email', 'eq', '')
    }
    if (hasPhone) {
      query = query.not('phone', 'is', null).not('phone', 'eq', '')
    }
    
    // ⚡ FILTRI TECNICI AVANZATI
    if (noGoogleAds) {
      query = query.or('analysis->tracking->>hasGoogleAds.eq.false,analysis->tracking->>hasGoogleAds.is.null')
    }
    if (noFacebookPixel) {
      query = query.or('analysis->tracking->>hasFacebookPixel.eq.false,analysis->tracking->>hasFacebookPixel.is.null')
    }
    if (slowLoading) {
      query = query.gte('analysis->performance->>loadTime', 3.0)
    }
    if (noSSL) {
      query = query.or('analysis->security->>hasSSL.eq.false,analysis->security->>hasSSL.is.null')
    }
    // ⚡ OTTIMIZZAZIONE: Ricerca testuale solo su campi indicizzati
    if (search) {
      query = query.or(`business_name.ilike.%${search}%,city.ilike.%${search}%`)
    }
    
    // 🔥 FILTRI CRM - per utenti Starter+ (allineato al gate di /api/crm)
    if (isStarterOrHigher(userProfile.plan) && (onlyUncontacted || followUpOverdue || (crmStatus && crmStatus !== 'all'))) {
      // Ottieni tutti i lead con stati CRM per questo utente
      const { data: crmData, error: crmError } = await getSupabaseAdmin()
        .from('crm_entries')
        .select('lead_id, status, follow_up_date')
        .eq('user_id', user.id)
      
      if (crmError) {
        console.warn('Errore filtri CRM:', crmError)
      } else {
        const crmMap = new Map(crmData?.map(crm => [crm.lead_id, crm]) || [])
        let filteredLeadIds: string[] = []
        
        if (onlyUncontacted) {
          // Lead senza entry CRM o con status 'to_contact'/'new'  
          const allLeadIds = await getSupabaseAdmin()
            .from('leads')
            .select('id')
            .then(({ data }) => data?.map(l => l.id) || [])
          
          filteredLeadIds = allLeadIds.filter(leadId => {
            const crmEntry = crmMap.get(leadId)
            return !crmEntry || crmEntry.status === 'to_contact' || !crmEntry.status
          })
        }
        
        if (followUpOverdue) {
          const today = new Date().toISOString().split('T')[0]
          const overdueLeads = Array.from(crmMap.entries())
            .filter(([_, crm]) => crm.follow_up_date && crm.follow_up_date < today)
            .map(([leadId, _]) => leadId)
          
          if (filteredLeadIds.length > 0) {
            filteredLeadIds = filteredLeadIds.filter(id => overdueLeads.includes(id))
          } else {
            filteredLeadIds = overdueLeads
          }
        }
        
        if (crmStatus && crmStatus !== 'all') {
          // Mappa status frontend a DB
          const dbStatus = (() => {
            switch (crmStatus) {
              case 'new': return 'to_contact'
              case 'contacted': return ['on_hold', 'follow_up']
              case 'in_negotiation': return 'in_negotiation'
              case 'won': return 'closed_positive'
              case 'lost': return 'closed_negative'
              default: return null
            }
          })()
          
          const statusLeads = Array.from(crmMap.entries())
            .filter(([_, crm]) => {
              if (Array.isArray(dbStatus)) {
                return dbStatus.includes(crm.status)
              }
              return crm.status === dbStatus
            })
            .map(([leadId, _]) => leadId)
          
          if (filteredLeadIds.length > 0) {
            filteredLeadIds = filteredLeadIds.filter(id => statusLeads.includes(id))
          } else {
            filteredLeadIds = statusLeads
          }
        }
        
        if (filteredLeadIds.length === 0) {
          // Nessun lead soddisfa i criteri CRM
          return NextResponse.json({
            success: true,
            data: {
              leads: [],
              user_profile: {
                role: userProfile.role,
                plan: userProfile.plan,
                credits_remaining: userProfile.credits_remaining
              },
              pagination: {
                page,
                limit,
                total: 0,
                totalPages: 0
              }
            }
          })
        }
        
        query = query.in('id', filteredLeadIds)
      }
    }
    // ⚡ OTTIMIZZAZIONE: Paginazione e ordinamento efficiente
    // Applica ordinamento dinamico
    let orderColumn = 'score'
    let orderAscending = true

    switch (sortBy) {
      case 'score':
        orderColumn = 'score'
        orderAscending = sortOrder === 'asc'
        break
      case 'created_at':
        orderColumn = 'created_at'
        orderAscending = sortOrder === 'asc'
        break
      case 'last_seen_at':
        orderColumn = 'last_seen_at'
        orderAscending = sortOrder === 'asc'
        break
      case 'business_name':
        orderColumn = 'business_name'
        orderAscending = sortOrder === 'asc'
        break
      default:
        orderColumn = 'score'
        orderAscending = true
    }

    // 🔒 PAYWALL: i contatti (phone/email) escono dal server SOLO per i lead
    // sbloccati dall'utente. Per gli altri restituiamo i flag has_phone/has_email
    // così le card possono dire "contatto disponibile" senza rivelarlo.
    const maskContacts = async (pageLeads: any[]): Promise<any[]> => {
      if (!pageLeads || pageLeads.length === 0) return pageLeads
      const unlockedSet = await getUnlockedSet(
        getSupabaseAdmin(),
        user.id,
        pageLeads.map((l: any) => l.id)
      )
      return pageLeads.map((lead: any) => {
        const unlocked = unlockedSet.has(lead.id)
        return {
          ...lead,
          has_phone: !!lead.phone,
          has_email: !!lead.email,
          phone: unlocked ? lead.phone : null,
          email: unlocked ? lead.email : null,
          is_unlocked: unlocked
        }
      })
    }

    // Helper: arricchisce i lead della pagina con lo stato CRM (utenti Starter+).
    const enrichWithCrm = async (pageLeads: any[]): Promise<any[]> => {
      if (!isStarterOrHigher(userProfile.plan) || !pageLeads || pageLeads.length === 0) {
        return pageLeads
      }
      try {
        const leadIds = pageLeads.map((lead: any) => lead.id)
        const { data: crmActivities, error: crmError } = await getSupabaseAdmin()
          .from('crm_entries')
          .select('lead_id, status, updated_at, follow_up_date, note')
          .in('lead_id', leadIds)
          .eq('user_id', user.id)

        if (crmError) {
          console.warn('Errore recupero stati CRM (continuando senza):', crmError)
          return pageLeads
        }
        const crmMap = new Map(crmActivities?.map(crm => [crm.lead_id, crm]) || [])
        const mapCRMStatus = (dbStatus: string | null) => {
          if (!dbStatus) return 'new'
          switch (dbStatus) {
            case 'to_contact': return 'new'
            case 'in_negotiation': return 'in_negotiation'
            case 'closed_positive': return 'won'
            case 'closed_negative': return 'lost'
            case 'on_hold': return 'contacted'
            case 'follow_up': return 'contacted'
            default: return 'new'
          }
        }
        return pageLeads.map((lead: any) => ({
          ...lead,
          crm_status: mapCRMStatus(crmMap.get(lead.id)?.status),
          last_contact_date: null,
          next_follow_up: crmMap.get(lead.id)?.follow_up_date,
          crm_notes: crmMap.get(lead.id)?.note
        }))
      } catch (crmIntegrationError) {
        console.warn('Errore integrazione CRM (continuando senza):', crmIntegrationError)
        return pageLeads
      }
    }

    const startTime = Date.now()

    // =========================================================================
    // PERCORSO A: filtro "Servizi Richiesti" / match attivo.
    // La detection (detectServices) non è esprimibile in SQL, quindi:
    //  1) carichiamo un working-set ordinato (limitato per performance);
    //  2) calcoliamo i servizi e il match in-process;
    //  3) filtriamo, contiamo e impaginiamo qui → totale/totalPages corretti.
    // =========================================================================
    if (serviceFilterActive) {
      query = query.order(orderColumn, { ascending: orderAscending })
      if (orderColumn !== 'created_at') {
        query = query.order('created_at', { ascending: false })
      }
      query = query.limit(SERVICE_FILTER_WORKING_SET)

      const { data: workingSet, error } = await query
      if (error) {
        console.error('Errore nel recupero lead (service filter):', error)
        return NextResponse.json(
          { success: false, error: 'Errore nel recupero dei lead' },
          { status: 500 }
        )
      }

      const userServices = (userProfile.services_offered || []) as ServiceType[]
      const budgetOpts = {
        userMinBudget: userProfile.preferred_min_budget ?? undefined,
        userMaxBudget: userProfile.preferred_max_budget ?? undefined
      }

      const matched = (workingSet || []).filter((lead: any) => {
        const detected = detectServices(buildDetectionInput(lead))
        const detectedTypes = detected.services.map(s => s.type)

        // Filtro per tipi di servizio: il lead deve avere almeno uno dei servizi scelti.
        if (serviceTypes.length > 0) {
          if (!serviceTypes.some(t => detectedTypes.includes(t))) return false
        }

        // Filtro match minimo e/o "solo compatibili" rispetto ai servizi dell'utente.
        if (minMatchScore > 0 || onlyMatching) {
          if (userServices.length === 0) {
            // Utente senza servizi configurati: non può filtrare per match → passa.
            return true
          }
          const match = calculateMatch(detected, userServices, budgetOpts)
          if (onlyMatching && match.matchedServices.length === 0) return false
          if (minMatchScore > 0 && match.score < minMatchScore) return false
        }
        return true
      })

      const total = matched.length
      const pageSlice = matched.slice(offset, offset + limit).map(stripDetectionFields)
      const pageLeads = await maskContacts(await enrichWithCrm(pageSlice))
      const queryTime = Date.now() - startTime

      return NextResponse.json({
        success: true,
        data: {
          leads: pageLeads,
          user_profile: {
            role: userProfile.role,
            plan: userProfile.plan,
            credits_remaining: userProfile.credits_remaining
          },
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          },
          performance: {
            query_time_ms: queryTime,
            results_count: pageLeads.length,
            // Segnaliamo se il working-set è stato troncato (potrebbero esistere
            // altri lead corrispondenti oltre il limite analizzato).
            working_set_truncated: (workingSet?.length || 0) >= SERVICE_FILTER_WORKING_SET
          }
        }
      })
    }

    // =========================================================================
    // PERCORSO B (default): paginazione efficiente lato DB con count esatto.
    // =========================================================================
    query = query
      .range(offset, offset + limit - 1)
      .order(orderColumn, { ascending: orderAscending })

    // Ordinamento secondario per consistenza
    if (orderColumn !== 'created_at') {
      query = query.order('created_at', { ascending: false })
    }

    const { data: leads, error, count } = await query
    const queryTime = Date.now() - startTime

    if (error) {
      console.error('Errore nel recupero lead:', error)
      return NextResponse.json(
        { success: false, error: 'Errore nel recupero dei lead' },
        { status: 500 }
      )
    }

    const filteredLeads = await maskContacts(await enrichWithCrm(leads || []))

    return NextResponse.json({
      success: true,
      data: {
        leads: filteredLeads,
        user_profile: {
          role: userProfile.role,
          plan: userProfile.plan,
          credits_remaining: userProfile.credits_remaining
        },
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        },
        performance: {
          query_time_ms: queryTime,
          results_count: leads?.length || 0
        }
      }
    })
    
  } catch (error) {
    console.error('Errore API leads:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// Nota: POST rimosso perché i lead ora sono pubblici e non vengono assegnati
// Il sistema di crediti funziona diversamente: gli utenti vedono lead in base al loro piano
// I crediti vengono scalati quando si visualizzano i dettagli completi di un lead
