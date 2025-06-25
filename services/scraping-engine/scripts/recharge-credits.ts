#!/usr/bin/env node

/**
 * Script per ricaricare i crediti mensili
 * Usato per: Job cron che ricarica automaticamente i crediti degli utenti
 * Eseguito da: Cron job o scheduler cloud
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carica variabili ambiente
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function rechargeMonthlyCredits() {
  try {
    console.log('🔄 Avvio ricarica crediti mensile...')
    
    // Chiama la funzione PostgreSQL per ricaricare gli utenti scaduti
    const { data, error } = await supabase.rpc('recharge_expired_users')
    
    if (error) {
      console.error('❌ Errore durante la ricarica:', error)
      process.exit(1)
    }
    
    const usersRecharged = data || 0
    
    if (usersRecharged > 0) {
      console.log(`✅ Ricaricati crediti per ${usersRecharged} utenti`)
      
      // Opzionale: invia notifica email agli utenti
      await notifyUsersOfRecharge(usersRecharged)
    } else {
      console.log('ℹ️ Nessun utente da ricaricare oggi')
    }
    
  } catch (error) {
    console.error('❌ Errore script ricarica:', error)
    process.exit(1)
  }
}

async function notifyUsersOfRecharge(count: number) {
  // Qui potresti integrare con un servizio email
  // per notificare gli utenti della ricarica
  console.log(`📧 Dovresti inviare notifiche a ${count} utenti`)
  
  // Esempio di implementazione:
  // const usersToNotify = await getUsersRechargedToday()
  // for (const user of usersToNotify) {
  //   await sendEmail(user.email, 'Crediti ricaricati!', template)
  // }
}

// Funzione per ottenere stats sui crediti
async function getCreditStats() {
  const { data: users } = await supabase
    .from('users')
    .select('plan, credits_remaining, credits_reset_date')
  
  const stats = {
    free: { count: 0, totalCredits: 0 },
    starter: { count: 0, totalCredits: 0 },
    pro: { count: 0, totalCredits: 0 }
  }
  
  users?.forEach(user => {
    if (stats[user.plan as keyof typeof stats]) {
      stats[user.plan as keyof typeof stats].count++
      stats[user.plan as keyof typeof stats].totalCredits += user.credits_remaining
    }
  })
  
  console.log('📊 Stats crediti:', stats)
  return stats
}

// Main execution
if (require.main === module) {
  rechargeMonthlyCredits()
    .then(() => getCreditStats())
    .then(() => {
      console.log('✅ Script completato con successo')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Script fallito:', error)
      process.exit(1)
    })
}

export { rechargeMonthlyCredits, getCreditStats }
