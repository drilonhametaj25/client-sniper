// API Route per gestire i webhook di Stripe
// Riceve notifiche da Stripe sui pagamenti completati e aggiorna il database
// Essenziale per sincronizzare lo stato dei pagamenti con Supabase

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Errore durante la gestione del webhook:', error)
    return NextResponse.json(
      { error: 'Errore durante la gestione del webhook' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  let userId = session.client_reference_id
  const userEmail = session.metadata?.user_email
  const planId = session.metadata?.plan_id
  const autoConfirm = session.metadata?.auto_confirm === 'true'

  if ((!userId || userId.startsWith('temp_')) && !userEmail) {
    console.error('Missing user_id/email or plan_id in session metadata')
    return
  }

  // Se auto_confirm è true, trova l'utente tramite email e confermalo
  if (autoConfirm && userEmail) {
    try {
      // Usa service role per trovare e confermare l'utente
      const supabaseServiceRole = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      // Trova l'utente tramite email nell'auth
      const { data: authUsers } = await supabaseServiceRole.auth.admin.listUsers()
      const foundUser = authUsers.users.find((u: any) => u.email === userEmail)
      
      if (foundUser) {
        // Conferma l'email dell'utente
        const { error: confirmError } = await supabaseServiceRole.auth.admin.updateUserById(
          foundUser.id,
          { email_confirm: true }
        )
        
        if (confirmError) {
          console.error('Errore durante la conferma email:', confirmError)
        } else {
          console.log(`Email confermata automaticamente per utente ${foundUser.id}`)
        }
        
        // Usa l'ID reale dell'utente
        userId = foundUser.id
      } else {
        console.error(`Utente con email ${userEmail} non trovato`)
        return
      }
    } catch (error) {
      console.error('Errore durante l\'auto-conferma:', error)
      return
    }
  }

  if (!userId || !planId) {
    console.error('Missing user_id or plan_id after processing')
    return
  }

  // Map plan ID to credits and plan name
  const planCredits = {
    starter: 50,
    pro: 200
  }

  const credits = planCredits[planId as keyof typeof planCredits] || 0

  // Aggiorna l'utente con il nuovo piano
  const { error } = await supabase
    .from('users')
    .update({
      plan: planId,
      credits_remaining: credits,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
    })
    .eq('id', userId)

  if (error) {
    console.error('Errore durante l\'aggiornamento del piano utente:', error)
  } else {
    console.log(`Piano ${planId} attivato per utente ${userId}`)
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  
  if (!subscriptionId) return

  // Ottieni la subscription per i metadati
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const userId = subscription.metadata?.user_id
  const planId = subscription.metadata?.plan_id

  if (!userId || !planId) return

  // Rinnova i crediti
  const planCredits = {
    starter: 50,
    pro: 200
  }

  const credits = planCredits[planId as keyof typeof planCredits] || 0

  const { error } = await supabase
    .from('users')
    .update({
      credits_remaining: credits,
    })
    .eq('id', userId)

  if (error) {
    console.error('Errore durante il rinnovo dei crediti:', error)
  } else {
    console.log(`Crediti rinnovati per utente ${userId}: ${credits}`)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id

  if (!userId) return

  // Downgrade a piano gratuito
  const { error } = await supabase
    .from('users')
    .update({
      plan: 'free',
      credits_remaining: 2,
      stripe_customer_id: null,
      stripe_subscription_id: null,
    })
    .eq('id', userId)

  if (error) {
    console.error('Errore durante il downgrade del piano:', error)
  } else {
    console.log(`Piano downgraded a free per utente ${userId}`)
  }
}
