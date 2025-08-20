/**
 * Sistema di caching globale per API calls - ClientSniper
 * Usato per: Prevenire chiamate duplicate e migliorare performance
 * Chiamato da: Hook e componenti che fanno chiamate API
 */

interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

interface PendingCall {
  promise: Promise<any>
  timestamp: number
}

class APICache {
  private cache = new Map<string, CacheEntry>()
  private pendingCalls = new Map<string, PendingCall>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minuti default
  private readonly PENDING_TIMEOUT = 30 * 1000 // 30 secondi timeout per chiamate in corso

  /**
   * Genera chiave cache da URL e parametri
   */
  private generateKey(url: string, params?: any): string {
    if (!params) return url
    const sortedParams = JSON.stringify(params, Object.keys(params).sort())
    return `${url}::${sortedParams}`
  }

  /**
   * Controlla se una entry è ancora valida
   */
  private isValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl
  }

  /**
   * Pulisce entry scadute e chiamate in timeout
   */
  private cleanup(): void {
    const now = Date.now()

    // Pulisci cache scadute
    this.cache.forEach((entry, key) => {
      if (!this.isValid(entry)) {
        this.cache.delete(key)
      }
    })

    // Pulisci pending calls in timeout
    this.pendingCalls.forEach((pending, key) => {
      if (now - pending.timestamp > this.PENDING_TIMEOUT) {
        console.warn(`⚠️ Pulizia chiamata in timeout: ${key}`)
        this.pendingCalls.delete(key)
      }
    })
  }

  /**
   * Recupera dati dalla cache se disponibili e validi
   */
  get<T = any>(url: string, params?: any): T | null {
    this.cleanup()
    const key = this.generateKey(url, params)
    const entry = this.cache.get(key)
    
    if (entry && this.isValid(entry)) {
      console.log(`🚀 Cache HIT: ${key}`)
      return entry.data as T
    }
    
    return null
  }

  /**
   * Salva dati in cache
   */
  set<T = any>(url: string, params: any, data: T, ttl: number = this.DEFAULT_TTL): void {
    const key = this.generateKey(url, params)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
    console.log(`💾 Cache SET: ${key}`)
  }

  /**
   * Controlla se c'è una chiamata in corso per gli stessi parametri
   */
  hasPendingCall(url: string, params?: any): Promise<any> | null {
    this.cleanup()
    const key = this.generateKey(url, params)
    const pending = this.pendingCalls.get(key)
    
    if (pending) {
      console.log(`⏳ Chiamata in corso: ${key}`)
      return pending.promise
    }
    
    return null
  }

  /**
   * Registra una chiamata in corso
   */
  setPendingCall(url: string, params: any, promise: Promise<any>): void {
    const key = this.generateKey(url, params)
    
    this.pendingCalls.set(key, {
      promise: promise.finally(() => {
        // Pulisci automaticamente quando la chiamata è completata
        this.pendingCalls.delete(key)
      }),
      timestamp: Date.now()
    })
    
    console.log(`📡 Chiamata registrata: ${key}`)
  }

  /**
   * Invalida cache per una specifica URL/parametri
   */
  invalidate(url: string, params?: any): void {
    const key = this.generateKey(url, params)
    this.cache.delete(key)
    console.log(`🗑️ Cache invalidated: ${key}`)
  }

  /**
   * Invalida tutta la cache che matcha un pattern
   */
  invalidatePattern(pattern: string): void {
    let count = 0
    const keysToDelete: string[] = []
    
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => {
      this.cache.delete(key)
      count++
    })
    
    console.log(`🗑️ Cache pattern invalidated: ${pattern} (${count} entries)`)
  }

  /**
   * Svuota completamente la cache
   */
  clear(): void {
    const count = this.cache.size
    this.cache.clear()
    this.pendingCalls.clear()
    console.log(`🗑️ Cache cleared: ${count} entries`)
  }

  /**
   * Wrapper per fetch con cache automatica
   */
  async cachedFetch<T = any>(
    url: string, 
    params: any = {}, 
    options: RequestInit = {},
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Controlla prima la cache
    const cached = this.get<T>(url, params)
    if (cached) {
      return cached
    }

    // Controlla se c'è già una chiamata in corso
    const pendingCall = this.hasPendingCall(url, params)
    if (pendingCall) {
      return pendingCall
    }

    // Costruisci URL finale con parametri
    const urlObj = new URL(url, window.location.origin)
    if (params && typeof params === 'object') {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          urlObj.searchParams.append(key, String(value))
        }
      })
    }

    // Esegui la chiamata
    const promise = fetch(urlObj.toString(), {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }).then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      return response.json()
    }).then((data) => {
      // Salva in cache solo se la chiamata ha successo
      this.set(url, params, data, ttl)
      return data
    })

    // Registra la chiamata come pending
    this.setPendingCall(url, params, promise)

    return promise
  }

  /**
   * Statistiche cache per debug
   */
  getStats(): { cacheSize: number, pendingCalls: number, hitRate?: number } {
    return {
      cacheSize: this.cache.size,
      pendingCalls: this.pendingCalls.size
    }
  }
}

// Istanza globale singleton
export const apiCache = new APICache()

/**
 * Hook per usare il sistema di cache in componenti React
 */
export function useAPICache() {
  return {
    get: apiCache.get.bind(apiCache),
    set: apiCache.set.bind(apiCache),
    invalidate: apiCache.invalidate.bind(apiCache),
    invalidatePattern: apiCache.invalidatePattern.bind(apiCache),
    clear: apiCache.clear.bind(apiCache),
    cachedFetch: apiCache.cachedFetch.bind(apiCache),
    getStats: apiCache.getStats.bind(apiCache)
  }
}

export default apiCache
