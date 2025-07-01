/**
 * Layout per la pagina di login
 * Gestisce metadata SEO, Open Graph, Twitter Card e struttura semantica
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Accedi a TrovaMi | Login - Trova Clienti per la Tua Agenzia Web',
  description: 'Accedi al tuo account TrovaMi per trovare lead qualificati analizzando siti web con problemi tecnici. Perfetto per agenzie web e professionisti digitali.',
  keywords: [
    'login TrovaMi',
    'accesso piattaforma',
    'lead generation',
    'agenzie web',
    'clienti potenziali',
    'analisi siti web',
    'marketing digitale',
    'web agency Italia'
  ],
  authors: [{ name: 'Drilon Hametaj' }],
  creator: 'Drilon Hametaj',
  publisher: 'TrovaMi',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://trovami.vercel.app'),
  alternates: {
    canonical: '/login',
  },
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    url: 'https://trovami.vercel.app/login',
    title: 'Accedi a TrovaMi | Login per Agenzie Web',
    description: 'Accedi al tuo account TrovaMi per trovare lead qualificati analizzando siti web con problemi tecnici. Dashboard completa per agenzie web.',
    siteName: 'TrovaMi',
    images: [
      {
        url: '/og-login.png',
        width: 1200,
        height: 630,
        alt: 'TrovaMi Login - Piattaforma Lead Generation per Agenzie Web',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Accedi a TrovaMi | Login per Agenzie Web',
    description: 'Accedi al tuo account TrovaMi per trovare lead qualificati analizzando siti web con problemi tecnici.',
    images: ['/og-login.png'],
    creator: '@drilonhametaj',
  },
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
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Login TrovaMi',
            description: 'Accedi al tuo account TrovaMi per trovare lead qualificati analizzando siti web con problemi tecnici.',
            url: 'https://trovami.vercel.app/login',
            isPartOf: {
              '@type': 'WebSite',
              name: 'TrovaMi',
              url: 'https://trovami.vercel.app',
            },
            mainEntity: {
              '@type': 'SoftwareApplication',
              name: 'TrovaMi',
              applicationCategory: 'BusinessApplication',
              description: 'Piattaforma per trovare clienti potenziali analizzando siti web con problemi tecnici',
              operatingSystem: 'Web Browser',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'EUR',
                description: 'Piano gratuito disponibile',
              },
            },
          }),
        }}
      />
      {children}
    </>
  )
}
