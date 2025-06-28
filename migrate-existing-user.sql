-- Migrazione utente esistente da auth.users a tabella custom
-- ESEGUI QUESTA NEL SQL EDITOR DI SUPABASE

-- 1. Verifica l'utente esistente
SELECT 
  id, 
  email, 
  email_confirmed_at, 
  created_at,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'lonny-4ever@hotmail.it';

-- 2. Inserisci nella tabella custom se non esiste
INSERT INTO users (id, email, plan, credits_remaining, created_at)
SELECT 
  id,
  email,
  'free' as plan,
  2 as credits_remaining,
  created_at
FROM auth.users 
WHERE email = 'lonny-4ever@hotmail.it'
AND id NOT IN (SELECT id FROM users)
ON CONFLICT (id) DO NOTHING;

-- 3. Verifica che sia stato creato
SELECT * FROM users WHERE email = 'lonny-4ever@hotmail.it';

-- 4. Se vuoi testare l'email, puoi triggare manualmente:
-- Chiama l'API endpoint per inviare email
-- curl -X POST https://client-sniper-frontend-app.vercel.app/api/email \
--   -H "Content-Type: application/json" \
--   -d '{"email":"lonny-4ever@hotmail.it","type":"confirmation"}'
