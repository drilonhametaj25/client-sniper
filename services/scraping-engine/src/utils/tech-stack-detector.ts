/**
 * Rilevatore di tecnologie e CMS per siti web
 * Identifica WordPress, Shopify, Wix, framework JS e altre tecnologie
 * Analizza headers, script, classi CSS e struttura DOM
 * 
 * Utilizzato dal Website Analyzer per arricchire l'analisi tecnica
 * Parte del modulo services/scraping-engine
 */

export interface TechStackInfo {
  cms: string | null
  framework: string | null
  ecommerce: string | null
  analytics: string[]
  hosting: string | null
  cdn: string | null
  languages: string[]
  libraries: string[]
  plugins: string[]
  confidence: number // 0-1
}

export interface TechSignature {
  name: string
  category: 'cms' | 'framework' | 'ecommerce' | 'analytics' | 'hosting' | 'cdn' | 'library' | 'plugin'
  patterns: {
    html?: RegExp[]
    scripts?: RegExp[]
    headers?: Record<string, RegExp>
    cookies?: RegExp[]
    meta?: RegExp[]
    css?: RegExp[]
    urls?: RegExp[]
  }
  confidence: number
}

export class TechStackDetector {
  private signatures: TechSignature[] = [
    // CMS Detection
    {
      name: 'WordPress',
      category: 'cms',
      confidence: 0.9,
      patterns: {
        html: [
          /wp-content\//i,
          /wp-includes\//i,
          /<meta name="generator" content="WordPress/i
        ],
        scripts: [
          /wp-content\/themes/i,
          /wp-content\/plugins/i,
          /wp-json/i
        ],
        headers: {
          'x-powered-by': /WordPress/i
        }
      }
    },
    {
      name: 'Shopify',
      category: 'ecommerce',
      confidence: 0.95,
      patterns: {
        html: [
          /Shopify\.theme/i,
          /cdn\.shopify\.com/i,
          /myshopify\.com/i
        ],
        scripts: [
          /cdn\.shopify\.com/i,
          /Shopify\.analytics/i
        ],
        headers: {
          'server': /Shopify/i
        }
      }
    },
    {
      name: 'Wix',
      category: 'cms',
      confidence: 0.9,
      patterns: {
        html: [
          /static\.wixstatic\.com/i,
          /"wixSite"/i,
          /wix\.com/i
        ],
        scripts: [
          /static\.wixstatic\.com/i
        ]
      }
    },
    {
      name: 'Squarespace',
      category: 'cms',
      confidence: 0.9,
      patterns: {
        html: [
          /squarespace\.com/i,
          /"Squarespace"/i
        ],
        scripts: [
          /assets\.squarespace\.com/i
        ]
      }
    },
    {
      name: 'Prestashop',
      category: 'ecommerce',
      confidence: 0.85,
      patterns: {
        html: [
          /Powered by PrestaShop/i,
          /prestashop/i
        ],
        scripts: [
          /prestashop/i
        ]
      }
    },
    {
      name: 'Magento',
      category: 'ecommerce',
      confidence: 0.85,
      patterns: {
        html: [
          /Magento/i,
          /mage\//i
        ],
        scripts: [
          /mage\//i,
          /magento/i
        ],
        cookies: [
          /MAGE_/i
        ]
      }
    },
    
    // Framework Detection
    {
      name: 'React',
      category: 'framework',
      confidence: 0.8,
      patterns: {
        html: [
          /data-reactroot/i,
          /react-/i
        ],
        scripts: [
          /react/i,
          /ReactDOM/i
        ]
      }
    },
    {
      name: 'Next.js',
      category: 'framework',
      confidence: 0.85,
      patterns: {
        html: [
          /__NEXT_DATA__/i,
          /_next\//i
        ],
        scripts: [
          /_next\//i
        ],
        headers: {
          'x-powered-by': /Next\.js/i
        }
      }
    },
    {
      name: 'Vue.js',
      category: 'framework',
      confidence: 0.8,
      patterns: {
        html: [
          /data-v-/i,
          /vue/i
        ],
        scripts: [
          /vue\.js/i,
          /vuejs/i
        ]
      }
    },
    {
      name: 'Angular',
      category: 'framework',
      confidence: 0.8,
      patterns: {
        html: [
          /ng-app/i,
          /ng-version/i,
          /angular/i
        ],
        scripts: [
          /angular/i
        ]
      }
    },
    {
      name: 'Laravel',
      category: 'framework',
      confidence: 0.7,
      patterns: {
        html: [
          /Laravel/i
        ],
        headers: {
          'x-powered-by': /Laravel/i
        },
        cookies: [
          /laravel_session/i
        ]
      }
    },
    
    // Analytics & Marketing
    {
      name: 'Google Analytics 4',
      category: 'analytics',
      confidence: 0.9,
      patterns: {
        scripts: [
          /gtag\(/i,
          /googletagmanager\.com\/gtag/i,
          /G-[A-Z0-9]+/i
        ]
      }
    },
    {
      name: 'Google Analytics Universal',
      category: 'analytics',
      confidence: 0.9,
      patterns: {
        scripts: [
          /google-analytics\.com\/analytics\.js/i,
          /UA-\d+-\d+/i
        ]
      }
    },
    {
      name: 'Facebook Pixel',
      category: 'analytics',
      confidence: 0.9,
      patterns: {
        scripts: [
          /connect\.facebook\.net/i,
          /fbq\(/i
        ]
      }
    },
    {
      name: 'Google Tag Manager',
      category: 'analytics',
      confidence: 0.9,
      patterns: {
        scripts: [
          /googletagmanager\.com/i,
          /GTM-[A-Z0-9]+/i
        ]
      }
    },
    {
      name: 'Hotjar',
      category: 'analytics',
      confidence: 0.85,
      patterns: {
        scripts: [
          /static\.hotjar\.com/i,
          /hj\(/i
        ]
      }
    },
    
    // CDN & Hosting
    {
      name: 'Cloudflare',
      category: 'cdn',
      confidence: 0.8,
      patterns: {
        headers: {
          'server': /cloudflare/i,
          'cf-ray': /.+/
        }
      }
    },
    {
      name: 'AWS CloudFront',
      category: 'cdn',
      confidence: 0.8,
      patterns: {
        headers: {
          'server': /CloudFront/i,
          'x-amz-cf-id': /.+/
        }
      }
    },
    {
      name: 'Netlify',
      category: 'hosting',
      confidence: 0.85,
      patterns: {
        headers: {
          'server': /Netlify/i
        }
      }
    },
    {
      name: 'Vercel',
      category: 'hosting',
      confidence: 0.85,
      patterns: {
        headers: {
          'server': /Vercel/i,
          'x-vercel-id': /.+/
        }
      }
    },
    
    // Libraries
    {
      name: 'jQuery',
      category: 'library',
      confidence: 0.7,
      patterns: {
        scripts: [
          /jquery/i,
          /\$\(/
        ]
      }
    },
    {
      name: 'Bootstrap',
      category: 'library',
      confidence: 0.7,
      patterns: {
        html: [
          /bootstrap/i
        ],
        css: [
          /bootstrap/i
        ]
      }
    }
  ]

  /**
   * Analizza il tech stack di un sito web
   */
  async detectTechStack(
    html: string,
    headers: Record<string, string> = {},
    cookies: string[] = [],
    scripts: string[] = []
  ): Promise<TechStackInfo> {
    
    const detectedTech: Map<string, { category: string, confidence: number }> = new Map()
    
    // Analizza ogni signature
    for (const signature of this.signatures) {
      const confidence = this.checkSignature(signature, html, headers, cookies, scripts)
      
      if (confidence > 0.3) { // Soglia minima di confidenza
        const existing = detectedTech.get(signature.name)
        if (!existing || existing.confidence < confidence) {
          detectedTech.set(signature.name, {
            category: signature.category,
            confidence
          })
        }
      }
    }
    
    // Organizza i risultati per categoria
    return this.organizeTechResults(detectedTech)
  }

  /**
   * Verifica una signature specifica
   */
  private checkSignature(
    signature: TechSignature,
    html: string,
    headers: Record<string, string>,
    cookies: string[],
    scripts: string[]
  ): number {
    let matches = 0
    let totalChecks = 0
    
    // Controlla HTML patterns
    if (signature.patterns.html) {
      for (const pattern of signature.patterns.html) {
        totalChecks++
        if (pattern.test(html)) {
          matches++
        }
      }
    }
    
    // Controlla script patterns
    if (signature.patterns.scripts) {
      const allScripts = scripts.join(' ') + this.extractScriptsFromHtml(html)
      for (const pattern of signature.patterns.scripts) {
        totalChecks++
        if (pattern.test(allScripts)) {
          matches++
        }
      }
    }
    
    // Controlla headers
    if (signature.patterns.headers) {
      for (const [headerName, pattern] of Object.entries(signature.patterns.headers)) {
        totalChecks++
        const headerValue = headers[headerName.toLowerCase()] || ''
        if (pattern.test(headerValue)) {
          matches++
        }
      }
    }
    
    // Controlla cookies
    if (signature.patterns.cookies) {
      const allCookies = cookies.join(' ')
      for (const pattern of signature.patterns.cookies) {
        totalChecks++
        if (pattern.test(allCookies)) {
          matches++
        }
      }
    }
    
    // Controlla meta tags
    if (signature.patterns.meta) {
      for (const pattern of signature.patterns.meta) {
        totalChecks++
        if (pattern.test(html)) {
          matches++
        }
      }
    }
    
    // Controlla CSS
    if (signature.patterns.css) {
      const cssContent = this.extractCssFromHtml(html)
      for (const pattern of signature.patterns.css) {
        totalChecks++
        if (pattern.test(cssContent)) {
          matches++
        }
      }
    }
    
    // Calcola confidenza
    if (totalChecks === 0) return 0
    
    const matchRatio = matches / totalChecks
    return matchRatio * signature.confidence
  }

  /**
   * Estrae script dal HTML
   */
  private extractScriptsFromHtml(html: string): string {
    const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi)
    if (!scriptMatches) return ''
    
    return scriptMatches
      .map(script => script.replace(/<\/?script[^>]*>/gi, ''))
      .join(' ')
  }

  /**
   * Estrae CSS dal HTML
   */
  private extractCssFromHtml(html: string): string {
    const cssMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi)
    if (!cssMatches) return ''
    
    return cssMatches
      .map(style => style.replace(/<\/?style[^>]*>/gi, ''))
      .join(' ')
  }

  /**
   * Organizza i risultati per categoria
   */
  private organizeTechResults(detectedTech: Map<string, { category: string, confidence: number }>): TechStackInfo {
    const result: TechStackInfo = {
      cms: null,
      framework: null,
      ecommerce: null,
      analytics: [],
      hosting: null,
      cdn: null,
      languages: [],
      libraries: [],
      plugins: [],
      confidence: 0
    }
    let totalConfidence = 0
    let techCount = 0
    let foundWordPress = false
    let foundMagento = false
    let foundWooCommerce = false
    for (const [name, info] of detectedTech.entries()) {
      totalConfidence += info.confidence
      techCount++
      switch (info.category) {
        case 'cms':
          if (name === 'WordPress') foundWordPress = true
          if (!result.cms || info.confidence > 0.7) {
            result.cms = name
          }
          break
        case 'framework':
          if (!result.framework || info.confidence > 0.7) {
            result.framework = name
          }
          break
        case 'ecommerce':
          if (name === 'Magento') foundMagento = true
          if (name === 'WooCommerce') foundWooCommerce = true
          if (!result.ecommerce || info.confidence > 0.7) {
            result.ecommerce = name
          }
          break
        case 'analytics':
          result.analytics.push(name)
          break
        case 'hosting':
          if (!result.hosting || info.confidence > 0.7) {
            result.hosting = name
          }
          break
        case 'cdn':
          if (!result.cdn || info.confidence > 0.7) {
            result.cdn = name
          }
          break
        case 'library':
          result.libraries.push(name)
          break
        case 'plugin':
          result.plugins.push(name)
          break
      }
    }
    // Logica esclusiva CMS/ecommerce
    if (foundWordPress && foundWooCommerce) {
      result.ecommerce = 'WooCommerce'
    }
    if (foundWordPress && result.ecommerce === 'Magento') {
      result.ecommerce = null
    }
    if (foundWordPress && foundMagento) {
      // Priorità a WordPress, escludi Magento
      result.ecommerce = result.ecommerce === 'WooCommerce' ? 'WooCommerce' : null
    }
    result.confidence = techCount > 0 ? totalConfidence / techCount : 0
    return result
  }

  /**
   * Rilevamento rapido di WordPress
   */
  static isWordPress(html: string): boolean {
    return /wp-content\//i.test(html) || 
           /wp-includes\//i.test(html) || 
           /<meta name="generator" content="WordPress/i.test(html)
  }

  /**
   * Rilevamento rapido di Shopify
   */
  static isShopify(html: string): boolean {
    return /cdn\.shopify\.com/i.test(html) || 
           /Shopify\.theme/i.test(html) ||
           /myshopify\.com/i.test(html)
  }

  /**
   * Rilevamento rapido di React/Next.js
   */
  static isReactBased(html: string): boolean {
    return /__NEXT_DATA__/i.test(html) || 
           /data-reactroot/i.test(html) ||
           /_next\//i.test(html)
  }
}
