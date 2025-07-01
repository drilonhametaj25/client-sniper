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

  // 🔧 ENHANCED LOGGING: Log tutti gli eventi webhook per debug
  console.log(`\n🎯 WEBHOOK RICEVUTO:`)
  console.log(`Type: ${event.type}`)
  console.log(`ID: ${event.id}`)
  console.log(`Created: ${new Date(event.created * 1000).toISOString()}`)
  
  // Log dettagli specifici per eventi di pagamento
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    console.log(`Session ID: ${session.id}`)
    console.log(`Customer Email: ${session.customer_email || session.customer_details?.email}`)
    console.log(`Metadata:`, session.metadata)
    console.log(`Payment Status: ${session.payment_status}`)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
      
      case 'customer.subscription.created':
        console.log('🎯 PROCESSING: customer.subscription.created')
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break
        
      case 'customer.subscription.updated':
        console.log('🎯 PROCESSING: customer.subscription.updated')
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      
      case 'invoice.payment_succeeded':
        console.log('🎯 PROCESSING: invoice.payment_succeeded')
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
        
      case 'invoice.payment_failed':
        console.log('🎯 PROCESSING: invoice.payment_failed')
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
      
      case 'customer.subscription.deleted':
        console.log('🎯 PROCESSING: customer.subscription.deleted')
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      
      default:
        console.log(`⚠️ UNHANDLED EVENT: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    // ⚡ ENHANCED ERROR LOGGING: Log l'errore in modo dettagliato
    console.error('\n🚨 ERRORE WEBHOOK CRITICO:')
    console.error('Event Type:', event?.type || 'UNKNOWN')
    console.error('Event ID:', event?.id || 'UNKNOWN')
    console.error('Error Message:', error instanceof Error ? error.message : String(error))
    console.error('Error Stack:', error instanceof Error ? error.stack : 'No stack available')
    
    // Log i dettagli dell'evento per debug
    if (event?.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      console.error('Session Details:', {
        id: session.id,
        customer_email: session.customer_email || session.customer_details?.email,
        metadata: session.metadata,
        payment_status: session.payment_status
      })
    }
    
    // 🔧 FALLBACK: Prova a salvare l'errore nel database per debug
    try {
      await supabase
        .from('plan_status_logs')
        .insert({
          user_id: 'webhook-error',
          action: 'webhook_error',
          previous_status: 'unknown',
          new_status: 'error',
          reason: `Webhook failed: ${error instanceof Error ? error.message : String(error)}`,
          triggered_by: 'stripe_webhook_error',
          stripe_event_id: event?.id || 'unknown'
        })
    } catch (dbError) {
      console.error('Failed to log error to database:', dbError)
    }
    
    return NextResponse.json(
      { error: 'Errore durante la gestione del webhook' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('\n💳 PROCESSING CHECKOUT SESSION:')
  console.log(`Session ID: ${session.id}`)
  console.log(`Customer: ${session.customer}`)
  console.log(`Customer Email: ${session.customer_email || session.customer_details?.email}`)
  console.log(`Subscription: ${session.subscription}`)
  console.log(`Amount: ${session.amount_total ? session.amount_total / 100 : 'N/A'} ${session.currency}`)
  
  let userId = session.client_reference_id
  const userEmail = session.metadata?.user_email
  const planId = session.metadata?.plan_id
  const autoConfirm = session.metadata?.auto_confirm === 'true'

  console.log(`Metadata - User ID: ${userId}`)
  console.log(`Metadata - User Email: ${userEmail}`)
  console.log(`Metadata - Plan ID: ${planId}`)
  console.log(`Metadata - Auto Confirm: ${autoConfirm}`)

  if ((!userId || userId.startsWith('temp_')) && !userEmail) {
    console.error('❌ Missing user_id/email or plan_id in session metadata')
    console.log('Available metadata:', session.metadata)
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

  // Ottieni i crediti dal database invece che hardcoded
  const { data: planData, error: planError } = await supabase
    .from('plans')
    .select('max_credits')
    .eq('name', planId)
    .single()

  if (planError) {
    console.error('Errore durante la query del piano:', planError)
    return
  }

  const credits = planData?.max_credits || 0
  console.log(`Assegnando ${credits} crediti per piano ${planId} (da database)`)

  // Aggiorna l'utente con il nuovo piano
  console.log(`\n🔄 Aggiornando utente ${userId} con piano ${planId} e ${credits} crediti`)
  
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
    console.error('❌ Errore durante l\'aggiornamento del piano utente:', error)
  } else {
    console.log(`✅ Piano ${planId} attivato per utente ${userId}`)
    
    // Crea log dell'operazione
    const { error: logError } = await supabase
      .from('plan_status_logs')
      .insert({
        user_id: userId,
        action: 'activate',
        previous_status: 'free',
        new_status: 'active',
        reason: `Stripe payment completed - Session: ${session.id}`,
        triggered_by: 'stripe_webhook',
        stripe_event_id: session.id
      })
    
    if (logError) {
      console.error('❌ Errore creazione log:', logError)
    } else {
      console.log('✅ Log operazione creato')
    }
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

  // Ottieni i crediti dal database per il rinnovo
  const { data: planData, error: planError } = await supabase
    .from('plans')
    .select('max_credits')
    .eq('name', planId)
    .single()

  if (planError) {
    console.error('Errore durante la query del piano per rinnovo:', planError)
    return
  }

  const credits = planData?.max_credits || 0
  console.log(`Rinnovando ${credits} crediti per piano ${planId} (da database)`)

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

  // Ottieni i crediti del piano free dal database
  const { data: freePlanData } = await supabase
    .from('plans')
    .select('max_credits')
    .eq('name', 'free')
    .single()

  const freeCredits = freePlanData?.max_credits || 2

  // Downgrade a piano gratuito
  const { error } = await supabase
    .from('users')
    .update({
      plan: 'free',
      credits_remaining: freeCredits,
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

// 🎯 NUOVO: Gestione creazione subscription (EVENTO PRINCIPALE!)
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('\n🎯 SUBSCRIPTION CREATED:')
  console.log(`Subscription ID: ${subscription.id}`)
  console.log(`Customer ID: ${subscription.customer}`)
  console.log(`Status: ${subscription.status}`)
  console.log(`Price ID: ${subscription.items.data[0]?.price?.id}`)
  console.log(`Metadata:`, subscription.metadata)

  try {
    // Determina il piano dal price_id
    const priceId = subscription.items.data[0]?.price?.id
    
    let planName = 'free'
    if (priceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) {
      planName = 'starter'
    } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) {
      planName = 'pro'
    }

    console.log(`Piano determinato: ${planName}`)

    // Trova l'utente dal customer ID
    let userId = subscription.metadata?.user_id
    
    if (!userId) {
      // Se non c'è user_id nei metadata, prova a trovare l'utente dal customer ID
      const customer = await stripe.customers.retrieve(subscription.customer as string)
      
      if (customer && !customer.deleted && customer.email) {
        console.log(`Cercando utente per email: ${customer.email}`)
        
        const { data: user, error } = await supabase
          .from('users')
          .select('id')
          .eq('email', customer.email)
          .single()
        
        if (error || !user) {
          console.error(`❌ Utente non trovato per email: ${customer.email}`)
          return
        }
        
        userId = user.id
        console.log(`✅ Utente trovato: ${userId}`)
      } else {
        console.error('❌ Impossibile determinare l\'utente')
        return
      }
    }

    // Ottieni crediti dal database
    const { data: planData } = await supabase
      .from('plans')
      .select('max_credits')
      .eq('name', planName)
      .single()

    const credits = planData?.max_credits || 0
    console.log(`Assegnando ${credits} crediti per piano ${planName}`)

    // Aggiorna l'utente
    const { error: updateError } = await supabase
      .from('users')
      .update({
        plan: planName,
        credits_remaining: credits,
        stripe_customer_id: subscription.customer as string,
        stripe_subscription_id: subscription.id,
        status: 'active'
      })
      .eq('id', userId)

    if (updateError) {
      console.error('❌ Errore aggiornamento utente:', updateError)
    } else {
      console.log(`✅ Piano ${planName} attivato per utente ${userId}`)
      
      // Crea log
      await supabase
        .from('plan_status_logs')
        .insert({
          user_id: userId,
          action: 'subscription_created',
          previous_status: 'free',
          new_status: 'active',
          reason: `Subscription created - ${subscription.id}`,
          triggered_by: 'stripe_webhook',
          stripe_event_id: subscription.id
        })
      
      console.log('✅ Log creato')
    }

  } catch (error) {
    console.error('❌ Errore handleSubscriptionCreated:', error)
  }
}

// 🎯 NUOVO: Gestione aggiornamento subscription
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('\n🎯 SUBSCRIPTION UPDATED:')
  console.log(`Subscription ID: ${subscription.id}`)
  console.log(`Status: ${subscription.status}`)
  console.log(`Price ID: ${subscription.items.data[0]?.price?.id}`)

  try {
    // Trova l'utente dalla subscription
    const { data: user, error } = await supabase
      .from('users')
      .select('id, plan')
      .eq('stripe_subscription_id', subscription.id)
      .single()

    if (error || !user) {
      console.error('❌ Utente non trovato per subscription:', subscription.id)
      return
    }

    const userId = user.id
    console.log(`✅ Utente trovato: ${userId}`)

    // Se la subscription è cancellata o incompleta, aggiorna lo status
    let newStatus = 'active'
    if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
      newStatus = 'cancelled'
    } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
      newStatus = 'inactive'
    }

    // Aggiorna solo lo status se necessario
    if (newStatus !== 'active') {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          status: newStatus
        })
        .eq('id', userId)

      if (updateError) {
        console.error('❌ Errore aggiornamento status:', updateError)
      } else {
        console.log(`✅ Status aggiornato a ${newStatus} per utente ${userId}`)
      }
    }

  } catch (error) {
    console.error('❌ Errore handleSubscriptionUpdated:', error)
  }
}

// 🎯 NUOVO: Gestione pagamento fallito
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('\n❌ PAYMENT FAILED:')
  console.log(`Invoice ID: ${invoice.id}`)
  console.log(`Customer ID: ${invoice.customer}`)
  console.log(`Subscription ID: ${invoice.subscription}`)
  console.log(`Amount: ${invoice.amount_due / 100} ${invoice.currency}`)

  try {
    if (!invoice.subscription) {
      console.log('❌ Nessuna subscription associata')
      return
    }

    // Trova l'utente dalla subscription
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('stripe_subscription_id', invoice.subscription as string)
      .single()

    if (error || !user) {
      console.error('❌ Utente non trovato per subscription:', invoice.subscription)
      return
    }

    const userId = user.id
    console.log(`⚠️ Pagamento fallito per utente: ${userId} (${user.email})`)

    // Log del pagamento fallito
    await supabase
      .from('plan_status_logs')
      .insert({
        user_id: userId,
        action: 'payment_failed',
        previous_status: 'active',
        new_status: 'active', // Manteniamo attivo per ora, Stripe gestirà i retry
        reason: `Payment failed for invoice ${invoice.id}`,
        triggered_by: 'stripe_webhook',
        stripe_event_id: invoice.id
      })

    console.log('✅ Log pagamento fallito creato')

  } catch (error) {
    console.error('❌ Errore handleInvoicePaymentFailed:', error)
  }
}
