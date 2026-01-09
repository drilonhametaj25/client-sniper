// Webhook handler per eventi Stripe
// Gestisce pagamenti completati, abbonamenti creati/aggiornati/cancellati
// È parte del modulo apps/frontend-app
// ⚠️ Aggiornare quando si aggiungono nuovi piani o si modificano i crediti

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('Evento ricevuto:', event.type)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`Evento non gestito: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Errore webhook:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id
  const plan = session.metadata?.plan

  if (!userId || !plan) {
    console.error('Metadati mancanti nella sessione:', session.id)
    return
  }

  // Crediti per piano
  const planCredits = {
    starter: 50,
    pro: 200
  }

  const credits = planCredits[plan as keyof typeof planCredits] || 0

  // Aggiorna utente
  const { error } = await supabase
    .from('users')
    .update({
      plan: plan,
      credits_remaining: credits,
      stripe_customer_id: session.customer,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (error) {
    console.error('Errore aggiornamento utente:', error)
    return
  }

  console.log(`Piano ${plan} attivato per utente ${userId}`)
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id
  const plan = subscription.metadata?.plan

  if (userId && plan) {
    await supabase
      .from('users')
      .update({
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status
      })
      .eq('id', userId)

    console.log(`Abbonamento ${plan} creato per utente ${userId}`)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id

  if (userId) {
    await supabase
      .from('users')
      .update({
        subscription_status: subscription.status
      })
      .eq('id', userId)

    console.log(`Abbonamento aggiornato per utente ${userId}, status: ${subscription.status}`)
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Rinnovo mensile - aggiungi crediti
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    const userId = subscription.metadata?.user_id
    const plan = subscription.metadata?.plan

    if (userId && plan) {
      const planCredits = {
        starter: 50,
        pro: 200
      }

      const credits = planCredits[plan as keyof typeof planCredits] || 0

      await supabase
        .from('users')
        .update({
          credits_remaining: credits
        })
        .eq('id', userId)

      console.log(`Crediti rinnovati per utente ${userId}: ${credits}`)
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    const userId = subscription.metadata?.user_id

    if (userId) {
      // Opzionale: sospendi l'account o invia notifica
      console.log(`Pagamento fallito per utente ${userId}`)
    }
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id

  if (userId) {
    await supabase
      .from('users')
      .update({
        plan: 'free',
        credits_remaining: 5,
        subscription_status: 'canceled',
        stripe_subscription_id: null
      })
      .eq('id', userId)

    console.log(`Abbonamento cancellato per utente ${userId}`)
  }
}