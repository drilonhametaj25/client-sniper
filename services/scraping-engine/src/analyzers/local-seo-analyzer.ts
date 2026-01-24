/**
 * Local SEO Analyzer
 * Analizza aspetti SEO locale: Google Business Profile, NAP consistency,
 * citazioni locali, Schema LocalBusiness, keywords geografiche
 */

import { Page } from 'playwright'

export interface LocalCitation {
  platform: string
  found: boolean
  url?: string
  nameMatch?: boolean
  addressMatch?: boolean
  phoneMatch?: boolean
}

export interface LocalSEORecommendation {
  type: 'critical' | 'high' | 'medium' | 'low'
  issue: string
  recommendation: string
  impact: string
  estimatedEffort: 'low' | 'medium' | 'high'
}

export interface NAPInfo {
  name: string | null
  address: string | null
  phone: string | null
  city: string | null
  postalCode: string | null
  province: string | null
}

export interface LocalSEOAnalysis {
  // Google Business Profile
  hasGoogleBusinessLink: boolean
  googleBusinessUrl?: string
  hasGoogleMapsEmbed: boolean
  googleMapsEmbedCount: number

  // NAP Consistency
  napInfo: NAPInfo
  napConsistency: {
    score: number // 0-100
    issues: string[]
    phoneFormats: string[] // different formats found
    addressVariations: string[]
  }

  // Local Citations
  localCitations: LocalCitation[]
  citationScore: number // 0-100

  // Schema.org LocalBusiness
  hasLocalBusinessSchema: boolean
  localBusinessSchemaData?: {
    type: string
    name?: string
    address?: string
    telephone?: string
    openingHours?: string[]
    priceRange?: string
    geo?: { lat: number, lng: number }
  }

  // Geographic Keywords
  geoKeywords: {
    cityMentions: number
    provinceMentions: number
    regionMentions: number
    neighborhoodMentions: number
    density: number // keywords per 100 words
    foundKeywords: string[]
  }

  // Local Signals
  localSignals: {
    hasLocalPhoneNumber: boolean // numero italiano
    hasItalianAddress: boolean
    hasBusinessHours: boolean
    hasDirections: boolean
    hasLocalTestimonials: boolean
    hasLocalServiceArea: boolean
  }

  // Overall
  localSEOScore: number // 0-100
  recommendations: LocalSEORecommendation[]
}

// Italian provinces and regions for keyword detection
const ITALIAN_REGIONS = [
  'lombardia', 'lazio', 'campania', 'sicilia', 'veneto', 'emilia-romagna', 'piemonte',
  'puglia', 'toscana', 'calabria', 'sardegna', 'liguria', 'marche', 'abruzzo',
  'friuli-venezia giulia', 'trentino-alto adige', 'umbria', 'basilicata', 'molise',
  "valle d'aosta"
]

const MAJOR_CITIES = [
  'milano', 'roma', 'napoli', 'torino', 'palermo', 'genova', 'bologna', 'firenze',
  'bari', 'catania', 'venezia', 'verona', 'messina', 'padova', 'trieste', 'taranto',
  'brescia', 'parma', 'prato', 'modena', 'reggio calabria', 'reggio emilia',
  'perugia', 'ravenna', 'livorno', 'cagliari', 'foggia', 'rimini', 'salerno',
  'ferrara', 'sassari', 'latina', 'giugliano', 'monza', 'siracusa', 'pescara',
  'bergamo', 'forlì', 'trento', 'vicenza', 'terni', 'bolzano', 'novara', 'piacenza',
  'ancona', 'andria', 'arezzo', 'udine', 'cesena', 'lecce', 'pesaro', 'barletta'
]

export class LocalSEOAnalyzer {
  private businessName: string
  private businessCity: string
  private businessAddress?: string
  private businessPhone?: string

  constructor(
    businessName: string,
    businessCity: string,
    businessAddress?: string,
    businessPhone?: string
  ) {
    this.businessName = businessName.toLowerCase()
    this.businessCity = businessCity.toLowerCase()
    this.businessAddress = businessAddress?.toLowerCase()
    this.businessPhone = businessPhone?.replace(/\D/g, '')
  }

  async analyze(page: Page, url: string): Promise<LocalSEOAnalysis> {
    const [
      googleBusinessInfo,
      napInfo,
      schemaData,
      geoKeywords,
      localSignals,
      citations
    ] = await Promise.all([
      this.checkGoogleBusinessPresence(page),
      this.extractNAPInfo(page),
      this.extractLocalBusinessSchema(page),
      this.analyzeGeoKeywords(page),
      this.checkLocalSignals(page),
      this.checkLocalCitations(page, url)
    ])

    const napConsistency = this.analyzeNAPConsistency(napInfo)
    const citationScore = this.calculateCitationScore(citations)
    const recommendations = this.generateRecommendations(
      googleBusinessInfo,
      napConsistency,
      schemaData,
      geoKeywords,
      localSignals,
      citationScore
    )

    const localSEOScore = this.calculateOverallScore(
      googleBusinessInfo,
      napConsistency,
      schemaData,
      geoKeywords,
      localSignals,
      citationScore
    )

    return {
      hasGoogleBusinessLink: googleBusinessInfo.hasLink,
      googleBusinessUrl: googleBusinessInfo.url,
      hasGoogleMapsEmbed: googleBusinessInfo.hasMapsEmbed,
      googleMapsEmbedCount: googleBusinessInfo.mapsEmbedCount,
      napInfo,
      napConsistency,
      localCitations: citations,
      citationScore,
      hasLocalBusinessSchema: schemaData.hasSchema,
      localBusinessSchemaData: schemaData.data,
      geoKeywords,
      localSignals,
      localSEOScore,
      recommendations
    }
  }

  private async checkGoogleBusinessPresence(page: Page): Promise<{
    hasLink: boolean
    url?: string
    hasMapsEmbed: boolean
    mapsEmbedCount: number
  }> {
    try {
      const result = await page.evaluate(() => {
        const html = document.documentElement.outerHTML

        // Check for Google Business Profile links
        const gbpPatterns = [
          /google\.com\/maps\/place\//i,
          /maps\.google\.com/i,
          /g\.page\//i,
          /goo\.gl\/maps/i,
          /business\.google\.com/i
        ]

        let gbpUrl: string | undefined
        const links = Array.from(document.querySelectorAll('a[href]'))
        for (const link of links) {
          const href = link.getAttribute('href') || ''
          for (const pattern of gbpPatterns) {
            if (pattern.test(href)) {
              gbpUrl = href
              break
            }
          }
          if (gbpUrl) break
        }

        // Check for embedded Google Maps
        const iframes = Array.from(document.querySelectorAll('iframe'))
        const mapsEmbeds = iframes.filter(iframe => {
          const src = iframe.getAttribute('src') || ''
          return src.includes('google.com/maps') || src.includes('maps.google.com')
        })

        return {
          hasLink: !!gbpUrl,
          url: gbpUrl,
          hasMapsEmbed: mapsEmbeds.length > 0,
          mapsEmbedCount: mapsEmbeds.length
        }
      })

      return result
    } catch {
      return {
        hasLink: false,
        hasMapsEmbed: false,
        mapsEmbedCount: 0
      }
    }
  }

  private async extractNAPInfo(page: Page): Promise<NAPInfo> {
    try {
      return await page.evaluate(() => {
        const html = document.body.innerText

        // Phone patterns (Italian)
        const phonePatterns = [
          /(?:\+39|0039)?[\s.-]?\(?0?\d{2,4}\)?[\s.-]?\d{6,8}/g,
          /(?:\+39|0039)?[\s.-]?3\d{2}[\s.-]?\d{6,7}/g
        ]

        let phone: string | null = null
        for (const pattern of phonePatterns) {
          const match = html.match(pattern)
          if (match) {
            phone = match[0].replace(/[\s.-]/g, '')
            break
          }
        }

        // Address pattern (Italian)
        const addressPattern = /(?:via|viale|corso|piazza|piazzale|largo|vicolo|strada)\s+[A-Za-zÀ-ÿ\s.]+,?\s*\d+[a-z]?/gi
        const addressMatch = html.match(addressPattern)
        const address = addressMatch ? addressMatch[0] : null

        // CAP (Postal Code)
        const capPattern = /\b\d{5}\b/g
        const capMatches = html.match(capPattern)
        const postalCode = capMatches ? capMatches[0] : null

        // Try to extract business name from structured data or title
        const schemaScript = document.querySelector('script[type="application/ld+json"]')
        let name: string | null = null
        if (schemaScript) {
          try {
            const data = JSON.parse(schemaScript.textContent || '')
            if (data.name) name = data.name
            else if (data['@graph']) {
              const org = data['@graph'].find((item: any) =>
                item['@type'] === 'Organization' ||
                item['@type'] === 'LocalBusiness'
              )
              if (org) name = org.name
            }
          } catch {}
        }

        if (!name) {
          const ogTitle = document.querySelector('meta[property="og:site_name"]')
          name = ogTitle?.getAttribute('content') || null
        }

        return {
          name,
          address,
          phone,
          city: null, // Will be detected from address
          postalCode,
          province: null
        }
      })
    } catch {
      return {
        name: null,
        address: null,
        phone: null,
        city: null,
        postalCode: null,
        province: null
      }
    }
  }

  private async extractLocalBusinessSchema(page: Page): Promise<{
    hasSchema: boolean
    data?: LocalSEOAnalysis['localBusinessSchemaData']
  }> {
    try {
      return await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))

        for (const script of scripts) {
          try {
            const data = JSON.parse(script.textContent || '')

            // Direct LocalBusiness type
            const localTypes = [
              'LocalBusiness', 'Restaurant', 'Store', 'ProfessionalService',
              'HealthAndBeautyBusiness', 'HomeAndConstructionBusiness',
              'LegalService', 'RealEstateAgent', 'TravelAgency', 'Dentist',
              'Physician', 'Attorney', 'Accountant', 'AutoRepair', 'Bakery',
              'BarOrPub', 'BeautySalon', 'Cafe', 'DayCare', 'Electrician',
              'Florist', 'GasStation', 'GroceryStore', 'HairSalon', 'Hotel',
              'InsuranceAgency', 'Locksmith', 'MovingCompany', 'Notary',
              'Optician', 'Pharmacy', 'Plumber', 'VeterinaryCare'
            ]

            let localBusiness = null

            if (localTypes.includes(data['@type'])) {
              localBusiness = data
            } else if (data['@graph']) {
              localBusiness = data['@graph'].find((item: any) =>
                localTypes.includes(item['@type'])
              )
            }

            if (localBusiness) {
              const address = localBusiness.address
              let addressStr = ''
              if (typeof address === 'string') {
                addressStr = address
              } else if (address) {
                addressStr = [
                  address.streetAddress,
                  address.postalCode,
                  address.addressLocality,
                  address.addressRegion
                ].filter(Boolean).join(', ')
              }

              return {
                hasSchema: true,
                data: {
                  type: localBusiness['@type'],
                  name: localBusiness.name,
                  address: addressStr,
                  telephone: localBusiness.telephone,
                  openingHours: localBusiness.openingHours ||
                    localBusiness.openingHoursSpecification?.map((h: any) =>
                      `${h.dayOfWeek}: ${h.opens}-${h.closes}`
                    ),
                  priceRange: localBusiness.priceRange,
                  geo: localBusiness.geo ? {
                    lat: parseFloat(localBusiness.geo.latitude),
                    lng: parseFloat(localBusiness.geo.longitude)
                  } : undefined
                }
              }
            }
          } catch {}
        }

        return { hasSchema: false }
      })
    } catch {
      return { hasSchema: false }
    }
  }

  private async analyzeGeoKeywords(page: Page): Promise<LocalSEOAnalysis['geoKeywords']> {
    try {
      const text = await page.evaluate(() => {
        return document.body.innerText.toLowerCase()
      })

      const words = text.split(/\s+/).length
      const foundKeywords: string[] = []
      let cityMentions = 0
      let provinceMentions = 0
      let regionMentions = 0
      let neighborhoodMentions = 0

      // Check for target city
      const cityRegex = new RegExp(`\\b${this.businessCity}\\b`, 'gi')
      const cityMatches = text.match(cityRegex)
      if (cityMatches) {
        cityMentions = cityMatches.length
        foundKeywords.push(this.businessCity)
      }

      // Check for other major cities
      for (const city of MAJOR_CITIES) {
        if (city !== this.businessCity) {
          const regex = new RegExp(`\\b${city}\\b`, 'gi')
          const matches = text.match(regex)
          if (matches) {
            cityMentions += matches.length
            if (!foundKeywords.includes(city)) {
              foundKeywords.push(city)
            }
          }
        }
      }

      // Check for regions
      for (const region of ITALIAN_REGIONS) {
        const regex = new RegExp(`\\b${region}\\b`, 'gi')
        const matches = text.match(regex)
        if (matches) {
          regionMentions += matches.length
          if (!foundKeywords.includes(region)) {
            foundKeywords.push(region)
          }
        }
      }

      // Common local keywords
      const localTerms = ['zona', 'quartiere', 'centro', 'periferia', 'dintorni', 'provincia']
      for (const term of localTerms) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi')
        const matches = text.match(regex)
        if (matches) {
          neighborhoodMentions += matches.length
        }
      }

      const totalGeoMentions = cityMentions + provinceMentions + regionMentions + neighborhoodMentions
      const density = words > 0 ? (totalGeoMentions / words) * 100 : 0

      return {
        cityMentions,
        provinceMentions,
        regionMentions,
        neighborhoodMentions,
        density: Math.round(density * 100) / 100,
        foundKeywords: foundKeywords.slice(0, 10)
      }
    } catch {
      return {
        cityMentions: 0,
        provinceMentions: 0,
        regionMentions: 0,
        neighborhoodMentions: 0,
        density: 0,
        foundKeywords: []
      }
    }
  }

  private async checkLocalSignals(page: Page): Promise<LocalSEOAnalysis['localSignals']> {
    try {
      return await page.evaluate(() => {
        const html = document.body.innerText.toLowerCase()
        const fullHtml = document.documentElement.outerHTML.toLowerCase()

        // Italian phone number
        const italianPhonePattern = /(?:\+39|0039|0)\s?\d{2,4}[\s.-]?\d{6,8}/
        const hasLocalPhoneNumber = italianPhonePattern.test(html)

        // Italian address indicators
        const addressIndicators = [
          'via ', 'viale ', 'corso ', 'piazza ', 'piazzale ',
          'largo ', 'vicolo ', 'strada ', 'cap ', 'c.a.p.'
        ]
        const hasItalianAddress = addressIndicators.some(ind => html.includes(ind))

        // Business hours indicators
        const hoursIndicators = [
          'orari', 'apertura', 'chiusura', 'aperto', 'chiuso',
          'lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom',
          'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica',
          'ore ', 'h ', '9:00', '10:00', '8:30'
        ]
        const hasBusinessHours = hoursIndicators.some(ind => html.includes(ind))

        // Directions
        const directionsIndicators = [
          'come raggiungerci', 'dove siamo', 'indicazioni',
          'mappa', 'raggiungici', 'trovarci', 'posizione'
        ]
        const hasDirections = directionsIndicators.some(ind => html.includes(ind))

        // Local testimonials/reviews
        const testimonialIndicators = [
          'recensioni', 'opinioni', 'testimonianze', 'clienti soddisfatti',
          'cosa dicono', 'feedback'
        ]
        const hasLocalTestimonials = testimonialIndicators.some(ind => html.includes(ind))

        // Service area
        const serviceAreaIndicators = [
          'zone servite', 'area di servizio', 'operiamo a', 'serviamo',
          'copriamo', 'zona di intervento', 'ci trovate a'
        ]
        const hasLocalServiceArea = serviceAreaIndicators.some(ind => html.includes(ind))

        return {
          hasLocalPhoneNumber,
          hasItalianAddress,
          hasBusinessHours,
          hasDirections,
          hasLocalTestimonials,
          hasLocalServiceArea
        }
      })
    } catch {
      return {
        hasLocalPhoneNumber: false,
        hasItalianAddress: false,
        hasBusinessHours: false,
        hasDirections: false,
        hasLocalTestimonials: false,
        hasLocalServiceArea: false
      }
    }
  }

  private async checkLocalCitations(page: Page, url: string): Promise<LocalCitation[]> {
    // Check for links to major citation platforms
    const citations: LocalCitation[] = []

    const platforms = [
      { name: 'Google Business', patterns: ['g.page/', 'google.com/maps/place', 'maps.google.com'] },
      { name: 'Facebook', patterns: ['facebook.com/', 'fb.com/'] },
      { name: 'Yelp', patterns: ['yelp.it/', 'yelp.com/'] },
      { name: 'PagineGialle', patterns: ['paginegialle.it/', 'pg.it/'] },
      { name: 'TripAdvisor', patterns: ['tripadvisor.it/', 'tripadvisor.com/'] },
      { name: 'LinkedIn', patterns: ['linkedin.com/company'] },
      { name: 'Instagram', patterns: ['instagram.com/'] },
      { name: 'Apple Maps', patterns: ['maps.apple.com/'] }
    ]

    try {
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => a.getAttribute('href') || '')
          .filter(href => href.startsWith('http'))
      })

      for (const platform of platforms) {
        const found = links.some(link =>
          platform.patterns.some(pattern => link.includes(pattern))
        )
        const matchedLink = links.find(link =>
          platform.patterns.some(pattern => link.includes(pattern))
        )

        citations.push({
          platform: platform.name,
          found,
          url: matchedLink,
          nameMatch: undefined,
          addressMatch: undefined,
          phoneMatch: undefined
        })
      }
    } catch {}

    return citations
  }

  private analyzeNAPConsistency(napInfo: NAPInfo): LocalSEOAnalysis['napConsistency'] {
    const issues: string[] = []
    const phoneFormats: string[] = []
    const addressVariations: string[] = []

    // Check if NAP info is complete
    if (!napInfo.name) {
      issues.push('Nome business non trovato nel sito')
    }
    if (!napInfo.address) {
      issues.push('Indirizzo non trovato nel sito')
    }
    if (!napInfo.phone) {
      issues.push('Numero di telefono non trovato nel sito')
    }

    // Check phone format consistency
    if (napInfo.phone) {
      phoneFormats.push(napInfo.phone)
      if (!napInfo.phone.startsWith('+39') && !napInfo.phone.startsWith('0039')) {
        issues.push('Numero di telefono senza prefisso internazionale +39')
      }
    }

    // Check address completeness
    if (napInfo.address) {
      addressVariations.push(napInfo.address)
      if (!napInfo.postalCode) {
        issues.push('CAP non trovato nell\'indirizzo')
      }
    }

    // Calculate score
    let score = 100
    score -= issues.length * 15
    score = Math.max(0, Math.min(100, score))

    return {
      score,
      issues,
      phoneFormats,
      addressVariations
    }
  }

  private calculateCitationScore(citations: LocalCitation[]): number {
    const found = citations.filter(c => c.found).length
    const total = citations.length
    return total > 0 ? Math.round((found / total) * 100) : 0
  }

  private generateRecommendations(
    googleBusiness: { hasLink: boolean; hasMapsEmbed: boolean },
    napConsistency: LocalSEOAnalysis['napConsistency'],
    schemaData: { hasSchema: boolean },
    geoKeywords: LocalSEOAnalysis['geoKeywords'],
    localSignals: LocalSEOAnalysis['localSignals'],
    citationScore: number
  ): LocalSEORecommendation[] {
    const recommendations: LocalSEORecommendation[] = []

    // Google Business Profile
    if (!googleBusiness.hasLink) {
      recommendations.push({
        type: 'critical',
        issue: 'Google Business Profile non collegato',
        recommendation: 'Creare e collegare un profilo Google Business Profile con link nel footer',
        impact: 'Fondamentale per visibilità nelle ricerche locali Google',
        estimatedEffort: 'medium'
      })
    }

    if (!googleBusiness.hasMapsEmbed) {
      recommendations.push({
        type: 'high',
        issue: 'Mappa Google non integrata',
        recommendation: 'Aggiungere iframe Google Maps nella pagina contatti',
        impact: 'Migliora UX e segnali locali per Google',
        estimatedEffort: 'low'
      })
    }

    // Schema LocalBusiness
    if (!schemaData.hasSchema) {
      recommendations.push({
        type: 'critical',
        issue: 'Schema LocalBusiness mancante',
        recommendation: 'Implementare markup Schema.org LocalBusiness con tutti i dati NAP',
        impact: 'Essenziale per rich snippets e comprensione Google',
        estimatedEffort: 'medium'
      })
    }

    // NAP Consistency
    if (napConsistency.score < 70) {
      recommendations.push({
        type: 'high',
        issue: 'NAP (Nome, Indirizzo, Telefono) incompleto o inconsistente',
        recommendation: 'Standardizzare e completare informazioni NAP in tutto il sito',
        impact: 'Cruciale per ranking locale e fiducia utenti',
        estimatedEffort: 'low'
      })
    }

    // Geographic keywords
    if (geoKeywords.density < 0.5) {
      recommendations.push({
        type: 'medium',
        issue: 'Scarsa presenza keywords geografiche',
        recommendation: `Aumentare menzioni di "${this.businessCity}" e zone servite nei contenuti`,
        impact: 'Migliora rilevanza per ricerche locali',
        estimatedEffort: 'medium'
      })
    }

    // Local signals
    if (!localSignals.hasBusinessHours) {
      recommendations.push({
        type: 'medium',
        issue: 'Orari di apertura non visibili',
        recommendation: 'Aggiungere orari di apertura in homepage e pagina contatti',
        impact: 'Migliora UX e completezza informazioni locali',
        estimatedEffort: 'low'
      })
    }

    if (!localSignals.hasLocalServiceArea) {
      recommendations.push({
        type: 'medium',
        issue: 'Area di servizio non specificata',
        recommendation: 'Creare pagina o sezione "Zone servite" con elenco città/quartieri',
        impact: 'Aumenta rilevanza per ricerche "servizio + zona"',
        estimatedEffort: 'medium'
      })
    }

    // Citations
    if (citationScore < 50) {
      recommendations.push({
        type: 'high',
        issue: 'Poche citazioni locali collegate',
        recommendation: 'Collegare profili su PagineGialle, Yelp, Facebook, TripAdvisor',
        impact: 'Aumenta autorità locale e backlinking',
        estimatedEffort: 'medium'
      })
    }

    return recommendations.sort((a, b) => {
      const priority = { critical: 0, high: 1, medium: 2, low: 3 }
      return priority[a.type] - priority[b.type]
    })
  }

  private calculateOverallScore(
    googleBusiness: { hasLink: boolean; hasMapsEmbed: boolean },
    napConsistency: LocalSEOAnalysis['napConsistency'],
    schemaData: { hasSchema: boolean },
    geoKeywords: LocalSEOAnalysis['geoKeywords'],
    localSignals: LocalSEOAnalysis['localSignals'],
    citationScore: number
  ): number {
    let score = 0
    const weights = {
      googleBusiness: 25,
      napConsistency: 20,
      schema: 15,
      geoKeywords: 15,
      localSignals: 15,
      citations: 10
    }

    // Google Business (25%)
    if (googleBusiness.hasLink) score += weights.googleBusiness * 0.7
    if (googleBusiness.hasMapsEmbed) score += weights.googleBusiness * 0.3

    // NAP Consistency (20%)
    score += (napConsistency.score / 100) * weights.napConsistency

    // Schema (15%)
    if (schemaData.hasSchema) score += weights.schema

    // Geo Keywords (15%)
    const keywordScore = Math.min(100, geoKeywords.density * 50 + geoKeywords.cityMentions * 5)
    score += (keywordScore / 100) * weights.geoKeywords

    // Local Signals (15%)
    const signalsCount = Object.values(localSignals).filter(Boolean).length
    score += (signalsCount / 6) * weights.localSignals

    // Citations (10%)
    score += (citationScore / 100) * weights.citations

    return Math.round(Math.min(100, Math.max(0, score)))
  }
}
