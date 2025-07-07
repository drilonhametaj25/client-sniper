/**
 * Test per verificare la pipeline completa di lead generation
 */

import { LeadGenerator } from './src/lead-generator';
import { BusinessData } from './src/scrapers/google-maps';

// Mock di Supabase per il test
const mockSupabase = {
  from: () => ({
    insert: (data: any) => {
      console.log('Mock insert called with:', JSON.stringify(data, null, 2));
      return Promise.resolve({ error: null });
    }
  })
} as any;

async function testLeadGeneration() {
  const leadGenerator = new LeadGenerator(mockSupabase);
  
  // Test business con sito web
  const businesses: BusinessData[] = [
    {
      name: 'Test Business 1',
      website: 'https://www.example.com',
      source: 'google_maps',
      address: 'Via Roma 123, Milano',
      phone: '123456789',
      city: 'Milano',
      category: 'Restaurant'
    },
    {
      name: 'Test Business 2',
      website: undefined, // No website
      source: 'google_maps',
      address: 'Via Milano 456, Roma',
      phone: '987654321',
      city: 'Roma',
      category: 'Bar'
    }
  ];
  
  console.log('Testing complete lead generation pipeline...');
  
  try {
    // Test generazione completa (analisi + salvataggio)
    console.log('\n=== Testing generateLeads method ===');
    await leadGenerator.generateLeads(businesses);
    
    console.log('\n=== Testing analyzeBusinesses method ===');
    const analyzedBusinesses = await leadGenerator.analyzeBusinesses(businesses);
    
    console.log('Analyzed businesses:');
    analyzedBusinesses.forEach((business, index) => {
      console.log(`Business ${index + 1}:`);
      console.log('- Name:', business.name);
      console.log('- Website:', business.website);
      console.log('- Has modern analysis:', !!business.websiteAnalysis);
      console.log('- Has legacy analysis:', !!business.analysis);
      console.log('- Modern analysis score:', business.websiteAnalysis?.overallScore || 'N/A');
      console.log('- Legacy analysis score:', business.analysis?.overall_score || 'N/A');
      console.log('---');
    });
    
    console.log('\n=== Testing saveLeads method ===');
    await leadGenerator.saveLeads(analyzedBusinesses);
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testLeadGeneration();
