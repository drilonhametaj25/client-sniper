# Istruzioni per Copilot

Questa repository è strutturata in moduli:

- `/apps/frontend-app`: Frontend React/Next.js
- `/services/scraping-engine`: backend scraping esterno
- `/libs`: moduli condivisi

Ogni file deve contenere un commento iniziale che spiega cosa fa, dove viene usato e da chi.

Il progetto è un SaaS che trova clienti potenziali analizzando siti web con difetti tecnici e assegnandoli agli utenti in base al loro piano.

⚠️ Il sistema non usa GPT. La classificazione dei siti è fatta con logica tecnica (regex, presenza pixel, velocità, meta tag).

Il sistema deve essere scalabile e modulare.

## Stack Tecnologico
- Frontend: Next.js 14 con App Router
- Database: Supabase (PostgreSQL)
- Auth: Supabase Auth
- Pagamenti: Stripe
- Scraping: Node.js + Playwright + Cheerio
- Classificazione: Regole statiche (regex, tag mancanti, performance)

## Struttura Database
```sql
-- Users
users (
  id UUID PRIMARY KEY,
  email TEXT,
  plan TEXT DEFAULT 'free', -- free, starter, pro
  credits_remaining INT DEFAULT 2,
  created_at TIMESTAMP DEFAULT now()
)

-- Plans
plans (
  id SERIAL PRIMARY KEY,
  name TEXT, -- free, starter, pro
  price_monthly INT,
  max_credits INT,
  visible_fields TEXT[] -- es: ['business_name','website_url','email']
)

-- Leads
leads (
  id UUID PRIMARY KEY,
  assigned_to UUID REFERENCES users(id),
  business_name TEXT,
  website_url TEXT,
  city TEXT,
  category TEXT,
  score INT, -- 0-100
  analysis JSONB, -- contiene dettagli dell'analisi tecnica
  created_at TIMESTAMP
)

-- Analysis
lead_analysis (
  id UUID REFERENCES leads(id),
  has_website BOOLEAN,
  website_load_time FLOAT,
  missing_meta_tags TEXT[],
  has_tracking_pixel BOOLEAN,
  broken_images BOOLEAN,
  gtm_installed BOOLEAN,
  overall_score INT
)

-- Settings
settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE,
  value TEXT
)
```

## Punteggio Lead (0-100)
- Sito assente o in costruzione: 0-20
- Mancanza SEO base: -15 punti
- Assenza pixel tracking: -10 punti
- Immagini rotte: -10 punti
- Performance scarse: -15 punti
- Più è basso il punteggio, più il sito ha bisogno di aiuto

# Istruzioni per lo scraping distribuito intelligente

Il progetto prevede uno scraping engine modulare che estrae lead da fonti diverse (Google Maps, Yelp, Pagine Gialle, ecc.) in modo automatico, evitando duplicazioni e gestendo priorità.

## Obiettivo
- Suddividere il territorio in zone geografiche (es. città, quartieri, o geohash)
- Per ogni fonte e categoria, mantenere uno scheduler intelligente
- Evitare di scrappare più volte la stessa zona in un intervallo troppo breve
- Salvare solo lead nuovi o aggiornati
- Gestire priorità dinamica basata sul tempo dall'ultimo scraping e sulla quantità/qualità dei lead trovati

## Struttura richiesta

1. **Tabella `zones_to_scrape`**
   - `id`
   - `source` (es: "google_maps", "yelp", "pagine_gialle")
   - `category` (es: "ristoranti", "idraulici", "barberie")
   - `location_name` (es: "Milano", "Napoli Centro")
   - `geohash` o `bounding_box`
   - `last_scraped_at` (timestamp)
   - `score` (priorità)
   - `is_scraping_now` (boolean)
   - `times_scraped` (intero)
   - `total_leads_found` (intero)

2. **Tabella `scrape_logs`**
   - `id`
   - `zone_id`
   - `source`
   - `status` (success/fail)
   - `start_time`
   - `end_time`
   - `lead_count`
   - `error_log`

3. **Tabella `leads`**
   - Include un campo `unique_key` costruito da `source+place_id` o `website_url+location_name`
   - Deve avere `created_at` e `last_seen_at`
   - Campo `content_hash` per evitare duplicati

## Logica richiesta nel codice

- Quando parte uno scraping job:
  - Recupera le prime N zone ordinate per `score DESC`
  - Per ogni zona:
    - Verifica che `is_scraping_now = false` e `last_scraped_at > now - MIN_INTERVAL_DAYS`
    - Lancia scraping per quella zona e fonte
    - Aggiorna `last_scraped_at` e `is_scraping_now`
    - Se non trova lead → decrementa `score`
    - Se trova lead → aggiorna `times_scraped`, `total_leads_found`, e aumenta `score`
- I lead vanno inseriti solo se:
  - Non esistono già con lo stesso `unique_key` oppure
  - Se `content_hash` è cambiato rispetto alla versione precedente

## Obiettivo secondario
- Consentire l'estensione ad altre fonti future senza cambiare la struttura base
- Consentire schedulazione manuale o cron (es. ogni ora)
- Consentire trigger API da backend Next.js per lanciare scraping mirato

## Extra
- In ogni file generato, inserisci un commento in cima che spieghi lo scopo del file
- Crea una funzione `getZonesToScrape(limit: number)` che restituisce le zone prioritarie pronte per lo scraping
- Crea un modulo `ScrapingJobRunner` per eseguire scraping asincroni a partire dalla lista zone
