/**
 * Componente per visualizzare l'analisi di un sito web
 * Supporta sia visualizzazione completa che semplificata/pubblica
 * Usato da: 
 * - /app/tools/manual-scan/page.tsx (analisi interna autenticata)
 * - /app/tools/public-scan/page.tsx (analisi pubblica gratuita)
 * - /app/lead/[id]/page.tsx (visualizzazione lead)
 */

import { WebsiteAnalysis } from '@/lib/types/analysis'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  Zap,
  Globe,
  TrendingDown,
  BarChart3,
  PieChart,
  Search,
  Smartphone
} from 'lucide-react'

interface WebsiteAnalysisDisplayProps {
  analysis: WebsiteAnalysis
  mode?: 'full' | 'simplified' | 'public'
  showHeader?: boolean
  showSimplifiedWarning?: boolean
}

/**
 * Restituisce il colore in base al punteggio
 */
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
}

/**
 * Restituisce la descrizione del punteggio
 */
function getScoreDescription(score: number): string {
  if (score >= 80) return 'Ottimo'
  if (score >= 60) return 'Buono'
  if (score >= 40) return 'Migliorabile'
  if (score >= 20) return 'Problematico'
  return 'Critico'
}

export function WebsiteAnalysisDisplay({
  analysis,
  mode = 'full',
  showHeader = true,
  showSimplifiedWarning = true
}: WebsiteAnalysisDisplayProps) {
  
  // Determina se usare layout completo o semplificato
  const isSimplified = mode === 'simplified' || mode === 'public' || analysis.analysisType === 'simplified'
  const isPublic = mode === 'public'
  
  // Verifica se l'analisi è nel nuovo formato
  const isNewFormat = Boolean(
    analysis.seo && 
    analysis.performance && 
    analysis.tracking
  )
  
  return (
    <div className="space-y-6">
      {/* Avviso analisi semplificata */}
      {isSimplified && showSimplifiedWarning && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                {isPublic ? 'Analisi Gratuita Limitata' : 'Analisi Semplificata'}
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  {isPublic 
                    ? 'Questa è un\'analisi gratuita con dati limitati. Per vedere tutti i dettagli e le raccomandazioni complete, registrati gratuitamente.' 
                    : 'Questa è un\'analisi semplificata eseguita senza browser. Alcune metriche potrebbero non essere precise.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Punteggio e metriche principali */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className={`text-2xl font-bold ${getScoreColor(analysis.overallScore)}`}>
            {analysis.overallScore}/100
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Punteggio Totale
          </div>
          <div className={`text-xs mt-1 ${getScoreColor(analysis.overallScore)}`}>
            {getScoreDescription(analysis.overallScore)}
          </div>
        </div>
        
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {analysis.performance?.loadTime 
              ? Math.round(analysis.performance.loadTime / 1000 * 10) / 10
              : 'N/A'}s
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Velocità
          </div>
        </div>
        
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="text-2xl font-bold">
            {analysis.seo?.hasTitle ? 
              <CheckCircle className="h-6 w-6 inline text-green-600" /> : 
              <XCircle className="h-6 w-6 inline text-red-600" />
            }
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            SEO Base
          </div>
        </div>
        
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="text-2xl font-bold">
            {analysis.performance?.isResponsive ? 
              <Smartphone className="h-6 w-6 inline text-green-600" /> : 
              <XCircle className="h-6 w-6 inline text-red-600" />
            }
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Mobile-Friendly
          </div>
        </div>
      </div>
      
      {/* Dettagli principali - visibili sia in analisi completa che semplificata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SEO Base */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-5">
          <div className="flex items-center mb-4">
            <Search className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="font-medium text-gray-900 dark:text-white">
              SEO Base
            </h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Meta Title
              </span>
              <span>
                {analysis.seo?.hasTitle ? 
                  <CheckCircle className="h-5 w-5 text-green-600" /> : 
                  <XCircle className="h-5 w-5 text-red-600" />
                }
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Meta Description
              </span>
              <span>
                {analysis.seo?.hasMetaDescription ? 
                  <CheckCircle className="h-5 w-5 text-green-600" /> : 
                  <XCircle className="h-5 w-5 text-red-600" />
                }
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Heading H1
              </span>
              <span>
                {analysis.seo?.hasH1 ? 
                  <CheckCircle className="h-5 w-5 text-green-600" /> : 
                  <XCircle className="h-5 w-5 text-red-600" />
                }
              </span>
            </div>
            
            {!isPublic && analysis.seo?.hasStructuredData !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Schema Markup
                </span>
                <span>
                  {analysis.seo.hasStructuredData ? 
                    <CheckCircle className="h-5 w-5 text-green-600" /> : 
                    <XCircle className="h-5 w-5 text-red-600" />
                  }
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Performance Base */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-5">
          <div className="flex items-center mb-4">
            <Zap className="h-5 w-5 text-yellow-500 mr-2" />
            <h3 className="font-medium text-gray-900 dark:text-white">
              Performance
            </h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                HTTPS
              </span>
              <span>
                {!analysis.issues?.httpsIssues ? 
                  <CheckCircle className="h-5 w-5 text-green-600" /> : 
                  <XCircle className="h-5 w-5 text-red-600" />
                }
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Responsive Design
              </span>
              <span>
                {analysis.performance?.isResponsive ? 
                  <CheckCircle className="h-5 w-5 text-green-600" /> : 
                  <XCircle className="h-5 w-5 text-red-600" />
                }
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Tempo Caricamento
              </span>
              <span className={
                analysis.performance?.loadTime && analysis.performance.loadTime < 3000
                  ? 'text-green-600'
                  : analysis.performance?.loadTime && analysis.performance.loadTime < 5000
                    ? 'text-yellow-600'
                    : 'text-red-600'
              }>
                {analysis.performance?.loadTime 
                  ? `${Math.round(analysis.performance.loadTime / 1000 * 10) / 10}s`
                  : 'N/A'
                }
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sezioni avanzate - solo per analisi completa */}
      {!isSimplified && (
        <>
          {/* Tracking e Analytics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-5">
            <div className="flex items-center mb-4">
              <BarChart3 className="h-5 w-5 text-purple-600 mr-2" />
              <h3 className="font-medium text-gray-900 dark:text-white">
                Tracking e Analytics
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Google Analytics
                  </span>
                  <span>
                    {analysis.tracking?.hasGoogleAnalytics ? 
                      <CheckCircle className="h-5 w-5 text-green-600" /> : 
                      <XCircle className="h-5 w-5 text-red-600" />
                    }
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Facebook Pixel
                  </span>
                  <span>
                    {analysis.tracking?.hasFacebookPixel ? 
                      <CheckCircle className="h-5 w-5 text-green-600" /> : 
                      <XCircle className="h-5 w-5 text-red-600" />
                    }
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Google Tag Manager
                  </span>
                  <span>
                    {analysis.tracking?.hasGoogleTagManager ? 
                      <CheckCircle className="h-5 w-5 text-green-600" /> : 
                      <XCircle className="h-5 w-5 text-red-600" />
                    }
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Hotjar/Clarity
                  </span>
                  <span>
                    {(analysis.tracking?.hasHotjar || analysis.tracking?.hasClarityMicrosoft) ? 
                      <CheckCircle className="h-5 w-5 text-green-600" /> : 
                      <XCircle className="h-5 w-5 text-red-600" />
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Altre sezioni avanzate... */}
        </>
      )}
      
      {/* CTA per analisi pubblica limitata */}
      {isPublic && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
          <h3 className="text-xl font-bold mb-2">
            Sblocca l'analisi completa gratuitamente
          </h3>
          <p className="mb-4">
            Registrati per vedere tutti i dettagli tecnici, ottenere raccomandazioni personalizzate e 
            avere accesso a strumenti avanzati di analisi dei siti web.
          </p>
          <a 
            href="/register" 
            className="inline-flex items-center px-4 py-2 bg-white text-blue-700 font-medium rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Registrati Gratis
            <span className="ml-2">→</span>
          </a>
        </div>
      )}
    </div>
  )
}
