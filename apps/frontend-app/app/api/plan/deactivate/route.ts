/**
 * API per disattivazione del piano utente - TrovaMi
 * LOGICA CORRETTA: Cancella l'abbonamento Stripe con cancel_at_period_end
 * ma mantiene l'accesso fino alla fine del periodo pagato
 * Usato per: Permettere cancellazione senza perdita immediata di servizio
 * Chiamato da: Settings page
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
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
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verifica autenticazione con più dettagli per debug
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('🔍 Debug autenticazione:')
    console.log('- User:', user?.id || 'null')
    console.log('- Auth Error:', authError?.message || 'none')
    
    if (authError) {
      console.error('❌ Errore autenticazione Supabase:', authError)
      return NextResponse.json({ 
        error: 'Errore di autenticazione: ' + authError.message 
      }, { status: 401 })
    }
    
    if (!user) {
      console.error('❌ Nessun utente autenticato')
      return NextResponse.json({ error: 'Non autorizzato - nessun utente' }, { status: 401 })
    }

    // Parse del body
    const body: DeactivateRequest = await req.json()
    const { reason } = body

    // Recupera dati utente correnti
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, plan, status, stripe_subscription_id')
      .eq('id', user.id)
      .single()

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
        const { error: updateError } = await supabase
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
        const { error: logError } = await supabase
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
      const { error: updateError } = await supabase
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
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('🔍 Debug autenticazione GET:')
    console.log('- User:', user?.id || 'null')
    console.log('- Auth Error:', authError?.message || 'none')
    
    if (authError) {
      console.error('❌ Errore autenticazione Supabase:', authError)
      return NextResponse.json({ 
        error: 'Errore di autenticazione: ' + authError.message 
      }, { status: 401 })
    }
    
    if (!user) {
      console.error('❌ Nessun utente autenticato')
      return NextResponse.json({ error: 'Non autorizzato - nessun utente' }, { status: 401 })
    }

    // Recupera stato piano
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, plan, status, deactivated_at, deactivation_reason, reactivated_at')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    // Recupera ultimi 5 log
    const { data: logs, error: logsError } = await supabase
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
