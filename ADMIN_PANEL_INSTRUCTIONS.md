# Istruzioni per il pannello admin utenti

Per visualizzare correttamente tutti gli utenti nel pannello admin, è necessario eseguire i seguenti passaggi:

## 1. Eseguire lo script SQL

Il file `database/admin-get-all-users.sql` contiene una funzione RPC che permette agli admin di visualizzare tutti gli utenti nel pannello di amministrazione. 

- Accedi al pannello SQL di Supabase
- Copia e incolla il contenuto del file `database/admin-get-all-users.sql` nell'editor
- Esegui la query

Questo creerà una funzione RPC chiamata `admin_get_all_users` che è accessibile solo agli utenti con ruolo `admin`.

## 2. Come funziona il nuovo pannello admin

Il pannello admin è stato aggiornato per:

- Mostrare tutti gli utenti registrati
- Visualizzare lo stato dell'utente (attivo, inattivo, cancellato)
- Permettere di modificare:
  - Piano utente (free, starter, pro)
  - Crediti disponibili
  - Stato dell'account

### Caratteristiche del pannello aggiornato:

- Visualizza tutti gli utenti (non solo l'admin stesso)
- Mostra statistiche complete (numero di utenti per piano, stato, ecc.)
- Permette di filtrare gli utenti per ruolo e piano
- Consente di cercare gli utenti per email
- Aggiunta la possibilità di modificare lo stato dell'utente

## 3. Troubleshooting

Se non visualizzi tutti gli utenti:
- Verifica che la funzione RPC `admin_get_all_users` sia stata creata correttamente in Supabase
- Controlla che l'utente con cui hai effettuato l'accesso abbia il ruolo `admin` nella tabella `users`
- Verifica che la tabella `users` contenga tutti gli utenti con i relativi dati di profilo

## Note tecniche

- La funzione `loadUsers()` ora esegue un merge tra i dati di `auth.users` (tramite RPC) e quelli della tabella `users`
- È stato aggiunto il campo `status` nel tipo `User`
- È stato implementato un nuovo badge per visualizzare lo stato dell'utente
