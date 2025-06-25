// Questa API route gestisce il recupero dei lead per l'utente
// È parte del modulo apps/frontend-app
// Viene chiamata dalla dashboard per mostrare i lead disponibili
// ⚠️ Aggiornare se si modificano i filtri o la paginazione

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parametri di query
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const category = searchParams.get('category')
    const min_score = searchParams.get('min_score')
    const max_score = searchParams.get('max_score')
    const city = searchParams.get('city')
    const needed_roles = searchParams.get('needed_roles')
    
    // Verifica autenticazione
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token di autorizzazione mancante' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verifica il token con Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Token non valido' },
        { status: 401 }
      )
    }

    // Ottieni il profilo utente completo
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, role, plan, credits_remaining')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { success: false, error: 'Profilo utente non trovato' },
        { status: 404 }
      )
    }
    
    // Query base - gli admin vedono tutti i lead, i clienti solo quelli pubblici
    let query = supabase
      .from('leads')
      .select(`
        id,
        business_name,
        website_url,
        phone,
        email,
        address,
        city,
        category,
        score,
        analysis,
        needed_roles,
        issues,
        assigned_to,
        created_at,
        last_seen_at
      `, { count: 'exact' })
    
    // Filtro di sicurezza basato sul ruolo
    if (userProfile.role !== 'admin') {
      // I clienti vedono solo lead pubblici (non assegnati) o assegnati a loro
      query = query.or(`assigned_to.is.null,assigned_to.eq.${user.id}`)
    }
    
    // Applica filtri
    if (category) {
      query = query.eq('category', category)
    }
    
    if (min_score) {
      query = query.gte('score', parseInt(min_score))
    }
    
    if (max_score) {
      query = query.lte('score', parseInt(max_score))
    }
    
    if (city) {
      query = query.ilike('city', `%${city}%`)
    }

    if (needed_roles) {
      const rolesArray = needed_roles.split(',')
      query = query.overlaps('needed_roles', rolesArray)
    }
    
    // Paginazione
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    query = query
      .range(from, to)
      .order('score', { ascending: true }) // Lead con punteggio più basso prima (più problemi)
      .order('created_at', { ascending: false })
    
    const { data: leads, error, count } = await query
    
    if (error) {
      console.error('Errore nel recupero lead:', error)
      return NextResponse.json(
        { success: false, error: 'Errore nel recupero dei lead' },
        { status: 500 }
      )
    }
    
    // Filtra campi in base al piano (solo per clienti)
    let filteredLeads = leads
    if (userProfile.role === 'client') {
      const visibleFields = getVisibleFieldsByPlan(userProfile.plan)
      filteredLeads = leads?.map(lead => 
        filterLeadFields(lead, visibleFields)
      )
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

// POST per assegnare un lead a un utente (solo admin o self-assignment con crediti)
export async function POST(request: NextRequest) {
  try {
    const { lead_id, user_id } = await request.json()
    
    // Verifica autenticazione
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token di autorizzazione mancante' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Token non valido' },
        { status: 401 }
      )
    }

    // Ottieni profilo utente
    const { data: userProfile } = await supabase
      .from('users')
      .select('role, credits_remaining')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json(
        { success: false, error: 'Profilo non trovato' },
        { status: 404 }
      )
    }

    // Verifica autorizzazioni
    const isAdmin = userProfile.role === 'admin'
    const isSelfAssignment = user_id === user.id

    if (!isAdmin && !isSelfAssignment) {
      return NextResponse.json(
        { success: false, error: 'Non autorizzato' },
        { status: 403 }
      )
    }

    // Se non è admin, verifica i crediti
    if (!isAdmin && userProfile.credits_remaining <= 0) {
      return NextResponse.json(
        { success: false, error: 'Crediti insufficienti' },
        { status: 400 }
      )
    }

    // Assegna il lead
    const { error: assignError } = await supabase
      .from('leads')
      .update({ assigned_to: user_id })
      .eq('id', lead_id)
      .is('assigned_to', null) // Solo se non già assegnato

    if (assignError) {
      return NextResponse.json(
        { success: false, error: 'Errore nell\'assegnazione del lead' },
        { status: 500 }
      )
    }

    // Decrementa i crediti se non è admin
    if (!isAdmin) {
      await supabase
        .from('users')
        .update({ 
          credits_remaining: userProfile.credits_remaining - 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Lead assegnato con successo'
    })

  } catch (error) {
    console.error('Errore assegnazione lead:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// Funzione helper per ottenere campi visibili per piano
function getVisibleFieldsByPlan(plan: string): string[] {
  const planFields = {
    free: ['id', 'business_name', 'city', 'category', 'score', 'needed_roles'],
    starter: ['id', 'business_name', 'website_url', 'city', 'category', 'score', 'needed_roles', 'issues'],
    pro: ['id', 'business_name', 'website_url', 'phone', 'email', 'address', 'city', 'category', 'score', 'analysis', 'needed_roles', 'issues', 'created_at']
  }
  
  return planFields[plan as keyof typeof planFields] || planFields.free
}

// Funzione helper per filtrare campi del lead
function filterLeadFields(lead: any, visibleFields: string[]): any {
  const filtered: any = {}
  
  visibleFields.forEach(field => {
    if (lead[field] !== undefined) {
      filtered[field] = lead[field]
    }
  })
  
  return filtered
}
