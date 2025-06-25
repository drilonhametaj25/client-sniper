#!/usr/bin/env tsx

// Script per aggiungere un utente di test al database
// Usato per testare il sistema di assegnazione lead

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carica variabili d'ambiente
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variabili d\'ambiente SUPABASE_URL e SUPABASE_SERVICE_KEY mancanti')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function addTestUser() {
  console.log('🔧 Aggiunta utente di test al database...')
  
  try {
    // Aggiungi un utente di test
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([
        {
          email: 'test@clientsniper.com',
          plan: 'starter',
          credits_remaining: 50
        }
      ])
      .select()
    
    if (userError) {
      if (userError.code === '23505') { // Duplicate key error
        console.log('✅ Utente di test già esistente')
      } else {
        throw userError
      }
    } else {
      console.log('✅ Utente di test creato:', user)
    }
    
    // Verifica che ci siano utenti disponibili
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .gt('credits_remaining', 0)
    
    if (fetchError) {
      throw fetchError
    }
    
    console.log(`📊 Utenti disponibili nel database: ${users?.length || 0}`)
    users?.forEach(user => {
      console.log(`  - ${user.email} (${user.plan}) - ${user.credits_remaining} crediti`)
    })
    
  } catch (error) {
    console.error('❌ Errore:', error)
    process.exit(1)
  }
}

addTestUser()
