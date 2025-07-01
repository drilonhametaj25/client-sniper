/**
 * API per disattivazione del piano utente - TrovaMi
 * LOGICA CORRETTA: Cancella l'abbonamento Stripe con cancel_at_period_end
 * ma mantiene l'accesso fino alla fine del periodo pagato
 * Usato per: Permettere cancellazione senza perdita immediata di servizio
 * Chiamato da: Settings page
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
})

interface DeactivateRequest {
  reason?: string
}

export async function POST(req: NextRequest) {
  try {
    let user = null

    // ESATTA STESSA LOGICA DI /api/stripe/create-checkout CHE FUNZIONA
    // Prima prova con il cookie (Next.js route handler)
    const supabase = createRouteHandlerClient({ cookies })
    
    let sessionResult = await supabase.auth.getSession()

    // Se la sessione del cookie non è valida, prova con l'header Authorization
    if (sessionResult.error || !sessionResult.data.session?.user) {
      const authHeader = req.headers.get('authorization')
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        
        // Crea un client temporaneo con il token
        const supabaseWithToken = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        
        // Imposta la sessione con il token
        const { data: { user: tokenUser }, error: tokenError } = await supabaseWithToken.auth.getUser(token)
        
        if (tokenError || !tokenUser) {
          return NextResponse.json(
            { error: 'Token di autorizzazione non valido' },
            { status: 401 }
          )
        }
        
        user = tokenUser
      } else {
        return NextResponse.json(
          { error: 'Sessione non valida e nessun token di autorizzazione fornito' },
          { status: 401 }
        )
      }
    } else {
      user = sessionResult.data.session.user
    }

    console.log('🔍 Autenticazione riuscita per utente:', user.id)
    console.log('🔍 Email utente:', user.email)

    // Usa il service role per TUTTE le operazioni DB (come in /api/leads)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Parse del body
    const body: DeactivateRequest = await req.json()
    const { reason } = body

    // Recupera dati utente correnti usando service role
    let { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, plan, status, stripe_subscription_id')
      .eq('id', user.id)
      .single()

    console.log('🔍 Query utente con service role - Error:', userError)
    console.log('🔍 Query utente con service role - Error code:', userError?.code)
    console.log('🔍 Query utente con service role - Data:', userData)

    // Se l'utente non esiste, crealo con dati di default
    if (userError && userError.code === 'PGRST116') {
      console.log('🔧 Utente non trovato, creazione automatica...')
      
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          id: user.id,
          email: user.email || 'unknown@example.com',
          plan: 'free',
          status: 'active',
          credits_remaining: 2,
          created_at: new Date().toISOString()
        })
        .select('id, email, plan, status, stripe_subscription_id')
        .single()

      if (createError) {
        console.error('❌ Errore creazione utente:', createError)
        return NextResponse.json({ 
          error: 'Errore durante la creazione del profilo utente: ' + createError.message 
        }, { status: 500 })
      }

      userData = newUser
      console.log('✅ Utente creato automaticamente:', userData)
    }

    // Se c'è un errore diverso o userData è null, interrompi
    if (userError && userError.code !== 'PGRST116') {
      console.error('❌ Errore database diverso da PGRST116:', userError)
      return NextResponse.json({ 
        error: 'Errore del database: ' + userError.message 
      }, { status: 500 })
    }

    if (userError || !userData) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    // Verifica che l'utente abbia un piano attivo
    if (userData.status !== 'active') {
      return NextResponse.json({ 
        error: 'Il piano è già disattivato',
        current_status: userData.status 
      }, { status: 400 })
    }

    if (userData.plan === 'free') {
      return NextResponse.json({ 
        error: 'Non puoi disattivare il piano gratuito' 
      }, { status: 400 })
    }

    // **STEP 1: Cancella l'abbonamento su Stripe con cancel_at_period_end**
    if (userData.stripe_subscription_id) {
      try {
        console.log(`🔄 Cancellando abbonamento Stripe: ${userData.stripe_subscription_id}`)
        
        const subscription = await stripe.subscriptions.update(
          userData.stripe_subscription_id,
          {
            cancel_at_period_end: true, // Mantiene attivo fino alla fine del periodo
            metadata: {
              cancelled_by: 'user',
              cancelled_at: new Date().toISOString(),
              cancellation_reason: reason || 'user_request'
            }
          }
        )

        console.log(`✅ Abbonamento Stripe cancellato. Attivo fino al: ${new Date(subscription.current_period_end * 1000).toISOString()}`)
        
        // **STEP 2: Aggiorna il database - MA mantiene status 'active' fino alla scadenza**
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            // NON cambiamo status a 'inactive' subito!
            // Stripe webhook lo farà quando l'abbonamento scade davvero
            deactivation_reason: reason || 'Cancellazione richiesta dall\'utente',
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (updateError) {
          console.error('❌ Errore aggiornamento database:', updateError)
          return NextResponse.json({ 
            error: 'Errore durante l\'aggiornamento del piano' 
          }, { status: 500 })
        }

        // **STEP 3: Log dell'operazione**
        const { error: logError } = await supabaseAdmin
          .from('plan_status_logs')
          .insert({
            user_id: user.id,
            action: 'schedule_cancellation',
            previous_status: 'active',
            new_status: 'active_until_period_end',
            reason: reason || 'Cancellazione programmata dall\'utente',
            triggered_by: 'user',
            stripe_event_id: subscription.id
          })

        if (logError) {
          console.error('⚠️ Errore logging operazione:', logError)
        }

        console.log(`✅ Piano disattivazione programmata per utente: ${userData.email}`)

        return NextResponse.json({
          success: true,
          message: `Piano cancellato. Continuerai ad avere accesso fino al ${new Date(subscription.current_period_end * 1000).toLocaleDateString('it-IT')}.`,
          status: 'active', // Rimane attivo!
          cancellation_scheduled: true,
          access_until: new Date(subscription.current_period_end * 1000).toISOString()
        })

      } catch (stripeError: any) {
        console.error('❌ Errore Stripe:', stripeError)
        return NextResponse.json({ 
          error: `Errore nella cancellazione dell'abbonamento: ${stripeError.message}` 
        }, { status: 500 })
      }
    } else {
      // Nessun abbonamento Stripe, disattiva direttamente
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          status: 'inactive',
          plan: 'free',
          credits_remaining: 2,
          deactivated_at: new Date().toISOString(),
          deactivation_reason: reason || 'Nessun abbonamento attivo',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('❌ Errore aggiornamento stato utente:', updateError)
        return NextResponse.json({ 
          error: 'Errore durante la disattivazione del piano' 
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Piano disattivato immediatamente (nessun abbonamento Stripe attivo).',
        status: 'inactive'
      })
    }

  } catch (error) {
    console.error('❌ Errore disattivazione piano:', error)
    return NextResponse.json({ 
      error: 'Errore interno del server' 
    }, { status: 500 })
  }
}

// GET per verificare lo stato attuale del piano
export async function GET(req: NextRequest) {
  try {
    let user = null

    // ESATTA STESSA LOGICA DI /api/stripe/create-checkout CHE FUNZIONA
    // Prima prova con il cookie (Next.js route handler)
    const supabase = createRouteHandlerClient({ cookies })
    
    let sessionResult = await supabase.auth.getSession()

    // Se la sessione del cookie non è valida, prova con l'header Authorization
    if (sessionResult.error || !sessionResult.data.session?.user) {
      const authHeader = req.headers.get('authorization')
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        
        // Crea un client temporaneo con il token
        const supabaseWithToken = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        
        // Imposta la sessione con il token
        const { data: { user: tokenUser }, error: tokenError } = await supabaseWithToken.auth.getUser(token)
        
        if (tokenError || !tokenUser) {
          return NextResponse.json(
            { error: 'Token di autorizzazione non valido' },
            { status: 401 }
          )
        }
        
        user = tokenUser
      } else {
        return NextResponse.json(
          { error: 'Sessione non valida e nessun token di autorizzazione fornito' },
          { status: 401 }
        )
      }
    } else {
      user = sessionResult.data.session.user
    }

    console.log('🔍 Autenticazione GET riuscita per utente:', user.id)

    // Usa il service role per TUTTE le operazioni DB (come in /api/leads)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Recupera stato piano con fallback creation
    let { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, plan, status, deactivated_at, deactivation_reason, reactivated_at')
      .eq('id', user.id)
      .single()

    // Se l'utente non esiste, crealo con dati di default
    if (userError && userError.code === 'PGRST116') {
      console.log('🔧 Utente non trovato, creazione automatica...')
      
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          id: user.id,
          email: user.email || 'unknown@example.com',
          plan: 'free',
          status: 'active',
          credits_remaining: 2,
          created_at: new Date().toISOString()
        })
        .select('id, plan, status, deactivated_at, deactivation_reason, reactivated_at')
        .single()

      if (createError) {
        console.error('❌ Errore creazione utente:', createError)
        return NextResponse.json({ 
          error: 'Errore durante la creazione del profilo utente' 
        }, { status: 500 })
      }

      userData = newUser
      console.log('✅ Utente creato automaticamente per GET:', userData)
    }

    if (userError && userError.code !== 'PGRST116') {
      console.error('❌ Errore database:', userError)
      return NextResponse.json({ error: 'Errore del database' }, { status: 500 })
    }

    if (!userData) {
      return NextResponse.json({ error: 'Impossibile recuperare i dati utente' }, { status: 500 })
    }

    // Recupera ultimi 5 log
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('plan_status_logs')
      .select('action, previous_status, new_status, reason, triggered_by, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      plan: userData.plan,
      status: userData.status,
      deactivated_at: userData.deactivated_at,
      deactivation_reason: userData.deactivation_reason,
      reactivated_at: userData.reactivated_at,
      recent_logs: logs || []
    })

  } catch (error) {
    console.error('❌ Errore recupero stato piano:', error)
    return NextResponse.json({ 
      error: 'Errore interno del server' 
    }, { status: 500 })
  }
}
