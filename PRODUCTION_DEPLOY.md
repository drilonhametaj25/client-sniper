# 🚀 Deploy in Produzione - ClientSniper

Questa guida descrive come configurare il deploy completo della piattaforma ClientSniper in produzione.

## 📋 Architettura Deploy

- **Frontend**: Vercel (Next.js + API Routes)
- **Scraping Engine**: GitHub Actions (esecuzione periodica)
- **Database**: Supabase (gestito esternamente)
- **Monorepo**: Turborepo per gestione progetti

---

## 🖥️ Frontend Deploy - Vercel

### 1. Setup Repository su Vercel

1. Vai su [vercel.com](https://vercel.com) e connetti il repository GitHub
2. Seleziona il branch `main` per auto-deploy
3. Vercel rileverà automaticamente Next.js

### 2. Configurazione Progetto

```bash
# Framework: Next.js (auto-rilevato)
# Root Directory: apps/frontend-app
# Build Command: cd apps/frontend-app && npm run build  
# Install Command: npm install && cd apps/frontend-app && npm install
# Output Directory: .next (auto-rilevato)
```

### 3. Variabili d'Ambiente Vercel

Nel dashboard Vercel, aggiungi queste variabili:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4. Deploy

- Push su `main` → Deploy automatico
- Pull request → Preview deploy

---

## 🤖 Scraping Engine - GitHub Actions

### 1. Configurazione Secrets

Nel repository GitHub, vai in **Settings > Secrets > Actions** e aggiungi:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhb...
```

### 2. Workflow Automatico

- **Frequenza**: Ogni ora (cron: '0 * * * *')
- **Esecuzione manuale**: Disponibile via GitHub Actions tab
- **Logs**: Salvati come artifacts per 7 giorni

### 3. Monitoraggio

- Dashboard GitHub Actions per status
- Logs scaricabili per debug
- Notifiche automatiche su failure

---

## 🗄️ Database - Supabase

### 1. Setup Produzione

1. Crea progetto Supabase per produzione
2. Esegui migration dal file `database/setup.sql`
3. Configura RLS policies per sicurezza

### 2. Performance

- **Connection pooling**: Abilitato
- **API rate limits**: Configurati per piano
- **Backup automatici**: Abilitati

---

## 📊 Monitoraggio e Logs

### Frontend (Vercel)

- **Analytics**: Dashboard Vercel
- **Error tracking**: Vercel Functions logs
- **Performance**: Core Web Vitals

### Scraping Engine (GitHub Actions)

- **Execution logs**: GitHub Actions artifacts
- **Failure alerts**: GitHub notifications
- **Performance metrics**: Execution time tracking

### Database (Supabase)

- **Query performance**: Dashboard Supabase  
- **Usage metrics**: API calls, storage
- **Health monitoring**: Uptime tracking

---

## 🚦 Checklist Deploy

### Pre-Deploy

- [ ] Tests passing localmente
- [ ] Environment variables configurate
- [ ] Database migrated e seeded
- [ ] Stripe webhook configurati

### Frontend Deploy

- [ ] Repository connesso a Vercel
- [ ] Environment variables impostate
- [ ] Build test successful
- [ ] Custom domain configurato (opzionale)

### Scraping Engine Deploy

- [ ] GitHub Secrets configurati
- [ ] Workflow testato manualmente
- [ ] Playwright dependencies verificate
- [ ] Logs directory accessibile

### Post-Deploy

- [ ] Verifica frontend funzionante
- [ ] Test scraping engine manuale
- [ ] Monitor logs per errori
- [ ] Setup alerts per failures

---

## 🔧 Comandi Utili

### Test Build Locale

```bash
# Frontend
cd apps/frontend-app
npm run build

# Scraping Engine  
cd services/scraping-engine
npm run scrape
```

### Debug Deploy

```bash
# Vercel logs
vercel logs

# GitHub Actions manual trigger
# Vai su GitHub > Actions > Run Scraping Engine > Run workflow
```

### Database Maintenance

```bash
# Reset database (development only)
cd services/scraping-engine
npm run seed:reset

# Check database status  
npm run seed:stats
```

---

## 🆘 Troubleshooting

### Frontend Issues

- **Build fails**: Controlla environment variables
- **API errors**: Verifica CORS e Supabase config
- **Timeout**: Aumenta function timeout in vercel.json

### Scraping Engine Issues

- **Playwright errors**: Reinstalla browsers in workflow
- **Database connection**: Verifica secrets GitHub
- **Memory issues**: Riduci MAX_CONCURRENT_SCRAPERS

### Database Issues

- **Connection limits**: Abilita connection pooling
- **Slow queries**: Aggiungi indexes necessari
- **Rate limits**: Upgrade piano Supabase se necessario
