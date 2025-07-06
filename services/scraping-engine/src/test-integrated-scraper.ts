/**
 * Test completo per il Google Maps Scraper integrato con i nuovi analyzer
 * Verifica l'integrazione di tutti i moduli avanzati e la compatibilità
 * Test end-to-end per la pipeline di scraping e analisi enterprise
 * 
 * Utilizzato per validare l'integrazione dei nuovi moduli
 * Parte del modulo services/scraping-engine
 */

import { GoogleMapsScraper } from './scrapers/google-maps-improved'
import { EnhancedWebsiteAnalyzer } from './analyzers/enhanced-website-analyzer'
import { BusinessContactParser } from './utils/business-contact-parser'
import { WebsiteStatusChecker } from './utils/website-status-checker'
import { TechStackDetector } from './utils/tech-stack-detector'
import { PerformanceAnalyzer } from './utils/performance-analyzer'

async function testQuickIntegration() {
  console.log('🚀 Test Rapido - Solo Moduli Base')
  console.log('=====================================')
  
  // Test 1: Parsing contatti
  console.log('\n📞 Test BusinessContactParser')
  const contactParser = new BusinessContactParser()
  const testText = 'Ristorante Mario, Via Roma 123, Milano. Tel: 02-1234567 Email: mario@ristorante.it P.IVA: 12345678901'
  const parsedContacts = contactParser.parseContacts(testText)
  console.log('✅ Contatti estratti:', {
    telefoni: parsedContacts.phones.length,
    email: parsedContacts.emails.length,
    pIva: parsedContacts.vatNumbers.length
  })
  
  // Test 2: Status checker con URL sicuro
  console.log('\n🌐 Test WebsiteStatusChecker')
  const statusChecker = new WebsiteStatusChecker()
  try {
    const status = await statusChecker.checkWebsiteStatus('https://www.google.com')
    console.log('✅ Status check Google:', {
      status: status.status,
      accessibile: status.isAccessible,
      SSL: status.sslValid,
      tempo: `${status.responseTime}ms`
    })
  } catch (error) {
    console.log('⚠️ Status check fallito, ma gestito correttamente')
  }
  
  // Test 3: Tech detector
  console.log('\n🔧 Test TechStackDetector')
  const techDetector = new TechStackDetector()
  const testHtml = `<html><head><meta name="generator" content="WordPress 6.0"></head></html>`
  const techStack = await techDetector.detectTechStack(testHtml, {}, [])
  console.log('✅ Tech stack rilevato:', {
    CMS: techStack.cms || 'Non rilevato',
    framework: techStack.framework || 'Non rilevato',
    analytics: techStack.analytics.length
  })
  
  console.log('\n✅ Test rapido completato!')
}

async function testIntegratedGoogleMapsScraper() {
  console.log('🧪 Test integrazione Google Maps Scraper + Enhanced Analyzers')
  console.log('========================================================')
  
  // Test 1: Verifica parsing contatti avanzato
  console.log('\n1. 📞 Test BusinessContactParser')
  const contactParser = new BusinessContactParser()
  const testText = 'Ristorante Mario, Via Roma 123, Milano. Tel: 02-1234567 Email: mario@ristorante.it P.IVA: 12345678901'
  const parsedContacts = contactParser.parseContacts(testText)
  console.log('Contatti estratti:', parsedContacts)
  
  // Test 2: Verifica stato del sito
  console.log('\n2. 🌐 Test WebsiteStatusChecker')
  const statusChecker = new WebsiteStatusChecker()
  const testUrls = ['https://www.google.com', 'https://httpstat.us/404', 'https://nonexistent-domain-12345.com', 'https://www.asos.com/it/']
  
  for (const url of testUrls) {
    try {
      const status = await statusChecker.checkWebsiteStatus(url)
      console.log(`${url}: ${status.status} (${status.httpCode}) - ${status.isAccessible ? 'Accessibile' : 'Non accessibile'}`)
    } catch (error) {
      console.log(`${url}: Errore - ${(error as Error).message}`)
    }
  }
  
  // Test 3: Verifica rilevamento tech stack
  console.log('\n3. 🔧 Test TechStackDetector')
  const techDetector = new TechStackDetector()
  const testHtml = `
    <html>
      <head>
        <title>Test Site</title>
        <meta name="generator" content="WordPress 6.0">
        <link rel="stylesheet" href="wp-content/themes/twentytwentyone/style.css">
        <script src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
      </head>
      <body>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'GA_MEASUREMENT_ID');
        </script>
      </body>
    </html>
  `
  
  const techStack = techDetector.detectTechStack(testHtml, {}, [])
  console.log('Tech stack rilevato:', techStack)
  
  // Test 4: Test completo Enhanced Website Analyzer
  console.log('\n4. 🎯 Test EnhancedWebsiteAnalyzer')
  const enhancedAnalyzer = new EnhancedWebsiteAnalyzer()
  try {
    const analysis = await enhancedAnalyzer.analyzeWebsite('https://www.google.com')
    console.log('Analisi completa:', {
      url: analysis.url,
      isAccessible: analysis.isAccessible,
      overallScore: analysis.overallScore,
      seoScore: analysis.seo ? 'Presente' : 'Non presente',
      performanceScore: analysis.performance ? 'Presente' : 'Non presente',
      trackingScore: analysis.tracking?.trackingScore,
      gdprScore: analysis.gdpr?.gdprScore
    })
  } catch (error) {
    console.log('Errore analisi enhanced:', (error as Error).message)
  }
  
  // Test 6: Test integrazione Google Maps Scraper
  console.log('\n6. 🗺️ Test GoogleMapsScraper integrato')
  const scraper = new GoogleMapsScraper()
  
  try {
    const result = await scraper.scrape({
      query: 'pizza',
      location: 'Milano',
      category: 'ristorante',
      maxResults: 1, // Ridotto per test più veloce
      enableSiteAnalysis: true
    })
    
    console.log('Risultati scraping:', {
      totalFound: result.leads.length,
      avgAnalysisTime: result.avgAnalysisTime,
      leadsAnalyzed: result.leads.filter(l => l.websiteAnalysis?.isAccessible).length
    })
    
    // Mostra dettagli primo lead
    if (result.leads.length > 0) {
      const firstLead = result.leads[0]
      console.log('\nPrimo lead:', {
        businessName: firstLead.businessName,
        contacts: firstLead.contacts,
        score: firstLead.score,
        opportunities: firstLead.opportunities?.slice(0, 3), // Prime 3 opportunità
        websiteAnalysis: firstLead.websiteAnalysis ? {
          isAccessible: firstLead.websiteAnalysis.isAccessible,
          overallScore: firstLead.websiteAnalysis.overallScore,
          seoScore: firstLead.websiteAnalysis.seo ? 'Presente' : 'Non presente',
          performanceScore: firstLead.websiteAnalysis.performance ? 'Presente' : 'Non presente'
        } : 'N/A'
      })
    }
    
  } catch (error) {
    console.log('Errore scraping:', (error as Error).message)
  }
  
  console.log('\n✅ Test completato!')
}

async function testEnhancedAnalysisCompatibility() {
  console.log('\n🔄 Test compatibilità analisi legacy vs enhanced')
  console.log('================================================')
  
  // Test URLs stabili per testing
  const testUrls = [
    'https://www.google.com',
    'https://example.com'
  ]
  
  const enhancedAnalyzer = new EnhancedWebsiteAnalyzer()
  
  for (const url of testUrls) {
    try {
      console.log(`\n📊 Analizzando: ${url}`)
      const analysis = await enhancedAnalyzer.analyzeWebsite(url)
      
      console.log('Risultati:', {
        accessible: analysis.isAccessible,
        overallScore: analysis.overallScore,
        hasSEO: !!analysis.seo,
        hasPerformance: !!analysis.performance,
        hasTracking: !!analysis.tracking,
        hasGDPR: !!analysis.gdpr,
        hasTechStack: !!analysis.techStack,
        hasImages: !!analysis.images,
        hasMobile: !!analysis.mobile,
        hasContent: !!analysis.content,
        hasBusinessInfo: !!analysis.content,
        hasOpportunities: !!analysis.opportunities,
        issuesCount: analysis.issues ? Object.keys(analysis.issues).length : 0
      })
      
    } catch (error) {
      console.log(`❌ Errore per ${url}: ${(error as Error).message}`)
    }
  }
}

// Esegui test se chiamato direttamente
if (require.main === module) {
  testQuickIntegration()
    .then(() => testIntegratedGoogleMapsScraper())
    .then(() => testEnhancedAnalysisCompatibility())
    .catch(console.error)
}

export { testQuickIntegration, testIntegratedGoogleMapsScraper, testEnhancedAnalysisCompatibility }
