/**
 * Pagina Contatti - TrovaMi
 * Usato per: Informazioni di contatto e form di supporto
 * Chiamato da: Footer, navbar, pagine di supporto
 */

'use client'

import { Metadata } from 'next'
import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    type: 'generale'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Errore durante l\'invio')
      }

      setSubmitted(true)
      setFormData({ name: '', email: '', subject: '', message: '', type: 'generale' })
    } catch (error) {
      console.error('Errore invio messaggio:', error)
      alert('Errore durante l\'invio del messaggio. Riprova più tardi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Contattaci
          </h1>
          <p className="text-lg text-gray-600">
            Siamo qui per aiutarti. Scegli il modo più comodo per metterti in contatto con noi.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Form di contatto */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Invia un Messaggio
            </h2>

            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <div className="text-4xl mb-4">✅</div>
                <h3 className="text-lg font-medium text-green-800 mb-2">
                  Messaggio Inviato!
                </h3>
                <p className="text-green-700">
                  Grazie per averci contattato. Ti risponderemo entro 24 ore.
                </p>
                <Button 
                  onClick={() => setSubmitted(false)}
                  className="mt-4"
                  variant="secondary"
                >
                  Invia un Altro Messaggio
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nome */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <Input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Il tuo nome e cognome"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="tuaemail@esempio.com"
                  />
                </div>

                {/* Tipo di richiesta */}
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo di Richiesta
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="generale">Domanda Generale</option>
                    <option value="supporto">Supporto Tecnico</option>
                    <option value="vendite">Informazioni Commerciali</option>
                    <option value="partnership">Partnership</option>
                    <option value="privacy">Privacy e Dati</option>
                    <option value="fatturazione">Fatturazione e Pagamenti</option>
                  </select>
                </div>

                {/* Oggetto */}
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Oggetto *
                  </label>
                  <Input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    placeholder="Breve descrizione della tua richiesta"
                  />
                </div>

                {/* Messaggio */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Messaggio *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    required
                    placeholder="Descrivi in dettaglio la tua richiesta..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? 'Invio in corso...' : 'Invia Messaggio'}
                </Button>
              </form>
            )}
          </div>

          {/* Informazioni di contatto */}
          <div className="space-y-8">
            
            {/* Contatti diretti */}
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Contatti Diretti
              </h2>
              
              <div className="space-y-6">
                {/* Email generale */}
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Email Generale</h3>
                    <p className="text-gray-600">info@trovami.pro</p>
                    <p className="text-sm text-gray-500">Risposta entro 24 ore</p>
                  </div>
                </div>

                {/* Supporto tecnico */}
                <div className="flex items-start space-x-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 11-9.75 9.75A9.75 9.75 0 0112 2.25z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Supporto Tecnico</h3>
                    <p className="text-gray-600">support@trovami.pro</p>
                    <p className="text-sm text-gray-500">Problemi tecnici e assistenza</p>
                  </div>
                </div>

                {/* Vendite */}
                <div className="flex items-start space-x-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Vendite e Partnership</h3>
                    <p className="text-gray-600">sales@trovami.pro</p>
                    <p className="text-sm text-gray-500">Piani aziendali e collaborazioni</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ veloci */}
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Domande Frequenti
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">
                    Come funziona il piano gratuito?
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Il piano gratuito include 5 lead gratuiti. 
                    Perfetto per testare la piattaforma.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">
                    Posso cancellare l'abbonamento in qualsiasi momento?
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Sì, puoi cancellare dall'area utente. La cancellazione è 
                    effettiva alla fine del periodo già pagato.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">
                    I lead sono conformi al GDPR?
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Sì, raccogliamo solo dati pubblicamente disponibili. 
                    Sei responsabile del contatto nel rispetto delle normative.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <a 
                  href="/help" 
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Vedi tutte le FAQ →
                </a>
              </div>
            </div>

            {/* Orari e informazioni */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="font-medium text-gray-900 mb-4">
                📞 Orari di Supporto
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Lunedì - Venerdì:</strong> 9:00 - 18:00 CET</p>
                <p><strong>Sabato:</strong> 10:00 - 14:00 CET</p>
                <p><strong>Domenica:</strong> Chiuso</p>
              </div>
              <p className="text-xs text-gray-600 mt-4">
                Le email ricevute fuori orario saranno processate il primo giorno lavorativo utile.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-12 flex justify-center">
          <a 
            href="/" 
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Torna alla Homepage
          </a>
        </div>
      </div>
    </div>
  )
}
