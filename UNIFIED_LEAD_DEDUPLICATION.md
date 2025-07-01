# Sistema Unificato di Deduplicazione Lead

## 🎯 Problema Risolto

### ❌ **Prima**:
- **Google Maps**: "Pizzeria Roma" → `google_maps_pizzeria_roma_roma`
- **Pagine Gialle**: "Pizzeria Roma" → `pagine_gialle_pizzeria_roma_roma`
- **Risultato**: Due lead separati per lo stesso business!

### ✅ **Ora**:
- **Cross-source matching** intelligente
- **Arricchimento automatico** dei dati
- **Zero duplicati** tra fonti diverse
- **Storico completo** delle fonti

## 🔧 Componenti del Sistema

### 1. **UnifiedLeadManager** (`/services/scraping-engine/src/utils/unified-lead-manager.ts`)

Sistema centrale che gestisce:
- **Matching intelligente** cross-source
- **Arricchimento dati** invece di duplicazione
- **Merge automatico** di informazioni

#### Algoritmi di Matching:
```typescript
// 1. MATCH ESATTO: Nome + Città
business_name: "Pizzeria Mario" + city: "Roma"

// 2. MATCH DOMINIO: Stesso website
website: "pizzeriamario.it" 

// 3. MATCH TELEFONO: Numero normalizzato
phone: "+39 06 1234567" → "061234567"

// 4. MATCH INDIRIZZO: Indirizzo normalizzato  
address: "Via Roma 123" → "roma 123"
```

#### Score di Similarità:
- **Nome**: 40% del peso
- **Website**: 30% del peso  
- **Città**: 20% del peso
- **Telefono**: 10% del peso
- **Soglia match**: 70%

### 2. **Schema Database Aggiornato**

#### Nuove Colonne:
```sql
-- Traccia fonti multiple per ogni lead
sources TEXT[] DEFAULT ARRAY[]::TEXT[]

-- Chiave universale cross-source  
unique_key: "universal_pizzeria_mario_roma"
```

#### Indici Performance:
```sql
-- Full-text search per nome + città
idx_leads_business_name_city

-- Matching domini website
idx_leads_website_domain  

-- Telefoni normalizzati
idx_leads_phone_normalized

-- Array di sources
idx_leads_sources
```

### 3. **Vista Potential Duplicates**

Query automatica per identificare duplicati:
```sql
SELECT * FROM potential_duplicates 
WHERE match_type = 'website_match' 
AND name_similarity > 0.8;
```

### 4. **Funzione Merge Automatico**

```sql
-- Merge manuale di due lead
SELECT merge_duplicate_leads(
  'lead-1-uuid', 
  'lead-2-uuid'
);
```

## 🚀 Come Funziona

### Scenario: Google Maps + Pagine Gialle

1. **Google Maps trova**:
   ```json
   {
     "business_name": "Pizzeria Da Mario",
     "city": "Roma",
     "website_url": "https://pizzeriamario.it",
     "score": 65,
     "analysis": {...},
     "source": "google_maps"
   }
   ```

2. **Pagine Gialle trova stesso business**:
   ```json
   {
     "business_name": "Pizzeria da Mario S.r.l.",
     "city": "Roma",
     "phone": "+39 06 1234567",
     "address": "Via Roma 123, 00100 Roma",
     "email": "info@pizzeriamario.it",
     "source": "pagine_gialle"
   }
   ```

3. **UnifiedLeadManager**:
   - ✅ **Rileva match** (85% similarità nome + città)
   - 🔄 **Arricchisce lead esistente** con nuovi dati
   - 📝 **Aggiorna sources**: `["google_maps", "pagine_gialle"]`

4. **Risultato finale**:
   ```json
   {
     "business_name": "Pizzeria Da Mario",
     "city": "Roma", 
     "website_url": "https://pizzeriamario.it",
     "phone": "+39 06 1234567",        // ← DA PAGINE GIALLE
     "address": "Via Roma 123, 00100 Roma", // ← DA PAGINE GIALLE
     "email": "info@pizzeriamario.it", // ← DA PAGINE GIALLE
     "score": 65,
     "analysis": {...},               // ← DA GOOGLE MAPS
     "sources": ["google_maps", "pagine_gialle"],
     "unique_key": "universal_pizzeria_da_mario_roma"
   }
   ```

## 📊 Benefici

### ✅ **Zero Duplicati**
- Lead unico per business reale
- Nessun conflitto tra fonti
- Database più pulito

### ✅ **Dati Arricchiti**
- **Google Maps**: Website + Analisi tecnica
- **Pagine Gialle**: Telefono + Indirizzo + Email
- **Altre fonti**: Orari, descrizioni, etc.

### ✅ **Storico Completo**
- Traccia di tutte le fonti
- Timestamp ultimo aggiornamento
- Log delle operazioni di merge

### ✅ **Performance Ottimizzata**
- Indici specializzati per matching
- Query efficienti su grandi dataset
- Evita scansioni complete tabella

## 🔧 Implementazione

### 1. **Integrazione negli Scraper**

```typescript
// Sostituisci la logica di salvataggio esistente
import { UnifiedLeadManager } from '../utils/unified-lead-manager'

class GoogleMapsScraper {
  private leadManager = new UnifiedLeadManager(supabase)
  
  async processLead(business: any) {
    const result = await this.leadManager.saveOrEnrichLead({
      business_name: business.name,
      city: business.city,
      website_url: business.website,
      source: 'google_maps',
      analysis: business.analysis
    })
    
    if (result.wasUpdated) {
      console.log(`🔄 Lead arricchito: ${business.name}`)
    } else {
      console.log(`✅ Nuovo lead: ${business.name}`)
    }
  }
}
```

### 2. **Migrazione Database**

```bash
# Esegui lo script di migrazione
psql -d database -f database/unified-lead-deduplication.sql
```

### 3. **Monitoring Duplicati**

```sql
-- Trova potenziali duplicati attuali
SELECT * FROM potential_duplicates 
ORDER BY name_similarity DESC;

-- Statistiche fonti multiple  
SELECT 
  COUNT(*) FILTER (WHERE array_length(sources, 1) = 1) as single_source,
  COUNT(*) FILTER (WHERE array_length(sources, 1) > 1) as multi_source
FROM leads;
```

## 🎛️ Configurazione

### Parametri Tuning:

```typescript
// Soglia similarità nome (default: 0.8)
SIMILARITY_THRESHOLD = 0.8

// Soglia match complessivo (default: 0.7)  
MATCH_THRESHOLD = 0.7

// Giorni prima di considerare lead "vecchio" (default: 60)
STALE_LEAD_DAYS = 60
```

## 📈 Metriche

### KPI da Monitorare:
- **Tasso duplicazione**: Deve tendere a 0%
- **Arricchimento cross-source**: % di lead con sources multiple
- **Completezza dati**: % lead con telefono, email, indirizzo
- **Performance query**: Tempo medio matching

### Query di Controllo:
```sql
-- Completezza dati per fonte
SELECT 
  unnest(sources) as source,
  AVG(CASE WHEN phone IS NOT NULL THEN 1 ELSE 0 END) as phone_coverage,
  AVG(CASE WHEN email IS NOT NULL THEN 1 ELSE 0 END) as email_coverage,
  AVG(CASE WHEN website_url IS NOT NULL THEN 1 ELSE 0 END) as website_coverage
FROM leads 
GROUP BY unnest(sources);
```

## 🔮 Estensioni Future

### Fonti Aggiuntive:
- **Yelp**: Recensioni e rating
- **LinkedIn**: Info aziendali  
- **Facebook Business**: Orari e foto
- **Camera di Commercio**: Dati legali
- **API Esterne**: Visure, bilanci

### AI/ML Enhancement:
- **Semantic matching** con embedding
- **Classificazione automatica** categoria business
- **Predizione qualità lead** con ML
- **Suggerimenti merge** automatici

Il sistema è **modulare** e **estensibile** per supportare facilmente nuove fonti di dati mantenendo la logica di deduplicazione centralizzata.
