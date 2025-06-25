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
- **Build Command**: `npm run build`
- **Install Command**: `npm install`
- **Output Directory**: `.next`

⚠️ **Nota**: Il file `vercel.json` è configurato specificamente per monorepo Vercel. Non utilizza la proprietà `projects` (non supportata) ma configura direttamente il progetto frontend con `rootDirectory`.

### 3. Deploy:

1. Connetti il repository GitHub a Vercel
2. Seleziona il branch `main` per auto-deploy
3. Configura le variabili d'ambiente nel dashboard Vercel
4. Deploy automatico ad ogni push su main

### 4. Funzioni API:

- Timeout massimo: 30 secondi per le API routes
- Edge Runtime supportato per performance ottimali

## Troubleshooting

### Errore "should NOT have additional property 'projects'"

Se ricevi questo errore, significa che stai usando una configurazione `vercel.json` non supportata. La proprietà `projects` non è valida. Usa invece:

```json
{
  "version": 2,
  "name": "clientsniper-frontend",
  "framework": "nextjs",
  "rootDirectory": "apps/frontend-app"
}
```

### Deploy fallisce con errori di build

1. Verifica che tutte le variabili d'ambiente siano configurate su Vercel
2. Controlla che il `package.json` nel root abbia le dipendenze necessarie
3. Verifica che il `turbo.json` sia configurato correttamente

### Errori di Stripe Webhook

1. Configura l'endpoint webhook su Stripe Dashboard: `https://your-domain.vercel.app/api/stripe/webhook`
2. Assicurati che `STRIPE_WEBHOOK_SECRET` sia configurato correttamente
3. Verifica che la signature del webhook sia validata correttamente
