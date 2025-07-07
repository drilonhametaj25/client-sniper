/**
 * Test dedicato per il salvataggio dei lead
 * Verifica se la funzione saveLeads funziona correttamente
 */

import { createClient } from '@supabase/supabase-js'
import { LeadGenerator } from '../lead-generator'
import { BusinessData } from '../scrapers/google-maps'

async function testLeadSaving() {
  console.log('🧪 Test di salvataggio lead...')
  
  // Setup
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)!
  )
  
  const leadGenerator = new LeadGenerator(supabase)
  
  // Business di test
  const testBusiness: BusinessData = {
    name: 'Test Business - Salvataggio',
    website: 'https://example.com',
    address: 'Via Test 123',
    phone: '+39 123 456 789',
    category: 'Ristorante',
    city: 'Milano',
    source: 'google_maps'
  }
  
  try {
    console.log('1. Inizio generazione lead...')
    const leads = await leadGenerator.generateLeads([testBusiness])
    
    console.log('2. Lead generati:', leads.length)
    if (leads.length > 0) {
      console.log('3. Primo lead:', {
        nome: leads[0].businessName,
        website: leads[0].contacts?.website,
        score: leads[0].score
      })
    }
    
    // Verifica nel database
    console.log('4. Verifica nel database...')
    const { data: savedLeads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('business_name', 'Test Business - Salvataggio')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (error) {
      console.error('❌ Errore nel controllo database:', error)
    } else {
      console.log('✅ Lead trovati nel database:', savedLeads?.length || 0)
      if (savedLeads && savedLeads.length > 0) {
        console.log('📊 Ultimo lead salvato:', {
          id: savedLeads[0].id,
          business_name: savedLeads[0].business_name,
          score: savedLeads[0].score,
          website_url: savedLeads[0].website_url,
          created_at: savedLeads[0].created_at
        })
      }
    }
    
  } catch (error) {
    console.error('💥 Errore durante il test:', error)
  }
}

// Esegui il test
testLeadSaving().catch(console.error)
