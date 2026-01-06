/**
 * Componente per anteprima e download Report PDF
 * Permette di visualizzare un'anteprima del report e scaricarlo
 */

'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import {
  FileText,
  Download,
  Eye,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Palette,
  Building2,
  Globe,
  Shield,
  Smartphone,
  BarChart3,
  Zap
} from 'lucide-react'
import { BrandingConfig, defaultBranding } from '@/lib/types/pdf'

interface LeadData {
  id: string
  business_name?: string
  name?: string
  website?: string
  url?: string
  city?: string
  location?: string
  category?: string
  business_type?: string
  score?: number
  seo_score?: number
  performance_score?: number
  mobile_score?: number
  tracking_score?: number
  gdpr_score?: number
  security_score?: number
}

interface ReportPreviewProps {
  lead: LeadData
  token: string
  onDownloadComplete?: () => void
  customBranding?: Partial<BrandingConfig>
}

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-500'
  if (score >= 60) return 'text-lime-500'
  if (score >= 40) return 'text-yellow-500'
  if (score >= 20) return 'text-orange-500'
  return 'text-red-500'
}

const getScoreBgColor = (score: number) => {
  if (score >= 80) return 'bg-green-100 dark:bg-green-900/30'
  if (score >= 60) return 'bg-lime-100 dark:bg-lime-900/30'
  if (score >= 40) return 'bg-yellow-100 dark:bg-yellow-900/30'
  if (score >= 20) return 'bg-orange-100 dark:bg-orange-900/30'
  return 'bg-red-100 dark:bg-red-900/30'
}

const ScoreItem = ({ label, score, icon: Icon }: { label: string; score: number; icon: any }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-2">
      <Icon className={`w-4 h-4 ${getScoreColor(score)}`} />
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
    </div>
    <div className={`px-2 py-0.5 rounded-full text-sm font-medium ${getScoreBgColor(score)} ${getScoreColor(score)}`}>
      {score}/100
    </div>
  </div>
)

export default function ReportPreview({ lead, token, onDownloadComplete, customBranding }: ReportPreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [showBrandingOptions, setShowBrandingOptions] = useState(false)
  const [branding, setBranding] = useState<Partial<BrandingConfig>>(customBranding || {})

  const businessName = lead.business_name || lead.name || 'Azienda'
  const website = lead.website || lead.url || 'N/A'
  const overallScore = lead.score || 50

  const scores = {
    seo: lead.seo_score || 50,
    performance: lead.performance_score || 50,
    mobile: lead.mobile_score || 50,
    tracking: lead.tracking_score || 50,
    gdpr: lead.gdpr_score || 50,
    security: lead.security_score || 50
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    setDownloadStatus('idle')
    setErrorMessage('')

    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          leadId: lead.id,
          branding: Object.keys(branding).length > 0 ? { ...defaultBranding, ...branding } : undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Errore nella generazione del report')
      }

      // Scarica il PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `audit-report-${businessName.replace(/\s+/g, '-').toLowerCase()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setDownloadStatus('success')
      onDownloadComplete?.()

      // Reset status dopo 3 secondi
      setTimeout(() => setDownloadStatus('idle'), 3000)

    } catch (error) {
      console.error('Errore download PDF:', error)
      setDownloadStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Errore sconosciuto')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">Audit Report PDF</h3>
              <p className="text-sm text-blue-100">Report professionale scaricabile</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${overallScore >= 60 ? 'text-white' : 'text-yellow-300'}`}>
              {overallScore}
            </div>
            <div className="text-xs text-blue-200">Score Totale</div>
          </div>
        </div>
      </div>

      {/* Business Info */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-gray-400" />
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">{businessName}</h4>
            <p className="text-sm text-gray-500">{website}</p>
          </div>
        </div>
      </div>

      {/* Scores Preview */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Anteprima Punteggi
        </h4>
        <div className="space-y-1">
          <ScoreItem label="SEO" score={scores.seo} icon={Globe} />
          <ScoreItem label="Performance" score={scores.performance} icon={Zap} />
          <ScoreItem label="Mobile" score={scores.mobile} icon={Smartphone} />
          <ScoreItem label="Tracking" score={scores.tracking} icon={BarChart3} />
          <ScoreItem label="GDPR" score={scores.gdpr} icon={Shield} />
          <ScoreItem label="Sicurezza" score={scores.security} icon={Shield} />
        </div>
      </div>

      {/* Branding Options (Collapsible) */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setShowBrandingOptions(!showBrandingOptions)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Personalizza Branding
            </span>
            <span className="text-xs text-gray-400">(opzionale)</span>
          </div>
          {showBrandingOptions ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {showBrandingOptions && (
          <div className="px-4 pb-4 space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome Azienda</label>
              <input
                type="text"
                value={branding.companyName || ''}
                onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                placeholder={defaultBranding.companyName}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Colore Primario</label>
                <input
                  type="color"
                  value={branding.primaryColor || defaultBranding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Secondario</label>
                <input
                  type="color"
                  value={branding.secondaryColor || defaultBranding.secondaryColor}
                  onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Accent</label>
                <input
                  type="color"
                  value={branding.accentColor || defaultBranding.accentColor}
                  onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={branding.contactEmail || ''}
                  onChange={(e) => setBranding({ ...branding, contactEmail: e.target.value })}
                  placeholder={defaultBranding.contactEmail}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Telefono</label>
                <input
                  type="tel"
                  value={branding.contactPhone || ''}
                  onChange={(e) => setBranding({ ...branding, contactPhone: e.target.value })}
                  placeholder="+39 xxx xxx xxxx"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Sito Web</label>
              <input
                type="url"
                value={branding.website || ''}
                onChange={(e) => setBranding({ ...branding, website: e.target.value })}
                placeholder={defaultBranding.website}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {Object.keys(branding).length > 0 && (
              <button
                onClick={() => setBranding({})}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Ripristina default
              </button>
            )}
          </div>
        )}
      </div>

      {/* Report Contents */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Contenuto del Report
        </h4>
        <ul className="text-sm text-gray-500 space-y-1">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-green-500" />
            Cover Page con branding personalizzato
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-green-500" />
            Executive Summary con tutti i punteggi
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-green-500" />
            Analisi SEO dettagliata
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-green-500" />
            Performance e analisi tecnica
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-green-500" />
            Tracking e conformità GDPR
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-green-500" />
            Problemi rilevati con priorità
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-green-500" />
            Opportunità di miglioramento
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-green-500" />
            Pagina contatti personalizzata
          </li>
        </ul>
      </div>

      {/* Download Button */}
      <div className="p-4">
        {downloadStatus === 'error' && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{errorMessage}</span>
          </div>
        )}

        {downloadStatus === 'success' && (
          <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">Report scaricato con successo!</span>
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
            isDownloading
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          {isDownloading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generazione in corso...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Scarica Report PDF
            </>
          )}
        </button>

        <p className="mt-2 text-xs text-center text-gray-400">
          Il report verrà generato con 8 pagine professionali
        </p>
      </div>
    </Card>
  )
}
