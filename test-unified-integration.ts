/**
 * Test di integrazione per verificare che l'analisi manuale usi il sistema unificato
 * Questo file testa la completa integrazione del sistema di deduplicazione
 * nell'analisi manuale e nello scraping automatico
 */

import { saveManualLead } from './apps/frontend-app/lib/services/leads'
import { LeadGenerator } from './services/scraping-engine/src/lead-generator'
import { createClient } from '@supabase/supabase-js'

// Mock data per test completo
const mockManualAnalysis = {
  url: 'https://pizzeriamario.it',
  finalUrl: 'https://pizzeriamario.it',
  analysisDate: '2025-07-01',
  analysisTime: 2500,
  httpStatus: 200,
  isAccessible: true,
  overallScore: 65,
  redirectChain: ['https://pizzeriamario.it'],
  seo: {
    hasTitle: true,
    hasMetaDescription: false,
    hasH1: true,
    title: 'Pizzeria Da Mario - Autentica Pizza Italiana',
    metaDescription: '',
    h1Tags: ['Benvenuti alla Pizzeria Da Mario']
  },
  performance: {
    loadTime: 2100,
    totalImages: 10,
    brokenImages: 2,
    isResponsive: false,
    pageSize: 2048000,
    networkRequests: 45
  },
  tracking: {
    hasGoogleAnalytics: false,
    hasFacebookPixel: false,
    hasGoogleTagManager: false
  },
  gdpr: {
    hasCookieBanner: false,
    hasPrivacyPolicy: false
  },
  legal: {
    hasBusinessAddress: true,
    hasVatNumber: false
  },
  social: {
    hasSocialLinks: false,
    socialPlatforms: []
  },
  issues: {
    missingMetaDescription: true,
    poorMobileExperience: true,
    noTracking: true,
    brokenImages: true
  }
}

const mockScrapedBusiness = {
  name: "Pizzeria Da Mario",
  website: "https://pizzeriamario.it",
  phone: "+39 02 1234567",
  address: "Via Roma 123",
  city: "Milano",
  category: "ristoranti",
  target_category: "ristoranti",
  source: "google_maps",
  rating: 4.2,
  reviews_count: 156,
  analysis: {
    url: "https://pizzeriamario.it",
    status_code: 200,
    load_time: 2.1,
    has_ssl: true,
    meta_tags: { title: "Pizzeria Da Mario", description: "" },
    h_tags: { h1: ["Benvenuti"], h2: [] },
    images: { total: 10, broken: 2, without_alt: 5 },
    tracking: { google_analytics: false, facebook_pixel: false, google_tag_manager: false },
    mobile_friendly: false,
    performance: { speed_score: 45, page_size: 2048, requests_count: 45 },
    email_analysis: { has_generic_email: false, found_emails: [] },
    footer_analysis: { has_old_year: true, found_year: 2020, current_year: 2025 },
    gdpr_compliance: { has_cookie_banner: false, has_privacy_policy: false, has_vat_number: false },
    branding_consistency: { domain_social_mismatch: false, social_links: [] },
    cms_analysis: { is_wordpress: true, uses_default_theme: false, uses_page_builder: false },
    content_quality: { has_generic_content: false, has_stock_images: true, content_length: 1200 },
    overall_score: 55,
    needed_roles: ['web-developer', 'seo-specialist'],
    issues: ['missing-meta-description', 'broken-images', 'no-tracking', 'poor-mobile', 'slow-loading']
  }
}

async function testUnifiedLeadIntegration() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.log('⚠️ Test skipped: Variabili ambiente Supabase non configurate')
    return
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  )

  console.log('🧪 === TEST INTEGRAZIONE SISTEMA UNIFICATO ===')
  
  // SCENARIO 1: Analisi manuale crea lead
  console.log('\n📱 SCENARIO 1: Analisi manuale')
  try {
    const manualResult = await saveManualLead({
      url: 'https://pizzeriamario.it',
      analysis: mockManualAnalysis as any, // Type assertion per semplicità del test
      createdByUserId: 'test-user-id'
    })

    if (manualResult.success) {
      console.log(`✅ Lead da analisi manuale: ${manualResult.leadId} (nuovo: ${manualResult.isNewLead})`)
    } else {
      console.log(`❌ Errore analisi manuale: ${manualResult.error}`)
    }
  } catch (error) {
    console.log(`❌ Eccezione analisi manuale: ${error}`)
  }

  // SCENARIO 2: Scraping dello stesso business (dovrebbe arricchire)
  console.log('\n🤖 SCENARIO 2: Scraping automatico (stesso business)')
  try {
    const leadGenerator = new LeadGenerator(supabase)
    const scrapingResult = await leadGenerator.generateLeads([mockScrapedBusiness])

    if (scrapingResult.length > 0) {
      console.log(`✅ Lead da scraping: ${scrapingResult[0].id}`)
    } else {
      console.log('ℹ️ Nessun lead generato (potrebbe essere filtrato per score)')
    }
  } catch (error) {
    console.log(`❌ Errore scraping: ${error}`)
  }

  // SCENARIO 3: Verifica risultato unificato
  console.log('\n🔍 SCENARIO 3: Verifica deduplicazione')
  try {
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .ilike('business_name', '%mario%')
      .eq('city', 'Milano')

    if (leads) {
      console.log(`📊 Trovati ${leads.length} lead per "Pizzeria Da Mario"`)
      
      if (leads.length === 1) {
        const lead = leads[0]
        console.log('✅ SUCCESSO: Lead unificato correttamente')
        console.log(`   - ID: ${lead.id}`)
        console.log(`   - Fonti: ${lead.sources?.join(', ') || 'N/A'}`)
        console.log(`   - Website: ${lead.website_url || 'N/A'}`)
        console.log(`   - Telefono: ${lead.phone || 'N/A'}`)
        console.log(`   - Score: ${lead.score}`)
        console.log(`   - Creato: ${lead.created_at}`)
        console.log(`   - Ultimo visto: ${lead.last_seen_at}`)
      } else if (leads.length === 0) {
        console.log('⚠️ Nessun lead trovato')
      } else {
        console.log('❌ PROBLEMA: Duplicati rilevati')
        leads.forEach((lead, index) => {
          console.log(`   Lead ${index + 1}: ${lead.id} - Fonti: ${lead.sources?.join(', ') || 'N/A'}`)
        })
      }
    }
  } catch (error) {
    console.log(`❌ Errore verifica: ${error}`)
  }

  // SCENARIO 4: Statistiche post-test
  console.log('\n📈 SCENARIO 4: Statistiche sistema')
  try {
    const { data: stats } = await supabase
      .from('leads')
      .select('sources')
      .not('sources', 'is', null)

    if (stats) {
      const sourceStats: { [key: string]: number } = {}
      let multiSourceCount = 0

      stats.forEach(lead => {
        if (lead.sources && lead.sources.length > 1) {
          multiSourceCount++
        }
        lead.sources?.forEach((source: string) => {
          sourceStats[source] = (sourceStats[source] || 0) + 1
        })
      })

      console.log('📊 Statistiche fonti:')
      Object.entries(sourceStats).forEach(([source, count]) => {
        console.log(`   - ${source}: ${count} lead`)
      })
      console.log(`🔗 Lead multi-source: ${multiSourceCount}`)
    }
  } catch (error) {
    console.log(`❌ Errore statistiche: ${error}`)
  }

  console.log('\n✅ Test integrazione completato!')
}

// Scenario di pulizia per reset test
async function cleanupTestData() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('⚠️ Cleanup skipped: Variabili ambiente non configurate')
    return
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('🧹 Pulizia dati di test...')
  
  const { error } = await supabase
    .from('leads')
    .delete()
    .ilike('business_name', '%mario%')
    .eq('city', 'Milano')

  if (error) {
    console.log(`❌ Errore pulizia: ${error.message}`)
  } else {
    console.log('✅ Dati di test rimossi')
  }
}

// Export per uso in altri test
export {
  testUnifiedLeadIntegration,
  cleanupTestData,
  mockManualAnalysis,
  mockScrapedBusiness
}

// Esegui se chiamato direttamente
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.includes('--cleanup')) {
    cleanupTestData()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('❌ Errore cleanup:', error)
        process.exit(1)
      })
  } else {
    testUnifiedLeadIntegration()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('❌ Errore test:', error)
        process.exit(1)
      })
  }
}
