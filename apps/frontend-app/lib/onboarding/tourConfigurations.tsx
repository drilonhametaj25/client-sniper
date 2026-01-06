/**
 * Configurazioni dei tour di onboarding per tutte le sezioni dell'app
 * Definisce step, contenuti e targeting per ogni tour guidato
 * Utilizzato da: OnboardingProvider, tour hooks
 */

import { TourConfiguration, TourSection } from '@/../../libs/types/onboarding'
import React from 'react'
import { getBasePlanType, isProOrHigher, isStarterOrHigher } from '@/lib/utils/plan-helpers'

// Componente per contenuto ricco degli step
const TourStepContent: React.FC<{
  title: string
  description: string
  tips?: string[]
  highlight?: string
}> = ({ title, description, tips, highlight }) => (
  <div className="space-y-3">
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        {description}
      </p>
    </div>
    
    {highlight && (
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
          💡 {highlight}
        </p>
      </div>
    )}
    
    {tips && tips.length > 0 && (
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Suggerimenti:
        </p>
        <ul className="space-y-1">
          {tips.map((tip, index) => (
            <li key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start">
              <span className="text-green-500 mr-1">•</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
)

// Configurazione tour Dashboard
export const dashboardTourConfig: TourConfiguration = {
  id: 'dashboard-tour',
  section: 'dashboard',
  title: 'Benvenuto su TrovaMi.pro',
  description: 'Scopri come trovare e gestire i tuoi lead',
  enabled: true,
  autoTrigger: true,
  version: '1.0',
  prerequisites: {
    requiresAuth: true,
  },
  steps: [
    {
      id: 'welcome',
      section: 'dashboard',
      order: 1,
      target: 'body',
      placement: 'center',
      content: React.createElement(TourStepContent, {
        title: '🎯 Benvenuto su TrovaMi.pro!',
        description: 'Ti aiuteremo a scoprire come usare la piattaforma per trovare clienti potenziali con problemi tecnici sui loro siti web.',
        highlight: 'Questo tour ti mostrerà le funzionalità principali in meno di 2 minuti.'
      }),
      disableBeacon: true,
    },
    {
      id: 'stats-cards',
      section: 'dashboard',
      order: 2,
      target: '[data-tour="dashboard-stats"]',
      placement: 'bottom',
      content: React.createElement(TourStepContent, {
        title: '📊 Panoramica del tuo account',
        description: 'Qui vedi le statistiche del tuo account: piano attuale, crediti disponibili e lead sbloccati.',
        tips: [
          'I crediti si resettano ogni mese',
          'Ogni lead sbloccato consuma 1 credito',
          'Il piano determina quanti crediti hai'
        ]
      }),
    },
    {
      id: 'search-filters',
      section: 'dashboard',
      order: 3,
      target: '[data-tour="dashboard-search"]',
      placement: 'bottom',
      content: React.createElement(TourStepContent, {
        title: '🔍 Ricerca e filtri intelligenti',
        description: 'Usa la barra di ricerca e i filtri per trovare lead specifici per settore, città o tipo di servizio necessario.',
        tips: [
          'Prova a cercare "ristorante Milano"',
          'Usa i filtri per affinare i risultati',
          'Più specifici sono i filtri, migliori sono i lead'
        ]
      }),
    },
    {
      id: 'lead-card',
      section: 'dashboard',
      order: 4,
      target: '[data-tour="lead-card"]',
      placement: 'top',
      content: React.createElement(TourStepContent, {
        title: '📋 Le card dei lead',
        description: 'Ogni card mostra le informazioni principali di un\'azienda: nome, categoria, problemi tecnici identificati e punteggio di opportunità.',
        highlight: 'Più basso è il punteggio, più problemi ha il sito = maggiore opportunità di business!',
        tips: [
          'Punteggio 0-30: Urgente (problemi gravi)',
          'Punteggio 30-60: Alta priorità',
          'I lead verdi sono già sbloccati'
        ]
      }),
    },
    {
      id: 'unlock-button',
      section: 'dashboard',
      order: 5,
      target: '[data-tour="unlock-button"]',
      placement: 'left',
      content: React.createElement(TourStepContent, {
        title: '🔓 Sbloccare un lead',
        description: 'Clicca su "Sblocca Lead" per vedere tutti i dettagli: nome azienda, contatti, analisi completa e opportunità specifiche.',
        highlight: 'Costa 1 credito ma ottieni informazioni complete per contattare il cliente!',
        tips: [
          'Scegli lead con punteggio basso per più opportunità',
          'Una volta sbloccato, il lead rimane tuo per sempre',
          'Usa i dettagli per creare una proposta mirata'
        ]
      }),
    }
  ]
}

// Configurazione tour Lead Detail
export const leadDetailTourConfig: TourConfiguration = {
  id: 'lead-detail-tour',
  section: 'lead-detail',
  title: 'Analisi completa del lead',
  description: 'Scopri come interpretare l\'analisi tecnica',
  enabled: true,
  autoTrigger: true,
  version: '1.0',
  prerequisites: {
    requiresAuth: true,
  },
  steps: [
    {
      id: 'lead-header',
      section: 'lead-detail',
      order: 1,
      target: '#lead-header, [data-tour="lead-header"]',
      placement: 'bottom',
      content: React.createElement(TourStepContent, {
        title: '🏢 Informazioni azienda',
        description: 'Qui trovi nome, settore, località e il punteggio tecnico del sito web.',
        tips: [
          'Il punteggio indica la gravità dei problemi',
          'Più è basso, più opportunità ci sono'
        ]
      }),
    },
    {
      id: 'contact-info',
      section: 'lead-detail',
      order: 2,
      target: '#contact-info, [data-tour="contact-info"]',
      placement: 'right',
      content: React.createElement(TourStepContent, {
        title: '📞 Dati di contatto',
        description: 'Telefono, email, sito web e indirizzo completo per contattare direttamente l\'azienda.',
        highlight: 'Usa questi dati per creare una proposta commerciale mirata!',
        tips: [
          'Chiama negli orari di ufficio',
          'Menziona i problemi specifici trovati',
          'Proponi soluzioni concrete'
        ]
      }),
    },
    {
      id: 'technical-analysis',
      section: 'lead-detail',
      order: 3,
      target: '#technical-analysis, [data-tour="technical-analysis"]',
      placement: 'left',
      content: React.createElement(TourStepContent, {
        title: '🔧 Analisi tecnica dettagliata',
        description: 'Problemi SEO, performance, tracking, GDPR e altri aspetti tecnici del sito web identificati automaticamente.',
        highlight: 'Questi sono i problemi specifici che puoi risolvere per il cliente!',
        tips: [
          'Ogni problema è un\'opportunità di vendita',
          'Spiega i problemi in termini business',
          'Proponi soluzioni concrete e prezzi'
        ]
      }),
    },
    {
      id: 'recommendations',
      section: 'lead-detail',
      order: 4,
      target: '.recommendations, h3:has-text("Raccomandazioni")',
      placement: 'bottom',
      content: React.createElement(TourStepContent, {
        title: '💡 Raccomandazioni per il cliente',
        description: 'Suggerimenti pratici che puoi condividere con il cliente per dimostrare il valore dei tuoi servizi.',
        tips: [
          'Usa queste raccomandazioni nella tua proposta',
          'Spiega l\'impatto business di ogni problema',
          'Offri un preventivo per ogni intervento'
        ]
      }),
    }
  ]
}

// Configurazione tour CRM
export const crmTourConfig: TourConfiguration = {
  id: 'crm-tour',
  section: 'crm',
  title: 'Il tuo CRM personale',
  description: 'Gestisci i lead sbloccati e le trattative',
  enabled: true,
  autoTrigger: true,
  version: '1.0',
  prerequisites: {
    requiresAuth: true,
    minPlan: 'pro',
  },
  steps: [
    {
      id: 'crm-overview',
      section: 'crm',
      order: 1,
      target: '#crm-header, h1',
      placement: 'bottom',
      content: React.createElement(TourStepContent, {
        title: '📊 CRM Personale - Solo per PRO',
        description: 'Gestisci tutti i tuoi lead sbloccati, tieni traccia delle conversazioni e organizza i follow-up.',
        highlight: 'Il CRM ti aiuta a convertire i lead in clienti paganti!',
      }),
    },
    {
      id: 'crm-stats',
      section: 'crm',
      order: 2,
      target: '#crm-stats, [data-tour="crm-stats"]',
      placement: 'bottom',
      content: React.createElement(TourStepContent, {
        title: '📈 Statistiche delle trattative',
        description: 'Monitora i tuoi lead: quanti sono da contattare, in negoziazione, chiusi positivamente o negativamente.',
        tips: [
          'Mantieni aggiornati gli stati',
          'Programma i follow-up',
          'Analizza il tuo tasso di conversione'
        ]
      }),
    },
    {
      id: 'crm-entries',
      section: 'crm',
      order: 3,
      target: '#crm-entries, [data-tour="crm-entries"]',
      placement: 'right',
      content: React.createElement(TourStepContent, {
        title: '📝 Gestione lead CRM',
        description: 'Ogni lead ha il suo stato, note private e date di follow-up. Clicca su "Dettaglio" per vedere tutto.',
        tips: [
          'Aggiungi note dopo ogni chiamata',
          'Imposta reminder per i follow-up',
          'Cambia stato in base al progresso'
        ]
      }),
    }
  ]
}

// Configurazione tour Manual Scan
export const manualScanTourConfig: TourConfiguration = {
  id: 'manual-scan-tour',
  section: 'manual-scan',
  title: 'Analisi manuale di siti web',
  description: 'Analizza qualsiasi sito web in tempo reale',
  enabled: true,
  autoTrigger: true,
  version: '1.0',
  prerequisites: {
    requiresAuth: true,
  },
  steps: [
    {
      id: 'manual-scan-intro',
      section: 'manual-scan',
      order: 1,
      target: '#manual-scan-header, h1',
      placement: 'bottom',
      content: React.createElement(TourStepContent, {
        title: '🔍 Analisi manuale in tempo reale',
        description: 'Inserisci qualsiasi URL per ottenere un\'analisi tecnica completa in pochi secondi.',
        highlight: 'Perfetto per analizzare siti di prospect o clienti esistenti!',
      }),
    },
    {
      id: 'url-input',
      section: 'manual-scan',
      order: 2,
      target: '#manual-scan-input, [data-tour="manual-scan-input"]',
      placement: 'bottom',
      content: React.createElement(TourStepContent, {
        title: '🌐 Inserisci l\'URL da analizzare',
        description: 'Scrivi l\'URL completo del sito web che vuoi analizzare (es: https://example.com).',
        tips: [
          'Usa URL completi con https://',
          'Funziona con qualsiasi sito pubblico',
          'L\'analisi richiede alcuni secondi'
        ]
      }),
    },
    {
      id: 'scan-button',
      section: 'manual-scan',
      order: 3,
      target: '#manual-scan-button, [data-tour="manual-scan-button"]',
      placement: 'right',
      content: React.createElement(TourStepContent, {
        title: '⚡ Avvia l\'analisi',
        description: 'Clicca per iniziare l\'analisi. Il sistema controllerà SEO, performance, GDPR, tracking e molto altro.',
        highlight: 'Ogni analisi costa 1 credito ma genera un lead completo nel tuo database!',
        tips: [
          'Il sito viene salvato come lead "manuale"',
          'Altri utenti possono vederlo dopo di te',
          'Usa per prospect personalizzati'
        ]
      }),
    },
    {
      id: 'scan-results',
      section: 'manual-scan',
      order: 4,
      target: '#manual-scan-results, [data-tour="manual-scan-results"]',
      placement: 'left',
      content: React.createElement(TourStepContent, {
        title: '📊 Risultati dell\'analisi',
        description: 'Qui vedrai tutti i dettagli dell\'analisi: punteggio, problemi tecnici, raccomandazioni e opportunità di business.',
        tips: [
          'Salva i risultati per le tue proposte',
          'Condividi l\'analisi con il cliente',
          'Usa i dati per calcolare i preventivi'
        ]
      }),
    }
  ]
}

// Configurazione tour Admin (solo per admin)
export const adminTourConfig: TourConfiguration = {
  id: 'admin-tour',
  section: 'admin',
  title: 'Pannello amministratore',
  description: 'Gestisci utenti, lead e sistema',
  enabled: true,
  autoTrigger: false, // Non automatico per admin
  version: '1.0',
  prerequisites: {
    requiresAuth: true,
    customCondition: () => {
      // Controllo ruolo admin sarà fatto nel provider
      return true
    }
  },
  steps: [
    {
      id: 'admin-overview',
      section: 'admin',
      order: 1,
      target: 'h1:has-text("Admin")',
      placement: 'bottom',
      content: React.createElement(TourStepContent, {
        title: '⚙️ Pannello amministratore',
        description: 'Da qui puoi gestire tutto il sistema: utenti, lead, statistiche e configurazioni.',
        highlight: 'Usa con cautela - hai accesso a tutti i dati!'
      }),
    },
    {
      id: 'admin-stats',
      section: 'admin',
      order: 2,
      target: '.admin-stats, .stats-grid',
      placement: 'bottom',
      content: React.createElement(TourStepContent, {
        title: '📊 Statistiche di sistema',
        description: 'Monitora: totale lead, utenti attivi, punteggio medio e crescita giornaliera.',
        tips: [
          'Controlla regolarmente i trend',
          'Esporta dati per analisi',
          'Monitora qualità dei lead'
        ]
      }),
    }
  ]
}

// Export di tutte le configurazioni
export const tourConfigurations: Record<TourSection, TourConfiguration> = {
  'dashboard': dashboardTourConfig,
  'filters': dashboardTourConfig, // Usa stesso config del dashboard
  'lead-card': dashboardTourConfig, // Usa stesso config del dashboard
  'lead-detail': leadDetailTourConfig,
  'crm': crmTourConfig,
  'manual-scan': manualScanTourConfig,
  'admin': adminTourConfig,
}

// Funzione helper per ottenere configurazione tour
export const getTourConfig = (section: TourSection): TourConfiguration | null => {
  return tourConfigurations[section] || null
}

// Funzione per verificare se un tour è disponibile per l'utente
export const isTourAvailable = (
  config: TourConfiguration, 
  user: { plan?: string; role?: string } | null
): boolean => {
  if (!config.enabled) return false
  if (!config.prerequisites) return true
  
  const { minPlan, requiresAuth, customCondition } = config.prerequisites
  
  if (requiresAuth && !user) return false
  if (minPlan && user) {
    if (minPlan === 'pro' && !isProOrHigher(user.plan || '')) return false
    if (minPlan === 'starter' && !isStarterOrHigher(user.plan || '')) return false
  }
  
  if (customCondition && !customCondition()) return false
  
  return true
}
