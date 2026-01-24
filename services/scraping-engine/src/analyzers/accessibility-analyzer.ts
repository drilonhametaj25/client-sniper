/**
 * Accessibility Analyzer per Client Sniper
 * Analizza l'accessibilità di un sito web secondo standard WCAG
 */

import { Page } from 'playwright'

export interface AriaAnalysis {
  hasAriaLabels: boolean
  ariaLabelCount: number
  missingAriaCount: number
  interactiveWithoutLabel: number
}

export interface ImageAccessibility {
  total: number
  withAlt: number
  withEmptyAlt: number
  withoutAlt: number
  decorativeCorrect: number      // empty alt on decorative images
  altQualityScore: number        // 0-100 based on descriptiveness
  imagesMissingAlt: string[]     // src of images without alt (max 10)
}

export interface FormAccessibility {
  total: number
  withLabels: number
  withoutLabels: number
  withPlaceholderOnly: number
  fieldsWithoutLabel: string[]   // field names without labels (max 10)
}

export interface StructureAccessibility {
  hasSkipLink: boolean
  headingHierarchyValid: boolean
  headingIssues: string[]
  hasMainLandmark: boolean
  hasNavLandmark: boolean
  hasFooterLandmark: boolean
  landmarkCount: number
}

export interface ContrastAnalysis {
  lowContrastElements: number
  potentialIssues: string[]       // descriptions of potential contrast issues
}

export interface KeyboardAccessibility {
  focusableElements: number
  elementsWithTabindex: number
  negativeTabindex: number        // elements with tabindex="-1" (potentially hidden)
  outlineRemoved: boolean         // :focus { outline: none } detected
}

export interface AccessibilityAnalysis {
  url: string
  analyzedAt: Date
  aria: AriaAnalysis
  images: ImageAccessibility
  forms: FormAccessibility
  structure: StructureAccessibility
  contrast: ContrastAnalysis
  keyboard: KeyboardAccessibility
  wcagScore: number               // 0-100
  wcagLevel: 'A' | 'AA' | 'AAA' | 'fail'
  recommendations: AccessibilityRecommendation[]
}

export interface AccessibilityRecommendation {
  type: 'critical' | 'high' | 'medium' | 'low'
  wcagCriteria: string            // e.g., "1.1.1", "2.4.1"
  title: string
  description: string
  impact: string
  affectedCount?: number
}

export class AccessibilityAnalyzer {
  /**
   * Analizza l'accessibilità della pagina corrente
   */
  async analyzeAccessibility(page: Page, url: string): Promise<AccessibilityAnalysis> {
    const [aria, images, forms, structure, contrast, keyboard] = await Promise.all([
      this.analyzeAria(page),
      this.analyzeImages(page),
      this.analyzeForms(page),
      this.analyzeStructure(page),
      this.analyzeContrast(page),
      this.analyzeKeyboard(page)
    ])

    const wcagScore = this.calculateWcagScore(aria, images, forms, structure, keyboard)
    const wcagLevel = this.determineWcagLevel(wcagScore, aria, images, forms, structure)
    const recommendations = this.generateRecommendations(aria, images, forms, structure, keyboard)

    return {
      url,
      analyzedAt: new Date(),
      aria,
      images,
      forms,
      structure,
      contrast,
      keyboard,
      wcagScore,
      wcagLevel,
      recommendations
    }
  }

  /**
   * Analizza ARIA labels e attributi
   */
  private async analyzeAria(page: Page): Promise<AriaAnalysis> {
    return await page.evaluate(() => {
      let ariaLabelCount = 0
      let missingAriaCount = 0
      let interactiveWithoutLabel = 0

      // Count elements with aria-label
      const ariaLabeled = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]')
      ariaLabelCount = ariaLabeled.length

      // Check interactive elements
      const interactiveSelectors = 'button, a, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [tabindex]'
      const interactive = document.querySelectorAll(interactiveSelectors)

      interactive.forEach(el => {
        const hasLabel = el.hasAttribute('aria-label') ||
                        el.hasAttribute('aria-labelledby') ||
                        el.textContent?.trim() ||
                        (el as HTMLInputElement).value ||
                        el.getAttribute('title')

        const associatedLabel = el.id ? document.querySelector(`label[for="${el.id}"]`) : null

        if (!hasLabel && !associatedLabel) {
          interactiveWithoutLabel++
          missingAriaCount++
        }
      })

      return {
        hasAriaLabels: ariaLabelCount > 0,
        ariaLabelCount,
        missingAriaCount,
        interactiveWithoutLabel
      }
    })
  }

  /**
   * Analizza accessibilità immagini
   */
  private async analyzeImages(page: Page): Promise<ImageAccessibility> {
    return await page.evaluate(() => {
      const images = document.querySelectorAll('img')
      let withAlt = 0
      let withEmptyAlt = 0
      let withoutAlt = 0
      let decorativeCorrect = 0
      const imagesMissingAlt: string[] = []

      let totalAltLength = 0
      let descriptiveCount = 0

      images.forEach(img => {
        const alt = img.getAttribute('alt')
        const src = img.getAttribute('src') || ''

        if (alt === null) {
          withoutAlt++
          if (imagesMissingAlt.length < 10) {
            imagesMissingAlt.push(src.substring(0, 100))
          }
        } else if (alt === '') {
          withEmptyAlt++
          // Check if it's likely decorative (small, in background, etc.)
          if (img.width < 50 || img.height < 50 ||
              img.classList.contains('icon') ||
              img.classList.contains('decoration') ||
              img.getAttribute('role') === 'presentation') {
            decorativeCorrect++
          }
        } else {
          withAlt++
          totalAltLength += alt.length

          // Check alt quality
          const isDescriptive = alt.length >= 10 &&
                               !alt.match(/^(image|img|photo|picture|foto)\d*$/i) &&
                               !alt.match(/^IMG_\d+$/i) &&
                               !alt.match(/^\d+$/i)

          if (isDescriptive) descriptiveCount++
        }
      })

      // Calculate alt quality score
      const total = images.length
      let altQualityScore = 0
      if (total > 0) {
        const withAltPercent = (withAlt / total) * 50
        const descriptivePercent = withAlt > 0 ? (descriptiveCount / withAlt) * 50 : 0
        altQualityScore = Math.round(withAltPercent + descriptivePercent)
      }

      return {
        total,
        withAlt,
        withEmptyAlt,
        withoutAlt,
        decorativeCorrect,
        altQualityScore,
        imagesMissingAlt
      }
    })
  }

  /**
   * Analizza accessibilità form
   */
  private async analyzeForms(page: Page): Promise<FormAccessibility> {
    return await page.evaluate(() => {
      const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea')
      let withLabels = 0
      let withoutLabels = 0
      let withPlaceholderOnly = 0
      const fieldsWithoutLabel: string[] = []

      inputs.forEach(input => {
        const id = input.getAttribute('id')
        const name = input.getAttribute('name') || 'unnamed'
        const hasAriaLabel = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby')
        const hasLabel = id ? document.querySelector(`label[for="${id}"]`) : null
        const hasWrappingLabel = input.closest('label')
        const hasPlaceholder = input.hasAttribute('placeholder')

        if (hasLabel || hasWrappingLabel || hasAriaLabel) {
          withLabels++
        } else if (hasPlaceholder) {
          withPlaceholderOnly++
          if (fieldsWithoutLabel.length < 10) {
            fieldsWithoutLabel.push(`${name} (only placeholder)`)
          }
        } else {
          withoutLabels++
          if (fieldsWithoutLabel.length < 10) {
            fieldsWithoutLabel.push(name)
          }
        }
      })

      return {
        total: inputs.length,
        withLabels,
        withoutLabels,
        withPlaceholderOnly,
        fieldsWithoutLabel
      }
    })
  }

  /**
   * Analizza struttura del documento
   */
  private async analyzeStructure(page: Page): Promise<StructureAccessibility> {
    return await page.evaluate(() => {
      const headingIssues: string[] = []

      // Check skip link
      const skipLink = document.querySelector('a[href="#main"], a[href="#content"], .skip-link, .skip-to-content')
      const hasSkipLink = !!skipLink

      // Check heading hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      let lastLevel = 0
      let headingHierarchyValid = true
      let h1Count = 0

      headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName[1])

        if (level === 1) h1Count++

        // Check for skipped levels (e.g., h1 -> h3)
        if (lastLevel > 0 && level > lastLevel + 1) {
          headingHierarchyValid = false
          if (headingIssues.length < 5) {
            headingIssues.push(`H${lastLevel} followed by H${level} (skipped level)`)
          }
        }

        lastLevel = level
      })

      // Multiple H1 is a common issue
      if (h1Count > 1) {
        headingHierarchyValid = false
        headingIssues.push(`Multiple H1 tags found (${h1Count})`)
      } else if (h1Count === 0) {
        headingHierarchyValid = false
        headingIssues.push('No H1 tag found')
      }

      // Check landmarks
      const hasMainLandmark = !!document.querySelector('main, [role="main"]')
      const hasNavLandmark = !!document.querySelector('nav, [role="navigation"]')
      const hasFooterLandmark = !!document.querySelector('footer, [role="contentinfo"]')

      const landmarks = document.querySelectorAll('main, nav, header, footer, aside, [role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"]')

      return {
        hasSkipLink,
        headingHierarchyValid,
        headingIssues,
        hasMainLandmark,
        hasNavLandmark,
        hasFooterLandmark,
        landmarkCount: landmarks.length
      }
    })
  }

  /**
   * Analizza potenziali problemi di contrasto
   * Nota: analisi completa richiederebbe computed styles, questa è una versione semplificata
   */
  private async analyzeContrast(page: Page): Promise<ContrastAnalysis> {
    return await page.evaluate(() => {
      const potentialIssues: string[] = []
      let lowContrastElements = 0

      // Check for light gray text (common accessibility issue)
      const textElements = document.querySelectorAll('p, span, a, li, td, th, label, h1, h2, h3, h4, h5, h6')

      textElements.forEach(el => {
        const style = window.getComputedStyle(el)
        const color = style.color
        const bgColor = style.backgroundColor

        // Parse RGB values
        const colorMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
        if (colorMatch) {
          const r = parseInt(colorMatch[1])
          const g = parseInt(colorMatch[2])
          const b = parseInt(colorMatch[3])

          // Check for light gray text (common issue)
          if (r > 150 && g > 150 && b > 150 && r === g && g === b) {
            lowContrastElements++
          }
        }
      })

      // Check for :focus outline removal in styles
      const styles = document.querySelectorAll('style')
      styles.forEach(style => {
        const content = style.textContent || ''
        if (content.includes('outline: none') || content.includes('outline:none') ||
            content.includes('outline: 0') || content.includes('outline:0')) {
          if (potentialIssues.length < 5) {
            potentialIssues.push('Detected "outline: none" in CSS - may hide focus indicators')
          }
        }
      })

      return {
        lowContrastElements,
        potentialIssues
      }
    })
  }

  /**
   * Analizza accessibilità tastiera
   */
  private async analyzeKeyboard(page: Page): Promise<KeyboardAccessibility> {
    return await page.evaluate(() => {
      // Count focusable elements
      const focusableSelectors = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      const focusable = document.querySelectorAll(focusableSelectors)

      // Check tabindex usage
      const withTabindex = document.querySelectorAll('[tabindex]')
      const negativeTabindex = document.querySelectorAll('[tabindex="-1"]')

      // Check for outline removal
      const styles = Array.from(document.styleSheets)
      let outlineRemoved = false

      try {
        styles.forEach(sheet => {
          try {
            const rules = sheet.cssRules || sheet.rules
            if (rules) {
              for (let i = 0; i < rules.length; i++) {
                const rule = rules[i] as CSSStyleRule
                if (rule.style && rule.selectorText?.includes(':focus')) {
                  if (rule.style.outline === 'none' || rule.style.outline === '0') {
                    outlineRemoved = true
                  }
                }
              }
            }
          } catch {
            // Cross-origin stylesheets can't be accessed
          }
        })
      } catch {
        // Stylesheet access error
      }

      return {
        focusableElements: focusable.length,
        elementsWithTabindex: withTabindex.length,
        negativeTabindex: negativeTabindex.length,
        outlineRemoved
      }
    })
  }

  /**
   * Calculate WCAG score
   */
  private calculateWcagScore(
    aria: AriaAnalysis,
    images: ImageAccessibility,
    forms: FormAccessibility,
    structure: StructureAccessibility,
    keyboard: KeyboardAccessibility
  ): number {
    let score = 0

    // Images: 25 points
    score += images.altQualityScore * 0.25

    // Forms: 20 points
    if (forms.total > 0) {
      const labeledPercent = forms.withLabels / forms.total
      score += labeledPercent * 20
    } else {
      score += 20 // No forms = no form accessibility issues
    }

    // Structure: 25 points
    if (structure.hasSkipLink) score += 5
    if (structure.headingHierarchyValid) score += 10
    if (structure.hasMainLandmark) score += 5
    if (structure.hasNavLandmark) score += 3
    if (structure.hasFooterLandmark) score += 2

    // ARIA: 15 points
    if (aria.hasAriaLabels) score += 5
    if (aria.interactiveWithoutLabel === 0) score += 10
    else if (aria.interactiveWithoutLabel <= 3) score += 5

    // Keyboard: 15 points
    if (!keyboard.outlineRemoved) score += 10
    if (keyboard.focusableElements > 0) score += 5

    return Math.round(Math.min(100, score))
  }

  /**
   * Determine WCAG conformance level
   */
  private determineWcagLevel(
    score: number,
    aria: AriaAnalysis,
    images: ImageAccessibility,
    forms: FormAccessibility,
    structure: StructureAccessibility
  ): AccessibilityAnalysis['wcagLevel'] {
    // Critical failures that prevent any conformance
    if (images.total > 0 && images.withoutAlt / images.total > 0.5) return 'fail'
    if (forms.total > 0 && forms.withoutLabels / forms.total > 0.5) return 'fail'
    if (!structure.headingHierarchyValid && structure.headingIssues.length > 2) return 'fail'

    // Score-based levels
    if (score >= 90) return 'AAA'
    if (score >= 70) return 'AA'
    if (score >= 50) return 'A'
    return 'fail'
  }

  /**
   * Generate accessibility recommendations
   */
  private generateRecommendations(
    aria: AriaAnalysis,
    images: ImageAccessibility,
    forms: FormAccessibility,
    structure: StructureAccessibility,
    keyboard: KeyboardAccessibility
  ): AccessibilityRecommendation[] {
    const recommendations: AccessibilityRecommendation[] = []

    // Image recommendations (WCAG 1.1.1)
    if (images.withoutAlt > 0) {
      recommendations.push({
        type: images.withoutAlt > 5 ? 'critical' : 'high',
        wcagCriteria: '1.1.1',
        title: 'Immagini senza testo alternativo',
        description: `${images.withoutAlt} immagini non hanno l'attributo alt.`,
        impact: 'Utenti non vedenti non possono comprendere il contenuto delle immagini.',
        affectedCount: images.withoutAlt
      })
    }

    if (images.altQualityScore < 50) {
      recommendations.push({
        type: 'medium',
        wcagCriteria: '1.1.1',
        title: 'Qualità testi alternativi scarsa',
        description: 'Molti attributi alt sono generici o non descrittivi.',
        impact: 'Testi alt come "image1" non comunicano informazioni utili.'
      })
    }

    // Form recommendations (WCAG 1.3.1, 3.3.2)
    if (forms.withoutLabels > 0) {
      recommendations.push({
        type: 'critical',
        wcagCriteria: '1.3.1',
        title: 'Campi form senza label',
        description: `${forms.withoutLabels} campi non hanno etichette associate.`,
        impact: 'Gli screen reader non possono identificare lo scopo dei campi.',
        affectedCount: forms.withoutLabels
      })
    }

    if (forms.withPlaceholderOnly > 0) {
      recommendations.push({
        type: 'medium',
        wcagCriteria: '3.3.2',
        title: 'Campi con solo placeholder',
        description: `${forms.withPlaceholderOnly} campi usano placeholder invece di label.`,
        impact: 'Il placeholder scompare durante la digitazione.',
        affectedCount: forms.withPlaceholderOnly
      })
    }

    // Structure recommendations (WCAG 1.3.1, 2.4.1, 2.4.6)
    if (!structure.hasSkipLink) {
      recommendations.push({
        type: 'medium',
        wcagCriteria: '2.4.1',
        title: 'Manca skip link',
        description: 'Non è presente un link per saltare alla navigazione.',
        impact: 'Utenti da tastiera devono navigare tutto il menu ogni volta.'
      })
    }

    if (!structure.headingHierarchyValid) {
      recommendations.push({
        type: 'high',
        wcagCriteria: '1.3.1',
        title: 'Gerarchia heading non corretta',
        description: structure.headingIssues.join('; '),
        impact: 'Gli screen reader usano gli heading per navigare la pagina.'
      })
    }

    if (!structure.hasMainLandmark) {
      recommendations.push({
        type: 'medium',
        wcagCriteria: '1.3.1',
        title: 'Manca landmark main',
        description: 'Nessun elemento <main> o role="main" trovato.',
        impact: 'Utenti non possono saltare direttamente al contenuto principale.'
      })
    }

    // ARIA recommendations (WCAG 4.1.2)
    if (aria.interactiveWithoutLabel > 0) {
      recommendations.push({
        type: 'high',
        wcagCriteria: '4.1.2',
        title: 'Elementi interattivi senza label',
        description: `${aria.interactiveWithoutLabel} bottoni/link non hanno nome accessibile.`,
        impact: 'Gli screen reader non possono descrivere questi elementi.',
        affectedCount: aria.interactiveWithoutLabel
      })
    }

    // Keyboard recommendations (WCAG 2.1.1, 2.4.7)
    if (keyboard.outlineRemoved) {
      recommendations.push({
        type: 'critical',
        wcagCriteria: '2.4.7',
        title: 'Focus indicator rimosso',
        description: 'CSS contiene "outline: none" che nasconde il focus.',
        impact: 'Utenti da tastiera non vedono quale elemento è selezionato.'
      })
    }

    return recommendations.sort((a, b) => {
      const priority = { critical: 0, high: 1, medium: 2, low: 3 }
      return priority[a.type] - priority[b.type]
    })
  }
}

// Singleton
let globalAccessibilityAnalyzer: AccessibilityAnalyzer | null = null

export function getGlobalAccessibilityAnalyzer(): AccessibilityAnalyzer {
  if (!globalAccessibilityAnalyzer) {
    globalAccessibilityAnalyzer = new AccessibilityAnalyzer()
  }
  return globalAccessibilityAnalyzer
}
