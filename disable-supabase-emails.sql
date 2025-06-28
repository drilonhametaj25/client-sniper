-- Configurazione Supabase per disabilitare email automatiche
-- ESEGUI NEL SQL EDITOR DI SUPABASE (come admin)

-- 1. Verifica configurazione attuale
SELECT * FROM auth.config WHERE name LIKE '%email%' OR name LIKE '%confirm%';

-- 2. Disabilita email automatiche di conferma
UPDATE auth.config 
SET value = 'false' 
WHERE name = 'ENABLE_EMAIL_CONFIRMATIONS';

-- 3. Verifica che sia stato applicato
SELECT name, value FROM auth.config 
WHERE name = 'ENABLE_EMAIL_CONFIRMATIONS';

-- NOTA: Se la query non funziona, significa che devi configurare
-- nel dashboard Authentication → Email Templates
