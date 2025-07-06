/**
 * Test rapido solo moduli base - senza Google Maps
 * Per verificare velocemente l'integrazione dei moduli core
 * Utilizzato per test di sviluppo rapidi
 * 
 * Parte del modulo services/scraping-engine
 */

import { testQuickIntegration } from './test-integrated-scraper'

console.log('🚀 AVVIO TEST RAPIDO MODULI BASE')
console.log('===============================')

testQuickIntegration()
  .then(() => {
    console.log('\n🎯 TEST RAPIDO COMPLETATO CON SUCCESSO!')
    console.log('Tutti i moduli base funzionano correttamente ✅')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ ERRORE NEL TEST RAPIDO:', error.message)
    process.exit(1)
  })
