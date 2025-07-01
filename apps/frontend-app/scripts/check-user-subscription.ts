/**
 * Script per controllare i dati utente nel database - TrovaMi
 * Usato per debug problemi di abbonamenti Stripe
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkUserData() {
  try {
    console.log('🔍 Controllando dati utente per: lonny-4ever@hotmail.it')
    
    const { data: userData, error } = await supabase
      .from('users')
      .select('id, email, plan, status, stripe_subscription_id, stripe_customer_id, created_at, updated_at')
      .eq('email', 'lonny-4ever@hotmail.it')
      .single()

    if (error) {
      console.error('❌ Errore:', error)
      return
    }

    console.log('📊 Dati utente trovati:')
    console.log('  ID:', userData.id)
    console.log('  Email:', userData.email)
    console.log('  Piano:', userData.plan)
    console.log('  Status:', userData.status)
    console.log('  Stripe Subscription ID:', userData.stripe_subscription_id)
    console.log('  Stripe Customer ID:', userData.stripe_customer_id)
    console.log('  Created:', userData.created_at)
    console.log('  Updated:', userData.updated_at)

    // Controlliamo anche i log delle operazioni
    const { data: logs, error: logsError } = await supabase
      .from('plan_status_logs')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!logsError && logs) {
      console.log('\n📋 Ultimi 10 log operazioni:')
      logs.forEach((log, index) => {
        console.log(`  ${index + 1}. ${log.created_at}: ${log.action} (${log.previous_status} → ${log.new_status})`)
        console.log(`     Reason: ${log.reason}`)
        console.log(`     Triggered by: ${log.triggered_by}`)
        if (log.stripe_event_id) {
          console.log(`     Stripe Event: ${log.stripe_event_id}`)
        }
        console.log('')
      })
    }

  } catch (error) {
    console.error('❌ Errore generale:', error)
  }
}

checkUserData()
