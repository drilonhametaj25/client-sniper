# 🎯 Sistema di Consumo Crediti - ClientSniper

## Panoramica
Il sistema è stato riprogettato per essere più equo e trasparente. Ora gli utenti pagano solo per le informazioni di valore che ricevono.

## 🔒 Nuovo Modello: "Freemium con Preview"

### ✅ GRATUITO (Senza consumo crediti):
- **Ricerca e filtri**: Trova lead per categoria, città, ruoli necessari
- **Preview lead**: Vedi nome azienda, sito web, città, categoria, score
- **Navigazione**: Sfoglia tutta la dashboard senza limiti

### 💎 A PAGAMENTO (Consuma crediti):
1. **Sblocco dettagli lead** - 1 credito
   - Email di contatto
   - Numero di telefono
   - Lista completa problemi tecnici
   - Ruoli necessari dettagliati
   
2. **Visita sito web** - 1 credito
   - Apertura diretta del sito web del lead
   - Solo per lead già sbloccati

3. **Export CSV** - GRATUITO
   - Esporta solo i lead che hai già sbloccato
   - Nessun costo aggiuntivo per l'export

## 🎨 Indicatori Visivi

### Lead Non Sbloccati:
- ❌ Email e telefono oscurati con blur
- 🔒 Badge "Sblocca per vedere"
- ⚡ Bottone "Sblocca" con costo 1 credito
- 🟨 Testo informativo sui dettagli nascosti

### Lead Sbloccati:
- ✅ Badge verde "Sbloccato"
- 📧 Email e telefono visibili
- 🔗 Bottone per visitare il sito (costa 1 credito)
- 🌟 Bordo verde per distinguerli

## 📊 Vantaggi del Nuovo Sistema

### Per gli Utenti:
- **Trasparenza totale**: Sanno sempre quando pagano
- **Controllo**: Scelgono quali lead approfondire
- **Risparmio**: Non pagano per lead che non gli interessano
- **Preview gratuita**: Possono valutare prima di acquistare

### Per il Business:
- **Conversioni migliori**: Gli utenti vedono valore prima di pagare
- **Retention**: Gli utenti non si sentono "fregati"
- **Scalabilità**: Il modello si adatta a tutti i piani
- **Analytics**: Tracciamo precisamente quale contenuto vale

## 🔄 Flusso Utente Tipico

1. **Ricerca** (gratis): "Trova ristoranti a Milano con problemi SEO"
2. **Preview** (gratis): Vede lista con nomi e score
3. **Valutazione** (gratis): Ordina per score, filtra per interesse
4. **Sblocco selettivo** (1 credito): Sblocca solo i lead più promettenti
5. **Approfondimento** (1 credito): Visita i siti più interessanti
6. **Export** (gratis): Esporta la lista finale per il CRM

## � Sistema di Ricarica Automatica

### **Quando si ricaricano i crediti:**

1. **Ricarica Mensile Automatica** 🗓️
   - **Quando**: Primo giorno di ogni mese alle 2:00 AM
   - **Quanto**: Crediti pieni del piano (Free: 2, Starter: 50, Pro: 200)
   - **Come**: Script automatico via cron job

2. **Ricarica Immediata** ⚡
   - **Quando**: Upgrade a piano superiore
   - **Quanto**: Crediti pieni del nuovo piano
   - **Come**: Via Stripe webhook

3. **Tracciamento Trasparente** 📊
   - Ogni utente vede quando scadono i crediti
   - Countdown giorni rimanenti nella dashboard
   - Log completo di tutte le ricariche

### **Indicatori Utente:**
- 📅 **"Prossimo Reset"**: Card con giorni rimanenti
- 🔔 **Notifiche**: Avviso quando mancano 3 giorni
- 📈 **Progress**: Barra di utilizzo crediti mensili

## �📈 Metriche da Monitorare

- **Conversion Rate**: Preview → Sblocco
- **Crediti per sessione**: Quanti crediti usa mediamente un utente
- **Lead più sbloccati**: Quali caratteristiche rendono un lead appetibile
- **Retention**: Gli utenti tornano dopo aver speso crediti?

## 🎯 Risultato Atteso

Gli utenti ora:
- **Vedono valore** prima di pagare
- **Spendono in modo consapevole** i loro crediti
- **Non si sentono limitati** nella ricerca
- **Pagano solo per ciò che usano** davvero

Questo modello è molto più sostenibile e user-friendly del precedente sistema "tutto o niente".
