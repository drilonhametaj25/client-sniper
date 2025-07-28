# 🔧 Configurazione GitHub Actions per Reset Crediti

Questo documento spiega come configurare GitHub Actions per il reset automatico dei crediti utenti.

## 📋 Setup Secrets

Devi aggiungere questi secrets nel repository GitHub:

### 1. 🌐 APP_URL
```
Nome: APP_URL
Valore: https://yourdomain.com
```
**Dove**: L'URL della tua app in produzione (senza trailing slash)

### 2. 🔐 CRON_SECRET  
```
Nome: CRON_SECRET
Valore: [genera con: openssl rand -base64 32]
```
**Dove**: Lo stesso secret che hai in Vercel come variabile ambiente

## 🔧 Come aggiungere i secrets

1. Vai su GitHub → Repository → Settings → Secrets and variables → Actions

2. Clicca "New repository secret"

3. Aggiungi i secrets sopra

## 📅 Schedule del Workflow

Il workflow è configurato per:
- **Automatico**: Ogni giorno a mezzanotte UTC
- **Manuale**: Puoi triggerarlo da GitHub Actions tab

## 🔄 Schedule Options

Puoi modificare lo schedule nel file `.github/workflows/reset-credits.yml`:

```yaml
schedule:
  - cron: '0 0 * * *'    # Ogni giorno a mezzanotte UTC
  # - cron: '0 0 1 * *'  # Primo di ogni mese
  # - cron: '0 2 * * 1'  # Ogni lunedì alle 2:00 AM
```

## 🧪 Testing

### Test Manuale
1. Vai su GitHub → Actions → "Reset Credits Daily"
2. Clicca "Run workflow" 
3. Scegli se forzare il reset anche per utenti Stripe
4. Clicca "Run workflow"

### Verifica Logs
1. Dopo l'esecuzione, clicca sul run
2. Espandi "Reset User Credits" 
3. Controlla i logs per vedere:
   - Utenti processati
   - Crediti resettati
   - Eventuali errori

## 🚀 Vantaggi GitHub Actions

✅ **Integrato**: Usa la stessa infrastruttura dello scraper
✅ **Gratis**: Per repository pubblici o con limiti generosi per privati  
✅ **Reliable**: GitHub ha un'uptime eccellente
✅ **Logs**: Logs persistenti e facili da consultare
✅ **Manual trigger**: Puoi triggerare manualmente quando serve
✅ **Notifications**: Notifica automatica su fallimenti

## 🔍 Monitoring

Il workflow logga automaticamente:
- HTTP status code della chiamata API
- Numero di utenti processati
- Numero di crediti resettati
- Timestamp dell'operazione
- Link ai logs per debugging

## 🆚 Confronto con altre opzioni

| Metodo | Costo | Setup | Reliability | Logs |
|--------|-------|-------|-------------|------|
| **GitHub Actions** | 🟢 Gratis | 🟡 Medio | 🟢 Alto | 🟢 Eccellenti |
| Vercel Cron | 🟢 Gratis | 🟢 Facile | 🟢 Alto | 🟡 Basilari |
| Server esterno | 🔴 Costo | 🔴 Complesso | 🟡 Dipende | 🟡 Custom |

## 🔗 Integrazione con l'ecosistema esistente

Dato che già usate GitHub Actions per lo scraping engine, questa è la scelta più coerente:

- **Stesso environment**: Usa "Production" environment
- **Stesso pattern**: Schedule + manual trigger
- **Stessi logs**: Upload artifacts per debugging  
- **Stessa security**: Secrets gestiti in modo uniforme

## 🎯 Next Steps

1. ✅ Aggiungi i secrets (APP_URL, CRON_SECRET)
2. ✅ Commit del workflow file (già fatto)
3. ✅ Test manuale del workflow
4. ✅ Verifica che il primo reset automatico funzioni
5. ✅ Monitora i logs per le prime settimane

## 🆘 Troubleshooting

**Se il workflow fallisce**:
1. Controlla che i secrets siano impostati correttamente
2. Verifica che APP_URL sia raggiungibile
3. Controlla i logs del workflow per errori specifici
4. Testa manualmente l'endpoint `/api/cron/reset-credits`

**Se non ricevi credits reset**:
1. Verifica che ci siano utenti che soddisfano i criteri
2. Controlla che `credits_reset_date` sia null o > 30 giorni fa
3. Verifica che `stripe_customer_id` sia null (per utenti non Stripe)
