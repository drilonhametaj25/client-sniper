/**
 * Test diretto per verificare la logica di generazione unique_key
 */

// Funzione copiata da lead-generator.ts per test
function generateUniqueKey(business) {
  const source = business.source || 'google_maps';
  const name = business.name || 'unknown';
  const website = business.website || '';
  const address = business.address || '';
  
  // Se ha un sito web, usa quello come identificatore principale
  if (website) {
    try {
      const domain = new URL(website).hostname.replace('www.', '');
      return `${source}_${domain}_${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
    } catch {
      // Se l'URL non è valido, usa il sito web grezzo
      return `${source}_${website.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
    }
  }
  
  // Altrimenti usa nome + indirizzo + fonte
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const cleanAddress = address.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().substring(0, 50);
  
  return `${source}_${cleanName}_${cleanAddress}`;
}

// Test cases
const testCases = [
  {
    name: 'Business con sito web valido',
    business: {
      name: 'Test Business 1',
      website: 'https://www.example.com',
      source: 'google_maps',
      address: 'Via Roma 123, Milano'
    }
  },
  {
    name: 'Business senza sito web',
    business: {
      name: 'Test Business 2',
      website: null,
      source: 'google_maps',
      address: 'Via Milano 456, Roma'
    }
  },
  {
    name: 'Business con URL invalido',
    business: {
      name: 'Test Business 3',
      website: 'not-a-valid-url',
      source: 'google_maps',
      address: 'Corso Buenos Aires 789, Milano'
    }
  },
  {
    name: 'Business con campi undefined',
    business: {
      name: undefined,
      website: undefined,
      source: undefined,
      address: undefined
    }
  },
  {
    name: 'Business con campi vuoti',
    business: {
      name: '',
      website: '',
      source: '',
      address: ''
    }
  }
];

console.log('Testing generateUniqueKey function...\n');

let allPassed = true;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log('Input:', JSON.stringify(testCase.business, null, 2));
  
  try {
    const uniqueKey = generateUniqueKey(testCase.business);
    console.log('Generated unique_key:', uniqueKey);
    
    if (!uniqueKey || uniqueKey.trim() === '') {
      console.error('❌ FAILED: unique_key is empty or null');
      allPassed = false;
    } else {
      console.log('✅ PASSED: unique_key generated successfully');
    }
    
  } catch (error) {
    console.error('❌ FAILED: Error generating unique_key:', error.message);
    allPassed = false;
  }
  
  console.log('---\n');
});

console.log(`\nOverall result: ${allPassed ? '✅ All tests passed' : '❌ Some tests failed'}`);
