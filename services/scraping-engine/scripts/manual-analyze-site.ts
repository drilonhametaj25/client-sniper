/**
 * Script CLI per analisi manuale di un sito web
 * Usa EnhancedWebsiteAnalyzer e SocialAnalyzer
 * Esegue l'analisi completa e stampa il risultato a console
 *
 * Usage: npx ts-node scripts/manual-analyze-site.ts <url>
 */
import { EnhancedWebsiteAnalyzer } from '../src/analyzers/enhanced-website-analyzer'
import { SocialAnalyzer } from '../src/analyzers/social-analyzer'
import { chromium } from 'playwright'

async function main() {
  const url = process.argv[2]
  if (!url) {
    console.error('Usage: npx ts-node scripts/manual-analyze-site.ts <url>')
    process.exit(1)
  }
  const analyzer = new EnhancedWebsiteAnalyzer()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    // Analisi sito web
    const analysis = await analyzer.analyzeWebsite(url)
    // Analisi social
    await page.goto(analysis.finalUrl, { waitUntil: 'networkidle', timeout: 30000 })
    const socialAnalyzer = new SocialAnalyzer()
    const social = await socialAnalyzer.analyzeSocials(page)
    // Output
    console.log('--- ANALISI SITO ---')
    console.dir(analysis, { depth: null })
    console.log('--- SOCIAL ---')
    console.dir(social, { depth: null })
  } catch (e) {
    console.error('Errore durante analisi:', e)
  } finally {
    await page.close()
    await browser.close()
  }
}

main()
