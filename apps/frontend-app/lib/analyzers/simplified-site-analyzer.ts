/**
 * SimplifiedSiteAnalyzer - Versione leggera dell'analyzer per ambienti serverless
 * Esegue un'analisi semplificata dei siti web senza richiedere un browser headless
 * Utilizzato come fallback quando Playwright non è disponibile (es. in ambiente Vercel)
 * 
 * @author ClientSniper Team
 * @module analyzers
 */

import { 
  WebsiteAnalysis, 
  PerformanceMetrics, 
  SEOAnalysis, 
  TrackingAnalysis,
  GDPRCompliance,
  LegalCompliance,
  SocialPresence,
  TechnicalIssues
} from '../types/analysis';

export class SimplifiedSiteAnalyzer {
  /**
   * Analizza un sito web usando solo richieste fetch senza browser headless
   * Ideale per ambienti serverless dove Playwright non è supportato
   */
  async analyzeSite(url: string): Promise<WebsiteAnalysis> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 SimplifiedSiteAnalyzer: Inizio analisi semplificata per ${url}`);
      
      // Normalizza URL
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      
      // Fetch con timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      console.log(`📡 Tentativo fetch URL: ${url}`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ClientSniper/1.0; +https://clientsniper.com)',
        },
        redirect: 'follow',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log(`✅ Risposta ricevuta: ${response.status} ${response.statusText}`);
      
      const finalUrl = response.url;
      const contentType = response.headers.get('content-type');
      const isHtml = contentType && contentType.includes('text/html');
      
      if (!isHtml) {
        console.log(`⚠️ La risposta non è HTML: ${contentType}`);
      }
      
      // Estrai contenuto della pagina
      const html = isHtml ? await response.text() : '';
      console.log(`📄 HTML ricevuto (${html.length} caratteri)`);
      
      // Esecuzione analisi semplificata
      const performance = this.analyzePerformance(html, response.status, startTime);
      const seo = this.analyzeSEO(html);
      const tracking = this.analyzeTracking(html);
      const gdpr = this.analyzeGDPR(html, finalUrl);
      const legal = this.analyzeLegal(html);
      const social = this.analyzeSocial(html);
      
      // Calcola problemi tecnici
      const issues = this.identifyIssues(seo, tracking, gdpr, finalUrl);
      
      // Calcola punteggio complessivo
      const overallScore = this.calculateScore(
        seo,
        tracking,
        issues,
        response.status
      );
      
      console.log(`✅ Analisi semplificata completata, punteggio: ${overallScore}`);
      
      return {
        url,
        finalUrl,
        isAccessible: response.status >= 200 && response.status < 400,
        httpStatus: response.status,
        redirectChain: [url, finalUrl].filter((u, i, arr) => arr.indexOf(u) === i),
        performance,
        seo,
        tracking,
        gdpr,
        legal,
        social,
        issues,
        overallScore,
        analysisDate: new Date(),
        analysisTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('❌ Errore durante analisi semplificata:', error);
      
      // In caso di errore, restituisci un'analisi minima con errore
      return this.createMinimalAnalysis(url, error instanceof Error ? error.message : 'Errore sconosciuto');
    }
  }
  
  /**
   * Analizza la performance del sito (in modo semplificato)
   */
  private analyzePerformance(html: string, statusCode: number, startTime: number): PerformanceMetrics {
    // Stima il tempo di caricamento dal tempo di risposta
    const loadTime = Date.now() - startTime;
    
    // Conta le immagini
    const imgMatches = html.match(/<img[^>]*>/gi) || [];
    const totalImages = imgMatches.length;
    
    // Verifica responsive design in modo approssimativo
    const isResponsive = html.includes('viewport') && 
                        (html.includes('width=device-width') || 
                         html.includes('media') || 
                         html.includes('bootstrap') || 
                         html.includes('tailwind'));
    
    return {
      loadTime,
      totalImages,
      brokenImages: 0, // Non possiamo verificarlo senza browser
      isResponsive
    };
  }
  
  /**
   * Analizza i meta tag SEO
   */
  private analyzeSEO(html: string): SEOAnalysis {
    // Titolo
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    // Meta description
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) || 
                         html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
    const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';
    
    // H1
    const h1Matches = html.match(/<h1[^>]*>([^<]*)<\/h1>/gi) || [];
    
    // Structured data
    const hasStructuredData = html.includes('application/ld+json') || 
                              html.includes('schema.org');
    
    return {
      hasTitle: !!title,
      titleLength: title.length,
      hasMetaDescription: !!metaDescription,
      metaDescriptionLength: metaDescription.length,
      hasH1: h1Matches.length > 0,
      h1Count: h1Matches.length,
      hasStructuredData
    };
  }
  
  /**
   * Rileva script di tracking - MIGLIORATO con pattern robusti
   * Allineato con services/scraping-engine/src/analyzers/enhanced-website-analyzer.ts
   */
  private analyzeTracking(html: string): TrackingAnalysis {
    // Google Analytics (UA e GA4)
    const gaPatterns = [
      /gtag\s*\(/i,
      /google-analytics\.com/i,
      /googletagmanager\.com\/gtag\/js/i,
      /UA-\d{4,10}-\d{1,4}/i,
      /G-[A-Z0-9]{10,}/i,
      /analytics\.js/i,
      /gtag\/js\?id=/i,
      /__gaTracker/i,
      /GoogleAnalyticsObject/i
    ]
    const hasGoogleAnalytics = gaPatterns.some(pattern => pattern.test(html))

    // Facebook Pixel (inclusi fbevents.js e cookie _fbp/_fbc)
    const fbPatterns = [
      /connect\.facebook\.net.*fbevents/i,
      /fbq\s*\(/i,
      /facebook\.com\/tr/i,
      /_fbp/i,
      /fbevents\.js/i,
      /fb-pixel/i,
      /facebook\.net\/en_US\/fbevents/i
    ]
    const hasFacebookPixel = fbPatterns.some(pattern => pattern.test(html))

    // Google Tag Manager
    const gtmPatterns = [
      /googletagmanager\.com\/gtm\.js/i,
      /GTM-[A-Z0-9]{6,}/i,
      /gtm\.start/i,
      /googletagmanager\.com\/ns\.html/i
    ]
    const hasGTM = gtmPatterns.some(pattern => pattern.test(html))

    // Hotjar
    const hasHotjar = /static\.hotjar\.com/i.test(html) ||
                      /hj\s*\(/i.test(html) ||
                      /hotjar\.com\/c\/hotjar/i.test(html)

    // Microsoft Clarity
    const hasClarity = /clarity\.ms/i.test(html) ||
                       /clarity\s*\(/i.test(html) ||
                       /microsoft\/clarity/i.test(html)

    // Custom Tracking (alcuni comuni)
    const customTracking: string[] = []
    if (/matomo/i.test(html)) customTracking.push('Matomo')
    if (/segment\.com/i.test(html) || /analytics\.min\.js/i.test(html)) customTracking.push('Segment')
    if (/hubspot/i.test(html)) customTracking.push('HubSpot')
    if (/ttq\s*\(/i.test(html) || /analytics\.tiktok\.com/i.test(html)) customTracking.push('TikTok Pixel')
    if (/lintrk\s*\(/i.test(html) || /linkedin\.com\/insight/i.test(html)) customTracking.push('LinkedIn Insight')
    if (/pintrk\s*\(/i.test(html) || /pinterest\.com\/tag/i.test(html)) customTracking.push('Pinterest Tag')

    return {
      hasGoogleAnalytics,
      hasFacebookPixel,
      hasGoogleTagManager: hasGTM,
      hasHotjar,
      hasClarityMicrosoft: hasClarity,
      customTracking
    }
  }
  
  /**
   * Analizza conformità GDPR
   */
  private analyzeGDPR(html: string, url: string): GDPRCompliance {
    // Cookie banner
    const hasCookieBanner = html.toLowerCase().includes('cookie') || 
                           html.toLowerCase().includes('gdpr') ||
                           html.toLowerCase().includes('consenso');
    
    // Policy privacy
    const privacyMatches = html.match(/href=["']([^"']*privacy[^"']*)["']/gi) || [];
    const hasPrivacyPolicy = privacyMatches.length > 0;
    
    // Terms of service
    const tosMatches = html.match(/href=["']([^"']*(?:terms|condition|termini)[^"']*)["']/gi) || [];
    const hasTermsOfService = tosMatches.length > 0;
    
    // Rischiosi embed (YouTube, Maps, etc)
    const riskyEmbeds: string[] = [];
    if (html.includes('youtube.com/embed')) riskyEmbeds.push('YouTube');
    if (html.includes('google.com/maps')) riskyEmbeds.push('Google Maps');
    if (html.includes('facebook.com/plugins')) riskyEmbeds.push('Facebook');
    
    return {
      hasCookieBanner,
      hasPrivacyPolicy,
      hasTermsOfService,
      cookieConsentMethod: hasCookieBanner ? 'banner' : 'none',
      riskyEmbeds
    };
  }
  
  /**
   * Analizza conformità legale
   */
  private analyzeLegal(html: string): LegalCompliance {
    const lowerHtml = html.toLowerCase();
    
    // Partita IVA
    const hasPartitaIva = lowerHtml.includes('partita iva') || 
                         lowerHtml.includes('p. iva') ||
                         lowerHtml.includes('p.iva') ||
                         lowerHtml.includes('piva');
    
    // Indirizzo aziendale
    const hasBusinessAddress = lowerHtml.includes('via ') || 
                              lowerHtml.includes('viale ') ||
                              lowerHtml.includes('piazza ') ||
                              lowerHtml.includes('corso ');
    
    // Info di contatto
    const hasContactInfo = lowerHtml.includes('tel:') || 
                          lowerHtml.includes('mailto:') ||
                          lowerHtml.includes('contatti') ||
                          lowerHtml.includes('contattaci');
    
    // Calcolo punteggio compliance
    let complianceScore = 0;
    if (hasPartitaIva) complianceScore += 40;
    if (hasBusinessAddress) complianceScore += 30;
    if (hasContactInfo) complianceScore += 30;
    
    return {
      hasVisiblePartitaIva: hasPartitaIva,
      hasBusinessAddress,
      hasContactInfo,
      complianceScore
    };
  }
  
  /**
   * Analizza presenza social
   */
  private analyzeSocial(html: string): SocialPresence {
    // Rileva link social
    const socialData: SocialPresence = {
      hasAnySocial: false,
      socialCount: 0
    };
    
    if (html.includes('facebook.com')) {
      socialData.facebook = 'Presente';
      socialData.socialCount++;
    }
    
    if (html.includes('instagram.com')) {
      socialData.instagram = 'Presente';
      socialData.socialCount++;
    }
    
    if (html.includes('linkedin.com')) {
      socialData.linkedin = 'Presente';
      socialData.socialCount++;
    }
    
    if (html.includes('tiktok.com')) {
      socialData.tiktok = 'Presente';
      socialData.socialCount++;
    }
    
    if (html.includes('youtube.com')) {
      socialData.youtube = 'Presente';
      socialData.socialCount++;
    }
    
    if (html.includes('twitter.com') || html.includes('x.com')) {
      socialData.twitter = 'Presente';
      socialData.socialCount++;
    }
    
    socialData.hasAnySocial = socialData.socialCount > 0;
    
    return socialData;
  }
  
  /**
   * Identifica i problemi tecnici del sito
   */
  private identifyIssues(
    seo: SEOAnalysis, 
    tracking: TrackingAnalysis, 
    gdpr: GDPRCompliance,
    url: string
  ): TechnicalIssues {
    return {
      missingTitle: !seo.hasTitle,
      shortTitle: seo.hasTitle && seo.titleLength < 30,
      missingMetaDescription: !seo.hasMetaDescription,
      shortMetaDescription: seo.hasMetaDescription && seo.metaDescriptionLength < 70,
      missingH1: !seo.hasH1,
      brokenImages: false, // Non possiamo verificarlo senza browser
      slowLoading: false, // Non abbiamo dati sufficienti
      noTracking: !tracking.hasGoogleAnalytics && !tracking.hasFacebookPixel && !tracking.hasGoogleTagManager,
      noCookieConsent: !gdpr.hasCookieBanner,
      missingPartitaIva: false, // Dato non preciso senza browser
      noSocialPresence: false, // Dato non preciso senza browser
      httpsIssues: !url.startsWith('https://')
    };
  }
  
  /**
   * Calcola punteggio complessivo
   */
  private calculateScore(
    seo: SEOAnalysis,
    tracking: TrackingAnalysis,
    issues: TechnicalIssues,
    statusCode: number
  ): number {
    // Punteggio base
    let score = 50;
    
    // Penalità per errori HTTP
    if (statusCode >= 400) {
      score -= 30;
    } else if (statusCode >= 300) {
      score -= 5;
    }
    
    // Bonus/malus SEO
    if (seo.hasTitle) score += 5;
    if (!seo.hasTitle || issues.shortTitle) score -= 10;
    if (seo.hasMetaDescription) score += 5;
    if (!seo.hasMetaDescription || issues.shortMetaDescription) score -= 10;
    if (seo.hasH1) score += 5;
    if (!seo.hasH1) score -= 5;
    if (seo.hasStructuredData) score += 10;
    
    // Bonus tracking
    if (tracking.hasGoogleAnalytics || tracking.hasGoogleTagManager) score += 5;
    if (tracking.hasFacebookPixel) score += 5;
    
    // Limita il punteggio tra 10 e 100
    return Math.max(10, Math.min(100, score));
  }
  
  /**
   * Crea un'analisi minimale in caso di errore
   */
  private createMinimalAnalysis(url: string, errorMessage: string): WebsiteAnalysis {
    return {
      url,
      finalUrl: url,
      isAccessible: false,
      httpStatus: 0,
      redirectChain: [url],
      performance: {
        loadTime: 0,
        totalImages: 0,
        brokenImages: 0,
        isResponsive: false
      },
      seo: {
        hasTitle: false,
        titleLength: 0,
        hasMetaDescription: false,
        metaDescriptionLength: 0,
        hasH1: false,
        h1Count: 0,
        hasStructuredData: false
      },
      tracking: {
        hasGoogleAnalytics: false,
        hasFacebookPixel: false,
        hasGoogleTagManager: false,
        hasHotjar: false,
        hasClarityMicrosoft: false,
        customTracking: []
      },
      gdpr: {
        hasCookieBanner: false,
        hasPrivacyPolicy: false,
        hasTermsOfService: false,
        cookieConsentMethod: 'none',
        riskyEmbeds: []
      },
      legal: {
        hasVisiblePartitaIva: false,
        hasBusinessAddress: false,
        hasContactInfo: false,
        complianceScore: 0
      },
      social: {
        hasAnySocial: false,
        socialCount: 0
      },
      issues: {
        missingTitle: true,
        shortTitle: false,
        missingMetaDescription: true,
        shortMetaDescription: false,
        missingH1: true,
        brokenImages: false,
        slowLoading: false,
        noTracking: true,
        noCookieConsent: true,
        missingPartitaIva: true,
        noSocialPresence: true,
        httpsIssues: !url.startsWith('https://')
      },
      overallScore: 10,
      analysisDate: new Date(),
      analysisTime: 0
    };
  }
}
