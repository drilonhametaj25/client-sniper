// API endpoint per aggiornare le preferenze del tema utente
// Utilizzato dal ThemeContext per salvare la scelta tema nel profilo database
// Auth unificata (Bearer o sessione cookie) via lib/api/auth
//
// NB: la vecchia implementazione usava getSession() (cookie decodificato senza
// verifica) e la RPC update_user_theme_preference, che deriva l'utente da
// auth.uid() e quindi non è chiamabile dal client service-role. Qui l'utente
// è già verificato dall'helper, quindi facciamo l'update esplicito e scoped:
// stesso effetto della RPC (validazione tema + UPDATE su id = utente corrente),
// ma funziona anche per i chiamanti con Bearer token.

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/auth'

const VALID_THEMES = ['light', 'dark', 'system'] as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { theme } = body

    // Validazione tema
    if (!theme || !VALID_THEMES.includes(theme)) {
      return NextResponse.json(
        { error: 'Tema non valido. Usa: light, dark, system' },
        { status: 400 }
      )
    }

    const auth = await requireUser(request)
    if (auth.errorResponse) {
      return NextResponse.json(
        { error: 'Devi essere loggato per salvare le preferenze tema' },
        { status: 401 }
      )
    }
    const { user, admin } = auth

    const { error } = await admin
      .from('users')
      .update({ preferred_theme: theme })
      .eq('id', user.id)

    if (error) {
      console.error('Errore aggiornamento tema:', error)
      return NextResponse.json(
        { error: 'Errore nel salvare la preferenza tema' },
        { status: 500 }
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
    const auth = await requireUser(request)
    if (auth.errorResponse) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }
    const { user, admin } = auth

    // Ottieni preferenza tema corrente (query scoped sull'utente autenticato)
    const { data, error } = await admin
      .from('users')
      .select('preferred_theme')
      .eq('id', user.id)
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
