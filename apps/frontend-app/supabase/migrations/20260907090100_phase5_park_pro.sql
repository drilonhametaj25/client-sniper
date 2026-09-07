-- =====================================================
-- FASE 5 (pricing): parcheggia il tier Pro
-- =====================================================
-- Decisione di prodotto: 3 piani vendibili (Free / Starter / Agency).
-- Il tier Pro resta definito nella tabella (i vecchi abbonati continuano a
-- funzionare, trattati come >= Starter dai gate) ma NON è più acquistabile:
-- tutte le superfici di pricing leggono is_visible.
-- NB: la vecchia proposals-system-migration.sql avrebbe dovuto farlo ma non
-- risulta mai applicata in produzione (pro_monthly/pro_annual sono ancora
-- is_visible = true).

BEGIN;

UPDATE public.plans
SET is_visible = FALSE
WHERE name LIKE 'pro%';

COMMIT;
