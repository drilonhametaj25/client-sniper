/**
 * Unit test puri per il modello di confidenza (decideLeadPublication).
 * Nessun browser, nessuna rete: verifica la logica pubblicazione/quarantena
 * che protegge gli utenti dai lead con difetti finti.
 *
 * Parte del modulo services/scraping-engine.
 */

import { describe, expect, it } from 'vitest'
import { decideLeadPublication, PUBLISH_CONFIDENCE_THRESHOLD } from '../utils/confidence'

describe('decideLeadPublication', () => {
  it('sito online con analisi affidabile e completa -> published, nessuna ri-verifica', () => {
    const d = decideLeadPublication({
      reachability: 'online',
      analysisReliability: 100,
      analysisMethod: 'full',
    })
    expect(d.status).toBe('published')
    expect(d.score).toBe(100)
    expect(d.needsRecheck).toBe(false)
    expect(d.reasons).toEqual([])
  })

  it("analysisMethod 'fallback' -> quarantena + needsRecheck (i difetti potrebbero essere artefatti)", () => {
    const d = decideLeadPublication({
      reachability: 'online',
      analysisMethod: 'fallback',
    })
    expect(d.status).toBe('quarantine')
    expect(d.score).toBeLessThan(PUBLISH_CONFIDENCE_THRESHOLD)
    expect(d.needsRecheck).toBe(true)
    expect(d.reasons.some((r) => r.includes('Analisi tecnica inaffidabile'))).toBe(true)
  })

  it('analysisReliability 60 (< 75) -> quarantena anche con metodo full', () => {
    const d = decideLeadPublication({
      reachability: 'online',
      analysisReliability: 60,
      analysisMethod: 'full',
    })
    expect(d.status).toBe('quarantine')
    expect(d.score).toBeLessThan(PUBLISH_CONFIDENCE_THRESHOLD)
    expect(d.needsRecheck).toBe(true)
  })

  it("reachability 'uncertain' -> quarantena + needsRecheck (mai 'sito assente' da un errore transitorio)", () => {
    const d = decideLeadPublication({ reachability: 'uncertain' })
    expect(d.status).toBe('quarantine')
    expect(d.needsRecheck).toBe(true)
    expect(d.reasons.some((r) => r.includes('Raggiungibilità del sito incerta'))).toBe(true)
  })

  it("reachability 'offline_confirmed' -> published senza penalità (assenza CERTA = ottimo lead)", () => {
    const d = decideLeadPublication({ reachability: 'offline_confirmed' })
    expect(d.status).toBe('published')
    expect(d.score).toBe(100)
    expect(d.needsRecheck).toBe(false)
    expect(d.reasons).toEqual([])
  })
})
