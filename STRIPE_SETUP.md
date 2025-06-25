# Setup Stripe per ClientSniper

## 1. Configurazione Stripe

1. Vai su [Stripe Dashboard](https://dashboard.stripe.com)
2. Crea un nuovo account o usa un esistente
3. Vai in **Developers > API Keys**
4. Copia le chiavi per il test:
   - Publishable key: `pk_test_...`
   - Secret key: `sk_test_...`

## 2. Creazione dei Price ID

1. Vai in **Products** nel Stripe Dashboard
2. Crea due prodotti:

### Prodotto Starter (€29/mese)
- Nome: "ClientSniper Starter"  
- Prezzo: €29.00 EUR
- Ricorrenza: Mensile
- Copia il Price ID (es: `price_1Abc...`)

### Prodotto Pro (€79/mese)
- Nome: "ClientSniper Pro"
- Prezzo: €79.00 EUR  
- Ricorrenza: Mensile
- Copia il Price ID (es: `price_1Def...`)

## 3. Configurazione Webhook

1. Vai in **Developers > Webhooks**
2. Clicca "Add endpoint"
3. URL: `https://tuo-dominio.com/api/stripe/webhook`
4. Seleziona eventi:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
5. Copia il Webhook Secret

## 4. File .env.local

Crea il file `.env.local` con:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=sk_test_your_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Price IDs
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_your_starter_price_id
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_your_pro_price_id
```

## 5. Test del flusso

1. Avvia l'app: `npm run dev`
2. Fai login come utente normale
3. Vai su `/upgrade`
4. Testa il checkout con la carta test: `4242 4242 4242 4242`
5. Completa il pagamento
6. Verifica che l'utente sia aggiornato nel database

## 6. Database Update

Esegui nel SQL Editor di Supabase:

```sql
-- Aggiungi campi Stripe
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Indici
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON public.users (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON public.users (stripe_subscription_id);
```

## 7. Test Webhook in locale

Per testare i webhook in sviluppo:

1. Installa Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Forward webhook: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. Usa il webhook secret mostrato nel comando

## Carta di test Stripe

- Numero: `4242 4242 4242 4242`
- Scadenza: Qualsiasi data futura
- CVC: Qualsiasi 3 cifre
- CAP: Qualsiasi codice

## Debug

- Controlla i log Stripe Dashboard > Developers > Logs
- Controlla console browser per errori
- Verifica database per aggiornamenti utente
