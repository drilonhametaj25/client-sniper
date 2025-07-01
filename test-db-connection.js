// Test rapido per verificare connessione al database e contare i lead
// Usato per verificare se ci sono lead nel database remoto di Supabase

const { createClient } = require('@supabase/supabase-js')

// Leggi variabili direttamente dal file .env.local
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, 'apps/frontend-app/.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')

const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]
const supabaseServiceKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]

console.log('🔗 Testando connessione a Supabase...')
console.log('URL:', supabaseUrl)
console.log('Service Key disponibile:', !!supabaseServiceKey)

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testConnection() {
  try {
    console.log('\n📊 Verificando tabelle e lead...')
    
    // Test 1: Conta i lead totali
    const { data: leads, error: leadsError, count } = await supabase
      .from('leads')
      .select('id, business_name, city, category, score, created_at', { count: 'exact' })
      .limit(5)
    
    if (leadsError) {
      console.error('❌ Errore query leads:', leadsError)
    } else {
      console.log('✅ Lead trovati:', count || 0)
      console.log('📋 Primi 5 lead:')
      leads?.forEach((lead, i) => {
        console.log(`${i+1}. ${lead.business_name} - ${lead.city} (Score: ${lead.score})`)
      })
    }
    
    // Test 2: Conta gli utenti
    const { count: usersCount, error: usersError } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
    
    if (usersError) {
      console.error('❌ Errore query users:', usersError)
    } else {
      console.log('\n👥 Utenti totali:', usersCount || 0)
    }
    
    // Test 3: Verifica struttura tabella leads
    const { data: structure, error: structError } = await supabase
      .rpc('get_table_columns', { table_name: 'leads' })
      .limit(1)
    
    if (!structError) {
      console.log('\n🏗️ Tabella leads esiste e è accessibile')
    }
    
  } catch (error) {
    console.error('💥 Errore generale:', error)
  }
}

testConnection()
