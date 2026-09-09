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


-- NB: nessun BEGIN;/COMMIT; esplicito in questo file. L'SQL Editor di Supabase
-- avvolge gia' lo script in una transazione propria e le transazioni annidate
-- esplicite ne rompono l'esecuzione (era la causa per cui le migrazioni
-- sembravano applicate ma non lo erano). L'atomicita' e' garantita dal
-- workflow, che invoca psql con --single-transaction.

UPDATE public.plans
SET is_visible = FALSE
WHERE name LIKE 'pro%';

