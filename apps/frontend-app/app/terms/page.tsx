/**
 * Pagina Termini di Servizio - TrovaMi
 * Usato per: Condizioni di utilizzo e accordi legali
 * Chiamato da: Footer, registrazione, link legali
 */

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Termini di Servizio | TrovaMi',
  description: 'Termini e condizioni di utilizzo di TrovaMi - Diritti, responsabilità e accordi legali.',
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Termini di Servizio
          </h1>
          <p className="text-lg text-gray-600">
            Ultimo aggiornamento: 25 Giugno 2025
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          
          {/* Introduzione */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              1. Accettazione dei Termini
            </h2>
            <p className="text-gray-700 leading-7">
              Benvenuto in TrovaMi. Utilizzando la nostra piattaforma, accetti integralmente questi Termini di Servizio 
              ("Termini"). Se non accetti questi termini, non puoi utilizzare i nostri servizi. Questi termini costituiscono 
              un accordo legalmente vincolante tra te e TrovaMi.
            </p>
          </section>

          {/* Descrizione servizio */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Descrizione del Servizio
            </h2>
            <p className="text-gray-700 leading-7 mb-4">
              TrovaMi è una piattaforma SaaS che fornisce:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Ricerca automatizzata di potenziali clienti tramite analisi di siti web</li>
              <li>Analisi tecnica di siti web per identificare problemi e opportunità</li>
              <li>Dashboard per gestire e organizzare i lead trovati</li>
              <li>Strumenti per ottimizzare le attività di business development</li>
            </ul>
          </section>

          {/* Account utente */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. Account Utente e Registrazione
            </h2>
            
            <h3 className="text-xl font-medium text-gray-800 mb-3">
              3.1 Requisiti di registrazione
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-6">
              <li>Devi avere almeno 18 anni o l'età della maggiore età nella tua giurisdizione</li>
              <li>Devi fornire informazioni accurate e complete durante la registrazione</li>
              <li>Devi mantenere aggiornate le informazioni del tuo account</li>
              <li>Sei responsabile della sicurezza delle tue credenziali di accesso</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3">
              3.2 Uso dell'account
            </h3>
            <p className="text-gray-700 leading-7">
              L'account è personale e non trasferibile. Sei responsabile di tutte le attività 
              che avvengono sotto il tuo account. Devi notificarci immediatamente qualsiasi 
              uso non autorizzato del tuo account.
            </p>
          </section>

          {/* Piani e pagamenti */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Piani di Abbonamento e Pagamenti
            </h2>
            
            <h3 className="text-xl font-medium text-gray-800 mb-3">
              4.1 Piani disponibili
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <ul className="space-y-2 text-gray-700">
                <li><strong>Piano Free:</strong> 5 lead gratuiti</li>
                <li><strong>Piano Starter:</strong> 50 lead/mese - €29/mese</li>
                <li><strong>Piano Pro:</strong> 200 lead/mese - €79/mese</li>
              </ul>
            </div>

            <h3 className="text-xl font-medium text-gray-800 mb-3">
              4.2 Fatturazione e pagamenti
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>I pagamenti sono processati tramite Stripe</li>
              <li>Gli abbonamenti si rinnovano automaticamente</li>
              <li>I prezzi sono indicati in Euro e includono IVA ove applicabile</li>
              <li>I crediti non utilizzati non si accumulano al mese successivo</li>
              <li>Non forniamo rimborsi per servizi già utilizzati</li>
            </ul>
          </section>

          {/* Uso accettabile */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Uso Accettabile
            </h2>
            
            <h3 className="text-xl font-medium text-gray-800 mb-3">
              5.1 Usi consentiti
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-6">
              <li>Ricerca legittima di potenziali clienti per attività commerciali</li>
              <li>Analisi tecnica di siti web per proposte di miglioramento</li>
              <li>Business development e attività di marketing B2B</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3">
              5.2 Usi vietati
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Spam, email marketing non sollecitato o comunicazioni massive non conformi</li>
              <li>Attività fraudolente o ingannevoli</li>
              <li>Violazione di leggi sulla privacy o protezione dei dati</li>
              <li>Reverse engineering o tentativo di compromettere la piattaforma</li>
              <li>Rivendita o redistribuzione dei dati ottenuti</li>
              <li>Uso per attività illegali o dannose</li>
            </ul>
          </section>

          {/* Proprietà intellettuale */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Proprietà Intellettuale
            </h2>
            <p className="text-gray-700 leading-7 mb-4">
              TrovaMi e tutti i suoi contenuti, funzionalità e caratteristiche sono di proprietà esclusiva 
              di TrovaMi e sono protetti da copyright, marchi commerciali e altre leggi sulla proprietà intellettuale.
            </p>
            <p className="text-gray-700 leading-7">
              Ti viene concessa una licenza limitata, non esclusiva e non trasferibile per utilizzare la piattaforma 
              esclusivamente per gli scopi previsti da questi Termini.
            </p>
          </section>

          {/* Responsabilità */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Limitazione di Responsabilità
            </h2>
            
            <h3 className="text-xl font-medium text-gray-800 mb-3">
              7.1 Disclaimer
            </h3>
            <p className="text-gray-700 leading-7 mb-4">
              I nostri servizi sono forniti "così come sono" senza garanzie di alcun tipo. 
              Non garantiamo che i servizi siano ininterrotti, privi di errori o che soddisfino 
              le tue specifiche esigenze.
            </p>

            <h3 className="text-xl font-medium text-gray-800 mb-3">
              7.2 Limitazioni
            </h3>
            <p className="text-gray-700 leading-7">
              In nessun caso TrovaMi sarà responsabile per danni indiretti, incidentali, 
              speciali o consequenziali derivanti dall'uso dei nostri servizi. La nostra 
              responsabilità totale non supererà l'importo pagato nei 12 mesi precedenti.
            </p>
          </section>

          {/* Conformità legale */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. Conformità e Responsabilità dell'Utente
            </h2>
            <p className="text-gray-700 leading-7 mb-4">
              L'utente è responsabile di:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Rispettare tutte le leggi applicabili nel contattare i lead</li>
              <li>Conformarsi al GDPR e altre normative sulla privacy</li>
              <li>Ottenere consensi necessari per comunicazioni di marketing</li>
              <li>Non utilizzare i dati per scopi diversi da quelli legittimi di business</li>
              <li>Rispettare le politiche anti-spam e di marketing diretto</li>
            </ul>
          </section>

          {/* Sospensione e terminazione */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Sospensione e Terminazione
            </h2>
            
            <h3 className="text-xl font-medium text-gray-800 mb-3">
              9.1 Da parte dell'utente
            </h3>
            <p className="text-gray-700 leading-7 mb-4">
              Puoi cancellare il tuo account in qualsiasi momento dalle impostazioni del profilo. 
              La cancellazione è effettiva alla fine del periodo di fatturazione corrente.
            </p>

            <h3 className="text-xl font-medium text-gray-800 mb-3">
              9.2 Da parte di TrovaMi
            </h3>
            <p className="text-gray-700 leading-7">
              Ci riserviamo il diritto di sospendere o terminare il tuo account in caso di 
              violazione di questi Termini, attività fraudolente o per motivi di sicurezza.
            </p>
          </section>

          {/* Modifiche */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. Modifiche ai Termini
            </h2>
            <p className="text-gray-700 leading-7">
              Ci riserviamo il diritto di modificare questi Termini in qualsiasi momento. 
              Le modifiche significative ti saranno notificate tramite email o avviso sulla piattaforma 
              con almeno 30 giorni di preavviso. L'uso continuato costituisce accettazione delle modifiche.
            </p>
          </section>

          {/* Legge applicabile */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              11. Legge Applicabile e Giurisdizione
            </h2>
            <p className="text-gray-700 leading-7">
              Questi Termini sono regolati dalla legge italiana. Qualsiasi controversia sarà 
              di competenza esclusiva del Tribunale di Milano, Italia.
            </p>
          </section>

          {/* Contatti */}
          <section className="bg-blue-50 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              12. Contatti per Questioni Legali
            </h2>
            <p className="text-gray-700 leading-7 mb-4">
              Per questioni relative a questi Termini di Servizio:
            </p>
            <div className="space-y-2 text-gray-700">
              <p><strong>Email:</strong> legal@trovami.pro</p>
              <p><strong>Indirizzo:</strong> TrovaMi, Via Roma 123, 20121 Milano, Italia</p>
              <p><strong>P.IVA:</strong> 07327360488</p>
            </div>
          </section>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <a 
            href="/privacy" 
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Privacy Policy
          </a>
          <a 
            href="/contact" 
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Contatti →
          </a>
        </div>
      </div>
    </div>
  )
}
