/**
 * Landing page per tutti i tool gratuiti di TrovaMi
 * Usato per: Mostrare agli utenti tutti gli strumenti di analisi disponibili
 * Chiamato da: Navbar, link diretti
 */

import Link from 'next/link'
import {
  Globe,
  Search,
  Shield,
  Code,
  Accessibility,
  Target,
  ArrowRight,
  Zap,
  CheckCircle
} from 'lucide-react'

// Forza rendering dinamico per questa pagina
export const dynamic = 'force-dynamic'

const tools = [
  {
    name: 'Analisi Completa',
    slug: 'public-scan',
    description: 'Scansiona qualsiasi sito web e ottieni un report completo con punteggio, problemi tecnici e opportunità di miglioramento.',
    icon: Globe,
    color: 'from-blue-500 to-indigo-600',
    features: ['Score 0-100', 'Analisi SEO', 'Performance', 'Sicurezza'],
    badge: 'Popolare'
  },
  {
    name: 'SEO Checker',
    slug: 'seo-checker',
    description: 'Verifica l\'ottimizzazione SEO on-page: meta tag, heading structure, immagini, link interni e molto altro.',
    icon: Search,
    color: 'from-green-500 to-emerald-600',
    features: ['Meta Tag', 'Heading H1-H6', 'Alt Images', 'Internal Links'],
    badge: null
  },
  {
    name: 'Tech Detector',
    slug: 'tech-detector',
    description: 'Scopri le tecnologie utilizzate da un sito: CMS, framework, analytics, CDN, plugin e librerie.',
    icon: Code,
    color: 'from-purple-500 to-violet-600',
    features: ['CMS Detection', 'Framework', 'Analytics', 'CDN'],
    badge: null
  },
  {
    name: 'Security Check',
    slug: 'security-check',
    description: 'Analizza la sicurezza di un sito web: HTTPS, header di sicurezza, CSP, HSTS e vulnerabilità comuni.',
    icon: Shield,
    color: 'from-red-500 to-rose-600',
    features: ['SSL/HTTPS', 'Security Headers', 'CSP', 'HSTS'],
    badge: null
  },
  {
    name: 'Accessibility Audit',
    slug: 'accessibility-check',
    description: 'Verifica la conformità WCAG 2.1 A/AA: contrasto colori, etichette form, navigazione keyboard e screen reader.',
    icon: Accessibility,
    color: 'from-amber-500 to-orange-600',
    features: ['WCAG 2.1', 'Contrasto', 'Form Labels', 'ARIA'],
    badge: null
  },
  {
    name: 'Analisi Avanzata',
    slug: 'manual-scan',
    description: 'Per utenti registrati: analisi più approfondita con salvataggio risultati e confronti nel tempo.',
    icon: Target,
    color: 'from-cyan-500 to-teal-600',
    features: ['Storico', 'Confronti', 'Export', 'Notifiche'],
    badge: 'Login richiesto'
  }
]

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Strumenti Gratuiti di Analisi Web
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Analizza qualsiasi sito web in pochi secondi. Scopri problemi tecnici, opportunità SEO e vulnerabilità di sicurezza.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
            Fino a 3 analisi gratuite al giorno per IP
          </p>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <Link
              key={tool.slug}
              href={`/tools/${tool.slug}`}
              className="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 hover:-translate-y-1"
            >
              {/* Badge */}
              {tool.badge && (
                <div className="absolute top-4 right-4">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    tool.badge === 'Popolare'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {tool.badge}
                  </span>
                </div>
              )}

              {/* Icon */}
              <div className={`w-12 h-12 bg-gradient-to-br ${tool.color} rounded-xl flex items-center justify-center mb-4`}>
                <tool.icon className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {tool.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                {tool.description}
              </p>

              {/* Features */}
              <div className="flex flex-wrap gap-2 mb-4">
                {tool.features.map((feature) => (
                  <span
                    key={feature}
                    className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400"
                  >
                    <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                    {feature}
                  </span>
                ))}
              </div>

              {/* CTA */}
              <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium text-sm group-hover:translate-x-1 transition-transform">
                Usa questo tool
                <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Vuoi trovare clienti per i tuoi servizi?
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            TrovaMi ti fornisce lead qualificati di aziende che hanno bisogno di migliorare il loro sito web.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors"
            >
              Inizia Gratis
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <Link
              href="/come-trovare-clienti"
              className="inline-flex items-center justify-center px-6 py-3 border-2 border-white text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
            >
              Scopri di più
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
