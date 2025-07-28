/**
 * Configurazioni per il sistema di scraping robusto
 * Gestisce timeout, retry e parametri di stabilità per il Google Maps Scraper
 * Utilizzato da GoogleMapsScraper per ottimizzare performance e affidabilità
 * Parte del modulo services/scraping-engine
 */

export interface ScrapingConfig {
  // Configurazioni browser
  browser: {
    launchTimeout: number
    pageTimeout: number
    navigationTimeout: number
    headless: boolean
    args: string[]
  }
  
  // Configurazioni retry e timeout
  retry: {
    maxAttempts: number
    baseDelay: number
    maxDelay: number
    timeoutMultiplier: number
  }
  
  // Configurazioni caricamento pagina
  pageLoad: {
    strategies: Array<{
      waitUntil: 'domcontentloaded' | 'load' | 'networkidle'
      timeout: number
      description: string
    }>
    contentWaitMin: number
    contentWaitMax: number
    healthCheckTimeout: number
  }
  
  // Configurazioni Google Maps specifiche
  googleMaps: {
    baseUrl: string
    resultSelectors: string[]
    scrollWaitMin: number
    scrollWaitMax: number
    maxResultsPerPage: number
  }
}

export const DEFAULT_SCRAPING_CONFIG: ScrapingConfig = {
  browser: {
    launchTimeout: 60000,
    pageTimeout: 45000,
    navigationTimeout: 30000,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=VizDisplayCompositor',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-images',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--no-first-run',
      '--no-default-browser-check',
      '--memory-pressure-off',
      '--max_old_space_size=4096'
    ]
  },
  
  retry: {
    maxAttempts: 3,
    baseDelay: 3000,
    maxDelay: 15000,
    timeoutMultiplier: 1.5
  },
  
  pageLoad: {
    strategies: [
      { waitUntil: 'domcontentloaded', timeout: 30000, description: 'DOM content loaded' },
      { waitUntil: 'load', timeout: 45000, description: 'Full page load' },
      { waitUntil: 'networkidle', timeout: 25000, description: 'Network idle' }
    ],
    contentWaitMin: 2000,
    contentWaitMax: 4000,
    healthCheckTimeout: 5000
  },
  
  googleMaps: {
    baseUrl: 'https://www.google.com/maps/search/',
    resultSelectors: [
      'div[role="feed"] a[href*="/maps/place/"]',
      'a[data-cid]',
      '.hfpxzc',
      '.Nv2PK .TFQHme a',
      '[jsaction*="pane.selectResult"]',
      'a[href*="/maps/place/"]'
    ],
    scrollWaitMin: 1500,
    scrollWaitMax: 3000,
    maxResultsPerPage: 20
  }
}

/**
 * Ottiene configurazione personalizzata con override per ambiente CI/CD
 */
export function getScrapingConfig(): ScrapingConfig {
  const config = { ...DEFAULT_SCRAPING_CONFIG }
  
  // Override per GitHub Actions e ambienti CI
  if (process.env.GITHUB_ACTIONS === 'true' || process.env.CI === 'true') {
    config.retry.maxAttempts = 5
    config.retry.baseDelay = 5000
    config.browser.launchTimeout = 90000
    config.pageLoad.strategies = [
      { waitUntil: 'domcontentloaded', timeout: 45000, description: 'DOM content loaded (CI)' },
      { waitUntil: 'load', timeout: 60000, description: 'Full page load (CI)' }
    ]
    
    // Aggiungi flag specifici per CI
    config.browser.args.push(
      '--disable-web-security',
      '--disable-features=VizServiceDisplayCompositor',
      '--run-all-compositor-stages-before-draw',
      '--disable-threaded-animation',
      '--disable-threaded-scrolling'
    )
  }
  
  return config
}
