# TrovaMi 🎯

SaaS per la generazione di lead attraverso l'analisi tecnica automatizzata di siti web aziendali.

## 🚀 Panoramica

TrovaMi identifica automaticamente aziende con siti web che necessitano di miglioramenti tecnici, generando lead qualificati per agenzie digitali e consulenti web.

### Come Funziona
1. **Scraping Automatico**: Raccoglie dati da Google Maps, Yelp e directory online
2. **Analisi Tecnica**: Valuta ogni sito web utilizzando regole statiche (no GPT)
3. **Scoring**: Assegna un punteggio 0-100 basato sui difetti trovati
4. **Distribuzione Lead**: Assegna i lead agli utenti in base al loro piano

## 🏗️ Architettura

```
TrovaMi/
├── apps/
│   └── frontend-app/          # Next.js 14 + Supabase + Stripe
│       ├── app/               # App Router Next.js
│       ├── components/        # Componenti React
│       ├── lib/              # Configurazioni (Supabase, Stripe)
│       └── api/              # API Routes
├── services/
│   └── scraping-engine/       # Node.js + Playwright + Cheerio
│       ├── src/
│       │   ├── scrapers/     # Google Maps, Yelp scrapers
│       │   ├── analyzers/    # Analisi tecnica siti web
│       │   └── utils/        # Utilità e logging
│       └── package.json
├── libs/
│   ├── types/                 # Tipi TypeScript condivisi
│   └── utils/                 # Funzioni comuni
└── .github/
    └── copilot-instructions.md # Istruzioni per Copilot
```

## 🛠️ Stack Tecnologico

- **Frontend**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Pagamenti**: Stripe
- **Scraping**: Node.js + Playwright + Cheerio
- **Classificazione**: Regole statiche (regex, performance, tag mancanti)
- **Monorepo**: Turborepo

## 📊 Punteggio Lead (0-100)

- **0-20**: Sito assente o in costruzione
- **-15**: Mancanza SEO base (title/description)
- **-10**: Assenza pixel tracking (GTM, Meta, GA)
- **-10**: Immagini rotte
- **-15**: Performance scarse

*Più è basso il punteggio, più il sito ha bisogno di aiuto*

## 🗄️ Database Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT,
  plan TEXT DEFAULT 'free', -- free, starter, pro
  credits_remaining INT DEFAULT 2,
  created_at TIMESTAMP DEFAULT now()
);

-- Plans
CREATE TABLE plans (
  id SERIAL PRIMARY KEY,
  name TEXT, -- free, starter, pro
  price_monthly INT,
  max_credits INT,
  visible_fields TEXT[] -- es: ['business_name','website_url','email']
);

-- Leads
CREATE TABLE leads (
  id UUID PRIMARY KEY,
  assigned_to UUID REFERENCES users(id),
  business_name TEXT,
  website_url TEXT,
  city TEXT,
  category TEXT,
  score INT, -- 0-100
  analysis JSONB, -- contiene dettagli dell'analisi tecnica
  created_at TIMESTAMP
);

-- Analysis
CREATE TABLE lead_analysis (
  id UUID REFERENCES leads(id),
  has_website BOOLEAN,
  website_load_time FLOAT,
  missing_meta_tags TEXT[],
  has_tracking_pixel BOOLEAN,
  broken_images BOOLEAN,
  gtm_installed BOOLEAN,
  overall_score INT
);

-- Settings
CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE,
  value TEXT
);
```

## 🚀 Quick Start

### Prerequisiti
- Node.js 18+
- Account Supabase
- Account Stripe
- Account Google Cloud (per scraping)

### Installazione

```bash
# 1. Clona il repository
git clone https://github.com/your-username/clientsniper.git
cd clientsniper

# 2. Installa dipendenze
npm install

# 3. Configura ambiente
cp .env.example .env.local
# Modifica .env.local con le tue chiavi API

# 4. Setup database Supabase
# Esegui le query SQL del schema nel tuo progetto Supabase

# 5. Installa Playwright browsers
cd services/scraping-engine
npx playwright install

# 6. Avvia ambiente di sviluppo
cd ../..
npm run dev
```

### Configurazione Supabase

1. Crea un nuovo progetto su [Supabase](https://supabase.com)
2. Esegui le query SQL del database schema
3. Configura Row Level Security (RLS)
4. Ottieni le chiavi API da Settings > API

### Configurazione Stripe

1. Crea account su [Stripe](https://stripe.com)
2. Crea i prodotti e prezzi per i piani Starter e Pro
3. Configura webhook endpoint: `https://yourdomain.com/api/webhook`
4. Copia le chiavi nel file `.env.local`

## 📁 Struttura Moduli

### Frontend App (`/apps/frontend-app`)
```
├── app/
│   ├── page.tsx              # Homepage
│   ├── layout.tsx            # Layout principale
│   ├── globals.css           # Stili globali
│   ├── dashboard/            # Dashboard utente
│   ├── admin/                # Panel admin
│   └── api/                  # API Routes
│       ├── leads/            # Gestione lead
│       ├── checkout/         # Stripe checkout
│       └── webhook/          # Webhook Stripe
├── components/               # Componenti React
├── lib/                     # Configurazioni
│   └── supabase.ts          # Client Supabase
└── package.json
```

### Scraping Engine (`/services/scraping-engine`)
```
├── src/
│   ├── index.ts             # Entry point + cron jobs
│   ├── orchestrator.ts      # Orchestratore principale
│   ├── scrapers/
│   │   ├── google-maps.ts   # Scraper Google Maps
│   │   └── yelp.ts          # Scraper Yelp
│   ├── analyzers/
│   │   └── website-analyzer.ts # Analisi tecnica siti
│   ├── lead-generator.ts    # Generazione lead
│   └── utils/
│       └── logger.ts        # Sistema logging
└── package.json
```

### Librerie Condivise (`/libs`)
- **types**: Tipi TypeScript condivisi tra tutti i moduli
- **utils**: Funzioni di utilità per scoring e validazione

## � Deployment

### Frontend (Vercel)
```bash
# Deploy automatico con Vercel
vercel --prod

# O manuale
npm run build
npm run start
```

### Scraping Engine (Docker)
```bash
# Build immagine Docker
cd services/scraping-engine
docker build -t clientsniper-scraper .

# Run con cron jobs
docker run -d --env-file .env clientsniper-scraper
```

### Database (Supabase)
- Database già hostato su Supabase
- Backup automatici inclusi
- Scaling automatico

## 📊 Monitoring

### Log del Scraping Engine
```bash
# Visualizza log in tempo reale
docker logs -f container_id

# Esegui scraping manuale
npm run scrape
```

### Metriche Supabase
- Dashboard: utilizzo database, query performance
- Real-time: connessioni attive, auth events

### Stripe Dashboard
- Pagamenti, subscription, churn rate
- Webhook events e retry automatici

## 🔧 Configurazione Avanzata

### Personalizzazione Target Scraping
Modifica `services/scraping-engine/src/orchestrator.ts`:

```typescript
private async getScrapingTargets(): Promise<any[]> {
  return [
    {
      source: 'google_maps',
      query: 'tua_categoria',
      location: 'Tua Città, Italia',
      category: 'tua_categoria_internal'
    }
    // Aggiungi altri target...
  ]
}
```

### Modifica Algoritmo Scoring
Aggiorna `libs/utils/index.ts` - funzione `calculateLeadScore()`:

```typescript
// Personalizza penalità per diversi problemi tecnici
if (!analysis.meta_tags.title) {
  score -= 20; // Aumenta penalità per title mancante
}
```

### Nuovi Campi Visibili per Piano
Modifica `PLANS_CONFIG` in `libs/types/index.ts`.

## 🧪 Testing

```bash
# Test frontend
cd apps/frontend-app
npm run test

# Test scraping engine
cd services/scraping-engine
npm run test

# Test analisi sito specifico
npm run analyze -- --url https://example.com
```

## 📄 API Documentation

### GET /api/leads
Recupera lead dell'utente autenticato.

**Query Parameters:**
- `page`: Numero pagina (default: 1)
- `limit`: Risultati per pagina (default: 10)
- `category`: Filtra per categoria
- `min_score`, `max_score`: Range punteggio
- `city`: Filtra per città

### POST /api/checkout
Crea sessione Stripe Checkout.

**Body:**
```json
{
  "plan": "starter|pro",
  "user_id": "uuid",
  "success_url": "https://...",
  "cancel_url": "https://..."
}
```

### POST /api/webhook
Webhook Stripe per eventi pagamento.

## 🤝 Contributing

1. Fork il repository
2. Crea feature branch (`git checkout -b feature/amazing-feature`)
3. Commit le modifiche (`git commit -m 'Add amazing feature'`)
4. Push al branch (`git push origin feature/amazing-feature`)
5. Apri una Pull Request

## 📄 Licenza

Proprietario - ClientSniper 2025

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/clientsniper/issues)
- **Email**: support@clientsniper.com
- **Docs**: [Documentazione completa](https://docs.clientsniper.com)
