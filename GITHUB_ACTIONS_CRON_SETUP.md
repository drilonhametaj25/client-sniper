# Configurazione Cron Job Mensile TrovaMi.pro

Questo documento descrive come configurare il cron job automatico per il reset mensile delle sostituzioni nel sistema TrovaMi.pro.

## 🎯 Panoramica

Il sistema prevede un reset automatico delle sostituzioni ogni primo giorno del mese alle 00:01, permettendo agli utenti di utilizzare nuovamente i loro crediti mensili per le sostituzioni.

## 🗄️ Componenti Database

### Funzione di Reset Automatico
La funzione `monthly_reset_replacements_job()` è già inclusa nel file `/database/new-pricing-system.sql`:

```sql
CREATE OR REPLACE FUNCTION monthly_reset_replacements_job()
RETURNS TEXT AS $$
DECLARE
    reset_count INTEGER;
BEGIN
    -- Reset counter sostituzioni per tutti gli utenti
    UPDATE public.user_replacement_requests 
    SET used_this_month = 0
    WHERE date_trunc('month', last_reset::date) < date_trunc('month', CURRENT_DATE);
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    
    -- Aggiorna timestamp ultimo reset
    UPDATE public.user_replacement_requests 
    SET last_reset = NOW()
    WHERE date_trunc('month', last_reset::date) < date_trunc('month', CURRENT_DATE);
    
    -- Log operazione
    INSERT INTO public.system_logs (operation, details, created_at)
    VALUES ('monthly_replacement_reset', 
            format('Reset effettuato per %s utenti', reset_count),
            NOW());
    
    RETURN format('✅ Reset completato per %s utenti', reset_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 🖥️ Setup Server

### 1. Installazione Script
Esegui lo script di setup sul tuo server:

```bash
# Scarica e esegui lo script di configurazione
chmod +x scripts/setup-monthly-reset-cron.sh
sudo ./scripts/setup-monthly-reset-cron.sh
```

### 2. Configurazione Credenziali
Modifica il file delle variabili d'ambiente:

```bash
sudo nano /opt/trovami/cron.env
```

Imposta i valori corretti:

```bash
# Configurazione database per cron job TrovaMi.pro
SUPABASE_DB_HOST=your-project-id.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-database-password

# Configurazioni opzionali
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Timezone
TZ=Europe/Rome
```

### 3. Test Manuale
Testa il funzionamento prima dell'attivazione automatica:

```bash
# Test dello script
sudo /opt/trovami/monthly-reset.sh

# Verifica log
tail -f /var/log/trovami/monthly-reset-$(date +%Y%m).log
```

## 📅 Configurazione Cron Job

### Verifica Cron Job Attivo
```bash
# Visualizza cron job attivi
sudo crontab -l

# Output atteso:
# 1 0 1 * * /bin/bash -c 'source /opt/trovami/cron.env && /opt/trovami/monthly-reset.sh'
```

### Modifica Pianificazione
Se vuoi modificare l'orario di esecuzione:

```bash
sudo crontab -e
```

Formato cron: `minuto ora giorno mese giorno_settimana comando`
- `1 0 1 * *` = alle 00:01 del primo giorno di ogni mese

Esempi alternativi:
```bash
# Ogni giorno alle 02:00 (per test)
0 2 * * * /bin/bash -c 'source /opt/trovami/cron.env && /opt/trovami/monthly-reset.sh'

# Primo di ogni mese alle 06:00
0 6 1 * * /bin/bash -c 'source /opt/trovami/cron.env && /opt/trovami/monthly-reset.sh'
```

## � Monitoraggio

### Log System
I log vengono salvati automaticamente:

```bash
# Log corrente
tail -f /var/log/trovami/monthly-reset-$(date +%Y%m).log

# Tutti i log
ls -la /var/log/trovami/

# Log precedenti
cat /var/log/trovami/monthly-reset-202312.log
```

### Verifica Ultima Esecuzione
Query per controllare l'ultimo reset:

```sql
SELECT * FROM system_logs 
WHERE operation = 'monthly_replacement_reset' 
ORDER BY created_at DESC 
LIMIT 5;
```

## � Troubleshooting

### Problemi Comuni

**1. Permessi Negati**
```bash
# Verifica permessi script
ls -la /opt/trovami/monthly-reset.sh
# Deve essere: -rwxr-xr-x root root

# Correggi permessi se necessario
sudo chmod +x /opt/trovami/monthly-reset.sh
```

**2. Connessione Database Fallita**
```bash
# Test connessione manuale
PGPASSWORD="your-password" psql -h your-project.supabase.co -p 5432 -U postgres -d postgres -c "SELECT NOW();"
```

**3. Cron Job Non Eseguito**
```bash
# Verifica servizio cron attivo
sudo systemctl status cron

# Riavvia se necessario
sudo systemctl restart cron

# Log cron system
sudo tail -f /var/log/syslog | grep CRON
```

### Notifiche Opzionali

Per ricevere notifiche Slack, configura il webhook:

```bash
# Nel file /opt/trovami/cron.env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

Poi decomenta le righe nel script di reset:

```bash
sudo nano /opt/trovami/monthly-reset.sh

# Decommenta:
curl -X POST "$SLACK_WEBHOOK_URL" \
     -H 'Content-type: application/json' \
     --data '{"text":"✅ Reset sostituzioni TrovaMi completato per '"$(date +%B\ %Y)"'"}'
```

## 🚀 Deploy Checklist

- [ ] Database migrato con funzione `monthly_reset_replacements_job()`
- [ ] Script cron installato con `setup-monthly-reset-cron.sh`
- [ ] Credenziali configurate in `/opt/trovami/cron.env`
- [ ] Test manuale dello script completato
- [ ] Cron job verificato con `sudo crontab -l`
- [ ] Log directory creata in `/var/log/trovami/`
- [ ] (Opzionale) Notifiche Slack configurate

## 📱 Monitoraggio Continuo

### Dashboard Query
Per monitorare il sistema dal dashboard admin:

```sql
-- Statistiche reset mensili
SELECT 
    DATE_TRUNC('month', created_at) as mese,
    COUNT(*) as reset_eseguiti,
    details
FROM system_logs 
WHERE operation = 'monthly_replacement_reset'
GROUP BY DATE_TRUNC('month', created_at), details
ORDER BY mese DESC;

-- Prossimo reset previsto
SELECT 
    'Prossimo reset: ' || TO_CHAR(DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month', 'DD/MM/YYYY alle 00:01') as info;
```

Il sistema è ora completamente configurato per gestire automaticamente il reset mensile delle sostituzioni! 🎉
