/**
 * Layout e metadati SEO per Tech Stack Detector
 * Tool gratuito per analizzare le tecnologie di un sito web
 */

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tech Stack Detector - Scopri le Tecnologie di un Sito Web | TrovaMi',
  description: 'Analizza gratis le tecnologie di qualsiasi sito web: CMS, framework, librerie JavaScript, CSS framework, analytics e altro. Tool gratuito e istantaneo.',
  keywords: [
    'tech stack detector',
    'analisi tecnologie sito',
    'scopri cms sito',
    'wordpress detector',
    'shopify detector',
    'react detector',
    'vue detector',
    'framework detector',
    'analytics detector',
    'wappalyzer alternative',
    'builtwith alternative',
    'strumenti seo gratuiti',
    'analisi sito web'
  ],
  openGraph: {
    title: 'Tech Stack Detector - Scopri le Tecnologie di un Sito Web',
    description: 'Analizza gratis le tecnologie di qualsiasi sito: CMS, framework, librerie, analytics e altro. Tool gratuito e istantaneo.',
    url: 'https://trovami.pro/tools/tech-detector',
    siteName: 'TrovaMi',
    locale: 'it_IT',
    type: 'website',
    images: [
      {
        url: 'https://trovami.pro/og-tech-detector.jpg',
        width: 1200,
        height: 630,
        alt: 'TrovaMi Tech Stack Detector'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tech Stack Detector - Scopri le Tecnologie di un Sito Web',
    description: 'Analizza gratis le tecnologie di qualsiasi sito web. Tool gratuito.',
    images: ['https://trovami.pro/og-tech-detector.jpg']
  },
  alternates: {
    canonical: 'https://trovami.pro/tools/tech-detector'
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

export default function TechDetectorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
