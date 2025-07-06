/**
 * Script di test per verificare l'analisi robusta dei siti problematici
 * Testa specificamente il caso del sito notaiosantosuosso.it che causava ERR_ABORTED
 * Verifica che il sistema di fallback funzioni correttamente
 */

const { chromium } = require('playwright')
const path = require('path')

async function testRobustAnalysis() {
  console.log('🧪 Test analisi robusta per siti problematici')
  
  // Siti di test - quello problematico e uno normale
  const testSites = [
    'https://www.notaiosantosuosso.it/',
    'https://www.google.com/',
    'https://www.studioorlandi.it/',
    'https://httpstat.us/500' // Sito che simula errore 500
  ]
  
  const browser = await chromium.launch({ headless: true })
  
  for (const url of testSites) {
    console.log(`\n📍 Testing: ${url}`)
    
    try {
      // Test 1: Analisi performance standard
      const page = await browser.newPage()
      
      await page.context().addInitScript(() => {
        delete window.webdriver
      })
      
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
      })
      
      console.log('  ⏱️ Tentativo navigazione...')
      const startTime = Date.now()
      
      const response = await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })
      
      const loadTime = Date.now() - startTime
      console.log(`  ✅ Caricamento riuscito in ${loadTime}ms`)
      console.log(`  📡 Status: ${response.status()}`)
      
      // Verifica contenuto base
      const title = await page.title()
      console.log(`  📄 Title: "${title}"`)
      
      // Verifica SSL
      const protocol = new URL(url).protocol
      console.log(`  🔒 SSL: ${protocol === 'https:' ? 'YES' : 'NO'}`)
      
      // Verifica elementi SEO base
      const hasH1 = await page.locator('h1').count() > 0
      const hasMetaDescription = await page.locator('meta[name="description"]').count() > 0
      console.log(`  🔍 SEO - H1: ${hasH1 ? 'YES' : 'NO'}, Meta Description: ${hasMetaDescription ? 'YES' : 'NO'}`)
      
      await page.close()
      
    } catch (error) {
      console.log(`  ❌ Errore: ${error.message}`)
      
      // Test fallback: analisi parziale
      console.log(`  🛡️ Tentativo analisi fallback...`)
      
      try {
        const fallbackPage = await browser.newPage()
        
        // Modalità più aggressiva
        await fallbackPage.setExtraHTTPHeaders({
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        })
        
        const fallbackResponse = await fallbackPage.goto(url, { 
          waitUntil: 'commit', // Meno restrittivo
          timeout: 15000
        })
        
        console.log(`  ✅ Fallback riuscito - Status: ${fallbackResponse.status()}`)
        await fallbackPage.close()
        
      } catch (fallbackError) {
        console.log(`  💥 Anche fallback fallito: ${fallbackError.message}`)
        console.log(`  📝 Questo sito richiede analisi di emergenza`)
      }
    }
  }
  
  await browser.close()
  console.log('\n🏁 Test completato')
}

// Esegui il test
testRobustAnalysis().catch(console.error)
