/**
 * Test specifico per il sito Panama Design che mostrava score inconsistenti
 * Verifica che l'analisi produca dati corretti e coerenti con il frontend
 * Ora con gestione corretta dei problemi SEO (mancante vs corto)
 */

import { chromium } from 'playwright'
import { SiteAnalyzer } from '../analyzers/site-analyzer'
import dotenv from 'dotenv'

dotenv.config()

async function testPanamaDesign() {
  console.log('🎯 Test specifico per Panama Design (versione corretta)')
  console.log('📝 Verificando analisi del sito: http://www.panama-design.com/')
  
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  })
  
  const page = await context.newPage()
  const analyzer = new SiteAnalyzer(page)
  
  const startTime = Date.now()
  
  try {
    const analysis = await analyzer.analyzeSite('http://www.panama-design.com/')
    const duration = Date.now() - startTime
    
    console.log(`\n✅ Analisi completata in ${duration}ms`)
    console.log(`🔗 URL analizzato: ${analysis.url}`)
    console.log(`🌐 URL finale: ${analysis.finalUrl}`)
    console.log(`📈 Status HTTP: ${analysis.httpStatus}`)
    console.log(`⚡ Accessibile: ${analysis.isAccessible}`)
    console.log(`📊 SCORE COMPLESSIVO: ${analysis.overallScore}/100`)
    
    console.log('\n📋 DETTAGLI ANALISI:')
    
    // Performance
    console.log('\n🏃 PERFORMANCE:')
    console.log(`  Load time: ${analysis.performance.loadTime}ms`)
    console.log(`  Immagini totali: ${analysis.performance.totalImages}`)
    console.log(`  Immagini rotte: ${analysis.performance.brokenImages}`)
    console.log(`  Responsive: ${analysis.performance.isResponsive}`)
    
    // SEO
    console.log('\n🎯 SEO:')
    console.log(`  Ha titolo: ${analysis.seo.hasTitle}`)
    console.log(`  Lunghezza titolo: ${analysis.seo.titleLength}`)
    console.log(`  Ha meta description: ${analysis.seo.hasMetaDescription}`)
    console.log(`  Lunghezza meta: ${analysis.seo.metaDescriptionLength}`)
    console.log(`  Ha H1: ${analysis.seo.hasH1}`)
    console.log(`  Numero H1: ${analysis.seo.h1Count}`)
    console.log(`  Structured data: ${analysis.seo.hasStructuredData}`)
    
    // Tracking
    console.log('\n📈 TRACKING:')
    console.log(`  Google Analytics: ${analysis.tracking.hasGoogleAnalytics}`)
    console.log(`  Facebook Pixel: ${analysis.tracking.hasFacebookPixel}`)
    console.log(`  Google Tag Manager: ${analysis.tracking.hasGoogleTagManager}`)
    console.log(`  Hotjar: ${analysis.tracking.hasHotjar}`)
    console.log(`  Custom tracking: ${analysis.tracking.customTracking.length > 0 ? analysis.tracking.customTracking.join(', ') : 'Nessuno'}`)
    
    // GDPR
    console.log('\n🛡️ GDPR:')
    console.log(`  Cookie banner: ${analysis.gdpr.hasCookieBanner}`)
    console.log(`  Privacy policy: ${analysis.gdpr.hasPrivacyPolicy}`)
    console.log(`  Terms of service: ${analysis.gdpr.hasTermsOfService}`)
    console.log(`  Metodo consenso: ${analysis.gdpr.cookieConsentMethod}`)
    console.log(`  Embed rischiosi: ${analysis.gdpr.riskyEmbeds.length}`)
    
    // Legal
    console.log('\n⚖️ LEGAL:')
    console.log(`  P.IVA visibile: ${analysis.legal.hasVisiblePartitaIva}`)
    console.log(`  Posizione P.IVA: ${analysis.legal.partitaIvaLocation || 'N/A'}`)
    console.log(`  Indirizzo business: ${analysis.legal.hasBusinessAddress}`)
    console.log(`  Info contatto: ${analysis.legal.hasContactInfo}`)
    console.log(`  Score compliance: ${analysis.legal.complianceScore}`)
    
    // Social
    console.log('\n📱 SOCIAL:')
    console.log(`  Facebook: ${analysis.social.facebook || 'N/A'}`)
    console.log(`  Instagram: ${analysis.social.instagram || 'N/A'}`)
    console.log(`  LinkedIn: ${analysis.social.linkedin || 'N/A'}`)
    console.log(`  Ha social: ${analysis.social.hasAnySocial}`)
    console.log(`  Numero social: ${analysis.social.socialCount}`)
    
    // Problemi identificati - NUOVA LOGICA
    console.log('\n⚠️ PROBLEMI IDENTIFICATI (NUOVA LOGICA):')
    console.log(`  Titolo mancante: ${analysis.issues.missingTitle}`)
    console.log(`  Titolo corto (<30 char): ${analysis.issues.shortTitle}`)
    console.log(`  Meta description mancante: ${analysis.issues.missingMetaDescription}`)
    console.log(`  Meta description corta (<50 char): ${analysis.issues.shortMetaDescription}`)
    console.log(`  H1 mancante: ${analysis.issues.missingH1}`)
    console.log(`  Immagini rotte: ${analysis.issues.brokenImages}`)
    console.log(`  Caricamento lento (>3s): ${analysis.issues.slowLoading}`)
    console.log(`  Nessun tracking: ${analysis.issues.noTracking}`)
    console.log(`  Nessun cookie consent: ${analysis.issues.noCookieConsent}`)
    console.log(`  P.IVA mancante: ${analysis.issues.missingPartitaIva}`)
    console.log(`  Nessuna presenza social: ${analysis.issues.noSocialPresence}`)
    console.log(`  Problemi HTTPS: ${analysis.issues.httpsIssues}`)
    
    // Calcolo del punteggio - LOGICA CORRETTA
    console.log('\n🧮 CALCOLO SCORE (100 = perfetto, 0 = molti problemi):')
    let scoreBreakdown = 100 // Inizia da perfetto
    if (analysis.issues.missingTitle) { scoreBreakdown -= 20; console.log('  -20 per titolo mancante') }
    if (analysis.issues.shortTitle) { scoreBreakdown -= 5; console.log('  -5 per titolo corto') }
    if (analysis.issues.missingMetaDescription) { scoreBreakdown -= 15; console.log('  -15 per meta description mancante') }
    if (analysis.issues.shortMetaDescription) { scoreBreakdown -= 5; console.log('  -5 per meta description corta') }
    if (analysis.issues.missingH1) { scoreBreakdown -= 15; console.log('  -15 per H1 mancante') }
    if (analysis.issues.slowLoading) { scoreBreakdown -= 15; console.log('  -15 per caricamento lento') }
    if (analysis.issues.brokenImages) { scoreBreakdown -= 10; console.log('  -10 per immagini rotte') }
    if (analysis.issues.noTracking) { scoreBreakdown -= 20; console.log('  -20 per nessun tracking') }
    if (analysis.issues.noCookieConsent) { scoreBreakdown -= 10; console.log('  -10 per nessun cookie consent') }
    if (analysis.issues.missingPartitaIva) { scoreBreakdown -= 15; console.log('  -15 per P.IVA mancante') }
    if (analysis.issues.noSocialPresence) { scoreBreakdown -= 10; console.log('  -10 per nessuna presenza social') }
    if (!analysis.performance.isResponsive) { scoreBreakdown -= 10; console.log('  -10 per non responsive') }
    if (analysis.issues.httpsIssues) { scoreBreakdown -= 15; console.log('  -15 per problemi HTTPS') }
    
    console.log(`  TOTALE CALCOLATO: ${scoreBreakdown}`)
    console.log(`  SCORE EFFETTIVO: ${analysis.overallScore}`)
    
    if (scoreBreakdown !== analysis.overallScore) {
      console.log('  ⚠️ INCONSISTENZA NEL CALCOLO DEL SCORE!')
      console.log(`  Differenza: ${Math.abs(scoreBreakdown - analysis.overallScore)} punti`)
    } else {
      console.log('  ✅ Score calcolato correttamente')
    }
    
    // Interpretazione del punteggio
    console.log('\n📊 INTERPRETAZIONE SCORE:')
    if (analysis.overallScore >= 90) {
      console.log('  🟢 SITO ECCELLENTE (90-100): Pochissime opportunità di miglioramento')
    } else if (analysis.overallScore >= 70) {
      console.log('  🟡 SITO BUONO (70-89): Alcune opportunità di ottimizzazione')
    } else if (analysis.overallScore >= 50) {
      console.log('  🟠 SITO DISCRETO (50-69): Diverse opportunità di miglioramento')
    } else if (analysis.overallScore >= 30) {
      console.log('  🔴 SITO PROBLEMATICO (30-49): Molte opportunità di business!')
    } else {
      console.log('  🚨 SITO CON GRAVI PROBLEMI (0-29): OTTIMA opportunità di vendita!')
    }
    
  } catch (error) {
    console.error('❌ Errore durante analisi:', error)
  }
  
  await browser.close()
}

testPanamaDesign()
