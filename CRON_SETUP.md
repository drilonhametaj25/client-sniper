# 🔄 Configurazione Cron Job per Ricarica Crediti

## Configurazione Server

### 1. Cron Job Locale (Linux/Mac)
```bash
# Modifica il crontab
crontab -e

# Aggiungi questa linea per eseguire il primo giorno di ogni mese alle 2:00 AM
0 2 1 * * cd /path/to/ClientSniper && node services/scraping-engine/scripts/recharge-credits.js

# Oppure ogni giorno alle 3:00 AM per controllo continuo
0 3 * * * cd /path/to/ClientSniper && node services/scraping-engine/scripts/recharge-credits.js
```

### 2. GitHub Actions (Opzione Cloud)
Crea `.github/workflows/recharge-credits.yml`:
```yaml
name: Ricarica Crediti Mensile

on:
  schedule:
    - cron: '0 2 1 * *'  # Primo giorno del mese alle 2:00 AM UTC
  workflow_dispatch:      # Permette esecuzione manuale

jobs:
  recharge-credits:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run recharge-credits
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

### 3. Vercel Cron Jobs
Crea `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/recharge-credits",
      "schedule": "0 2 1 * *"
    }
  ]
}
```

E crea `app/api/cron/recharge-credits/route.ts`:
```typescript
import { rechargeMonthlyCredits } from '@/services/scraping-engine/scripts/recharge-credits'

export async function GET() {
  try {
    await rechargeMonthlyCredits()
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
```

### 4. Railway/Render Cron Jobs
```bash
# Railway
railway run node services/scraping-engine/scripts/recharge-credits.js

# Render
node services/scraping-engine/scripts/recharge-credits.js
```

## Configurazione Database

### 1. Esegui setup iniziale
```sql
-- Esegui questo SQL in Supabase
\i credit-recharge-system.sql
```

### 2. Testa la funzione manualmente
```sql
-- Test ricarica singolo utente
SELECT recharge_user_credits('user-id-here');

-- Test ricarica tutti gli utenti scaduti
SELECT recharge_expired_users();

-- Verifica funzionamento
SELECT * FROM users WHERE credits_reset_date <= CURRENT_DATE;
```

## Monitoraggio

### 1. Log di Sistema
```typescript
// Nel tuo script di ricarica, aggiungi logging
console.log(`✅ Ricaricati ${result} utenti il ${new Date()}`)
```

### 2. Alerting
```typescript
// Invia notifica se fallisce
if (error) {
  await sendSlackNotification(`❌ Ricarica crediti fallita: ${error}`)
}
```

### 3. Dashboard Monitoraggio
Crea una pagina admin per vedere:
- Ultimo esecuzione script
- Utenti ricaricati
- Errori di sistema
- Statistiche crediti

## Sicurezza

### 1. Variabili Ambiente
```bash
SUPABASE_URL=your_url
SUPABASE_SERVICE_KEY=your_service_key  # ⚠️ Usa service key, non anon key
```

### 2. Rate Limiting
```typescript
// Aggiungi throttling per evitare sovraccarichi
await new Promise(resolve => setTimeout(resolve, 100))
```

### 3. Idempotency
```typescript
// Assicurati che multiple esecuzioni non creino problemi
if (lastRechargeDate === today) {
  console.log('✅ Ricarica già eseguita oggi')
  return
}
```

## Testing

### 1. Test Locale
```bash
# Esegui manualmente
npm run recharge-credits

# Con log verboso
DEBUG=true npm run recharge-credits
```

### 2. Test Staging
```bash
# Usa database di test
SUPABASE_URL=test_url npm run recharge-credits
```

### 3. Dry Run
```typescript
// Aggiungi flag dry-run
if (process.env.DRY_RUN === 'true') {
  console.log('🔍 Dry run: avrei ricaricato', usersToRecharge.length, 'utenti')
  return
}
```

## Best Practices

1. **Backup Prima**: Fai sempre backup prima di modifiche massive
2. **Graduatale**: Testa su piccoli gruppi prima di tutto
3. **Monitoring**: Monitora sempre le performance
4. **Rollback Plan**: Hai sempre un piano B
5. **Documentation**: Documenta ogni modifica

Questa configurazione ti garantisce una ricarica crediti automatica, sicura e monitorata! 🚀
