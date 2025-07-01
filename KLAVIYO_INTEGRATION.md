# Guida Completa Integrazione Klaviyo

## 🎯 Obiettivo
Integrazione di Klaviyo per newsletter e lead nurturing. Gli utenti potranno iscriversi alla newsletter nelle pagine pubbliche e ricevere ogni mese lead gratuiti + consigli per invogliarli a iscriversi.

## ✅ Implementazione Completata

### 🔧 Codice Implementato

1. **Servizio Klaviyo Client** (`/lib/services/klaviyo.ts`)
   - Gestione iscrizione newsletter
   - Tracking eventi personalizzati
   - Gestione errori e validazione

2. **API Routes Next.js**
   - `/api/klaviyo/subscribe` - Iscrizione newsletter lato server
   - `/api/klaviyo/track` - Tracking eventi lato server

3. **Componente Newsletter** (`/components/NewsletterForm.tsx`)
   - 3 varianti: default, compact, inline
   - Validazione email integrata
   - Feedback visuale e tracking automatico
   - Gestione stati di caricamento ed errori

4. **Integrazione nelle Pagine Pubbliche**
   - **Homepage**: Sezione principale + footer compatto
   - **Public Scan**: Sezione dopo risultati + footer compatto  
   - **Register**: Sezione prima del completamento + footer entrambi step
   - **Login**: Footer compatto

### 🎨 Varianti Newsletter Implementate

#### 1. Default (Completa)
```tsx
<NewsletterForm
  title="Ricevi Lead Gratuiti ogni Mese"
  description="Unisciti a oltre 500+ agenzie..."
  source="homepage_cta"
/>
```

#### 2. Compact (Footer)
```tsx
<NewsletterForm
  title="Newsletter Professionale"
  description="Lead qualificati ogni mese"
  variant="compact"
  source="footer"
/>
```

#### 3. Inline (Singola riga)
```tsx
<NewsletterForm
  placeholder="La tua email"
  buttonText="Iscriviti"
  variant="inline"
  source="popup"
/>
```

### 📊 Tracking Eventi Implementati
- `Newsletter Subscription` - Iscrizione completata
- `Form View` - Visualizzazione form newsletter
- `Form Error` - Errori durante iscrizione

## ⚙️ Configurazione Necessaria su Klaviyo

### 1. Crea Account e Lista Newsletter

1. **Vai su [klaviyo.com](https://klaviyo.com)** e crea/accedi al tuo account
2. **Crea una Lista Newsletter**:
   - Vai su `Lists & Segments` nel menu principale
   - Clicca `Create List`
   - Nome: "Newsletter TrovaMi" o "Lead Generation Newsletter"
   - Descrizione: "Utenti interessati a ricevere lead gratuiti e consigli"
   - **Salva l'ID della lista** (formato: `ABCDEF`) - ti servirà dopo

### 2. Ottieni le API Keys

1. **Private API Key (per server-side)**:
   - Vai su `Settings` → `API Keys` 
   - Clicca `Create Private API Key`
   - Nome: "TrovaMi Server API"
   - Permessi necessari: `Lists:Write`, `Profiles:Write`, `Events:Write`
   - **Copia la chiave** (formato: `pk_123abc...`)

2. **Public Key (per client-side, opzionale)**:
   - Nella stessa sezione, troverai la `Public API Key` 
   - **Copia la chiave** (formato: `XYZ123`)

### 3. Configura Variabili d'Ambiente

Nel file `.env.local` della tua app, aggiungi:

```bash
# Klaviyo Configuration
KLAVIYO_PRIVATE_API_KEY=pk_la_tua_private_key_qui
NEXT_PUBLIC_KLAVIYO_PUBLIC_KEY=la_tua_public_key_qui
KLAVIYO_LIST_ID=l_id_della_tua_lista_qui
```

**⚠️ IMPORTANTE**: La `KLAVIYO_PRIVATE_API_KEY` non deve MAI essere esposta al client!

### 4. Configura anche su Vercel/Produzione

1. Vai sul dashboard Vercel del tuo progetto
2. `Settings` → `Environment Variables`
3. Aggiungi le stesse 3 variabili:
   - `KLAVIYO_PRIVATE_API_KEY` 
   - `NEXT_PUBLIC_KLAVIYO_PUBLIC_KEY`
   - `KLAVIYO_LIST_ID`

## 🚀 Flow Automazioni su Klaviyo

### 1. Welcome Flow (Benvenuto)
Crea un flow per i nuovi iscritti:

1. **Trigger**: "Added to list" → Seleziona la tua lista newsletter
2. **Email 1 (Immediata)**: "Benvenuto! Ecco i tuoi primi 3 lead gratuiti"
   - Contenuto: Ringraziamento + 3 lead reali con nome, sito, problemi
   - CTA: "Scopri la Piattaforma Completa"
3. **Email 2 (Dopo 3 giorni)**: "Come trasformare un lead in cliente"
   - Contenuto: Guida pratica per contattare i lead
   - CTA: "Inizia la Prova Gratuita"

### 2. Nurturing Flow (Conversione)
Flow per convertire gli iscritti in clienti:

1. **Email 3 (Dopo 7 giorni)**: "Caso Studio: Come Marco ha trovato 50 clienti"
   - Storia di successo di un utente
   - CTA: "Registrati Gratis"
2. **Email 4 (Dopo 14 giorni)**: "Ultimi 5 lead nella tua zona"
   - Lead specifici per località dell'utente (se disponibile)
   - CTA: "Accedi a Tutti i Lead"

### 3. Monthly Newsletter Flow
Flow ricorrente mensile:

1. **Trigger**: Data-based, ogni 1° del mese
2. **Segmento**: Tutti gli iscritti attivi
3. **Contenuto**: 
   - 10-15 lead freschi e qualificati
   - 1 articolo su strategie di acquisizione clienti
   - 1 feature highlight della piattaforma
   - Testimonianze utenti

## 📧 Template Email Suggeriti

### Welcome Email Template
```
Oggetto: Benvenuto! I tuoi primi 3 lead ti aspettano 🎯

Ciao {{ first_name|default:"" }},

Benvenuto nella community di TrovaMi!

Come promesso, ecco i tuoi primi 3 lead qualificati:

🏪 RISTORANTE DA MARIO (Milano)
• Sito: damario-milano.it  
• Problemi: Meta SEO mancanti, tempo caricamento 4.2s
• Punteggio: 25/100 ⚠️ CRITICO
• Opportunità: €2.000-5.000 per rifacimento sito

🏥 STUDIO DENTISTICO ROSSI (Roma)  
• Sito: studiorossi.com
• Problemi: Non responsive, tracking mancante
• Punteggio: 31/100 ⚠️ CRITICO
• Opportunità: €1.500-3.000 per ottimizzazione

🏠 IMMOBILIARE CASA BELLA (Napoli)
• Sito: casabella-napoli.it
• Problemi: HTTPS mancante, immagini rotte
• Punteggio: 18/100 🚨 URGENTE
• Opportunità: €3.000-8.000 per sicurezza + UX

Questi sono solo un assaggio! 
La piattaforma completa ti dà accesso a centinaia di lead così ogni mese.

[REGISTRATI GRATIS - 2 LEAD AL MESE] [SCOPRI I PIANI PRO]

A presto,
Il Team TrovaMi
```

### Monthly Newsletter Template
```
Oggetto: 15 nuovi lead qualificati per te | Gennaio 2025 🚀

Ciao {{ first_name|default:"Professionista" }},

È arrivato il momento che aspettavi: i lead freschi di gennaio!

📊 LEAD DEL MESE (15 SELEZIONATI)
• 5 ristoranti con siti critici (Score: 15-30/100)
• 4 studi professionali senza HTTPS (Score: 20-35/100)  
• 3 e-commerce con performance scarse (Score: 25-40/100)
• 3 hotel senza tracking analytics (Score: 30-45/100)

[VEDI TUTTI I LEAD] [ACCEDI ALLA DASHBOARD]

💡 STRATEGIA DEL MESE: "L'approccio GDPR"
Con le nuove normative, molti siti non sono conformi.
Ecco come proporti come consulente GDPR...

[LEGGI LA GUIDA COMPLETA]

🎯 FEATURE IN EVIDENZA: Analisi Manuale
Ora puoi analizzare qualsiasi sito in tempo reale.
Perfetto per call commerciali e demo!

[PROVA L'ANALISI MANUALE]

📈 SUCCESS STORY
"Grazie a TrovaMi ho trovato 12 clienti in 3 mesi"
- Marco R., Web Agency Milano

Vuoi condividere la tua storia? Rispondi a questa email!

[UPGRADE AL PIANO PRO] [INVITA UN AMICO]

Il Team TrovaMi
P.S. Non trovare quello che cerchi? Rispondi e ti aiutiamo!
```

## 🧪 Test dell'Integrazione

### Test Manuale
1. Vai sulle pagine con il form newsletter
2. Inserisci la tua email e invia
3. Controlla che appaia il messaggio di successo
4. Verifica su Klaviyo che il contatto sia stato aggiunto alla lista

### Test API Direct (Opzionale)
```bash
# Test iscrizione via API
curl -X POST https://tuodominio.com/api/klaviyo/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","firstName":"Test","properties":{"source":"test"}}'

# Test tracking evento
curl -X POST https://tuodominio.com/api/klaviyo/track \
  -H "Content-Type: application/json" \
  -d '{"event":"Test Event","customerProperties":{"$email":"test@example.com"},"properties":{"test":true}}'
```

## 📈 Metriche da Monitorare

### Klaviyo Dashboard
- **Tasso di apertura email**: Target >25%
- **Tasso di click**: Target >3%
- **Crescita lista**: Target +10% al mese
- **Conversioni**: Iscritti → Registrazioni

### Custom Events da Trackare
- `Newsletter Subscription` - Iscrizioni completate
- `Plan Upgrade` - Upgrade piano dopo email
- `Lead Download` - Download lead da email
- `Email CTA Click` - Click sui CTA delle email

## 🔧 Troubleshooting

### Errori Comuni
1. **403 Forbidden**: Controlla che la PRIVATE_API_KEY sia corretta
2. **Lista non trovata**: Verifica il KLAVIYO_LIST_ID
3. **Email non arriva**: Controlla spam e configura SPF/DKIM
4. **Duplicati**: Klaviyo gestisce automaticamente i duplicati

### Debug
I log sono visibili in:
- Browser Console (errori client)
- Vercel Functions Logs (errori server)
- Klaviyo Activity Feed (iscrizioni/eventi)

## 🎯 Obiettivi Business

### Mese 1: Setup & Test
- ✅ Implementazione tecnica completata
- 🎯 Prime 50 iscrizioni organiche
- 🎯 Welcome flow attivo

### Mese 2-3: Crescita
- 🎯 200+ iscrizioni mensili  
- 🎯 Nurturing flow attivo
- 🎯 5-10% conversione newsletter→registrazione

### Mese 4+: Scaling
- 🎯 500+ iscrizioni mensili
- 🎯 Segmentazione avanzata per località
- 🎯 A/B test sui subject delle email
- 🎯 Automazioni per reattivazione utenti inattivi

## 🚀 Prossimi Passi

1. **Configura subito** le API keys seguendo questa guida
2. **Crea il welcome flow** su Klaviyo
3. **Testa l'iscrizione** su tutte le pagine
4. **Prepara il primo contenuto** per la newsletter mensile
5. **Monitora le metriche** per i primi 30 giorni

---

**🎉 La tua integrazione Klaviyo è pronta!**
Ora hai tutto il necessario per far crescere la tua lista e convertire gli iscritti in clienti paganti.

Per domande o supporto: rispondi a questa email o contattaci via chat.
