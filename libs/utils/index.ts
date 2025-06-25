// Questo file contiene funzioni di utilità condivise tra tutti i moduli
// È parte del modulo libs/utils
// Viene importato da frontend-app e scraping-engine
// ⚠️ Aggiornare se si aggiungono nuove funzioni comuni

// Import diretto dei tipi (da modificare con path corretto in base al setup)
export interface LeadAnalysis {
  has_website: boolean;
  website_load_time: number;
  missing_meta_tags: string[];
  has_tracking_pixel: boolean;
  broken_images: boolean;
  gtm_installed: boolean;
  overall_score: number;
  meta_title_missing?: boolean;
  meta_description_missing?: boolean;
  h1_missing?: boolean;
  alt_tags_missing?: boolean;
  mobile_friendly?: boolean;
  ssl_certificate?: boolean;
  page_speed_score?: number;
  facebook_pixel?: boolean;
  google_analytics?: boolean;
  google_tag_manager?: boolean;
}

export interface TechnicalAnalysis {
  url: string;
  load_time: number;
  status_code: number;
  has_ssl: boolean;
  meta_tags: {
    title?: string;
    description?: string;
    keywords?: string;
  };
  h_tags: {
    h1: string[];
    h2: string[];
  };
  images: {
    total: number;
    without_alt: number;
    broken: number;
  };
  tracking: {
    google_analytics: boolean;
    google_tag_manager: boolean;
    facebook_pixel: boolean;
  };
  performance: {
    page_size: number;
    requests_count: number;
    speed_score: number;
  };
  mobile_friendly: boolean;
}

/**
 * Calcola il punteggio finale di un lead basato sull'analisi tecnica
 * @param analysis - Dati dell'analisi tecnica del sito
 * @returns Punteggio da 0 a 100 (più basso = più bisogno di aiuto)
 */
export function calculateLeadScore(analysis: TechnicalAnalysis): number {
  let score = 100; // Inizia con punteggio perfetto

  // Sito non raggiungibile o in costruzione
  if (analysis.status_code !== 200 || !analysis.url) {
    return 10; // Punteggio molto basso
  }

  // Penalità per mancanza SSL
  if (!analysis.has_ssl) {
    score -= 10;
  }

  // Penalità SEO base
  if (!analysis.meta_tags.title) {
    score -= 15;
  }
  if (!analysis.meta_tags.description) {
    score -= 10;
  }
  if (analysis.h_tags.h1.length === 0) {
    score -= 8;
  }

  // Penalità immagini
  if (analysis.images.broken > 0) {
    score -= 10;
  }
  if (analysis.images.without_alt > analysis.images.total * 0.5) {
    score -= 8;
  }

  // Penalità tracking/analytics
  if (!analysis.tracking.google_analytics && !analysis.tracking.google_tag_manager) {
    score -= 10;
  }
  if (!analysis.tracking.facebook_pixel) {
    score -= 5;
  }

  // Penalità performance
  if (analysis.load_time > 3) {
    score -= 15;
  }
  if (analysis.performance.speed_score < 50) {
    score -= 10;
  }

  // Penalità mobile
  if (!analysis.mobile_friendly) {
    score -= 12;
  }

  // Assicura che il punteggio sia tra 0 e 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Converte l'analisi tecnica in formato LeadAnalysis per il database
 */
export function convertToLeadAnalysis(technical: TechnicalAnalysis): LeadAnalysis {
  const score = calculateLeadScore(technical);
  
  return {
    has_website: technical.status_code === 200,
    website_load_time: technical.load_time,
    missing_meta_tags: [
      ...(technical.meta_tags.title ? [] : ['title']),
      ...(technical.meta_tags.description ? [] : ['description']),
      ...(technical.h_tags.h1.length === 0 ? ['h1'] : [])
    ],
    has_tracking_pixel: technical.tracking.facebook_pixel || technical.tracking.google_analytics,
    broken_images: technical.images.broken > 0,
    gtm_installed: technical.tracking.google_tag_manager,
    overall_score: score,
    // Campi aggiuntivi
    meta_title_missing: !technical.meta_tags.title,
    meta_description_missing: !technical.meta_tags.description,
    h1_missing: technical.h_tags.h1.length === 0,
    alt_tags_missing: technical.images.without_alt > 0,
    mobile_friendly: technical.mobile_friendly,
    ssl_certificate: technical.has_ssl,
    page_speed_score: technical.performance.speed_score,
    facebook_pixel: technical.tracking.facebook_pixel,
    google_analytics: technical.tracking.google_analytics,
    google_tag_manager: technical.tracking.google_tag_manager
  };
}

/**
 * Determina la categoria di punteggio e il colore associato
 */
export function getScoreCategory(score: number): { label: string; color: string; range: string } {
  const categories = {
    CRITICAL: { min: 0, max: 20, label: 'Critico', color: '#dc2626' },
    POOR: { min: 21, max: 40, label: 'Scarso', color: '#ea580c' },
    AVERAGE: { min: 41, max: 60, label: 'Medio', color: '#ca8a04' },
    GOOD: { min: 61, max: 80, label: 'Buono', color: '#16a34a' },
    EXCELLENT: { min: 81, max: 100, label: 'Eccellente', color: '#059669' }
  };

  for (const [key, category] of Object.entries(categories)) {
    if (score >= category.min && score <= category.max) {
      return {
        label: category.label,
        color: category.color,
        range: `${category.min}-${category.max}`
      };
    }
  }

  return {
    label: categories.AVERAGE.label,
    color: categories.AVERAGE.color,
    range: `${categories.AVERAGE.min}-${categories.AVERAGE.max}`
  };
}

/**
 * Formatta un URL aggiungendo https:// se mancante
 */
export function formatUrl(url: string): string {
  if (!url) return '';
  
  // Rimuovi spazi
  url = url.trim();
  
  // Aggiungi https se non presente
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  return url;
}

/**
 * Valida se un URL è raggiungibile e ben formato
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(formatUrl(url));
    return true;
  } catch {
    return false;
  }
}

/**
 * Estrae il dominio da un URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(formatUrl(url));
    return urlObj.hostname;
  } catch {
    return url;
  }
}

/**
 * Genera un ID unico per i lead
 */
export function generateLeadId(): string {
  return crypto.randomUUID();
}

/**
 * Formatta una data in formato leggibile
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Ritarda l'esecuzione per un numero di millisecondi
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Chunka un array in pezzi più piccoli
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Rimuove caratteri speciali da una stringa per uso come filename
 */
export function sanitizeFilename(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}

/**
 * Converte byte in formato leggibile
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Verifica se una stringa contiene un indirizzo email
 */
export function extractEmail(text: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  return match ? match[0] : null;
}

/**
 * Verifica se una stringa contiene un numero di telefono
 */
export function extractPhone(text: string): string | null {
  const phoneRegex = /(?:\+39)?[\s-]?(?:\d{2,3}[\s-]?\d{6,8}|\d{10})/;
  const match = text.match(phoneRegex);
  return match ? match[0].replace(/\s+/g, ' ').trim() : null;
}
