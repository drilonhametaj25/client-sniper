-- Queries per pulire utente esistente e permettere nuova registrazione
-- ESEGUI QUESTE NEL SQL EDITOR DI SUPABASE

-- 1. Trova l'utente esistente
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'lonny-4ever@hotmail.it';

-- 2. Cancella dalla tabella custom (se esiste)
DELETE FROM users WHERE email = 'lonny-4ever@hotmail.it';

-- 3. Cancella da auth.users (per permettere nuova registrazione)
DELETE FROM auth.users WHERE email = 'lonny-4ever@hotmail.it';

-- 4. Verifica che sia stato rimosso
SELECT COUNT(*) as utenti_rimasti 
FROM auth.users 
WHERE email = 'lonny-4ever@hotmail.it';

-- DOPO QUESTE QUERY, RIPROVA LA REGISTRAZIONE
