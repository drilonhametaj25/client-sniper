/**
 * Export Reports Component
 * Componente per l'esportazione dei report analytics in diversi formati
 * 
 * Utilizzato da: analytics dashboard page
 * Dipende da: analyticsService per l'esportazione dati
 */

'use client'

import { useState } from 'react'
import { analyticsService } from '@/lib/services/analytics'
import { Download, FileText, FileSpreadsheet, Database, Calendar, CheckCircle } from 'lucide-react'

export function ExportReports() {
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv')
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [lastExport, setLastExport] = useState<string | null>(null)
  const [exportSuccess, setExportSuccess] = useState(false)

  const handleExport = async () => {
    try {
      setExporting(true)
      setExportSuccess(false)
      
      const blob = await analyticsService.exportReport(exportFormat, period)
      
      // Crea e scarica il file
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `analytics-report-${period}-${timestamp}.${exportFormat}`
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      // Traccia l'evento di esportazione
      await analyticsService.trackEvent('report_exported', {
        format: exportFormat,
        period,
        timestamp: new Date().toISOString()
      })
      
      setLastExport(new Date().toLocaleString('it-IT'))
      setExportSuccess(true)
      
      // Nascondi il messaggio di successo dopo 3 secondi
      setTimeout(() => setExportSuccess(false), 3000)
      
    } catch (error) {
      console.error('Export failed:', error)
      alert('Errore durante l\'esportazione del report. Riprova.')
    } finally {
      setExporting(false)
    }
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4" />
      case 'json':
        return <Database className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'csv':
        return 'Formato CSV per Excel/Google Sheets'
      case 'json':
        return 'Formato JSON per sviluppatori'
      default:
        return 'Formato generico'
    }
  }

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case '7d':
        return 'Ultimi 7 giorni'
      case '30d':
        return 'Ultimi 30 giorni'
      case '90d':
        return 'Ultimi 90 giorni'
      case 'all':
        return 'Tutti i dati (illimitato)'
      default:
        return 'Periodo sconosciuto'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Download className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Esportazione Report</h3>
      </div>

      {/* Export Options */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Formato di Esportazione
          </label>
          <div className="space-y-2">
            {(['csv', 'json'] as const).map((format) => (
              <label key={format} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value={format}
                  checked={exportFormat === format}
                  onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex items-center space-x-2">
                  {getFormatIcon(format)}
                  <span className="text-sm font-medium text-gray-700 uppercase">{format}</span>
                </div>
                <span className="text-sm text-gray-500">{getFormatDescription(format)}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Periodo dei Dati
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as '7d' | '30d' | '90d' | 'all')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Ultimi 7 giorni</option>
            <option value="30d">Ultimi 30 giorni</option>
            <option value="90d">Ultimi 90 giorni</option>
            <option value="all">Tutti i dati (completo)</option>
          </select>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex flex-col space-y-3">
        <button
          onClick={handleExport}
          disabled={exporting}
          className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-md text-white font-medium transition-colors ${
            exporting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {exporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              <span>Esportando...</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Esporta Report</span>
            </>
          )}
        </button>

        {exportSuccess && (
          <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">Report esportato con successo!</span>
          </div>
        )}
      </div>

      {/* Export Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-2">Cosa Include il Report</h4>
        <ul className="space-y-1 text-sm text-gray-600">
          <li>• Panoramica generale delle metriche</li>
          <li>• Distribuzione geografica dei lead</li>
          <li>• Dati di conversione per il periodo selezionato</li>
          <li>• Metriche ROI e performance</li>
          <li>• Timestamp di esportazione</li>
        </ul>
      </div>

      {/* Last Export Info */}
      {lastExport && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Ultimo Export</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            {lastExport} - {getPeriodLabel(period)} ({exportFormat.toUpperCase()})
          </p>
        </div>
      )}

      {/* Usage Tips */}
      <div className="bg-yellow-50 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-800 mb-2">Suggerimenti d'Uso</h4>
        <ul className="space-y-1 text-sm text-yellow-700">
          <li>• <strong>CSV:</strong> Apri con Excel per analisi e grafici</li>
          <li>• <strong>JSON:</strong> Usa per integrazioni personalizzate</li>
          <li>• I dati vengono esportati con timestamp in formato ISO</li>
          <li>• Esporta regolarmente per mantenere backup dei dati</li>
        </ul>
      </div>
    </div>
  )
}
