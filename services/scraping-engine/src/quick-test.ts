/**
 * Test veloce per verificare le migliorie ai timeout
 * Esegue test mirati per validare la gestione degli errori di rete
 * 
 * Utilizzato per test rapidi durante lo sviluppo senza analisi complete
 * Parte del modulo services/scraping-engine
 */

import { GoogleMapsScraper } from './scrapers/google-maps-improved'
import { scrapingMonitor } from './utils/scraping-monitor'

async function quickTimeoutTest() {
  console.log('⚡ === TEST VELOCE TIMEOUT ===')
  console.log('🎯 Test ridotto per validare gestione timeout e retry')
  
  const scraper = new GoogleMapsScraper()
  
  // Test con parametri ridotti
  const quickTest = {
    query: 'agenzia web',
    location: 'Milano',
    category: 'web',
    maxResults: 3, // Molto ridotto
    enableSiteAnalysis: false // Disabilitato per test veloce
  }
  
  console.log(`\n🔍 Test: "${quickTest.query}" in ${quickTest.location}`)
  console.log(`⚡ Modalità veloce: maxResults=${quickTest.maxResults}, no analisi siti`)
  
  const startTime = Date.now()
  
  try {
    const result = await scraper.scrape(quickTest)
    const duration = Date.now() - startTime
    
    console.log('\n✅ === RISULTATI VELOCI ===')
    console.log(`⏱️  Durata: ${Math.round(duration / 1000)}s`)
    console.log(`🎯 Successo: ${result.success}`)
    console.log(`📈 Lead trovati: ${result.leads.length}`)
    
    if (result.success) {
      console.log('✅ Sistema di timeout funzionante!')
    } else {
      console.log('⚠️ Problemi rilevati:', result.errors.join(', '))
    }
    
    // Statistiche monitor
    const stats = scrapingMonitor.getStats({ hours: 1 })
    console.log(`\n📊 Tentativi: ${stats.totalAttempts}, Successi: ${stats.successfulAttempts}`)
    
    if (stats.commonErrors.length > 0) {
      console.log(`⚠️ Errore principale: ${stats.commonErrors[0].error}`)
    }
    
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`\n❌ Test fallito dopo ${Math.round(duration / 1000)}s`)
    console.error('Errore:', error instanceof Error ? error.message : error)
  }
  
  console.log('\n🏁 Test veloce completato')
}

// Test specifico per robustezza caricamento pagina
async function testPageLoadStrategies() {
  console.log('\n🌐 === TEST STRATEGIE CARICAMENTO ===')
  
  const scraper = new GoogleMapsScraper()
  
  // Test URL di Google Maps diretti
  const testUrls = [
    'https://www.google.com/maps/search/web+agency+Milano',
    'https://www.google.com/maps/search/software+house+Roma'
  ]
  
  for (const url of testUrls) {
    console.log(`\n🔗 Test caricamento: ${url}`)
    
    try {
      // Crea il browser per test diretto
      const browser = await (scraper as any).initBrowser()
      const page = await browser.newPage()
      
      const startTime = Date.now()
      await (scraper as any).robustPageLoad(page, url)
      const duration = Date.now() - startTime
      
      console.log(`✅ Caricamento riuscito in ${duration}ms`)
      
      await page.close()
      
    } catch (error) {
      console.error(`❌ Fallimento:`, error instanceof Error ? error.message : error)
    }
  }
}

// Esegui test veloce
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.includes('--page-load')) {
    testPageLoadStrategies()
      .then(() => process.exit(0))
      .catch(err => {
        console.error('❌ Test page load fallito:', err)
        process.exit(1)
      })
  } else {
    quickTimeoutTest()
      .then(() => process.exit(0))
      .catch(err => {
        console.error('❌ Test veloce fallito:', err)
        process.exit(1)
      })
  }
}

export { quickTimeoutTest, testPageLoadStrategies }
