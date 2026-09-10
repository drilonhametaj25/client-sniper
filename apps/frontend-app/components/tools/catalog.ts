/**
 * Catalogo dei tool pubblici — unica fonte di verità su nome, frase e icona.
 *
 * Percorso: apps/frontend-app/components/tools/catalog.ts
 * Guida: apps/frontend-app/DESIGN.md
 *
 * Usato da: app/tools/page.tsx (l'indice) e ToolsCrossLinks (i rimandi in
 * fondo a ogni pagina di tool). Se nasce un tool nuovo si aggiunge QUI e
 * compare da solo nell'indice e nei rimandi.
 *
 * Nota: la voce "Tools" della Navbar tiene ancora la sua lista, perché lì le
 * etichette e i permessi non vanno toccati.
 */

import {
  Accessibility,
  Code,
  Globe,
  Search,
  Shield,
  Target,
  type LucideIcon,
} from 'lucide-react'

export type ToolSlug =
  | 'public-scan'
  | 'seo-checker'
  | 'tech-detector'
  | 'security-check'
  | 'accessibility-check'
  | 'manual-scan'

export interface ToolEntry {
  slug: ToolSlug
  href: string
  /** Nome del tool, come compare in tutta l'app */
  name: string
  /** Una frase: cosa fa e a chi serve. Niente gergo. */
  tagline: string
  /** Cosa controlla, in una riga. Va reso come testo piccolo, non come badge. */
  analyzes: string
  icon: LucideIcon
  /** true = serve un account (non compare nei rimandi fra tool pubblici) */
  requiresAuth?: boolean
  /** Unico badge ammesso: dice una cosa vera, non decora */
  badge?: string
}

export const TOOLS: ToolEntry[] = [
  {
    slug: 'public-scan',
    href: '/tools/public-scan',
    name: 'Analisi completa',
    tagline:
      'Un quadro generale del sito: punteggio, problemi tecnici principali e cosa si può proporre a chi lo gestisce.',
    analyzes:
      'Controlla titolo e descrizione, velocità di caricamento, certificato HTTPS, pixel di tracciamento e link ai social.',
    icon: Globe,
  },
  {
    slug: 'seo-checker',
    href: '/tools/seo-checker',
    name: 'SEO Checker',
    tagline:
      'Verifica se il sito ha in ordine gli elementi che Google legge per capire di cosa parla una pagina.',
    analyzes:
      'Controlla titolo, meta description, struttura dei titoli, testo alternativo delle immagini, link interni e anteprima social.',
    icon: Search,
  },
  {
    slug: 'tech-detector',
    href: '/tools/tech-detector',
    name: 'Tech Detector',
    tagline:
      'Scopre con cosa è costruito un sito: utile per capire in anticipo su cosa dovrai mettere le mani.',
    analyzes:
      'Rileva CMS, framework, librerie JavaScript, framework CSS, analytics, CDN e server.',
    icon: Code,
  },
  {
    slug: 'security-check',
    href: '/tools/security-check',
    name: 'Security Check',
    tagline:
      'Controlla come il sito protegge chi lo visita, a partire dal certificato e dalle intestazioni del server.',
    analyzes:
      'Controlla HTTPS e HSTS, Content Security Policy, protezione da clickjacking, informazioni esposte dal server e cookie.',
    icon: Shield,
  },
  {
    slug: 'accessibility-check',
    href: '/tools/accessibility-check',
    name: 'Accessibility Audit',
    tagline:
      'Verifica se il sito è usabile anche da chi naviga con la tastiera o con uno screen reader, come chiedono le WCAG 2.1.',
    analyzes:
      'Controlla contrasto dei colori, etichette dei campi, testo alternativo, struttura dei titoli, landmark ARIA e navigazione da tastiera.',
    icon: Accessibility,
  },
  {
    slug: 'manual-scan',
    href: '/tools/manual-scan',
    name: 'Analisi avanzata',
    tagline:
      'La stessa analisi che gira sui lead, lanciata da te su un sito a scelta e conservata nel tuo account.',
    analyzes:
      'Esegue tutti i controlli tecnici del motore di analisi e salva il risultato. Costa 1 credito.',
    icon: Target,
    requiresAuth: true,
    badge: 'Login richiesto',
  },
]

/** Il tool con questo slug, se esiste. */
export function getTool(slug: ToolSlug): ToolEntry | undefined {
  return TOOLS.find((tool) => tool.slug === slug)
}

/** I soli tool utilizzabili senza account. */
export function publicTools(): ToolEntry[] {
  return TOOLS.filter((tool) => !tool.requiresAuth)
}
