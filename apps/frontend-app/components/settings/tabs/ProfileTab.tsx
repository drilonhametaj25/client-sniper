/**
 * Tab Profilo — informazioni account, profilo aziendale e logo - TrovaMi
 * Usato da: app/settings/page.tsx (tab "Profilo")
 * Salva su: users (company_name, company_phone, company_website, company_email)
 * Logo: POST/DELETE /api/user/logo (bucket user-assets, users.company_logo_url)
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'
import { User, Building, Image as ImageIcon, RefreshCw, Save, Trash2, Upload } from 'lucide-react'

export default function ProfileTab() {
  const { user } = useAuth()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [companyName, setCompanyName] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [removingLogo, setRemovingLogo] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('company_name, company_phone, company_website, company_email, company_logo_url')
          .eq('id', user.id)
          .single()

        setCompanyName(dbUser?.company_name || '')
        setCompanyPhone(dbUser?.company_phone || '')
        setCompanyWebsite(dbUser?.company_website || '')
        setCompanyEmail(dbUser?.company_email || '')
        setLogoUrl(dbUser?.company_logo_url || null)
      } catch (error) {
        console.error('Errore caricamento profilo:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  const handleSaveBusinessProfile = async () => {
    if (!user?.id) return
    setSavingProfile(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          company_name: companyName.trim() || null,
          company_phone: companyPhone.trim() || null,
          company_website: companyWebsite.trim() || null,
          company_email: companyEmail.trim() || null
        })
        .eq('id', user.id)

      if (error) throw error
      toast.success('Profilo aziendale salvato con successo!')
    } catch (error: any) {
      console.error('Errore salvataggio profilo:', error)
      toast.error('Errore', error.message)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File troppo grande', 'Il logo deve essere inferiore a 2MB')
      return
    }
    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)
      const res = await fetch('/api/user/logo', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) {
        setLogoUrl(data.url)
        toast.success('Logo caricato con successo!')
      } else {
        toast.error('Errore', data.error || 'Errore durante il caricamento del logo')
      }
    } catch (error) {
      console.error('Errore upload logo:', error)
      toast.error('Errore durante il caricamento del logo')
    } finally {
      setUploadingLogo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleLogoRemove = async () => {
    setRemovingLogo(true)
    try {
      const res = await fetch('/api/user/logo', { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setLogoUrl(null)
        toast.success('Logo rimosso')
      } else {
        toast.error('Errore', data.error || 'Errore durante la rimozione del logo')
      }
    } catch (error) {
      console.error('Errore rimozione logo:', error)
      toast.error('Errore durante la rimozione del logo')
    } finally {
      setRemovingLogo(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400'

  return (
    <div className="space-y-6">
      {/* Informazioni Account */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center mb-4">
          <User className="w-5 h-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Informazioni Account</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <div className="text-gray-900 dark:text-white">{user?.email}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Membro dal</label>
            <div className="text-gray-900 dark:text-white">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('it-IT') : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Profilo Aziendale */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center mb-4">
          <Building className="w-5 h-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profilo Aziendale</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Questi dati verranno usati nei preventivi PDF che generi per i tuoi clienti.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome Azienda / Freelancer
            </label>
            <input
              type="text"
              placeholder="Es: Digital Agency Srl"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Telefono
              </label>
              <input
                type="tel"
                placeholder="Es: +39 02 1234567"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Contatto
              </label>
              <input
                type="email"
                placeholder="Es: info@tuaagenzia.it"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sito Web
            </label>
            <input
              type="url"
              placeholder="Es: https://www.tuaagenzia.it"
              value={companyWebsite}
              onChange={(e) => setCompanyWebsite(e.target.value)}
              className={inputClass}
            />
          </div>

          <button
            onClick={handleSaveBusinessProfile}
            disabled={savingProfile}
            className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {savingProfile ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salva Profilo Aziendale
              </>
            )}
          </button>
        </div>
      </div>

      {/* Logo Aziendale */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center mb-4">
          <ImageIcon className="w-5 h-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Logo Aziendale</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Il logo apparirà sui preventivi e report PDF. Formati: PNG, JPG, SVG (max 2MB).
        </p>

        <div className="flex items-center gap-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Logo aziendale"
              className="h-16 w-auto max-w-[160px] object-contain rounded-lg border border-gray-200 dark:border-gray-700 bg-white p-1"
            />
          ) : (
            <div className="h-16 w-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400">
              <ImageIcon className="w-6 h-6" />
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={handleLogoUpload}
              className="hidden"
              id="logo-upload-input"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {uploadingLogo ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Caricamento...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {logoUrl ? 'Sostituisci logo' : 'Carica logo'}
                </>
              )}
            </button>
            {logoUrl && (
              <button
                onClick={handleLogoRemove}
                disabled={removingLogo}
                className="px-4 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {removingLogo ? 'Rimozione...' : 'Rimuovi'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
