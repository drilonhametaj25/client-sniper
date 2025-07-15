import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Confronto Costi per Lead: TrovaMi vs Google Ads vs Facebook Ads | TrovaMi',
  description: 'Analisi dettagliata dei costi per lead tra TrovaMi, Google Ads, Facebook Ads e agenzie tradizionali. Scopri come risparmiare fino al 90% con lead generation automatica.',
  keywords: 'costi per lead, lead generation economica, google ads vs facebook ads, confronto costi marketing, lead generation automatica, roi marketing digitale, acquisizione clienti',
  robots: 'index, follow',
  alternates: {
    canonical: 'https://trovami.pro/confronto-costi-lead'
  },
  openGraph: {
    title: 'Confronto Costi per Lead: TrovaMi vs Competitori 2025',
    description: 'Analisi completa dei costi per lead. Scopri come TrovaMi riduce i costi di acquisizione clienti del 90% rispetto a Google Ads e Facebook Ads.',
    url: 'https://trovami.pro/confronto-costi-lead',
    type: 'article',
    images: [
      {
        url: 'https://trovami.pro/images/confronto-costi-lead-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Confronto Costi per Lead - TrovaMi vs Competitori'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Confronto Costi per Lead: TrovaMi vs Competitori',
    description: 'Scopri come ridurre i costi di acquisizione clienti del 90% con la lead generation automatica.',
    images: ['https://trovami.pro/images/confronto-costi-lead-og.jpg']
  }
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
