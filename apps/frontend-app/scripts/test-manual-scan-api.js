/**
 * Test script per verificare il funzionamento dell'API manual-scan
 * con la nuova logica di matching domini
 */

const API_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ? 'https://trovami.pro' : 'http://localhost:3000'

// Test cases per verificare comportamento
const testCases = [
  {
    name: 'Dominio principale esistente',
    url: 'https://facebook.com',
    expectedBehavior: 'Dovrebbe trovare lead esistente se presente'
  },
  {
    name: 'Sottopagina Facebook',
    url: 'https://facebook.com/somecompany',
    expectedBehavior: 'Dovrebbe trovare il lead facebook.com principale'
  },
  {
    name: 'Sito nuovo',
    url: 'https://example-nonexistent-site-12345.com',
    expectedBehavior: 'Dovrebbe fare analisi reale e creare nuovo lead'
  },
  {
    name: 'Variante www',
    url: 'https://www.google.com',
    expectedBehavior: 'Dovrebbe trovare lead google.com se presente'
  }
]

async function testManualScanAPI() {
  console.log('🧪 Test API manual-scan con nuova logica matching domini\n')
  console.log(`🔗 Testing su: ${API_BASE}\n`)

  // Per questo test simuliamo il comportamento senza autenticazione reale
  for (const testCase of testCases) {
    console.log(`📋 Test: ${testCase.name}`)
    console.log(`🌐 URL: ${testCase.url}`)
    console.log(`🎯 Aspettativa: ${testCase.expectedBehavior}`)
    
    try {
      // Simula chiamata API (senza token valido, sarà 401)
      const response = await fetch(`${API_BASE}/api/tools/manual-scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ url: testCase.url })
      })
      
      const data = await response.json()
      
      console.log(`📡 Status: ${response.status}`)
      console.log(`📄 Response: ${JSON.stringify(data, null, 2)}`)
      
      if (response.status === 401) {
        console.log('✅ API richiede autenticazione correttamente')
      } else {
        console.log(`ℹ️ Response ricevuta: ${data.success ? 'SUCCESS' : 'ERROR'}`)
      }
      
    } catch (error) {
      console.log(`❌ Errore rete: ${error.message}`)
    }
    
    console.log('---\n')
  }

  console.log('🏁 Test completati!')
  console.log('')
  console.log('ℹ️ Per testare con autenticazione reale:')
  console.log('1. Avvia il server: npm run dev')
  console.log('2. Effettua login sul sito')
  console.log('3. Usa il browser per testare /tools/manual-scan')
}

// Funzione helper per estrarre dominio (come nell\'API)
function extractMainDomain(url) {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
    let hostname = urlObj.hostname.toLowerCase()
    
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4)
    }
    
    const parts = hostname.split('.')
    if (parts.length >= 2) {
      return parts.slice(-2).join('.')
    }
    
    return hostname
  } catch {
    return url.toLowerCase()
  }
}

console.log('🔍 Test estrazione domini:')
testCases.forEach(testCase => {
  const domain = extractMainDomain(testCase.url)
  console.log(`${testCase.url} → ${domain}`)
})
console.log('')

// Esegui test
testManualScanAPI().catch(console.error)
