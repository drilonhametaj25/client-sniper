// API Route per reset automatico dei crediti mensili
// Utilizzato da cron job o chiamate manuali per resettare i crediti 
// di utenti con piani custom/admin alla scadenza del mese

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // 🔐 SECURITY: Verifica auth header per cron job
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'development-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('\n🔄 STARTING AUTOMATIC CREDITS RESET')
    console.log(`Timestamp: ${new Date().toISOString()}`)

    // 🎯 FIND USERS TO RESET: Trova utenti che necessitano reset crediti
    const now = new Date()
    const { data: usersToReset, error: queryError } = await supabase
      .from('users')
      .select(`
        id, 
        email, 
        plan, 
        credits_remaining, 
        credits_reset_date,
        stripe_subscription_id,
        stripe_customer_id
      `)
      .not('credits_reset_date', 'is', null)
      .lte('credits_reset_date', now.toISOString())

    if (queryError) {
      console.error('❌ Error querying users for reset:', queryError)
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 }
      )
    }

    if (!usersToReset || usersToReset.length === 0) {
      console.log('✅ No users need credits reset at this time')
      return NextResponse.json({ 
        message: 'No users to reset',
        processed: 0,
        timestamp: now.toISOString()
      })
    }

    console.log(`📋 Found ${usersToReset.length} users needing credits reset`)

    let processed = 0
    let skipped = 0
    let errors = 0

    // 🔄 PROCESS EACH USER: Elabora ogni utente che necessita reset
    for (const user of usersToReset) {
      try {
        console.log(`\n👤 Processing user: ${user.id} (${user.email})`)
        console.log(`Current plan: ${user.plan}`)
        console.log(`Current credits: ${user.credits_remaining}`)
        console.log(`Reset date: ${user.credits_reset_date}`)

        // ⏭️ SKIP STRIPE USERS: Salta utenti con abbonamenti Stripe attivi
        if (user.stripe_subscription_id) {
          console.log(`⏭️ Skipping user with active Stripe subscription: ${user.stripe_subscription_id}`)
          skipped++
          continue
        }

        // 📊 GET PLAN CREDITS: Ottieni i crediti del piano dal database
        const { data: planData, error: planError } = await supabase
          .from('plans')
          .select('max_credits')
          .eq('name', user.plan)
          .single()

        if (planError || !planData) {
          console.error(`❌ Plan not found for user ${user.id}: ${user.plan}`)
          errors++
          continue
        }

        const newCredits = planData.max_credits
        console.log(`🎯 Resetting to ${newCredits} credits for plan ${user.plan}`)

        // 📅 CALCULATE NEXT RESET: Calcola prossima data di reset (30 giorni da oggi)
        const nextResetDate = new Date()
        nextResetDate.setDate(nextResetDate.getDate() + 30)
        nextResetDate.setHours(0, 0, 0, 0)

        // 💾 UPDATE USER: Aggiorna crediti e data di reset
        const { error: updateError } = await supabase
          .from('users')
          .update({
            credits_remaining: newCredits,
            credits_reset_date: nextResetDate.toISOString()
          })
          .eq('id', user.id)

        if (updateError) {
          console.error(`❌ Error updating user ${user.id}:`, updateError)
          errors++
          continue
        }

        // 📝 LOG OPERATION: Crea log dell'operazione
        const { error: logError } = await supabase
          .from('plan_status_logs')
          .insert({
            user_id: user.id,
            action: 'auto_reset_credits',
            previous_status: 'active',
            new_status: 'active',
            reason: `Automatic monthly credits reset from ${user.credits_remaining} to ${newCredits}`,
            triggered_by: 'cron_job'
          })

        if (logError) {
          console.error(`❌ Error creating log for user ${user.id}:`, logError)
          // Non consideriamo questo un errore critico
        }

        console.log(`✅ Successfully reset credits for user ${user.id}`)
        console.log(`   Previous: ${user.credits_remaining} → New: ${newCredits}`)
        console.log(`   Next reset: ${nextResetDate.toISOString()}`)
        
        processed++

      } catch (error) {
        console.error(`🚨 Error processing user ${user.id}:`, error)
        errors++
      }
    }

    // 📊 SUMMARY: Riassunto dell'operazione
    const summary = {
      message: 'Credits reset completed',
      timestamp: now.toISOString(),
      total_users_found: usersToReset.length,
      processed,
      skipped,
      errors
    }

    console.log('\n📊 RESET SUMMARY:')
    console.log(`Total users found: ${usersToReset.length}`)
    console.log(`Successfully processed: ${processed}`)
    console.log(`Skipped (Stripe users): ${skipped}`)
    console.log(`Errors: ${errors}`)
    console.log('🏁 Credits reset operation completed')

    return NextResponse.json(summary)

  } catch (error) {
    console.error('🚨 CRITICAL ERROR in credits reset:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error during credits reset',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// 🔄 GET endpoint per verificare stato reset
export async function GET(request: NextRequest) {
  try {
    // 📊 PREVIEW: Mostra utenti che necessiterebbero reset
    const now = new Date()
    const { data: usersToReset, error } = await supabase
      .from('users')
      .select(`
        id, 
        email, 
        plan, 
        credits_remaining, 
        credits_reset_date,
        stripe_subscription_id
      `)
      .not('credits_reset_date', 'is', null)
      .lte('credits_reset_date', now.toISOString())

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const stripeManagedUsers = usersToReset?.filter(u => u.stripe_subscription_id) || []
    const nonStripeUsers = usersToReset?.filter(u => !u.stripe_subscription_id) || []

    return NextResponse.json({
      timestamp: now.toISOString(),
      total_eligible_for_reset: usersToReset?.length || 0,
      stripe_managed_users: stripeManagedUsers.length,
      non_stripe_users: nonStripeUsers.length,
      users_to_be_processed: nonStripeUsers.length,
      preview: nonStripeUsers.slice(0, 5).map(u => ({
        id: u.id,
        email: u.email,
        plan: u.plan,
        current_credits: u.credits_remaining,
        reset_date: u.credits_reset_date
      }))
    })

  } catch (error) {
    console.error('Error in credits reset preview:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
