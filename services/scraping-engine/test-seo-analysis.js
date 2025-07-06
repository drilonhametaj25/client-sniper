/**
 * Test specifico per debug dell'analisi SEO
 * Verifica che vengano estratti correttamente title, meta description, H1, ecc.
 */

const { chromium } = require('playwright')

async function testSEOAnalysis() {
  console.log('🧪 Test analisi SEO specifica')
  
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  
  try {
    // Test del sito che funziona ma viene analizzato male
    const url = 'https://www.notaiosantosuosso.it/'
    console.log(`\n📍 Analisi SEO per: ${url}`)
    
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    
    // Estrai tutti i dati SEO come fa il nostro analyzer
    const seoData = await page.evaluate(() => {
      // Title
      const titleEl = document.querySelector('title')
      const title = titleEl?.textContent?.trim() || ''
      
      // Meta description
      const metaDesc = document.querySelector('meta[name="description"]')
      const description = metaDesc?.getAttribute('content')?.trim() || ''
      
      // H tags
      const h1Elements = Array.from(document.querySelectorAll('h1'))
      const h2Elements = Array.from(document.querySelectorAll('h2'))
      const h1Text = h1Elements.map(el => el.textContent?.trim() || '')
      
      // Other meta tags
      const robotsMeta = document.querySelector('meta[name="robots"]')
      const canonical = document.querySelector('link[rel="canonical"]')
      const ogTitle = document.querySelector('meta[property="og:title"]')
      const twitterCard = document.querySelector('meta[name="twitter:card"]')
      
      // Viewport per mobile
      const viewport = document.querySelector('meta[name="viewport"]')
      
      // GDPR/Privacy
      const privacyLinks = Array.from(document.querySelectorAll('a')).filter(a => 
        a.textContent?.toLowerCase().includes('privacy') || 
        a.textContent?.toLowerCase().includes('cookie') ||
        a.href?.toLowerCase().includes('privacy')
      )
      
      // Contact info
      const contactInfo = document.body.textContent || ''
      const hasVAT = /P\.?\s*IVA|VAT|Partita\s+IVA/i.test(contactInfo)
      const hasEmail = /@[\w.-]+\.[a-zA-Z]{2,}/g.test(contactInfo)
      const hasPhone = /\+?[0-9\s\-\(\)]{8,}/g.test(contactInfo)
      
      return {
        title,
        titleLength: title.length,
        description,
        descriptionLength: description.length,
        h1Text,
        h1Count: h1Elements.length,
        h2Count: h2Elements.length,
        hasRobotsTag: !!robotsMeta,
        hasCanonical: !!canonical,
        hasOpenGraph: !!ogTitle,
        hasTwitterCard: !!twitterCard,
        hasViewport: !!viewport,
        privacyLinksCount: privacyLinks.length,
        hasVAT,
        hasEmail,
        hasPhone,
        bodyTextLength: contactInfo.length
      }
    })
    
    console.log('\n📊 Risultati analisi SEO:')
    console.log(`Title: "${seoData.title}" (${seoData.titleLength} chars)`)
    console.log(`Meta Description: "${seoData.description}" (${seoData.descriptionLength} chars)`)
    console.log(`H1 Count: ${seoData.h1Count}`)
    console.log(`H1 Text: ${seoData.h1Text.join(', ')}`)
    console.log(`H2 Count: ${seoData.h2Count}`)
    console.log(`Robots Tag: ${seoData.hasRobotsTag}`)
    console.log(`Canonical: ${seoData.hasCanonical}`)
    console.log(`Open Graph: ${seoData.hasOpenGraph}`)
    console.log(`Twitter Card: ${seoData.hasTwitterCard}`)
    console.log(`Viewport: ${seoData.hasViewport}`)
    console.log(`Privacy Links: ${seoData.privacyLinksCount}`)
    console.log(`Has VAT: ${seoData.hasVAT}`)
    console.log(`Has Email: ${seoData.hasEmail}`)
    console.log(`Has Phone: ${seoData.hasPhone}`)
    console.log(`Body Text Length: ${seoData.bodyTextLength}`)
    
    // Verifica performance
    const performanceData = await page.evaluate(() => {
      const performance = window.performance
      const navigation = performance.getEntriesByType('navigation')[0]
      return {
        loadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
        domReady: navigation ? navigation.domContentLoadedEventEnd - navigation.fetchStart : 0,
        resourcesCount: performance.getEntriesByType('resource').length
      }
    })
    
    console.log('\n⚡ Performance:')
    console.log(`Load Time: ${performanceData.loadTime}ms`)
    console.log(`DOM Ready: ${performanceData.domReady}ms`)
    console.log(`Resources: ${performanceData.resourcesCount}`)
    
  } catch (error) {
    console.error('❌ Errore durante test:', error)
  } finally {
    await browser.close()
  }
}

// Esegui test
testSEOAnalysis().catch(console.error)
