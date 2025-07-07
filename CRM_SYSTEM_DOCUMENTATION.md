# Sistema CRM Personale - ClientSniper

## Panoramica
Il sistema CRM personale permette agli utenti PRO di gestire i propri lead sbloccati con funzionalità complete di tracking, note, stati e follow-up.

## Funzionalità Principali

### 📋 Gestione Lead
- **Visualizzazione Lead**: Dashboard con tutti i lead sbloccati dell'utente
- **Stati Personalizzati**: Da contattare, In negoziazione, Chiuso positivo/negativo, In pausa, Follow-up
- **Note Private**: Annotazioni personali per ogni lead
- **Follow-up**: Pianificazione di date per ricontattare i lead
- **Punteggio Visibile**: Visualizzazione del punteggio di qualità del lead

### 🔍 Filtri e Ricerca
- **Ricerca Testuale**: Per nome business, URL, città
- **Filtri per Stato**: Visualizzazione per singolo stato
- **Ordinamento**: Per data di aggiornamento, stato, follow-up
- **Contatori**: Statistiche in tempo reale per ogni stato

### 📊 Dashboard Statistiche
- **Totale Lead**: Numero totale di lead gestiti
- **Lead per Stato**: Contatori per ogni stato
- **Follow-up Scaduti**: Alert per follow-up in ritardo
- **Trend Temporali**: Visualizzazione dell'andamento nel tempo

## Architettura Tecnica

### Database Schema
```sql
-- Tabella principale
crm_entries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  lead_id UUID REFERENCES leads(id),
  status TEXT CHECK (status IN ('to_contact', 'in_negotiation', 'closed_positive', 'closed_negative', 'on_hold', 'follow_up')),
  note TEXT,
  follow_up_date TIMESTAMP,
  attachments JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, lead_id)
);
```

### Trigger Automatici
- **Auto-creazione Entry**: Quando un lead viene sbloccato (assigned_to settato), si crea automaticamente una entry CRM
- **Aggiornamento Timestamp**: Trigger per aggiornare `updated_at` ad ogni modifica
- **Controllo Accesso**: RLS attivato per privacy completa tra utenti

### API Endpoints
- `GET /api/crm` - Recupera entry CRM dell'utente
- `POST /api/crm` - Crea/aggiorna entry CRM
- `GET /api/crm/stats` - Statistiche CRM dell'utente
- `GET /api/crm/test` - Test funzionalità CRM

### Funzioni RPC (Database)
- `get_user_crm_entries()` - Recupera entry con dettagli lead
- `upsert_crm_entry()` - Crea/aggiorna entry CRM
- `get_user_crm_stats()` - Calcola statistiche utente
- `delete_crm_entry()` - Elimina entry CRM

## Interfaccia Utente

### Componenti Principali
- **Pagina CRM** (`/crm`): Vista principale con lista lead e statistiche
- **Modal Modifica**: Popup per modificare stato, note, follow-up
- **Cards Lead**: Visualizzazione singola per ogni lead
- **Filtri**: Barra di ricerca e dropdown stato

### Restrizioni Accesso
- Solo utenti con **piano PRO** possono accedere
- Verifiche lato client e server
- Link visibile solo per utenti PRO nella navbar

## Flusso Operativo

### 1. Sblocco Lead
```
Usuario sblocca lead → Trigger auto-crea entry CRM → Entry disponibile in /crm
```

### 2. Gestione Lead
```
Utente accede a /crm → Visualizza lead → Modifica stato/note → Salva modifiche
```

### 3. Follow-up
```
Utente imposta data follow-up → Sistema mostra alert se scaduta → Utente aggiorna stato
```

## Sicurezza e Privacy

### Row Level Security (RLS)
- Ogni utente vede solo le proprie entry CRM
- Policy separate per SELECT, INSERT, UPDATE, DELETE
- Admin possono accedere a tutte le entry (opzionale)

### Controlli di Accesso
- Verifica piano PRO su ogni richiesta API
- Verifica autenticazione Supabase
- Controllo ownership dei lead

## Integrazione con Sistema Esistente

### Dashboard Principale
- Filtro "Mostra solo sbloccati" integrato
- Counter per lead sbloccati
- Link diretto al CRM per utenti PRO

### Analisi Lead
- Ogni lead sbloccato viene automaticamente aggiunto al CRM
- Punteggio e analisi visibili nel CRM
- Dettagli tecnici accessibili dalla vista lead

## Estensioni Future

### Funzionalità Pianificate
- [ ] **Allegati**: Upload documenti per lead
- [ ] **Pipeline Kanban**: Vista drag-and-drop per stati
- [ ] **Automazioni**: Trigger automatici per cambi stato
- [ ] **Reportistica**: Export dati e report avanzati
- [ ] **Notifiche**: Email/SMS per follow-up scaduti
- [ ] **Integrazione Email**: Import/export contatti
- [ ] **Template Note**: Modelli predefiniti per note
- [ ] **Tag Personalizzati**: Etichette personalizzate per lead

### Metriche da Implementare
- [ ] **Tasso di Conversione**: % lead chiusi positivi
- [ ] **Tempo Medio**: Tempo medio per chiudere lead
- [ ] **ROI**: Ritorno sull'investimento per lead
- [ ] **Forecast**: Previsioni basate su pipeline

## Test e Qualità

### Endpoint di Test
- `GET /api/crm/test` - Verifica funzionalità base
- Tests automatici per RPC functions
- Verifica integrità database

### Logging
- Errori API loggati in console
- Tracking operazioni critiche
- Monitoraggio performance query

## Documentazione Tecnica

### File Principali
- **Frontend**: `/apps/frontend-app/app/crm/page.tsx`
- **API**: `/apps/frontend-app/app/api/crm/route.ts`
- **Database**: `/database/crm-personal-system.sql`
- **Navbar**: Integrazione in `/components/Navbar.tsx`

### Dipendenze
- Supabase per database e auth
- Next.js per frontend e API
- Lucide React per icone
- Tailwind CSS per styling

---

## Quick Start

1. **Installazione**: Sistema già installato e configurato
2. **Accesso**: Utenti PRO vedono link "CRM Personale" in navbar
3. **Utilizzo**: Sbloccare lead dalla dashboard per vederli nel CRM
4. **Gestione**: Modificare stati, aggiungere note, impostare follow-up

**Supporto**: Per assistenza, utilizzare il sistema feedback integrato nell'app.
