-- Script per correggere i crediti dei piani annuali TrovaMi.pro
-- I piani annuali danno TUTTI i crediti subito invece che mensilmente
-- Usato per: Aggiornamento configurazione piani annuali
-- Chiamato da: Fix post-migration

-- 1. Aggiorna i piani annuali per dare tutti i crediti subito
UPDATE plans SET 
  max_credits = 300,  -- 25 * 12 mesi = 300 crediti totali
  description = 'Perfetto per freelance: 300 lead per tutto l''anno + sostituzione garantita. Risparmi 2 mesi!'
WHERE name = 'starter_annual';

UPDATE plans SET 
  max_credits = 1200, -- 100 * 12 mesi = 1200 crediti totali
  description = 'Per chi vuole un flusso costante di clienti con funzioni avanzate. 1200 lead per tutto l''anno. Risparmi 2 mesi!'
WHERE name = 'pro_annual';

UPDATE plans SET 
  max_credits = 3600, -- 300 * 12 mesi = 3600 crediti totali
  description = 'Per chi scala forte: 3600 lead per tutto l''anno + sostituzioni garantite. Risparmi 2 mesi!'
WHERE name = 'agency_annual';

-- 2. Aggiorna le features per riflettere i crediti annuali
UPDATE plans SET 
  features = '["300 lead per tutto l''anno", "1 sostituzione gratuita al mese", "Alert giornalieri nella nicchia", "Storico lead consultabile", "Analisi tecnica completa", "Risparmi 2 mesi"]'
WHERE name = 'starter_annual';

UPDATE plans SET 
  features = '["1200 lead per tutto l''anno", "3 sostituzioni gratuite al mese", "Esportazione CSV/Excel", "Accesso a 3 nicchie diverse", "Cruscotto con statistiche base", "CRM integrato", "Supporto prioritario", "Risparmi 2 mesi"]'
WHERE name = 'pro_annual';

UPDATE plans SET 
  features = '["3600 lead per tutto l''anno", "10 sostituzioni gratuite al mese", "Accesso a tutte le nicchie", "Esportazione CSV/Excel", "Cruscotto avanzato", "Supporto dedicato", "Onboarding personalizzato", "Risparmi 2 mesi"]'
WHERE name = 'agency_annual';

-- 3. Corregge il campo is_annual mancante nel piano Pro Annual
UPDATE plans SET 
  is_annual = TRUE
WHERE name = 'pro_annual';

-- 4. Verifica risultati
SELECT 
  name,
  max_credits,
  is_annual,
  description,
  features
FROM plans 
WHERE name LIKE '%_annual'
ORDER BY sort_order;
