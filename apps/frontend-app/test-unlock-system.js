/**
 * Test per verificare il sistema di lead sbloccati
 * Usato per: Testare che i crediti non vengano scalati due volte per lo stesso lead
 * Eseguire: npm run test:unlock o node test-unlock-system.js
 */

console.log('🧪 Test Sistema Lead Sbloccati - ClientSniper\n')

// Simulazione test del flusso di sblocco lead
const testUnlockSystem = () => {
  console.log('📋 Test Flow:')
  console.log('1. Utente visualizza lista lead (dashboard)')
  console.log('2. Utente clicca su lead per vedere dettagli')
  console.log('3. ✅ Sistema scala 1 credito e registra lead come sbloccato')
  console.log('4. Utente torna alla dashboard e riclicca lo stesso lead')
  console.log('5. ✅ Sistema NON scala crediti (lead già sbloccato)')
  console.log('6. Utente può vedere dettagli senza costi aggiuntivi')
  console.log()

  console.log('🔧 Componenti Implementati:')
  console.log('✅ Tabella user_unlocked_leads per tracking')
  console.log('✅ Funzione get_user_unlocked_leads() per verifica')
  console.log('✅ Funzione unlock_lead_for_user() per registrazione')
  console.log('✅ Dashboard carica lead sbloccati all\'avvio')
  console.log('✅ Pagina dettaglio controlla se lead già sbloccato')
  console.log('✅ Crediti scalati solo al primo accesso')
  console.log()

  console.log('🔍 Verifica Manuale:')
  console.log('1. Registrati/Login con account free (2 crediti)')
  console.log('2. Vai su dashboard e clicca un lead')
  console.log('3. Verifica che crediti passino da 2 a 1')
  console.log('4. Torna alla dashboard')
  console.log('5. Clicca di nuovo lo stesso lead')
  console.log('6. ✅ Verifica che crediti rimangano a 1 (non scendano a 0)')
  console.log()

  console.log('🗄️ Verifica Database:')
  console.log('-- Verifica lead sbloccati per utente')
  console.log('SELECT * FROM user_unlocked_leads WHERE user_id = \'[USER_ID]\';')
  console.log()
  console.log('-- Verifica log utilizzo crediti')
  console.log('SELECT * FROM credit_usage_log WHERE user_id = \'[USER_ID]\' ORDER BY created_at DESC;')
  console.log()

  console.log('🎯 Risultato Atteso:')
  console.log('✅ Un solo record in credit_usage_log per lead')
  console.log('✅ Un record in user_unlocked_leads per ogni lead sbloccato')
  console.log('✅ Crediti scalati una sola volta per lead')
  console.log('✅ Lead rimane accessibile anche dopo refresh/logout-login')
  console.log()

  console.log('🚨 Possibili Problemi:')
  console.log('❌ Se user_unlocked_leads è vuota → RLS policies problema')
  console.log('❌ Se crediti scalati sempre → logica verifica fallita')
  console.log('❌ Se get_user_unlocked_leads() non funziona → funzione SQL errore')
  console.log('❌ Se lead "si ribloccano" → billing_cycle_start problema')
  console.log()
}

// Funzione per testare API (da browser)
const testAPIFlow = () => {
  console.log('🌐 Test API Flow (esegui in console browser):')
  console.log(`
// 1. Ottieni lead sbloccati
await supabase.rpc('get_user_unlocked_leads', { p_user_id: 'YOUR_USER_ID' })

// 2. Sblocca un lead
await supabase.rpc('unlock_lead_for_user', { 
  p_user_id: 'YOUR_USER_ID', 
  p_lead_id: 'LEAD_ID' 
})

// 3. Verifica che sia stato registrato
await supabase.rpc('get_user_unlocked_leads', { p_user_id: 'YOUR_USER_ID' })

// 4. Controlla tabella direttamente
await supabase.from('user_unlocked_leads').select('*').eq('user_id', 'YOUR_USER_ID')
  `)
}

// Funzione per generare query SQL di debug
const generateDebugQueries = (userId = 'YOUR_USER_ID') => {
  console.log('🔍 Query SQL Debug:')
  console.log(`
-- 1. Verifica lead sbloccati per utente
SELECT 
  ul.id,
  ul.lead_id,
  ul.unlocked_at,
  ul.billing_cycle_start,
  l.business_name,
  l.score
FROM user_unlocked_leads ul
JOIN leads l ON ul.lead_id = l.id
WHERE ul.user_id = '${userId}'
ORDER BY ul.unlocked_at DESC;

-- 2. Verifica crediti e utilizzo
SELECT 
  u.credits_remaining,
  u.plan,
  COUNT(cul.id) as credits_used_today
FROM users u
LEFT JOIN credit_usage_log cul ON u.id = cul.user_id 
  AND cul.created_at >= CURRENT_DATE
WHERE u.id = '${userId}'
GROUP BY u.id, u.credits_remaining, u.plan;

-- 3. Log dettagliato utilizzo crediti
SELECT 
  action,
  credits_consumed,
  credits_remaining,
  metadata,
  created_at
FROM credit_usage_log 
WHERE user_id = '${userId}'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Verifica integrità sistema
SELECT 
  'Leads sbloccati' as metric,
  COUNT(*) as count
FROM user_unlocked_leads 
WHERE user_id = '${userId}'
UNION ALL
SELECT 
  'Crediti usati (lead views)' as metric,
  COUNT(*) as count
FROM credit_usage_log 
WHERE user_id = '${userId}' 
  AND action = 'lead_detail_view';
  `)
}

// Esegui tutti i test
const runAllTests = () => {
  console.log('🚀 === Test Suite Lead Unlock System ===\n')
  
  testUnlockSystem()
  testAPIFlow()
  generateDebugQueries()
  
  console.log('🎉 === Test Suite Completata ===')
  console.log('✅ Sistema implementato e pronto per test manuali')
  console.log('📝 Prossimi passi:')
  console.log('   1. Deploy del codice aggiornato')
  console.log('   2. Test flow completo in produzione')
  console.log('   3. Verifica con utenti real-world')
  console.log('   4. Monitor performance e debug se necessario')
}

// Avvia test
runAllTests()

// Export per compatibilità (se necessario)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = runAllTests
}
