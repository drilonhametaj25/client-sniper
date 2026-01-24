/**
 * API endpoint per gestione servizi digitali con prezzi - ClientSniper
 * Usato per: Mostrare agli utenti PRO i servizi che possono offrire ai lead
 * Chiamato da: Componente dettaglio lead, gestione servizi admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth-middleware'
import { createClient } from '@supabase/supabase-js'
import { isProOrHigher } from '@/lib/utils/plan-helpers'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Usa l'auth-middleware del progetto
    const { user, dbClient, error: authError } = await authenticateUser(request)
    
    if (!user || !dbClient) {
      return NextResponse.json(
        { error: authError || 'Autorizzazione mancante' },
        { status: 401 }
      )
    }

    // Catalogo servizi visibile a tutti gli utenti autenticati
    // Utile come strumento di marketing per mostrare cosa si può offrire ai lead

    // Parametri di filtro
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const isRecurring = searchParams.get('isRecurring')
    const isPopular = searchParams.get('isPopular')
    const isHighProfit = searchParams.get('isHighProfit')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const priceType = searchParams.get('priceType') || 'freelance' // 'freelance' o 'agency'

    // Costruisci la query
    let query = getSupabaseAdmin()
      .from('digital_services')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    // Applica filtri
    if (category) {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (isRecurring === 'true') {
      query = query.eq('is_recurring', true)
    }

    if (isPopular === 'true') {
      query = query.eq('is_popular', true)
    }

    if (isHighProfit === 'true') {
      query = query.eq('is_high_profit', true)
    }

    // Filtri per prezzo
    if (minPrice) {
      const priceColumn = priceType === 'agency' ? 'price_agency_eur' : 'price_freelance_eur'
      query = query.gte(priceColumn, parseInt(minPrice))
    }

    if (maxPrice) {
      const priceColumn = priceType === 'agency' ? 'price_agency_eur' : 'price_freelance_eur'
      query = query.lte(priceColumn, parseInt(maxPrice))
    }

    const { data: services, error } = await query

    if (error) {
      console.error('Errore recupero servizi:', error)
      return NextResponse.json(
        { error: 'Errore nel recupero dei servizi' },
        { status: 500 }
      )
    }

    // Raggruppa per categoria per una visualizzazione migliore
    const servicesByCategory = services?.reduce((acc, service) => {
      if (!acc[service.category]) {
        acc[service.category] = []
      }
      acc[service.category].push(service)
      return acc
    }, {} as Record<string, typeof services>)

    // Statistiche per il frontend
    const stats = {
      total: services?.length || 0,
      categories: Object.keys(servicesByCategory || {}).length,
      recurring: services?.filter(s => s.is_recurring).length || 0,
      popular: services?.filter(s => s.is_popular).length || 0,
      highProfit: services?.filter(s => s.is_high_profit).length || 0,
      avgPriceFreelance: services?.reduce((sum, s) => sum + s.price_freelance_eur, 0) / (services?.length || 1),
      avgPriceAgency: services?.reduce((sum, s) => sum + s.price_agency_eur, 0) / (services?.length || 1)
    }

    return NextResponse.json({
      success: true,
      data: {
        services: services || [],
        servicesByCategory: servicesByCategory || {},
        stats
      }
    })

  } catch (error) {
    console.error('Errore API servizi digitali:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, dbClient, error: authError } = await authenticateUser(request)
    
    if (!user || !dbClient) {
      return NextResponse.json(
        { error: authError || 'Autorizzazione mancante' },
        { status: 401 }
      )
    }

    // Verifica che l'utente sia admin
    const { data: userData, error: userError } = await getSupabaseAdmin()
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accesso negato. Solo gli admin possono modificare i servizi.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      price_freelance_eur,
      price_agency_eur,
      tags = [],
      category,
      complexity_level = 'medium',
      estimated_hours,
      is_recurring = false,
      is_popular = false,
      is_high_profit = false,
      sort_order = 0
    } = body

    // Validazione dati
    if (!name || !price_freelance_eur || !price_agency_eur || !category) {
      return NextResponse.json(
        { error: 'Campi obbligatori mancanti: name, price_freelance_eur, price_agency_eur, category' },
        { status: 400 }
      )
    }

    // Inserisci nuovo servizio
    const { data: newService, error: insertError } = await getSupabaseAdmin()
      .from('digital_services')
      .insert([{
        name,
        description,
        price_freelance_eur,
        price_agency_eur,
        tags,
        category,
        complexity_level,
        estimated_hours,
        is_recurring,
        is_popular,
        is_high_profit,
        sort_order
      }])
      .select()
      .single()

    if (insertError) {
      console.error('Errore inserimento servizio:', insertError)
      return NextResponse.json(
        { error: 'Errore nel salvataggio del servizio' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: newService
    })

  } catch (error) {
    console.error('Errore API POST servizi digitali:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, dbClient, error: authError } = await authenticateUser(request)
    
    if (!user || !dbClient) {
      return NextResponse.json(
        { error: authError || 'Autorizzazione mancante' },
        { status: 401 }
      )
    }

    // Verifica che l'utente sia admin
    const { data: userData, error: userError } = await getSupabaseAdmin()
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accesso negato. Solo gli admin possono modificare i servizi.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID servizio mancante' },
        { status: 400 }
      )
    }

    // Aggiorna servizio esistente
    const { data: updatedService, error: updateError } = await getSupabaseAdmin()
      .from('digital_services')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Errore aggiornamento servizio:', updateError)
      return NextResponse.json(
        { error: 'Errore nell\'aggiornamento del servizio' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedService
    })

  } catch (error) {
    console.error('Errore API PUT servizi digitali:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
