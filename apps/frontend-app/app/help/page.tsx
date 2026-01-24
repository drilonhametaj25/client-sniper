/**
 * Pagina Centro Assistenza - TrovaMi
 * Usato per: FAQ, guide, documentazione e supporto self-service
 * Chiamato da: Footer, navbar, pagine di supporto
 */

'use client'

import { useState } from 'react'
import { Metadata } from 'next'

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [openFAQ, setOpenFAQ] = useState<number | string | null>(null)

  const categories = [
    { id: 'all', name: 'Tutte', icon: '📚' },
    { id: 'getting-started', name: 'Iniziare', icon: '🚀' },
    { id: 'plans', name: 'Piani e Prezzi', icon: '💳' },
    { id: 'leads', name: 'Lead e Dati', icon: '🎯' },
    { id: 'technical', name: 'Problemi Tecnici', icon: '🔧' },
    { id: 'privacy', name: 'Privacy e Legale', icon: '🔒' },
    { id: 'billing', name: 'Fatturazione', icon: '📊' }
  ]

  const faqs = [
    {
      id: 1,
      category: 'getting-started',
      question: 'Come iniziare con TrovaMi?',
      answer: `Iniziare è semplicissimo:
      
      1. **Registrati** con la tua email - ricevi 5 lead gratuiti
      2. **Conferma l'account** tramite email di verifica  
      3. **Accedi alla dashboard** e esplora i tuoi primi lead
      4. **Studia l'analisi tecnica** per capire i problemi dei siti
      5. **Contatta i potenziali clienti** con proposte mirate
      
      Il piano gratuito non scade mai e ti permette di testare completamente la piattaforma.`
    },
    {
      id: 2,
      category: 'getting-started',
      question: 'Cosa sono i "lead" e come vengono trovati?',
      answer: `I lead sono aziende con siti web che presentano problemi tecnici che potresti aiutare a risolvere.
      
      **Come li troviamo:**
      - Scansione automatica di siti web pubblici
      - Analisi tecnica per rilevare problemi (velocità, SEO, pixel, ecc.)
      - Assegnazione di un punteggio (0-100) - più basso = maggiori opportunità
      
      **Tipi di problemi rilevati:**
      - Mancanza di pixel di tracking
      - SEO non ottimizzato  
      - Velocità di caricamento lenta
      - Immagini rotte o problemi tecnici
      - Mancanza di Google Tag Manager`
    },
    {
      id: 3,
      category: 'plans',
      question: 'Qual è la differenza tra i piani?',
      answer: `**Piano FREE (Sempre gratuito)**
      - 5 lead gratuiti
      - Analisi tecnica completa
      - Dashboard base
      
      **Piano STARTER (€29/mese)**
      - 50 lead nuovi ogni mese
      - Tutti i dati del lead (email, telefono, ecc.)
      - Filtri avanzati
      - Export dati
      
      **Piano PRO (€79/mese)**
      - 200 lead nuovi ogni mese
      - Priorità sui lead di qualità
      - API access
      - Supporto prioritario
      - **Servizi digitali suggeriti per ogni lead**
      
      I crediti non si accumulano - ogni mese ricevi nuovi lead freschi.`
    },
    {
      id: 'pro-services',
      category: 'plans',
      question: 'Cosa sono i "servizi digitali suggeriti" del piano PRO?',
      answer: `**Esclusiva del piano PRO:**
      
      Per ogni lead analizzato, ricevi automaticamente:
      
      **📋 Lista servizi personalizzata**
      - Servizi specifici basati sui problemi identificati
      - Prezzi ottimizzati per il mercato locale
      - Template email già pronti
      - Preventivi pre-compilati
      
      **💰 Esempi di servizi suggeriti:**
      - Audit SEO Tecnico: €800-€1.500
      - Ottimizzazione Performance: €600-€1.200
      - Compliance GDPR: €400-€800
      - Redesign Responsivo: €2.000-€5.000
      
      **📈 Risultati:**
      - +340% tasso di conversione
      - Valore medio proposta: €1.800
      - -85% tempo per preventivo
      
      **🎯 Come funziona:**
      Il sistema analizza i problemi tecnici del lead e ti suggerisce automaticamente i servizi più appropriati da offrire con prezzi che massimizzano l'accettazione.`
    },
    {
      id: 4,
      category: 'plans',
      question: 'Posso cambiare piano o cancellare in qualsiasi momento?',
      answer: `**Sì, hai massima flessibilità:**
      
      **Upgrade:** Immediato - paghi la differenza proporzionale
      **Downgrade:** Effettivo dal prossimo ciclo di fatturazione
      **Cancellazione:** Immediata dalle impostazioni account
      
      **Nessun rimborso** per periodi già utilizzati, ma mantieni l'accesso fino alla scadenza del periodo pagato.
      
      **Downgrade a FREE:** Mantieni sempre i 5 lead gratuiti, anche dopo aver avuto piani premium.`
    },
    {
      id: 5,
      category: 'leads',
      question: 'I lead sono aggiornati e di qualità?',
      answer: `**Sì, garantiamo massima qualità:**
      
      **Freshness:** I lead vengono aggiornati continuamente
      **Deduplicazione:** Evitiamo duplicati nello stesso periodo
      **Verifica:** Ogni sito viene analizzato in tempo reale
      **Scoring accurato:** Il punteggio riflette reali opportunità
      
      **Criteri di qualità:**
      - Aziende attive con sito funzionante
      - Problemi tecnici verificati automaticamente
      - Informazioni di contatto disponibili pubblicamente
      - Focus su aziende che possono beneficiare dei tuoi servizi`
    },
    {
      id: 6,
      category: 'leads',
      question: 'Come interpretare il punteggio dei lead?',
      answer: `**Il punteggio va da 0 a 100 - più è basso, meglio è:**
      
      **0-30:** 🔥 ALTISSIMA priorità
      - Siti con gravi problemi tecnici
      - Opportunità immediate di intervento
      - Contatta subito questi lead
      
      **31-60:** ⚡ MEDIA priorità  
      - Problemi significativi ma non critici
      - Buone opportunità di business
      - Ottimi per campagne mirate
      
      **61-100:** ⚠️ BASSA priorità
      - Problemi minori o siti già ottimizzati
      - Usa per completare il portfolio clienti
      
      **Concentrati sui punteggi bassi per massimizzare le conversioni!**`
    },
    {
      id: 7,
      category: 'technical',
      question: 'Non ricevo email di conferma o reset password',
      answer: `**Controlla questi passaggi:**
      
      1. **Spam/Junk folder** - le email potrebbero finire lì
      2. **Email corretta** - verifica di aver inserito l'indirizzo giusto  
      3. **Attendi 5-10 minuti** - i server email possono avere ritardi
      4. **Whitelist** - aggiungi noreply@trovami.pro ai contatti
      
      **Se persiste il problema:**
      - Prova con un altro indirizzo email
      - Contatta support@trovami.pro
      - Specifica: browser, dispositivo, e orario del tentativo
      
      **Alternative:**
      Puoi sempre accedere con il link magico dalla pagina login.`
    },
    {
      id: 8,
      category: 'technical',
      question: 'La dashboard è lenta o non carica',
      answer: `**Soluzioni rapide:**
      
      **1. Refresh browser** (Ctrl+F5 o Cmd+Shift+R)
      **2. Cancella cache** del browser  
      **3. Disabilita** estensioni ad-blocker temporaneamente
      **4. Prova** in modalità incognito
      **5. Verifica** connessione internet
      
      **Browser supportati:**
      - Chrome (ultimo)
      - Firefox (ultimo)  
      - Safari (ultimo)
      - Edge (ultimo)
      
      **Se persiste:** Contatta supporto con screenshot e info su browser/sistema operativo.`
    },
    {
      id: 9,
      category: 'privacy',
      question: 'È legale contattare i lead trovati?',
      answer: `**Sì, ma con responsabilità:**
      
      **I nostri lead provengono da:**
      - Informazioni pubblicamente disponibili
      - Siti web, directory aziendali, Google Maps
      - Nessun dato privato o rubato
      
      **Le tue responsabilità:**
      - Rispettare GDPR e normative locali
      - Non fare spam o email massive non sollecitate
      - Ottenere consenso per marketing diretto
      - Offrire sempre opt-out nelle comunicazioni
      
      **Best practices:**
      - Email personalizzate, non template massivi
      - Proponi valore reale basato sui problemi rilevati
      - Rispetta i "no" e non insistere
      
      **Consulta sempre un legale per conformità specifica al tuo business.**`
    },
    {
      id: 10,
      category: 'privacy',
      question: 'Che dati raccogliete su di me?',
      answer: `**Raccogliamo solo il necessario:**
      
      **Dati account:**
      - Email (per login e comunicazioni)
      - Password (criptata)
      - Preferenze utilizzo
      
      **Dati utilizzo:**
      - Log accessi (IP, browser)
      - Pagine visitate nella piattaforma
      - Lead visualizzati/scaricati
      
      **Dati pagamento:**
      - Gestiti interamente da Stripe
      - Non conserviamo carte di credito
      
      **I tuoi diritti GDPR:**
      - Accesso, rettifica, cancellazione
      - Portabilità dati
      - Limitazione trattamento
      
      Vedi la **Privacy Policy** completa per tutti i dettagli.`
    },
    {
      id: 11,
      category: 'billing',
      question: 'Come funziona la fatturazione?',
      answer: `**Sistema semplice e trasparente:**
      
      **Fatturazione mensile:**
      - Addebito automatico il giorno dell'upgrade
      - Rinnovo automatico ogni mese
      - Gestito sicuramente da Stripe
      
      **Cosa include il prezzo:**
      - Tutti i lead del piano (50 o 200)
      - Accesso completo alla piattaforma
      - Supporto email
      - Aggiornamenti automatici
      
      **Fatture:**
      - Inviate automaticamente via email
      - Disponibili nell'area account
      - Include tutti i dettagli fiscali necessari
      
      **Cancellazione:** Immediata, senza penali. Mantieni accesso fino a scadenza periodo pagato.`
    },
    {
      id: 12,
      category: 'billing',
      question: 'Accettate fatturazione aziendale?',
      answer: `**Sì, supportiamo completamente aziende:**
      
      **Fatturazione B2B:**
      - Fatture con P.IVA e dati aziendali
      - Pagamento su fattura per piani annuali
      - Contratti personalizzati per grandi volumi
      
      **Documenti fiscali:**
      - Fatture elettroniche (se in Italia)
      - Invoice internazionali
      - Tutti i dettagli per detraibilità
      
      **Piani Enterprise:**
      - Volumi personalizzati di lead
      - SLA garantiti
      - Supporto dedicato
      - Integrazioni API custom
      
      **Contatta sales@trovami.pro** per un preventivo personalizzato.`
    }
  ]

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const toggleFAQ = (id: number | string) => {
    setOpenFAQ(openFAQ === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Centro Assistenza
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Trova risposte alle tue domande e guide per utilizzare al meglio TrovaMi
          </p>

          {/* Search */}
          <div className="max-w-2xl">
            <div className="relative">
              <input
                type="text"
                placeholder="Cerca nelle FAQ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <svg 
                className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar categorie */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Categorie
              </h3>
              <nav className="space-y-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      activeCategory === category.id
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">{category.icon}</span>
                    {category.name}
                  </button>
                ))}
              </nav>

              {/* Quick actions */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">
                  Serve altro aiuto?
                </h4>
                <div className="space-y-3">
                  <a 
                    href="/contact"
                    className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    Contatta Supporto
                  </a>
                  <a 
                    href="mailto:support@trovami.pro"
                    className="block w-full text-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
                  >
                    Email Diretta
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm">
              {/* Results header */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {searchQuery ? `Risultati per "${searchQuery}"` : 
                   activeCategory === 'all' ? 'Tutte le FAQ' : 
                   categories.find(c => c.id === activeCategory)?.name}
                </h2>
                <p className="text-gray-600 mt-1">
                  {filteredFAQs.length} {filteredFAQs.length === 1 ? 'risultato' : 'risultati'}
                </p>
              </div>

              {/* FAQ List */}
              <div className="divide-y divide-gray-200">
                {filteredFAQs.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-4xl mb-4">🤔</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nessun risultato trovato
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Prova a cercare con termini diversi o seleziona un'altra categoria.
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setActiveCategory('all')
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Mostra tutte le FAQ
                    </button>
                  </div>
                ) : (
                  filteredFAQs.map(faq => (
                    <div key={faq.id} className="p-6">
                      <button
                        onClick={() => toggleFAQ(faq.id)}
                        className="w-full text-left flex justify-between items-start group"
                      >
                        <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors pr-4">
                          {faq.question}
                        </h3>
                        <svg 
                          className={`w-5 h-5 text-gray-400 transition-transform ${
                            openFAQ === faq.id ? 'rotate-180' : ''
                          }`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {openFAQ === faq.id && (
                        <div className="mt-4 pr-8">
                          <div className="prose prose-gray max-w-none">
                            {faq.answer.split('\n').map((paragraph, index) => (
                              paragraph.trim() && (
                                <p key={index} className="text-gray-700 leading-7 mb-3">
                                  {paragraph.trim()}
                                </p>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Contact CTA */}
            <div className="mt-8 bg-blue-50 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Non hai trovato quello che cercavi?
              </h3>
              <p className="text-gray-600 mb-4">
                Il nostro team di supporto è sempre pronto ad aiutarti con qualsiasi domanda.
              </p>
              <a 
                href="/contact"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Contatta il Supporto
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
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
