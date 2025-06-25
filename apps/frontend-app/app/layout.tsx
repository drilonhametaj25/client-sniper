// UI restyling stile Apple + Linear
// Layout principale aggiornato con design system moderno
// Include navbar globale e design tokens per consistenza

import { Inter } from 'next/font/google'
import './globals.css'
import { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ToastProvider'
import Navbar from '@/components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ClientSniper - Trova Lead Qualificati',
  description: 'SaaS per la generazione di lead attraverso l\'analisi tecnica automatizzata di siti web aziendali',
  keywords: 'lead generation, web analysis, seo audit, digital marketing',
  authors: [{ name: 'ClientSniper Team' }],
  robots: 'index, follow',
  openGraph: {
    title: 'ClientSniper - Trova Lead Qualificati',
    description: 'Identifica automaticamente aziende con siti web che necessitano di miglioramenti tecnici',
    type: 'website',
    locale: 'it_IT',
  },
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
      <body className={`${inter.className} h-full bg-gray-50`}>
        <ToastProvider>
          <AuthProvider>
            <div id="root" className="min-h-full">
              <Navbar />
              <main className="min-h-screen">
                {children}
              </main>
            </div>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
