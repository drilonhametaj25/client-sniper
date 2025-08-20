// Questa API route gestisce il recupero dei lead per l'utente
// È parte del modulo apps/frontend-app
// Viene chiamata dalla dashboard per mostrare i lead disponibili
// ⚠️ Aggiornare se si modificano i filtri o la paginazione

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getBasePlanType, isProOrHigher, isStarterOrHigher } from '@/lib/utils/plan-helpers'

// Forza rendering dinamico per questa API route
export const dynamic = 'force-dynamic'

// Client per verificare il token (usa anon key)
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Client per operazioni amministrative (usa service role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Token non valido o scaduto' },
        { status: 401 }
      )
    }
    

    // Ottieni il profilo utente con fallback creation (usa service role per scrivere)
    let { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, role, plan, credits_remaining')
      .eq('id', user.id)
      .single()

    // Se l'utente non esiste, crealo con dati di default
    if (profileError && profileError.code === 'PGRST116') {
      
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          role: 'client',
          plan: 'free',
          credits_remaining: 2,
          created_at: new Date().toISOString()
        })
        .select('id, role, plan, credits_remaining')
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
    
    // ⚡ OTTIMIZZAZIONE: Query principale ottimizzata con meno campi se non necessari
    const isAdmin = userProfile.role === 'admin'
    const userBasePlan = getBasePlanType(userProfile.plan)
    const selectFields = isAdmin || isProOrHigher(userProfile.plan) 
      ? `id, business_name, website_url, phone, email, address, city, category, score, analysis, created_at, last_seen_at`
      : userBasePlan === 'starter'
      ? `id, business_name, website_url, city, category, score, created_at`
      : `id, business_name, city, category, score, created_at`
    
    let query = supabaseAdmin
      .from('leads')
      .select(selectFields, { count: 'exact' })
    
    // Filtro per lead sbloccati dall'utente
    if (showOnlyUnlocked) {
      // Recupera i lead sbloccati dall'utente dalla tabella user_unlocked_leads
      const { data: unlockedLeads, error: unlockedError } = await supabaseAdmin
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
    
    // 🔥 FILTRI CRM - solo per utenti PRO
    if (isProOrHigher(userProfile.plan) && (onlyUncontacted || followUpOverdue || (crmStatus && crmStatus !== 'all'))) {
      // Ottieni tutti i lead con stati CRM per questo utente
      const { data: crmData, error: crmError } = await supabaseAdmin
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
          const allLeadIds = await supabaseAdmin
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
    
    query = query
      .range(offset, offset + limit - 1)
      .order(orderColumn, { ascending: orderAscending })
    
    // Ordinamento secondario per consistenza
    if (orderColumn !== 'created_at') {
      query = query.order('created_at', { ascending: false })
    }
    
    // ⚡ PERFORMANCE TIMING
    const startTime = Date.now()
    const { data: leads, error, count } = await query
    const queryTime = Date.now() - startTime
    
    
    if (error) {
      console.error('Errore nel recupero lead:', error)
      return NextResponse.json(
        { success: false, error: 'Errore nel recupero dei lead' },
        { status: 500 }
      )
    }
    
    // ⚡ OTTIMIZZAZIONE: Filtraggio campi già fatto nella query SELECT
    let filteredLeads = leads // Non serve più filtrare, già fatto nella SELECT
    
    // 🔥 INTEGRAZIONE CRM: Per utenti PRO, aggiungere stato CRM
    if (isProOrHigher(userProfile.plan) && leads && leads.length > 0) {
      try {
        const leadIds = leads.map((lead: any) => lead.id)
        
        // Query stato CRM per tutti i lead
        const { data: crmActivities, error: crmError } = await supabaseAdmin
          .from('crm_entries')
          .select(`
            lead_id,
            status,
            updated_at,
            follow_up_date,
            note
          `)
          .in('lead_id', leadIds)
          .eq('user_id', user.id)
        
        if (crmError) {
          console.warn('Errore recupero stati CRM (continuando senza):', crmError)
        } else {
          // Mappa stati CRM ai lead
          const crmMap = new Map(
            crmActivities?.map(crm => [crm.lead_id, crm]) || []
          )
          
          // Funzione per mappare stati DB a stati frontend
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
          
          filteredLeads = leads.map((lead: any) => ({
            ...lead,
            crm_status: mapCRMStatus(crmMap.get(lead.id)?.status),
            last_contact_date: null, // Non disponibile in crm_entries
            next_follow_up: crmMap.get(lead.id)?.follow_up_date,
            crm_notes: crmMap.get(lead.id)?.note
          }))
        }
      } catch (crmIntegrationError) {
        console.warn('Errore integrazione CRM (continuando senza):', crmIntegrationError)
      }
    }
    
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
