/**
 * Esempio di integrazione del UnifiedLeadManager negli scraper
 * Mostra come evitare duplicati e arricchire lead cross-source
 */

import { UnifiedLeadManager } from '../utils/unified-lead-manager'
import { createClient } from '@supabase/supabase-js'

// Esempio per Google Maps Scraper
export class ImprovedGoogleMapsScraper {
  private leadManager: UnifiedLeadManager
  
  constructor(supabaseClient: any) {
    this.leadManager = new UnifiedLeadManager(supabaseClient)
  }

  async processScrapedBusiness(business: any): Promise<void> {
    const leadData = {
      business_name: business.name,
      city: business.city,
      website_url: business.website,
      phone: business.phone,
      address: business.address,
      source: 'google_maps',
      analysis: business.websiteAnalysis,
      score: business.score,
      needed_roles: business.neededRoles || [],
      issues: business.issues || []
    }

    // USA IL NUOVO SISTEMA DI DEDUPLICAZIONE
    const result = await this.leadManager.saveOrEnrichLead(leadData)
    
    if (result.success) {
      if (result.wasUpdated) {
        console.log(`🔄 Lead arricchito: ${business.name} (ID: ${result.leadId})`)
      } else {
        console.log(`✅ Nuovo lead creato: ${business.name} (ID: ${result.leadId})`)
      }
    } else {
      console.error(`❌ Errore lead ${business.name}: ${result.error}`)
    }
  }
}

// Esempio per Pagine Gialle Scraper (futuro)
export class PagineGialleScraper {
  private leadManager: UnifiedLeadManager
  
  constructor(supabaseClient: any) {
    this.leadManager = new UnifiedLeadManager(supabaseClient)
  }

  async processScrapedBusiness(business: any): Promise<void> {
    const leadData = {
      business_name: business.ragioneSociale,
      city: business.citta,
      website_url: business.sitoWeb,
      phone: business.telefono,
      address: business.indirizzo,
      source: 'pagine_gialle',
      analysis: null, // Pagine Gialle potrebbe non avere analisi tecnica
      score: this.calculateBasicScore(business),
      needed_roles: this.extractNeededRoles(business),
      issues: []
    }

    // STESSO SISTEMA - ARRICCHIRÀ LEAD GOOGLE MAPS SE ESISTE
    const result = await this.leadManager.saveOrEnrichLead(leadData)
    
    if (result.success && result.wasUpdated) {
      console.log(`🔄 Lead Google Maps arricchito con dati Pagine Gialle: ${business.ragioneSociale}`)
      console.log(`   → Aggiunti: telefono, indirizzo aggiornato da Pagine Gialle`)
    }
  }

  private calculateBasicScore(business: any): number {
    let score = 50 // Score base per Pagine Gialle
    
    if (business.sitoWeb) score += 20
    if (business.telefono) score += 10
    if (business.indirizzo) score += 10
    if (business.email) score += 10
    
    return score
  }

  private extractNeededRoles(business: any): string[] {
    // Logica per dedurre ruoli necessari da categoria Pagine Gialle
    const category = business.categoria?.toLowerCase() || ''
    
    if (category.includes('ristorante') || category.includes('pizzeria')) {
      return ['social media manager', 'fotografo', 'web designer']
    }
    
    if (category.includes('parrucchiere') || category.includes('bellezza')) {
      return ['social media manager', 'fotografo', 'seo specialist']
    }
    
    return ['web designer', 'seo specialist']
  }
}

// Esempio di scenario di arricchimento
export class LeadEnrichmentExample {
  
  static async demonstrateEnrichment(): Promise<void> {
    console.log(`
📝 SCENARIO DI ARRICCHIMENTO LEAD:

1️⃣ GOOGLE MAPS trova:
   • Nome: "Pizzeria Da Mario"
   • Città: "Roma"
   • Website: "https://pizzeriamario.it"
   • Score: 65
   • Analisi: SEO carente, no pixel tracking

2️⃣ PAGINE GIALLE trova lo stesso business:
   • Nome: "Pizzeria da Mario S.r.l."
   • Città: "Roma"  
   • Telefono: "+39 06 1234567"
   • Indirizzo: "Via Roma 123, 00100 Roma"
   • Email: "info@pizzeriamario.it"

🤖 UNIFIEDLEADMANAGER:
   ✅ Rileva match (85% similarità nome + città)
   🔄 Arricchisce lead Google Maps con:
      → Telefono da Pagine Gialle
      → Indirizzo completo da Pagine Gialle  
      → Email da Pagine Gialle
      → Sources: ["google_maps", "pagine_gialle"]
   
📊 RISULTATO FINALE:
   • Lead completo con tutti i dati disponibili
   • Nessun duplicato
   • Storico delle fonti
   • Dati più accurati e completi
    `)
  }
}

// Test rapido del sistema
export async function testUnifiedLeadManager(): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const leadManager = new UnifiedLeadManager(supabase)
  
  // Simula lead da Google Maps
  console.log('🧪 Test 1: Lead da Google Maps')
  const googleMapsLead = {
    business_name: 'Pizzeria Test',
    city: 'Roma',
    website_url: 'https://pizzeriatest.it',
    source: 'google_maps',
    score: 65,
    analysis: { seo: { hasTitle: false }, performance: { loadTime: 2000 } }
  }
  
  const result1 = await leadManager.saveOrEnrichLead(googleMapsLead)
  console.log('Risultato:', result1)
  
  // Simula stesso lead da Pagine Gialle
  console.log('\n🧪 Test 2: Stesso lead da Pagine Gialle')
  const pagineGialleLead = {
    business_name: 'Pizzeria Test S.r.l.',
    city: 'Roma',
    phone: '+39 06 1234567',
    address: 'Via Roma 123',
    source: 'pagine_gialle',
    score: 55
  }
  
  const result2 = await leadManager.saveOrEnrichLead(pagineGialleLead)
  console.log('Risultato:', result2)
  
  if (result2.wasUpdated) {
    console.log('✅ SUCCESS: Lead arricchito invece di duplicato!')
  }
}
