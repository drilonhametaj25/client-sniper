-- Debug query per verificare registrazioni
-- Esegui queste query nel SQL Editor di Supabase per vedere cosa sta succedendo

-- 1. Controlla se ci sono utenti registrati oggi
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users 
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;

-- 2. Controlla tabella custom users
SELECT 
  id,
  email,
  plan,
  credits_remaining,
  created_at
FROM users 
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;

-- 3. Verifica configurazione auth (solo per admin)
SELECT 
  name,
  value
FROM auth.config 
WHERE name IN ('SITE_URL', 'REDIRECT_URLS');

-- 4. Controlla log errori recenti (se disponibili)
SELECT 
  created_at,
  level,
  msg,
  metadata
FROM logs 
WHERE created_at > NOW() - INTERVAL '1 hour'
AND level = 'error'
ORDER BY created_at DESC
LIMIT 10;
