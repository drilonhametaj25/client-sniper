/**
 * Catalogo servizi per i preventivi automatici - TrovaMi
 *
 * SINGLE SOURCE OF TRUTH per i prezzi dei preventivi proposti ai lead.
 * Contiene le definizioni (prezzo base in EUR, giorni stimati, categoria, template ROI)
 * e le etichette in italiano (nome + descrizione) di ogni servizio.
 *
 * Posizione: apps/frontend-app/lib/services/catalog.ts
 * Usato da:
 *  - app/api/leads/[id]/quotation/route.ts        (preventivo JSON)
 *  - app/api/leads/[id]/quotation/pdf/route.ts    (preventivo PDF)
 *
 * NOTA STORICA: questo catalogo era triplicato — copia-incollato identico nelle due
 * route quotation qui sopra e in services/scraping-engine/src/pricing/pricing-engine.ts
 * (quest'ultimo dead code, zero importer, rimosso). Ogni ritocco ai prezzi andava
 * replicato a mano in tre file, con il rischio che il PDF quotasse cifre diverse
 * dal preventivo mostrato a schermo. Modificare i prezzi SOLO qui.
 *
 * NON confondere con SERVICE_CONFIGS in lib/types/services.ts (range di budget dei
 * ServiceType usati dalla UI) né con la tabella DB `digital_services` (catalogo
 * commerciale editabile dagli admin): sono cataloghi distinti.
 */

/** Categorie merceologiche dei servizi preventivabili */
export type ServiceCategory =
  | 'seo'
  | 'performance'
  | 'security'
  | 'design'
  | 'content'
  | 'compliance'
  | 'marketing'
  | 'development'

/** Definizione di listino di un singolo servizio */
export interface ServiceDefinition {
  basePrice: number
  days: number
  category: ServiceCategory
  roiTemplate: string
}

// Prezzi base servizi (EUR)
export const SERVICE_DEFINITIONS: Record<string, ServiceDefinition> = {
  'seo_audit': { basePrice: 400, days: 5, category: 'seo', roiTemplate: 'Identificazione opportunità per +{percentage}% traffico organico' },
  'seo_optimization': { basePrice: 1500, days: 21, category: 'seo', roiTemplate: 'Aumento stimato traffico organico: +{percentage}%' },
  'seo_technical': { basePrice: 800, days: 10, category: 'seo', roiTemplate: 'Miglioramento indicizzazione e velocità crawling' },
  'structured_data': { basePrice: 300, days: 3, category: 'seo', roiTemplate: 'Rich snippets per +{percentage}% CTR nei risultati' },
  'performance_optimization': { basePrice: 800, days: 14, category: 'performance', roiTemplate: 'Tempo caricamento ridotto del {percentage}%, -bounce rate' },
  'image_optimization': { basePrice: 300, days: 5, category: 'performance', roiTemplate: 'Riduzione peso pagina fino a {percentage}%' },
  'core_web_vitals': { basePrice: 600, days: 10, category: 'performance', roiTemplate: 'Miglioramento Core Web Vitals per ranking Google' },
  'security_audit': { basePrice: 600, days: 7, category: 'security', roiTemplate: 'Identificazione vulnerabilità e piano remediation' },
  'security_hardening': { basePrice: 900, days: 10, category: 'security', roiTemplate: 'Protezione da attacchi comuni, riduzione rischio data breach' },
  'ssl_setup': { basePrice: 150, days: 1, category: 'security', roiTemplate: 'Certificato SSL attivo, trust badge, ranking boost' },
  'security_headers': { basePrice: 250, days: 2, category: 'security', roiTemplate: 'Protezione XSS, clickjacking, injection attacks' },
  'mobile_optimization': { basePrice: 900, days: 14, category: 'design', roiTemplate: 'Conversioni mobile aumentate: +{percentage}%' },
  'ux_audit': { basePrice: 500, days: 7, category: 'design', roiTemplate: 'Identificazione friction points e opportunità conversione' },
  'redesign_landing': { basePrice: 1200, days: 14, category: 'design', roiTemplate: 'Conversion rate aumentato: +{percentage}%' },
  'redesign_full': { basePrice: 4000, days: 45, category: 'design', roiTemplate: 'Sito moderno, responsive, conversion-focused' },
  'content_strategy': { basePrice: 800, days: 14, category: 'content', roiTemplate: 'Piano editoriale per +{percentage}% engagement' },
  'blog_setup': { basePrice: 500, days: 5, category: 'content', roiTemplate: 'Blog per content marketing e lead generation' },
  'gdpr_compliance': { basePrice: 500, days: 10, category: 'compliance', roiTemplate: 'Conformità GDPR, evitate sanzioni fino a 4% fatturato' },
  'cookie_banner': { basePrice: 200, days: 2, category: 'compliance', roiTemplate: 'Consenso cookie conforme a normativa EU' },
  'privacy_policy': { basePrice: 300, days: 3, category: 'compliance', roiTemplate: 'Documentazione legale completa' },
  'accessibility_audit': { basePrice: 500, days: 7, category: 'compliance', roiTemplate: 'Conformità WCAG 2.1 AA, audience +{percentage}%' },
  'accessibility_fix': { basePrice: 800, days: 14, category: 'compliance', roiTemplate: 'Sito accessibile a utenti con disabilità' },
  'tracking_setup': { basePrice: 400, days: 5, category: 'marketing', roiTemplate: 'Tracciamento completo conversioni e comportamento' },
  'gtm_setup': { basePrice: 350, days: 3, category: 'marketing', roiTemplate: 'Google Tag Manager configurato con eventi chiave' },
  'facebook_pixel': { basePrice: 200, days: 2, category: 'marketing', roiTemplate: 'Remarketing Facebook/Instagram attivo' },
  'update_dependencies': { basePrice: 350, days: 3, category: 'development', roiTemplate: 'Aggiornamento librerie per sicurezza e performance' },
}

export const SERVICE_NAMES: Record<string, string> = {
  'seo_audit': 'Audit SEO Completo',
  'seo_optimization': 'Ottimizzazione SEO On-Page',
  'seo_technical': 'SEO Tecnico',
  'structured_data': 'Implementazione Dati Strutturati',
  'performance_optimization': 'Ottimizzazione Performance',
  'image_optimization': 'Ottimizzazione Immagini',
  'core_web_vitals': 'Miglioramento Core Web Vitals',
  'security_audit': 'Audit Sicurezza',
  'security_hardening': 'Hardening e Protezione',
  'ssl_setup': 'Configurazione SSL/HTTPS',
  'security_headers': 'Configurazione Security Headers',
  'mobile_optimization': 'Ottimizzazione Mobile',
  'ux_audit': 'Audit UX/UI',
  'redesign_landing': 'Redesign Landing Pages',
  'redesign_full': 'Redesign Completo Sito',
  'content_strategy': 'Strategia Contenuti',
  'blog_setup': 'Setup Sezione Blog',
  'gdpr_compliance': 'Compliance GDPR Completa',
  'cookie_banner': 'Implementazione Cookie Banner',
  'privacy_policy': 'Redazione Privacy Policy',
  'accessibility_audit': 'Audit Accessibilità WCAG',
  'accessibility_fix': 'Correzione Problemi Accessibilità',
  'tracking_setup': 'Setup Analytics Completo',
  'gtm_setup': 'Configurazione Google Tag Manager',
  'facebook_pixel': 'Setup Facebook/Meta Pixel',
  'update_dependencies': 'Aggiornamento Dipendenze',
}

export const SERVICE_DESCRIPTIONS: Record<string, string> = {
  'seo_audit': 'Analisi completa SEO con report dettagliato e piano di azione',
  'seo_optimization': 'Ottimizzazione title, meta, heading e contenuti per keyword target',
  'seo_technical': 'Sitemap, robots.txt, canonical, redirect e struttura URL',
  'structured_data': 'Schema.org JSON-LD per rich snippets',
  'performance_optimization': 'Caching, minification, lazy loading, code splitting',
  'image_optimization': 'Compressione, WebP, lazy loading, responsive images',
  'core_web_vitals': 'LCP, FID, CLS ottimizzati per ranking Google',
  'security_audit': 'Penetration test base, vulnerability scanning',
  'security_hardening': 'Firewall, WAF, protezione brute force, backup',
  'ssl_setup': 'Certificato SSL, redirect HTTPS, HSTS',
  'security_headers': 'CSP, X-Frame-Options, X-XSS-Protection',
  'mobile_optimization': 'Layout responsive, touch-friendly, performance mobile',
  'ux_audit': 'Analisi user journey, heatmaps, conversion funnel',
  'redesign_landing': 'Riprogettazione pagine chiave per conversione',
  'redesign_full': 'Nuovo design completo, responsive, moderno',
  'content_strategy': 'Piano editoriale, keyword research, content calendar',
  'blog_setup': 'Sezione blog con categorie, tags, e feed RSS',
  'gdpr_compliance': 'Cookie policy, consensi, registro trattamenti',
  'cookie_banner': 'Banner consenso con gestione preferenze',
  'privacy_policy': 'Informativa privacy conforme GDPR',
  'accessibility_audit': 'Test WCAG 2.1 AA con report violazioni',
  'accessibility_fix': 'Correzione contrast, focus, ARIA, semantica',
  'tracking_setup': 'Google Analytics 4, eventi, conversioni',
  'gtm_setup': 'Container GTM con trigger e variabili',
  'facebook_pixel': 'Pixel standard + eventi conversione',
  'update_dependencies': 'Aggiornamento framework, librerie, plugin',
}
