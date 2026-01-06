/**
 * Analysis Cache
 * Cache per risultati analisi con TTL configurabile
 * Usa Supabase come storage persistente
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export interface CacheEntry<T> {
  key: string
  data: T
  createdAt: Date
  expiresAt: Date
  hitCount: number
  source: string // 'local' | 'supabase'
}

export interface CacheOptions {
  ttlDays: number
  tableName: string
  useLocalCache: boolean
  localCacheMaxSize: number
}

const DEFAULT_OPTIONS: CacheOptions = {
  ttlDays: 7,
  tableName: 'analysis_cache',
  useLocalCache: true,
  localCacheMaxSize: 100
}

export class AnalysisCache<T = any> {
  private supabase: SupabaseClient
  private options: CacheOptions
  private localCache: Map<string, CacheEntry<T>> = new Map()

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }

    this.supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  /**
   * Generate cache key from URL
   */
  private generateKey(url: string, analysisType?: string): string {
    const normalizedUrl = url.toLowerCase().replace(/\/+$/, '').replace(/^https?:\/\//, '')
    const input = analysisType ? `${normalizedUrl}:${analysisType}` : normalizedUrl
    return crypto.createHash('md5').update(input).digest('hex')
  }

  /**
   * Get cached analysis
   */
  async get(url: string, analysisType?: string): Promise<T | null> {
    const key = this.generateKey(url, analysisType)

    // Try local cache first
    if (this.options.useLocalCache) {
      const local = this.localCache.get(key)
      if (local && new Date() < local.expiresAt) {
        local.hitCount++
        return local.data
      }
    }

    // Try Supabase
    try {
      const { data, error } = await this.supabase
        .from(this.options.tableName)
        .select('data, expires_at, hit_count')
        .eq('cache_key', key)
        .single()

      if (error || !data) return null

      const expiresAt = new Date(data.expires_at)
      if (new Date() >= expiresAt) {
        // Expired, delete it
        await this.delete(url, analysisType)
        return null
      }

      // Update hit count
      await this.supabase
        .from(this.options.tableName)
        .update({ hit_count: (data.hit_count || 0) + 1 })
        .eq('cache_key', key)

      // Store in local cache
      if (this.options.useLocalCache) {
        this.setLocal(key, data.data as T, expiresAt)
      }

      return data.data as T
    } catch (error) {
      console.error('[AnalysisCache] Get error:', error)
      return null
    }
  }

  /**
   * Set cached analysis
   */
  async set(url: string, data: T, analysisType?: string, ttlDays?: number): Promise<void> {
    const key = this.generateKey(url, analysisType)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + (ttlDays || this.options.ttlDays) * 24 * 60 * 60 * 1000)

    // Set local cache
    if (this.options.useLocalCache) {
      this.setLocal(key, data, expiresAt)
    }

    // Set in Supabase
    try {
      await this.supabase
        .from(this.options.tableName)
        .upsert({
          cache_key: key,
          url: url,
          analysis_type: analysisType || 'full',
          data: data,
          created_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          hit_count: 0
        }, {
          onConflict: 'cache_key'
        })
    } catch (error) {
      console.error('[AnalysisCache] Set error:', error)
    }
  }

  /**
   * Delete cached analysis
   */
  async delete(url: string, analysisType?: string): Promise<void> {
    const key = this.generateKey(url, analysisType)

    // Delete from local cache
    this.localCache.delete(key)

    // Delete from Supabase
    try {
      await this.supabase
        .from(this.options.tableName)
        .delete()
        .eq('cache_key', key)
    } catch (error) {
      console.error('[AnalysisCache] Delete error:', error)
    }
  }

  /**
   * Invalidate all cache for a URL (all analysis types)
   */
  async invalidateUrl(url: string): Promise<void> {
    const normalizedUrl = url.toLowerCase().replace(/\/+$/, '').replace(/^https?:\/\//, '')

    // Delete from local cache
    for (const [key, entry] of this.localCache.entries()) {
      if (key.includes(normalizedUrl)) {
        this.localCache.delete(key)
      }
    }

    // Delete from Supabase
    try {
      await this.supabase
        .from(this.options.tableName)
        .delete()
        .ilike('url', `%${normalizedUrl}%`)
    } catch (error) {
      console.error('[AnalysisCache] Invalidate error:', error)
    }
  }

  /**
   * Set in local cache with LRU eviction
   */
  private setLocal(key: string, data: T, expiresAt: Date): void {
    // Evict oldest if at capacity
    if (this.localCache.size >= this.options.localCacheMaxSize) {
      const oldestKey = this.localCache.keys().next().value
      if (oldestKey) {
        this.localCache.delete(oldestKey)
      }
    }

    this.localCache.set(key, {
      key,
      data,
      createdAt: new Date(),
      expiresAt,
      hitCount: 0,
      source: 'local'
    })
  }

  /**
   * Get or compute - returns cached value or computes and caches new value
   */
  async getOrCompute(
    url: string,
    computeFn: () => Promise<T>,
    analysisType?: string,
    ttlDays?: number
  ): Promise<T> {
    // Try cache first
    const cached = await this.get(url, analysisType)
    if (cached !== null) {
      return cached
    }

    // Compute new value
    const result = await computeFn()

    // Cache it
    await this.set(url, result, analysisType, ttlDays)

    return result
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<number> {
    // Clean local cache
    let cleanedLocal = 0
    const now = new Date()
    for (const [key, entry] of this.localCache.entries()) {
      if (now >= entry.expiresAt) {
        this.localCache.delete(key)
        cleanedLocal++
      }
    }

    // Clean Supabase
    let cleanedRemote = 0
    try {
      const { data, error } = await this.supabase
        .from(this.options.tableName)
        .delete()
        .lt('expires_at', now.toISOString())
        .select('cache_key')

      if (!error && data) {
        cleanedRemote = data.length
      }
    } catch (error) {
      console.error('[AnalysisCache] Cleanup error:', error)
    }

    const total = cleanedLocal + cleanedRemote
    if (total > 0) {
      console.log(`[AnalysisCache] Cleaned up ${total} entries (${cleanedLocal} local, ${cleanedRemote} remote)`)
    }

    return total
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    localEntries: number
    remoteEntries: number
    totalHits: number
    oldestEntry: Date | null
    avgTtlRemaining: number
  }> {
    const localEntries = this.localCache.size

    let remoteEntries = 0
    let totalHits = 0
    let oldestEntry: Date | null = null
    let avgTtlRemaining = 0

    try {
      const { data, error } = await this.supabase
        .from(this.options.tableName)
        .select('created_at, expires_at, hit_count')

      if (!error && data) {
        remoteEntries = data.length
        totalHits = data.reduce((sum, entry) => sum + (entry.hit_count || 0), 0)

        const now = new Date()
        let totalTtlRemaining = 0

        for (const entry of data) {
          const createdAt = new Date(entry.created_at)
          const expiresAt = new Date(entry.expires_at)

          if (!oldestEntry || createdAt < oldestEntry) {
            oldestEntry = createdAt
          }

          const remaining = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          totalTtlRemaining += Math.max(0, remaining)
        }

        avgTtlRemaining = data.length > 0
          ? Math.round((totalTtlRemaining / data.length) * 10) / 10
          : 0
      }
    } catch (error) {
      console.error('[AnalysisCache] Stats error:', error)
    }

    return {
      localEntries,
      remoteEntries,
      totalHits,
      oldestEntry,
      avgTtlRemaining
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.localCache.clear()

    try {
      await this.supabase
        .from(this.options.tableName)
        .delete()
        .neq('cache_key', '') // Delete all
    } catch (error) {
      console.error('[AnalysisCache] Clear error:', error)
    }
  }
}

// Singleton instances for different analysis types
const cacheInstances: Map<string, AnalysisCache> = new Map()

export function getAnalysisCache<T = any>(
  analysisType: string = 'default',
  options?: Partial<CacheOptions>
): AnalysisCache<T> {
  if (!cacheInstances.has(analysisType)) {
    cacheInstances.set(analysisType, new AnalysisCache<T>(options))
  }
  return cacheInstances.get(analysisType) as AnalysisCache<T>
}
