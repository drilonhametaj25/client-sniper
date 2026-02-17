/**
 * StepBranding - Step 4 del nuovo onboarding
 *
 * Form per personalizzare le proposte (tutto opzionale):
 * - Nome azienda
 * - Logo (upload)
 * - Telefono
 * - Sito web
 */

'use client'

import { useState } from 'react'
import { ChevronLeft, Building2, Phone, Globe, Upload, X, Loader2, Check } from 'lucide-react'
import type { StepProps } from '@/lib/types/onboarding-v2'

export default function StepBranding({
  data,
  onUpdate,
  onNext,
  onBack,
  onSkip
}: StepProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      setUploadError('Seleziona un file immagine (PNG, JPG, SVG)')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Il file deve essere inferiore a 2MB')
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('logo', file)

      const response = await fetch('/api/user/logo', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante il caricamento')
      }

      onUpdate({ company_logo_url: result.url })
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Errore sconosciuto')
    } finally {
      setIsUploading(false)
    }
  }

  const removeLogo = () => {
    onUpdate({ company_logo_url: '' })
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    // onNext will handle the API call to save onboarding
    onNext()
  }

  return (
    <div className="max-w-xl mx-auto px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Personalizza le tue proposte
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Opzionale — puoi completare dopo
        </p>
      </div>

      {/* Form */}
      <div className="space-y-5">
        {/* Company Name */}
        <div>
          <label
            htmlFor="company_name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            <Building2 className="inline w-4 h-4 mr-1" />
            Nome azienda / studio
          </label>
          <input
            type="text"
            id="company_name"
            value={data.company_name || ''}
            onChange={(e) => onUpdate({ company_name: e.target.value })}
            placeholder="es. Studio Digitale Rossi"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="company_phone"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            <Phone className="inline w-4 h-4 mr-1" />
            Telefono
          </label>
          <input
            type="tel"
            id="company_phone"
            value={data.company_phone || ''}
            onChange={(e) => onUpdate({ company_phone: e.target.value })}
            placeholder="es. +39 333 1234567"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Website */}
        <div>
          <label
            htmlFor="company_website"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            <Globe className="inline w-4 h-4 mr-1" />
            Sito web
          </label>
          <input
            type="url"
            id="company_website"
            value={data.company_website || ''}
            onChange={(e) => onUpdate({ company_website: e.target.value })}
            placeholder="es. https://www.tuosito.it"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Upload className="inline w-4 h-4 mr-1" />
            Logo (per i report PDF)
          </label>

          {data.company_logo_url ? (
            <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <img
                src={data.company_logo_url}
                alt="Logo caricato"
                className="w-16 h-16 object-contain rounded-lg bg-white"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
                  <Check className="w-4 h-4" />
                  Logo caricato
                </div>
              </div>
              <button
                onClick={removeLogo}
                className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                title="Rimuovi logo"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleLogoUpload}
                disabled={isUploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className={`
                flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all
                ${isUploading
                  ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 bg-gray-50 dark:bg-gray-800/50'
                }
              `}>
                {isUploading ? (
                  <>
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                    <span className="text-sm text-blue-600 dark:text-blue-400">
                      Caricamento in corso...
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Clicca per caricare (PNG, JPG, SVG — max 2MB)
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {uploadError && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
              {uploadError}
            </p>
          )}
        </div>
      </div>

      {/* Help text */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-6 text-center">
        Questi dati appariranno nei report PDF che invii ai clienti
      </p>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Indietro
        </button>

        <div className="flex items-center gap-3">
          {onSkip && (
            <button
              onClick={onSkip}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Salta per ora
            </button>
          )}

          <button
            onClick={handleComplete}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                Completa Setup
                <Check className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
