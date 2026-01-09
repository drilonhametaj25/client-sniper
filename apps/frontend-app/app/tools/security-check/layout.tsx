/**
 * Layout e metadati SEO per Security Quick Check
 * Tool gratuito per analisi sicurezza di base
 */

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Security Check Gratuito - Analizza la Sicurezza del Tuo Sito | TrovaMi',
  description: 'Verifica gratis la sicurezza del tuo sito: HTTPS, header di sicurezza, CSP, HSTS e altro. Ottieni un voto da A a F con raccomandazioni dettagliate.',
  keywords: [
    'security check',
    'security headers',
    'ssl checker',
    'https checker',
    'csp checker',
    'hsts checker',
    'website security',
    'sicurezza sito web',
    'analisi sicurezza',
    'security audit online',
    'strumenti sicurezza gratuiti'
  ],
  openGraph: {
    title: 'Security Check Gratuito - Analizza la Sicurezza del Tuo Sito',
    description: 'Verifica gratis la sicurezza del tuo sito: HTTPS, header di sicurezza, CSP e altro. Ottieni un voto da A a F.',
    url: 'https://trovami.pro/tools/security-check',
    siteName: 'TrovaMi',
    locale: 'it_IT',
    type: 'website',
    images: [
      {
        url: 'https://trovami.pro/og-security-check.jpg',
        width: 1200,
        height: 630,
        alt: 'TrovaMi Security Check'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Security Check Gratuito - Analizza la Sicurezza del Tuo Sito',
    description: 'Verifica gratis la sicurezza del tuo sito. Voto da A a F.',
    images: ['https://trovami.pro/og-security-check.jpg']
  },
  alternates: {
    canonical: 'https://trovami.pro/tools/security-check'
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

export default function SecurityCheckLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
