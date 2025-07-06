/**
 * Test per verificare il calcolo dei punteggi nella pagina lead
 * Simula diversi scenari di analisi per verificare che i punteggi siano corretti
 */

// Simula la logica del componente React
const getSEOScore = (analysis) => {
  if (!analysis) return 0
  
  // Nuovo formato
  if (analysis.seo) {
    const seo = analysis.seo
    
    // Se abbiamo score precalcolato, usalo
    if (seo.score || seo.score === 0) {
      return seo.score
    }
    
    // Se non abbiamo dati SEO reali, return 0
    if (seo.hasTitle === undefined && 
        seo.hasMetaDescription === undefined && 
        seo.hasH1 === undefined) {
      return 0
    }
    
    let score = 100
    
    // Penalità solo se i dati sono definiti e mancanti
    if (seo.hasTitle === false) score -= 20
    if (seo.hasMetaDescription === false) score -= 20
    if (seo.hasH1 === false) score -= 15
    
    // Penalità per lunghezza solo se abbiamo i dati
    if (seo.titleLength || seo.titleLength === 0) {
      if (seo.titleLength < 30 || seo.titleLength > 60) score -= 10
    }
    if (seo.metaDescriptionLength || seo.metaDescriptionLength === 0) {
      if (seo.metaDescriptionLength < 120 || seo.metaDescriptionLength > 160) score -= 10
    }
    
    if (seo.hasStructuredData === false) score -= 5
    
    return Math.max(0, score)
  }
  
  // Vecchio formato
  return analysis.seo_score || 0
}

const getPerformanceScore = (analysis) => {
  if (!analysis) return 0
  
  // Nuovo formato
  if (analysis.performance) {
    const perf = analysis.performance
    
    // Se non abbiamo dati di performance reali, return 0
    if (!perf.loadTime && perf.loadTime !== 0 && 
        !perf.brokenImages && perf.brokenImages !== 0 && 
        perf.isResponsive === undefined) {
      return 0
    }
    
    let score = 100
    
    // Penalità per tempo di caricamento (solo se abbiamo il dato)
    if (perf.loadTime || perf.loadTime === 0) {
      if (perf.loadTime > 5000) score -= 40
      else if (perf.loadTime > 3000) score -= 30
      else if (perf.loadTime > 2000) score -= 15
      else if (perf.loadTime > 1000) score -= 5
    }
    
    // Penalità per immagini rotte (solo se abbiamo il dato)
    if (perf.brokenImages || perf.brokenImages === 0) {
      if (perf.brokenImages > 5) score -= 30
      else if (perf.brokenImages > 0) score -= 20
    }
    
    // Penalità per responsive (solo se abbiamo il dato)
    if (perf.isResponsive === false) {
      score -= 25
    }
    
    // Se abbiamo score da performance analyzer, usalo
    if (perf.score || perf.score === 0) {
      return perf.score
    }
    
    // Se abbiamo overallScore, usalo
    if (perf.overallScore || perf.overallScore === 0) {
      return perf.overallScore
    }
    
    return Math.max(0, score)
  }
  
  // Vecchio formato
  return analysis.page_speed_score || 0
}

function testScoreCalculation() {
  console.log('🧪 Test calcolo punteggi nella pagina lead')
  
  // Test 1: Nessuna analisi
  console.log('\n📍 Test 1: Nessuna analisi')
  console.log(`SEO Score: ${getSEOScore(null)} (atteso: 0)`)
  console.log(`Performance Score: ${getPerformanceScore(null)} (atteso: 0)`)
  
  // Test 2: Analisi vuota
  console.log('\n📍 Test 2: Analisi vuota')
  const emptyAnalysis = {}
  console.log(`SEO Score: ${getSEOScore(emptyAnalysis)} (atteso: 0)`)
  console.log(`Performance Score: ${getPerformanceScore(emptyAnalysis)} (atteso: 0)`)
  
  // Test 3: Analisi con oggetti vuoti
  console.log('\n📍 Test 3: Analisi con oggetti vuoti')
  const emptyObjectsAnalysis = {
    seo: {},
    performance: {}
  }
  console.log(`SEO Score: ${getSEOScore(emptyObjectsAnalysis)} (atteso: 0)`)
  console.log(`Performance Score: ${getPerformanceScore(emptyObjectsAnalysis)} (atteso: 0)`)
  
  // Test 4: Analisi completa e buona (come notaiosantosuosso.it)
  console.log('\n📍 Test 4: Analisi completa e buona')
  const goodAnalysis = {
    seo: {
      hasTitle: true,
      titleLength: 34,
      hasMetaDescription: true,
      metaDescriptionLength: 239,
      hasH1: true,
      hasStructuredData: true
    },
    performance: {
      loadTime: 1800,
      brokenImages: 0,
      isResponsive: true
    }
  }
  console.log(`SEO Score: ${getSEOScore(goodAnalysis)} (atteso: ~100)`)
  console.log(`Performance Score: ${getPerformanceScore(goodAnalysis)} (atteso: ~95)`)
  
  // Test 5: Analisi con score precalcolato
  console.log('\n📍 Test 5: Analisi con score precalcolato')
  const precalculatedAnalysis = {
    seo: {
      score: 85,
      hasTitle: false // Questo dovrebbe essere ignorato
    },
    performance: {
      score: 75,
      loadTime: 10000 // Questo dovrebbe essere ignorato
    }
  }
  console.log(`SEO Score: ${getSEOScore(precalculatedAnalysis)} (atteso: 85)`)
  console.log(`Performance Score: ${getPerformanceScore(precalculatedAnalysis)} (atteso: 75)`)
  
  // Test 6: Analisi con problemi
  console.log('\n📍 Test 6: Analisi con problemi')
  const badAnalysis = {
    seo: {
      hasTitle: false,
      hasMetaDescription: false,
      hasH1: false,
      hasStructuredData: false
    },
    performance: {
      loadTime: 8000,
      brokenImages: 3,
      isResponsive: false
    }
  }
  console.log(`SEO Score: ${getSEOScore(badAnalysis)} (atteso: 40)`)
  console.log(`Performance Score: ${getPerformanceScore(badAnalysis)} (atteso: 5)`)
  
  // Test 7: Analisi formato vecchio
  console.log('\n📍 Test 7: Analisi formato vecchio')
  const legacyAnalysis = {
    seo_score: 65,
    page_speed_score: 80
  }
  console.log(`SEO Score: ${getSEOScore(legacyAnalysis)} (atteso: 65)`)
  console.log(`Performance Score: ${getPerformanceScore(legacyAnalysis)} (atteso: 80)`)
  
  // Test 8: Caso problematico - solo loadTime 0
  console.log('\n📍 Test 8: Solo loadTime = 0')
  const zeroLoadTimeAnalysis = {
    performance: {
      loadTime: 0
    }
  }
  console.log(`Performance Score: ${getPerformanceScore(zeroLoadTimeAnalysis)} (atteso: 100)`)
  
  console.log('\n🏁 Test completato')
}

// Esegui test
testScoreCalculation()
