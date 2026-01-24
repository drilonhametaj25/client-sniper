/**
 * Script di test locale per analisi siti web
 * Esegui con: npx ts-node src/test-local-analysis.ts <URL>
 */

import { chromium } from 'playwright'
import { EnhancedWebsiteAnalyzer } from './analyzers/enhanced-website-analyzer'
import { DomainClassifier } from './utils/domain-classifier'
import { EmailScraper } from './utils/email-scraper'

async function testAnalysis(url: string) {
  console.log('═'.repeat(60))
  console.log('🔍 TEST ANALISI LOCALE')
  console.log('═'.repeat(60))
  console.log(`\n📌 URL: ${url}\n`)

  // 1. Domain Classification
  console.log('─'.repeat(60))
  console.log('1️⃣  CLASSIFICAZIONE DOMINIO')
  console.log('─'.repeat(60))

  const domainClassifier = new DomainClassifier()
  const classification = domainClassifier.classify(url)

  console.log(`   Tipo: ${classification.type}`)
  console.log(`   Accettabile: ${classification.isAcceptable ? '✅ Sì' : '❌ No'}`)
  console.log(`   Motivo: ${classification.reason}`)
  console.log(`   Dominio: ${classification.domain}`)
  if (classification.listingName) {
    console.log(`   Directory: ${classification.listingName}`)
  }

  if (!classification.isAcceptable) {
    console.log('\n⚠️  URL non analizzabile (è una directory/listing)')
    console.log('═'.repeat(60))
    return
  }

  // 2. Website Analysis
  console.log('\n' + '─'.repeat(60))
  console.log('2️⃣  ANALISI SITO WEB')
  console.log('─'.repeat(60))

  const analyzer = new EnhancedWebsiteAnalyzer()

  try {
    const startTime = Date.now()
    const analysis = await analyzer.analyzeWebsite(url)
    const analysisTime = Date.now() - startTime

    console.log(`\n   ⏱️  Tempo analisi: ${analysisTime}ms`)
    console.log(`   🌐 Accessibile: ${analysis.isAccessible ? '✅ Sì' : '❌ No'}`)
    console.log(`   🔒 SSL: ${analysis.hasSSL ? '✅ Sì' : '❌ No'}`)
    console.log(`   📊 Score Complessivo: ${analysis.overallScore}/100`)

    // SEO
    console.log('\n   📈 SEO:')
    console.log(`      Title: ${analysis.seo.hasTitle ? '✅' : '❌'} ${analysis.seo.title ? `"${analysis.seo.title.substring(0, 50)}${analysis.seo.title.length > 50 ? '...' : ''}"` : '(mancante)'}`)
    console.log(`      Meta Description: ${analysis.seo.hasMetaDescription ? '✅' : '❌'} (${analysis.seo.metaDescriptionLength} chars)`)
    console.log(`      H1: ${analysis.seo.hasH1 ? '✅' : '❌'} (${analysis.seo.h1Count} trovati)`)
    console.log(`      Structured Data: ${analysis.seo.hasStructuredData ? '✅' : '❌'}`)
    console.log(`      Open Graph: ${analysis.seo.hasOpenGraph ? '✅' : '❌'}`)
    console.log(`      Twitter Card: ${analysis.seo.hasTwitterCard ? '✅' : '❌'}`)

    // Performance
    console.log('\n   ⚡ Performance:')
    const perf = analysis.performance
    console.log(`      Load Time: ${perf.loadComplete || 'N/A'}ms`)
    console.log(`      Speed Score: ${perf.speedScore}/100`)
    console.log(`      TTFB: ${perf.ttfb ? `${perf.ttfb}ms` : 'N/A'}`)
    console.log(`      FCP: ${perf.fcp ? `${perf.fcp}ms` : 'N/A'}`)
    console.log(`      LCP: ${perf.lcp ? `${perf.lcp}ms` : 'N/A'}`)
    console.log(`      INP: ${perf.inp ? `${perf.inp}ms` : 'N/A'}`)
    console.log(`      CLS: ${perf.cls ?? 'N/A'}`)

    // Tracking Pixels
    console.log('\n   📊 Tracking Pixels:')
    console.log(`      Google Analytics: ${analysis.tracking.googleAnalytics ? '✅' : '❌'}`)
    console.log(`      Google Tag Manager: ${analysis.tracking.googleTagManager ? '✅' : '❌'}`)
    console.log(`      Facebook Pixel: ${analysis.tracking.facebookPixel ? '✅' : '❌'}`)
    console.log(`      TikTok Pixel: ${analysis.tracking.tiktokPixel ? '✅' : '❌'}`)
    console.log(`      LinkedIn Insight: ${analysis.tracking.linkedInInsightTag ? '✅' : '❌'}`)
    console.log(`      Snapchat Pixel: ${analysis.tracking.snapchatPixel ? '✅' : '❌'}`)
    console.log(`      Pinterest Tag: ${analysis.tracking.pinterestTag ? '✅' : '❌'}`)
    console.log(`      Hotjar: ${analysis.tracking.hotjar ? '✅' : '❌'}`)
    console.log(`      Microsoft Clarity: ${analysis.tracking.clarity ? '✅' : '❌'}`)
    console.log(`      Custom Pixels: ${analysis.tracking.customPixels?.length || 0}`)
    console.log(`      Score Tracking: ${analysis.tracking.trackingScore}/100`)

    // GDPR
    console.log('\n   🛡️ GDPR/Privacy:')
    console.log(`      Cookie Banner: ${analysis.gdpr.hasCookieBanner ? '✅' : '❌'}`)
    console.log(`      Privacy Policy: ${analysis.gdpr.hasPrivacyPolicy ? '✅' : '❌'}`)
    console.log(`      Terms of Service: ${analysis.gdpr.hasTermsOfService ? '✅' : '❌'}`)
    console.log(`      P.IVA/VAT: ${analysis.gdpr.hasVatNumber ? '✅' : '❌'} ${analysis.gdpr.vatNumbers?.length ? `(${analysis.gdpr.vatNumbers.join(', ')})` : ''}`)
    console.log(`      Score GDPR: ${analysis.gdpr.gdprScore}/100`)

    // Mobile
    console.log('\n   📱 Mobile:')
    console.log(`      Mobile Friendly: ${analysis.mobile.isMobileFriendly ? '✅' : '❌'}`)
    console.log(`      Viewport Meta: ${analysis.mobile.hasViewportMeta ? '✅' : '❌'}`)
    console.log(`      Score Mobile: ${analysis.mobile.mobileScore}/100`)

    // Images
    console.log('\n   🖼️ Immagini:')
    console.log(`      Totale: ${analysis.images.total}`)
    console.log(`      Senza Alt: ${analysis.images.withoutAlt}`)
    console.log(`      Rotte: ${analysis.images.broken}`)

    // Tech Stack
    if (analysis.techStack) {
      console.log('\n   🔧 Tech Stack:')
      if (analysis.techStack.cms) console.log(`      CMS: ${analysis.techStack.cms}`)
      if (analysis.techStack.framework) console.log(`      Framework: ${analysis.techStack.framework}`)
      if (analysis.techStack.hosting) console.log(`      Hosting: ${analysis.techStack.hosting}`)
    }

    // 3. Email Scraping
    console.log('\n' + '─'.repeat(60))
    console.log('3️⃣  ESTRAZIONE EMAIL')
    console.log('─'.repeat(60))

    const browser = await chromium.launch({ headless: true })
    try {
      const emailScraper = new EmailScraper()
      const emailResult = await emailScraper.scrapeEmails(url, browser)

      console.log(`\n   📧 Email trovate: ${emailResult.emails.length}`)
      if (emailResult.primaryEmail) {
        console.log(`   📧 Email principale: ${emailResult.primaryEmail}`)
      }
      if (emailResult.sources.length > 0) {
        console.log(`   📋 Lista email:`)
        emailResult.sources.forEach((source, i) => {
          console.log(`      ${i + 1}. ${source.email} (${source.context}, confidence: ${source.confidence}%)`)
        })
      }
      console.log(`   📄 Pagine scansionate: ${emailResult.scrapedPages.join(', ') || 'homepage'}`)
      console.log(`   ⏱️  Tempo: ${emailResult.totalTimeMs}ms`)
    } finally {
      await browser.close()
    }

    // Summary
    console.log('\n' + '═'.repeat(60))
    console.log('📋 RIEPILOGO OPPORTUNITÀ')
    console.log('═'.repeat(60))

    const opportunities: string[] = []

    if (!analysis.seo.hasTitle) opportunities.push('❌ Manca il Tag Title')
    if (!analysis.seo.hasMetaDescription) opportunities.push('❌ Manca la Meta Description')
    if (!analysis.seo.hasH1) opportunities.push('❌ Manca il Tag H1')
    if (!analysis.seo.hasStructuredData) opportunities.push('⚠️ Mancano i Dati Strutturati')
    if (!analysis.tracking.googleAnalytics) opportunities.push('⚠️ Manca Google Analytics')
    if (!analysis.tracking.facebookPixel) opportunities.push('⚠️ Manca Facebook Pixel')
    if (!analysis.gdpr.hasCookieBanner) opportunities.push('❌ Manca Cookie Banner (GDPR)')
    if (!analysis.gdpr.hasPrivacyPolicy) opportunities.push('❌ Manca Privacy Policy')
    if (!analysis.gdpr.hasVatNumber) opportunities.push('⚠️ P.IVA non visibile')
    if (!analysis.mobile.isMobileFriendly) opportunities.push('❌ Non è Mobile Friendly')
    if (perf.loadComplete && perf.loadComplete > 3000) opportunities.push(`⚠️ Lento (${Math.round(perf.loadComplete/1000)}s)`)
    if (analysis.images.broken > 0) opportunities.push(`⚠️ ${analysis.images.broken} immagini rotte`)

    if (opportunities.length > 0) {
      opportunities.forEach(opp => console.log(`   ${opp}`))
      console.log(`\n   🎯 Totale opportunità: ${opportunities.length}`)
    } else {
      console.log('   ✅ Nessun problema critico rilevato!')
    }

    // Suggested roles
    const roles: string[] = []
    if (!analysis.seo.hasTitle || !analysis.seo.hasMetaDescription || !analysis.seo.hasStructuredData) {
      roles.push('SEO Specialist')
    }
    if (!analysis.tracking.googleAnalytics || !analysis.tracking.facebookPixel) {
      roles.push('Digital Marketing')
    }
    if (!analysis.gdpr.hasCookieBanner || !analysis.gdpr.hasPrivacyPolicy) {
      roles.push('GDPR Consultant')
    }
    if (!analysis.mobile.isMobileFriendly || (perf.loadComplete && perf.loadComplete > 3000)) {
      roles.push('Web Developer')
    }

    if (roles.length > 0) {
      console.log(`\n   👥 Ruoli consigliati: ${roles.join(', ')}`)
    }

  } catch (error) {
    console.error('\n❌ Errore durante l\'analisi:', error)
  }

  console.log('\n' + '═'.repeat(60))
  console.log('✅ TEST COMPLETATO')
  console.log('═'.repeat(60))
}

// Main
const url = process.argv[2]
if (!url) {
  console.log('Uso: npx ts-node src/test-local-analysis.ts <URL>')
  console.log('Esempio: npx ts-node src/test-local-analysis.ts https://www.example.com')
  process.exit(1)
}

testAnalysis(url).catch(console.error)
