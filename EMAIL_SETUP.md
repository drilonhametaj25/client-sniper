# Configurazione Email Personalizzate - ClientSniper

Questo documento spiega come configurare e utilizzare il sistema di email personalizzate per ClientSniper, sostituendo le email di default di Supabase con template professionali.

## 🎯 Panoramica

Il sistema include:
- **Template email responsivi** con design professionale
- **Servizio email robusto** (Resend API)
- **Webhook personalizzato** per intercettare eventi Supabase
- **Email di conferma** e **benvenuto** automatiche

## 📧 Tipi di Email

### 1. Email di Conferma Account
- **Trigger**: Quando l'utente si registra al piano free
- **Design**: Gradiente viola, CTA prominente, lista benefici
- **Include**: URL di conferma, guida rapida, supporto

### 2. Email di Benvenuto
- **Trigger**: Quando l'utente conferma l'email
- **Design**: Gradiente verde, celebrazione, quick start guide
- **Include**: Link dashboard, passi per iniziare

### 3. Email Personalizzate
- **Trigger**: Via API per notifiche speciali
- **Design**: Template flessibile
- **Include**: Contenuto custom

## 🚀 Setup Completo

### Passo 1: Configurare Resend

1. Vai su [resend.com](https://resend.com) e crea un account
2. Crea una nuova API key
3. Aggiungi la chiave alle variabili ambiente:

```bash
RESEND_API_KEY=re_your_actual_api_key
```

### Passo 2: Configurare il Dominio (Opzionale ma consigliato)

1. Nel dashboard Resend, vai su "Domains"
2. Aggiungi il tuo dominio (es: `clientsniper.com`)
3. Configura i record DNS come indicato
4. Aggiorna il campo `from` nel servizio email:

```typescript
from: 'ClientSniper <noreply@tuodominio.com>'
```

### Passo 3: Configurare Webhook Supabase

1. Vai nel **Supabase Dashboard** → Il tuo progetto
2. **Database** → **Webhooks** 
3. Crea nuovo webhook:
   - **Table**: `auth.users`
   - **Events**: `INSERT`, `UPDATE`
   - **URL**: `https://tuodominio.com/api/auth/webhook`
   - **HTTP Headers**: 
     ```
     Authorization: Bearer your_webhook_secret_here
     ```

### Passo 4: Disabilitare Email Default Supabase

1. **Supabase Dashboard** → **Authentication** → **Settings**
2. **Email Templates** → **Confirm signup**
3. **Disabilita** "Enable email confirmations"
4. Oppure personalizza il template per reindirizzare al tuo webhook

### Passo 5: Variabili Ambiente Produzione

Aggiungi a **Vercel** e **GitHub Actions**:

```bash
RESEND_API_KEY=re_your_resend_api_key
NEXT_PUBLIC_SITE_URL=https://tuodominio.com
SUPABASE_WEBHOOK_SECRET=your_secure_webhook_secret
```

## 🔧 API Endpoints

### `/api/email` - Inviare Email

```typescript
// Email di conferma
POST /api/email
{
  "type": "confirmation",
  "to": "user@example.com",
  "confirmationUrl": "https://app.com/confirm?token=abc123"
}

// Email di benvenuto
POST /api/email
{
  "type": "welcome", 
  "to": "user@example.com",
  "dashboardUrl": "https://app.com/dashboard"
}

// Email personalizzata
POST /api/email
{
  "type": "custom",
  "to": "user@example.com", 
  "customTemplate": {
    "subject": "Il tuo titolo",
    "html": "<h1>HTML content</h1>",
    "text": "Plain text content"
  }
}
```

### `/api/auth/webhook` - Webhook Supabase

Gestisce automaticamente:
- Registrazione nuovo utente → Email di conferma
- Conferma email → Email di benvenuto
- Creazione record nella tabella `users`

## 🎨 Personalizzazione Template

### Modificare i Colori

Nel file `email-service.ts`, aggiorna:

```typescript
// Colore primario (viola -> il tuo brand)
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

// Colore successo (verde -> il tuo brand) 
background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
```

### Aggiungere Logo

```html
<img src="https://tuodominio.com/logo.png" 
     alt="ClientSniper" 
     style="height: 40px; margin-bottom: 20px;">
```

### Modificare Contenuto

Aggiorna i metodi:
- `getConfirmationEmailTemplate()` - Email di conferma
- `getWelcomeEmailTemplate()` - Email di benvenuto

## 🧪 Testing

### Test in Development

```bash
# Test email di conferma
curl "http://localhost:3000/api/email?email=test@example.com"
```

### Test Template

1. Apri il file HTML generato in un browser
2. Usa servizi come [Litmus](https://litmus.com) per test multi-client
3. Verifica rendering su mobile/desktop

## 📊 Monitoraggio

### Log delle Email

Il sistema logga automaticamente:
- ✅ Email inviate con successo
- ❌ Errori di invio
- 📧 Dettagli recipient e tipo

### Metriche Resend

Nel dashboard Resend puoi monitorare:
- Tasso di consegna
- Aperture email
- Click sui link
- Bounce e complaint

## 🔒 Sicurezza

### Webhook Security

- Usa `SUPABASE_WEBHOOK_SECRET` forte e unico
- Verifica sempre l'header `Authorization`
- Log accessi non autorizzati

### Rate Limiting

Resend ha limiti automatici:
- **Free**: 100 email/giorno
- **Pro**: 10,000+ email/mese

### Privacy

- Non loggiamo contenuto email sensibile
- Rispettiamo GDPR per utenti EU
- Possibilità di opt-out nei template

## 🚨 Troubleshooting

### Email Non Ricevute

1. **Controlla spam/junk folder**
2. **Verifica API key Resend**
3. **Controlla log console per errori**
4. **Verifica dominio configurato**

### Webhook Non Funziona

1. **Controlla URL webhook in Supabase**
2. **Verifica secret nell'header Authorization**
3. **Controlla log API `/api/auth/webhook`**

### Template Broken

1. **Valida HTML con validator online**
2. **Testa su client email diversi**
3. **Controlla CSS inline supportato**

## 🎯 Roadmap Future

- [ ] A/B testing dei template
- [ ] Segmentazione utenti per email diverse
- [ ] Template per lead notifications
- [ ] Email di recovery password personalizzate
- [ ] Newsletter periodiche
- [ ] Template multilingua

## 📞 Supporto

Per problemi o domande sul sistema email:
1. Controlla i log dell'applicazione
2. Verifica la documentazione Resend
3. Consulta gli esempi di template inclusi

---

✨ **Pro Tip**: Testa sempre le email in ambiente di sviluppo prima del deploy in produzione!
