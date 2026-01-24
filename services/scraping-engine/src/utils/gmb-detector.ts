/**
 * Google My Business Detector per Client Sniper
 * Rileva se un profilo GMB è claimed (proprietario verificato) o meno
 * Parte del modulo services/scraping-engine
 */

import { Page } from 'playwright'

export interface GMBStatus {
  isClaimed: boolean
  hasOwnerBadge: boolean
  hasClaimButton: boolean
  hasWebsiteButton: boolean
  hasBookingButton: boolean
  hasMessagingButton: boolean
  ownerResponseRate: number | null     // % risposte del proprietario alle recensioni
  lastOwnerResponse: string | null     // Data ultimo response
  profileCompleteness: number          // 0-100
  verificationStatus: 'verified' | 'unverified' | 'unknown'
  photoCount: number
  hasLogo: boolean
  hasDescription: boolean
  hasOpeningHours: boolean
  hasPhoneNumber: boolean
  hasAddress: boolean
  hasCategories: boolean
}

export interface GMBDetectorConfig {
  checkOwnerResponses: boolean
  maxWaitMs: number
}

const DEFAULT_CONFIG: GMBDetectorConfig = {
  checkOwnerResponses: true,
  maxWaitMs: 5000
}

export class GMBDetector {
  private readonly config: GMBDetectorConfig

  // Selettori per badge proprietario (multilingua IT/EN/DE/FR/ES)
  private readonly OWNER_BADGE_SELECTORS = [
    // Badge "Proprietario di questa attività"
    '[data-value="Proprietario di questa attività"]',
    '[data-value="Owner of this business"]',
    '[data-value="Inhaber dieses Unternehmens"]',
    '[data-value="Propriétaire de cet établissement"]',
    '[data-value="Propietario de este negocio"]',
    // Button aria-label
    'button[aria-label*="proprietario"]',
    'button[aria-label*="owner"]',
    'button[aria-label*="Inhaber"]',
    'button[aria-label*="propriétaire"]',
    // jsaction patterns
    '[jsaction*="owner"]',
    '[jsaction*="proprietario"]',
    // Class patterns
    '.section-owner-badge',
    '[data-item-id*="owner"]',
    // Text content patterns
    '*:has-text("Profilo gestito")',
    '*:has-text("Managed by")',
    '*:has-text("Verificato")',
    '*:has-text("Verified")'
  ]

  // Selettori per pulsante "Rivendica questa attività" (indica NON claimed)
  private readonly CLAIM_BUTTON_SELECTORS = [
    // IT
    'button[aria-label*="Rivendica questa attività"]',
    '[data-value*="Rivendica"]',
    '*:has-text("Rivendica questa attività")',
    '*:has-text("Sei il proprietario?")',
    // EN
    'button[aria-label*="Claim this business"]',
    '[data-value*="Claim"]',
    '*:has-text("Claim this business")',
    '*:has-text("Own this business?")',
    // DE
    '*:has-text("Unternehmen beanspruchen")',
    // FR
    '*:has-text("Revendiquer cet établissement")',
    // ES
    '*:has-text("Reclamar este negocio")'
  ]

  // Selettori per elementi che indicano profilo completo
  private readonly PROFILE_ELEMENT_SELECTORS = {
    website: [
      'a[data-item-id="authority"]',
      'button[data-item-id="authority"]',
      '[data-tooltip*="Sito web"]',
      '[data-tooltip*="Website"]',
      'a[href^="http"]:not([href*="google"])'
    ],
    phone: [
      'button[data-item-id="phone:tel"]',
      'a[href^="tel:"]',
      '[data-tooltip*="Telefono"]',
      '[data-tooltip*="Phone"]'
    ],
    address: [
      'button[data-item-id="address"]',
      '[data-tooltip*="Indirizzo"]',
      '[data-tooltip*="Address"]'
    ],
    hours: [
      'button[data-item-id="oh"]',
      '[aria-label*="orari"]',
      '[aria-label*="hours"]',
      '[data-tooltip*="Orari"]',
      '[data-tooltip*="Hours"]'
    ],
    booking: [
      'a[data-booking]',
      '[aria-label*="Prenota"]',
      '[aria-label*="Book"]',
      '[data-tooltip*="Prenota"]'
    ],
    messaging: [
      'button[aria-label*="Messaggio"]',
      'button[aria-label*="Message"]',
      '[data-item-id="message"]'
    ],
    photos: [
      '.section-hero-header-image',
      '[data-photo-index]',
      'img[src*="maps.googleapis.com"]'
    ],
    description: [
      '[data-attrid="kc:/local:description"]',
      '.section-editorial',
      '*:has-text("Informazioni")'
    ],
    categories: [
      'button[jsaction*="category"]',
      '[data-item-id="category"]',
      '.fontBodyMedium:has-text("Ristorante")',
      '.fontBodyMedium:has-text("Bar")'
    ]
  }

  constructor(config?: Partial<GMBDetectorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Rileva lo stato completo del profilo GMB
   */
  async detectGMBStatus(page: Page): Promise<GMBStatus> {
    const startTime = Date.now()

    try {
      // Verifica elementi in parallelo per velocità
      const [
        hasOwnerBadge,
        hasClaimButton,
        hasWebsiteButton,
        hasBookingButton,
        hasMessagingButton,
        hasPhoneNumber,
        hasAddress,
        hasOpeningHours,
        hasDescription,
        hasCategories,
        photoCount,
        hasLogo,
        ownerResponseData
      ] = await Promise.all([
        this.checkOwnerBadge(page),
        this.checkClaimButton(page),
        this.hasElement(page, this.PROFILE_ELEMENT_SELECTORS.website),
        this.hasElement(page, this.PROFILE_ELEMENT_SELECTORS.booking),
        this.hasElement(page, this.PROFILE_ELEMENT_SELECTORS.messaging),
        this.hasElement(page, this.PROFILE_ELEMENT_SELECTORS.phone),
        this.hasElement(page, this.PROFILE_ELEMENT_SELECTORS.address),
        this.hasElement(page, this.PROFILE_ELEMENT_SELECTORS.hours),
        this.hasElement(page, this.PROFILE_ELEMENT_SELECTORS.description),
        this.hasElement(page, this.PROFILE_ELEMENT_SELECTORS.categories),
        this.countPhotos(page),
        this.checkLogo(page),
        this.config.checkOwnerResponses ? this.analyzeOwnerResponses(page) : null
      ])

      // Determina se claimed basandosi sui segnali
      const isClaimed = this.determineClaimedStatus(hasOwnerBadge, hasClaimButton, hasMessagingButton)

      // Calcola completezza profilo
      const profileCompleteness = this.calculateProfileCompleteness({
        hasWebsiteButton,
        hasPhoneNumber,
        hasAddress,
        hasOpeningHours,
        hasDescription,
        hasCategories,
        photoCount,
        hasLogo,
        isClaimed
      })

      // Determina status verifica
      let verificationStatus: 'verified' | 'unverified' | 'unknown' = 'unknown'
      if (hasOwnerBadge) {
        verificationStatus = 'verified'
      } else if (hasClaimButton) {
        verificationStatus = 'unverified'
      }

      const elapsed = Date.now() - startTime
      console.log(`🔍 [GMBDetector] Rilevamento completato in ${elapsed}ms - Claimed: ${isClaimed}, Completeness: ${profileCompleteness}%`)

      return {
        isClaimed,
        hasOwnerBadge,
        hasClaimButton,
        hasWebsiteButton,
        hasBookingButton,
        hasMessagingButton,
        ownerResponseRate: ownerResponseData?.responseRate ?? null,
        lastOwnerResponse: ownerResponseData?.lastResponse ?? null,
        profileCompleteness,
        verificationStatus,
        photoCount,
        hasLogo,
        hasDescription,
        hasOpeningHours,
        hasPhoneNumber,
        hasAddress,
        hasCategories
      }

    } catch (error) {
      console.warn('[GMBDetector] Errore durante rilevamento:', error)
      return this.getDefaultStatus()
    }
  }

  /**
   * Verifica presenza badge proprietario
   */
  private async checkOwnerBadge(page: Page): Promise<boolean> {
    try {
      for (const selector of this.OWNER_BADGE_SELECTORS) {
        try {
          const element = await page.$(selector)
          if (element) {
            console.log(`✅ [GMBDetector] Owner badge trovato: ${selector}`)
            return true
          }
        } catch {
          // Selector non valido, continua
        }
      }

      // Cerca anche nel testo della pagina
      const pageText = await page.evaluate(() => document.body?.innerText || '')
      const ownerTextPatterns = [
        /profilo\s+gestito/i,
        /managed\s+by/i,
        /proprietario\s+verificato/i,
        /verified\s+owner/i
      ]

      for (const pattern of ownerTextPatterns) {
        if (pattern.test(pageText)) {
          console.log(`✅ [GMBDetector] Owner text pattern trovato: ${pattern}`)
          return true
        }
      }

      return false
    } catch {
      return false
    }
  }

  /**
   * Verifica presenza pulsante "Rivendica"
   */
  private async checkClaimButton(page: Page): Promise<boolean> {
    try {
      for (const selector of this.CLAIM_BUTTON_SELECTORS) {
        try {
          const element = await page.$(selector)
          if (element) {
            console.log(`⚠️ [GMBDetector] Claim button trovato: ${selector}`)
            return true
          }
        } catch {
          // Selector non valido, continua
        }
      }

      // Cerca nel testo
      const pageText = await page.evaluate(() => document.body?.innerText || '')
      const claimTextPatterns = [
        /rivendica\s+questa\s+attività/i,
        /claim\s+this\s+business/i,
        /sei\s+il\s+proprietario/i,
        /own\s+this\s+business/i
      ]

      for (const pattern of claimTextPatterns) {
        if (pattern.test(pageText)) {
          console.log(`⚠️ [GMBDetector] Claim text pattern trovato: ${pattern}`)
          return true
        }
      }

      return false
    } catch {
      return false
    }
  }

  /**
   * Verifica presenza di un elemento dato un array di selettori
   */
  private async hasElement(page: Page, selectors: string[]): Promise<boolean> {
    try {
      for (const selector of selectors) {
        try {
          const element = await page.$(selector)
          if (element) {
            return true
          }
        } catch {
          // Selector non valido
        }
      }
      return false
    } catch {
      return false
    }
  }

  /**
   * Conta le foto del profilo
   */
  private async countPhotos(page: Page): Promise<number> {
    try {
      const count = await page.evaluate(() => {
        // Cerca indicatori di conteggio foto
        const photoCountText = document.body.innerText.match(/(\d+)\s*(foto|photos|immagini|images)/i)
        if (photoCountText) {
          return parseInt(photoCountText[1], 10)
        }

        // Conta elementi immagine nel carousel
        const photos = document.querySelectorAll('[data-photo-index], .section-hero-header-image img')
        return photos.length
      })
      return count || 0
    } catch {
      return 0
    }
  }

  /**
   * Verifica presenza logo aziendale
   */
  private async checkLogo(page: Page): Promise<boolean> {
    try {
      return await page.evaluate(() => {
        // Cerca logo nel profilo
        const logoSelectors = [
          'img[src*="logo"]',
          '.section-hero-header-image img',
          '[data-section-id="hero"] img'
        ]

        for (const selector of logoSelectors) {
          const img = document.querySelector(selector) as HTMLImageElement
          if (img && img.src && !img.src.includes('default') && !img.src.includes('placeholder')) {
            return true
          }
        }
        return false
      })
    } catch {
      return false
    }
  }

  /**
   * Analizza le risposte del proprietario alle recensioni
   */
  private async analyzeOwnerResponses(page: Page): Promise<{ responseRate: number; lastResponse: string | null } | null> {
    try {
      const result = await page.evaluate(() => {
        // Cerca sezione recensioni
        const reviews = document.querySelectorAll('[data-review-id], .section-review')
        if (reviews.length === 0) return null

        let totalReviews = 0
        let ownerResponses = 0
        let lastResponseDate: string | null = null

        reviews.forEach(review => {
          totalReviews++
          // Cerca risposta del proprietario
          const ownerResponsePatterns = [
            'Risposta del proprietario',
            'Risposta da',
            'Response from owner',
            'Owner response'
          ]

          const reviewText = review.textContent || ''
          const hasOwnerResponse = ownerResponsePatterns.some(p => reviewText.includes(p))

          if (hasOwnerResponse) {
            ownerResponses++
            // Prova a estrarre la data
            const dateMatch = reviewText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+\w+\s+\d{4})/i)
            if (dateMatch && !lastResponseDate) {
              lastResponseDate = dateMatch[1]
            }
          }
        })

        if (totalReviews === 0) return null

        return {
          responseRate: Math.round((ownerResponses / totalReviews) * 100),
          lastResponse: lastResponseDate
        }
      })

      return result
    } catch {
      return null
    }
  }

  /**
   * Determina se il profilo è claimed
   */
  private determineClaimedStatus(
    hasOwnerBadge: boolean,
    hasClaimButton: boolean,
    hasMessagingButton: boolean
  ): boolean {
    // Se ha badge proprietario = sicuramente claimed
    if (hasOwnerBadge) return true

    // Se ha pulsante "Rivendica" = sicuramente NON claimed
    if (hasClaimButton) return false

    // Se ha messaggistica attiva = probabilmente claimed (solo owner può attivare)
    if (hasMessagingButton) return true

    // Default: unknown, assume non claimed
    return false
  }

  /**
   * Calcola completezza del profilo (0-100)
   */
  private calculateProfileCompleteness(elements: {
    hasWebsiteButton: boolean
    hasPhoneNumber: boolean
    hasAddress: boolean
    hasOpeningHours: boolean
    hasDescription: boolean
    hasCategories: boolean
    photoCount: number
    hasLogo: boolean
    isClaimed: boolean
  }): number {
    let score = 0
    const weights = {
      hasPhoneNumber: 15,
      hasAddress: 15,
      hasOpeningHours: 15,
      hasWebsiteButton: 10,
      hasDescription: 10,
      hasCategories: 10,
      hasLogo: 10,
      hasPhotos: 10,      // almeno 5 foto
      isClaimed: 5
    }

    if (elements.hasPhoneNumber) score += weights.hasPhoneNumber
    if (elements.hasAddress) score += weights.hasAddress
    if (elements.hasOpeningHours) score += weights.hasOpeningHours
    if (elements.hasWebsiteButton) score += weights.hasWebsiteButton
    if (elements.hasDescription) score += weights.hasDescription
    if (elements.hasCategories) score += weights.hasCategories
    if (elements.hasLogo) score += weights.hasLogo
    if (elements.photoCount >= 5) score += weights.hasPhotos
    if (elements.isClaimed) score += weights.isClaimed

    return Math.min(100, score)
  }

  /**
   * Ritorna status di default in caso di errore
   */
  private getDefaultStatus(): GMBStatus {
    return {
      isClaimed: false,
      hasOwnerBadge: false,
      hasClaimButton: false,
      hasWebsiteButton: false,
      hasBookingButton: false,
      hasMessagingButton: false,
      ownerResponseRate: null,
      lastOwnerResponse: null,
      profileCompleteness: 0,
      verificationStatus: 'unknown',
      photoCount: 0,
      hasLogo: false,
      hasDescription: false,
      hasOpeningHours: false,
      hasPhoneNumber: false,
      hasAddress: false,
      hasCategories: false
    }
  }

  /**
   * Versione semplificata per quick check
   */
  async quickCheck(page: Page): Promise<{ isClaimed: boolean; confidence: 'high' | 'medium' | 'low' }> {
    const hasOwnerBadge = await this.checkOwnerBadge(page)
    if (hasOwnerBadge) {
      return { isClaimed: true, confidence: 'high' }
    }

    const hasClaimButton = await this.checkClaimButton(page)
    if (hasClaimButton) {
      return { isClaimed: false, confidence: 'high' }
    }

    // Nessun segnale chiaro
    return { isClaimed: false, confidence: 'low' }
  }
}

// Singleton per uso globale
let globalGMBDetector: GMBDetector | null = null

export function getGlobalGMBDetector(config?: Partial<GMBDetectorConfig>): GMBDetector {
  if (!globalGMBDetector) {
    globalGMBDetector = new GMBDetector(config)
  }
  return globalGMBDetector
}
