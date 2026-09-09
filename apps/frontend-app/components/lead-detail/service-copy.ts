/**
 * service-copy — come si chiamano, in italiano, i servizi rilevati dall'analisi.
 *
 * SERVICE_CONFIGS (lib/types/services.ts) usa etichette tecniche ("SEO", "GDPR",
 * "Development") ed emoji come icone: vanno bene per la logica, non per la
 * pagina. Qui vive SOLO la presentazione: nome del lavoro come lo direbbe un
 * freelance al cliente, una riga che spiega cosa gli vende e un'icona lucide.
 *
 * Nessuna logica: i tipi, il rilevamento e i budget restano in
 * lib/utils/service-detection.ts.
 *
 * Usato da: components/lead-detail/LeadPitch.tsx, LeadLockedPreview.tsx
 */

import {
  FileText,
  Gauge,
  LineChart,
  type LucideIcon,
  Palette,
  Search,
  Share2,
  Smartphone,
  Wrench
} from 'lucide-react'
import type { ServiceType } from '@/lib/types/services'

export interface ServiceCopy {
  /** Nome del lavoro come lo direbbe il freelance al cliente */
  label: string
  /** Lo stesso nome con l'articolo, per infilarlo dentro una frase */
  withArticle: string
  /** Una riga: cosa gli stai vendendo e perché gli serve */
  pitch: string
  Icon: LucideIcon
}

export const SERVICE_COPY: Record<ServiceType, ServiceCopy> = {
  development: {
    label: 'Rifacimento del sito',
    withArticle: 'il rifacimento del sito',
    pitch: 'Il sito va rimesso in piedi: sicurezza, pagine rotte e struttura da rifare.',
    Icon: Wrench
  },
  seo: {
    label: 'Visibilità su Google',
    withArticle: 'la visibilità su Google',
    pitch: 'Manca il minimo per farsi trovare: titoli, descrizioni e struttura delle pagine.',
    Icon: Search
  },
  gdpr: {
    label: 'Messa a norma privacy',
    withArticle: 'la messa a norma privacy',
    pitch: 'Cookie banner e privacy policy non sono a posto: è un rischio di sanzione.',
    Icon: FileText
  },
  analytics: {
    label: 'Tracciamento e statistiche',
    withArticle: 'il tracciamento delle visite',
    pitch: 'Nessuno misura le visite: non sa da dove arrivano i clienti né cosa funziona.',
    Icon: LineChart
  },
  performance: {
    label: 'Velocità del sito',
    withArticle: 'la velocità del sito',
    pitch: 'Il sito è lento: chi arriva da telefono se ne va prima di vedere la pagina.',
    Icon: Gauge
  },
  mobile: {
    label: 'Versione per telefono',
    withArticle: 'la versione per telefono',
    pitch: 'Da smartphone il sito si legge male, ed è lì che passa la maggior parte delle visite.',
    Icon: Smartphone
  },
  design: {
    label: 'Restyling grafico',
    withArticle: 'il restyling grafico',
    pitch: "L'aspetto del sito non aiuta a vendere: immagini e impaginazione da rifare.",
    Icon: Palette
  },
  social: {
    label: 'Presenza social',
    withArticle: 'la presenza social',
    pitch: 'I profili social non sono collegati al sito: si perdono contatti facili.',
    Icon: Share2
  }
}
