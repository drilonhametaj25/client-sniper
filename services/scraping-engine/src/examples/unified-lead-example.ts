/**
 * Esempio pratico di utilizzo del sistema unificato di deduplicazione lead
 * Mostra come i diversi scraper (Google Maps, Pagine Gialle, ecc.) integrano
 * il nuovo sistema per evitare duplicati e arricchire i lead esistenti
 */

import { LeadGenerator } from '../lead-generator'
import { createClient } from '@supabase/supabase-js'

// Simulazione dati business da diverse fonti
const businessFromGoogleMaps = {
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

const businessFromPagineGialle = {
  name: "Pizzeria Da Mario", // Stesso business!
  website: "", // Nessun website
  phone: "02/1234567", // Formato diverso stesso numero
  address: "Via Roma 123, Milano",
  city: "Milano",
  category: "ristorazione",
  target_category: "ristoranti",
  source: "pagine_gialle",
  email: "info@pizzeriamario.it", // Dato aggiuntivo!
  analysis: {
    // Analisi limitata da Pagine Gialle
    url: "",
    status_code: 0,
    load_time: 0,
    has_ssl: false,
    meta_tags: {},
    h_tags: { h1: [], h2: [] },
    images: { total: 0, broken: 0, without_alt: 0 },
    tracking: { google_analytics: false, facebook_pixel: false, google_tag_manager: false },
    mobile_friendly: false,
    performance: { speed_score: 0, page_size: 0, requests_count: 0 },
    email_analysis: { has_generic_email: false, found_emails: ["info@pizzeriamario.it"] },
    footer_analysis: { has_old_year: false, current_year: 2025 },
    gdpr_compliance: { has_cookie_banner: false, has_privacy_policy: false, has_vat_number: false },
    branding_consistency: { domain_social_mismatch: false, social_links: [] },
    cms_analysis: { is_wordpress: false, uses_default_theme: false, uses_page_builder: false },
    content_quality: { has_generic_content: false, has_stock_images: false, content_length: 0 },
    overall_score: 0,
    needed_roles: ['web-presence'],
    issues: ['no-website']
  }
}

// Esempio di utilizzo
async function demonstrateUnifiedLeadSystem() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  )

  const leadGenerator = new LeadGenerator(supabase)

  console.log('🎯 === DIMOSTRAZIONE SISTEMA UNIFICATO LEAD ===')
  
  // STEP 1: Primo scraping da Google Maps
  console.log('\n📍 STEP 1: Scraping da Google Maps')
  const lead1 = await leadGenerator.generateLeads([businessFromGoogleMaps])
  console.log('Risultato:', lead1[0]?.id ? `Lead creato: ${lead1[0].id}` : 'Nessun lead generato')

  // STEP 2: Secondo scraping da Pagine Gialle (stesso business)
  console.log('\n📖 STEP 2: Scraping da Pagine Gialle (stesso business)')
  const lead2 = await leadGenerator.generateLeads([businessFromPagineGialle])
  console.log('Risultato:', lead2[0]?.id ? `Lead ID: ${lead2[0].id}` : 'Nessun lead generato')

  // STEP 3: Verifica che non ci siano duplicati
  console.log('\n🔍 STEP 3: Verifica risultato')
  
  const { data: allLeads } = await supabase
    .from('leads')
    .select('*')
    .ilike('business_name', '%mario%')
    .eq('city', 'Milano')

  if (allLeads) {
    console.log(`Trovati ${allLeads.length} lead per "Pizzeria Da Mario" a Milano`)
    
    if (allLeads.length === 1) {
      const lead = allLeads[0]
      console.log('✅ SUCCESSO: Un solo lead, arricchito con dati da entrambe le fonti')
      console.log('Fonti:', lead.sources)
      console.log('Website:', lead.website_url || 'Non disponibile')
      console.log('Email:', lead.email || 'Non disponibile')
      console.log('Phone:', lead.phone || 'Non disponibile')
      console.log('Score:', lead.score)
    } else {
      console.log('❌ PROBLEMA: Duplicati non gestiti correttamente')
      allLeads.forEach((lead, index) => {
        console.log(`Lead ${index + 1}: ${lead.id} - Fonti: ${lead.sources}`)
      })
    }
  }

  // STEP 4: Test con business simile ma diverso
  console.log('\n🍕 STEP 4: Test con business simile (diverso)')
  
  const similarBusiness = {
    ...businessFromGoogleMaps,
    name: "Pizzeria Da Luigi", // Nome diverso
    website: "https://pizzerialuigi.it",
    phone: "+39 02 7654321",
    source: "google_maps"
  }

  const lead3 = await leadGenerator.generateLeads([similarBusiness])
  console.log('Risultato business simile:', lead3[0]?.id ? `Nuovo lead: ${lead3[0].id}` : 'Nessun lead generato')
}

// Esempio di query di monitoraggio
async function monitoringQueries() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  )

  console.log('\n📊 === QUERY DI MONITORAGGIO ===')

  // 1. Lead multi-source
  const { data: multiSourceLeads } = await supabase
    .from('leads')
    .select('business_name, city, sources')
    .not('sources', 'is', null)
    .filter('sources', 'cd', '"google_maps","pagine_gialle"')

  console.log(`\n🔗 Lead con multiple fonti: ${multiSourceLeads?.length || 0}`)
  multiSourceLeads?.slice(0, 3).forEach(lead => {
    console.log(`- ${lead.business_name} (${lead.city}): ${lead.sources.join(', ')}`)
  })

  // 2. Potenziali duplicati rimasti
  const { data: potentialDuplicates } = await supabase
    .from('potential_duplicates')
    .select('*')
    .limit(5)

  console.log(`\n⚠️  Potenziali duplicati da verificare: ${potentialDuplicates?.length || 0}`)
  potentialDuplicates?.forEach(dup => {
    console.log(`- ${dup.name1} vs ${dup.name2} (${dup.match_type})`)
  })

  // 3. Statistiche per fonte
  const { data: sourceStats } = await supabase
    .from('leads')
    .select('sources')
    .not('sources', 'is', null)

  if (sourceStats) {
    const stats: { [key: string]: number } = {}
    sourceStats.forEach(lead => {
      lead.sources?.forEach((source: string) => {
        stats[source] = (stats[source] || 0) + 1
      })
    })

    console.log('\n📈 Statistiche per fonte:')
    Object.entries(stats).forEach(([source, count]) => {
      console.log(`- ${source}: ${count} lead`)
    })
  }
}

// Esporta le funzioni per test
export {
  demonstrateUnifiedLeadSystem,
  monitoringQueries,
  businessFromGoogleMaps,
  businessFromPagineGialle
}

// Esegui se chiamato direttamente
if (require.main === module) {
  demonstrateUnifiedLeadSystem()
    .then(() => monitoringQueries())
    .then(() => {
      console.log('\n✅ Dimostrazione completata!')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Errore:', error)
      process.exit(1)
    })
}
