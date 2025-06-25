// Test per verificare le performance della funzione getUserProfile
// Questo file è parte del modulo apps/frontend-app/lib
// Utilizzato per identificare i bottleneck di performance nell'autenticazione

import { getUserProfile } from './auth'
import { supabase } from './supabase'

async function testGetUserProfilePerformance() {
  console.log('🧪 Avvio test performance getUserProfile')
  
  // Test con utente reale (sostituisci con un ID utente valido)
  const testUserId = 'f8aa9019-e520-4440-9bf0-aecf96bfda02' // Il tuo user ID
  
  // Test 1: Performance senza sessionUser
  console.log('\n📊 Test 1: getUserProfile senza sessionUser')
  const start1 = Date.now()
  const profile1 = await getUserProfile(testUserId)
  const time1 = Date.now() - start1
  console.log(`⏱️ Tempo Test 1: ${time1}ms`)
  console.log('✅ Profilo ottenuto:', !!profile1)
  
  // Test 2: Performance con sessionUser
  console.log('\n📊 Test 2: getUserProfile con sessionUser')
  const { data: session } = await supabase.auth.getSession()
  let time2 = 0
  if (session.session?.user) {
    const start2 = Date.now()
    const profile2 = await getUserProfile(testUserId, session.session.user)
    time2 = Date.now() - start2
    console.log(`⏱️ Tempo Test 2: ${time2}ms`)
    console.log('✅ Profilo ottenuto:', !!profile2)
    console.log(`📈 Miglioramento: ${time1 - time2}ms (${((time1 - time2) / time1 * 100).toFixed(1)}%)`)
  } else {
    console.log('❌ Nessuna sessione attiva per Test 2')
  }
  
  // Test 3: Query diretta alla tabella users
  console.log('\n📊 Test 3: Query diretta tabella users')
  const start3 = Date.now()
  const { data: directData } = await supabase
    .from('users')
    .select('id, email, role, plan, credits_remaining')
    .eq('id', testUserId)
    .single()
  const time3 = Date.now() - start3
  console.log(`⏱️ Tempo Test 3 (query diretta): ${time3}ms`)
  console.log('✅ Dati ottenuti:', !!directData)
  
  // Test 4: Query auth.getUser()
  console.log('\n📊 Test 4: Query auth.getUser()')
  const start4 = Date.now()
  const { data: authData } = await supabase.auth.getUser()
  const time4 = Date.now() - start4
  console.log(`⏱️ Tempo Test 4 (auth.getUser): ${time4}ms`)
  console.log('✅ Auth data ottenuti:', !!authData.user)
  
  console.log('\n📈 RIEPILOGO PERFORMANCE:')
  console.log(`- getUserProfile completo: ${time1}ms`)
  console.log(`- getUserProfile ottimizzato: ${time2 > 0 ? time2 + 'ms' : 'N/A'}`)
  console.log(`- Query users diretta: ${time3}ms`)
  console.log(`- Query auth diretta: ${time4}ms`)
  console.log(`- Overhead getUserProfile: ${time1 - time3 - time4}ms`)
  
  if (time1 > 1000) {
    console.log('⚠️ ATTENZIONE: getUserProfile è molto lenta (>1s)')
    console.log('💡 Possibili cause:')
    console.log('  - Latenza rete alta')
    console.log('  - Database overload')
    console.log('  - Indici mancanti')
    console.log('  - Cold start Supabase')
  }
}

// Esporta la funzione per uso in console
if (typeof window !== 'undefined') {
  (window as any).testGetUserProfilePerformance = testGetUserProfilePerformance
  console.log('🧪 Test disponibile: window.testGetUserProfilePerformance()')
}

export { testGetUserProfilePerformance }
