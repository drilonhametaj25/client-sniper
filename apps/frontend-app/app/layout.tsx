// UI restyling stile Apple + Linear
// Layout principale aggiornato con design system moderno
// Include navbar globale e design tokens per consistenza

import { Inter } from 'next/font/google'
import './globals.css'
import { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ToastProvider'
import Navbar from '@/components/Navbar'
import CookieConsent from '@/components/CookieConsent'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'TrovaMi - Trova Lead Qualificati per la Tua Agenzia | Lead Generation Automatica',
    template: '%s | TrovaMi'
  },
  description: 'Trova clienti potenziali analizzando siti web con problemi tecnici. Lead generation automatica per agenzie web, freelancer e consulenti SEO. 2 lead gratuiti per iniziare.',
  keywords: [
    'lead generation',
    'trova clienti',
    'lead qualificati', 
    'agenzia web',
    'freelancer',
    'seo audit',
    'web analysis',
    'clienti potenziali',
    'marketing digitale',
    'prospecting automatico',
    'business development',
    'audit siti web',
    'acquisizione clienti',
    'analisi tecnica siti',
    'consulenza digitale'
  ],
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg'
  },
  authors: [{ name: 'TrovaMi Team' }],
  creator: 'TrovaMi',
  publisher: 'TrovaMi',
  category: 'Business Tools',
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  openGraph: {
    title: 'TrovaMi - Trova Lead Qualificati per la Tua Agenzia',
    description: 'Identifica automaticamente aziende con siti web che necessitano di miglioramenti tecnici. Lead generation intelligente per agenzie e freelancer.',
    type: 'website',
    locale: 'it_IT',
    url: 'https://trovami.pro',
    siteName: 'TrovaMi',
    images: [
      {
        url: 'https://trovami.pro/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'TrovaMi - Lead Generation Automatica'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TrovaMi - Trova Lead Qualificati per la Tua Agenzia',
    description: 'Lead generation automatica per agenzie web e freelancer. Analisi tecnica siti web e clienti qualificati.',
    creator: '@trovamipro',
    images: ['https://trovami.pro/twitter-image.jpg']
  },
  alternates: {
    canonical: 'https://trovami.pro'
  },
  verification: {
    google: 'your-google-verification-code' // Da aggiornare dopo setup Search Console
  },
  other: {
    'google-site-verification': 'your-google-verification-code'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it" className="h-full">
      <head>
        {/* Google Analytics 4 */}
        {process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID}', {
                    page_title: document.title,
                    page_location: window.location.href,
                    send_page_view: true
                  });
                `,
              }}
            />
          </>
        )}
        
        {/* Preconnect per performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        
        {/* DNS prefetch per risorse esterne */}
        <link rel="dns-prefetch" href="https://api.klaviyo.com" />
        <link rel="dns-prefetch" href="https://js.stripe.com" />
      </head>
      <body className={`${inter.className} h-full bg-gray-50`}>
        <ToastProvider>
          <AuthProvider>
            <div id="root" className="min-h-full">
              <Navbar />
              <main className="min-h-screen">
                {children}
              </main>
              <CookieConsent />
            </div>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
