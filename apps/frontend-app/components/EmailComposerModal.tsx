/**
 * EmailComposerModal - Modal per comporre e inviare email di outreach
 * Supporta selezione template, preview, personalizzazione e invio
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  X,
  Mail,
  Send,
  Eye,
  Edit3,
  ChevronDown,
  Loader2,
  CheckCircle,
  AlertCircle,
  User,
  Building,
  Phone,
  Calendar,
  Sparkles,
  FileText,
  Copy,
  ExternalLink
} from 'lucide-react'
import {
  EMAIL_TEMPLATES,
  OutreachEmailGenerator,
  TemplateVariables,
  EmailTemplate
} from '@/lib/outreach-email-generator'
import { supabase } from '@/lib/supabase'

interface Lead {
  id: string
  business_name: string
  website_url: string
  email: string
  city?: string
  category?: string
  score?: number
  website_analysis?: any
  analysis?: any
}

interface EmailComposerModalProps {
  isOpen: boolean
  onClose: () => void
  lead: Lead
  onSuccess?: () => void
}

interface UserSettings {
  your_name: string
  your_company?: string
  your_title?: string
  your_phone?: string
  your_email?: string
  calendar_link?: string
}

export default function EmailComposerModal({
  isOpen,
  onClose,
  lead,
  onSuccess
}: EmailComposerModalProps) {
  // State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false)
  const [customSubject, setCustomSubject] = useState('')
  const [customBody, setCustomBody] = useState('')
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // User settings
  const [userSettings, setUserSettings] = useState<UserSettings>({
    your_name: '',
    your_company: '',
    your_title: '',
    your_phone: '',
    your_email: '',
    calendar_link: ''
  })
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  // Carica settings utente
  useEffect(() => {
    if (isOpen && !settingsLoaded) {
      loadUserSettings()
    }
  }, [isOpen])

  // Suggerisci template basato sull'analisi
  useEffect(() => {
    if (isOpen && !selectedTemplateId && lead) {
      const analysis = lead.website_analysis || lead.analysis
      if (analysis) {
        const suggested = OutreachEmailGenerator.suggestTemplate(analysis)
        setSelectedTemplateId(suggested.id)
      } else {
        setSelectedTemplateId('cold_full_audit')
      }
    }
  }, [isOpen, lead])

  // Reset quando chiude
  useEffect(() => {
    if (!isOpen) {
      setSent(false)
      setError(null)
      setIsCustomMode(false)
      setCustomSubject('')
      setCustomBody('')
    }
  }, [isOpen])

  const loadUserSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Prova a caricare da outreach_settings
      const { data: settings } = await supabase
        .from('outreach_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (settings) {
        setUserSettings({
          your_name: settings.sender_name || '',
          your_company: settings.sender_company || '',
          your_title: settings.sender_title || '',
          your_phone: settings.sender_phone || '',
          your_email: settings.sender_email || user.email || '',
          calendar_link: settings.calendar_link || ''
        })
      } else {
        // Fallback: usa email utente
        setUserSettings(prev => ({
          ...prev,
          your_email: user.email || ''
        }))
      }

      setSettingsLoaded(true)
    } catch (err) {
      console.error('Error loading user settings:', err)
      setSettingsLoaded(true)
    }
  }

  // Template selezionato
  const selectedTemplate = useMemo(() => {
    return EMAIL_TEMPLATES.find(t => t.id === selectedTemplateId)
  }, [selectedTemplateId])

  // Compila template con variabili
  const compiledEmail = useMemo(() => {
    if (!selectedTemplate || !lead) return null

    const analysis = lead.website_analysis || lead.analysis
    const variables = OutreachEmailGenerator.generateVariablesFromLead(
      lead,
      analysis,
      userSettings
    )

    return OutreachEmailGenerator.compileTemplate(selectedTemplate, variables)
  }, [selectedTemplate, lead, userSettings])

  // Subject e body da mostrare
  const displaySubject = isCustomMode ? customSubject : (compiledEmail?.subject || '')
  const displayBody = isCustomMode ? customBody : (compiledEmail?.html || '')

  // Handlers
  const handleSend = async () => {
    if (!lead.email) {
      setError('Questo lead non ha un indirizzo email')
      return
    }

    if (!userSettings.your_name) {
      setError('Inserisci il tuo nome nelle impostazioni')
      return
    }

    setSending(true)
    setError(null)

    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        throw new Error('Sessione scaduta')
      }

      const response = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leadId: lead.id,
          templateId: selectedTemplateId,
          customSubject: isCustomMode ? customSubject : undefined,
          customBody: isCustomMode ? customBody : undefined,
          variables: userSettings
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nell\'invio')
      }

      setSent(true)
      onSuccess?.()

      // Chiudi dopo 2 secondi
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setSending(false)
    }
  }

  const handleCopyToClipboard = () => {
    const text = compiledEmail?.text || ''
    navigator.clipboard.writeText(text)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Invia Email
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                a {lead.business_name} ({lead.email})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Success State */}
        {sent ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Email Inviata!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                La tua email è stata inviata a {lead.email}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Content */}
            <div className="flex-1 overflow-hidden flex">
              {/* Left: Settings */}
              <div className="w-80 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4 space-y-4">
                {/* Template Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Template
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                      className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-left"
                    >
                      <span className="text-sm text-gray-900 dark:text-white truncate">
                        {selectedTemplate?.name || 'Seleziona template'}
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>

                    {showTemplateDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowTemplateDropdown(false)}
                        />
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 z-20 max-h-64 overflow-y-auto">
                          {/* Cold templates */}
                          <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                            Email Cold
                          </div>
                          {EMAIL_TEMPLATES.filter(t => t.category === 'cold').map(template => (
                            <button
                              key={template.id}
                              onClick={() => {
                                setSelectedTemplateId(template.id)
                                setShowTemplateDropdown(false)
                                setIsCustomMode(false)
                              }}
                              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-600 ${
                                selectedTemplateId === template.id
                                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {template.name}
                            </button>
                          ))}

                          {/* Follow-up templates */}
                          <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                            Follow-up
                          </div>
                          {EMAIL_TEMPLATES.filter(t => t.category === 'follow_up').map(template => (
                            <button
                              key={template.id}
                              onClick={() => {
                                setSelectedTemplateId(template.id)
                                setShowTemplateDropdown(false)
                                setIsCustomMode(false)
                              }}
                              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-600 ${
                                selectedTemplateId === template.id
                                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {template.name}
                            </button>
                          ))}

                          {/* LinkedIn */}
                          <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                            LinkedIn
                          </div>
                          {EMAIL_TEMPLATES.filter(t => t.category === 'linkedin').map(template => (
                            <button
                              key={template.id}
                              onClick={() => {
                                setSelectedTemplateId(template.id)
                                setShowTemplateDropdown(false)
                                setIsCustomMode(false)
                              }}
                              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-600 ${
                                selectedTemplateId === template.id
                                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {template.name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* User Settings */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Le tue informazioni
                  </h4>

                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Tuo Nome *
                    </label>
                    <input
                      type="text"
                      value={userSettings.your_name}
                      onChange={(e) => setUserSettings(prev => ({ ...prev, your_name: e.target.value }))}
                      placeholder="Mario Rossi"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Azienda
                    </label>
                    <input
                      type="text"
                      value={userSettings.your_company || ''}
                      onChange={(e) => setUserSettings(prev => ({ ...prev, your_company: e.target.value }))}
                      placeholder="Web Agency Srl"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Ruolo
                    </label>
                    <input
                      type="text"
                      value={userSettings.your_title || ''}
                      onChange={(e) => setUserSettings(prev => ({ ...prev, your_title: e.target.value }))}
                      placeholder="Web Developer"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Telefono
                    </label>
                    <input
                      type="text"
                      value={userSettings.your_phone || ''}
                      onChange={(e) => setUserSettings(prev => ({ ...prev, your_phone: e.target.value }))}
                      placeholder="+39 02 123456"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Email di risposta
                    </label>
                    <input
                      type="email"
                      value={userSettings.your_email || ''}
                      onChange={(e) => setUserSettings(prev => ({ ...prev, your_email: e.target.value }))}
                      placeholder="mario@webagency.it"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Link Calendario (Calendly, Cal.com)
                    </label>
                    <input
                      type="url"
                      value={userSettings.calendar_link || ''}
                      onChange={(e) => setUserSettings(prev => ({ ...prev, calendar_link: e.target.value }))}
                      placeholder="https://calendly.com/tuonome"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Right: Preview */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
                    <Eye className="w-4 h-4 mr-2" />
                    Anteprima Email
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopyToClipboard}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Copia testo"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsCustomMode(!isCustomMode)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        isCustomMode
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <Edit3 className="w-4 h-4 inline mr-1" />
                      Modifica
                    </button>
                  </div>
                </div>

                {/* Subject */}
                <div className="mb-4">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Oggetto
                  </label>
                  {isCustomMode ? (
                    <input
                      type="text"
                      value={customSubject || compiledEmail?.subject || ''}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-gray-900 dark:text-white">
                      {displaySubject}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Corpo email
                  </label>
                  {isCustomMode ? (
                    <textarea
                      value={customBody || compiledEmail?.text || ''}
                      onChange={(e) => setCustomBody(e.target.value)}
                      rows={15}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                    />
                  ) : (
                    <div
                      className="px-4 py-3 bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: displayBody }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              {error && (
                <div className="flex items-center text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {error}
                </div>
              )}

              <div className="flex items-center space-x-3 ml-auto">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !lead.email || !userSettings.your_name}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl transition-colors"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Invio...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Invia Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
