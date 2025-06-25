# ClientSniper Scraping Engine - Database Seeding

Questo documento spiega come utilizzare il sistema di seeding per popolare il database con le zone italiane per lo scraping distribuito.

## Overview

Il sistema di seeding popola automaticamente la tabella `zones_to_scrape` con:
- **100 zone italiane principali** (città e province)
- **3 fonti di scraping** (google_maps, yelp, pagine_gialle)  
- **5 categorie business** (ristoranti, idraulici, barberie, parrucchieri, dentisti)
- **Totale: 1.500 combinazioni** pronte per lo scraping

## Comandi Disponibili

### Migrazione Completa (Raccomandato)
```bash
npm run migrate
```
Esegue in sequenza:
1. Controllo e creazione tabelle mancanti
2. Applicazione indici e constrainti
3. Seeding automatico delle zone
4. Verifica finale

### Solo Seeding
```bash
# Seeding normale (idempotente, non crea duplicati)
npm run seed

# Reset completo e nuovo seeding (ATTENZIONE: cancella tutto!)
npm run seed:reset

# Mostra statistiche zone nel database
npm run seed:stats
```

## Seeding Automatico

Il seeding viene eseguito automaticamente:
- ✅ **All'avvio del sistema** (`npm run dev`)  
- ✅ **Solo se necessario** (idempotente)
- ✅ **Senza duplicati** (controlla esistenza)

## Struttura Dati

### Zone Italiane
Le 100 zone principali includono:
- **Città metropolitane**: Milano, Roma, Napoli, Torino...
- **Capoluoghi regionali**: Tutte le 20 regioni
- **Città importanti**: Maggiori centri per popolazione/economia
- **Coordinate GPS**: Per geolocalizzazione
- **Punteggio iniziale**: Basato sulla popolazione

### Fonti di Scraping
- `google_maps`: Google My Business e Maps
- `yelp`: Business directory Yelp
- `pagine_gialle`: Directory italiana tradizionale

### Categorie Business
- `ristoranti`: Ristoranti, pizzerie, trattorie
- `idraulici`: Servizi idraulici
- `barberie`: Barber shop e saloni uomo
- `parrucchieri`: Saloni di bellezza
- `dentisti`: Studi dentistici

## Logica di Priorità

Il sistema assegna priorità basate su:
- **Popolazione**: Città più grandi = punteggio più alto
- **Ultimo scraping**: Zone non scrappate di recente = priorità alta
- **Successo precedente**: Zone con molti lead = punteggio aumentato
- **Fallimenti**: Zone senza risultati = punteggio diminuito

### Formula Punteggio Iniziale
```typescript
// Normalizzazione popolazione 20K-2.9M -> 20-100 punti
score = 20 + ((popolazione - 20000) / (2900000 - 20000)) * 80
```

## Monitoraggio

### Statistiche Rapide
```bash
npm run seed:stats
```

Output esempio:
```
📊 STATISTICHE ZONES_TO_SCRAPE
================================
Totale zone: 1500

🔍 Per fonte:
  google_maps: 500
  yelp: 500  
  pagine_gialle: 500

🏢 Per categoria:
  ristoranti: 300
  idraulici: 300
  barberie: 300
  parrucchieri: 300
  dentisti: 300

🌍 Prime 10 regioni:
  Lombardia: 105
  Campania: 75
  Sicilia: 75
  ...
```

## Estensibilità

### Aggiungere Nuove Zone
Modifica il file `src/data/italian-zones.ts`:
```typescript
export const ITALIAN_ZONES: ItalianZone[] = [
  // ...zone esistenti...
  { 
    name: "Nuova Città", 
    region: "Regione", 
    population: 50000, 
    lat: 45.0000, 
    lng: 10.0000 
  },
];
```

### Aggiungere Nuove Fonti
```typescript
export const SCRAPING_SOURCES = [
  'google_maps',
  'yelp', 
  'pagine_gialle',
  'facebook_pages', // Nuova fonte
] as const;
```

### Aggiungere Nuove Categorie
```typescript
export const BUSINESS_CATEGORIES = [
  'ristoranti',
  'idraulici',
  'barberie',
  'parrucchieri',
  'dentisti',
  'avvocati', // Nuova categoria
] as const;
```

## Troubleshooting

### Errore "Tabelle Mancanti"
```bash
# Applica schema manualmente
psql -d your_db -f database/setup.sql

# Poi esegui seeding
npm run seed
```

### Errore "Credenziali Supabase"
Verifica il file `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key
# oppure
SUPABASE_ANON_KEY=your-anon-key
```

### Zone Duplicate
Il sistema è idempotente, ma se hai problemi:
```bash
# Reset completo (ATTENZIONE!)
npm run seed:reset
```

### Performance Lente
Il seeding usa batch di 100 righe con pause per evitare rate limiting. È normale che richieda alcuni minuti.

## Schema Database

Vedi il file `database/setup.sql` per lo schema completo della tabella `zones_to_scrape`.

## Integrazione con Scraping

Dopo il seeding, il sistema di scraping distribuito:
1. ✅ Recupera zone con punteggio alto
2. ✅ Evita zone già in scraping (`is_scraping_now = true`)
3. ✅ Rispetta intervalli minimi tra scraping
4. ✅ Aggiorna punteggi basati sui risultati
5. ✅ Logga ogni operazione in `scrape_logs`
