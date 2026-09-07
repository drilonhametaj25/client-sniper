-- Script per aggiornare i Price ID Stripe nei piani TrovaMi.pro
-- Inserisci i Price ID recuperati dalla dashboard Stripe
-- Usato per: Configurazione pagamenti Stripe
-- Chiamato da: Setup pagamenti post-migration

-- SOSTITUISCI I VALORI SOTTO CON I TUOI PRICE ID REALI DA STRIPE

-- Starter Monthly
UPDATE plans SET 
  stripe_price_id_monthly = 'price_XXXXXXXXXXXXXXXX' -- Sostituisci con il tuo Price ID
WHERE name = 'starter_monthly';

-- Starter Annual  
UPDATE plans SET 
  stripe_price_id_annual = 'price_XXXXXXXXXXXXXXXX' -- Sostituisci con il tuo Price ID
WHERE name = 'starter_annual';

-- Pro Monthly
UPDATE plans SET 
  stripe_price_id_monthly = 'price_XXXXXXXXXXXXXXXX' -- Sostituisci con il tuo Price ID
WHERE name = 'pro_monthly';

-- Pro Annual
UPDATE plans SET 
  stripe_price_id_annual = 'price_XXXXXXXXXXXXXXXX' -- Sostituisci con il tuo Price ID
WHERE name = 'pro_annual';

-- Agency Monthly
UPDATE plans SET 
  stripe_price_id_monthly = 'price_XXXXXXXXXXXXXXXX' -- Sostituisci con il tuo Price ID
WHERE name = 'agency_monthly';

-- Agency Annual
UPDATE plans SET 
  stripe_price_id_annual = 'price_XXXXXXXXXXXXXXXX' -- Sostituisci con il tuo Price ID
WHERE name = 'agency_annual';

-- Verifica che tutti i Price ID siano stati inseriti
SELECT 
  name,
  price_monthly/100 as euro_monthly,
  stripe_price_id_monthly,
  stripe_price_id_annual,
  is_annual
FROM plans 
WHERE name != 'free'
ORDER BY sort_order;
