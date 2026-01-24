// 🧪 WEBHOOK TESTING ENDPOINT - Solo per Development
// Questo endpoint permette di testare i webhook handlers senza verifica firma
// DA RIMUOVERE IN PRODUZIONE!

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  // 🚨 SOLO PER DEVELOPMENT
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Test endpoint disabled in production' }, { status: 403 })
  }

  try {
    const { eventType, testData } = await request.json()

    console.log(`🧪 TESTING WEBHOOK: ${eventType}`)
    console.log('Test data:', testData)

    // Simula un evento Stripe per test
    const mockEvent = {
      id: `evt_test_${Date.now()}`,
      type: eventType,
      created: Math.floor(Date.now() / 1000),
      data: {
        object: testData
      }
    }

    // Salva l'evento di test
    await getSupabase()
      .from('stripe_webhook_events')
      .insert({
        stripe_event_id: mockEvent.id,
        type: mockEvent.type,
        data: mockEvent.data.object,
        processed: false
      })

    // Simula l'handling dell'evento
    let result = null
    switch (eventType) {
      case 'checkout.session.completed':
        result = await testCheckoutSessionCompleted(testData)
        break
      case 'invoice.payment_succeeded':
        result = await testInvoicePaymentSucceeded(testData)
        break
      default:
        result = { message: `Event type ${eventType} handler not implemented in test` }
    }

    // Marca come processato
    await getSupabase()
      .from('stripe_webhook_events')
      .update({ 
        processed: true, 
        processed_at: new Date().toISOString() 
      })
      .eq('stripe_event_id', mockEvent.id)

    return NextResponse.json({
      success: true,
      eventId: mockEvent.id,
      eventType,
      result
    })

  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Simula il test di checkout.session.completed
async function testCheckoutSessionCompleted(session: any) {
  console.log('🧪 Testing checkout.session.completed handler')
  
  const userEmail = session.metadata?.user_email || session.customer_email
  const planId = session.metadata?.plan_id || 'pro'
  
  if (!userEmail) {
    throw new Error('No user email provided in test data')
  }

  // Cerca l'utente
  const { data: user, error } = await getSupabase()
    .from('users')
    .select('id, email, plan, credits_remaining')
    .eq('email', userEmail)
    .single()

  if (error || !user) {
    throw new Error(`User not found for email: ${userEmail}`)
  }

  // Ottieni i crediti del piano
  const { data: planData, error: planError } = await getSupabase()
    .from('plans')
    .select('max_credits')
    .eq('name', planId)
    .single()

  if (planError) {
    throw new Error(`Plan not found: ${planId}`)
  }

  const credits = planData.max_credits

  // Simula l'aggiornamento dell'utente
  const { error: updateError } = await getSupabase()
    .from('users')
    .update({
      plan: planId,
      credits_remaining: credits,
      stripe_customer_id: session.customer || 'cus_test',
      stripe_subscription_id: session.subscription || 'sub_test'
    })
    .eq('id', user.id)

  if (updateError) {
    throw new Error(`Failed to update user: ${updateError.message}`)
  }

  // Crea log
  await getSupabase()
    .from('plan_status_logs')
    .insert({
      user_id: user.id,
      action: 'activate',
      previous_status: user.plan,
      new_status: planId,
      reason: `Test checkout completed - Session: ${session.id}`,
      triggered_by: 'test_webhook'
    })

  return {
    message: 'Checkout session test completed successfully',
    user: {
      id: user.id,
      email: user.email,
      oldPlan: user.plan,
      newPlan: planId,
      oldCredits: user.credits_remaining,
      newCredits: credits
    }
  }
}

// Simula il test di invoice.payment_succeeded
async function testInvoicePaymentSucceeded(invoice: any) {
  console.log('🧪 Testing invoice.payment_succeeded handler')
  
  const subscriptionId = invoice.subscription || 'sub_test'
  
  // Cerca l'utente per subscription
  const { data: user, error } = await getSupabase()
    .from('users')
    .select('id, email, plan, credits_remaining')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (error || !user) {
    throw new Error(`User not found for subscription: ${subscriptionId}`)
  }

  // Ottieni i crediti del piano per il rinnovo
  const { data: planData, error: planError } = await getSupabase()
    .from('plans')
    .select('max_credits')
    .eq('name', user.plan)
    .single()

  if (planError) {
    throw new Error(`Plan not found: ${user.plan}`)
  }

  const credits = planData.max_credits

  // Calcola prossima data di reset
  const nextResetDate = new Date()
  nextResetDate.setDate(nextResetDate.getDate() + 30)
  nextResetDate.setHours(0, 0, 0, 0)

  // Aggiorna i crediti
  const { error: updateError } = await getSupabase()
    .from('users')
    .update({
      credits_remaining: credits,
      credits_reset_date: nextResetDate.toISOString()
    })
    .eq('id', user.id)

  if (updateError) {
    throw new Error(`Failed to update user credits: ${updateError.message}`)
  }

  // Crea log
  await getSupabase()
    .from('plan_status_logs')
    .insert({
      user_id: user.id,
      action: 'renew_credits',
      previous_status: 'active',
      new_status: 'active',
      reason: `Test subscription renewed - Invoice: ${invoice.id}`,
      triggered_by: 'test_webhook'
    })

  return {
    message: 'Invoice payment test completed successfully',
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan,
      oldCredits: user.credits_remaining,
      newCredits: credits,
      nextResetDate: nextResetDate.toISOString()
    }
  }
}
