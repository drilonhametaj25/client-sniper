/**
 * Conversion Analyzer
 * Analizza elementi di conversione: CTA, form, trust signals,
 * above-the-fold content, contact visibility, social proof
 */

import { Page } from 'playwright'

export interface CTAAnalysis {
  count: number
  positions: ('header' | 'hero' | 'body' | 'footer' | 'sidebar' | 'popup')[]
  types: ('button' | 'link' | 'banner')[]
  texts: string[]
  quality: 'weak' | 'moderate' | 'strong'
  hasUrgency: boolean
  hasValueProposition: boolean
  recommendations: string[]
}

export interface FormAnalysis {
  formCount: number
  forms: {
    id?: string
    fieldCount: number
    fields: string[]
    hasPhoneField: boolean
    hasEmailField: boolean
    hasNameField: boolean
    hasMessageField: boolean
    hasRequiredIndicators: boolean
    hasSubmitButton: boolean
    submitButtonText?: string
  }[]
  avgFieldCount: number
  hasPhoneField: boolean
  hasEmailField: boolean
  frictionScore: number // 0-100, lower = better
  recommendations: string[]
}

export interface TrustSignals {
  badges: string[]
  certifications: string[]
  reviewsDisplayed: boolean
  reviewCount?: number
  avgRating?: number
  partnersLogos: boolean
  partnerCount: number
  hasTestimonials: boolean
  testimonialCount: number
  hasGuarantee: boolean
  guaranteeText?: string
  hasSecurityBadges: boolean
  score: number // 0-100
}

export interface AboveFoldAnalysis {
  hasHeadline: boolean
  headlineText?: string
  headlineQuality: 'weak' | 'moderate' | 'strong'
  hasSubheadline: boolean
  hasCTA: boolean
  hasImage: boolean
  hasVideo: boolean
  hasValueProposition: boolean
  contentScore: number // 0-100
}

export interface ConversionRecommendation {
  type: 'critical' | 'high' | 'medium' | 'low'
  area: 'cta' | 'form' | 'trust' | 'above-fold' | 'contact' | 'general'
  issue: string
  recommendation: string
  impact: string
  estimatedConversionIncrease: string // e.g., "+5-10%"
}

export interface ConversionAnalysis {
  ctaAnalysis: CTAAnalysis
  formAnalysis: FormAnalysis
  trustSignals: TrustSignals
  aboveFold: AboveFoldAnalysis
  contactVisibility: 'hidden' | 'poor' | 'good' | 'excellent'
  contactMethods: {
    phone: boolean
    phoneClickable: boolean
    email: boolean
    emailClickable: boolean
    whatsapp: boolean
    liveChat: boolean
    contactForm: boolean
    socialMessaging: boolean
  }
  socialProof: {
    hasReviews: boolean
    hasTestimonials: boolean
    hasClientLogos: boolean
    hasCaseStudies: boolean
    hasNumbers: boolean // "500+ clienti soddisfatti"
    numbersFound: string[]
  }
  urgencyElements: {
    hasScarcity: boolean // "Solo 3 posti rimasti"
    hasTimeLimits: boolean // "Offerta valida fino a..."
    hasLimitedOffer: boolean
    textsFound: string[]
  }
  conversionScore: number // 0-100
  estimatedConversionLoss: number // % potential lost due to issues
  recommendations: ConversionRecommendation[]
}

// CTA action words in Italian
const CTA_WORDS_IT = [
  'contattaci', 'richiedi', 'scopri', 'inizia', 'prenota', 'acquista',
  'iscriviti', 'scarica', 'prova', 'ottieni', 'richiedi preventivo',
  'chiama ora', 'parla con', 'fissa appuntamento', 'ordina', 'compra',
  'aggiungi', 'registrati', 'entra', 'accedi', 'vai', 'clicca',
  'chiedi info', 'maggiori informazioni', 'saperne di più', 'leggi',
  'preventivo gratuito', 'consulenza gratuita', 'gratis'
]

const CTA_WORDS_EN = [
  'contact', 'request', 'discover', 'start', 'book', 'buy', 'subscribe',
  'download', 'try', 'get', 'call now', 'talk to', 'order', 'add',
  'register', 'sign up', 'login', 'go', 'click', 'more info', 'learn more',
  'free quote', 'free consultation'
]

const TRUST_BADGES = [
  'ssl', 'secure', 'sicuro', 'garantito', 'certificato', 'verified',
  'trusted', 'affidabile', 'paypal', 'stripe', 'visa', 'mastercard',
  'iso', 'gdpr', 'privacy'
]

const URGENCY_WORDS = [
  'ultimo', 'ultimi', 'rimasti', 'limitato', 'esclusivo', 'solo oggi',
  'scade', 'termina', 'affrettati', 'non perdere', 'offerta limitata',
  'posti disponibili', 'esaurimento', 'ultimi pezzi', 'promo', 'sconto'
]

export class ConversionAnalyzer {
  async analyze(page: Page): Promise<ConversionAnalysis> {
    const [
      ctaAnalysis,
      formAnalysis,
      trustSignals,
      aboveFold,
      contactInfo,
      socialProof,
      urgencyElements
    ] = await Promise.all([
      this.analyzeCTAs(page),
      this.analyzeForms(page),
      this.analyzeTrustSignals(page),
      this.analyzeAboveFold(page),
      this.analyzeContactVisibility(page),
      this.analyzeSocialProof(page),
      this.analyzeUrgencyElements(page)
    ])

    const contactVisibility = this.calculateContactVisibility(contactInfo)
    const conversionScore = this.calculateConversionScore(
      ctaAnalysis,
      formAnalysis,
      trustSignals,
      aboveFold,
      contactVisibility,
      socialProof
    )

    const estimatedConversionLoss = this.estimateConversionLoss(
      ctaAnalysis,
      formAnalysis,
      trustSignals,
      contactVisibility
    )

    const recommendations = this.generateRecommendations(
      ctaAnalysis,
      formAnalysis,
      trustSignals,
      aboveFold,
      contactVisibility,
      contactInfo,
      socialProof
    )

    return {
      ctaAnalysis,
      formAnalysis,
      trustSignals,
      aboveFold,
      contactVisibility,
      contactMethods: contactInfo,
      socialProof,
      urgencyElements,
      conversionScore,
      estimatedConversionLoss,
      recommendations
    }
  }

  private async analyzeCTAs(page: Page): Promise<CTAAnalysis> {
    try {
      const ctaData = await page.evaluate((ctaWords) => {
        const allCtaWords = ctaWords
        const buttons = Array.from(document.querySelectorAll('button, a.btn, a.button, [class*="cta"], [class*="btn"], input[type="submit"]'))
        const links = Array.from(document.querySelectorAll('a'))

        const ctas: { text: string; tag: string; position: string; isButton: boolean }[] = []

        const getPosition = (el: Element): string => {
          const rect = el.getBoundingClientRect()
          const viewportHeight = window.innerHeight

          // Check if in header
          const header = document.querySelector('header, [class*="header"], nav')
          if (header?.contains(el)) return 'header'

          // Check if in footer
          const footer = document.querySelector('footer, [class*="footer"]')
          if (footer?.contains(el)) return 'footer'

          // Check if in sidebar
          const sidebar = document.querySelector('aside, [class*="sidebar"]')
          if (sidebar?.contains(el)) return 'sidebar'

          // Check by position
          if (rect.top < viewportHeight * 0.3) return 'hero'
          if (rect.top > document.body.scrollHeight - 500) return 'footer'
          return 'body'
        }

        // Check buttons
        buttons.forEach(btn => {
          const text = (btn.textContent || '').trim().toLowerCase()
          if (text && text.length < 50) {
            ctas.push({
              text: (btn.textContent || '').trim(),
              tag: btn.tagName,
              position: getPosition(btn),
              isButton: true
            })
          }
        })

        // Check links with CTA words
        links.forEach(link => {
          const text = (link.textContent || '').trim().toLowerCase()
          if (allCtaWords.some(word => text.includes(word.toLowerCase()))) {
            if (!ctas.some(c => c.text.toLowerCase() === text)) {
              ctas.push({
                text: (link.textContent || '').trim(),
                tag: 'A',
                position: getPosition(link),
                isButton: false
              })
            }
          }
        })

        return ctas.slice(0, 20) // Limit to 20 CTAs
      }, [...CTA_WORDS_IT, ...CTA_WORDS_EN])

      const positions = [...new Set(ctaData.map(c => c.position))] as CTAAnalysis['positions']
      const types = ctaData.map(c => c.isButton ? 'button' : 'link') as CTAAnalysis['types']
      const texts = ctaData.map(c => c.text).slice(0, 10)

      // Analyze quality
      const hasValueProposition = texts.some(t =>
        t.toLowerCase().includes('gratis') ||
        t.toLowerCase().includes('gratuito') ||
        t.toLowerCase().includes('free') ||
        t.toLowerCase().includes('sconto')
      )

      const hasUrgency = texts.some(t =>
        URGENCY_WORDS.some(word => t.toLowerCase().includes(word))
      )

      let quality: CTAAnalysis['quality'] = 'weak'
      if (ctaData.length >= 3 && positions.includes('hero')) {
        quality = hasValueProposition || hasUrgency ? 'strong' : 'moderate'
      } else if (ctaData.length >= 1) {
        quality = 'moderate'
      }

      const recommendations: string[] = []
      if (!positions.includes('hero')) {
        recommendations.push('Aggiungere CTA visibile above-the-fold')
      }
      if (!hasValueProposition) {
        recommendations.push('Includere value proposition nei CTA (es. "Preventivo Gratuito")')
      }
      if (ctaData.length < 3) {
        recommendations.push('Aumentare numero di CTA nel sito')
      }

      return {
        count: ctaData.length,
        positions,
        types: [...new Set(types)] as CTAAnalysis['types'],
        texts,
        quality,
        hasUrgency,
        hasValueProposition,
        recommendations
      }
    } catch {
      return {
        count: 0,
        positions: [],
        types: [],
        texts: [],
        quality: 'weak',
        hasUrgency: false,
        hasValueProposition: false,
        recommendations: ['Impossibile analizzare CTA']
      }
    }
  }

  private async analyzeForms(page: Page): Promise<FormAnalysis> {
    try {
      const formsData = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'))

        return forms.map((form, index) => {
          const inputs = Array.from(form.querySelectorAll('input, textarea, select'))
          const fields: string[] = []

          inputs.forEach(input => {
            const type = input.getAttribute('type') || input.tagName.toLowerCase()
            const name = input.getAttribute('name') || input.getAttribute('id') || ''
            const placeholder = input.getAttribute('placeholder') || ''

            if (!['hidden', 'submit', 'button'].includes(type)) {
              fields.push(name || placeholder || type)
            }
          })

          const hasPhone = inputs.some(i =>
            (i.getAttribute('type') || '').includes('tel') ||
            (i.getAttribute('name') || '').toLowerCase().includes('phone') ||
            (i.getAttribute('name') || '').toLowerCase().includes('telefono') ||
            (i.getAttribute('placeholder') || '').toLowerCase().includes('telefono')
          )

          const hasEmail = inputs.some(i =>
            i.getAttribute('type') === 'email' ||
            (i.getAttribute('name') || '').toLowerCase().includes('email') ||
            (i.getAttribute('placeholder') || '').toLowerCase().includes('email')
          )

          const hasName = inputs.some(i =>
            (i.getAttribute('name') || '').toLowerCase().includes('name') ||
            (i.getAttribute('name') || '').toLowerCase().includes('nome') ||
            (i.getAttribute('placeholder') || '').toLowerCase().includes('nome')
          )

          const hasMessage = inputs.some(i =>
            i.tagName === 'TEXTAREA' ||
            (i.getAttribute('name') || '').toLowerCase().includes('message') ||
            (i.getAttribute('name') || '').toLowerCase().includes('messaggio')
          )

          const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])')
          const hasRequired = form.querySelectorAll('[required], .required').length > 0

          return {
            id: form.id || `form-${index}`,
            fieldCount: fields.length,
            fields,
            hasPhoneField: hasPhone,
            hasEmailField: hasEmail,
            hasNameField: hasName,
            hasMessageField: hasMessage,
            hasRequiredIndicators: hasRequired,
            hasSubmitButton: !!submitBtn,
            submitButtonText: submitBtn?.textContent?.trim()
          }
        })
      })

      const avgFieldCount = formsData.length > 0
        ? formsData.reduce((sum, f) => sum + f.fieldCount, 0) / formsData.length
        : 0

      const hasPhoneField = formsData.some(f => f.hasPhoneField)
      const hasEmailField = formsData.some(f => f.hasEmailField)

      // Friction score: more fields = more friction
      let frictionScore = 0
      if (formsData.length === 0) {
        frictionScore = 100 // No forms = max friction for lead capture
      } else {
        frictionScore = Math.min(100, avgFieldCount * 10)
      }

      const recommendations: string[] = []
      if (formsData.length === 0) {
        recommendations.push('Aggiungere form di contatto nel sito')
      }
      if (avgFieldCount > 5) {
        recommendations.push('Ridurre numero campi form per aumentare conversioni')
      }
      if (!hasPhoneField && !hasEmailField) {
        recommendations.push('Aggiungere campo email o telefono nel form')
      }

      return {
        formCount: formsData.length,
        forms: formsData,
        avgFieldCount: Math.round(avgFieldCount * 10) / 10,
        hasPhoneField,
        hasEmailField,
        frictionScore,
        recommendations
      }
    } catch {
      return {
        formCount: 0,
        forms: [],
        avgFieldCount: 0,
        hasPhoneField: false,
        hasEmailField: false,
        frictionScore: 100,
        recommendations: ['Impossibile analizzare form']
      }
    }
  }

  private async analyzeTrustSignals(page: Page): Promise<TrustSignals> {
    try {
      return await page.evaluate((trustBadgeWords) => {
        const html = document.body.innerHTML.toLowerCase()
        const text = document.body.innerText.toLowerCase()

        // Check for badges/certifications
        const badges: string[] = []
        const certifications: string[] = []

        trustBadgeWords.forEach(word => {
          if (html.includes(word)) {
            badges.push(word)
          }
        })

        // ISO certifications
        const isoPattern = /iso\s*\d{4,5}/gi
        const isoMatches = text.match(isoPattern)
        if (isoMatches) {
          certifications.push(...isoMatches)
        }

        // Reviews/ratings
        const hasReviews = text.includes('recensioni') || text.includes('reviews') ||
          text.includes('valutazioni') || text.includes('stelle')

        const ratingPattern = /(\d[.,]\d)\s*(?:\/\s*5|stelle|stars)/i
        const ratingMatch = text.match(ratingPattern)
        const avgRating = ratingMatch ? parseFloat(ratingMatch[1].replace(',', '.')) : undefined

        const reviewCountPattern = /(\d+)\s*(?:recensioni|reviews|valutazioni)/i
        const reviewCountMatch = text.match(reviewCountPattern)
        const reviewCount = reviewCountMatch ? parseInt(reviewCountMatch[1]) : undefined

        // Partner logos
        const partnerSections = document.querySelectorAll('[class*="partner"], [class*="client"], [class*="logo"]')
        const partnersLogos = partnerSections.length > 0
        let partnerCount = 0
        partnerSections.forEach(section => {
          partnerCount += section.querySelectorAll('img').length
        })

        // Testimonials
        const testimonialSections = document.querySelectorAll('[class*="testimonial"], [class*="review"], [class*="feedback"], blockquote')
        const hasTestimonials = testimonialSections.length > 0
        const testimonialCount = testimonialSections.length

        // Guarantee
        const guaranteeWords = ['garanzia', 'garantito', 'soddisfatti o rimborsati', 'money back', 'rimborso']
        const hasGuarantee = guaranteeWords.some(word => text.includes(word))
        let guaranteeText: string | undefined
        if (hasGuarantee) {
          const guaranteePattern = /garanzia[^.]*\./i
          const match = text.match(guaranteePattern)
          if (match) guaranteeText = match[0]
        }

        // Security badges (SSL, payment)
        const securityBadges = ['ssl', 'https', 'secure', 'sicuro', 'pagamento sicuro', 'checkout sicuro']
        const hasSecurityBadges = securityBadges.some(badge => text.includes(badge)) ||
          document.querySelectorAll('[class*="secure"], [class*="ssl"], [class*="trust"]').length > 0

        // Calculate score
        let score = 0
        if (badges.length > 0) score += 15
        if (certifications.length > 0) score += 15
        if (hasReviews) score += 20
        if (partnersLogos) score += 15
        if (hasTestimonials) score += 20
        if (hasGuarantee) score += 10
        if (hasSecurityBadges) score += 5

        return {
          badges: badges.slice(0, 10),
          certifications: certifications.slice(0, 5),
          reviewsDisplayed: hasReviews,
          reviewCount,
          avgRating,
          partnersLogos,
          partnerCount: Math.min(partnerCount, 20),
          hasTestimonials,
          testimonialCount,
          hasGuarantee,
          guaranteeText,
          hasSecurityBadges,
          score: Math.min(100, score)
        }
      }, TRUST_BADGES)
    } catch {
      return {
        badges: [],
        certifications: [],
        reviewsDisplayed: false,
        partnersLogos: false,
        partnerCount: 0,
        hasTestimonials: false,
        testimonialCount: 0,
        hasGuarantee: false,
        hasSecurityBadges: false,
        score: 0
      }
    }
  }

  private async analyzeAboveFold(page: Page): Promise<AboveFoldAnalysis> {
    try {
      return await page.evaluate(() => {
        const viewportHeight = window.innerHeight

        // Get elements above fold
        const getAboveFoldElements = () => {
          const elements: Element[] = []
          document.body.querySelectorAll('*').forEach(el => {
            const rect = el.getBoundingClientRect()
            if (rect.top < viewportHeight && rect.bottom > 0) {
              elements.push(el)
            }
          })
          return elements
        }

        const aboveFold = getAboveFoldElements()

        // Check for headline (H1)
        const h1 = document.querySelector('h1')
        const h1InFold = h1 && h1.getBoundingClientRect().top < viewportHeight
        const headlineText = h1InFold ? h1.textContent?.trim() : undefined

        // Headline quality
        let headlineQuality: 'weak' | 'moderate' | 'strong' = 'weak'
        if (headlineText) {
          if (headlineText.length > 10 && headlineText.length < 80) {
            headlineQuality = 'moderate'
            // Check for benefit-oriented language
            const benefitWords = ['risparmia', 'ottieni', 'scopri', 'migliora', 'aumenta', 'riduci', 'gratis', 'facile']
            if (benefitWords.some(word => headlineText.toLowerCase().includes(word))) {
              headlineQuality = 'strong'
            }
          }
        }

        // Check for subheadline
        const h2 = document.querySelector('h2')
        const hasSubheadline = h2 && h2.getBoundingClientRect().top < viewportHeight

        // Check for CTA above fold
        const ctaSelectors = 'button, a.btn, a.button, [class*="cta"], [class*="btn"]'
        const ctasAboveFold = aboveFold.filter(el => el.matches(ctaSelectors))
        const hasCTA = ctasAboveFold.length > 0

        // Check for image/video
        const images = document.querySelectorAll('img')
        const hasImage = Array.from(images).some(img =>
          img.getBoundingClientRect().top < viewportHeight &&
          img.width > 200 // Meaningful image
        )

        const videos = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]')
        const hasVideo = Array.from(videos).some(v =>
          v.getBoundingClientRect().top < viewportHeight
        )

        // Value proposition check
        const text = Array.from(aboveFold)
          .map(el => el.textContent || '')
          .join(' ')
          .toLowerCase()

        const valueProps = ['gratis', 'gratuito', 'risparmia', 'garanzia', 'risultati', 'professionale', 'esperto', 'qualità']
        const hasValueProposition = valueProps.some(vp => text.includes(vp))

        // Calculate score
        let contentScore = 0
        if (h1InFold) contentScore += 25
        if (hasSubheadline) contentScore += 15
        if (hasCTA) contentScore += 25
        if (hasImage || hasVideo) contentScore += 15
        if (hasValueProposition) contentScore += 20

        return {
          hasHeadline: !!h1InFold,
          headlineText,
          headlineQuality,
          hasSubheadline: !!hasSubheadline,
          hasCTA,
          hasImage,
          hasVideo,
          hasValueProposition,
          contentScore
        }
      })
    } catch {
      return {
        hasHeadline: false,
        headlineQuality: 'weak',
        hasSubheadline: false,
        hasCTA: false,
        hasImage: false,
        hasVideo: false,
        hasValueProposition: false,
        contentScore: 0
      }
    }
  }

  private async analyzeContactVisibility(page: Page): Promise<ConversionAnalysis['contactMethods']> {
    try {
      return await page.evaluate(() => {
        const html = document.body.innerHTML
        const text = document.body.innerText

        // Phone
        const phonePattern = /(?:\+39|0039)?[\s.-]?\(?0?\d{2,4}\)?[\s.-]?\d{6,8}/g
        const hasPhone = phonePattern.test(text)
        const phoneClickable = !!document.querySelector('a[href^="tel:"]')

        // Email
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
        const hasEmail = emailPattern.test(text)
        const emailClickable = !!document.querySelector('a[href^="mailto:"]')

        // WhatsApp
        const hasWhatsapp = html.includes('wa.me') ||
          html.includes('whatsapp.com') ||
          html.includes('whatsapp') ||
          !!document.querySelector('[class*="whatsapp"]')

        // Live chat
        const chatIndicators = ['chat', 'messenger', 'intercom', 'drift', 'crisp', 'tawk', 'zendesk', 'livechat']
        const hasLiveChat = chatIndicators.some(ind =>
          html.toLowerCase().includes(ind)
        ) || !!document.querySelector('[class*="chat"], [id*="chat"]')

        // Contact form
        const hasContactForm = !!document.querySelector('form')

        // Social messaging
        const socialMessagingPatterns = ['m.me/', 'messenger', 'telegram.me', 't.me/']
        const hasSocialMessaging = socialMessagingPatterns.some(p => html.includes(p))

        return {
          phone: hasPhone,
          phoneClickable,
          email: hasEmail,
          emailClickable,
          whatsapp: hasWhatsapp,
          liveChat: hasLiveChat,
          contactForm: hasContactForm,
          socialMessaging: hasSocialMessaging
        }
      })
    } catch {
      return {
        phone: false,
        phoneClickable: false,
        email: false,
        emailClickable: false,
        whatsapp: false,
        liveChat: false,
        contactForm: false,
        socialMessaging: false
      }
    }
  }

  private async analyzeSocialProof(page: Page): Promise<ConversionAnalysis['socialProof']> {
    try {
      return await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase()
        const html = document.body.innerHTML.toLowerCase()

        // Reviews
        const hasReviews = text.includes('recensioni') || text.includes('reviews') ||
          html.includes('trustpilot') || html.includes('google-reviews')

        // Testimonials
        const hasTestimonials = !!document.querySelector('[class*="testimonial"], [class*="review"], blockquote')

        // Client logos
        const hasClientLogos = !!document.querySelector('[class*="client"], [class*="partner"], [class*="logo-grid"]')

        // Case studies
        const hasCaseStudies = text.includes('case study') || text.includes('caso studio') ||
          text.includes('portfolio') || text.includes('progetti realizzati')

        // Social proof numbers
        const numberPatterns = [
          /(\d+)\s*(?:\+)?\s*clienti/i,
          /(\d+)\s*(?:\+)?\s*progetti/i,
          /(\d+)\s*(?:\+)?\s*anni/i,
          /(\d+)%\s*(?:soddisfatti|soddisfazione)/i,
          /oltre\s*(\d+)/i
        ]

        const numbersFound: string[] = []
        numberPatterns.forEach(pattern => {
          const match = text.match(pattern)
          if (match) {
            numbersFound.push(match[0])
          }
        })

        return {
          hasReviews,
          hasTestimonials,
          hasClientLogos,
          hasCaseStudies,
          hasNumbers: numbersFound.length > 0,
          numbersFound: numbersFound.slice(0, 5)
        }
      })
    } catch {
      return {
        hasReviews: false,
        hasTestimonials: false,
        hasClientLogos: false,
        hasCaseStudies: false,
        hasNumbers: false,
        numbersFound: []
      }
    }
  }

  private async analyzeUrgencyElements(page: Page): Promise<ConversionAnalysis['urgencyElements']> {
    try {
      return await page.evaluate((urgencyWords) => {
        const text = document.body.innerText.toLowerCase()

        const textsFound: string[] = []
        let hasScarcity = false
        let hasTimeLimits = false
        let hasLimitedOffer = false

        urgencyWords.forEach(word => {
          if (text.includes(word)) {
            // Find the sentence containing the urgency word
            const sentences = text.split(/[.!?]/)
            const sentence = sentences.find(s => s.includes(word))
            if (sentence && !textsFound.includes(sentence.trim())) {
              textsFound.push(sentence.trim().slice(0, 100))
            }
          }
        })

        // Scarcity
        const scarcityWords = ['rimasti', 'ultimi', 'disponibili', 'esaurimento', 'pochi']
        hasScarcity = scarcityWords.some(w => text.includes(w))

        // Time limits
        const timeWords = ['scade', 'termina', 'valido fino', 'entro', 'oggi', 'ore rimaste']
        hasTimeLimits = timeWords.some(w => text.includes(w))

        // Limited offer
        const limitedWords = ['offerta limitata', 'promozione', 'sconto', 'solo per']
        hasLimitedOffer = limitedWords.some(w => text.includes(w))

        return {
          hasScarcity,
          hasTimeLimits,
          hasLimitedOffer,
          textsFound: textsFound.slice(0, 5)
        }
      }, URGENCY_WORDS)
    } catch {
      return {
        hasScarcity: false,
        hasTimeLimits: false,
        hasLimitedOffer: false,
        textsFound: []
      }
    }
  }

  private calculateContactVisibility(contactInfo: ConversionAnalysis['contactMethods']): ConversionAnalysis['contactVisibility'] {
    const score = [
      contactInfo.phone,
      contactInfo.phoneClickable,
      contactInfo.email,
      contactInfo.emailClickable,
      contactInfo.whatsapp,
      contactInfo.liveChat,
      contactInfo.contactForm,
      contactInfo.socialMessaging
    ].filter(Boolean).length

    if (score >= 5) return 'excellent'
    if (score >= 3) return 'good'
    if (score >= 1) return 'poor'
    return 'hidden'
  }

  private calculateConversionScore(
    cta: CTAAnalysis,
    form: FormAnalysis,
    trust: TrustSignals,
    aboveFold: AboveFoldAnalysis,
    contactVisibility: ConversionAnalysis['contactVisibility'],
    socialProof: ConversionAnalysis['socialProof']
  ): number {
    let score = 0
    const weights = {
      cta: 20,
      form: 15,
      trust: 20,
      aboveFold: 20,
      contact: 15,
      social: 10
    }

    // CTA score
    const ctaScore = cta.quality === 'strong' ? 100 : cta.quality === 'moderate' ? 60 : 20
    score += (ctaScore / 100) * weights.cta

    // Form score (inverse of friction)
    score += ((100 - form.frictionScore) / 100) * weights.form

    // Trust signals
    score += (trust.score / 100) * weights.trust

    // Above fold
    score += (aboveFold.contentScore / 100) * weights.aboveFold

    // Contact visibility
    const contactScore = contactVisibility === 'excellent' ? 100 :
      contactVisibility === 'good' ? 70 :
        contactVisibility === 'poor' ? 30 : 0
    score += (contactScore / 100) * weights.contact

    // Social proof
    const socialCount = [
      socialProof.hasReviews,
      socialProof.hasTestimonials,
      socialProof.hasClientLogos,
      socialProof.hasCaseStudies,
      socialProof.hasNumbers
    ].filter(Boolean).length
    score += (socialCount / 5) * weights.social

    return Math.round(Math.min(100, Math.max(0, score)))
  }

  private estimateConversionLoss(
    cta: CTAAnalysis,
    form: FormAnalysis,
    trust: TrustSignals,
    contactVisibility: ConversionAnalysis['contactVisibility']
  ): number {
    let loss = 0

    // No/weak CTA
    if (cta.quality === 'weak') loss += 15
    else if (cta.quality === 'moderate') loss += 5

    // High friction forms
    if (form.frictionScore > 70) loss += 10
    else if (form.frictionScore > 40) loss += 5

    // Low trust signals
    if (trust.score < 30) loss += 15
    else if (trust.score < 60) loss += 8

    // Poor contact visibility
    if (contactVisibility === 'hidden') loss += 20
    else if (contactVisibility === 'poor') loss += 10

    return Math.min(60, loss) // Cap at 60%
  }

  private generateRecommendations(
    cta: CTAAnalysis,
    form: FormAnalysis,
    trust: TrustSignals,
    aboveFold: AboveFoldAnalysis,
    contactVisibility: ConversionAnalysis['contactVisibility'],
    contactInfo: ConversionAnalysis['contactMethods'],
    socialProof: ConversionAnalysis['socialProof']
  ): ConversionRecommendation[] {
    const recommendations: ConversionRecommendation[] = []

    // CTA recommendations
    if (cta.quality === 'weak') {
      recommendations.push({
        type: 'critical',
        area: 'cta',
        issue: 'Call-to-action deboli o assenti',
        recommendation: 'Aggiungere CTA prominenti con testo orientato al beneficio',
        impact: 'I CTA sono il driver principale delle conversioni',
        estimatedConversionIncrease: '+10-20%'
      })
    }

    if (!aboveFold.hasCTA) {
      recommendations.push({
        type: 'high',
        area: 'above-fold',
        issue: 'Nessun CTA above-the-fold',
        recommendation: 'Posizionare un CTA visibile nella prima schermata',
        impact: 'Il 70% degli utenti non scrolla oltre la prima schermata',
        estimatedConversionIncrease: '+5-15%'
      })
    }

    // Form recommendations
    if (form.formCount === 0) {
      recommendations.push({
        type: 'critical',
        area: 'form',
        issue: 'Nessun form di contatto',
        recommendation: 'Aggiungere un form semplice (3-4 campi) in homepage',
        impact: 'Senza form, i visitatori non possono convertire facilmente',
        estimatedConversionIncrease: '+15-25%'
      })
    } else if (form.frictionScore > 60) {
      recommendations.push({
        type: 'high',
        area: 'form',
        issue: 'Form troppo lungo/complesso',
        recommendation: 'Ridurre i campi del form a massimo 4-5',
        impact: 'Ogni campo extra riduce le conversioni del 4%',
        estimatedConversionIncrease: '+5-10%'
      })
    }

    // Trust recommendations
    if (!trust.hasTestimonials && !trust.reviewsDisplayed) {
      recommendations.push({
        type: 'high',
        area: 'trust',
        issue: 'Nessuna social proof visibile',
        recommendation: 'Aggiungere testimonial o recensioni clienti',
        impact: 'Le recensioni aumentano fiducia e conversioni',
        estimatedConversionIncrease: '+10-15%'
      })
    }

    if (!trust.hasGuarantee) {
      recommendations.push({
        type: 'medium',
        area: 'trust',
        issue: 'Nessuna garanzia dichiarata',
        recommendation: 'Aggiungere una garanzia (soddisfatti o rimborsati, garanzia qualità)',
        impact: 'Le garanzie riducono l\'ansia da acquisto',
        estimatedConversionIncrease: '+3-8%'
      })
    }

    // Contact recommendations
    if (contactVisibility === 'hidden' || contactVisibility === 'poor') {
      recommendations.push({
        type: 'critical',
        area: 'contact',
        issue: 'Contatti difficili da trovare',
        recommendation: 'Rendere telefono/email visibili in header e footer',
        impact: 'I visitatori abbandonano se non trovano come contattare',
        estimatedConversionIncrease: '+10-20%'
      })
    }

    if (!contactInfo.phoneClickable && contactInfo.phone) {
      recommendations.push({
        type: 'medium',
        area: 'contact',
        issue: 'Numero telefono non cliccabile',
        recommendation: 'Usare link tel: per rendere il numero cliccabile su mobile',
        impact: '60% del traffico è mobile, deve poter chiamare con un tap',
        estimatedConversionIncrease: '+3-5%'
      })
    }

    if (!contactInfo.whatsapp) {
      recommendations.push({
        type: 'medium',
        area: 'contact',
        issue: 'WhatsApp non disponibile',
        recommendation: 'Aggiungere pulsante WhatsApp per contatto immediato',
        impact: 'WhatsApp ha tassi di risposta più alti dell\'email',
        estimatedConversionIncrease: '+5-10%'
      })
    }

    // Above fold recommendations
    if (!aboveFold.hasHeadline) {
      recommendations.push({
        type: 'high',
        area: 'above-fold',
        issue: 'H1 non visibile above-the-fold',
        recommendation: 'Aggiungere headline chiara e benefit-oriented',
        impact: 'L\'headline è il primo elemento che cattura l\'attenzione',
        estimatedConversionIncrease: '+5-10%'
      })
    }

    if (!aboveFold.hasValueProposition) {
      recommendations.push({
        type: 'medium',
        area: 'above-fold',
        issue: 'Value proposition non chiara',
        recommendation: 'Comunicare chiaramente il valore/beneficio principale',
        impact: 'I visitatori devono capire subito cosa offri',
        estimatedConversionIncrease: '+5-8%'
      })
    }

    return recommendations.sort((a, b) => {
      const priority = { critical: 0, high: 1, medium: 2, low: 3 }
      return priority[a.type] - priority[b.type]
    })
  }
}
