/**
 * Componente LeadInsights - Sistema di insights e suggerimenti personalizzati per lead
 * 
 * Analizza l'analisi tecnica del lead e genera suggerimenti personalizzati basati su:
 * - SEO score, performance, compliance GDPR, SSL, analytics
 * - Mostra suggerimenti diversi in base al piano utente (free/starter/pro)
 * - Include stime di valore per i piani PRO
 * 
 * Usato in: /apps/frontend-app/app/dashboard/page.tsx (dashboard utenti normali)
 * Chiamato da: componenti dashboard con vista card
 */

'use client';

import { AlertTriangle, TrendingUp, Euro, Clock } from 'lucide-react'
import { isStarterOrHigher, getBasePlanType, isProOrHigher } from '@/lib/utils/plan-helpers'
import Card from '@/components/ui/Card'

interface InsightSuggestion {
  id: string;
  title: string;
  description: string;
  estimatedValue: { min: number; max: number };
  priority: 1 | 2 | 3; // 1 = alta, 2 = media, 3 = bassa
}

interface LeadInsightsProps {
  lead: {
    id: string;
    business_name?: string;
    category?: string;
    analysis?: {
      seo_score?: number;
      performance?: {
        load_time?: number;
      };
      compliance?: {
        has_privacy_policy?: boolean;
        has_cookie_policy?: boolean;
      };
      security?: {
        has_ssl?: boolean;
      };
      social?: {
        has_facebook_pixel?: boolean;
        has_google_analytics?: boolean;
      };
      mobile?: {
        is_mobile_friendly?: boolean;
      };
      local_seo?: {
        has_local_schema?: boolean;
        has_google_my_business?: boolean;
      };
      content?: {
        missing_h1?: boolean;
        missing_meta_description?: boolean;
        missing_meta_keywords?: boolean;
      };
      tracking?: {
        has_google_analytics?: boolean;
        has_facebook_pixel?: boolean;
        has_gtm?: boolean;
      };
      technical?: {
        broken_images?: boolean;
        missing_meta_description?: boolean;
      };
    };
  };
  userPlan: string;
}

export default function LeadInsights({ lead, userPlan }: LeadInsightsProps) {
  // Piano free non mostra suggerimenti
  if (!isStarterOrHigher(userPlan)) {
    return null;
  }

  const generateSuggestions = (): InsightSuggestion[] => {
    const suggestions: InsightSuggestion[] = [];
    const analysis = lead.analysis;

    if (!analysis) return suggestions;

    // SEO Critico (score < 30)
    if (analysis.seo_score && analysis.seo_score < 30) {
      suggestions.push({
        id: 'seo_critical',
        title: 'Opportunità SEO Critica',
        description: 'Il sito ha un punteggio SEO molto basso. Ottimizzazione meta tag, struttura URL e content strategy potrebbero portare significativi aumenti di traffico organico.',
        estimatedValue: { min: 2000, max: 5000 },
        priority: 1
      });
    }

    // Performance Critiche (load time > 5 secondi)
    if (analysis.performance?.load_time && analysis.performance.load_time > 5) {
      suggestions.push({
        id: 'performance_critical',
        title: 'Performance Critiche',
        description: 'Il sito carica troppo lentamente. Ottimizzazione immagini, cache e hosting potrebbero migliorare drasticamente l\'esperienza utente e le conversioni.',
        estimatedValue: { min: 1500, max: 3000 },
        priority: 1
      });
    }

    // Compliance GDPR
    if (analysis.compliance?.has_privacy_policy === false) {
      suggestions.push({
        id: 'gdpr_compliance',
        title: 'Non Conforme GDPR',
        description: 'Manca la privacy policy e potrebbero mancare altri elementi di conformità. Implementazione completa GDPR per evitare sanzioni.',
        estimatedValue: { min: 800, max: 1500 },
        priority: 1
      });
    }

    // SSL Mancante
    if (analysis.security?.has_ssl === false) {
      suggestions.push({
        id: 'ssl_missing',
        title: 'Certificato SSL Mancante',
        description: 'Il sito non è sicuro (HTTP). Installazione certificato SSL essenziale per sicurezza, SEO e fiducia dei clienti.',
        estimatedValue: { min: 500, max: 1000 },
        priority: 1
      });
    }

    // Analytics Non Configurato
    if (analysis.tracking?.has_google_analytics === false) {
      suggestions.push({
        id: 'analytics_missing',
        title: 'Analytics Non Configurato',
        description: 'Senza Google Analytics non può misurare traffico e conversioni. Setup completo analytics e tag manager per data-driven marketing.',
        estimatedValue: { min: 300, max: 800 },
        priority: 2
      });
    }

    // Facebook Pixel Mancante
    if (analysis.tracking?.has_facebook_pixel === false) {
      suggestions.push({
        id: 'facebook_pixel_missing',
        title: 'Pixel Facebook Assente',
        description: 'Senza pixel Facebook non può fare retargeting efficace. Implementazione pixel per campagne pubblicitarie ottimizzate.',
        estimatedValue: { min: 400, max: 900 },
        priority: 2
      });
    }

    // Immagini Rotte
    if (analysis.technical?.broken_images === true) {
      suggestions.push({
        id: 'broken_images',
        title: 'Immagini Danneggiate',
        description: 'Presenza di immagini rotte che danneggiano l\'esperienza utente e SEO. Fix tecnico e ottimizzazione immagini.',
        estimatedValue: { min: 200, max: 600 },
        priority: 2
      });
    }

    // Meta Description Mancante
    if (analysis.technical?.missing_meta_description === true) {
      suggestions.push({
        id: 'meta_description_missing',
        title: 'Meta Description Mancanti',
        description: 'Le meta description influenzano il click-through rate nei risultati di ricerca. Ottimizzazione per ogni pagina importante.',
        estimatedValue: { min: 300, max: 700 },
        priority: 3
      });
    }

    // Google Tag Manager Mancante
    if (analysis.tracking?.has_gtm === false && analysis.tracking?.has_google_analytics === true) {
      suggestions.push({
        id: 'gtm_missing',
        title: 'Google Tag Manager Consigliato',
        description: 'Per gestire meglio tutti i tag di tracking. GTM semplifica l\'implementazione e la gestione di analytics avanzati.',
        estimatedValue: { min: 250, max: 500 },
        priority: 3
      });
    }

    // Ordina per priorità e restituisci
    return suggestions.sort((a, b) => a.priority - b.priority);
  };

  const suggestions = generateSuggestions();

  if (suggestions.length === 0) {
    return null;
  }

  // Limita suggerimenti in base al piano
  const maxSuggestions = getBasePlanType(userPlan) === 'starter' ? 1 : 3;
  const displaySuggestions = suggestions.slice(0, maxSuggestions);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className="mt-3 border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/20" variant="glass" padding="md">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
          <span className="text-base">💡</span>
          Opportunità Identificate
        </div>

        {/* Suggestions */}
        <div className="space-y-3">
          {displaySuggestions.map((suggestion) => (
            <div key={suggestion.id} className="border-l-2 border-l-blue-200 dark:border-l-blue-600 pl-3 py-2">
              <div className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                {suggestion.title}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 leading-relaxed">
                {suggestion.description}
              </div>
              {isProOrHigher(userPlan) && (
                <div className="text-xs font-medium text-green-600 dark:text-green-400">
                  Valore stimato: {formatCurrency(suggestion.estimatedValue.min)} - {formatCurrency(suggestion.estimatedValue.max)}
                </div>
              )}
            </div>
          ))}
          
          {getBasePlanType(userPlan) === 'starter' && suggestions.length > 1 && (
            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium pt-2 border-t border-blue-200 dark:border-blue-600">
              +{suggestions.length - 1} {suggestions.length === 2 ? 'opportunità aggiuntiva' : 'opportunità aggiuntive'} con piano PRO
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
