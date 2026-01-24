/**
 * Layout e metadati SEO per SEO Quick Checker
 * Tool gratuito per analisi SEO di base
 */

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SEO Checker Gratuito - Analizza il SEO del Tuo Sito | TrovaMi',
  description: 'Analizza gratis gli elementi SEO fondamentali del tuo sito: title, meta description, heading, Open Graph, alt text e altro. Ottieni un punteggio istantaneo.',
  keywords: [
    'seo checker',
    'seo analyzer',
    'analisi seo gratuita',
    'controllo seo',
    'meta tag checker',
    'title tag analyzer',
    'heading checker',
    'open graph checker',
    'strumenti seo gratuiti',
    'audit seo online',
    'verifica seo sito'
  ],
  openGraph: {
    title: 'SEO Checker Gratuito - Analizza il SEO del Tuo Sito',
    description: 'Analizza gratis gli elementi SEO del tuo sito: title, meta description, heading e altro. Ottieni un punteggio istantaneo.',
    url: 'https://trovami.pro/tools/seo-checker',
    siteName: 'TrovaMi',
    locale: 'it_IT',
    type: 'website',
    images: [
      {
        url: 'https://trovami.pro/og-seo-checker.jpg',
        width: 1200,
        height: 630,
        alt: 'TrovaMi SEO Checker'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SEO Checker Gratuito - Analizza il SEO del Tuo Sito',
    description: 'Analizza gratis gli elementi SEO fondamentali del tuo sito. Tool gratuito.',
    images: ['https://trovami.pro/og-seo-checker.jpg']
  },
  alternates: {
    canonical: 'https://trovami.pro/tools/seo-checker'
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

export default function SEOCheckerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
