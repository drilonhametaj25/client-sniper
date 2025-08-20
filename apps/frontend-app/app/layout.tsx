// UI restyling stile Apple + Linear
// Layout principale aggiornato con design system moderno
// Include navbar globale e design tokens per consistenza

import { Inter } from 'next/font/google'
import './globals.css'
import { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { OnboardingProvider } from '@/contexts/OnboardingContext'
import { ToastProvider } from '@/components/ToastProvider'
import Navbar from '@/components/Navbar'
import CookieConsent from '@/components/CookieConsent'
import FeedbackWidget from '@/components/FeedbackWidget'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://trovami.it'),
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
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-VE3PVKHR35"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-VE3PVKHR35');
            `,
          }}
        />

        {/* Meta Pixel Code */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '1073364924333598');
              fbq('track', 'PageView');
            `,
          }}
        />
        <noscript>
          <img 
            height="1" 
            width="1" 
            style={{display: 'none'}}
            src="https://www.facebook.com/tr?id=1073364924333598&ev=PageView&noscript=1"
          />
        </noscript>
        
        {/* Preconnect per performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        
        {/* DNS prefetch per risorse esterne */}
        <link rel="dns-prefetch" href="https://api.klaviyo.com" />
        <link rel="dns-prefetch" href="https://js.stripe.com" />
        
        {/* Meta tag per tema mobile */}
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className={`${inter.className} h-full bg-gray-50 dark:bg-gray-900 transition-colors duration-300`}>
        <ToastProvider>
          <AuthProvider>
            <ThemeProvider>
              <OnboardingProvider>
                <div id="root" className="min-h-full">
                  <Navbar />
                  <main className="min-h-screen">
                    {children}
                  </main>
                  <CookieConsent />
                  <FeedbackWidget />
                </div>
              </OnboardingProvider>
            </ThemeProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
