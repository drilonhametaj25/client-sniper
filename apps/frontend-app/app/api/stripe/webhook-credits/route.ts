/**
 * Webhook Stripe per gestire la ricarica crediti automatica
 * Usato per: Ricaricare crediti quando si rinnova l'abbonamento Stripe
 * Chiamato da: Stripe quando avvengono eventi di fatturazione
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handleSuccessfulPayment(event.data.object as Stripe.Invoice)
        break
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler failed:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleSuccessfulPayment(invoice: Stripe.Invoice) {
  console.log('💰 Pagamento riuscito per:', invoice.customer)
  
  if (!invoice.subscription) return
  
  // Ottieni i dettagli della subscription
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
  
  // Trova l'utente nel database tramite customer ID
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, plan')
    .eq('stripe_customer_id', invoice.customer)
    .single()
  
  if (userError || !user) {
    console.error('Utente non trovato per customer:', invoice.customer)
    return
  }
  
  // Ricarica i crediti dell'utente
  const { error } = await supabase.rpc('recharge_user_credits_stripe', {
    user_id: user.id,
    stripe_subscription_id: subscription.id,
    stripe_current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
  })
  
  if (error) {
    console.error('Errore ricarica crediti:', error)
  } else {
    console.log('✅ Crediti ricaricati per utente:', user.id)
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('🆕 Nuova subscription creata:', subscription.id)
  await updateUserSubscriptionInfo(subscription)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 Subscription aggiornata:', subscription.id)
  await updateUserSubscriptionInfo(subscription)
}

async function updateUserSubscriptionInfo(subscription: Stripe.Subscription) {
  // Aggiorna le informazioni di subscription dell'utente
  const { error } = await supabase
    .from('users')
    .update({
      stripe_subscription_id: subscription.id,
      stripe_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      credits_reset_date: new Date(subscription.current_period_end * 1000).toISOString().split('T')[0]
    })
    .eq('stripe_customer_id', subscription.customer)
  
  if (error) {
    console.error('Errore aggiornamento subscription info:', error)
  } else {
    console.log('✅ Info subscription aggiornate per customer:', subscription.customer)
  }
}
