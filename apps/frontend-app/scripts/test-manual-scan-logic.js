/**
 * Test script per verificare la logica di matching domini nell'analisi manuale
 * Simula la funzione extractMainDomain e belongsToMainDomain
 */

// Simula le funzioni dal manual-scan
function extractMainDomain(url) {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
    let hostname = urlObj.hostname.toLowerCase()
    
    // Rimuove www.
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4)
    }
    
    // Per domini con sottodomini (es. shop.example.com), estrae solo example.com
    const parts = hostname.split('.')
    if (parts.length >= 2) {
      // Mantiene solo gli ultimi due segmenti (dominio.tld)
      return parts.slice(-2).join('.')
    }
    
    return hostname
  } catch {
    return url.toLowerCase()
  }
}

function belongsToMainDomain(url, targetDomain) {
  try {
    const urlDomain = extractMainDomain(url)
    return urlDomain === targetDomain
  } catch {
    return false
  }
}

// Test cases
const testCases = [
  // Test caso Facebook - dovrebbe NON matchare sottopagine
  {
    input: 'https://facebook.com/mycompany',
    existingLeads: [
      'https://facebook.com',
      'https://www.facebook.com', 
      'https://facebook.com/anothercompany',
      'https://mycompany.com'
    ],
    shouldMatch: ['https://facebook.com', 'https://www.facebook.com', 'https://facebook.com/anothercompany'],
    shouldNotMatch: ['https://mycompany.com']
  },
  
  // Test caso normale
  {
    input: 'https://mycompany.com',
    existingLeads: [
      'https://mycompany.com',
      'https://www.mycompany.com',
      'https://shop.mycompany.com',
      'https://anothercompany.com',
      'https://facebook.com/mycompany'
    ],
    shouldMatch: ['https://mycompany.com', 'https://www.mycompany.com', 'https://shop.mycompany.com'],
    shouldNotMatch: ['https://anothercompany.com', 'https://facebook.com/mycompany']
  },
  
  // Test sottodominio
  {
    input: 'https://shop.example.com',
    existingLeads: [
      'https://example.com',
      'https://www.example.com',
      'https://blog.example.com',
      'https://different.com'
    ],
    shouldMatch: ['https://example.com', 'https://www.example.com', 'https://blog.example.com'],
    shouldNotMatch: ['https://different.com']
  }
]

console.log('🧪 Test logica matching domini per analisi manuale\n')

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.input}`)
  
  const inputDomain = extractMainDomain(testCase.input)
  console.log(`   Dominio estratto: ${inputDomain}`)
  
  // Test should match
  testCase.shouldMatch.forEach(url => {
    const matches = belongsToMainDomain(url, inputDomain)
    const status = matches ? '✅' : '❌'
    console.log(`   ${status} DOVREBBE matchare: ${url} → ${matches}`)
  })
  
  // Test should not match  
  testCase.shouldNotMatch.forEach(url => {
    const matches = belongsToMainDomain(url, inputDomain)
    const status = !matches ? '✅' : '❌'
    console.log(`   ${status} NON dovrebbe matchare: ${url} → ${matches}`)
  })
  
  console.log('')
})

console.log('🎯 Test completato!')
