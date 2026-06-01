-- =====================================================================
-- Fix dati: max_proposals dei piani (era 0 per tutti)
-- =====================================================================
-- Bug rilevato in test: la colonna `max_proposals` (usata dal sistema crediti
-- attuale) era 0 per TUTTI i piani, mentre `max_credits` conteneva i valori
-- corretti. Risultato: dopo un upgrade l'utente avrebbe 0 crediti.
--
-- Fix: allineiamo max_proposals a max_credits per i piani a pagamento.
-- Il piano FREE resta a 0 (il singolo credito di prova è concesso alla
-- registrazione e non si rinnova).
-- Sicuro e idempotente. Eseguire nel SQL Editor di Supabase (o già applicato via API).
-- =====================================================================

UPDATE public.plans SET max_proposals = 25  WHERE name IN ('starter_monthly', 'starter_annual');
UPDATE public.plans SET max_proposals = 100 WHERE name IN ('pro_monthly', 'pro_annual');
UPDATE public.plans SET max_proposals = 300 WHERE name IN ('agency_monthly', 'agency_annual');

-- Verifica:
-- SELECT name, max_credits, max_proposals FROM public.plans ORDER BY sort_order;
