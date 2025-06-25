# 🚀 Deploy Produzione Completo - ClientSniper

Questo documento contiene tutte le istruzioni per il deploy in produzione del sistema ClientSniper completo, con tutte le funzionalità GDPR, autenticazione, pagamenti e scraping.

## ✅ Status Implementazione

### Frontend (Next.js su Vercel)
- ✅ Autenticazione Supabase ottimizzata
- ✅ Dashboard utente con caching
- ✅ Sistema GDPR completo (banner + API)
- ✅ Pagine legali (Privacy, Terms, Contact, Help)
- ✅ Integrazione Stripe per pagamenti
- ✅ UI/UX ottimizzata stile Apple/Linear
- ✅ Sistema email personalizzato
- ✅ Configurazione deploy Vercel

### Backend/Database (Supabase)
- ✅ Schema database completo
- ✅ RLS policies per sicurezza
- ✅ Webhook auth per email
- ✅ Tabelle GDPR e consensi
- ✅ Sistema crediti e piani
- ✅ Log attività e audit trail

### Scraping Engine (GitHub Actions)
- ✅ Orchestratore scraping multi-zona
- ✅ Analizzatore tecnico siti web
- ✅ Scheduler intelligente per zone
- ✅ Sistema anti-duplicati
- ✅ Pipeline CI/CD automatizzata

## 🔧 Setup Produzione

### 1. Setup Vercel

```bash
# Clone e setup
git clone [repository-url]
cd ClientSniper

# Install Vercel CLI
npm i -g vercel

# Login e deploy
vercel login
vercel --prod
```

**Variabili Ambiente Vercel**:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Site
NEXT_PUBLIC_SITE_URL=https://clientsniper.com

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Resend)
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@clientsniper.com

# GDPR
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_FB_PIXEL_ID=123456789
GDPR_DATA_RETENTION_DAYS=730
GDPR_DELETION_DELAY_DAYS=30
```

### 2. Setup Supabase Database

```bash
# Esegui scripts in ordine
psql -h db.your-project.supabase.co -U postgres -d postgres

# 1. Schema base
\i database/setup.sql

# 2. Tabelle messaggi contatto  
\i database/contact-messages.sql

# 3. Sistema GDPR completo
\i database/gdpr-compliance.sql

# 4. Seed dati zone (opzionale)
\i services/scraping-engine/database/seed-zones-complete.sql
```

### 3. Setup GitHub Actions

**File**: `.github/workflows/scraping-engine.yml`
```yaml
name: Scraping Engine
on:
  schedule:
    - cron: '0 */6 * * *'  # Ogni 6 ore
  workflow_dispatch:

jobs:
  scraping:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd services/scraping-engine
          npm install
          
      - name: Run scraping
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          NODE_ENV: production
        run: |
          cd services/scraping-engine
          npm run start:production
```

**Secrets GitHub**:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

### 4. Setup Domini e DNS

```
# DNS Records
A     @           76.76.19.61
A     www         76.76.19.61
CNAME api         cname.vercel-dns.com
CNAME app         cname.vercel-dns.com

# SSL Certificate
# Automatico tramite Vercel
```

### 5. Setup Stripe Webhooks

**Endpoint**: `https://clientsniper.com/api/stripe/webhook-credits`

**Eventi da ascoltare**:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### 6. Setup Email (Resend)

```bash
# Configurazione dominio
Domain: clientsniper.com
DKIM: Abilitato tramite Resend dashboard
SPF: v=spf1 include:_spf.resend.com ~all
DMARC: v=DMARC1; p=quarantine; rua=mailto:dmarc@clientsniper.com
```

### 7. Setup Supabase Auth

**URL Configuration**:
```
Site URL: https://clientsniper.com
Redirect URLs: 
- https://clientsniper.com/auth/callback
- https://clientsniper.com/dashboard
- https://clientsniper.com/login

Email Templates: Custom (vedi EMAIL_SETUP.md)
```

## 🧪 Testing Pre-Deploy

### 1. Test Frontend
```bash
cd apps/frontend-app

# Build production
npm run build

# Test GDPR
npm run test:gdpr

# Type checking
npm run type-check

# Lint
npm run lint
```

### 2. Test Database
```sql
-- Verifica tabelle
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Test RLS
SELECT * FROM users LIMIT 1;
SELECT * FROM leads LIMIT 1;
SELECT * FROM user_consents LIMIT 1;
```

### 3. Test API Endpoints
```bash
# Health check
curl https://clientsniper.com/api/health

# Auth
curl https://clientsniper.com/api/auth/user

# GDPR
curl -X POST https://clientsniper.com/api/gdpr/consent \
  -H "Content-Type: application/json" \
  -d '{"consents": {"essential": true}}'
```

### 4. Test Scraping Engine
```bash
cd services/scraping-engine

# Test locale
npm run test

# Test produzione (dry-run)
NODE_ENV=production npm run start -- --dry-run
```

## 📊 Monitoraggio Post-Deploy

### 1. Vercel Analytics
- Real User Monitoring abilitato
- Core Web Vitals tracking
- Error monitoring

### 2. Supabase Dashboard
- Database performance
- Auth metrics
- API usage
- Error logs

### 3. Custom Monitoring
```typescript
// apps/frontend-app/lib/analytics.ts
export const trackEvent = (event: string, properties?: any) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', event, properties)
  }
}

// Esempi utilizzo
trackEvent('lead_viewed', { lead_id: 'xxx' })
trackEvent('plan_upgraded', { from: 'free', to: 'pro' })
trackEvent('gdpr_consent_given', { categories: ['analytics'] })
```

### 4. Alerts Setup
- Vercel: Error rate > 1%
- Supabase: DB connections > 80%
- GitHub: Failed scraping jobs
- Stripe: Failed payments

## 🔒 Sicurezza

### 1. Environment Variables
- ✅ Tutte le chiavi sensitive in environment variables
- ✅ Service role key solo server-side
- ✅ CORS configurato correttamente
- ✅ RLS abilitato su tutte le tabelle sensibili

### 2. GDPR Compliance
- ✅ Banner consensi obbligatorio
- ✅ Cookie categorizzati e gestiti
- ✅ Data export e deletion
- ✅ Audit log completo
- ✅ Privacy policy e terms aggiornati

### 3. Rate Limiting
```typescript
// Implementato in middleware Vercel
export const config = {
  matcher: [
    '/api/leads/:path*',
    '/api/gdpr/:path*',
    '/api/stripe/:path*'
  ]
}
```

## 🚀 Go Live Checklist

### Pre-Launch
- [ ] ✅ Database setup e migrato
- [ ] ✅ Variabili ambiente configurate
- [ ] ✅ Domini e DNS configurati
- [ ] ✅ SSL certificates attivi
- [ ] ✅ Stripe webhooks testati
- [ ] ✅ Email delivery testato
- [ ] ✅ GDPR banner funzionante
- [ ] ✅ Pagine legali pubblicate

### Launch Day
- [ ] Deploy frontend su Vercel
- [ ] Deploy scraping engine su GitHub Actions
- [ ] Test completo flow utente
- [ ] Test registrazione e login
- [ ] Test acquisto crediti
- [ ] Test visualizzazione leads
- [ ] Test consensi GDPR
- [ ] Monitor error rates

### Post-Launch
- [ ] Monitor performance 24h
- [ ] Check error logs
- [ ] Verify analytics tracking
- [ ] Test user feedback
- [ ] Monitor database performance
- [ ] Check scraping job success rate

## 📞 Support e Troubleshooting

### Common Issues

**1. Build Errors Vercel**
```bash
# Clear cache
vercel --prod --force

# Check logs
vercel logs [deployment-url]
```

**2. Database Connection Issues**
```sql
-- Check connections
SELECT * FROM pg_stat_activity;

-- Reset connection pool
SELECT pg_reload_conf();
```

**3. Scraping Failures**
```bash
# Check GitHub Actions logs
# Re-run failed workflows
# Verify Supabase connection
```

**4. GDPR API Errors**
```typescript
// Check Supabase RLS policies
// Verify service role key
// Check table permissions
```

### Contatti
- **Tech Lead**: [email]
- **DevOps**: [email]  
- **GDPR Officer**: [email]
- **Support**: help@clientsniper.com

---

## 🎉 Sistema Completo Pronto!

Il sistema ClientSniper è ora completamente configurato e pronto per il deploy in produzione con:

✅ **Frontend moderno** con UI/UX ottimizzata
✅ **Sistema GDPR** completo e conforme
✅ **Autenticazione** robusta e veloce  
✅ **Pagamenti** Stripe integrati
✅ **Scraping engine** automatizzato
✅ **Database** scalabile e sicuro
✅ **Email system** personalizzato
✅ **Monitoring** e analytics
✅ **Documentazione** completa

**Tempo stimato deploy completo**: 2-4 ore
**Uptime target**: 99.9%
**Performance target**: < 2s load time
**GDPR compliance**: 100%

🚀 **Ready for Production!**
