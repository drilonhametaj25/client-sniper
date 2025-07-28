-- Script per correggere le date di reset e testare il sistema
-- Imposta una data di reset passata per testare la funzionalità

-- 1. Mostra lo stato attuale degli utenti
SELECT 
  id, 
  email, 
  plan, 
  credits_remaining, 
  credits_reset_date, 
  stripe_subscription_id,
  created_at
FROM users 
WHERE email IN ('drilonhametaj25@gmail.com', 'drilonhametaj@outlook.it')
ORDER BY email;

-- 2. Imposta una data di reset nel passato per testare il sistema
-- Questo farà sì che i tuoi account appaiano come "scaduti" per il test
UPDATE users 
SET credits_reset_date = '2025-07-25 00:00:00+00'
WHERE email = 'drilonhametaj@outlook.it' AND plan = 'pro';

UPDATE users 
SET credits_reset_date = '2025-07-26 00:00:00+00'
WHERE email = 'drilonhametaj25@gmail.com' AND plan = 'free';

-- 3. Verifica le modifiche
SELECT 
  id, 
  email, 
  plan, 
  credits_remaining, 
  credits_reset_date,
  CASE 
    WHEN credits_reset_date <= NOW() THEN 'NEEDS_RESET'
    ELSE 'OK'
  END as reset_status
FROM users 
WHERE email IN ('drilonhametaj25@gmail.com', 'drilonhametaj@outlook.it')
ORDER BY email;
