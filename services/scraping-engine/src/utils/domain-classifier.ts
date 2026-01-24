/**
 * Domain Classifier per Client Sniper
 * Classifica URL per distinguere siti proprietari da listing/directory
 * Parte del modulo services/scraping-engine
 */

export type DomainType = 'proprietary' | 'listing' | 'social' | 'maps' | 'unknown'

export interface DomainClassification {
  type: DomainType
  isAcceptable: boolean
  reason: string
  domain: string
  fullUrl: string
  listingName?: string // Nome della directory se listing
}

export interface DomainClassifierConfig {
  strictMode: boolean      // true = solo domini proprietari
  allowSocialMedia: boolean
  customBlacklist?: string[]
  customWhitelist?: string[]
}

const DEFAULT_CONFIG: DomainClassifierConfig = {
  strictMode: true,
  allowSocialMedia: false,
  customBlacklist: [],
  customWhitelist: []
}

export class DomainClassifier {
  private readonly config: DomainClassifierConfig

  // Domini listing/directory da ESCLUDERE (completa)
  private readonly LISTING_DOMAINS: Array<{ domain: string; name: string }> = [
    // Directory italiane
    { domain: 'paginegialle.it', name: 'Pagine Gialle' },
    { domain: 'paginebianche.it', name: 'Pagine Bianche' },
    { domain: 'virgilio.it', name: 'Virgilio' },
    { domain: 'tuttocitta.it', name: 'TuttoCittà' },
    { domain: 'misterimprese.it', name: 'MisterImprese' },
    { domain: 'europages.it', name: 'Europages IT' },
    { domain: 'europages.com', name: 'Europages' },
    { domain: 'kompass.com', name: 'Kompass' },
    { domain: 'infobel.com', name: 'Infobel' },
    { domain: 'hotfrog.it', name: 'Hotfrog IT' },
    { domain: 'hotfrog.com', name: 'Hotfrog' },
    { domain: 'cylex.it', name: 'Cylex IT' },
    { domain: 'cylex.com', name: 'Cylex' },
    { domain: 'italiaonline.it', name: 'Italia Online' },
    { domain: 'pronto.it', name: 'Pronto.it' },
    { domain: 'guidamonaci.it', name: 'Guida Monaci' },
    { domain: 'comuni-italiani.it', name: 'Comuni Italiani' },

    // Directory internazionali
    { domain: 'tripadvisor.com', name: 'TripAdvisor' },
    { domain: 'tripadvisor.it', name: 'TripAdvisor IT' },
    { domain: 'tripadvisor.co.uk', name: 'TripAdvisor UK' },
    { domain: 'tripadvisor.de', name: 'TripAdvisor DE' },
    { domain: 'tripadvisor.fr', name: 'TripAdvisor FR' },
    { domain: 'yelp.com', name: 'Yelp' },
    { domain: 'yelp.it', name: 'Yelp IT' },
    { domain: 'yelp.co.uk', name: 'Yelp UK' },
    { domain: 'booking.com', name: 'Booking.com' },
    { domain: 'expedia.com', name: 'Expedia' },
    { domain: 'expedia.it', name: 'Expedia IT' },
    { domain: 'hotels.com', name: 'Hotels.com' },
    { domain: 'trivago.it', name: 'Trivago IT' },
    { domain: 'trivago.com', name: 'Trivago' },
    { domain: 'foursquare.com', name: 'Foursquare' },
    { domain: 'yellowpages.com', name: 'Yellow Pages' },
    { domain: 'whitepages.com', name: 'White Pages' },
    { domain: 'yell.com', name: 'Yell' },
    { domain: 'thomsonlocal.com', name: 'Thomson Local' },
    { domain: 'angieslist.com', name: 'Angie\'s List' },
    { domain: 'bbb.org', name: 'Better Business Bureau' },
    { domain: 'trustpilot.com', name: 'Trustpilot' },
    { domain: 'glassdoor.com', name: 'Glassdoor' },
    { domain: 'indeed.com', name: 'Indeed' },

    // Mappe e listings
    { domain: 'google.com', name: 'Google' },
    { domain: 'google.it', name: 'Google IT' },
    { domain: 'maps.google.com', name: 'Google Maps' },
    { domain: 'maps.google.it', name: 'Google Maps IT' },
    { domain: 'bing.com', name: 'Bing' },
    { domain: 'apple.com', name: 'Apple' },
    { domain: 'here.com', name: 'HERE Maps' },
    { domain: 'openstreetmap.org', name: 'OpenStreetMap' },
    { domain: 'waze.com', name: 'Waze' },

    // Food delivery & ristorazione
    { domain: 'justeat.it', name: 'Just Eat IT' },
    { domain: 'just-eat.it', name: 'Just Eat IT' },
    { domain: 'justeat.com', name: 'Just Eat' },
    { domain: 'deliveroo.it', name: 'Deliveroo IT' },
    { domain: 'deliveroo.com', name: 'Deliveroo' },
    { domain: 'ubereats.com', name: 'Uber Eats' },
    { domain: 'glovo.com', name: 'Glovo' },
    { domain: 'foodora.com', name: 'Foodora' },
    { domain: 'thefork.it', name: 'TheFork IT' },
    { domain: 'thefork.com', name: 'TheFork' },
    { domain: 'lafourchette.com', name: 'LaFourchette' },

    // Portali settoriali
    { domain: 'matrimonio.com', name: 'Matrimonio.com' },
    { domain: 'doctolib.it', name: 'Doctolib IT' },
    { domain: 'doctolib.fr', name: 'Doctolib FR' },
    { domain: 'miodottore.it', name: 'MioDottore' },
    { domain: 'pazienti.it', name: 'Pazienti.it' },
    { domain: 'dottori.it', name: 'Dottori.it' },
    { domain: 'immobiliare.it', name: 'Immobiliare.it' },
    { domain: 'idealista.it', name: 'Idealista IT' },
    { domain: 'idealista.com', name: 'Idealista' },
    { domain: 'casa.it', name: 'Casa.it' },
    { domain: 'subito.it', name: 'Subito.it' },
    { domain: 'kijiji.it', name: 'Kijiji IT' },
    { domain: 'bakeca.it', name: 'Bakeca.it' },
    { domain: 'houzz.it', name: 'Houzz IT' },
    { domain: 'houzz.com', name: 'Houzz' },

    // E-commerce marketplaces
    { domain: 'amazon.it', name: 'Amazon IT' },
    { domain: 'amazon.com', name: 'Amazon' },
    { domain: 'ebay.it', name: 'eBay IT' },
    { domain: 'ebay.com', name: 'eBay' },
    { domain: 'etsy.com', name: 'Etsy' },
    { domain: 'aliexpress.com', name: 'AliExpress' },

    // Automotive
    { domain: 'autoscout24.it', name: 'AutoScout24 IT' },
    { domain: 'automobile.it', name: 'Automobile.it' },
  ]

  // Social media domains
  private readonly SOCIAL_DOMAINS: Array<{ domain: string; name: string }> = [
    { domain: 'facebook.com', name: 'Facebook' },
    { domain: 'fb.com', name: 'Facebook' },
    { domain: 'instagram.com', name: 'Instagram' },
    { domain: 'linkedin.com', name: 'LinkedIn' },
    { domain: 'twitter.com', name: 'Twitter' },
    { domain: 'x.com', name: 'X (Twitter)' },
    { domain: 'tiktok.com', name: 'TikTok' },
    { domain: 'youtube.com', name: 'YouTube' },
    { domain: 'youtu.be', name: 'YouTube' },
    { domain: 'pinterest.com', name: 'Pinterest' },
    { domain: 'pinterest.it', name: 'Pinterest IT' },
    { domain: 'telegram.org', name: 'Telegram' },
    { domain: 't.me', name: 'Telegram' },
    { domain: 'wa.me', name: 'WhatsApp' },
    { domain: 'whatsapp.com', name: 'WhatsApp' },
    { domain: 'threads.net', name: 'Threads' },
    { domain: 'snapchat.com', name: 'Snapchat' },
    { domain: 'vimeo.com', name: 'Vimeo' },
    { domain: 'tumblr.com', name: 'Tumblr' },
    { domain: 'reddit.com', name: 'Reddit' },
  ]

  // Pattern per rilevare subpath di listing
  private readonly LISTING_PATH_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
    { pattern: /\/biz\//i, name: 'Yelp business' },
    { pattern: /\/Restaurant_Review/i, name: 'TripAdvisor restaurant' },
    { pattern: /\/Hotel_Review/i, name: 'TripAdvisor hotel' },
    { pattern: /\/Attraction_Review/i, name: 'TripAdvisor attraction' },
    { pattern: /\/ShowUserReviews/i, name: 'TripAdvisor reviews' },
    { pattern: /\/aziende\//i, name: 'Directory aziende' },
    { pattern: /\/scheda\//i, name: 'Scheda directory' },
    { pattern: /\/maps\/place\//i, name: 'Google Maps place' },
    { pattern: /\/venue\//i, name: 'Venue listing' },
    { pattern: /\/pages\//i, name: 'Facebook page' },
    { pattern: /\/company\//i, name: 'LinkedIn company' },
    { pattern: /\/in\//i, name: 'LinkedIn profile' },
    { pattern: /\/profile\//i, name: 'Social profile' },
    { pattern: /\/@[a-zA-Z0-9_]+/i, name: 'Social handle' },
    { pattern: /\/business\//i, name: 'Business listing' },
    { pattern: /\/listing\//i, name: 'Generic listing' },
    { pattern: /\/directory\//i, name: 'Directory entry' },
    { pattern: /\/search\?/i, name: 'Search results' },
    { pattern: /\/results\?/i, name: 'Search results' },
  ]

  constructor(config?: Partial<DomainClassifierConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Classifica un URL
   */
  classify(url: string): DomainClassification {
    if (!url || typeof url !== 'string') {
      return {
        type: 'unknown',
        isAcceptable: false,
        reason: 'URL non valido o vuoto',
        domain: '',
        fullUrl: url || ''
      }
    }

    // Normalizza URL
    const normalizedUrl = this.normalizeUrl(url)
    const domain = this.extractDomain(normalizedUrl)

    if (!domain) {
      return {
        type: 'unknown',
        isAcceptable: false,
        reason: 'Impossibile estrarre dominio',
        domain: '',
        fullUrl: url
      }
    }

    // Verifica whitelist custom
    if (this.config.customWhitelist?.some(w => domain.includes(w))) {
      return {
        type: 'proprietary',
        isAcceptable: true,
        reason: 'Dominio in whitelist',
        domain,
        fullUrl: normalizedUrl
      }
    }

    // Verifica blacklist custom
    if (this.config.customBlacklist?.some(b => domain.includes(b))) {
      return {
        type: 'listing',
        isAcceptable: false,
        reason: 'Dominio in blacklist',
        domain,
        fullUrl: normalizedUrl
      }
    }

    // Verifica se è un social media
    const socialMatch = this.SOCIAL_DOMAINS.find(s => domain.includes(s.domain))
    if (socialMatch) {
      return {
        type: 'social',
        isAcceptable: this.config.allowSocialMedia,
        reason: `Social media: ${socialMatch.name}`,
        domain,
        fullUrl: normalizedUrl,
        listingName: socialMatch.name
      }
    }

    // Verifica se è una directory/listing
    const listingMatch = this.LISTING_DOMAINS.find(l => domain.includes(l.domain))
    if (listingMatch) {
      return {
        type: listingMatch.domain.includes('google') || listingMatch.domain.includes('maps') ? 'maps' : 'listing',
        isAcceptable: false,
        reason: `Directory/Listing: ${listingMatch.name}`,
        domain,
        fullUrl: normalizedUrl,
        listingName: listingMatch.name
      }
    }

    // Verifica path patterns
    const pathMatch = this.LISTING_PATH_PATTERNS.find(p => p.pattern.test(normalizedUrl))
    if (pathMatch) {
      return {
        type: 'listing',
        isAcceptable: false,
        reason: `Path di listing: ${pathMatch.name}`,
        domain,
        fullUrl: normalizedUrl,
        listingName: pathMatch.name
      }
    }

    // Verifica se sembra un sito proprietario valido
    if (this.looksLikeProprietaryDomain(domain)) {
      return {
        type: 'proprietary',
        isAcceptable: true,
        reason: 'Dominio proprietario valido',
        domain,
        fullUrl: normalizedUrl
      }
    }

    // Default: sconosciuto ma accettabile se non strict mode
    return {
      type: 'unknown',
      isAcceptable: !this.config.strictMode,
      reason: this.config.strictMode ? 'Dominio sconosciuto (strict mode)' : 'Dominio sconosciuto ma accettato',
      domain,
      fullUrl: normalizedUrl
    }
  }

  /**
   * Verifica se un URL è un sito proprietario accettabile
   */
  isProprietaryWebsite(url: string): boolean {
    const classification = this.classify(url)
    return classification.isAcceptable
  }

  /**
   * Normalizza URL (aggiunge protocollo se mancante)
   */
  private normalizeUrl(url: string): string {
    let normalized = url.trim()

    // Rimuovi spazi e caratteri strani
    normalized = normalized.replace(/\s+/g, '')

    // Aggiungi protocollo se mancante
    if (!normalized.match(/^https?:\/\//i)) {
      normalized = `https://${normalized}`
    }

    try {
      const parsed = new URL(normalized)
      return parsed.toString()
    } catch {
      return normalized
    }
  }

  /**
   * Estrae il dominio da un URL
   */
  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url)
      return parsed.hostname.toLowerCase().replace(/^www\./, '')
    } catch {
      // Fallback: prova a estrarre con regex
      const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/i)
      return match ? match[1].toLowerCase() : ''
    }
  }

  /**
   * Verifica se un dominio sembra proprietario
   */
  private looksLikeProprietaryDomain(domain: string): boolean {
    // Deve avere almeno un TLD valido
    const validTLDs = [
      '.it', '.com', '.net', '.org', '.eu', '.info', '.biz',
      '.co', '.io', '.me', '.tv', '.shop', '.store', '.online',
      '.site', '.website', '.tech', '.app', '.dev', '.design',
      '.studio', '.agency', '.consulting', '.solutions', '.services',
      '.restaurant', '.bar', '.cafe', '.pizza', '.hotel'
    ]

    const hasTLD = validTLDs.some(tld => domain.endsWith(tld))
    if (!hasTLD) {
      return false
    }

    // Non deve contenere pattern sospetti
    const suspiciousPatterns = [
      /^[0-9]+\./,          // IP address
      /localhost/i,
      /example\./i,
      /test\./i,
      /demo\./i,
      /staging\./i,
      /dev\./i,
      /preview\./i
    ]

    return !suspiciousPatterns.some(p => p.test(domain))
  }

  /**
   * Ottiene statistiche di classificazione per un batch di URL
   */
  classifyBatch(urls: string[]): {
    classifications: DomainClassification[]
    stats: {
      total: number
      proprietary: number
      listing: number
      social: number
      maps: number
      unknown: number
      acceptable: number
      rejected: number
    }
  } {
    const classifications = urls.map(url => this.classify(url))

    return {
      classifications,
      stats: {
        total: classifications.length,
        proprietary: classifications.filter(c => c.type === 'proprietary').length,
        listing: classifications.filter(c => c.type === 'listing').length,
        social: classifications.filter(c => c.type === 'social').length,
        maps: classifications.filter(c => c.type === 'maps').length,
        unknown: classifications.filter(c => c.type === 'unknown').length,
        acceptable: classifications.filter(c => c.isAcceptable).length,
        rejected: classifications.filter(c => !c.isAcceptable).length
      }
    }
  }

  /**
   * Aggiunge un dominio alla blacklist runtime
   */
  addToBlacklist(domain: string): void {
    if (!this.config.customBlacklist) {
      this.config.customBlacklist = []
    }
    if (!this.config.customBlacklist.includes(domain)) {
      this.config.customBlacklist.push(domain)
    }
  }

  /**
   * Aggiunge un dominio alla whitelist runtime
   */
  addToWhitelist(domain: string): void {
    if (!this.config.customWhitelist) {
      this.config.customWhitelist = []
    }
    if (!this.config.customWhitelist.includes(domain)) {
      this.config.customWhitelist.push(domain)
    }
  }
}

// Singleton per uso globale
let globalDomainClassifier: DomainClassifier | null = null

export function getGlobalDomainClassifier(config?: Partial<DomainClassifierConfig>): DomainClassifier {
  if (!globalDomainClassifier) {
    globalDomainClassifier = new DomainClassifier(config)
  }
  return globalDomainClassifier
}
