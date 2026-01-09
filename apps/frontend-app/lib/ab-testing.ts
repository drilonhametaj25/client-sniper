// Configurazione A/B testing per la landing page /ads
// Permette di testare diverse varianti di headline, CTA e layout
// Utilizzato per ottimizzare le conversioni delle campagne pubblicitarie

export interface ABTestVariant {
  id: string
  name: string
  weight: number // Percentuale di traffico (0-100)
  config: {
    headline?: string
    subheadline?: string
    ctaText?: string
    ctaColor?: string
    urgencyMessage?: string
    testimonialOrder?: string[]
    pricingPosition?: 'top' | 'middle' | 'bottom'
    socialProofStyle?: 'cards' | 'simple' | 'animated'
  }
}

export const AD_LANDING_AB_TESTS: ABTestVariant[] = [
  {
    id: 'control',
    name: 'Controllo (Originale)',
    weight: 50,
    config: {
      headline: 'Trova Clienti Già Pronti a Comprare i Tuoi Servizi',
      subheadline: 'Scopri aziende con problemi tecnici sui loro siti web e convertile in clienti. Lead qualificati a partire da 0,49€ - 40x meno di Google Ads',
      ctaText: 'Inizia con 5 Lead Gratuiti',
      ctaColor: 'blue',
      urgencyMessage: 'Offerta Limitata',
      testimonialOrder: ['marco', 'laura', 'giuseppe'],
      pricingPosition: 'middle',
      socialProofStyle: 'animated'
    }
  },
  {
    id: 'variant_a',
    name: 'Variante A - Focus ROI',
    weight: 25,
    config: {
      headline: 'Ogni Euro Investito Ti Frutta 15€',
      subheadline: 'Lead qualificati che convertono davvero. Risparmia il 95% sui costi di acquisizione rispetto a Google Ads. Prova con 5 lead gratuiti.',
      ctaText: 'Risparmia il 95% Ora',
      ctaColor: 'green',
      urgencyMessage: 'Solo per Oggi',
      testimonialOrder: ['marco', 'laura', 'giuseppe'],
      pricingPosition: 'top',
      socialProofStyle: 'cards'
    }
  },
  {
    id: 'variant_b',
    name: 'Variante B - Urgenza Forte',
    weight: 25,
    config: {
      headline: 'ULTIMI 5 Lead Gratuiti Disponibili',
      subheadline: 'Centinaia di agenzie stanno già usando TrovaMi. Non perdere l\'opportunità di trovare clienti a 0,49€ invece di 20€.',
      ctaText: 'Prendi i Tuoi Lead Ora',
      ctaColor: 'red',
      urgencyMessage: 'Scadenza Imminente',
      testimonialOrder: ['giuseppe', 'marco', 'laura'],
      pricingPosition: 'middle',
      socialProofStyle: 'simple'
    }
  }
]

export function getABTestVariant(userId?: string): ABTestVariant {
  // Se non c'è utente, usa il timestamp per la distribuzione
  const seed = userId || Date.now().toString()
  const hash = simpleHash(seed)
  const random = (hash % 100) + 1

  let cumulativeWeight = 0
  for (const variant of AD_LANDING_AB_TESTS) {
    cumulativeWeight += variant.weight
    if (random <= cumulativeWeight) {
      return variant
    }
  }

  // Fallback al controllo
  return AD_LANDING_AB_TESTS[0]
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

export function trackABTestExposure(variant: ABTestVariant, userId?: string) {
  // Track l'esposizione alla variante per l'analisi
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'ab_test_exposure', {
      variant_id: variant.id,
      variant_name: variant.name,
      user_id: userId,
      page: 'ads_landing'
    })
  }

  console.log('AB Test Exposure:', {
    variant: variant.id,
    name: variant.name,
    userId,
    timestamp: new Date().toISOString()
  })
}

export function trackABTestConversion(variant: ABTestVariant, userId?: string) {
  // Track la conversione per calcolare il lift
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'ab_test_conversion', {
      variant_id: variant.id,
      variant_name: variant.name,
      user_id: userId,
      page: 'ads_landing'
    })
  }

  console.log('AB Test Conversion:', {
    variant: variant.id,
    name: variant.name,
    userId,
    timestamp: new Date().toISOString()
  })
}
