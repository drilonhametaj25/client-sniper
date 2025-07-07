/**
 * Test per verificare se la funzione generateLeads viene chiamata
 */

import { createClient } from '@supabase/supabase-js'
import { LeadGenerator } from '../lead-generator'

async function testGenerateLeads() {
  console.log('🧪 Test generateLeads...')
  
  // Mock business data (formato che arriva dal scraper)
  const mockBusinessData = {
    name: 'Test Business Generate',
    website: 'https://example.com',
    address: 'Via Test 123',
    phone: '+39 123 456 789',
    category: 'Ristorante',
    city: 'Milano',
    source: 'google_maps'
  }
  
  // Create mock supabase client che logga tutto
  const mockSupabase = {
    from: (table: string) => ({
      insert: (data: any) => {
        console.log(`🔍 MOCK INSERT chiamato su tabella ${table}:`)
        console.log(`   - Numero record: ${data.length}`)
        console.log(`   - Primo record:`, JSON.stringify(data[0], null, 2))
        return { error: null }
      }
    })
  }
  
  const leadGenerator = new LeadGenerator(mockSupabase as any)
  
  try {
    console.log('1. Chiamata generateLeads...')
    const leads = await leadGenerator.generateLeads([mockBusinessData])
    console.log('2. ✅ generateLeads completata')
    console.log('3. Lead restituiti:', leads.length)
    
    if (leads.length > 0) {
      console.log('4. Primo lead:', {
        nome: leads[0].businessName,
        website: leads[0].contacts?.website,
        score: leads[0].score
      })
    }
    
  } catch (error) {
    console.error('💥 Errore durante il test:', error)
  }
}

// Esegui il test
testGenerateLeads().catch(console.error)
