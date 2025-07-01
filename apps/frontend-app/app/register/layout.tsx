/**
 * Layout specifico per la pagina di registrazione
 * Include metadata SEO ottimizzati per la conversione
 * Supporta Open Graph e Twitter Cards per condivisioni social
 */

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Registrati Gratis - Trova Clienti con TrovaMi | Lead Generation',
  description: 'Registrati gratuitamente su TrovaMi e inizia a trovare clienti potenziali per la tua agenzia web. 2 lead gratuiti per iniziare, piani flessibili per crescere.',
  keywords: [
    'registrazione gratuita',
    'lead generation agenzie',
    'trova clienti online',
    'agenzia web clienti',
    'piattaforma lead',
    'clienti potenziali',
    'business development',
    'marketing digitale',
    'crescita agenzia',
    'acquisizione clienti'
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
    url: 'https://trovami.pro/register',
    title: 'Registrati Gratis su TrovaMi - Lead Generation per Agenzie',
    description: 'Piattaforma gratuita per trovare clienti potenziali. Analisi automatica siti web, identificazione opportunità business. Inizia con 2 lead gratuiti.',
    siteName: 'TrovaMi',
    images: [
      {
        url: '/og-register.jpg',
        width: 1200,
        height: 630,
        alt: 'TrovaMi - Registrazione Gratuita Lead Generation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Registrati Gratis su TrovaMi - Lead Generation',
    description: 'Trova clienti potenziali per la tua agenzia web. Registrazione gratuita con 2 lead inclusi.',
    images: ['/og-register.jpg'],
    creator: '@trovami_pro',
  },
  alternates: {
    canonical: 'https://trovami.pro/register',
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

export default function RegisterLayout({
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
            "@type": "WebPage",
            "name": "Registrazione TrovaMi",
            "description": "Registrati gratuitamente su TrovaMi per iniziare a trovare clienti potenziali per la tua agenzia web.",
            "url": "https://trovami.pro/register",
            "potentialAction": {
              "@type": "RegisterAction",
              "target": "https://trovami.pro/register",
              "description": "Registrati gratuitamente per accedere alla piattaforma"
            },
            "mainEntity": {
              "@type": "SoftwareApplication",
              "name": "TrovaMi",
              "description": "Piattaforma di lead generation per agenzie web",
              "applicationCategory": "BusinessApplication",
              "offers": [
                {
                  "@type": "Offer",
                  "name": "Piano Gratuito",
                  "price": "0",
                  "priceCurrency": "EUR",
                  "description": "2 lead gratuiti per iniziare"
                },
                {
                  "@type": "Offer",
                  "name": "Piano Starter",
                  "price": "29",
                  "priceCurrency": "EUR",
                  "description": "50 lead al mese per agenzie in crescita"
                },
                {
                  "@type": "Offer",
                  "name": "Piano Pro",
                  "price": "79",
                  "priceCurrency": "EUR",
                  "description": "200 lead al mese per agenzie consolidate"
                }
              ]
            }
          })
        }}
      />
      {children}
    </>
  )
}
