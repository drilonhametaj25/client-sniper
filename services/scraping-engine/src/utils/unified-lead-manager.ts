/**
 * Sistema avanzato di deduplicazione e arricchimento lead
 * Previene duplicati tra fonti diverse (Google Maps, Pagine Gialle, etc.)
 * Arricchisce lead esistenti con nuovi dati invece di creare copie
 */

import crypto from 'crypto'

interface LeadMatchCriteria {
  business_name: string
  city: string
  website_url?: string
  phone?: string
  address?: string
}

interface ExistingLead {
  id: string
  business_name: string
  city: string
  website_url?: string
  phone?: string
  address?: string
  sources: string[]
  content_hash: string
  last_seen_at: string
  created_at: string
  score?: number
  analysis?: any
  needed_roles?: string[]
  issues?: string[]
  similarityScore?: number
}

export class UnifiedLeadManager {
  private supabase: any

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient
  }

  /**
   * Trova lead esistenti che potrebbero essere lo stesso business
   * Usa logica intelligente per matching cross-source
   */
  async findPotentialDuplicates(criteria: LeadMatchCriteria): Promise<ExistingLead[]> {
    const queries: Promise<any>[] = []

    // 1. MATCH ESATTO: Nome + Città
    queries.push(
      this.supabase
        .from('leads')
        .select('id, business_name, city, website_url, phone, address, sources, content_hash, last_seen_at, created_at')
        .ilike('business_name', criteria.business_name)
        .ilike('city', criteria.city)
    )

    // 2. MATCH WEBSITE: Stesso dominio
    if (criteria.website_url) {
      const domain = this.extractDomain(criteria.website_url)
      queries.push(
        this.supabase
          .from('leads')
          .select('id, business_name, city, website_url, phone, address, sources, content_hash, last_seen_at, created_at')
          .ilike('website_url', `%${domain}%`)
      )
    }

    // 3. MATCH TELEFONO: Stesso numero
    if (criteria.phone) {
      const cleanPhone = this.normalizePhone(criteria.phone)
      queries.push(
        this.supabase
          .from('leads')
          .select('id, business_name, city, website_url, phone, address, sources, content_hash, last_seen_at, created_at')
          .ilike('phone', `%${cleanPhone}%`)
      )
    }

    // 4. MATCH INDIRIZZO: Stesso indirizzo normalizzato
    if (criteria.address) {
      const normalizedAddress = this.normalizeAddress(criteria.address)
      queries.push(
        this.supabase
          .from('leads')
          .select('id, business_name, city, website_url, phone, address, sources, content_hash, last_seen_at, created_at')
          .ilike('address', `%${normalizedAddress}%`)
      )
    }

    // Esegui tutte le query
    const results = await Promise.allSettled(queries)
    const allLeads: ExistingLead[] = []

    // Combina i risultati
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.data) {
        allLeads.push(...result.value.data)
      }
    })

    // Deduplica e calcola score di similarità
    const uniqueLeads = this.deduplicateAndScore(allLeads, criteria)
    
    return uniqueLeads.filter(lead => lead.similarityScore > 0.7) // Solo match > 70%
  }

  /**
   * Salva o aggiorna un lead con logica di arricchimento intelligente
   */
  async saveOrEnrichLead(
    leadData: LeadMatchCriteria & { 
      source: string
      analysis?: any
      score?: number
      needed_roles?: string[]
      issues?: string[]
    }
  ): Promise<{ success: boolean; leadId: string; wasUpdated: boolean; error?: string }> {
    try {
      // 1. Cerca lead esistenti simili
      const potentialDuplicates = await this.findPotentialDuplicates(leadData)
      
      const contentHash = this.generateContentHash(leadData)
      
      if (potentialDuplicates.length > 0) {
        // ARRICCHISCI LEAD ESISTENTE
        const bestMatch = potentialDuplicates[0] // Quello con score più alto
        
        console.log(`🔄 Arricchimento lead esistente: ${bestMatch.business_name} con nuovi dati da ${leadData.source}`)
        
        const enrichedData = this.mergeLeadData(bestMatch, leadData)
        
        const { error } = await this.supabase
          .from('leads')
          .update({
            ...enrichedData,
            content_hash: contentHash,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Aggiungi la nuova fonte alle fonti esistenti (compatibilità ES5)
            sources: Array.from(new Set([...(bestMatch.sources || [leadData.source.split('_')[0]]), leadData.source]))
          })
          .eq('id', bestMatch.id)

        if (error) throw error

        return { 
          success: true, 
          leadId: bestMatch.id, 
          wasUpdated: true 
        }
      } else {
        // CREA NUOVO LEAD
        const newLeadData = {
          ...leadData,
          sources: [leadData.source],
          content_hash: contentHash,
          unique_key: this.generateUniversalUniqueKey(leadData),
          last_seen_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }

        const { data: newLead, error } = await this.supabase
          .from('leads')
          .insert([newLeadData])
          .select('id')
          .single()

        if (error) throw error

        console.log(`✅ Nuovo lead creato: ${leadData.business_name} da ${leadData.source}`)

        return { 
          success: true, 
          leadId: newLead.id, 
          wasUpdated: false 
        }
      }
    } catch (error) {
      console.error('❌ Errore save/enrich lead:', error)
      return { 
        success: false, 
        leadId: '', 
        wasUpdated: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      }
    }
  }

  /**
   * Merge intelligente dei dati di due lead
   */
  private mergeLeadData(existing: ExistingLead, newData: any): any {
    return {
      // Mantieni i dati migliori da entrambe le fonti
      business_name: newData.business_name || existing.business_name,
      website_url: this.chooseBestWebsite(existing.website_url, newData.website_url),
      phone: this.chooseBestPhone(existing.phone, newData.phone),
      address: this.chooseBestAddress(existing.address, newData.address),
      city: existing.city, // Mantieni città originale
      
      // Score: prendi il migliore
      score: Math.max(existing.score || 0, newData.score || 0),
      
      // Analisi: merge intelligente
      analysis: this.mergeAnalysis(existing.analysis, newData.analysis),
      
      // Ruoli e problemi: combina (compatibilità ES5)
      needed_roles: Array.from(new Set([...(existing.needed_roles || []), ...(newData.needed_roles || [])])),
      issues: Array.from(new Set([...(existing.issues || []), ...(newData.issues || [])]))
    }
  }

  /**
   * Genera chiave univoca universale (cross-source)
   */
  private generateUniversalUniqueKey(leadData: LeadMatchCriteria): string {
    // Usa nome normalizzato + città per chiave universale
    const normalized = `${leadData.business_name}_${leadData.city}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
    
    return `universal_${normalized}`
  }

  /**
   * Genera hash contenuto per rilevare cambiamenti
   */
  private generateContentHash(data: any): string {
    const content = JSON.stringify({
      business_name: data.business_name,
      website_url: data.website_url,
      phone: data.phone,
      address: data.address,
      analysis: data.analysis
    }, Object.keys(data).sort())
    
    return crypto.createHash('md5').update(content).digest('hex')
  }

  // === UTILITY FUNCTIONS ===

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
    }
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/[^\d]/g, '').slice(-9) // Ultimi 9 cifre
  }

  private normalizeAddress(address: string): string {
    return address.toLowerCase()
      .replace(/via|viale|piazza|corso|str\.|strada/g, '')
      .replace(/[^\w\s]/g, '')
      .trim()
  }

  private chooseBestWebsite(existing?: string, newOne?: string): string {
    if (!existing) return newOne || ''
    if (!newOne) return existing
    
    // Preferisci HTTPS
    if (newOne.startsWith('https://') && !existing.startsWith('https://')) {
      return newOne
    }
    
    return existing // Mantieni esistente se equivalente
  }

  private chooseBestPhone(existing?: string, newOne?: string): string {
    if (!existing) return newOne || ''
    if (!newOne) return existing
    
    // Preferisci numero più lungo (più completo)
    return newOne.length > existing.length ? newOne : existing
  }

  private chooseBestAddress(existing?: string, newOne?: string): string {
    if (!existing) return newOne || ''
    if (!newOne) return existing
    
    // Preferisci indirizzo più dettagliato
    return newOne.length > existing.length ? newOne : existing
  }

  private mergeAnalysis(existing: any, newAnalysis: any): any {
    if (!existing) return newAnalysis
    if (!newAnalysis) return existing
    
    // Merge intelligente delle analisi
    return {
      ...existing,
      ...newAnalysis,
      // Mantieni il timestamp più recente
      analysisDate: newAnalysis.analysisDate || existing.analysisDate,
      // Combina issues (compatibilità ES5)
      issues: Array.from(new Set([...(existing.issues || []), ...(newAnalysis.issues || [])]))
    }
  }

  private deduplicateAndScore(leads: any[], criteria: LeadMatchCriteria): any[] {
    const unique = new Map()
    
    leads.forEach(lead => {
      const key = lead.id
      if (!unique.has(key)) {
        // Calcola score di similarità
        lead.similarityScore = this.calculateSimilarityScore(lead, criteria)
        unique.set(key, lead)
      }
    })
    
    return Array.from(unique.values()).sort((a, b) => b.similarityScore - a.similarityScore)
  }

  private calculateSimilarityScore(lead: any, criteria: LeadMatchCriteria): number {
    let score = 0
    
    // Nome business (peso 40%)
    if (this.stringSimilarity(lead.business_name, criteria.business_name) > 0.8) {
      score += 0.4
    }
    
    // Città (peso 20%)
    if (lead.city.toLowerCase() === criteria.city.toLowerCase()) {
      score += 0.2
    }
    
    // Website (peso 30%)
    if (criteria.website_url && lead.website_url) {
      const domain1 = this.extractDomain(lead.website_url)
      const domain2 = this.extractDomain(criteria.website_url)
      if (domain1 === domain2) {
        score += 0.3
      }
    }
    
    // Telefono (peso 10%)
    if (criteria.phone && lead.phone) {
      const phone1 = this.normalizePhone(lead.phone)
      const phone2 = this.normalizePhone(criteria.phone)
      if (phone1 === phone2) {
        score += 0.1
      }
    }
    
    return score
  }

  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const distance = this.levenshteinDistance(longer, shorter)
    return (longer.length - distance) / longer.length
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }
}
