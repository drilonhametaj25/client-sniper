/**
 * Utilità per il parsing e la validazione dei contatti
 * Estrae e normalizza telefoni, email, partite IVA dal contenuto web
 * Evita conflitti tra diversi tipi di dati (es. P.IVA scambiata con telefono)
 */

export class ContactParser {
  
  /**
   * Regex per telefoni italiani
   * Supporta formati: +39, 0039, senza prefisso, con/senza spazi
   */
  private static readonly PHONE_PATTERNS = [
    /\+39\s*([0-9]{2,3})\s*([0-9]{3,4})\s*([0-9]{3,4})/g,
    /0039\s*([0-9]{2,3})\s*([0-9]{3,4})\s*([0-9]{3,4})/g,
    /(?<![\d])\b0([0-9]{1,2})\s*[\/\-\s]?\s*([0-9]{3,4})\s*([0-9]{3,4})\b(?![\d])/g, // Fissi con separatori
    /(?<![\d])\b3([0-9]{2})\s*([0-9]{3})\s*([0-9]{4})\b(?![\d])/g, // Cellulari
    /(?<![\d])\b0([0-9]{2,3})\s*([0-9]{6,8})\b(?![\d])/g, // Fissi senza separatori
  ]

  /**
   * Regex per email standard
   */
  private static readonly EMAIL_PATTERN = 
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g

  /**
   * Regex per Partita IVA italiana
   * Formato: IT + 11 cifre oppure solo 11 cifre
   */
  private static readonly PARTITA_IVA_PATTERNS = [
    /\bIT\s*([0-9]{11})\b/gi,
    /\b(?:P\.?\s*IVA|Partita\s+IVA|VAT)\s*:?\s*IT\s*([0-9]{11})\b/gi,
    /\b(?:P\.?\s*IVA|Partita\s+IVA|VAT)\s*:?\s*([0-9]{11})\b/gi,
    // Pattern più flessibili per catturare P.IVA nei testi
    /(?:P\.?\s*I\.?\s*V\.?\s*A\.?|Partita\s+IVA)\s*[:\-]?\s*(?:IT\s*)?([0-9]{11})/gi,
    // Pattern generale per 11 cifre che potrebbero essere P.IVA (sarà filtrato dopo)
    /\b([0-9]{11})\b/g,
  ]

  /**
   * Estrae tutti i telefoni dal testo
   */
  static extractPhones(text: string): string[] {
    const phones = new Set<string>()
    
    for (const pattern of this.PHONE_PATTERNS) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        const cleanPhone = this.normalizePhone(match[0])
        if (cleanPhone && this.isValidItalianPhone(cleanPhone)) {
          phones.add(cleanPhone)
        }
      }
    }
    
    return Array.from(phones)
  }

  /**
   * Estrae email dal testo
   */
  static extractEmails(text: string): string[] {
    const emails = new Set<string>()
    const matches = text.matchAll(this.EMAIL_PATTERN)
    
    for (const match of matches) {
      const email = match[0].toLowerCase()
      if (this.isValidEmail(email)) {
        emails.add(email)
      }
    }
    
    return Array.from(emails)
  }

  /**
   * Estrae Partite IVA dal testo
   */
  static extractPartitaIva(text: string): string[] {
    const partiteIva = new Set<string>()
    
    // Prima cerca pattern con contesto (IT, P.IVA, etc)
    const contextPatterns = this.PARTITA_IVA_PATTERNS.slice(0, 3)
    for (const pattern of contextPatterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        const piva = match[match.length - 1]
        if (piva && this.isValidPartitaIva(piva)) {
          partiteIva.add(`IT${piva}`)
        }
      }
    }
    
    // Se non trova nulla, cerca solo sequenze di 11 cifre che potrebbero essere P.IVA
    if (partiteIva.size === 0) {
      const numbers = text.match(/\b\d{11}\b/g) || []
      for (const num of numbers) {
        if (this.isValidPartitaIva(num) && !this.looksLikePhone(num)) {
          partiteIva.add(`IT${num}`)
        }
      }
    }
    
    return Array.from(partiteIva)
  }

  /**
   * Verifica se un numero di 11 cifre assomiglia a un telefono
   */
  private static looksLikePhone(num: string): boolean {
    // Inizia con 3 (cellulari) o con 0 (fissi) = probabilmente telefono
    return num.startsWith('3') || num.startsWith('0')
  }

  /**
   * Normalizza un numero di telefono
   */
  private static normalizePhone(phone: string): string {
    // Rimuovi spazi, trattini, parentesi
    let clean = phone.replace(/[\s\-\(\)\.]/g, '')
    
    // Converti prefissi internazionali
    if (clean.startsWith('0039')) {
      clean = '+39' + clean.substring(4)
    } else if (clean.startsWith('39') && clean.length > 10) {
      clean = '+39' + clean.substring(2)
    } else if (!clean.startsWith('+39') && clean.startsWith('0')) {
      clean = '+39' + clean
    } else if (!clean.startsWith('+39') && clean.startsWith('3')) {
      clean = '+39' + clean
    }
    
    return clean
  }

  /**
   * Valida se è un numero di telefono italiano valido
   */
  private static isValidItalianPhone(phone: string): boolean {
    // Deve iniziare con +39
    if (!phone.startsWith('+39')) return false
    
    const number = phone.substring(3)
    
    // Lunghezza corretta (9-11 cifre dopo +39)
    if (number.length < 9 || number.length > 11) return false
    
    // Solo cifre
    if (!/^\d+$/.test(number)) return false
    
    // Controlli specifici per tipologia
    if (number.startsWith('3')) {
      // Cellulare: deve essere lungo 10 cifre (3XXXXXXXX)
      return number.length === 10
    } else if (number.startsWith('0')) {
      // Fisso: 0X + 7-9 cifre aggiuntive
      return number.length >= 9 && number.length <= 11
    }
    
    return false
  }

  /**
   * Valida email
   */
  private static isValidEmail(email: string): boolean {
    // Esclude email troppo semplici o sospette
    if (email.length < 5) return false
    if (email.includes('..')) return false
    if (email.startsWith('.') || email.endsWith('.')) return false
    
    // Domini comuni italiani e internazionali
    const validDomains = [
      '.it', '.com', '.org', '.net', '.eu', '.info', 
      '.biz', '.co.uk', '.de', '.fr', '.es'
    ]
    
    return validDomains.some(domain => email.endsWith(domain))
  }

  /**
   * Valida Partita IVA italiana
   */
  private static isValidPartitaIva(piva: string): boolean {
    // Solo cifre, 11 caratteri
    if (!/^\d{11}$/.test(piva)) return false
    
    // Escludi P.IVA con tutte cifre uguali (00000000000, 11111111111, etc)
    if (/^(\d)\1{10}$/.test(piva)) return false
    
    // Algoritmo di verifica P.IVA italiana (checksum)
    let sum = 0
    for (let i = 0; i < 10; i++) {
      let digit = parseInt(piva[i])
      if (i % 2 === 1) {
        digit *= 2
        if (digit > 9) digit = digit - 9
      }
      sum += digit
    }
    
    const checkDigit = (10 - (sum % 10)) % 10
    return checkDigit === parseInt(piva[10])
  }

  /**
   * Rimuove falsi positivi quando un numero viene identificato 
   * sia come telefono che come P.IVA
   */
  static resolveDuplicates(text: string): {
    phones: string[]
    emails: string[]
    partiteIva: string[]
  } {
    const phones = this.extractPhones(text)
    const emails = this.extractEmails(text)
    const partiteIva = this.extractPartitaIva(text)
    
    // Rimuovi telefoni che sono in realtà P.IVA
    const cleanPhones = phones.filter(phone => {
      const number = phone.replace('+39', '')
      return !partiteIva.some(piva => piva.includes(number))
    })
    
    return {
      phones: cleanPhones,
      emails,
      partiteIva
    }
  }

  /**
   * Estrae tutti i contatti da un HTML/testo
   */
  static parseContacts(htmlOrText: string): {
    phones: string[]
    emails: string[]
    partiteIva: string[]
    hasContacts: boolean
  } {
    // Rimuovi tag HTML per analisi testuale
    const text = htmlOrText.replace(/<[^>]*>/g, ' ')
    
    const contacts = this.resolveDuplicates(text)
    
    return {
      ...contacts,
      hasContacts: contacts.phones.length > 0 || 
                   contacts.emails.length > 0 || 
                   contacts.partiteIva.length > 0
    }
  }
}
