# 🔄 Reset Lead e Zone di Scraping

Questa cartella contiene gli script per resettare il database dei lead e riavviare lo scraping quando vengono aggiornati gli engine di analisi.

## 📁 File Inclusi

### 1. `reset-leads-and-zones.sql`
**Script SQL completo per il reset del database**

- ✅ **Cancella**: Tutti i lead, unlock utenti, log scraping
- ✅ **Mantiene**: Utenti, piani, pagamenti, feedback, settings
- ✅ **Resetta**: Zone di scraping con score ottimizzati
- ✅ **Inserisce**: Zone principali italiane se mancanti

### 2. `reset-leads-and-zones.sh`
**Script bash automatizzato con controlli di sicurezza**

- 🔒 Richiede conferma esplicita ("RESET")
- 📦 Crea backup automatico prima del reset
- 🔄 Riavvia servizi di scraping
- ✅ Verifica finale del sistema
- 📊 Report dettagliato delle operazioni

### 3. `reset-functions.sql`
**Funzioni RPC Supabase per reset via API**

- `reset_leads_and_scraping_zones()` - Reset completo via API
- `backup_important_zones()` - Backup zone ad alto score
- `get_reset_preview()` - Anteprima di cosa verrà cancellato

## 🚀 Come Usare

### Metodo 1: Script Bash (Raccomandato)
```bash
# Dalla root del progetto
cd /path/to/ClientSniper

# Assicurati di avere le variabili ambiente
export SUPABASE_URL="your_supabase_url"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
export DATABASE_URL="your_direct_db_url"  # opzionale

# Esegui il reset
./scripts/reset-leads-and-zones.sh
```

### Metodo 2: SQL Diretto
```bash
# Se hai accesso diretto al database
psql "$DATABASE_URL" -f database/reset-leads-and-zones.sql
```

### Metodo 3: Supabase Dashboard
1. Apri Supabase Dashboard
2. Vai in **SQL Editor**
3. Copia il contenuto di `reset-functions.sql` ed esegui
4. Poi copia e esegui `reset-leads-and-zones.sql`

### Metodo 4: API Call
```bash
# Dopo aver installato le funzioni RPC
curl -X POST "$SUPABASE_URL/rest/v1/rpc/reset_leads_and_scraping_zones" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## ⚠️ Cosa Viene Cancellato

### ❌ CANCELLATO
- **Tutti i lead** (tabella `leads`)
- **Analisi lead** (tabella `lead_analysis`) 
- **Lead sbloccati utenti** (tabella `user_unlocked_leads`)
- **Log scraping** (tabella `scrape_logs`)
- **Crediti usati per unlock** (da `credit_usage_log`)

### ✅ MANTENUTO
- **Utenti** (tabella `users`)
- **Piani** (tabella `plans`)
- **Pagamenti Stripe** (tabella `subscriptions`)
- **Feedback** (tabella `feedback_reports`)
- **Settings** (tabella `settings`)
- **Log di sistema**

## 🗺️ Zone di Scraping

### Zone Principali Inserite Automaticamente
- **Dentisti**: Milano (90), Roma (90), Napoli (80), Torino (80), Bologna (75), Firenze (75)
- **Avvocati**: Milano (85), Roma (85), Napoli (75), Torino (75), Bologna (70), Firenze (70)
- **Ristoranti**: Milano (80), Roma (80), Napoli (75), Torino (70), Bologna (70)
- **Parrucchieri**: Milano (70), Roma (70), Napoli (65), Torino (60), Bologna (60)
- **Idraulici**: Milano (65), Roma (65), Napoli (60), Torino (55), Bologna (55)
- **Agenzie Immobiliari**: Milano (75), Roma (75), Napoli (65), Torino (65), Bologna (60)

### Score Assegnati per Città
- **Milano, Roma**: 90-85 (mercato premium)
- **Napoli, Torino**: 80-75 (mercato importante) 
- **Bologna, Firenze**: 75-70 (mercato medio-alto)
- **Palermo, Bari, Catania**: 70-65 (mercato medio)
- **Altre città**: 60-50 (score default)

## 📊 Monitoraggio Post-Reset

### Verifica Sistema
```sql
-- Controlla che tutto sia resettato
SELECT 
    (SELECT COUNT(*) FROM leads) as leads_count,
    (SELECT COUNT(*) FROM zones_to_scrape) as zones_count,
    (SELECT COUNT(*) FROM zones_to_scrape WHERE is_scraping_now = true) as zones_scraping,
    (SELECT COUNT(*) FROM user_unlocked_leads) as unlocked_leads;
```

### Log Scraping
```bash
# Monitora i nuovi lead che arrivano
tail -f logs/scraping-engine.log
```

### Dashboard
- Verifica che la dashboard mostri 0 lead inizialmente
- Monitora l'arrivo di nuovi lead dalle zone
- Controlla che gli engine di analisi funzionino

## 🔧 Personalizzazioni

### Aggiungere Nuove Zone
Modifica il file SQL per includere altre città:
```sql
INSERT INTO zones_to_scrape (source, category, location_name, score)
VALUES ('google_maps', 'dentisti', 'Venezia', 65);
```

### Modificare Score Zone
```sql
UPDATE zones_to_scrape 
SET score = 95 
WHERE location_name = 'Milano' AND category = 'dentisti';
```

### Ripristinare Crediti Utenti
Decommenta la sezione 4 nel file SQL per resettare anche i crediti:
```sql
UPDATE users SET credits_remaining = 
    CASE 
        WHEN plan = 'free' THEN 2
        WHEN plan = 'starter' THEN 50  
        WHEN plan = 'pro' THEN 200
        ELSE credits_remaining
    END;
```

## 🛡️ Sicurezza

- ⚠️ **Mai eseguire in produzione** senza backup completo
- 🔒 Script richiede conferma esplicita ("RESET")
- 📦 Backup automatico delle zone importanti
- 👥 Solo admin possono eseguire le funzioni RPC
- 📝 Ogni reset viene loggato per audit

## 🔄 Quando Usare

### Motivi per Reset Completo
1. **Engine di analisi aggiornati** - Nuovi algoritmi di scoring
2. **Struttura database cambiata** - Nuovi campi analisi
3. **Test nuove zone** - Sperimentare nuove città/categorie
4. **Pulizia periodica** - Rimuovere lead obsoleti
5. **Debugging** - Isolare problemi di scraping

### Alternative al Reset Completo
- **Soft reset**: Cancella solo lead vecchi di X giorni
- **Zone specifiche**: Reset solo alcune categorie/città
- **Incremental**: Mantieni lead migliori, cancella solo quelli a basso score

## 📚 Log e Backup

### Backup Automatici
- Script crea backup in `./backups/YYYYMMDD_HHMMSS/`
- Include zone ad alto score per ripristino rapido
- Log operazioni in `./logs/reset-history.log`

### Recovery
Se qualcosa va storto:
```bash
# Ripristina zone da backup
psql "$DATABASE_URL" -c "INSERT INTO zones_to_scrape SELECT * FROM backup_zones;"

# Verifica integrità
./scripts/verify-database-integrity.sh
```

## ✅ Checklist Post-Reset

- [ ] Database resettato correttamente
- [ ] Zone di scraping configurate  
- [ ] Servizi di scraping riavviati
- [ ] Log monitorati per errori
- [ ] Dashboard accessibile
- [ ] Test inserimento nuovo lead manuale
- [ ] Verifica email notifiche funzionanti
- [ ] Backup completato e verificato

---

🎯 **Obiettivo**: Permettere aggiornamenti frequenti degli engine mantenendo la stabilità del sistema e la sicurezza dei dati utente!
