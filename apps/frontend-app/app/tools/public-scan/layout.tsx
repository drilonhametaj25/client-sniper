/**
 * Layout specifico per la pagina di analisi pubblica
 * Include metadata SEO ottimizzati per la funzionalità freemium
 * Supporta Open Graph e Twitter Cards per condivisioni social
 */

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Analisi Gratuita Sito Web - Trova Problemi Tecnici | TrovaMi',
  description: 'Analizza gratuitamente il tuo sito web e scopri problemi tecnici, SEO e performance. Tool gratuito per verificare velocità, meta tag, tracking e molto altro.',
  keywords: [
    'analisi sito web gratuita',
    'test velocità sito',
    'analisi SEO gratis',
    'problemi sito web',
    'performance website',
    'test responsive',
    'meta tag analyzer',
    'website audit tool',
    'speed test gratuito',
    'analisi tecnica sito'
  ],
  authors: [{ name: 'TrovaMi Team' }],
  creator: 'TrovaMi',
  publisher: 'TrovaMi',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    url: 'https://trovami.pro/tools/public-scan',
    title: 'Analisi Gratuita Sito Web - Trova Problemi Tecnici',
    description: 'Strumento gratuito per analizzare il tuo sito web. Scopri problemi di performance, SEO e ottimizzazione. 2 analisi gratuite al giorno.',
    siteName: 'TrovaMi',
    images: [
      {
        url: '/og-public-scan.jpg',
        width: 1200,
        height: 630,
        alt: 'TrovaMi - Analisi Gratuita Sito Web',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Analisi Gratuita Sito Web - TrovaMi',
    description: 'Analizza gratuitamente il tuo sito web e scopri problemi di performance e SEO. Tool gratuito con 2 analisi al giorno.',
    images: ['/og-public-scan.jpg'],
    creator: '@trovami_pro',
  },
  alternates: {
    canonical: 'https://trovami.pro/tools/public-scan',
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

export default function PublicScanLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Schema Markup per SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Analisi Gratuita Sito Web",
            "description": "Strumento gratuito per analizzare siti web e identificare problemi tecnici, SEO e di performance.",
            "url": "https://trovami.pro/tools/public-scan",
            "applicationCategory": "UtilitiesApplication",
            "operatingSystem": "Web",
            "featureList": [
              "Analisi velocità sito",
              "Controllo SEO base",
              "Test responsive design",
              "Verifica meta tag",
              "Analisi performance",
              "Controllo tracking pixel"
            ],
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "EUR",
              "description": "2 analisi gratuite al giorno"
            },
            "creator": {
              "@type": "Organization",
              "name": "TrovaMi",
              "url": "https://trovami.pro"
            },
            "potentialAction": {
              "@type": "UseAction",
              "target": "https://trovami.pro/tools/public-scan",
              "description": "Analizza il tuo sito web gratuitamente"
            }
          })
        }}
      />
      {children}
    </>
  )
}
