/**
 * Parser avanzato per contatti business e dati legali italiani
 * Distingue correttamente tra telefoni, P.IVA, email e indirizzi
 * Utilizzato dal Google Maps Scraper per parsing accurato dei contatti
 * Previene confusioni tra numeri di telefono e codici fiscali/P.IVA
 * 
 * Parte del modulo services/scraping-engine
 */

export interface ParsedContact {
  phones: string[]
  emails: string[]
  vatNumbers: string[] // P.IVA
  fiscalCodes: string[] // Codici fiscali
  addresses: string[]
  websites: string[]
  socialMedia: string[]
}

export interface ValidationResult {
  isValid: boolean
  type: 'phone' | 'email' | 'vat' | 'fiscal_code' | 'address' | 'website' | 'social' | 'unknown'
  normalized: string
  confidence: number // 0-1
}

export class BusinessContactParser {
  private readonly ITALIAN_PHONE_PATTERNS = [
    /^(\+39\s?)?0[0-9]{1,3}[\s\-]?[0-9]{6,8}$/, // Fisso italiano
    /^(\+39\s?)?3[0-9]{2}[\s\-]?[0-9]{6,7}$/, // Mobile italiano
    /^(\+39\s?)?\d{10}$/, // Formato compatto
    /^0[0-9]{2,3}[\s\-]?[0-9]{6,8}$/ // Senza prefisso internazionale
  ]

  private readonly VAT_PATTERNS = [
    /^IT[0-9]{11}$/, // P.IVA italiana con prefisso
    /^[0-9]{11}$/, // P.IVA italiana senza prefisso
    /^P\.?\s?IVA:?\s?([0-9]{11})$/i, // Con etichetta
    /^Partita\s+IVA:?\s?([0-9]{11})$/i // Con etichetta completa
  ]

  private readonly FISCAL_CODE_PATTERN = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/

  private readonly EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

  private readonly SOCIAL_PATTERNS = [
    /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[a-zA-Z0-9.]+/,
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[a-zA-Z0-9_.]+/,
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|company)\/[a-zA-Z0-9-]+/,
    /(?:https?:\/\/)?(?:www\.)?twitter\.com\/[a-zA-Z0-9_]+/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:channel|user|c)\/[a-zA-Z0-9-_]+/,
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[a-zA-Z0-9_.]+/
  ]

  /**
   * Analizza un testo e estrae tutti i contatti categorizzati
   */
  parseContacts(text: string): ParsedContact {
    const cleanText = this.cleanText(text)
    const tokens = this.tokenize(cleanText)
    
    const result: ParsedContact = {
      phones: [],
      emails: [],
      vatNumbers: [],
      fiscalCodes: [],
      addresses: [],
      websites: [],
      socialMedia: []
    }

    for (const token of tokens) {
      const validation = this.validateToken(token)
      
      if (validation.isValid && validation.confidence > 0.7) {
        switch (validation.type) {
          case 'phone':
            result.phones.push(validation.normalized)
            break
          case 'email':
            result.emails.push(validation.normalized)
            break
          case 'vat':
            result.vatNumbers.push(validation.normalized)
            break
          case 'fiscal_code':
            result.fiscalCodes.push(validation.normalized)
            break
          case 'website':
            result.websites.push(validation.normalized)
            break
          case 'social':
            result.socialMedia.push(validation.normalized)
            break
        }
      }
    }

    // Deduplica risultati
    return this.deduplicateContacts(result)
  }

  /**
   * Valida un singolo token e determina il tipo
   */
  private validateToken(token: string): ValidationResult {
    const cleanToken = token.trim()

    // Controllo P.IVA (priorità alta per evitare confusione con telefoni)
    if (this.isValidVatNumber(cleanToken)) {
      return {
        isValid: true,
        type: 'vat',
        normalized: this.normalizeVatNumber(cleanToken),
        confidence: 0.95
      }
    }

    // Controllo codice fiscale
    if (this.isValidFiscalCode(cleanToken)) {
      return {
        isValid: true,
        type: 'fiscal_code',
        normalized: cleanToken.toUpperCase(),
        confidence: 0.9
      }
    }

    // Controllo telefono (dopo P.IVA per evitare confusione)
    if (this.isValidPhone(cleanToken)) {
      return {
        isValid: true,
        type: 'phone',
        normalized: this.normalizePhone(cleanToken),
        confidence: 0.85
      }
    }

    // Controllo email
    if (this.isValidEmail(cleanToken)) {
      return {
        isValid: true,
        type: 'email',
        normalized: cleanToken.toLowerCase(),
        confidence: 0.9
      }
    }

    // Controllo social media
    if (this.isValidSocialMedia(cleanToken)) {
      return {
        isValid: true,
        type: 'social',
        normalized: cleanToken,
        confidence: 0.8
      }
    }

    // Controllo website
    if (this.isValidWebsite(cleanToken)) {
      return {
        isValid: true,
        type: 'website',
        normalized: this.normalizeWebsite(cleanToken),
        confidence: 0.75
      }
    }

    return {
      isValid: false,
      type: 'unknown',
      normalized: cleanToken,
      confidence: 0
    }
  }

  /**
   * Validazione P.IVA italiana
   */
  private isValidVatNumber(text: string): boolean {
    const cleanText = text.replace(/[^\d]/g, '')
    
    // Deve essere esattamente 11 cifre
    if (cleanText.length !== 11) return false
    
    // Controllo checksum P.IVA italiana
    return this.validateItalianVatChecksum(cleanText)
  }

  /**
   * Validazione checksum P.IVA italiana
   */
  private validateItalianVatChecksum(vatNumber: string): boolean {
    if (vatNumber.length !== 11) return false
    
    let sum = 0
    for (let i = 0; i < 10; i++) {
      const digit = parseInt(vatNumber[i])
      if (i % 2 === 0) {
        sum += digit
      } else {
        let doubled = digit * 2
        if (doubled > 9) doubled -= 9
        sum += doubled
      }
    }
    
    const checkDigit = (10 - (sum % 10)) % 10
    return checkDigit === parseInt(vatNumber[10])
  }

  /**
   * Validazione telefono italiano
   */
  private isValidPhone(text: string): boolean {
    const cleanText = text.replace(/[\s\-\(\)]/g, '')
    
    // Controllo lunghezza (evita P.IVA che sono 11 cifre)
    if (cleanText.length === 11 && /^\d{11}$/.test(cleanText)) {
      // Potrebbe essere P.IVA, verifica se ha caratteristiche di telefono
      return cleanText.startsWith('39') || cleanText.startsWith('0') || cleanText.startsWith('3')
    }
    
    return this.ITALIAN_PHONE_PATTERNS.some(pattern => pattern.test(cleanText))
  }

  /**
   * Validazione codice fiscale
   */
  private isValidFiscalCode(text: string): boolean {
    const cleanText = text.replace(/\s/g, '').toUpperCase()
    return this.FISCAL_CODE_PATTERN.test(cleanText)
  }

  /**
   * Validazione email
   */
  private isValidEmail(text: string): boolean {
    return this.EMAIL_PATTERN.test(text)
  }

  /**
   * Validazione social media
   */
  private isValidSocialMedia(text: string): boolean {
    return this.SOCIAL_PATTERNS.some(pattern => pattern.test(text))
  }

  /**
   * Validazione website
   */
  private isValidWebsite(text: string): boolean {
    try {
      const url = text.startsWith('http') ? text : `https://${text}`
      const parsed = new URL(url)
      return parsed.hostname.includes('.')
    } catch {
      return false
    }
  }

  /**
   * Normalizza numero P.IVA
   */
  private normalizeVatNumber(text: string): string {
    const numbers = text.replace(/[^\d]/g, '')
    return `IT${numbers}`
  }

  /**
   * Normalizza numero di telefono
   */
  private normalizePhone(text: string): string {
    let cleaned = text.replace(/[\s\-\(\)]/g, '')
    
    // Aggiungi prefisso italiano se mancante
    if (cleaned.startsWith('0') || cleaned.startsWith('3')) {
      cleaned = `+39${cleaned}`
    } else if (!cleaned.startsWith('+39')) {
      cleaned = `+39${cleaned}`
    }
    
    return cleaned
  }

  /**
   * Normalizza website URL
   */
  private normalizeWebsite(text: string): string {
    try {
      const url = text.startsWith('http') ? text : `https://${text}`
      const parsed = new URL(url)
      return parsed.toString()
    } catch {
      return text
    }
  }

  /**
   * Pulisce il testo da caratteri speciali
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[""'']/g, '"')
      .trim()
  }

  /**
   * Tokenizza il testo in potenziali contatti
   */
  private tokenize(text: string): string[] {
    const tokens = []
    
    // Regex per estrarre pattern di contatti
    const patterns = [
      /\b\d{10,11}\b/g, // Numeri lunghi (telefoni/P.IVA)
      /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/g, // Codici fiscali
      /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, // Email
      /\bhttps?:\/\/[^\s]+/g, // URL
      /\bwww\.[^\s]+/g, // www domains
      /\b[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\b/g, // Domini
      /\+39\s?\d{2,3}\s?\d{6,8}/g, // Telefoni con prefisso
      /\b0\d{1,3}\s?\d{6,8}/g, // Telefoni fissi
      /\b3\d{2}\s?\d{6,7}/g // Cellulari
    ]
    
    for (const pattern of patterns) {
      const matches = text.match(pattern)
      if (matches) {
        tokens.push(...matches)
      }
    }
    
    return [...new Set(tokens)] // Deduplica
  }

  /**
   * Rimuove duplicati dai contatti
   */
  private deduplicateContacts(contacts: ParsedContact): ParsedContact {
    return {
      phones: [...new Set(contacts.phones)],
      emails: [...new Set(contacts.emails)],
      vatNumbers: [...new Set(contacts.vatNumbers)],
      fiscalCodes: [...new Set(contacts.fiscalCodes)],
      addresses: [...new Set(contacts.addresses)],
      websites: [...new Set(contacts.websites)],
      socialMedia: [...new Set(contacts.socialMedia)]
    }
  }

  /**
   * Identifica se un numero è probabilmente un telefono o P.IVA
   */
  static distinguishPhoneFromVat(number: string): 'phone' | 'vat' | 'unknown' {
    const cleanNumber = number.replace(/[^\d]/g, '')
    
    if (cleanNumber.length === 11) {
      // Potrebbe essere P.IVA
      const parser = new BusinessContactParser()
      if (parser.validateItalianVatChecksum(cleanNumber)) {
        return 'vat'
      }
      
      // Potrebbe essere telefono con prefisso
      if (cleanNumber.startsWith('39')) {
        return 'phone'
      }
    }
    
    if (cleanNumber.length === 10 && cleanNumber.startsWith('3')) {
      return 'phone'
    }
    
    return 'unknown'
  }
}
