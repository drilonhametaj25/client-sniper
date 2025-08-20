// API endpoint per gestire i dati dell'utente nella pagina Settings
// Gestisce creazione automatica utente e recupero dati con service role
// Usato da: /settings page per caricare/aggiornare dati utente

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    // Verifica autenticazione
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token di autorizzazione mancante' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verifica il JWT usando service role
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Errore autenticazione:', authError)
      return NextResponse.json(
        { success: false, error: 'Token non valido o scaduto' },
        { status: 401 }
      )
    }

    // Ottieni il profilo utente con fallback creation (usa service role)
    let { data: userData, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    // Se l'utente non esiste, crealo con dati di default
    if (profileError && profileError.code === 'PGRST116') {
      console.log('🔧 Utente non trovato, creazione automatica...')
      
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          plan: 'free',
          status: 'active',
          credits_remaining: 5,
          created_at: new Date().toISOString()
        })
        .select('*')
        .single()

      if (createError) {
        console.error('Errore creazione utente:', createError)
        return NextResponse.json(
          { success: false, error: 'Errore creazione profilo utente' },
          { status: 500 }
        )
      }
      
      userData = newUser
    } else if (profileError) {
      console.error('Errore profilo utente:', profileError)
      return NextResponse.json(
        { success: false, error: 'Errore recupero profilo utente' },
        { status: 500 }
      )
    }

    // Carica logs delle operazioni piano
    const { data: planLogs, error: logsError } = await supabaseAdmin
      .from('plan_status_logs')
      .select('action, previous_status, new_status, reason, triggered_by, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      success: true,
      data: {
        user: userData,
        plan_logs: planLogs || []
      }
    })

  } catch (error) {
    console.error('Errore API user:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
