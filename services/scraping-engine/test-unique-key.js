/**
 * Test per verificare la funzione generateUniqueKey
 */

const { LeadGenerator } = require('./src/lead-generator.js');

// Mock di Supabase per il test
const mockSupabase = {
  from: () => ({
    insert: () => Promise.resolve({ error: null })
  })
};

async function testUniqueKey() {
  const leadGenerator = new LeadGenerator(mockSupabase);
  
  // Test business con sito web
  const business1 = {
    name: 'Test Business 1',
    website: 'https://www.example.com',
    source: 'google_maps',
    address: 'Via Roma 123, Milano',
    phone: '123456789',
    city: 'Milano',
    category: 'Restaurant'
  };
  
  // Test business senza sito web
  const business2 = {
    name: 'Test Business 2',
    website: null,
    source: 'google_maps',
    address: 'Via Milano 456, Roma',
    phone: '987654321',
    city: 'Roma',
    category: 'Bar'
  };
  
  // Test business con URL invalido
  const business3 = {
    name: 'Test Business 3',
    website: 'not-a-valid-url',
    source: 'google_maps',
    address: 'Corso Buenos Aires 789, Milano',
    phone: '555666777',
    city: 'Milano',
    category: 'Shop'
  };
  
  console.log('Testing generateUniqueKey...');
  
  try {
    // Usiamo la funzione privata attraverso la serializzazione
    const serialized1 = leadGenerator.serializeForDatabase(business1);
    const serialized2 = leadGenerator.serializeForDatabase(business2);
    const serialized3 = leadGenerator.serializeForDatabase(business3);
    
    console.log('Business 1 unique_key:', serialized1.unique_key);
    console.log('Business 2 unique_key:', serialized2.unique_key);
    console.log('Business 3 unique_key:', serialized3.unique_key);
    
    // Verifica che le chiavi non siano vuote
    if (!serialized1.unique_key) {
      console.error('ERROR: Business 1 unique_key is empty!');
    }
    if (!serialized2.unique_key) {
      console.error('ERROR: Business 2 unique_key is empty!');
    }
    if (!serialized3.unique_key) {
      console.error('ERROR: Business 3 unique_key is empty!');
    }
    
    console.log('Test completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testUniqueKey();
