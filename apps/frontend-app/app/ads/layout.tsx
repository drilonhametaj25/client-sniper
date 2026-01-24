// Metadati SEO ottimizzati per la landing page /ads
// Progettati per massimizzare CTR e conversioni da campagne pubblicitarie
// Include Open Graph e Twitter Cards per social sharing

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trova Clienti Già Pronti a Comprare | TrovaMi - Lead Generation',
  description: 'Scopri clienti con problemi tecnici sui loro siti web. Lead qualificati a partire da 0,33€ - 40x meno di Google Ads. 5 lead gratuiti per iniziare.',
  keywords: [
    'trova clienti',
    'lead generation',
    'clienti pronti',
    'lead qualificati',
    'alternative google ads',
    'lead economici',
    'acquisizione clienti',
    'business development',
    'marketing digitale',
    'web agency',
    'freelancer',
    'consulenza seo',
    'audit siti web',
    'opportunità business'
  ],
  openGraph: {
    title: 'Trova Clienti Già Pronti a Comprare i Tuoi Servizi',
    description: 'Lead qualificati a partire da 0,33€ - 40x meno di Google Ads. Scopri aziende con problemi tecnici sui loro siti web.',
    url: 'https://trovami.pro/ads',
    siteName: 'TrovaMi',
    locale: 'it_IT',
    type: 'website',
    images: [
      {
        url: 'https://trovami.pro/og-ads.jpg',
        width: 1200,
        height: 630,
        alt: 'TrovaMi - Trova Clienti Già Pronti a Comprare'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trova Clienti Già Pronti a Comprare | TrovaMi',
    description: 'Lead qualificati a partire da 0,33€ - 40x meno di Google Ads. 5 lead gratuiti per iniziare.',
    images: ['https://trovami.pro/og-ads.jpg']
  },
  alternates: {
    canonical: 'https://trovami.pro/ads'
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

export default function AdsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
