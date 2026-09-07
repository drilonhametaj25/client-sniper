/**
 * PageSpeed Insights API (Fase 6) — performance REALI certificate da Google.
 * Gratuita: 25.000 richieste/giorno con API key.
 *
 * Non viene MAI chiamata inline durante lo scraping (15-30s a chiamata):
 * gira solo nel recheck notturno per i lead PUBBLICATI, e solo se la env
 * PSI_API_KEY è configurata. "Il tuo sito carica in 9 secondi" diventa un
 * claim verificabile con lo strumento ufficiale di Google.
 *
 * Parte del modulo services/scraping-engine.
 */

import axios from 'axios'

export interface PsiMetrics {
  /** punteggio Performance Lighthouse 0-100 */
  performanceScore: number | null
  /** Largest Contentful Paint in ms */
  lcpMs: number | null
  /** Cumulative Layout Shift */
  cls: number | null
  /** Total Blocking Time in ms */
  tbtMs: number | null
  /** Speed Index in ms */
  speedIndexMs: number | null
  strategy: 'mobile' | 'desktop'
  fetchedAt: string
}

const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

export async function fetchPsi(
  url: string,
  apiKey: string,
  strategy: 'mobile' | 'desktop' = 'mobile'
): Promise<PsiMetrics | null> {
  try {
    const response = await axios.get(PSI_ENDPOINT, {
      params: { url, key: apiKey, strategy, category: 'PERFORMANCE' },
      timeout: 60000,
      validateStatus: () => true
    })

    if (response.status !== 200) {
      console.warn(`⚠️ PSI ${response.status} per ${url}`)
      return null
    }

    const lighthouse = response.data?.lighthouseResult
    if (!lighthouse) return null

    const audits = lighthouse.audits || {}
    const num = (id: string): number | null => {
      const v = audits[id]?.numericValue
      return typeof v === 'number' ? Math.round(v * 1000) / 1000 : null
    }

    const scoreRaw = lighthouse.categories?.performance?.score
    return {
      performanceScore: typeof scoreRaw === 'number' ? Math.round(scoreRaw * 100) : null,
      lcpMs: num('largest-contentful-paint') !== null ? Math.round(audits['largest-contentful-paint'].numericValue) : null,
      cls: num('cumulative-layout-shift'),
      tbtMs: num('total-blocking-time') !== null ? Math.round(audits['total-blocking-time'].numericValue) : null,
      speedIndexMs: num('speed-index') !== null ? Math.round(audits['speed-index'].numericValue) : null,
      strategy,
      fetchedAt: new Date().toISOString()
    }
  } catch (e) {
    console.warn(`⚠️ PSI fallita per ${url}:`, e instanceof Error ? e.message : e)
    return null
  }
}
