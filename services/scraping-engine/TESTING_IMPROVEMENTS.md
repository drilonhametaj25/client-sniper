# Test delle Migliorie Google Maps Scraper

Dopo le migliorie implementate per risolvere i problemi di timeout, sono disponibili diversi comandi per testare il sistema.

## 🚀 Comandi di Test Disponibili

### Test Completo
```bash
npm run test:google-maps
```
- Esegue un test completo del Google Maps Scraper
- Include analisi dei siti web
- Mostra statistiche dettagliate delle performance
- Durata: ~2-5 minuti

### Test Veloce (Raccomandato per debug)
```bash
npm run test:quick
```
- Test ridotto senza analisi siti web
- Verifica solo il sistema di retry e timeout
- Perfetto per validare le migliorie rapidamente
- Durata: ~30-60 secondi

### Test Strategie Caricamento
```bash
npm run test:page-load
```
- Testa specificatamente le strategie di caricamento pagina
- Verifica la robustezza del sistema di navigazione
- Durata: ~1-2 minuti

## 🔧 Migliorie Implementate

### 1. Sistema di Retry Intelligente
- **3 tentativi** con attesa progressiva
- Cleanup automatico del browser tra i tentativi
- Logging dettagliato degli errori

### 2. Strategie Multiple di Caricamento
- **Strategia 1**: `domcontentloaded` (30s timeout)
- **Strategia 2**: `load` (45s timeout)  
- **Strategia 3**: `networkidle` (20s timeout)
- Fallback automatico se una strategia fallisce

### 3. Health Check del Browser
- Verifica automatica connessione browser
- Riavvio automatico se disconnesso
- Test di funzionalità prima dell'utilizzo

### 4. Configurazioni Browser Ottimizzate
```javascript
args: [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-images',              // ⚡ Velocizza caricamento
  '--disable-background-timer-throttling',
  '--memory-pressure-off',
  '--max_old_space_size=4096'     // 🧠 Più memoria
]
```

### 5. Monitoraggio Performance
- Tracking automatico di successi/fallimenti
- Analisi errori più comuni
- Raccomandazioni di ottimizzazione
- Statistiche timing dettagliate

## 📊 Esempio Output Test Veloce

```
⚡ === TEST VELOCE TIMEOUT ===
🔍 Test: "agenzia web" in Milano
⚡ Modalità veloce: maxResults=3, no analisi siti

✅ === RISULTATI VELOCI ===
⏱️  Durata: 45s
🎯 Successo: true
📈 Lead trovati: 3
✅ Sistema di timeout funzionante!

📊 Tentativi: 3, Successi: 3
```

## 🐛 Debug Problemi Comuni

### Se i test falliscono ancora con timeout:

1. **Verifica connessione internet**:
   ```bash
   curl -I https://maps.google.com
   ```

2. **Aumenta timeout nelle configurazioni**:
   Modifica `src/config/scraping-config.ts`

3. **Testa strategia singola**:
   ```bash
   npm run test:page-load
   ```

4. **Controlla logs dettagliati**:
   I test mostrano ogni tentativo e strategia utilizzata

### Errori di memoria:
- Il browser ora usa `--memory-pressure-off`
- Aumento heap size a 4GB
- Cleanup automatico tra tentativi

### Rate limiting Google:
- Delay randomici tra richieste
- User agent rotazione automatica
- Headers ottimizzati per evitare detection

## 📈 Metriche di Successo

**Prima delle migliorie:**
- Timeout frequenti dopo 20s
- Nessun sistema di retry
- Browser non ottimizzato

**Dopo le migliorie:**
- Retry automatico con 3 tentativi
- Strategie multiple di caricamento
- Browser ottimizzato per stabilità
- Monitoraggio automatico performance

## 🎯 Prossimi Passi

1. Esegui `npm run test:quick` per validare le migliorie
2. Se il test passa, le migliorie funzionano
3. Il sistema cron beneficerà automaticamente dei miglioramenti
4. Monitora le statistiche per ulteriori ottimizzazioni
