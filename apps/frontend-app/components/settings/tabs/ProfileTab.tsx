/**
 * Tab Profilo — informazioni account, profilo aziendale e logo - TrovaMi
 * Usato da: app/settings/page.tsx (tab "Profilo")
 * Salva su: users (company_name, company_phone, company_website, company_email)
 * Logo: POST/DELETE /api/user/logo (bucket user-assets, users.company_logo_url)
 * Presentazione: guida in apps/frontend-app/DESIGN.md.
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react'
import { Button, Card, CardTitle, Input, Skeleton } from '@/components/ui'

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
      <div className="space-y-6" role="status" aria-live="polite">
        <span className="sr-only">Caricamento in corso</span>
        <Skeleton className="h-28 w-full rounded-card" />
        <Skeleton className="h-80 w-full rounded-card" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Account */}
      <Card>
        <CardTitle>Account</CardTitle>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-micro uppercase tracking-wide text-content-subtle">Email</dt>
            <dd className="mt-1 break-all text-body text-content">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-micro uppercase tracking-wide text-content-subtle">Membro dal</dt>
            <dd className="mt-1 text-body tabular-nums text-content">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('it-IT') : '—'}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Profilo aziendale */}
      <Card>
        <CardTitle>Profilo aziendale</CardTitle>
        <p className="mt-1 text-body text-content-muted">
          Compaiono sui preventivi e sui report PDF che generi per i tuoi clienti.
        </p>

        <div className="mt-6 space-y-4">
          <Input
            label="Nome azienda o freelancer"
            type="text"
            placeholder="Es. Digital Agency Srl"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Telefono"
              type="tel"
              placeholder="Es. +39 02 1234567"
              value={companyPhone}
              onChange={(e) => setCompanyPhone(e.target.value)}
            />
            <Input
              label="Email di contatto"
              type="email"
              placeholder="Es. info@tuaagenzia.it"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
            />
          </div>

          <Input
            label="Sito web"
            type="url"
            placeholder="Es. https://www.tuaagenzia.it"
            value={companyWebsite}
            onChange={(e) => setCompanyWebsite(e.target.value)}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSaveBusinessProfile}
            loading={savingProfile}
            loadingText="Salvataggio…"
          >
            Salva profilo
          </Button>
        </div>
      </Card>

      {/* Logo */}
      <Card>
        <CardTitle>Logo</CardTitle>
        <p className="mt-1 text-body text-content-muted">
          Appare sui preventivi e sui report. PNG, JPG o SVG, fino a 2 MB.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Logo aziendale"
              className="h-16 w-auto max-w-[160px] rounded-control border border-edge bg-surface-elevated object-contain p-1"
            />
          ) : (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-control border border-dashed border-edge-strong text-content-subtle"
              aria-hidden="true"
            >
              <ImageIcon className="h-5 w-5" />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={handleLogoUpload}
              className="hidden"
              id="logo-upload-input"
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              loading={uploadingLogo}
              loadingText="Caricamento…"
              icon={<Upload />}
            >
              {logoUrl ? 'Sostituisci' : 'Carica logo'}
            </Button>

            {logoUrl && (
              <Button
                variant="ghost"
                onClick={handleLogoRemove}
                loading={removingLogo}
                loadingText="Rimozione…"
                icon={<Trash2 />}
                className="text-danger hover:text-danger"
              >
                Rimuovi
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
