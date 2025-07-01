/**
 * Script di test per verificare la gestione dei timeout nel SiteAnalyzer
 * Testa i nuovi metodi timeoutPromise e getDefaultAnalysis
 * Serve per validare che l'analisi non si blocchi più sui timeout
 */

import { chromium } from 'playwright'
import { SiteAnalyzer } from '../analyzers/site-analyzer'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carica configurazione
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function testTimeoutHandling() {
  console.log('🚀 Test gestione timeout SiteAnalyzer')
  
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  })
  
  const page = await context.newPage()
  const analyzer = new SiteAnalyzer(page)
  
  // Test su siti diversi per verificare robustezza
  const testSites = [
    'https://www.google.com', // Sito veloce e accessibile
    'https://httpstat.us/500', // Sito che restituisce errore 500
    'https://httpbin.org/delay/10', // Sito con delay artificiale
    'https://site-non-esistente-xyz123.com', // Sito inesistente
    'https://www.example.com' // Sito basic
  ]
  
  for (const [index, url] of testSites.entries()) {
    console.log(`\n--- Test ${index + 1}/5: ${url} ---`)
    
    const startTime = Date.now()
    
    try {
      const analysis = await analyzer.analyzeSite(url)
      const duration = Date.now() - startTime
      
      console.log(`✅ Analisi completata in ${duration}ms`)
      console.log(`📊 Score: ${analysis.overallScore}`)
      console.log(`🌐 URL finale: ${analysis.finalUrl}`)
      console.log(`📈 Status HTTP: ${analysis.httpStatus}`)
      console.log(`⚡ Accessibile: ${analysis.isAccessible}`)
      
      if (analysis.performance) {
        console.log(`🏃 Load time: ${analysis.performance.loadTime}ms`)
      }
      
      if (analysis.seo) {
        console.log(`🎯 SEO: Titolo presente: ${analysis.seo.hasTitle}`)
      }
      
      // Verifica che l'analisi non sia rimasta bloccata troppo a lungo
      if (duration > 30000) { // 30 secondi
        console.log(`⚠️ ATTENZIONE: Analisi troppo lenta (${duration}ms)`)
      }
      
    } catch (error) {
      const duration = Date.now() - startTime
      console.log(`❌ Errore dopo ${duration}ms:`, error instanceof Error ? error.message : String(error))
    }
  }
  
  await browser.close()
  console.log('\n✅ Test completato!')
}

// Test specifico per i metodi di timeout
async function testTimeoutMethods() {
  console.log('\n🧪 Test metodi timeout specifici')
  
  // Simula promessa che impiega troppo tempo
  const slowPromise = new Promise((resolve) => {
    setTimeout(() => resolve('completed'), 10000) // 10 secondi
  })
  
  // Simula promessa veloce
  const fastPromise = new Promise((resolve) => {
    setTimeout(() => resolve('fast'), 100) // 100ms
  })
  
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const analyzer = new SiteAnalyzer(page)
  
  // Testa timeout su promessa lenta
  try {
    console.log('⏱️ Test timeout su promessa lenta (dovrebbe fallire)...')
    // Nota: dobbiamo accedere al metodo privato per il test
    // In produzione questo non è necessario
    const result = await (analyzer as any).timeoutPromise(slowPromise, 2000, 'test-slow')
    console.log('❌ ERRORE: Doveva andare in timeout!')
  } catch (error) {
    console.log('✅ Timeout gestito correttamente:', error instanceof Error ? error.message : String(error))
  }
  
  // Testa promessa veloce
  try {
    console.log('⚡ Test promessa veloce (dovrebbe completare)...')
    const result = await (analyzer as any).timeoutPromise(fastPromise, 2000, 'test-fast')
    console.log('✅ Promessa veloce completata:', result)
  } catch (error) {
    console.log('❌ ERRORE: Promessa veloce non doveva fallire')
  }
  
  // Testa getDefaultAnalysis
  console.log('\n🔧 Test getDefaultAnalysis...')
  const defaultPerf = (analyzer as any).getDefaultAnalysis('performance')
  const defaultSEO = (analyzer as any).getDefaultAnalysis('seo')
  
  console.log('✅ Default performance:', JSON.stringify(defaultPerf, null, 2))
  console.log('✅ Default SEO:', JSON.stringify(defaultSEO, null, 2))
  
  await browser.close()
}

// Esegui i test
async function runAllTests() {
  try {
    await testTimeoutHandling()
    await testTimeoutMethods()
    console.log('\n🎉 Tutti i test completati con successo!')
  } catch (error) {
    console.error('💥 Errore durante i test:', error)
    process.exit(1)
  }
}

runAllTests()
