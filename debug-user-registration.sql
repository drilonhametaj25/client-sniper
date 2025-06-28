-- Verifica registrazione utente lonny-4ever@hotmail.it
-- Esegui nel SQL Editor di Supabase

-- 1. Controlla tabella auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmation_sent_at,
  created_at,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'lonny-4ever@hotmail.it';

-- 2. Controlla tabella custom users
SELECT 
  id,
  email,
  plan,
  credits_remaining,
  created_at
FROM users 
WHERE email = 'lonny-4ever@hotmail.it';

-- 3. Verifica webhook logs (se esistono)
SELECT 
  created_at,
  level,
  msg,
  metadata
FROM edge_logs 
WHERE msg ILIKE '%webhook%'
  OR msg ILIKE '%lonny-4ever%'
ORDER BY created_at DESC
LIMIT 10;
