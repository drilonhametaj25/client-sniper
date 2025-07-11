/**
 * Analytics Dashboard Page
 * Pagina principale per la dashboard di analytics che mostra:
 * - Heatmap geografica dei lead
 * - Grafici di conversione
 * - Calcolatore ROI
 * - Esportazione report
 * 
 * Utilizzata da: utenti admin e utenti con piano premium
 * Dipende da: /lib/analytics per servizi, /components/analytics per componenti
 */

import { Metadata } from 'next'
import { Suspense } from 'react'
import { 
  GeographicHeatmap, 
  ConversionRateChart, 
  ROICalculator, 
  ExportReports, 
  AnalyticsOverview 
} from '@/components/analytics'
import { AnalyticsProtection } from '@/components/analytics/analytics-protection'
import LoadingSpinner from '@/components/ui/loading-spinner'

export const metadata: Metadata = {
  title: 'Analytics Dashboard - ClientSniper',
  description: 'Dashboard completa per l\'analisi delle performance e ROI dei lead generati',
}

export default function AnalyticsPage() {
  return (
    <AnalyticsProtection>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Monitora le performance e il ROI dei tuoi lead generati
            </p>
          </div>

          {/* Overview Cards */}
          <Suspense fallback={<LoadingSpinner />}>
            <AnalyticsOverview />
          </Suspense>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Heatmap Geografica */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Distribuzione Geografica</h2>
              <Suspense fallback={<LoadingSpinner />}>
                <GeographicHeatmap />
              </Suspense>
            </div>

            {/* Conversion Rate Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Tasso di Conversione</h2>
              <Suspense fallback={<LoadingSpinner />}>
                <ConversionRateChart />
              </Suspense>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ROI Calculator */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Calcolatore ROI</h2>
              <ROICalculator />
            </div>

            {/* Export Reports */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Esportazione Report</h2>
              <ExportReports />
            </div>
          </div>
        </div>
      </div>
    </AnalyticsProtection>
  )
}
