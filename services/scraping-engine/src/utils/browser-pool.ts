/**
 * Browser Pool Manager
 * Gestisce un pool di istanze browser Playwright per ottimizzare performance
 * Riusa browser invece di crearne uno nuovo per ogni analisi
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright'

interface PooledBrowser {
  browser: Browser
  inUse: boolean
  createdAt: Date
  usageCount: number
}

interface BrowserPoolOptions {
  maxBrowsers: number
  maxUsagePerBrowser: number // Recycla browser dopo N usi
  maxAgeMinutes: number // Recycla browser dopo N minuti
  headless: boolean
  defaultTimeout: number
}

const DEFAULT_OPTIONS: BrowserPoolOptions = {
  maxBrowsers: 5,
  maxUsagePerBrowser: 50,
  maxAgeMinutes: 30,
  headless: true,
  defaultTimeout: 30000
}

export class BrowserPool {
  private pool: PooledBrowser[] = []
  private options: BrowserPoolOptions
  private isShuttingDown = false
  private initPromise: Promise<void> | null = null

  constructor(options: Partial<BrowserPoolOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Initialize the pool with minimum browsers
   */
  async initialize(minBrowsers: number = 1): Promise<void> {
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      const promises = []
      for (let i = 0; i < Math.min(minBrowsers, this.options.maxBrowsers); i++) {
        promises.push(this.createBrowser())
      }
      await Promise.all(promises)
      console.log(`[BrowserPool] Initialized with ${this.pool.length} browsers`)
    })()

    return this.initPromise
  }

  /**
   * Create a new browser instance
   */
  private async createBrowser(): Promise<PooledBrowser> {
    const browser = await chromium.launch({
      headless: this.options.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    })

    const pooledBrowser: PooledBrowser = {
      browser,
      inUse: false,
      createdAt: new Date(),
      usageCount: 0
    }

    this.pool.push(pooledBrowser)
    return pooledBrowser
  }

  /**
   * Acquire a browser from the pool
   */
  async acquire(): Promise<Browser> {
    if (this.isShuttingDown) {
      throw new Error('BrowserPool is shutting down')
    }

    // Clean up old/overused browsers
    await this.cleanup()

    // Find available browser
    let pooledBrowser = this.pool.find(pb => !pb.inUse)

    // If no available browser and pool not full, create new one
    if (!pooledBrowser && this.pool.length < this.options.maxBrowsers) {
      pooledBrowser = await this.createBrowser()
    }

    // If still no browser, wait for one to become available
    if (!pooledBrowser) {
      pooledBrowser = await this.waitForAvailable()
    }

    pooledBrowser.inUse = true
    pooledBrowser.usageCount++

    return pooledBrowser.browser
  }

  /**
   * Release a browser back to the pool
   */
  release(browser: Browser): void {
    const pooledBrowser = this.pool.find(pb => pb.browser === browser)
    if (pooledBrowser) {
      pooledBrowser.inUse = false
    }
  }

  /**
   * Wait for a browser to become available
   */
  private async waitForAvailable(timeoutMs: number = 30000): Promise<PooledBrowser> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      const available = this.pool.find(pb => !pb.inUse)
      if (available) return available

      // Wait a bit and try again
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    throw new Error('Timeout waiting for available browser')
  }

  /**
   * Create a new page with context
   */
  async createPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'it-IT',
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true
    })

    context.setDefaultTimeout(this.options.defaultTimeout)

    const page = await context.newPage()

    // Block unnecessary resources
    await page.route('**/*.{png,jpg,jpeg,gif,svg,webp,ico,woff,woff2,ttf,otf}', route => {
      route.abort()
    })

    return { context, page }
  }

  /**
   * Execute a task with automatic browser management
   */
  async withBrowser<T>(task: (browser: Browser) => Promise<T>): Promise<T> {
    const browser = await this.acquire()
    try {
      return await task(browser)
    } finally {
      this.release(browser)
    }
  }

  /**
   * Execute a task with automatic page management
   */
  async withPage<T>(task: (page: Page) => Promise<T>): Promise<T> {
    const browser = await this.acquire()
    const { context, page } = await this.createPage(browser)

    try {
      return await task(page)
    } finally {
      await page.close().catch(() => {})
      await context.close().catch(() => {})
      this.release(browser)
    }
  }

  /**
   * Clean up old or overused browsers
   */
  private async cleanup(): Promise<void> {
    const now = new Date()
    const toRemove: PooledBrowser[] = []

    for (const pb of this.pool) {
      if (pb.inUse) continue

      const ageMinutes = (now.getTime() - pb.createdAt.getTime()) / (1000 * 60)
      const shouldRemove =
        pb.usageCount >= this.options.maxUsagePerBrowser ||
        ageMinutes >= this.options.maxAgeMinutes

      if (shouldRemove) {
        toRemove.push(pb)
      }
    }

    // Close and remove old browsers
    for (const pb of toRemove) {
      try {
        await pb.browser.close()
      } catch {
        // Ignore close errors
      }
      const index = this.pool.indexOf(pb)
      if (index > -1) {
        this.pool.splice(index, 1)
      }
    }

    if (toRemove.length > 0) {
      console.log(`[BrowserPool] Cleaned up ${toRemove.length} browsers`)
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalBrowsers: number
    availableBrowsers: number
    inUseBrowsers: number
    totalUsage: number
    avgAge: number
  } {
    const available = this.pool.filter(pb => !pb.inUse).length
    const inUse = this.pool.filter(pb => pb.inUse).length
    const totalUsage = this.pool.reduce((sum, pb) => sum + pb.usageCount, 0)
    const now = new Date()
    const avgAge = this.pool.length > 0
      ? this.pool.reduce((sum, pb) => sum + (now.getTime() - pb.createdAt.getTime()), 0) / this.pool.length / 1000 / 60
      : 0

    return {
      totalBrowsers: this.pool.length,
      availableBrowsers: available,
      inUseBrowsers: inUse,
      totalUsage,
      avgAge: Math.round(avgAge * 10) / 10
    }
  }

  /**
   * Shutdown the pool and close all browsers
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true
    console.log('[BrowserPool] Shutting down...')

    // Wait for in-use browsers to be released (with timeout)
    const waitStart = Date.now()
    while (this.pool.some(pb => pb.inUse) && Date.now() - waitStart < 30000) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Close all browsers
    const closePromises = this.pool.map(async pb => {
      try {
        await pb.browser.close()
      } catch {
        // Ignore close errors
      }
    })

    await Promise.all(closePromises)
    this.pool = []

    console.log('[BrowserPool] Shutdown complete')
  }
}

// Singleton instance for global use
let globalPool: BrowserPool | null = null

export function getGlobalBrowserPool(options?: Partial<BrowserPoolOptions>): BrowserPool {
  if (!globalPool) {
    globalPool = new BrowserPool(options)
  }
  return globalPool
}

export async function shutdownGlobalPool(): Promise<void> {
  if (globalPool) {
    await globalPool.shutdown()
    globalPool = null
  }
}
