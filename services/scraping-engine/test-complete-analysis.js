/**
 * Test completo del sistema di analisi migliorato
 * Verifica che l'analisi sia accurata e non generi falsi negativi
 */

const { GoogleMapsScraper } = require('./src/scrapers/google-maps-improved')

async function testCompleteAnalysis() {
  console.log('🧪 Test completo del sistema di analisi migliorato')
  
  const scraper = new GoogleMapsScraper()
  
  // Test siti
  const testSites = [
    {
      name: 'Sito Notaio (funzionante)',
      url: 'https://www.notaiosantosuosso.it/',
      expectedWorking: true
    },
    {
      name: 'Sito non esistente',
      url: 'https://www.locandadellanonna.it/',
      expectedWorking: false
    },
    {
      name: 'Google (riferimento)',
      url: 'https://www.google.com/',
      expectedWorking: true
    }
  ]
  
  try {
    await scraper.initBrowser()
    
    for (const site of testSites) {
      console.log(`\n📍 Test: ${site.name}`)
      console.log(`🔗 URL: ${site.url}`)
      
      try {
        const analysis = await scraper.analyzeEnhancedWebsite(site.url)
        
        console.log('📊 Risultati analisi:')
        console.log(`  - Accessibile: ${analysis.isAccessible}`)
        console.log(`  - SSL: ${analysis.hasSSL}`)
        console.log(`  - Status: ${analysis.httpStatusCode}`)
        
        if (analysis.seo) {
          console.log('  - SEO:')
          console.log(`    * Title: ${analysis.seo.hasTitle} (${analysis.seo.titleLength} chars)`)
          console.log(`    * Meta Desc: ${analysis.seo.hasMetaDescription} (${analysis.seo.metaDescriptionLength} chars)`)
          console.log(`    * H1: ${analysis.seo.hasH1} (${analysis.seo.h1Count} tags)`)
        }
        
        if (analysis.gdpr) {
          console.log('  - GDPR:')
          console.log(`    * Cookie Banner: ${analysis.gdpr.hasCookieBanner}`)
          console.log(`    * Privacy Policy: ${analysis.gdpr.hasPrivacyPolicy}`)
          console.log(`    * VAT Number: ${analysis.gdpr.hasVatNumber}`)
        }
        
        if (analysis.mobile) {
          console.log(`  - Mobile Friendly: ${analysis.mobile.isMobileFriendly}`)
        }
        
        if (analysis.tracking) {
          console.log('  - Tracking:')
          console.log(`    * Google Analytics: ${analysis.tracking.hasGoogleAnalytics}`)
          console.log(`    * Facebook Pixel: ${analysis.tracking.hasFacebookPixel}`)
        }
        
        // Test generazione opportunità
        const business = { name: site.name, category: 'test' }
        const contacts = { emails: [], phones: [], addresses: [], vatNumbers: [] }
        const opportunities = scraper.generateOpportunities(analysis)
        
        console.log('🎯 Opportunità generate:')
        console.log(`  - Numero: ${opportunities.opportunities.length}`)
        console.log(`  - Lista: ${opportunities.opportunities.join(', ')}`)
        console.log(`  - Ruoli: ${opportunities.roles.join(', ')}`)
        
        // Verifica coerenza
        if (site.expectedWorking && !analysis.isAccessible) {
          console.log('❌ ERRORE: Sito dovrebbe essere accessibile ma non lo è')
        } else if (!site.expectedWorking && analysis.isAccessible) {
          console.log('❌ ERRORE: Sito non dovrebbe essere accessibile ma lo è')
        } else {
          console.log('✅ Accessibilità correttamente rilevata')
        }
        
        // Verifica falsi negativi per siti funzionanti
        if (site.expectedWorking && analysis.isAccessible) {
          const hasTitle = analysis.seo?.hasTitle
          const hasMetaDesc = analysis.seo?.hasMetaDescription
          const hasH1 = analysis.seo?.hasH1
          
          if (!hasTitle && opportunities.opportunities.some(o => o.includes('title'))) {
            console.log('❌ FALSO NEGATIVO: Segnala titolo mancante ma è presente')
          }
          if (!hasMetaDesc && opportunities.opportunities.some(o => o.includes('meta description'))) {
            console.log('❌ FALSO NEGATIVO: Segnala meta description mancante ma è presente')
          }
          if (!hasH1 && opportunities.opportunities.some(o => o.includes('H1'))) {
            console.log('❌ FALSO NEGATIVO: Segnala H1 mancante ma è presente')
          }
        }
        
      } catch (error) {
        console.log(`❌ Errore durante analisi: ${error.message}`)
        
        if (site.expectedWorking) {
          console.log('⚠️ Sito dovrebbe funzionare ma ha dato errore')
        } else {
          console.log('✅ Errore previsto per sito non funzionante')
        }
      }
    }
    
  } finally {
    await scraper.closeBrowser()
  }
  
  console.log('\n🏁 Test completato')
}

// Esegui test
testCompleteAnalysis().catch(console.error)
