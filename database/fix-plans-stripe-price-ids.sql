-- =====================================================================
-- Fix dati: Stripe Price IDs dei piani (erano tutti NULL)
-- =====================================================================
-- Bug rilevato in test: le colonne stripe_price_id_monthly / _annual erano NULL
-- per tutti i piani → il checkout falliva con "Piano non configurato".
-- Valori presi dai prodotti Stripe configurati. Eseguire nel SQL Editor di Supabase
-- (o già applicato via API durante il test).
-- =====================================================================

UPDATE public.plans SET
  stripe_price_id_monthly = 'price_1RfyceHUVDr3z6E6kfwrWBKJ',  -- TrovaMi Starter €19/mese
  stripe_price_id_annual  = 'price_1Ry99tHUVDr3z6E6fkesTL4B'   -- TrovaMi A-Starter €190/anno
WHERE name IN ('starter_monthly', 'starter_annual');

UPDATE public.plans SET
  stripe_price_id_monthly = 'price_1RfycqHUVDr3z6E6zeRaxbQJ',  -- TrovaMi PRO €49/mese
  stripe_price_id_annual  = 'price_1Ry99MHUVDr3z6E66e3OesOO'   -- TrovaMi A-Pro €490/anno
WHERE name IN ('pro_monthly', 'pro_annual');

UPDATE public.plans SET
  stripe_price_id_monthly = 'price_1Ry96dHUVDr3z6E6oBEuStXt',  -- TrovaMi Agency €99/mese
  stripe_price_id_annual  = 'price_1Ry98gHUVDr3z6E6bP2U9Tep'   -- TrovaMi A-Agency €990/anno
WHERE name IN ('agency_monthly', 'agency_annual');

-- Verifica:
-- SELECT name, stripe_price_id_monthly, stripe_price_id_annual FROM public.plans ORDER BY sort_order;
