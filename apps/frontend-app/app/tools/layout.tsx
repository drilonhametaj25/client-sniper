/**
 * Layout per la sezione Tools di TrovaMi
 * Usato per: SEO metadata per le pagine dei tool
 */

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Strumenti Gratuiti di Analisi Web | TrovaMi',
  description: 'Analizza qualsiasi sito web gratuitamente: SEO checker, security audit, tech detector, accessibility check. Scopri problemi e opportunità in pochi secondi.',
  keywords: ['analisi sito web', 'seo checker', 'security audit', 'tech detector', 'accessibility check', 'strumenti gratuiti'],
  openGraph: {
    title: 'Strumenti Gratuiti di Analisi Web | TrovaMi',
    description: 'Analizza qualsiasi sito web gratuitamente: SEO, sicurezza, tecnologie e accessibilità.',
    type: 'website',
  }
}

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
