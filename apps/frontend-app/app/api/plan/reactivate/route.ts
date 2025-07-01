/**
 * API per riattivazione manuale del piano utente - TrovaMi
 * Usato per: Permettere agli utenti di riattivare manualmente il loro piano
 * Chiamato da: Settings page, Dashboard quando il piano è inactive
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
})

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

    // Recupera dati utente correnti con fallback creation
    let { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, plan, status, stripe_subscription_id, stripe_customer_id')
      .eq('id', user.id)
      .single()

    // Se l'utente non esiste, crealo con dati di default
    if (userError && userError.code === 'PGRST116') {
      console.log('🔧 Utente non trovato, creazione automatica...')
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email || 'unknown@example.com',
          plan: 'free',
          status: 'active',
          credits_remaining: 2,
          created_at: new Date().toISOString()
        })
        .select('id, email, plan, status, stripe_subscription_id, stripe_customer_id')
        .single()

      if (createError) {
        console.error('❌ Errore creazione utente:', createError)
        return NextResponse.json({ 
          error: 'Errore durante la creazione del profilo utente' 
        }, { status: 500 })
      }

      userData = newUser
      console.log('✅ Utente creato automaticamente:', userData)
    }

    if (userError && userError.code !== 'PGRST116') {
      console.error('❌ Errore database:', userError)
      return NextResponse.json({ error: 'Errore del database' }, { status: 500 })
    }

    if (!userData) {
      return NextResponse.json({ error: 'Impossibile recuperare i dati utente' }, { status: 500 })
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
