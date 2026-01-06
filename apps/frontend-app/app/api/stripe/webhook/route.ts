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

// 🔧 UTILITY FUNCTIONS: Funzioni di supporto per la ricerca utenti

/**
 * Trova un utente con fallback multipli
 * 1. Cerca per stripe_subscription_id
 * 2. Cerca per stripe_customer_id  
 * 3. Cerca per email
 */
async function findUserWithFallback(
  subscriptionId?: string, 
  customerId?: string, 
  email?: string
): Promise<string | null> {
  console.log(`🔍 Finding user - subscription: ${subscriptionId}, customer: ${customerId}, email: ${email}`)
  
  // Metodo 1: Cerca per subscription_id
  if (subscriptionId) {
    const { data: userBySubscription } = await supabase
      .from('users')
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .single()
    
    if (userBySubscription) {
      console.log(`✅ Found user by subscription: ${userBySubscription.id}`)
      return userBySubscription.id
    }
  }
  
  // Metodo 2: Cerca per customer_id
  if (customerId) {
    const { data: userByCustomer } = await supabase
      .from('users')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()
    
    if (userByCustomer) {
      console.log(`✅ Found user by customer: ${userByCustomer.id}`)
      return userByCustomer.id
    }
  }
  
  // Metodo 3: Cerca per email
  if (email) {
    const { data: userByEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()
    
    if (userByEmail) {
      console.log(`✅ Found user by email: ${userByEmail.id}`)
      return userByEmail.id
    }
  }
  
  console.log(`❌ User not found with any method`)
  return null
}

/**
 * Aggiorna i dati Stripe di un utente se mancanti
 */
async function updateUserStripeData(userId: string, customerId?: string, subscriptionId?: string) {
  const updates: any = {}
  if (customerId) updates.stripe_customer_id = customerId
  if (subscriptionId) updates.stripe_subscription_id = subscriptionId
  
  if (Object.keys(updates).length > 0) {
    console.log(`🔧 Updating user ${userId} with Stripe data:`, updates)
    await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
  }
}

/**
 * Salva evento webhook per debug e retry
 */
async function saveWebhookEvent(event: Stripe.Event, processed: boolean = false, error?: string) {
  try {
    await supabase
      .from('stripe_webhook_events')
      .insert({
        stripe_event_id: event.id,
        type: event.type,
        data: event.data.object,
        processed,
        error,
        retry_count: error ? 1 : 0
      })
  } catch (saveError) {
    console.error('Failed to save webhook event:', saveError)
  }
}

/**
 * Marca evento webhook come processato
 */
async function markEventProcessed(eventId: string, success: boolean, error?: string) {
  try {
    await supabase
      .from('stripe_webhook_events')
      .update({ 
        processed: success, 
        processed_at: new Date().toISOString(),
        error: success ? null : error
      })
      .eq('stripe_event_id', eventId)
  } catch (updateError) {
    console.error('Failed to mark event as processed:', updateError)
  }
}

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

  // 🔒 IDEMPOTENCY CHECK: Verifica se l'evento è già stato processato
  const { data: existingEvent } = await supabase
    .from('stripe_webhook_events')
    .select('processed, processed_at')
    .eq('stripe_event_id', event.id)
    .single()

  if (existingEvent?.processed) {
    console.log(`⏭️ Event ${event.id} already processed at ${existingEvent.processed_at}, skipping`)
    return NextResponse.json({ received: true, skipped: 'already_processed' })
  }

  // 💾 SAVE EVENT: Salva l'evento per debug e retry (se non esiste già)
  if (!existingEvent) {
    await saveWebhookEvent(event)
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

    // ✅ MARK AS PROCESSED: Marca l'evento come processato con successo
    await markEventProcessed(event.id, true)

    return NextResponse.json({ received: true })
  } catch (error) {
    // ⚡ ENHANCED ERROR LOGGING: Log l'errore in modo dettagliato
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : 'No stack available'
    
    console.error('\n🚨 ERRORE WEBHOOK CRITICO:')
    console.error('Event Type:', event?.type || 'UNKNOWN')
    console.error('Event ID:', event?.id || 'UNKNOWN')
    console.error('Error Message:', errorMessage)
    console.error('Error Stack:', errorStack)
    
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
    
    // 💾 MARK AS FAILED: Marca l'evento come fallito con dettagli errore
    await markEventProcessed(event.id, false, errorMessage)
    
    // 🔧 FALLBACK: Prova a salvare l'errore nei log di piano per debug
    try {
      await supabase
        .from('plan_status_logs')
        .insert({
          user_id: 'webhook-error',
          action: 'webhook_error',
          previous_status: 'unknown',
          new_status: 'error',
          reason: `Webhook failed: ${errorMessage}`,
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

  // 🔧 ENHANCED USER RESOLUTION: Improved user finding logic
  if ((!userId || userId.startsWith('temp_') || userId.startsWith('email_')) && !userEmail) {
    console.error('❌ Missing user_id/email or plan_id in session metadata')
    console.log('Available metadata:', session.metadata)
    return
  }

  // Se auto_confirm è true, trova/crea l'utente tramite email
  if (autoConfirm && userEmail) {
    try {
      console.log(`🔍 Looking for user with email: ${userEmail}`)
      
      // Usa service role per trovare e confermare l'utente
      const supabaseServiceRole = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      // 🎯 MULTI-STEP USER RESOLUTION: 
      // 1. Prima cerca l'utente nell'auth
      const { data: authUsers, error: listError } = await supabaseServiceRole.auth.admin.listUsers()
      if (listError) {
        console.error('Error listing users:', listError)
        return
      }
      
      let foundUser = authUsers.users.find((u: any) => u.email === userEmail)
      
      if (foundUser) {
        console.log(`✅ Found existing user: ${foundUser.id}`)
        
        // Conferma l'email dell'utente se non confermata
        if (!foundUser.email_confirmed_at) {
          const { error: confirmError } = await supabaseServiceRole.auth.admin.updateUserById(
            foundUser.id,
            { email_confirm: true }
          )
          
          if (confirmError) {
            console.error('Errore durante la conferma email:', confirmError)
          } else {
            console.log(`📧 Email confermata automaticamente per utente ${foundUser.id}`)
          }
        }
        
        // Usa l'ID reale dell'utente
        userId = foundUser.id
      } else {
        // 2. Se non trovato nell'auth, cerca nella tabella users (possibile utente orfano)
        const { data: dbUser, error: dbError } = await supabase
          .from('users')
          .select('id')
          .eq('email', userEmail)
          .single()
        
        if (dbUser && !dbError) {
          console.log(`✅ Found user in database: ${dbUser.id}`)
          userId = dbUser.id
        } else {
          console.error(`❌ User not found in auth or database for email: ${userEmail}`)
          console.error('This should not happen - user should be created before payment')
          return
        }
      }
    } catch (error) {
      console.error('🚨 Errore durante la risoluzione utente:', error)
      return
    }
  }

  // 🔍 FALLBACK USER SEARCH: Se l'userId è ancora temp/email-based, prova ricerca avanzata
  if (userId && (userId.startsWith('temp_') || userId.startsWith('email_'))) {
    const fallbackUserId = await findUserWithFallback(
      session.subscription as string,
      session.customer as string,
      userEmail
    )
    
    if (fallbackUserId) {
      userId = fallbackUserId
    } else {
      console.error(`❌ Could not resolve user ID from temp/email ID: ${userId}`)
      return
    }
  }

  if (!userId || !planId) {
    console.error('❌ Missing user_id or plan_id after processing')
    return
  }

  // 🎯 UPDATE STRIPE DATA: Assicurati che i dati Stripe siano salvati
  await updateUserStripeData(userId, session.customer as string, session.subscription as string)

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

  // Recupera la subscription per ottenere current_period_end (più preciso del "primo del mese")
  let nextResetDate = new Date()
  if (session.subscription) {
    try {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
      nextResetDate = new Date(subscription.current_period_end * 1000)
      console.log(`📅 Data reset crediti da Stripe: ${nextResetDate.toISOString()}`)
    } catch (subError) {
      // Fallback: primo del mese successivo
      nextResetDate.setMonth(nextResetDate.getMonth() + 1)
      nextResetDate.setDate(1)
      console.log(`📅 Data reset crediti (fallback): ${nextResetDate.toISOString()}`)
    }
  } else {
    // Se non c'è subscription (one-time payment), usa primo del mese successivo
    nextResetDate.setMonth(nextResetDate.getMonth() + 1)
    nextResetDate.setDate(1)
  }
  nextResetDate.setHours(0, 0, 0, 0)

  // Aggiorna l'utente con il nuovo piano
  console.log(`\n🔄 Aggiornando utente ${userId} con piano ${planId} e ${credits} crediti`)
  
  const { error } = await supabase
    .from('users')
    .update({
      plan: planId,
      credits_remaining: credits,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      credits_reset_date: nextResetDate.toISOString()
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
  console.log('\n💰 PROCESSING INVOICE PAYMENT SUCCEEDED:')
  console.log(`Invoice ID: ${invoice.id}`)
  console.log(`Subscription: ${invoice.subscription}`)
  console.log(`Customer: ${invoice.customer}`)
  
  const subscriptionId = invoice.subscription as string
  const customerId = invoice.customer as string
  
  if (!subscriptionId) {
    console.log('❌ No subscription ID in invoice')
    return
  }

  // 🔍 ENHANCED USER SEARCH: Usa fallback multipli per trovare l'utente
  let userId: string | null = null
  
  try {
    // Ottieni la subscription per i metadati
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const metadataUserId = subscription.metadata?.user_id
    const planId = subscription.metadata?.plan_id
    
    console.log(`Subscription metadata - User ID: ${metadataUserId}, Plan: ${planId}`)
    
    // Ottieni email del customer da Stripe se necessario
    let customerEmail: string | undefined
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId)
        if (customer && !customer.deleted && typeof customer.email === 'string') {
          customerEmail = customer.email
        }
      } catch (customerError) {
        console.error('Error retrieving customer:', customerError)
      }
    }
    
    // Usa la funzione di fallback per trovare l'utente
    userId = await findUserWithFallback(subscriptionId, customerId, customerEmail)
    
    if (!userId) {
      console.error(`❌ Utente non trovato per subscription: ${subscriptionId}`)
      return
    }
    
    if (!planId) {
      console.error(`❌ Plan ID non trovato nei metadata della subscription: ${subscriptionId}`)
      return
    }

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
    console.log(`🔄 Rinnovando ${credits} crediti per piano ${planId} (da database)`)

    // Usa current_period_end dalla subscription Stripe per la data di reset
    // Questo è più preciso di "+30 giorni" e allineato con il ciclo di fatturazione
    const nextResetDate = new Date(subscription.current_period_end * 1000)
    nextResetDate.setHours(0, 0, 0, 0)
    console.log(`📅 Prossimo reset crediti: ${nextResetDate.toISOString()} (da Stripe current_period_end)`)

    // 🎯 AGGIORNA DATI STRIPE: Assicurati che i dati Stripe siano salvati
    await updateUserStripeData(userId, customerId, subscriptionId)

    const { error } = await supabase
      .from('users')
      .update({
        credits_remaining: credits,
        credits_reset_date: nextResetDate.toISOString()
      })
      .eq('id', userId)

    if (error) {
      console.error('❌ Errore durante il rinnovo dei crediti:', error)
    } else {
      console.log(`✅ Crediti rinnovati per utente ${userId}: ${credits}`)
      
      // 🔄 RESET SOSTITUZIONI MENSILI: Resetta le sostituzioni quando si rinnova il piano
      try {
        const { error: resetError } = await supabase
          .rpc('reset_user_replacements', { p_user_id: userId })
        
        if (resetError) {
          console.error('❌ Errore reset sostituzioni:', resetError)
        } else {
          console.log('✅ Sostituzioni mensili resettate per utente:', userId)
        }
      } catch (resetError) {
        console.error('🚨 Errore critico reset sostituzioni:', resetError)
      }
      
      // Crea log dell'operazione
      const { error: logError } = await supabase
        .from('plan_status_logs')
        .insert({
          user_id: userId,
          action: 'renew_credits',
          previous_status: 'active',
          new_status: 'active',
          reason: `Stripe subscription renewed - Invoice: ${invoice.id} - Credits and replacements reset`,
          triggered_by: 'stripe_webhook',
          stripe_event_id: invoice.id
        })
      
      if (logError) {
        console.error('❌ Errore creazione log rinnovo:', logError)
      } else {
        console.log('✅ Log rinnovo creato')
      }
    }
  } catch (error) {
    console.error('🚨 Errore durante il rinnovo crediti:', error)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('\n🔴 SUBSCRIPTION DELETED:')
  console.log(`Subscription ID: ${subscription.id}`)
  console.log(`Customer: ${subscription.customer}`)
  console.log(`Metadata:`, subscription.metadata)

  // Trova l'utente con fallback multipli
  let userId = subscription.metadata?.user_id
  const customerId = subscription.customer as string

  if (!userId) {
    // Prova a trovare l'utente dal customer_id o subscription_id
    userId = await findUserWithFallback(subscription.id, customerId)
  }

  if (!userId) {
    console.error('❌ Utente non trovato per subscription cancellata:', subscription.id)
    return
  }

  // Ottieni lo stato corrente dell'utente per il log
  const { data: currentUser } = await supabase
    .from('users')
    .select('plan, status')
    .eq('id', userId)
    .single()

  const previousPlan = currentUser?.plan || 'unknown'
  const previousStatus = currentUser?.status || 'unknown'

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
      status: 'cancelled',
      stripe_customer_id: null,
      stripe_subscription_id: null,
      deactivated_at: new Date().toISOString(),
      deactivation_reason: 'Subscription cancelled via Stripe'
    })
    .eq('id', userId)

  if (error) {
    console.error('❌ Errore durante il downgrade del piano:', error)
  } else {
    console.log(`✅ Piano downgraded a free per utente ${userId}`)

    // Log dell'operazione di cancellazione
    const { error: logError } = await supabase
      .from('plan_status_logs')
      .insert({
        user_id: userId,
        action: 'subscription_cancelled',
        previous_status: previousStatus,
        new_status: 'cancelled',
        reason: `Stripe subscription deleted - Previous plan: ${previousPlan} - Subscription: ${subscription.id}`,
        triggered_by: 'stripe_webhook',
        stripe_event_id: subscription.id
      })

    if (logError) {
      console.error('❌ Errore creazione log cancellazione:', logError)
    } else {
      console.log('✅ Log cancellazione creato')
    }
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
    // Ottieni il piano direttamente dal database usando il price_id
    const priceId = subscription.items.data[0]?.price?.id
    console.log(`Cercando piano per Price ID: ${priceId}`)
    
    // Cerca il piano nel database usando il price_id
    const { data: planData, error: planError } = await supabase
      .from('plans')
      .select('name, max_credits')
      .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_annual.eq.${priceId}`)
      .single()

    if (planError || !planData) {
      console.error(`❌ Piano non trovato per Price ID: ${priceId}`)
      return
    }

    const planName = planData.name
    const credits = planData.max_credits || 0
    console.log(`Piano determinato dal database: ${planName} (${credits} crediti)`)

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

// 🎯 ENHANCED: Gestione pagamento fallito con ricerca fallback
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

    const subscriptionId = invoice.subscription as string
    const customerId = invoice.customer as string
    
    // 🔍 ENHANCED USER SEARCH: Usa fallback multipli per trovare l'utente
    let customerEmail: string | undefined
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId)
        if (customer && !customer.deleted && typeof customer.email === 'string') {
          customerEmail = customer.email
        }
      } catch (customerError) {
        console.error('Error retrieving customer for failed payment:', customerError)
      }
    }
    
    // Usa la funzione di fallback per trovare l'utente
    const userId = await findUserWithFallback(subscriptionId, customerId, customerEmail)
    
    if (!userId) {
      console.error(`❌ Utente non trovato per subscription: ${subscriptionId}`)
      return
    }

    // Ottieni i dettagli dell'utente
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('❌ Errore nel recupero dettagli utente:', userError)
      return
    }

    console.log(`⚠️ Pagamento fallito per utente: ${userId} (${user.email})`)

    // 🎯 AGGIORNA DATI STRIPE: Assicurati che i dati Stripe siano salvati
    await updateUserStripeData(userId, customerId, subscriptionId)

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
    console.error('🚨 Errore handleInvoicePaymentFailed:', error)
  }
}
