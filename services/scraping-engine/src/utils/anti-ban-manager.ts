/**
 * Anti-Ban Manager per Google Maps Scraping
 * Gestisce delay dinamici, detection di blocchi e strategie di evasione
 * Parte del modulo services/scraping-engine
 */

import { Page } from 'playwright'

export interface AntiBanConfig {
  baseDelayMs: number
  maxDelayMs: number
  delayIncrementFactor: number
  cooldownAfterErrorMs: number
  maxConsecutiveFailures: number
  responseTimeThresholds: {
    slow: number      // ms - sopra questo aumenta delay
    verySlow: number  // ms - sopra questo raddoppia delay
  }
}

export interface AntiBanState {
  consecutiveFailures: number
  lastRequestTime: number
  currentDelayMs: number
  blockedUntil: number | null
  captchaDetected: boolean
  rateLimitHits: number
  totalRequests: number
  successfulRequests: number
}

export interface RequestTiming {
  responseTime: number
  statusCode: number
  timestamp: number
  success: boolean
}

export interface BlockingSignal {
  blocked: boolean
  reason: 'captcha' | 'rate_limit' | '403' | '429' | 'unusual_traffic' | 'timeout' | null
  shouldRetry: boolean
  waitMs: number
}

export interface AntiBanStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  successRate: number
  averageResponseTime: number
  rateLimitHits: number
  captchaEncounters: number
  currentDelay: number
  isInCooldown: boolean
}

const DEFAULT_CONFIG: AntiBanConfig = {
  baseDelayMs: 2000,
  maxDelayMs: 30000,
  delayIncrementFactor: 1.5,
  cooldownAfterErrorMs: 60000,
  maxConsecutiveFailures: 5,
  responseTimeThresholds: {
    slow: 3000,
    verySlow: 5000
  }
}

export class AntiBanManager {
  private state: AntiBanState
  private requestHistory: RequestTiming[]
  private readonly config: AntiBanConfig
  private captchaEncounters: number = 0

  // Pattern per rilevare blocchi (multilingua IT/EN)
  private readonly BLOCKING_PATTERNS = [
    { pattern: /unusual traffic/i, reason: 'unusual_traffic' as const },
    { pattern: /traffico insolito/i, reason: 'unusual_traffic' as const },
    { pattern: /abbiamo rilevato traffico/i, reason: 'unusual_traffic' as const },
    { pattern: /captcha|recaptcha|hcaptcha/i, reason: 'captcha' as const },
    { pattern: /verifica di non essere un robot/i, reason: 'captcha' as const },
    { pattern: /verify you're not a robot/i, reason: 'captcha' as const },
    { pattern: /too many requests/i, reason: 'rate_limit' as const },
    { pattern: /troppe richieste/i, reason: 'rate_limit' as const },
    { pattern: /rate limit/i, reason: 'rate_limit' as const },
    { pattern: /access denied/i, reason: '403' as const },
    { pattern: /accesso negato/i, reason: '403' as const },
    { pattern: /forbidden/i, reason: '403' as const },
    { pattern: /vietato/i, reason: '403' as const },
    { pattern: /error 429/i, reason: '429' as const },
    { pattern: /error 403/i, reason: '403' as const },
    { pattern: /please try again later/i, reason: 'rate_limit' as const },
    { pattern: /riprova più tardi/i, reason: 'rate_limit' as const }
  ]

  constructor(config?: Partial<AntiBanConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.state = {
      consecutiveFailures: 0,
      lastRequestTime: 0,
      currentDelayMs: this.config.baseDelayMs,
      blockedUntil: null,
      captchaDetected: false,
      rateLimitHits: 0,
      totalRequests: 0,
      successfulRequests: 0
    }
    this.requestHistory = []
  }

  /**
   * Calcola delay dinamico basato su response time e stato
   */
  calculateDynamicDelay(lastResponseTime?: number): number {
    let delay = this.state.currentDelayMs

    // Aumenta delay se response time è lento
    if (lastResponseTime) {
      if (lastResponseTime > this.config.responseTimeThresholds.verySlow) {
        delay = Math.min(delay * 2, this.config.maxDelayMs)
        console.log(`⚠️ [AntiBan] Response molto lento (${lastResponseTime}ms), delay raddoppiato: ${delay}ms`)
      } else if (lastResponseTime > this.config.responseTimeThresholds.slow) {
        delay = Math.min(delay * this.config.delayIncrementFactor, this.config.maxDelayMs)
        console.log(`⚠️ [AntiBan] Response lento (${lastResponseTime}ms), delay aumentato: ${delay}ms`)
      }
    }

    // Aumenta delay dopo fallimenti consecutivi
    if (this.state.consecutiveFailures > 0) {
      const failureMultiplier = Math.pow(this.config.delayIncrementFactor, this.state.consecutiveFailures)
      delay = Math.min(delay * failureMultiplier, this.config.maxDelayMs)
    }

    // Aggiungi jitter random (±20%)
    const jitter = delay * 0.2 * (Math.random() * 2 - 1)
    delay = Math.round(delay + jitter)

    return Math.max(this.config.baseDelayMs, Math.min(delay, this.config.maxDelayMs))
  }

  /**
   * Gestisce la risposta di una richiesta
   */
  handleResponse(statusCode: number, responseTime: number, success: boolean): void {
    const timing: RequestTiming = {
      responseTime,
      statusCode,
      timestamp: Date.now(),
      success
    }

    this.requestHistory.push(timing)
    this.state.totalRequests++
    this.state.lastRequestTime = Date.now()

    // Mantieni solo le ultime 50 richieste
    if (this.requestHistory.length > 50) {
      this.requestHistory.shift()
    }

    if (success && statusCode >= 200 && statusCode < 400) {
      this.onSuccess()
    } else {
      this.onFailure(statusCode)
    }
  }

  /**
   * Gestisce un successo
   */
  onSuccess(): void {
    this.state.successfulRequests++
    this.state.consecutiveFailures = 0
    this.state.captchaDetected = false
    this.state.blockedUntil = null

    // Riduci gradualmente il delay dopo successi (max -20%)
    if (this.state.currentDelayMs > this.config.baseDelayMs) {
      this.state.currentDelayMs = Math.max(
        this.config.baseDelayMs,
        Math.round(this.state.currentDelayMs * 0.8)
      )
    }
  }

  /**
   * Gestisce un fallimento
   */
  onFailure(statusCode?: number): void {
    this.state.consecutiveFailures++

    // Aumenta delay dopo fallimento
    this.state.currentDelayMs = Math.min(
      this.state.currentDelayMs * this.config.delayIncrementFactor,
      this.config.maxDelayMs
    )

    // Gestione specifica per errori HTTP
    if (statusCode === 429) {
      this.state.rateLimitHits++
      this.state.blockedUntil = Date.now() + this.config.cooldownAfterErrorMs
      console.log(`🛑 [AntiBan] Rate limit (429)! Cooldown fino a ${new Date(this.state.blockedUntil).toISOString()}`)
    } else if (statusCode === 403) {
      this.state.blockedUntil = Date.now() + (this.config.cooldownAfterErrorMs * 2)
      console.log(`🛑 [AntiBan] Accesso negato (403)! Cooldown esteso fino a ${new Date(this.state.blockedUntil).toISOString()}`)
    }

    // Se troppi fallimenti consecutivi, entra in cooldown prolungato
    if (this.state.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      this.state.blockedUntil = Date.now() + (this.config.cooldownAfterErrorMs * 3)
      console.log(`🚨 [AntiBan] Troppi fallimenti consecutivi (${this.state.consecutiveFailures})! Cooldown prolungato`)
    }
  }

  /**
   * Verifica se dobbiamo attendere prima della prossima richiesta
   */
  shouldWait(): { wait: boolean; delayMs: number; reason: string } {
    // Se siamo in cooldown
    if (this.state.blockedUntil && Date.now() < this.state.blockedUntil) {
      const remainingMs = this.state.blockedUntil - Date.now()
      return {
        wait: true,
        delayMs: remainingMs,
        reason: `In cooldown, ${Math.round(remainingMs / 1000)}s rimanenti`
      }
    }

    // Calcola tempo dall'ultima richiesta
    const timeSinceLastRequest = Date.now() - this.state.lastRequestTime
    const requiredDelay = this.calculateDynamicDelay()

    if (timeSinceLastRequest < requiredDelay) {
      const waitTime = requiredDelay - timeSinceLastRequest
      return {
        wait: true,
        delayMs: waitTime,
        reason: `Delay normale, aspetto ${Math.round(waitTime / 1000)}s`
      }
    }

    return { wait: false, delayMs: 0, reason: 'Pronto' }
  }

  /**
   * Attende il tempo necessario prima della prossima richiesta
   */
  async waitIfNeeded(): Promise<void> {
    const { wait, delayMs, reason } = this.shouldWait()
    if (wait && delayMs > 0) {
      console.log(`⏳ [AntiBan] ${reason}`)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  /**
   * Incrementa timeout basato su fallimenti
   */
  getEscalatedTimeout(baseTimeout: number): number {
    const multiplier = 1 + (this.state.consecutiveFailures * 0.5)
    return Math.min(baseTimeout * multiplier, baseTimeout * 3)
  }

  /**
   * Rileva segnali di blocco nel contenuto della pagina
   */
  async detectBlockingSignals(page: Page): Promise<BlockingSignal> {
    try {
      const pageContent = await page.content()
      const pageText = await page.evaluate(() => document.body?.innerText || '')

      for (const { pattern, reason } of this.BLOCKING_PATTERNS) {
        if (pattern.test(pageContent) || pattern.test(pageText)) {
          console.log(`🚨 [AntiBan] Rilevato blocco: ${reason}`)

          if (reason === 'captcha') {
            this.state.captchaDetected = true
            this.captchaEncounters++
          }

          this.onFailure(reason === '429' ? 429 : reason === '403' ? 403 : undefined)

          return {
            blocked: true,
            reason,
            shouldRetry: reason !== 'captcha', // CAPTCHA non può essere risolto automaticamente
            waitMs: this.calculateWaitAfterBlock(reason)
          }
        }
      }

      // Verifica anche elementi visivi di CAPTCHA
      const hasCaptchaElement = await page.evaluate(() => {
        const captchaSelectors = [
          'iframe[src*="recaptcha"]',
          'iframe[src*="hcaptcha"]',
          '.g-recaptcha',
          '[data-sitekey]',
          '#captcha',
          '.captcha'
        ]
        return captchaSelectors.some(sel => document.querySelector(sel) !== null)
      })

      if (hasCaptchaElement) {
        this.state.captchaDetected = true
        this.captchaEncounters++
        this.onFailure()
        return {
          blocked: true,
          reason: 'captcha',
          shouldRetry: false,
          waitMs: this.config.cooldownAfterErrorMs * 2
        }
      }

      return { blocked: false, reason: null, shouldRetry: true, waitMs: 0 }
    } catch (error) {
      console.warn('[AntiBan] Errore durante detection blocchi:', error)
      return { blocked: false, reason: null, shouldRetry: true, waitMs: 0 }
    }
  }

  /**
   * Calcola tempo di attesa dopo un blocco specifico
   */
  private calculateWaitAfterBlock(reason: BlockingSignal['reason']): number {
    switch (reason) {
      case 'captcha':
        return this.config.cooldownAfterErrorMs * 3 // CAPTCHA = attesa lunga
      case '429':
      case 'rate_limit':
        return this.config.cooldownAfterErrorMs * 2
      case '403':
        return this.config.cooldownAfterErrorMs * 2
      case 'unusual_traffic':
        return this.config.cooldownAfterErrorMs * 1.5
      default:
        return this.config.cooldownAfterErrorMs
    }
  }

  /**
   * Verifica HTTP status code dalla risposta
   */
  async checkResponseStatus(page: Page): Promise<{ ok: boolean; status: number }> {
    try {
      // Prova a ottenere lo status dall'ultimo response
      const response = await page.evaluate(() => {
        // Cerca messaggi di errore nella pagina
        const errorPatterns = [
          { pattern: /404/i, status: 404 },
          { pattern: /500/i, status: 500 },
          { pattern: /503/i, status: 503 },
          { pattern: /error/i, status: 0 }
        ]
        const text = document.body?.innerText || ''
        for (const { pattern, status } of errorPatterns) {
          if (pattern.test(text) && text.length < 1000) {
            return { ok: false, status }
          }
        }
        return { ok: true, status: 200 }
      })
      return response
    } catch {
      return { ok: true, status: 200 }
    }
  }

  /**
   * Ottieni statistiche per debugging
   */
  getStats(): AntiBanStats {
    const recentResponses = this.requestHistory.slice(-20)
    const avgResponseTime = recentResponses.length > 0
      ? recentResponses.reduce((sum, r) => sum + r.responseTime, 0) / recentResponses.length
      : 0

    return {
      totalRequests: this.state.totalRequests,
      successfulRequests: this.state.successfulRequests,
      failedRequests: this.state.totalRequests - this.state.successfulRequests,
      successRate: this.state.totalRequests > 0
        ? Math.round((this.state.successfulRequests / this.state.totalRequests) * 100)
        : 100,
      averageResponseTime: Math.round(avgResponseTime),
      rateLimitHits: this.state.rateLimitHits,
      captchaEncounters: this.captchaEncounters,
      currentDelay: this.state.currentDelayMs,
      isInCooldown: this.state.blockedUntil !== null && Date.now() < this.state.blockedUntil
    }
  }

  /**
   * Reset dello stato (per nuova sessione)
   */
  reset(): void {
    this.state = {
      consecutiveFailures: 0,
      lastRequestTime: 0,
      currentDelayMs: this.config.baseDelayMs,
      blockedUntil: null,
      captchaDetected: false,
      rateLimitHits: 0,
      totalRequests: 0,
      successfulRequests: 0
    }
    this.requestHistory = []
    console.log('🔄 [AntiBan] Stato resettato')
  }

  /**
   * Verifica se è sicuro continuare lo scraping
   */
  isSafeToContine(): boolean {
    // Non continuare se CAPTCHA rilevato
    if (this.state.captchaDetected) {
      console.log('⛔ [AntiBan] CAPTCHA rilevato, non sicuro continuare')
      return false
    }

    // Non continuare se troppi fallimenti
    if (this.state.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      console.log('⛔ [AntiBan] Troppi fallimenti consecutivi, non sicuro continuare')
      return false
    }

    // Non continuare se success rate troppo basso (dopo almeno 10 richieste)
    if (this.state.totalRequests >= 10) {
      const successRate = this.state.successfulRequests / this.state.totalRequests
      if (successRate < 0.5) {
        console.log(`⛔ [AntiBan] Success rate troppo basso (${Math.round(successRate * 100)}%), non sicuro continuare`)
        return false
      }
    }

    return true
  }
}

// Singleton per uso globale
let globalAntiBanManager: AntiBanManager | null = null

export function getGlobalAntiBanManager(config?: Partial<AntiBanConfig>): AntiBanManager {
  if (!globalAntiBanManager) {
    globalAntiBanManager = new AntiBanManager(config)
  }
  return globalAntiBanManager
}

export function resetGlobalAntiBanManager(): void {
  if (globalAntiBanManager) {
    globalAntiBanManager.reset()
  }
  globalAntiBanManager = null
}
