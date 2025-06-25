# Deploy Vercel - Frontend Configuration

Questo file documenta la configurazione per il deploy del frontend Next.js su Vercel.

## Configurazione Vercel

### 1. Variabili d'ambiente richieste su Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key  
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

### 2. Impostazioni progetto Vercel:

- **Framework**: Next.js
- **Root Directory**: `apps/frontend-app`
- **Build Command**: `cd apps/frontend-app && npm run build`
- **Install Command**: `npm install && cd apps/frontend-app && npm install`
- **Output Directory**: `.next`

### 3. Deploy:

1. Connetti il repository GitHub a Vercel
2. Seleziona il branch `main` per auto-deploy
3. Configura le variabili d'ambiente nel dashboard Vercel
4. Deploy automatico ad ogni push su main

### 4. Funzioni API:

- Timeout massimo: 30 secondi per le API routes
- Edge Runtime supportato per performance ottimali
