/**
 * Layout e metadati SEO per Accessibility Quick Audit
 * Tool gratuito per analisi accessibilità WCAG
 */

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Accessibility Audit Gratuito - Verifica WCAG del Tuo Sito | TrovaMi',
  description: 'Verifica gratis l\'accessibilità del tuo sito secondo WCAG 2.1. Analizza alt text, heading, ARIA, navigazione da tastiera e altro. Punteggio da A a F.',
  keywords: [
    'accessibility checker',
    'wcag checker',
    'accessibilità sito web',
    'audit accessibilità',
    'wcag 2.1',
    'screen reader',
    'a11y test',
    'verifica accessibilità',
    'conformità wcag',
    'legge stanca',
    'european accessibility act'
  ],
  openGraph: {
    title: 'Accessibility Audit Gratuito - Verifica WCAG del Tuo Sito',
    description: 'Verifica gratis l\'accessibilità del tuo sito secondo WCAG 2.1. Punteggio da A a F con raccomandazioni.',
    url: 'https://trovami.pro/tools/accessibility-check',
    siteName: 'TrovaMi',
    locale: 'it_IT',
    type: 'website',
    images: [
      {
        url: 'https://trovami.pro/og-accessibility-check.jpg',
        width: 1200,
        height: 630,
        alt: 'TrovaMi Accessibility Audit'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Accessibility Audit Gratuito - Verifica WCAG del Tuo Sito',
    description: 'Verifica gratis l\'accessibilità del tuo sito. Punteggio da A a F.',
    images: ['https://trovami.pro/og-accessibility-check.jpg']
  },
  alternates: {
    canonical: 'https://trovami.pro/tools/accessibility-check'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1
    }
  }
}

export default function AccessibilityCheckLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
