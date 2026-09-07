/**
 * Layout e metadati SEO per la pagina prezzi pubblica - TrovaMi
 * Pagina indicizzabile, nessuna auth richiesta
 */

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Prezzi - Piani e Crediti per Trovare Clienti | TrovaMi',
  description:
    'Prezzi semplici e trasparenti: 1 credito = 1 lead sbloccato. Inizia gratis con un credito di prova, poi scegli il piano mensile o annuale più adatto a te. Disdici quando vuoi.',
  keywords: [
    'trovami prezzi',
    'piani lead generation',
    'costo lead qualificati',
    'abbonamento lead generation',
    'prezzi trova clienti',
    'crediti lead',
    'piano starter agency',
  ],
  openGraph: {
    title: 'Prezzi - Piani e Crediti | TrovaMi',
    description:
      'Prezzi semplici e trasparenti: 1 credito = 1 lead sbloccato. Inizia gratis, disdici quando vuoi.',
    url: 'https://trovami.pro/pricing',
    siteName: 'TrovaMi',
    locale: 'it_IT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prezzi - Piani e Crediti | TrovaMi',
    description:
      'Prezzi semplici e trasparenti: 1 credito = 1 lead sbloccato. Inizia gratis, disdici quando vuoi.',
  },
  alternates: {
    canonical: 'https://trovami.pro/pricing',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
