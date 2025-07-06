// API endpoint per aggiornare le preferenze del tema utente
// Utilizzato dal ThemeContext per salvare la scelta tema nel profilo database
// Richiede autenticazione utente e valida i temi supportati

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { theme } = body

    // Validazione tema
    if (!theme || !['light', 'dark', 'system'].includes(theme)) {
      return NextResponse.json(
        { error: 'Tema non valido. Usa: light, dark, system' },
        { status: 400 }
      )
    }

    // Crea client Supabase con autenticazione
    const supabase = createRouteHandlerClient({ cookies })

    // Verifica utente autenticato
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Devi essere loggato per salvare le preferenze tema' },
        { status: 401 }
      )
    }

    // Chiama la funzione RPC per aggiornare tema
    const { data, error } = await supabase.rpc('update_user_theme_preference', {
      new_theme: theme
    })

    if (error) {
      console.error('Errore RPC update_user_theme_preference:', error)
      return NextResponse.json(
        { error: 'Errore nel salvare la preferenza tema' },
        { status: 500 }
      )
    }

    if (!data || !data.success) {
      return NextResponse.json(
        { error: data?.error || 'Errore nel salvare la preferenza tema' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Preferenza tema aggiornata con successo',
      theme: theme
    })

  } catch (error) {
    console.error('Errore API tema:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Crea client Supabase con autenticazione
    const supabase = createRouteHandlerClient({ cookies })

    // Verifica utente autenticato
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      )
    }

    // Ottieni preferenza tema corrente
    const { data, error } = await supabase
      .from('users')
      .select('preferred_theme')
      .eq('id', session.user.id)
      .single()

    if (error) {
      console.error('Errore nel recuperare tema utente:', error)
      return NextResponse.json(
        { error: 'Errore nel recuperare le preferenze tema' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      theme: data?.preferred_theme || 'system'
    })

  } catch (error) {
    console.error('Errore API tema GET:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
