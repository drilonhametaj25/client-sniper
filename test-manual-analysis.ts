/**
 * Test semplice per verificare che l'analisi manuale funzioni
 * Testa il RealSiteAnalyzer e la logica di analisi
 * Da eseguire in sviluppo per validare la feature
 */

import { RealSiteAnalyzer } from './apps/frontend-app/lib/analyzers/real-site-analyzer'

async function testManualAnalysis() {
  console.log('🧪 Test analisi manuale...')
  
  const analyzer = new RealSiteAnalyzer()
  
  try {
    console.log('⚡ Inizializzazione analyzer...')
    await analyzer.initialize()
    
    console.log('🔍 Analisi di google.com...')
    const result = await analyzer.analyzeSite('https://google.com')
    
    console.log('✅ Risultato analisi:')
    console.log(`- URL: ${result.url}`)
    console.log(`- URL finale: ${result.finalUrl}`)
    console.log(`- Accessibile: ${result.isAccessible}`)
    console.log(`- Status HTTP: ${result.httpStatus}`)
    console.log(`- Score: ${result.overallScore}/100`)
    console.log(`- Tempo analisi: ${result.analysisTime}ms`)
    
    console.log('\n📊 Dettagli SEO:')
    console.log(`- Title: ${result.seo.hasTitle} (${result.seo.titleLength} caratteri)`)
    console.log(`- Meta description: ${result.seo.hasMetaDescription} (${result.seo.metaDescriptionLength} caratteri)`)
    console.log(`- H1: ${result.seo.hasH1} (${result.seo.h1Count} trovati)`)
    
    console.log('\n⚡ Performance:')
    console.log(`- Tempo caricamento: ${result.performance.loadTime}ms`)
    console.log(`- Immagini: ${result.performance.totalImages} (${result.performance.brokenImages} rotte)`)
    console.log(`- Responsive: ${result.performance.isResponsive}`)
    
    console.log('\n📈 Tracking:')
    console.log(`- Google Analytics: ${result.tracking.hasGoogleAnalytics}`)
    console.log(`- Facebook Pixel: ${result.tracking.hasFacebookPixel}`)
    console.log(`- GTM: ${result.tracking.hasGoogleTagManager}`)
    
    console.log('\n🔒 GDPR:')
    console.log(`- Cookie banner: ${result.gdpr.hasCookieBanner}`)
    console.log(`- Privacy policy: ${result.gdpr.hasPrivacyPolicy}`)
    
    console.log('\n⚖️ Compliance:')
    console.log(`- Partita IVA: ${result.legal.hasVisiblePartitaIva}`)
    console.log(`- Indirizzo: ${result.legal.hasBusinessAddress}`)
    console.log(`- Score compliance: ${result.legal.complianceScore}/100`)
    
    console.log('\n📱 Social:')
    console.log(`- Presenza social: ${result.social.hasAnySocial} (${result.social.socialCount} link)`)
    
    console.log('\n🚨 Problemi identificati:')
    Object.entries(result.issues).forEach(([key, value]) => {
      if (value) console.log(`- ${key}: ${value}`)
    })
    
    console.log('\n✅ Test completato con successo!')
    
  } catch (error) {
    console.error('❌ Errore durante test:', error)
  } finally {
    await analyzer.cleanup()
    console.log('🧹 Cleanup completato')
  }
}

// Esegui il test se questo file viene chiamato direttamente
if (require.main === module) {
  testManualAnalysis()
}

export { testManualAnalysis }
