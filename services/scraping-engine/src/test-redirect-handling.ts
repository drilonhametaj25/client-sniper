/**
 * Test specifico per redirect HTTP→HTTPS e gestione URL problematiche
 * Verifica il caso sun68.com e altri siti con redirect
 * 
 * Utilizzato per testare il WebsiteStatusChecker migliorato
 * Parte del modulo services/scraping-engine
 */

import { WebsiteStatusChecker } from './utils/website-status-checker'

async function testRedirectHandling() {
  console.log('🧪 Test Gestione Redirect HTTP→HTTPS')
  console.log('=====================================')
  
  const statusChecker = new WebsiteStatusChecker()
  
  // Test URLs che richiedono gestione intelligente di redirect
  const testCases = [
    {
      name: 'sun68.com (HTTP→HTTPS redirect)',
      url: 'http://sun68.com/',
      expectedAccessible: true,
      expectedFinalProtocol: 'https'
    },
    {
      name: 'example.com (dovrebbe funzionare)',
      url: 'http://example.com',
      expectedAccessible: true
    },
    {
      name: 'google.com (dovrebbe fare redirect a HTTPS)',
      url: 'http://google.com',
      expectedAccessible: true,
      expectedFinalProtocol: 'https'
    },
    {
      name: 'URL inesistente (dovrebbe fallire)',
      url: 'http://questo-sito-non-esiste-12345.com',
      expectedAccessible: false
    }
  ]
  
  for (const testCase of testCases) {
    console.log(`\n🔍 Testando: ${testCase.name}`)
    console.log(`URL: ${testCase.url}`)
    
    try {
      const result = await statusChecker.checkWebsiteStatus(testCase.url)
      
      console.log(`📊 Risultati:`)
      console.log(`  Status: ${result.status}`)
      console.log(`  Accessibile: ${result.isAccessible}`)
      console.log(`  HTTP Code: ${result.httpCode}`)
      console.log(`  URL Finale: ${result.finalUrl}`)
      console.log(`  Redirect Chain: ${result.redirectChain.length} step(s)`)
      console.log(`  SSL Valido: ${result.sslValid}`)
      console.log(`  Tempo Risposta: ${result.responseTime}ms`)
      
      if (result.redirectChain.length > 0) {
        console.log(`  Redirect: ${testCase.url} → ${result.finalUrl}`)
      }
      
      // Verifica aspettative
      if (testCase.expectedAccessible !== undefined) {
        const accessibleMatch = result.isAccessible === testCase.expectedAccessible
        console.log(`  ✅ Accessibilità: ${accessibleMatch ? 'PASS' : 'FAIL'} (atteso: ${testCase.expectedAccessible}, ottenuto: ${result.isAccessible})`)
      }
      
      if (testCase.expectedFinalProtocol) {
        const protocolMatch = result.finalUrl.startsWith(testCase.expectedFinalProtocol + '://')
        console.log(`  ✅ Protocollo: ${protocolMatch ? 'PASS' : 'FAIL'} (atteso: ${testCase.expectedFinalProtocol}, ottenuto: ${result.finalUrl.split('://')[0]})`)
      }
      
      if (result.errorMessage) {
        console.log(`  ⚠️ Errore: ${result.errorMessage}`)
      }
      
    } catch (error) {
      console.log(`❌ ERRORE per ${testCase.url}: ${(error as Error).message}`)
    }
  }
  
  console.log(`\n🎯 Test redirect completato!`)
}

async function testCommonRedirectScenarios() {
  console.log('\n🔄 Test Scenari Redirect Comuni')
  console.log('==============================')
  
  const statusChecker = new WebsiteStatusChecker()
  
  // Scenari comuni di redirect
  const scenarios = [
    'http://www.google.com',  // Dovrebbe andare a https://www.google.com
    'https://google.com',     // Dovrebbe andare a https://www.google.com
    'http://example.com',     // Dovrebbe rimanere HTTP
    'http://facebook.com',    // Dovrebbe andare a HTTPS
    'http://github.com'       // Dovrebbe andare a HTTPS
  ]
  
  for (const url of scenarios) {
    console.log(`\n🌐 Testando: ${url}`)
    
    try {
      const result = await statusChecker.checkWebsiteStatus(url)
      
      console.log(`  ${result.isAccessible ? '✅' : '❌'} ${url}`)
      console.log(`  → ${result.finalUrl}`)
      
      if (result.redirectChain.length > 0) {
        console.log(`  📈 ${result.redirectChain.length} redirect(s)`)
      }
      
    } catch (error) {
      console.log(`  ❌ Errore: ${(error as Error).message}`)
    }
  }
}

// Esegui test se chiamato direttamente
if (require.main === module) {
  testRedirectHandling()
    .then(() => testCommonRedirectScenarios())
    .then(() => {
      console.log('\n🎉 Tutti i test redirect completati!')
    })
    .catch(console.error)
}

export { testRedirectHandling, testCommonRedirectScenarios }
