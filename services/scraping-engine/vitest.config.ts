/**
 * Configurazione Vitest per la golden-fixture test suite del motore di analisi.
 * - environment node: i test lanciano Playwright direttamente, nessun DOM emulato
 * - testTimeout alto: ogni fixture esegue una analisi Playwright completa (goto,
 *   networkidle, Core Web Vitals observer, test mobile) che richiede decine di secondi
 *
 * Parte del modulo services/scraping-engine.
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
})
