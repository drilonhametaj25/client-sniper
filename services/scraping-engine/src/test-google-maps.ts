/**
 * Script di test per verificare le migliorie del GoogleMapsScraper
 * Testa il sistema di retry, la gestione dei timeout e la robustezza generale
 * 
 * Utilizzato per validare le ottimizzazioni implementate senza attendere il cron
 * Parte del modulo services/scraping-engine per test e debugging
 */

import { GoogleMapsScraper } from './scrapers/google-maps-improved'
import { scrapingMonitor } from './utils/scraping-monitor'

async function testGoogleMapsScraper() {
  console.log('🧪 === INIZIO TEST GOOGLE MAPS SCRAPER MIGLIORATO ===')
  console.log('🎯 Obiettivo: Verificare gestione timeout e sistema di retry')
  
  const scraper = new GoogleMapsScraper()
  
  // Test case più semplice per ridurre probabilità di timeout
  const testOptions = {
    query: 'web agency',
    location: 'Milano Centro',
    category: 'web agency',
    maxResults: 5, // Ridotto per test più veloce
    enableSiteAnalysis: true
  }
  
  console.log(`\n🔍 Test scraping: "${testOptions.query}" in ${testOptions.location}`)
  console.log(`📊 Parametri: maxResults=${testOptions.maxResults}, analisi siti=${testOptions.enableSiteAnalysis}`)
  
  const startTime = Date.now()
  
  try {
    const result = await scraper.scrape(testOptions)
    const duration = Date.now() - startTime
    
    console.log('\n✅ === RISULTATI TEST ===')
    console.log(`⏱️  Durata totale: ${Math.round(duration / 1000)}s`)
    console.log(`🎯 Successo: ${result.success}`)
    console.log(`📈 Lead trovati: ${result.leads.length}`)
    console.log(`🌐 Siti analizzati: ${result.totalAnalyzed}`)
    console.log(`⚡ Tempo medio analisi: ${Math.round(result.avgAnalysisTime)}ms`)
    
    if (result.leads.length > 0) {
      console.log('\n📋 === DETTAGLIO PRIMI LEAD ===')
      result.leads.slice(0, 3).forEach((lead, index) => {
        console.log(`\n${index + 1}. ${lead.businessName}`)
        console.log(`   📧 Contatti: ${lead.contacts.email || 'N/A'} | ${lead.contacts.phone || 'N/A'}`)
        console.log(`   🌐 Website: ${lead.contacts.website || 'N/A'}`)
        console.log(`   🎯 Score: ${lead.score}/100 | Priorità: ${lead.priority}`)
        console.log(`   🔧 Opportunità: ${lead.opportunities.slice(0, 2).join(', ')}`)
        
        if (lead.websiteAnalysis) {
          console.log(`   📊 Analisi sito: Score ${lead.websiteAnalysis.overallScore}/100, Accessibile: ${lead.websiteAnalysis.isAccessible}`)
        }
      })
    }
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n⚠️ === ERRORI RILEVATI ===')
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`)
      })
    }
    
  } catch (error) {
    console.error('\n❌ === ERRORE DURANTE TEST ===')
    console.error('Errore:', error instanceof Error ? error.message : error)
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A')
  }
  
  // Mostra statistiche del monitor
  console.log('\n📊 === STATISTICHE PERFORMANCE ===')
  const stats = scrapingMonitor.getStats()
  console.log(`🔄 Tentativi totali: ${stats.totalAttempts}`)
  console.log(`✅ Tentativi riusciti: ${stats.successfulAttempts}`)
  console.log(`❌ Tentativi falliti: ${stats.failedAttempts}`)
  console.log(`📈 Tasso di successo: ${Math.round(stats.successRate * 100)}%`)
  
  if (stats.avgLoadTime > 0) {
    console.log(`🌐 Tempo medio caricamento: ${Math.round(stats.avgLoadTime)}ms`)
  }
  
  if (stats.commonErrors.length > 0) {
    console.log('\n⚠️ === ERRORI PIÙ COMUNI ===')
    stats.commonErrors.slice(0, 3).forEach((error, index) => {
      console.log(`${index + 1}. ${error.error} (${error.count} volte)`)
    })
  }
  
  // Mostra raccomandazioni
  const recommendations = scrapingMonitor.getOptimizationRecommendations()
  if (recommendations.length > 0) {
    console.log('\n💡 === RACCOMANDAZIONI OTTIMIZZAZIONE ===')
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`)
    })
  }
  
  console.log('\n🏁 === FINE TEST ===')
}

// Test specifico per analisi sito web
async function testWebsiteAnalysis() {
  console.log('\n🧪 === TEST ANALISI SITO WEB ===')
  
  const scraper = new GoogleMapsScraper()
  
  const testUrls = [
    'https://www.google.com', // Sito ben strutturato
    'http://example.com', // Sito semplice
    'https://httpstat.us/404', // Sito con errore
    'https://this-domain-does-not-exist-12345.com' // Sito inesistente
  ]
  
  for (const url of testUrls) {
    console.log(`\n🔍 Test analisi: ${url}`)
    
    try {
      const startTime = Date.now()
      const analysis = await scraper.analyzeEnhancedWebsite(url)
      const duration = Date.now() - startTime
      
      console.log(`⏱️  Durata: ${duration}ms`)
      console.log(`✅ Accessibile: ${analysis.isAccessible}`)
      console.log(`📊 Score: ${analysis.overallScore}/100`)
      
      if (analysis.error) {
        console.log(`⚠️  Errore: ${analysis.error}`)
      }
      
      const opps = scraper.generateOpportunities(analysis)
      console.log(`🎯 Opportunità: ${opps.opportunities.slice(0, 3).join(', ')}`)
      console.log(`👥 Ruoli: ${opps.roles.join(', ')}`)
      
    } catch (error) {
      console.error(`❌ Errore analisi ${url}:`, error instanceof Error ? error.message : error)
    }
  }
}

// Esegui i test
async function runAllTests() {
  try {
    await testGoogleMapsScraper()
    await testWebsiteAnalysis()
  } catch (error) {
    console.error('❌ Errore durante esecuzione test:', error)
    process.exit(1)
  }
}

// Controlla se eseguito direttamente
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log('\n🎉 Tutti i test completati!')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Test falliti:', error)
      process.exit(1)
    })
}

export { testGoogleMapsScraper, testWebsiteAnalysis }
