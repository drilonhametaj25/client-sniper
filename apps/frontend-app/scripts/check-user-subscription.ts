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
    
    const { data: userData, error } = await supabase
      .from('users')
      .select('id, email, plan, status, stripe_subscription_id, stripe_customer_id, created_at, updated_at')
      .eq('email', 'lonny-4ever@hotmail.it')
      .single()

    if (error) {
      console.error('❌ Errore:', error)
      return
    }

    // Controlliamo anche i log delle operazioni
    const { data: logs, error: logsError } = await supabase
      .from('plan_status_logs')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })
      .limit(10)

  } catch (error) {
    console.error('❌ Errore generale:', error)
  }
}

checkUserData()
