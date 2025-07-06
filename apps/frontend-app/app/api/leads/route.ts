// Questa API route gestisce il recupero dei lead per l'utente
// È parte del modulo apps/frontend-app
// Viene chiamata dalla dashboard per mostrare i lead disponibili
// ⚠️ Aggiornare se si modificano i filtri o la paginazione

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'


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
    const selectFields = isAdmin || userProfile.plan === 'pro' 
      ? `id, business_name, website_url, phone, email, address, city, category, score, analysis, created_at, last_seen_at`
      : userProfile.plan === 'starter'
      ? `id, business_name, website_url, city, category, score, created_at`
      : `id, business_name, city, category, score, created_at`
    
    let query = supabaseAdmin
      .from('leads')
      .select(selectFields, { count: 'exact' })
    
    // Nota: Tutti i lead sono pubblici, non c'è più il concetto di "assigned_to"
    
    // ⚡ OTTIMIZZAZIONE: Applica filtri in ordine di selettività (più selettivi prima)
    if (category) {
      query = query.eq('category', category)
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

    // Nota: neededRoles rimosso perché la colonna needed_roles non esiste nel database frontend
    
    // ⚡ OTTIMIZZAZIONE: Ricerca testuale solo su campi indicizzati
    if (search) {
      query = query.or(`business_name.ilike.%${search}%,city.ilike.%${search}%`)
    }
    
    // ⚡ OTTIMIZZAZIONE: Paginazione e ordinamento efficiente
    query = query
      .range(offset, offset + limit - 1)
      .order('score', { ascending: true }) // Lead con punteggio più basso prima (più problemi)
      .order('created_at', { ascending: false })
    
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
    const filteredLeads = leads // Non serve più filtrare, già fatto nella SELECT
    
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
