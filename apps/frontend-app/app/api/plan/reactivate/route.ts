/**
 * API per riattivazione manuale del piano utente - TrovaMi
 * Usato per: Permettere agli utenti di riattivare manualmente il loro piano
 * Chiamato da: Settings page, Dashboard quando il piano è inactive
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
})

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Recupera dati utente correnti
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, plan, status, stripe_subscription_id, stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    // Verifica che il piano sia effettivamente disattivato
    if (userData.status === 'active') {
      return NextResponse.json({ 
        error: 'Il piano è già attivo',
        current_status: userData.status 
      }, { status: 400 })
    }

    if (userData.plan === 'free') {
      return NextResponse.json({ 
        error: 'Il piano gratuito è sempre attivo' 
      }, { status: 400 })
    }

    // Verifica se c'è un abbonamento Stripe attivo
    let stripeSubscriptionActive = false
    if (userData.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(userData.stripe_subscription_id)
        stripeSubscriptionActive = subscription.status === 'active'
      } catch (stripeError) {
        console.error('⚠️ Errore verifica abbonamento Stripe:', stripeError)
        // Continuiamo anche se Stripe non risponde
      }
    }

    // Se non c'è un abbonamento attivo, indirizziamo al checkout
    if (!stripeSubscriptionActive) {
      return NextResponse.json({ 
        error: 'Nessun abbonamento attivo trovato. Effettua un nuovo pagamento per riattivare il piano.',
        action_required: 'checkout',
        checkout_url: `/upgrade?plan=${userData.plan}&reactivate=true`
      }, { status: 402 }) // 402 Payment Required
    }

    // Riattiva il piano
    const { error: updateError } = await supabase
      .from('users')
      .update({
        status: 'active',
        reactivated_at: new Date().toISOString(),
        deactivation_reason: null, // Reset del motivo di disattivazione
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ Errore riattivazione piano:', updateError)
      return NextResponse.json({ 
        error: 'Errore durante la riattivazione del piano' 
      }, { status: 500 })
    }

    // Log dell'operazione
    const { error: logError } = await supabase
      .from('plan_status_logs')
      .insert({
        user_id: user.id,
        action: 'activate',
        previous_status: 'inactive',
        new_status: 'active',
        reason: 'Riattivazione manuale richiesta dall\'utente',
        triggered_by: 'user'
      })

    if (logError) {
      console.error('⚠️ Errore logging operazione:', logError)
    }

    console.log(`✅ Piano riattivato manualmente per utente: ${userData.email}`)

    return NextResponse.json({
      success: true,
      message: 'Piano riattivato con successo!',
      status: 'active',
      reactivated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Errore riattivazione piano:', error)
    return NextResponse.json({ 
      error: 'Errore interno del server' 
    }, { status: 500 })
  }
}
