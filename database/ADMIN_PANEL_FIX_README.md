# Istruzioni per Fix Pannello Admin

Questo file contiene le istruzioni per risolvere i problemi del pannello admin di visualizzazione utenti.

## Problema

Il pannello admin attualmente presenta un problema di caricamento degli utenti dovuto a:

1. Errore "column reference 'id' is ambiguous" nella funzione RPC `admin_get_all_users`
2. Mancata sincronizzazione tra tabelle `auth.users` e `public.users`
3. Problema di permessi per accesso alla tabella `auth.users`

## Soluzione

È stato creato un file SQL che risolve tutti questi problemi: `admin_panel_fix.sql`

### Cosa fa lo script

1. **Sincronizza gli utenti mancanti** - Copia gli utenti da `auth.users` a `public.users` se non esistono
2. **Corregge la funzione `admin_get_all_users`** - Risolve l'errore di ambiguità delle colonne
3. **Crea una funzione migliorata `admin_get_complete_users`** - Unisce dati da entrambe le tabelle
4. **Verifica che l'utente admin sia configurato correttamente**

### Come applicare il fix

1. Accedi a Supabase e apri l'SQL Editor
2. Copia e incolla il contenuto del file `database/admin_panel_fix.sql`
3. Esegui lo script SQL
4. Verifica che non ci siano errori

```bash
# Se preferisci eseguirlo dalla CLI
cat database/admin_panel_fix.sql | supabase db execute
```

## Verifica

Dopo aver eseguito lo script, dovresti vedere:

1. Lo stesso numero di utenti in `auth.users` e `public.users`
2. La funzione RPC `admin_get_complete_users` disponibile tra le funzioni
3. Nessun errore di ambiguità colonne quando accedi al pannello admin

## Troubleshooting

Se continui a riscontrare problemi dopo aver eseguito lo script:

1. **Controlla i log del browser** - Potrebbero esserci errori JavaScript
2. **Verifica i permessi Supabase** - Assicurati che le funzioni RPC siano accessibili agli utenti autenticati
3. **Controlla il ruolo dell'utente** - Solo gli utenti con ruolo 'admin' possono accedere al pannello

```sql
-- Query per verificare se l'utente corrente è admin
SELECT id, email, role FROM public.users WHERE id = auth.uid();
```

4. **Forza aggiornamento cache del browser** - A volte i vecchi dati rimangono in cache

## Nota importante

Il codice frontend è stato aggiornato per utilizzare la nuova funzione `admin_get_complete_users` se disponibile, con fallback alla vecchia funzione e alla tabella `public.users` se necessario.

In caso di problemi persistenti, contattare il team di sviluppo.
