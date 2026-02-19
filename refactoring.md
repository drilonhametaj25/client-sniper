# 🔧 TrovaMi.pro — Prompt di Refactoring Completo per Claude Code

> **Stack:** Next.js + TypeScript
> **Obiettivo:** Trasformare TrovaMi da "database di lead da sbloccare" a "macchina di proposte commerciali pronte all'uso" che converte utenti free in paganti.
> **Filosofia:** L'utente non compra lead — compra clienti pronti. Ogni interazione deve avvicinarlo al momento "ho mandato una proposta e mi hanno risposto".

---

## 📋 INDICE

1. [Contesto e Problema](#1-contesto-e-problema)
2. [Nuova Architettura del Funnel](#2-nuova-architettura-del-funnel)
3. [Refactoring Landing Page](#3-refactoring-landing-page)
4. [Refactoring Dashboard](#4-refactoring-dashboard)
5. [Sistema Lead & Proposte](#5-sistema-lead--proposte)
6. [Report PDF Brandizzabile](#6-report-pdf-brandizzabile)
7. [Template di Outreach](#7-template-di-outreach)
8. [Nuovo Pricing](#8-nuovo-pricing)
9. [Onboarding Flow](#9-onboarding-flow)
10. [Feature "Opportunità Vicino a Te"](#10-feature-opportunità-vicino-a-te)
11. [CRM & Tracking](#11-crm--tracking)
12. [Blog & SEO](#12-blog--seo)
13. [Metriche & Analytics Interni](#13-metriche--analytics-interni)
14. [Checklist di Implementazione](#14-checklist-di-implementazione)

---

## 1. CONTESTO E PROBLEMA

### Situazione attuale
- ~230 utenti attivi/mese, 83% traffico diretto, 15% organic
- 0 clienti paganti
- Sistema a crediti per sbloccare lead — gli utenti comprano "al buio"
- Template di outreach generici e troppo formali per il mercato italiano
- Landing page con metriche gonfiate (5000+ audit, "centinaia di agenzie") che danneggiano la credibilità
- Piano free troppo scarno per dimostrare valore, troppi tier di pricing
- I dati da scraping non sono sempre accurati — rischio reputazionale per l'utente

### Problemi core da risolvere
1. **Nessuno compra lead al buio** → I lead devono essere visibili, il paywall va su report/proposta
2. **Il cold outreach in Italia è visto male** → Template umani + supporto al "drop-in" locale con PDF stampabile
3. **L'utente free non raggiunge mai il momento "aha"** → Deve ricevere 1 pacchetto completo gratuito per capire il valore
4. **Troppi step tra "vedo il lead" e "contatto il lead"** → Massimo 2-3 click dal lead alla proposta inviata
5. **Dati inaccurati non segnalati** → Sistema di confidence level per ogni dato

---

## 2. NUOVA ARCHITETTURA DEL FUNNEL

### Percorso utente ideale (da implementare)

```
VISITATORE → Landing Page
  ↓
  Vede demo live: inserisce URL → vede scan in 30 secondi
  ↓
  Si registra (gratis)
  ↓
ONBOARDING (nuovo — 3 step)
  1. "Qual è la tua specializzazione?" (Web dev, SEO, Marketing, Design, Altro)
  2. "In che zona operi?" (città/provincia)
  3. "Carica il tuo logo" (opzionale, per brandizzare i report)
  ↓
DASHBOARD — vede subito 3-5 opportunità nella sua zona
  ↓
  Clicca su un'opportunità → vede info base (nome, settore, problema principale)
  ↓
  Clicca "Prepara Proposta" → vede report completo + template + PDF
  ↓
  Piano FREE: 1 proposta completa/settimana
  Piano STARTER: 25 proposte/mese
  Piano AGENCY: illimitate
  ↓
  L'utente manda la proposta → TrovaMi chiede "come è andata?"
  ↓
  CONVERSIONE: "Vuoi mandare più proposte? Passa a Starter"
```

### Regola d'oro: Visibilità Progressiva a 2 livelli

**LIVELLO 1 — Lista lead (SEMPRE visibile, tutti i piani, nessun consumo):**
Dalla lista/griglia, l'utente vede per ogni lead: nome azienda, settore, città, score visivo (cerchio colorato), e il problema principale in UNA riga (es. "Non appare su Google"). Basta per capire se il lead è interessante. NON basta per contattarlo (niente telefono, email, indirizzo, analisi dettagliata).

**LIVELLO 2 — Dettaglio completo (CONSUMA 1 proposta dal piano):**
Quando l'utente clicca sul lead per entrare nel dettaglio, QUELLO è il momento in cui consuma 1 proposta. Dentro trova TUTTO: analisi tecnica completa, contatti (telefono, email, indirizzo), preventivo automatico con prezzi, template personalizzati (email/WhatsApp/LinkedIn/drop-in), report PDF brandizzabile.

**Perché funziona:** L'utente free vede 50 lead interessanti nella sua zona ma può aprirne solo 1 a settimana. Dalla lista sa già che sta aprendo "un ristorante a Napoli con score 12 che non appare su Google" — non compra al buio. La frustrazione positiva è: "ce ne sono tantissimi buoni e io ne posso vedere solo uno — devo fare l'upgrade."

**La differenza con il vecchio sistema:** Prima comprava crediti per sbloccare un nome misterioso (slot machine). Adesso sceglie consapevolmente quale opportunità approfondire (menu del ristorante).

---

## 3. REFACTORING LANDING PAGE

### Struttura nuova della homepage (`/` o `/landing`)

#### Hero Section
```
Headline: "Trova clienti nella tua zona con proposte pronte da inviare"
Subtitle: "TrovaMi analizza i siti web delle attività vicino a te, 
           trova i problemi e ti prepara una proposta commerciale 
           professionale da mandare in 2 click."
CTA primario: "Prova Gratis — Analizza un Sito Ora" → link a /tools/public-scan
CTA secondario: "Crea Account Gratuito" → /register
```

**IMPORTANTE:** Nessun numero gonfiato. Nessun "5000+ audit" o "centinaia di agenzie". Rimuovere completamente.

#### Sezione Demo Interattiva
Embed dello scan pubblico direttamente in homepage. L'utente inserisce un URL qualsiasi e vede il risultato in tempo reale. Questo è il hook principale — mostrare il valore prima di chiedere qualsiasi cosa.

```tsx
// Componente: PublicScanEmbed
// - Input URL con placeholder "Inserisci il sito di un'attività..."
// - Bottone "Analizza Gratis"
// - Risultato inline: score, problemi principali (top 3), CTA "Vuoi la proposta completa? Registrati"
// - Animazione di caricamento durante lo scan
// - Se l'utente non inserisce un URL, mostrare un esempio pre-caricato
//   con un'attività reale (es. un ristorante) per ispirare
```

#### Sezione "Come Funziona" (3 step visivi)
```
Step 1: "Scegli la tua zona" — Icona mappa
         "TrovaMi trova attività con problemi tecnici sui loro siti web nella tua città"

Step 2: "Ricevi la proposta pronta" — Icona documento
         "Per ogni attività ottieni: analisi completa, preventivo automatico, 
          template email/WhatsApp personalizzato e report PDF con il tuo logo"

Step 3: "Manda e chiudi il cliente" — Icona handshake
         "Invia la proposta in 2 click o stampala e consegnala di persona. 
          Un solo cliente ripaga mesi di abbonamento."
```

#### Sezione Esempio Reale
Mostrare un esempio REALE e completo di come appare un report (screenshot annotato o mockup interattivo). L'utente deve vedere:
- L'analisi tecnica con problemi evidenziati
- Il preventivo automatico con prezzi
- Il template email pronto
- Il PDF brandizzato

**NON mostrare**: confronti fuorvianti con Google Ads, statistiche inventate, numeri di conversione non verificati.

#### Sezione Social Proof (onesta)
```
Se ci sono utenti reali → testimonial vere con nome e foto
Se non ci sono ancora → rimuovere completamente la sezione
Alternativa: "Progetto open beta — i primi 100 utenti ricevono il piano Starter 
             gratuito per 30 giorni" (crea urgenza reale)
```

#### Sezione Pricing
Rimandare alla sezione pricing (vedi sezione 8 di questo prompt).

#### Footer
Rimuovere link social morti (Twitter "#", LinkedIn "#"). Mantenere solo link funzionanti.

### Tono di voce della landing page
- Diretto, concreto, italiano naturale
- Mai "Gentile", mai linguaggio corporate
- Parlare al "tu" non al "voi"
- Ogni frase deve rispondere alla domanda "e io che ci guadagno?"
- Zero buzzword: niente "intelligence", "algoritmi proprietari", "scoring avanzato"

---

## 4. REFACTORING DASHBOARD

### Layout nuovo della Dashboard (`/dashboard`)

#### Header della Dashboard
```
"Ciao [Nome], ecco le opportunità di oggi nella tua zona"
[Città selezionata] [Nicchia selezionata] — [Modifica preferenze]
```

#### Barra di stato account
```tsx
// Componente: AccountStatusBar
// Piano FREE:  "1 proposta completa disponibile questa settimana" + progress bar
// Piano STARTER: "18/25 proposte rimaste questo mese" + progress bar
// Piano AGENCY: "Piano Agency — proposte illimitate"
// Quando le proposte sono finite: "Hai usato tutte le proposte. Upgrade per continuare →"
```

#### Sezione principale: "Opportunità per te"
Sostituisce completamente "I tuoi Lead" con il sistema a crediti.

```tsx
// Componente: OpportunityGrid
// Layout: grid di card (max 3 per riga desktop, 1 su mobile)
//
// === LIVELLO 1: CARD NELLA LISTA (visibile a tutti, nessun consumo) ===
// Ogni card mostra SOLO:
//   - Nome azienda
//   - Settore (in italiano, non codici)
//   - Città
//   - Problema principale IN LINGUAGGIO UMANO in UNA riga (vedi mapping sotto)
//   - Score visivo (cerchio colorato: rosso <30, arancione 30-60, verde >60)
//   - Valore stimato dell'intervento ("Opportunità da €X - €Y")
//
// ❌ NON mostrare nella lista: telefono, email, indirizzo, sito web, analisi dettagliata
//
// CTA sulla card:
//   - Se ha proposte disponibili: "Vedi Dettaglio" (bottone primario)
//     → Cliccando CONSUMA 1 proposta e apre la pagina dettaglio completo
//     → Mostrare conferma: "Stai per usare 1 delle tue X proposte. Continuare?"
//   - Se ha esaurito proposte: "Vedi Dettaglio 🔒" → modale upgrade
//   
// ❌ ELIMINARE COMPLETAMENTE: 
//   - "Sblocca Lead"
//   - Sistema a crediti
//   - Contatore "Lead Disponibili: 9776"
//   - "Prossimo Reset" con data
```

#### Mapping problemi tecnici → linguaggio umano
```typescript
// Creare un mapping file: /lib/problem-translations.ts
const PROBLEM_TRANSLATIONS: Record<string, string> = {
  'missing_meta_description': 'Non appare con una descrizione su Google',
  'missing_h1': 'Google non capisce di cosa parla il sito',
  'slow_loading': 'Il sito è troppo lento — i visitatori se ne vanno',
  'not_mobile_friendly': 'Il sito non funziona bene da smartphone',
  'no_ssl': 'Il sito viene segnalato come "Non sicuro" dal browser',
  'no_analytics': 'Non può sapere quanti visitatori ha',
  'missing_privacy_policy': 'Non è a norma GDPR — rischia una multa',
  'no_structured_data': 'Non appare con stelle/info extra su Google',
  'missing_favicon': 'Appare senza icona nei browser — poco professionale',
  'no_facebook_pixel': 'Non può fare pubblicità mirata sui social',
  // ... completare con tutti i 78+ parametri
};

// Funzione per generare il "problema principale" da mostrare sulla card
function getMainProblem(auditResults: AuditResult[]): string {
  // Ordinare per severità, prendere il primo critico
  // Restituire la traduzione umana
}
```

#### Sezione "Esplora l'Italia"
```tsx
// Componente: ExploreSection
// Per chi vuole cercare oltre la propria zona
// - Barra di ricerca: "Cerca per città, regione o settore..."
// - Filtri rapidi: regione, provincia, settore, score range
// - Mappa interattiva dell'Italia con cluster di opportunità
// - Risultati in grid identica a OpportunityGrid
// Accessibile a TUTTI i piani — la limitazione è solo sulle proposte generate
```

#### Sidebar (desktop) / Bottom nav (mobile)
```
- Dashboard (home)
- Le Mie Proposte (storico proposte generate)
- CRM (solo Starter+Agency)
- Strumenti (Analisi Completa, SEO Checker, Tech Detector, Security Check, Accessibility)
- Account
```

---

## 5. SISTEMA LEAD & PROPOSTE

### Pagina dettaglio lead (`/leads/[id]`)

**IMPORTANTE: L'accesso a questa pagina CONSUMA 1 proposta dal piano dell'utente.**
Quando l'utente clicca "Vedi Dettaglio" dalla lista, mostrare una conferma:
"Stai per usare 1 delle tue X proposte rimaste. Otterrai: analisi completa, contatti, preventivo, template e report PDF. Continuare?"
Se conferma → entra e consuma. Se annulla → torna alla lista.
Una volta consumata, la pagina resta accessibile per sempre (non si paga due volte lo stesso lead).

#### Contenuto della pagina dettaglio (tutto visibile dopo il consumo)
```tsx
// TUTTO visibile dopo aver consumato la proposta:
// - Nome azienda
// - Settore
// - Città e indirizzo completo
// - Sito web (link cliccabile)
// - Telefono (se disponibile)
// - Email (se disponibile)
// - Score tecnico (grafico a cerchio)
// - Analisi tecnica completa con tutti i problemi trovati
// - Raccomandazioni per il cliente
// - Riepilogo: "X problemi critici, Y problemi importanti, Z miglioramenti"
// - Preventivo automatico completo con servizi e prezzi
// - Template personalizzati (Email, LinkedIn, WhatsApp, Cold Call, Drop-in script)
// - Bottone "Scarica Report PDF" (brandizzato con logo utente)
// - Bottone "Stampa Report" (versione ottimizzata per stampa/drop-in)
// - Bottone "Apri WhatsApp" (deep link con messaggio pre-compilato)
```

#### Sistema di Confidence Level
```tsx
// Componente: ConfidenceBadge
// Per ogni dato, mostrare un indicatore di affidabilità:
// ✅ "Verificato" — dato deterministico dallo scan tecnico (SSL, meta tag, velocità)
// ⚠️ "Da verificare" — dato da scraping che potrebbe non essere aggiornato (telefono, indirizzo)
// 
// Tooltip: "Questo dato proviene da fonti pubbliche e potrebbe non essere aggiornato. 
//           Ti consigliamo di verificarlo prima di contattare l'azienda."
//
// I dati tecnici dello scan sono SEMPRE verificati (li controlliamo noi in tempo reale)
// I dati anagrafici da Google Maps/directory POSSONO essere obsoleti
```

#### Eccezione: Prima proposta gratuita
```tsx
// Il PRIMO lead per ogni nuovo utente è SEMPRE gratuito e sbloccato
// Indipendentemente dal piano. Vedi sezione 9 (Onboarding).
//
// Logica:
// if (user.proposalsGenerated === 0) {
//   // Non mostrare la conferma di consumo
//   // Selezionare un lead con dati particolarmente buoni/completi
//   // nella zona dell'utente per massimizzare l'effetto wow
//   // Dopo l'apertura, mostrare banner di congratulazioni + CTA upgrade
// }
```

#### Azioni post-proposta
```tsx
// Dopo che l'utente genera/visualizza una proposta:
// Componente: PostProposalActions
//
// "Hai contattato [Nome Azienda]?"
// [Sì, via email] [Sì, via WhatsApp] [Sì, di persona] [Non ancora] [Non interessato]
//
// Se "Sì":
//   "Come è andata?"
//   [Mi ha risposto ✅] [Nessuna risposta] [Ha detto no]
//   Se "Mi ha risposto": [Ho chiuso il lavoro! 🎉] [Stiamo trattando] [Non ha comprato]
//
// Questi dati alimentano:
// 1. Le metriche interne (conversion rate reale dell'outreach)
// 2. Il CRM dell'utente (traccia lo stato del lead)
// 3. Eventuale social proof futuro ("X utenti hanno chiuso lavori con TrovaMi")
```

---

## 6. REPORT PDF BRANDIZZABILE

### Specifiche del PDF generato

```tsx
// Endpoint: /api/reports/generate
// Input: leadId, userId (per logo e info branding)
// Output: PDF scaricabile e stampabile

// STRUTTURA DEL REPORT:
//
// === PAGINA 1: COPERTINA ===
// - Logo dell'utente (se caricato, altrimenti layout senza logo)
// - Titolo: "Analisi Digitale — [Nome Azienda]"
// - Sottotitolo: "Report preparato da [Nome Freelancer/Agenzia]"
// - Data di generazione
// - Design pulito, professionale, minimalista
// - Colori personalizzabili (futuro) — default: blu/bianco
//
// === PAGINA 2: EXECUTIVE SUMMARY ===
// - Score complessivo (grafico grande, visivo)
// - I 3 problemi principali spiegati in linguaggio UMANO
//   NON: "Meta description mancante" 
//   SÌ:  "Quando qualcuno cerca la tua attività su Google, non trova 
//         nessuna descrizione. I potenziali clienti vedono solo il nome 
//         del sito e spesso scelgono un concorrente che ha una 
//         descrizione chiara di cosa offre."
// - Impatto stimato: "Questi problemi potrebbero costarti X-Y clienti al mese"
//
// === PAGINA 3: ANALISI DETTAGLIATA ===
// - Ogni problema trovato con:
//   - Spiegazione in italiano semplice
//   - Perché è un problema per il business (non tecnico)
//   - Livello di priorità (Critico / Importante / Consigliato)
//   - ✅ Verificato / ⚠️ Da verificare (confidence level)
//
// === PAGINA 4: PROPOSTA ECONOMICA ===
// - Lista servizi consigliati con prezzo
// - Pacchetto completo con sconto
// - Tempistiche stimate
// - NOTA: i prezzi devono essere realistici per il mercato locale
//   Non €7.438 per un ristorante di Napoli — calibrare in base alla tipologia
//
// === PAGINA 5: PROSSIMI PASSI ===
// - "Per risolvere questi problemi e iniziare a ricevere più clienti online:"
// - CTA: "Rispondi a questa email" / "Chiamami al [numero]"
// - Info di contatto del freelancer
// - Nota rassicurante: "La prima consulenza è gratuita e senza impegno"
//
// === FOOTER DI OGNI PAGINA ===
// - "Report generato da [Nome Freelancer]" 
// - ❌ NON mostrare "Powered by TrovaMi" — il freelancer deve sembrare 
//   lui l'esperto, non uno che usa un tool. Opzionale in piccolo nel footer.
```

### Versione stampa
```tsx
// Endpoint: /api/reports/generate?format=print
// Differenze dalla versione digitale:
// - Colori ottimizzati per stampa (niente sfondi scuri)
// - Font più grandi per leggibilità
// - QR code nella pagina "Prossimi Passi" che linka al sito del freelancer
// - Formato A4
// - Margini adatti alla stampa
```

---

## 7. TEMPLATE DI OUTREACH

### Principi per i template
1. **Brevi** — massimo 5-6 righe per email, 2-3 per WhatsApp
2. **Umani** — niente "Gentile Responsabile", niente linguaggio corporate
3. **Specifici** — devono menzionare il problema reale trovato
4. **Con valore immediato** — il report è allegato/linkato, non promesso
5. **Senza pressione** — "se ti interessa, altrimenti nessun problema"

### Template Email — Nuovo
```typescript
// File: /lib/templates/email.ts
// Il template deve essere generato dinamicamente basandosi su:
// - Nome azienda
// - Nome titolare (se disponibile, altrimenti omettere)
// - Settore dell'azienda
// - Problema principale trovato (in linguaggio umano)
// - Città

const emailTemplate = (lead: Lead, user: User) => `
Oggetto: Ho notato un problema sul sito di ${lead.companyName}

Ciao${lead.ownerName ? ` ${lead.ownerName}` : ''},

mi chiamo ${user.name} e mi occupo di ${user.specialization} a ${user.city}.

Ho dato un'occhiata al sito di ${lead.companyName} e ho notato che ${getMainProblemHuman(lead)}. È un peccato perché ${getBusinessImpact(lead)}.

Ho preparato un'analisi gratuita con i punti principali — la trovi in allegato.

Se ti interessa capire come risolvere, sono disponibile per una chiacchierata di 15 minuti senza impegno. Altrimenti, nessun problema!

Buona giornata,
${user.name}
${user.phone || ''}
${user.website || ''}
`;
```

### Template WhatsApp — Nuovo
```typescript
// File: /lib/templates/whatsapp.ts
// WhatsApp DEVE essere cortissimo — 2-3 righe max

const whatsappTemplate = (lead: Lead, user: User) => `
Ciao! Mi chiamo ${user.name}, mi occupo di siti web a ${user.city}. Ho notato che il sito di ${lead.companyName} ${getMainProblemShort(lead)} — ho preparato un'analisi gratuita, posso mandartela? 😊
`;
```

### Template LinkedIn — Nuovo
```typescript
// File: /lib/templates/linkedin.ts

const linkedinTemplate = (lead: Lead, user: User) => `
Ciao ${lead.ownerName || ''},

ho visto il sito di ${lead.companyName} e mi è sembrato che ci fossero un paio di cose che potrebbero migliorare la vostra visibilità online.

Ho preparato un'analisi rapida — se ti fa piacere te la mando, senza impegno.

${user.name}
`;
```

### Template Drop-in (script per visita di persona)
```typescript
// File: /lib/templates/dropin.ts
// Questo appare come "guida" nella piattaforma — non è un messaggio da copiare
// ma uno script conversazionale per chi fa il drop-in

const dropinScript = (lead: Lead) => `
📍 SCRIPT PER VISITA DI PERSONA

Quando entri da ${lead.companyName}:

1. Presentati con nome e cognome
2. Di': "Ho dato un'occhiata al vostro sito e ho notato un paio di cose 
   che vi fanno perdere clienti online. Vi ho preparato un report gratuito 
   — ve lo lascio, dateci un'occhiata con calma."
3. Lascia il report stampato
4. Aggiungi: "Se vi interessa capirne di più, il mio numero è sul report. 
   Una chiacchierata di 15 minuti, senza impegno."
5. Saluta e vai — NON insistere

⏱️ Tutta la conversazione: massimo 2 minuti
📄 Ricordati di stampare il report PRIMA di uscire
`;
```

---

## 8. NUOVO PRICING

### Struttura a 3 piani

```tsx
// Pagina: /pricing
// Layout: 3 colonne (Free, Starter, Agency)
// Il piano "Starter" è evidenziato come "Più popolare"

const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    badge: null,
    headline: 'Per iniziare',
    features: [
      'Esplora tutti i lead in Italia — info base sempre visibili',
      '1 proposta completa a settimana (report + template + PDF)',
      'Scan pubblico illimitato di qualsiasi sito',
      '1 nicchia/settore',
      'Template email e WhatsApp',
    ],
    limitations: [
      // Mostrare chiaramente cosa NON include
      'CRM non incluso',
      'Report senza logo personalizzato',
      'Nessun export CSV',
    ],
    cta: 'Inizia Gratis',
  },
  
  starter: {
    name: 'Starter',
    price: 19, // Ridotto da €29 per abbassare la barriera
    originalPrice: 29,
    badge: 'Più Popolare',
    headline: 'Per freelancer seri',
    features: [
      'Tutto di Free, più:',
      '25 proposte complete al mese',
      'Report PDF con il TUO logo',
      'Tutte le nicchie/settori',
      'CRM integrato per tracciare i contatti',
      'Alert giornalieri su nuove opportunità',
      'Export CSV/Excel',
      'Storico completo dei lead analizzati',
    ],
    highlightText: 'Se chiudi anche 1 solo cliente al mese, il tool si ripaga 50 volte.',
    cta: 'Inizia con 14 giorni gratis',
  },
  
  agency: {
    name: 'Agency',
    price: 99,
    originalPrice: 149,
    badge: 'Per team',
    headline: 'Per agenzie e team',
    features: [
      'Tutto di Starter, più:',
      'Proposte illimitate',
      'Report white-label completo (nessun riferimento a TrovaMi)',
      'CRM avanzato con pipeline personalizzabile',
      'Accesso API',
      'Supporto prioritario',
      'Onboarding personalizzato',
    ],
    cta: 'Contattaci',
  },
};
```

### Regole pricing
- **Trial 14 giorni** per il piano Starter — l'utente prova il valore pieno senza rischio
- **NO sistema a crediti** — solo conteggio proposte/mese
- **Upgrade/downgrade** in qualsiasi momento
- **Cancellazione** con un click, senza telefonate o email
- Mostrare il calcolo ROI: "€19/mese ÷ 25 proposte = €0,76 per proposta. Un singolo cliente vale €500-5.000."

### Cosa cambia rispetto a prima
```
❌ RIMUOVERE:
- Piano "Pro" a €49 (confonde con Starter)
- Sistema a crediti
- "Pacchetti di crediti" aggiuntivi
- 4 tier di pricing
- "Lead Sbloccati" come metrica
- "Prossimo Reset" con countdown
- "Early Adopter" badge (poco credibile senza utenti)

✅ AGGIUNGERE:
- Trial 14 giorni su Starter
- Conteggio proposte (non crediti)
- Calcolo ROI trasparente
- Confronto chiaro tra piani
```

---

## 9. ONBOARDING FLOW

### Flusso dopo la registrazione (`/onboarding`)

```tsx
// Step 1 di 4: Presentazione
// Schermata: "Benvenuto su TrovaMi! Configuriamo il tuo account in 1 minuto."

// Step 2 di 4: Specializzazione
// "Cosa fai di bello?"
// Opzioni (multi-select):
// - Sviluppo web
// - SEO & Posizionamento
// - Social media marketing
// - Design & Branding  
// - Consulenza digitale
// - Altro: [campo libero]
//
// Questo dato serve per:
// - Personalizzare i lead suggeriti
// - Adattare i template (un SEO specialist ha un pitch diverso da un web dev)
// - Calibrare i servizi nel preventivo automatico

// Step 3 di 4: Zona
// "Dove operi?"
// - Campo autocomplete con città italiane
// - Possibilità di selezionare più zone
// - Checkbox: "Lavoro anche da remoto per tutta Italia"
//
// Questo dato serve per:
// - Sezione "Opportunità per te" nella dashboard
// - Feature "Vicino a te" (geolocalizzazione)

// Step 4 di 4: Branding (opzionale)
// "Vuoi personalizzare i report con il tuo brand?"
// - Upload logo (drag & drop, max 2MB, PNG/JPG/SVG)
// - Nome azienda/freelancer (pre-compilato da registrazione)
// - Telefono di contatto (per inserirlo nei report)
// - Sito web personale
// - "Puoi completare dopo nelle impostazioni"

// DOPO L'ONBOARDING:
// Redirect a dashboard con la prima opportunità GIÀ SBLOCCATA
// Banner: "🎁 La tua prima proposta completa è gratis — provalo ora!"
// La prima card ha il bottone "Prepara Proposta" già attivo
// L'utente clicca → vede il report completo → capisce il valore
```

### Prima esperienza (critica per la conversione)
```tsx
// Il PRIMO lead completo per ogni nuovo utente è SEMPRE gratuito e sbloccato
// Indipendentemente dal piano.
//
// Logica:
// if (user.proposalsGenerated === 0) {
//   // Prima proposta: sempre gratis, anche per utenti free
//   // Selezionare un lead con dati particolarmente buoni/completi
//   // nella zona dell'utente per massimizzare l'effetto wow
// }
//
// Dopo la prima proposta generata, mostrare:
// "Hai appena creato la tua prima proposta professionale! 🎉
//  Se mandi questo report a [Nome Azienda] e chiudi anche solo 
//  una consulenza da €500, hai fatto 25x l'investimento del piano Starter.
//  [Passa a Starter — 14 giorni gratis]"
```

---

## 10. FEATURE "OPPORTUNITÀ VICINO A TE"

### Concetto
Usare la geolocalizzazione per mostrare opportunità nel raggio di pochi km dall'utente. Pensato per il "drop-in" locale — il freelancer è in giro, apre l'app, vede che il negozio accanto ha un sito pessimo, genera il report, entra e lo consegna.

```tsx
// Pagina: /nearby o sezione nella dashboard
// Componente: NearbyOpportunities

// 1. Richiedere geolocalizzazione browser (con fallback su città dell'onboarding)
// 2. Query lead nel raggio di 5km (configurabile: 1km, 5km, 10km, 25km)
// 3. Mostrare su mappa (Google Maps embed o Mapbox)
//    - Pin per ogni lead con score (colore del pin = severity)
//    - Cluster quando troppi ravvicinati
// 4. Lista affiancata alla mappa con le stesse card di OpportunityGrid
// 5. Filtro per settore
// 6. Ordinamento: "Più vicini" / "Più opportunità" / "Score più basso"

// Versione mobile-first:
// - Mappa a schermo intero con lista bottom-sheet draggable
// - Swipe per navigare tra le opportunità
// - Bottone "Genera Report" → scarica PDF direttamente su telefono
// - Bottone "Apri in Google Maps" per navigare fino all'attività
```

---

## 11. CRM & TRACKING

### CRM (Starter + Agency)

```tsx
// Pagina: /crm
// Il CRM si popola automaticamente quando l'utente genera una proposta
// o interagisce con un lead tramite le PostProposalActions

// Pipeline visiva (stile Kanban):
// Colonne:
// - "Proposta Preparata" (report generato ma non ancora inviato)
// - "Contattato" (l'utente ha segnalato di aver mandato la proposta)
// - "In Trattativa" (il lead ha risposto positivamente)
// - "Chiuso ✅" (lavoro ottenuto)
// - "Perso" (non interessato)

// Ogni card nel CRM mostra:
// - Nome azienda
// - Valore stimato dell'opportunità
// - Data ultimo contatto
// - Canale usato (email/whatsapp/persona/linkedin)
// - Note libere dell'utente

// Il CRM per utenti FREE non è disponibile — mostrare preview blurred
// con CTA: "Traccia i tuoi contatti con il CRM — Passa a Starter"
```

### Tracking eventi (interno, per analytics di prodotto)
```tsx
// Tracciare in database (non GA) gli eventi chiave:
// - proposal_generated (userId, leadId, plan, timestamp)
// - proposal_downloaded_pdf (userId, leadId)
// - proposal_printed (userId, leadId)
// - outreach_sent (userId, leadId, channel: email|whatsapp|linkedin|dropin)
// - outreach_responded (userId, leadId, outcome: positive|negative|no_response)
// - deal_closed (userId, leadId, estimatedValue)
//
// Questi dati sono FONDAMENTALI per:
// 1. Capire dove il funnel si blocca
// 2. Calcolare il reale conversion rate dell'outreach
// 3. Creare social proof basato su dati veri
// 4. Decidere se il product-market fit c'è
```

---

## 12. BLOG, SEO & TOOL GRATUITI — LA MACCHINA DA GUERRA

### Filosofia
TrovaMi ha un asset incredibile che non sta sfruttando: i tool gratuiti (Analisi Completa, SEO Checker, Tech Detector, Security Check, Accessibility). Ognuno di questi è una porta d'ingresso organica. L'obiettivo è posizionarsi su Google per decine di keyword italiane, portare traffico qualificato ai tool gratuiti, e convertire una percentuale di quei visitatori in utenti registrati.

### Architettura SEO del sito

```
trovami.pro/                          → Landing page principale
trovami.pro/tools/                    → Hub dei tool gratuiti (pagina indice)
trovami.pro/tools/analisi-sito-web    → Tool: Analisi Completa (rinominato per SEO)
trovami.pro/tools/seo-checker         → Tool: SEO Checker
trovami.pro/tools/tech-detector       → Tool: Tech Detector
trovami.pro/tools/security-check      → Tool: Security Check
trovami.pro/tools/accessibilita       → Tool: Accessibility (in italiano!)
trovami.pro/blog/                     → Hub del blog
trovami.pro/blog/[slug]               → Singolo articolo
trovami.pro/risorse/                  → Hub risorse (template, guide PDF, checklist)
trovami.pro/risorse/[slug]            → Singola risorsa
```

### I TOOL GRATUITI COME MAGNETI SEO

Ogni tool gratuito deve avere la propria landing page ottimizzata, non solo il tool funzionante. La struttura di ogni pagina tool:

```tsx
// Pagina: /tools/[tool-slug]
// Struttura:
//
// === ABOVE THE FOLD ===
// H1 con keyword principale (es. "Analisi SEO Gratuita del Tuo Sito Web")
// Sottotitolo che spiega il beneficio (es. "Scopri in 30 secondi perché il tuo sito 
//   non appare su Google e cosa fare per risolvere")
// IL TOOL FUNZIONANTE — input URL + bottone "Analizza"
// Il tool deve essere usabile SENZA registrazione
//
// === RISULTATO DELLO SCAN ===
// Mostrare risultati parziali (score + top 3 problemi)
// Per il report completo: "Registrati gratis per vedere tutti i 78 parametri analizzati"
// CTA: "Crea Account Gratuito"
//
// === BELOW THE FOLD (contenuto SEO) ===
// Sezione "Come funziona [nome tool]" — 300+ parole
// Sezione "Cosa analizziamo" — lista dei parametri con spiegazione
// Sezione FAQ (5-8 domande) con Schema markup FAQPage
// Sezione "Tool correlati" con link agli altri tool
// CTA finale: "Vuoi trovare clienti che hanno questi problemi? Prova TrovaMi"
```

#### Tool 1: Analisi Sito Web Gratuita (`/tools/analisi-sito-web`)
```
URL attuale: /tools/public-scan → REDIRECT 301 a /tools/analisi-sito-web

H1: "Analisi Sito Web Gratuita — Audit Completo in 30 Secondi"
Meta Title: "Analisi Sito Web Gratuita Online | Audit SEO, Velocità e Sicurezza — TrovaMi"
Meta Description: "Analizza gratis il tuo sito web: SEO, velocità, sicurezza, mobile e GDPR. 
                   Report immediato con problemi e soluzioni. Nessuna registrazione richiesta."

Keywords target:
- "analisi sito web gratuita" (volume alto)
- "audit sito web gratis"
- "analisi seo sito web"
- "controllare sito web"
- "test sito web"
- "verifica sito web"
```

#### Tool 2: SEO Checker (`/tools/seo-checker`)
```
H1: "SEO Checker Gratuito — Verifica il Posizionamento del Tuo Sito"
Meta Title: "SEO Checker Gratuito Online | Analisi SEO On-Page Completa — TrovaMi"
Meta Description: "Controlla gratis il SEO del tuo sito: meta tag, heading, immagini, 
                   link interni e contenuti. Report istantaneo con punteggio e consigli."

Keywords target:
- "seo checker gratuito"
- "verifica seo sito"
- "analisi seo gratuita"
- "controllo seo online"
- "test seo sito web"
- "seo audit gratis"
```

#### Tool 3: Tech Detector (`/tools/tech-detector`)
```
H1: "Scopri le Tecnologie di Qualsiasi Sito Web"
Meta Title: "Tech Detector — Scopri CMS, Framework e Tecnologie di un Sito Web — TrovaMi"
Meta Description: "Rileva gratis le tecnologie usate da qualsiasi sito: CMS, framework, 
                   hosting, analytics, plugin. Simile a BuiltWith e Wappalyzer, in italiano."

Keywords target:
- "scoprire tecnologie sito web"
- "con cosa è fatto un sito"
- "che cms usa un sito"
- "rilevare tecnologie sito"
- "alternative builtwith italiano"
- "wappalyzer alternativa"
```

#### Tool 4: Security Check (`/tools/security-check`)
```
H1: "Controllo Sicurezza Sito Web Gratuito"
Meta Title: "Security Check Sito Web Gratuito | Verifica SSL, HTTPS e Vulnerabilità — TrovaMi"
Meta Description: "Verifica gratis la sicurezza del tuo sito web: certificato SSL, HTTPS, 
                   header di sicurezza, vulnerabilità note. Report immediato."

Keywords target:
- "controllo sicurezza sito web"
- "verifica ssl sito"
- "test sicurezza sito"
- "sito sicuro verifica"
- "https checker"
```

#### Tool 5: Accessibilità (`/tools/accessibilita`)
```
H1: "Test Accessibilità Sito Web — Verifica WCAG Gratuita"
Meta Title: "Test Accessibilità Sito Web Gratuito | Verifica WCAG e A11y — TrovaMi"
Meta Description: "Controlla gratis l'accessibilità del tuo sito web secondo gli standard 
                   WCAG 2.1. Identifica barriere per utenti con disabilità e come risolverle."

Keywords target:
- "test accessibilità sito web"
- "verifica wcag"
- "accessibilità sito web"
- "audit accessibilità"
- "wcag checker italiano"
```

#### Pagina Hub Tool (`/tools`)
```
H1: "Strumenti Gratuiti per Analizzare il Tuo Sito Web"
Meta Title: "Tool Gratuiti Analisi Sito Web | SEO, Sicurezza, Velocità, Accessibilità — TrovaMi"
Meta Description: "5 strumenti gratuiti per analizzare il tuo sito web: audit completo, 
                   SEO checker, tech detector, security check e test accessibilità."

Layout: grid con card per ogni tool, ognuna con:
- Nome tool
- Descrizione in 1 riga
- Icona
- Bottone "Usa gratis"
- Sotto: "Nessuna registrazione richiesta"

Schema markup: SoftwareApplication per ogni tool
```

### STRATEGIA BLOG

#### Struttura articoli
Ogni articolo segue questa struttura:

```tsx
// Template articolo blog:
//
// 1. H1 con keyword principale
// 2. Intro (2-3 righe) che risponde subito alla domanda dell'utente
// 3. Sommario/indice cliccabile (per articoli lunghi)
// 4. Contenuto principale (1500-2500 parole)
//    - Sottosezioni con H2/H3 ottimizzati per keyword correlate
//    - Esempi pratici e concreti
//    - Screenshot dove utile
// 5. CTA mid-article (dopo ~500 parole):
//    Box evidenziato: "Vuoi verificare subito il tuo sito? 
//    Usa il nostro [Tool Gratuito] →" (link al tool pertinente)
// 6. Resto del contenuto
// 7. Sezione "In sintesi" o conclusione
// 8. CTA finale:
//    "Se sei un freelancer o un'agenzia e vuoi trovare clienti 
//    che hanno questi problemi, prova TrovaMi gratis →"
// 9. Articoli correlati (3 link)
//
// SEO per ogni articolo:
// - Meta title (max 60 char) con keyword
// - Meta description (max 155 char) con CTA
// - URL slug pulito e breve
// - Schema markup Article
// - Open Graph image personalizzata
// - Internal link ad almeno 2 altri articoli + 1 tool
```

#### Piano editoriale — Prima batch (20 articoli)

**CLUSTER 1: "Come trovare clienti" (keyword ad alto volume)**
```
1. "Come Trovare Clienti da Freelancer: Guida Pratica 2026"
   Keywords: come trovare clienti freelancer, trovare clienti freelance
   CTA → Registrazione TrovaMi
   
2. "Come Trovare Clienti per la Tua Web Agency: 7 Strategie che Funzionano"
   Keywords: trovare clienti web agency, clienti agenzia web
   CTA → Registrazione TrovaMi

3. "Come Trovare Clienti Online: La Guida Completa per Professionisti"
   Keywords: trovare clienti online, acquisire clienti online
   CTA → Registrazione TrovaMi

4. "Cold Email in Italia: Funziona Davvero? Guida con Template"
   Keywords: cold email italia, cold email template italiano
   CTA → Template gratuiti TrovaMi

5. "Come Vendere Servizi Web a Piccole Aziende Locali"
   Keywords: vendere servizi web, clienti locali
   CTA → Feature "Vicino a te"
```

**CLUSTER 2: "Audit e analisi sito web" (keyword che portano ai tool)**
```
6. "Come Fare un Audit SEO Completo: Guida Step-by-Step"
   Keywords: audit seo, come fare audit seo
   CTA → Tool SEO Checker

7. "Analisi Sito Web: Cosa Controllare e Perché"
   Keywords: analisi sito web, controllare sito web
   CTA → Tool Analisi Sito Web

8. "Core Web Vitals: Cosa Sono e Come Migliorarli"
   Keywords: core web vitals, velocità sito web
   CTA → Tool Analisi Sito Web

9. "Come Verificare se un Sito è Sicuro: Guida Completa"
   Keywords: verificare sicurezza sito, sito sicuro
   CTA → Tool Security Check

10. "Accessibilità Web: Perché è Importante e Come Verificarla"
    Keywords: accessibilità sito web, wcag italia
    CTA → Tool Accessibilità

11. "Che CMS Usa un Sito Web? Come Scoprirlo in 10 Secondi"
    Keywords: che cms usa un sito, scoprire tecnologie sito
    CTA → Tool Tech Detector
```

**CLUSTER 3: "Proposte e preventivi" (keyword ad alto intent commerciale)**
```
12. "Template Preventivo Sito Web: Esempio Pronto da Usare"
    Keywords: preventivo sito web, template preventivo
    CTA → Report PDF TrovaMi (esempio scaricabile come lead magnet)

13. "Come Scrivere una Proposta Commerciale per Servizi Web"
    Keywords: proposta commerciale siti web, proposta digitale
    CTA → Report PDF TrovaMi

14. "Quanto Costa un Sito Web nel 2026? Guida ai Prezzi"
    Keywords: quanto costa sito web, prezzi sito web
    CTA → Preventivo automatico TrovaMi

15. "Quanto Costa il SEO? Listino Prezzi e Come Quotare"
    Keywords: quanto costa seo, prezzi seo
    CTA → Preventivo automatico TrovaMi
```

**CLUSTER 4: "Problemi comuni dei siti" (keyword educative che creano awareness)**
```
16. "Il Tuo Sito Non Appare su Google? Ecco 8 Motivi e Come Risolvere"
    Keywords: sito non appare su google, sito non indicizzato
    CTA → Tool SEO Checker

17. "Sito Web Lento: Cause, Soluzioni e Come Testare la Velocità"
    Keywords: sito web lento, migliorare velocità sito
    CTA → Tool Analisi Sito Web

18. "GDPR e Siti Web: Cosa Serve per Essere a Norma nel 2026"
    Keywords: gdpr sito web, cookie policy obbligatoria
    CTA → Tool Security Check

19. "Sito Non Responsive: Perché Stai Perdendo il 60% dei Visitatori"
    Keywords: sito non responsive, sito non mobile friendly
    CTA → Tool Analisi Sito Web

20. "Google Analytics Non Installato: Cosa Stai Perdendo e Come Rimediare"
    Keywords: installare google analytics, analytics sito web
    CTA → Tool Tech Detector
```

#### Frequenza pubblicazione
- Settimana 1-2: Pubblicare articoli 1, 6, 12, 16 (uno per cluster, per coprire subito i pillar)
- Poi: 2 articoli a settimana fino a completare i 20
- Dopo i 20: 1 articolo a settimana di mantenimento, basato su keyword che emergono da Search Console

### LEAD MAGNET & RISORSE SCARICABILI

Creare risorse gratuite che richiedono email per il download → alimentano la newsletter → nutrono verso la registrazione.

```
Pagina: /risorse

Risorse da creare:

1. "Checklist Audit SEO — 50 Punti da Controllare" (PDF)
   Landing: /risorse/checklist-audit-seo
   Gate: email per download
   
2. "Template Email Cold Outreach — 5 Modelli Pronti" (PDF)
   Landing: /risorse/template-cold-email
   Gate: email per download

3. "Guida Prezzi Servizi Web 2026 — Quanto Farsi Pagare" (PDF)
   Landing: /risorse/guida-prezzi-servizi-web
   Gate: email per download

4. "Esempio Report Audit Sito Web — Come Presentare una Proposta" (PDF)
   Landing: /risorse/esempio-report-audit
   Gate: email per download → mostra il report PDF di TrovaMi come esempio
   QUESTO È IL LEAD MAGNET PIÙ POTENTE: l'utente scarica un esempio di 
   report, capisce quanto è professionale, e pensa "ne voglio uno per i miei clienti"
```

### SEO TECNICO — CHECKLIST COMPLETA

```tsx
// Implementare/verificare TUTTO:

// === INDICIZZAZIONE ===
// - /sitemap.xml generata automaticamente con tutte le pagine
//   Includere: homepage, tool (5), blog posts, risorse, pricing
//   Escludere: dashboard, account, admin, API endpoints
// - /robots.txt corretto:
//   Allow: /
//   Disallow: /dashboard
//   Disallow: /admin
//   Disallow: /api
//   Disallow: /account
//   Sitemap: https://trovami.pro/sitemap.xml
// - Canonical URL su ogni pagina
// - Nessuna pagina duplicata (www vs non-www, http vs https)
// - hreflang se si espande multilingua (futuro)

// === META TAG ===
// Ogni pagina DEVE avere meta title e description UNICI
// Homepage: "TrovaMi — Trova Clienti con Proposte Pronte da Inviare"
// Tool: vedi sopra per ogni tool
// Blog: titolo articolo + " — TrovaMi Blog"
// Pricing: "Prezzi TrovaMi — Piani per Freelancer e Agenzie"

// === OPEN GRAPH & SOCIAL ===
// Ogni pagina: og:title, og:description, og:image, og:url
// Ogni articolo blog: og:type="article", article:published_time
// Immagine OG di default per il sito + immagini personalizzate per articoli
// Twitter Card: summary_large_image

// === SCHEMA MARKUP (JSON-LD) ===
// Homepage: Organization + SoftwareApplication
// Tool: SoftwareApplication (per ogni tool)
// Blog: Article + BlogPosting (per ogni articolo)
// FAQ: FAQPage (sulle pagine tool e pricing)
// Pricing: Product + Offer (per ogni piano)
// Breadcrumb: BreadcrumbList su tutte le pagine interne

// === PERFORMANCE ===
// - Core Web Vitals tutti "Good" (verde)
//   LCP < 2.5s, FID < 100ms, CLS < 0.1
// - Immagini: next/image con lazy loading e formato WebP
// - Font: preload, font-display: swap
// - CSS: critical CSS inline, rest lazy loaded
// - JS: code splitting per route, dynamic imports per componenti pesanti
// - Cache headers corretti per asset statici

// === INTERNAL LINKING ===
// Struttura a silos:
// Homepage → Tool Hub → Singoli tool
// Homepage → Blog → Articoli (clusterizzati per tema)
// Tool → Articoli correlati (es. SEO Checker → "Come fare un audit SEO")
// Articoli → Tool correlati (es. "Sito lento?" → Tool Analisi)
// Articoli → Articoli correlati (stesso cluster)
// Ogni pagina ha max 2 click di distanza dalla homepage
//
// Breadcrumb su tutte le pagine interne:
// Home > Tool > SEO Checker
// Home > Blog > Come Trovare Clienti da Freelancer

// === PAGINE DA CREARE PER SEO ===
// /chi-siamo — pagina about (trust signal, volti, storia)
// /contatti — pagina contatti con form
// /tools — hub tool (già descritto sopra)
// /risorse — hub risorse scaricabili
// /blog — hub blog con categorie
```

### AUTOMAZIONE NEWSLETTER

```tsx
// La newsletter è un asset da 50 iscritti — farla crescere con i lead magnet

// Email automatiche (drip campaign dopo iscrizione):
//
// Giorno 0: "Benvenuto! Ecco la risorsa che hai richiesto" + link download
// Giorno 2: "3 errori che il 90% dei siti italiani ha (e come trovarli)"
//            → Link al tool Analisi Sito Web
// Giorno 5: "Come ho trovato 3 clienti in una settimana con l'audit dei siti"
//            → Case study (anche simulato inizialmente) + CTA registrazione TrovaMi
// Giorno 8: "Template gratuito: la cold email che funziona in Italia"
//            → Valore gratuito + CTA registrazione
// Giorno 12: "Hai già provato TrovaMi? La prima proposta è gratis"
//            → CTA diretto alla registrazione
//
// Dopo il drip: newsletter settimanale con:
// - 1 articolo nuovo dal blog
// - 1 tip pratico per trovare clienti
// - "Lead della settimana": esempio anonimizzato di un lead trovato con TrovaMi
//   con score e problemi (crea curiosità → registrazione)
```

---

## 13. METRICHE & ANALYTICS INTERNI

### Dashboard admin (`/admin/metrics`)
```tsx
// Metriche chiave da tracciare:
//
// FUNNEL:
// - Visitatori → Registrazioni (conversion rate landing page)
// - Registrazioni → Onboarding completato (drop-off rate)
// - Onboarding → Prima proposta generata (activation rate)
// - Prima proposta → Seconda proposta (retention rate)
// - Free → Starter (upgrade rate)
// - Starter → Churn (cancellation rate)
//
// ENGAGEMENT:
// - Proposte generate per utente per settimana
// - Outreach segnalati per utente
// - Deal chiusi segnalati
// - Tempo medio in piattaforma
// - Feature più usate (scan, report, template, crm)
//
// BUSINESS:
// - MRR (Monthly Recurring Revenue)
// - Utenti per piano
// - Revenue per utente
// - CAC (se si fa advertising)
// - LTV stimato
```

---

## 14. CHECKLIST DI IMPLEMENTAZIONE

### Priorità 1 — Settimana 1 (CRITICO)
- [ ] Rimuovere sistema a crediti da tutto il codebase
- [ ] Rimuovere "Sblocca Lead" — rendere info base visibili a tutti
- [ ] Implementare limite proposte/settimana (free) e proposte/mese (paid)
- [ ] Creare il mapping problemi tecnici → linguaggio umano
- [ ] Implementare prima proposta gratuita per nuovi utenti
- [ ] Riscrivere i 4 template (email, whatsapp, linkedin, dropin script)
- [ ] Rimuovere numeri gonfiati dalla landing page ("5000+", "centinaia di agenzie")
- [ ] Implementare sistema confidence level sui dati (verificato/da verificare)

### Priorità 2 — Settimana 2 (IMPORTANTE)
- [ ] Nuovo onboarding flow (4 step)
- [ ] Nuova dashboard con "Opportunità per te"
- [ ] Generazione report PDF brandizzabile (copertina, analisi, preventivo, CTA)
- [ ] Versione stampa del report
- [ ] Nuovo pricing a 3 piani (Free/Starter €19/Agency €49)
- [ ] Trial 14 giorni per Starter
- [ ] Refactoring completo landing page (hero, demo, come funziona, pricing)

### Priorità 3 — Settimana 3 (CRESCITA)
- [ ] CRM con pipeline Kanban
- [ ] PostProposalActions (tracking outreach e risultati)
- [ ] Feature "Opportunità vicino a te" con geolocalizzazione
- [ ] Sezione "Esplora l'Italia" con mappa e filtri
- [ ] Deep link WhatsApp con messaggio pre-compilato
- [ ] Dashboard admin metriche

### Priorità 4 — Settimana 4 (SEO & CONTENT — LA MACCHINA DA GUERRA)
- [ ] Creare pagina hub /tools con card per ogni tool gratuito
- [ ] Rinominare /tools/public-scan → /tools/analisi-sito-web (con 301 redirect)
- [ ] Creare landing page SEO-ottimizzata per ogni tool (5 pagine) con H1, meta, FAQ, Schema
- [ ] Rendere tutti i tool usabili SENZA registrazione (risultati parziali → CTA registrazione)
- [ ] Implementare sitemap.xml dinamica (homepage, tool, blog, risorse, pricing)
- [ ] Implementare robots.txt (bloccare dashboard, admin, api, account)
- [ ] Meta title + description unici per OGNI pagina del sito
- [ ] Open Graph + Twitter Card per tutte le pagine
- [ ] Schema markup: Organization, SoftwareApplication, FAQPage, Article, BreadcrumbList
- [ ] Canonical URL su tutte le pagine
- [ ] Breadcrumb component riutilizzabile
- [ ] Internal linking strutturato (tool ↔ blog ↔ risorse)
- [ ] Creare /chi-siamo e /contatti
- [ ] Pubblicare primi 4 articoli pillar (1 per cluster)
- [ ] Creare pagina /risorse con 4 lead magnet (PDF scaricabili dietro email gate)
- [ ] Setup drip campaign newsletter (5 email automatiche)
- [ ] Core Web Vitals audit e fix (LCP < 2.5s, FID < 100ms, CLS < 0.1)

### Priorità 5 — Settimane 5-8 (CONTENT SCALING)
- [ ] Pubblicare restanti 16 articoli del piano editoriale (2/settimana)
- [ ] Creare immagini OG personalizzate per ogni articolo
- [ ] Monitorare Search Console: keyword che emergono → nuovi articoli
- [ ] A/B test sulle pagine tool (layout, CTA, copy)
- [ ] Ottimizzazione mobile completa di tutte le pagine tool
- [ ] Email di onboarding automatiche (giorno 1, 3, 7 dopo registrazione)
- [ ] Notifiche/alert nuove opportunità (per Starter+)
- [ ] Newsletter settimanale automatizzata

---

## ⚠️ REGOLE GENERALI PER L'IMPLEMENTAZIONE

### Stile codice
- TypeScript strict mode ovunque
- Componenti React funzionali con hooks
- Tailwind CSS per lo styling — design pulito, moderno, minimalista
- Colori: palette professionale, NO gradienti viola/arancio aggressivi
- Mobile-first: ogni componente deve funzionare prima su mobile, poi desktop

### UX principles
- **Ogni schermata ha UN obiettivo chiaro** — non 10 CTA diverse
- **Meno è meglio** — se un elemento non aiuta la conversione, toglilo
- **Copy in italiano naturale** — come parleresti a un amico freelancer
- **Loading states** per tutto — skeleton screens, non spinner
- **Error states gentili** — "Non abbiamo trovato risultati" con suggerimento, non errore secco
- **Empty states utili** — se non ci sono lead nella zona, suggerire di allargare il raggio

### Performance
- Lazy loading per le card dei lead
- Pagination server-side per la lista lead (non caricare 9776 lead)
- Cache dei report PDF generati
- Ottimizzazione immagini con next/image
- Bundle size sotto controllo — code splitting per rotte

### Sicurezza
- Rate limiting sugli endpoint di scan/report generation
- Sanitizzazione input per le ricerche
- CORS configurato correttamente
- Dati utente GDPR compliant
- Cancellazione dati su richiesta

---

## 🎯 OBIETTIVO FINALE

Dopo questo refactoring, un freelancer italiano deve poter:

1. **Registrarsi in 2 minuti** e vedere subito opportunità nella sua zona
2. **Generare una proposta professionale** con report PDF, template email e preventivo in **30 secondi**
3. **Mandare la proposta** via email, WhatsApp o stamparla per il drop-in con **1 click**
4. **Chiudere il suo primo cliente** usando TrovaMi e pensare "devo assolutamente pagare per avere più proposte"

Se questo percorso funziona per 1 persona, funziona per 1000. Costruisci per quella prima persona.