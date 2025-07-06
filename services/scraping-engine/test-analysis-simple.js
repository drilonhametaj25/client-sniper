/**
 * Test semplificato per verificare che l'analisi funzioni correttamente
 */

const { chromium } = require('playwright')

async function testAnalysisSimple() {
  console.log('🧪 Test analisi semplificato')
  
  const browser = await chromium.launch({ headless: false })
  
  try {
    // Test il sito che dovrebbe funzionare
    const url = 'https://www.notaiosantosuosso.it/'
    console.log(`📍 Test diretto: ${url}`)
    
    const page = await browser.newPage()
    
    // Configura come fa il nostro analyzer
    await page.context().addInitScript(() => {
      delete window.webdriver
    })
    
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
    })
    
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' })
    
    console.log('✅ Navigazione riuscita')
    console.log(`Status: ${response.status()}`)
    
    // Analisi come fa il nostro sistema
    const analysis = await page.evaluate(() => {
      // SEO
      const titleEl = document.querySelector('title')
      const title = titleEl?.textContent?.trim() || ''
      
      const metaDesc = document.querySelector('meta[name="description"]')
      const description = metaDesc?.getAttribute('content')?.trim() || ''
      
      const h1Elements = Array.from(document.querySelectorAll('h1'))
      const h1Count = h1Elements.length
      
      // GDPR
      const privacyLinks = Array.from(document.querySelectorAll('a')).filter(a => 
        a.textContent?.toLowerCase().includes('privacy') || 
        a.href?.toLowerCase().includes('privacy')
      )
      
      // Tracking
      const bodyText = document.body.innerHTML
      const hasGoogleAnalytics = /google-analytics|gtag|ga\(|UA-\d|G-[A-Z0-9]/i.test(bodyText)
      const hasFacebookPixel = /facebook|fbq|pixel/i.test(bodyText)
      
      // Mobile
      const viewport = document.querySelector('meta[name="viewport"]')
      
      // VAT
      const allText = document.body.textContent || ''
      const hasVAT = /P\.?\s*IVA|VAT|Partita\s+IVA/i.test(allText)
      
      return {
        // SEO
        title,
        titleLength: title.length,
        hasTitle: title.length > 0,
        description,
        descriptionLength: description.length,
        hasMetaDescription: description.length > 0,
        h1Count,
        hasH1: h1Count > 0,
        
        // GDPR
        privacyLinksCount: privacyLinks.length,
        hasPrivacyPolicy: privacyLinks.length > 0,
        hasVAT,
        
        // Tracking
        hasGoogleAnalytics,
        hasFacebookPixel,
        
        // Mobile
        hasViewport: !!viewport,
        
        // Basic
        isAccessible: true,
        hasSSL: location.protocol === 'https:'
      }
    })
    
    console.log('\n📊 Analisi risultati:')
    console.log(`🏠 Sito accessibile: ${analysis.isAccessible}`)
    console.log(`🔒 SSL: ${analysis.hasSSL}`)
    console.log(`📄 Title: "${analysis.title}" (${analysis.titleLength} chars) - Presente: ${analysis.hasTitle}`)
    console.log(`📝 Meta Description: "${analysis.description.substring(0, 50)}..." (${analysis.descriptionLength} chars) - Presente: ${analysis.hasMetaDescription}`)
    console.log(`🏷️ H1 Tags: ${analysis.h1Count} - Presente: ${analysis.hasH1}`)
    console.log(`🔐 Privacy Policy: ${analysis.hasPrivacyPolicy} (${analysis.privacyLinksCount} links)`)
    console.log(`💼 VAT Number: ${analysis.hasVAT}`)
    console.log(`📱 Mobile Viewport: ${analysis.hasViewport}`)
    console.log(`📊 Google Analytics: ${analysis.hasGoogleAnalytics}`)
    console.log(`📘 Facebook Pixel: ${analysis.hasFacebookPixel}`)
    
    // Simulazione logica di generazione opportunità
    const issues = []
    const opportunities = []
    
    if (!analysis.hasTitle) {
      issues.push('❌ Missing title')
      opportunities.push('Missing page title')
    } else {
      console.log('✅ Title presente e rilevato correttamente')
    }
    
    if (!analysis.hasMetaDescription) {
      issues.push('❌ Missing meta description')
      opportunities.push('Missing meta description')
    } else {
      console.log('✅ Meta description presente e rilevata correttamente')
    }
    
    if (!analysis.hasH1) {
      issues.push('❌ Missing H1')
      opportunities.push('Missing H1 tag')
    } else {
      console.log('✅ H1 tag presente e rilevato correttamente')
    }
    
    if (!analysis.hasPrivacyPolicy) {
      issues.push('❌ Missing privacy policy')
      opportunities.push('Missing privacy policy')
    } else {
      console.log('✅ Privacy policy presente e rilevata correttamente')
    }
    
    if (!analysis.hasVAT) {
      issues.push('❌ Missing VAT number')
      opportunities.push('Missing VAT number')
    } else {
      console.log('✅ VAT number presente e rilevato correttamente')
    }
    
    if (!analysis.hasGoogleAnalytics) {
      issues.push('❌ Missing Google Analytics')
      opportunities.push('No analytics tracking detected')
    } else {
      console.log('✅ Google Analytics presente e rilevato correttamente')
    }
    
    console.log('\n🎯 Risultato finale:')
    console.log(`Issues trovati: ${issues.length}`)
    console.log(`Opportunità generate: ${opportunities.length}`)
    
    if (issues.length > 0) {
      console.log('❌ PROBLEMI RILEVATI:')
      issues.forEach(issue => console.log(`  ${issue}`))
    } else {
      console.log('✅ NESSUN PROBLEMA RILEVATO - Il sito è ben strutturato!')
    }
    
    await page.close()
    
  } catch (error) {
    console.error('❌ Errore durante test:', error)
  } finally {
    await browser.close()
  }
}

// Esegui test
testAnalysisSimple().catch(console.error)
