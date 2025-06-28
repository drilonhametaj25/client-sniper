/**
 * Pagina Privacy Policy - TrovaMi
 * Usato per: Informativa sulla privacy e trattamento dati
 * Chiamato da: Footer, link legali, registrazione utenti
 */

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | TrovaMi',
  description: 'Informativa sulla privacy di TrovaMi - Come raccogliamo, utilizziamo e proteggiamo i tuoi dati personali.',
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Privacy Policy
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
              1. Introduzione
            </h2>
            <p className="text-gray-700 leading-7">
              TrovaMi ("noi", "nostro" o "la Società") si impegna a proteggere la privacy degli utenti ("tu" o "l'Utente") 
              che utilizzano la nostra piattaforma per la ricerca di lead commerciali. Questa Privacy Policy spiega come 
              raccogliamo, utilizziamo, condividiamo e proteggiamo le tue informazioni personali.
            </p>
          </section>

          {/* Dati raccolti */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Informazioni che Raccogliamo
            </h2>
            
            <h3 className="text-xl font-medium text-gray-800 mb-3">
              2.1 Informazioni fornite dall'utente
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-6">
              <li>Indirizzo email per la registrazione</li>
              <li>Informazioni di pagamento (tramite Stripe, non conservate sui nostri server)</li>
              <li>Preferenze di utilizzo e impostazioni account</li>
              <li>Comunicazioni con il nostro supporto clienti</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3">
              2.2 Informazioni raccolte automaticamente
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Indirizzo IP e geolocalizzazione approssimativa</li>
              <li>Informazioni sul dispositivo e browser utilizzato</li>
              <li>Dati di utilizzo della piattaforma (pagine visitate, funzioni utilizzate)</li>
              <li>Cookie e tecnologie di tracciamento simili</li>
            </ul>
          </section>

          {/* Come utilizziamo i dati */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. Come Utilizziamo le Tue Informazioni
            </h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Fornire e migliorare i nostri servizi di ricerca lead</li>
              <li>Gestire il tuo account e le preferenze</li>
              <li>Processare pagamenti e gestire fatturazione</li>
              <li>Inviare comunicazioni di servizio e aggiornamenti</li>
              <li>Fornire supporto clienti</li>
              <li>Analizzare l'utilizzo per migliorare la piattaforma</li>
              <li>Garantire sicurezza e prevenire frodi</li>
              <li>Rispettare obblighi legali e normativi</li>
            </ul>
          </section>

          {/* Condivisione dati */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Condivisione delle Informazioni
            </h2>
            <p className="text-gray-700 leading-7 mb-4">
              Non vendiamo, affittiamo o condividiamo le tue informazioni personali con terze parti, 
              eccetto nei seguenti casi:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Fornitori di servizi:</strong> Stripe per pagamenti, Supabase per database, Vercel per hosting</li>
              <li><strong>Obblighi legali:</strong> Quando richiesto da autorità competenti</li>
              <li><strong>Consenso:</strong> Quando hai dato esplicito consenso</li>
              <li><strong>Protezione dei diritti:</strong> Per far valere i nostri diritti legali</li>
            </ul>
          </section>

          {/* Lead e dati pubblici */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Dati dei Lead e Informazioni Pubbliche
            </h2>
            <p className="text-gray-700 leading-7">
              I lead forniti dalla nostra piattaforma sono raccolti da fonti pubblicamente disponibili 
              (Google Maps, siti web pubblici, directory aziendali). Non accediamo a informazioni private 
              o riservate. Gli utenti sono responsabili dell'uso conforme alle leggi sulla privacy 
              quando contattano i lead forniti.
            </p>
          </section>

          {/* Sicurezza */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Sicurezza dei Dati
            </h2>
            <p className="text-gray-700 leading-7">
              Implementiamo misure di sicurezza tecniche e organizzative appropriate per proteggere 
              le tue informazioni personali contro accesso non autorizzato, alterazione, divulgazione 
              o distruzione. Utilizziamo crittografia HTTPS, autenticazione sicura e controlli di accesso rigorosi.
            </p>
          </section>

          {/* Cookie */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Cookie e Tecnologie di Tracciamento
            </h2>
            <p className="text-gray-700 leading-7 mb-4">
              Utilizziamo cookie e tecnologie simili per:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Mantenere la sessione di login</li>
              <li>Ricordare le preferenze dell'utente</li>
              <li>Analizzare le performance del sito</li>
              <li>Fornire funzionalità personalizzate</li>
            </ul>
            <p className="text-gray-700 leading-7 mt-4">
              Puoi gestire le preferenze dei cookie nelle impostazioni del tuo browser.
            </p>
          </section>

          {/* Diritti GDPR */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. I Tuoi Diritti (GDPR)
            </h2>
            <p className="text-gray-700 leading-7 mb-4">
              Se sei un residente dell'UE, hai i seguenti diritti:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Accesso:</strong> Richiedere una copia dei tuoi dati personali</li>
              <li><strong>Rettifica:</strong> Correggere dati inesatti o incompleti</li>
              <li><strong>Cancellazione:</strong> Richiedere la cancellazione dei tuoi dati</li>
              <li><strong>Portabilità:</strong> Ricevere i tuoi dati in formato strutturato</li>
              <li><strong>Limitazione:</strong> Limitare il trattamento dei tuoi dati</li>
              <li><strong>Opposizione:</strong> Opporti al trattamento per motivi legittimi</li>
            </ul>
          </section>

          {/* Ritenzione dati */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Conservazione dei Dati
            </h2>
            <p className="text-gray-700 leading-7">
              Conserviamo le tue informazioni personali solo per il tempo necessario a fornire i nostri servizi 
              e rispettare gli obblighi legali. I dati dell'account vengono eliminati entro 30 giorni dalla 
              cancellazione richiesta dall'utente.
            </p>
          </section>

          {/* Modifiche */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. Modifiche a questa Privacy Policy
            </h2>
            <p className="text-gray-700 leading-7">
              Ci riserviamo il diritto di aggiornare questa Privacy Policy periodicamente. 
              Ti notificheremo eventuali modifiche significative tramite email o avviso sulla piattaforma. 
              L'uso continuato dei nostri servizi dopo le modifiche costituisce accettazione della nuova policy.
            </p>
          </section>

          {/* Contatti */}
          <section className="bg-blue-50 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              11. Contattaci
            </h2>
            <p className="text-gray-700 leading-7 mb-4">
              Per domande riguardo questa Privacy Policy o per esercitare i tuoi diritti, contattaci:
            </p>
            <div className="space-y-2 text-gray-700">
              <p><strong>Email:</strong> privacy@trovami.pro</p>
              <p><strong>Indirizzo:</strong> TrovaMi, Via Roma 123, 20121 Milano, Italia</p>
              <p><strong>Data Protection Officer:</strong> dpo@trovami.pro</p>
            </div>
          </section>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <a 
            href="/" 
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Torna alla Homepage
          </a>
          <a 
            href="/terms" 
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Termini di Servizio →
          </a>
        </div>
      </div>
    </div>
  )
}
