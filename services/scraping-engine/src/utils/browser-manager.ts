/**
 * Browser Manager - Gestione pool di browser Playwright con cleanup automatico
 * Risolve memory leak e ottimizza performance per scraping
 * Utilizzato da: EnhancedWebsiteAnalyzer, RealSiteAnalyzer
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';

interface BrowserInstance {
  browser: Browser;
  context: BrowserContext;
  lastUsed: Date;
  isActive: boolean;
}

export class BrowserManager {
  private static instance: BrowserManager;
  private browsers: Map<string, BrowserInstance> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  private maxBrowsers = 3;
  private maxIdleTime = 5 * 60 * 1000; // 5 minuti
  private logger = {
    info: (...args: any[]) => console.info('[BrowserManager]', ...args),
    warn: (...args: any[]) => console.warn('[BrowserManager]', ...args),
    error: (...args: any[]) => console.error('[BrowserManager]', ...args)
  };

  private constructor() {
    // Cleanup automatico ogni 2 minuti
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleBrowsers();
    }, 2 * 60 * 1000);
    
    // Cleanup al termine del processo
    process.on('exit', () => this.cleanup());
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  /**
   * Ottiene un browser dal pool o ne crea uno nuovo
   */
  async getBrowser(id: string = 'default'): Promise<{ browser: Browser; context: BrowserContext }> {
    try {
      // Controlla se esiste già un browser attivo
      const existing = this.browsers.get(id);
      if (existing && existing.browser.isConnected() && !existing.isActive) {
        existing.lastUsed = new Date();
        existing.isActive = true;
        this.logger.info(`Riutilizzo browser esistente: ${id}`);
        return { browser: existing.browser, context: existing.context };
      }

      // Rimuovi browser disconnessi
      if (existing && !existing.browser.isConnected()) {
        this.browsers.delete(id);
        this.logger.warn(`Browser disconnesso rimosso: ${id}`);
      }

      // Controlla limite pool
      if (this.browsers.size >= this.maxBrowsers) {
        await this.closeLeastRecentlyUsed();
      }

      // Crea nuovo browser
      const browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (compatible; ClientSniper/1.0; +https://clientsniper.com)',
        viewport: { width: 1920, height: 1080 }
      });

      const instance: BrowserInstance = {
        browser,
        context,
        lastUsed: new Date(),
        isActive: true
      };

      this.browsers.set(id, instance);
      this.logger.info(`Nuovo browser creato: ${id}`);
      
      return { browser, context };
    } catch (error) {
      this.logger.error(`Errore creazione browser ${id}:`, error);
      throw error;
    }
  }

  /**
   * Rilascia un browser per riutilizzo
   */
  async releaseBrowser(id: string = 'default'): Promise<void> {
    const instance = this.browsers.get(id);
    if (instance) {
      instance.isActive = false;
      instance.lastUsed = new Date();
      this.logger.info(`Browser rilasciato: ${id}`);
    }
  }

  /**
   * Chiude un browser specifico
   */
  async closeBrowser(id: string): Promise<void> {
    const instance = this.browsers.get(id);
    if (instance) {
      try {
        await instance.context.close();
        await instance.browser.close();
        this.browsers.delete(id);
        this.logger.info(`Browser chiuso: ${id}`);
      } catch (error) {
        this.logger.error(`Errore chiusura browser ${id}:`, error);
        // Force kill se necessario
        const pid = (instance.browser as any).process()?.pid;
        if (pid) {
          try {
            process.kill(pid, 'SIGKILL');
            this.logger.info(`Browser process terminato forzatamente: ${pid}`);
          } catch (killError) {
            this.logger.error(`Errore terminazione process ${pid}:`, killError);
          }
        }
      }
    }
  }

  /**
   * Chiude browser inattivi
   */
  private async cleanupIdleBrowsers(): Promise<void> {
    const now = new Date();
    const toClose: string[] = [];

    for (const [id, instance] of this.browsers) {
      const idleTime = now.getTime() - instance.lastUsed.getTime();
      if (!instance.isActive && idleTime > this.maxIdleTime) {
        toClose.push(id);
      }
    }

    if (toClose.length > 0) {
      this.logger.info(`Chiusura ${toClose.length} browser inattivi`);
      await Promise.all(toClose.map(id => this.closeBrowser(id)));
    }
  }

  /**
   * Chiude il browser meno recentemente usato
   */
  private async closeLeastRecentlyUsed(): Promise<void> {
    let oldestId: string | null = null;
    let oldestTime = new Date();

    for (const [id, instance] of this.browsers) {
      if (!instance.isActive && instance.lastUsed < oldestTime) {
        oldestTime = instance.lastUsed;
        oldestId = id;
      }
    }

    if (oldestId) {
      await this.closeBrowser(oldestId);
    }
  }

  /**
   * Cleanup completo
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleanup completo browser manager');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    const closePromises = Array.from(this.browsers.keys()).map(id => this.closeBrowser(id));
    await Promise.all(closePromises);
    
    this.browsers.clear();
  }

  /**
   * Statistiche pool browser
   */
  getStats(): { total: number; active: number; idle: number } {
    let active = 0;
    let idle = 0;

    for (const instance of this.browsers.values()) {
      if (instance.isActive) {
        active++;
      } else {
        idle++;
      }
    }

    return { total: this.browsers.size, active, idle };
  }
}
