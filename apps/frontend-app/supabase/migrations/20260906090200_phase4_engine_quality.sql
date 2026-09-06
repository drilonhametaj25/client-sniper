-- =====================================================
-- FASE 4 (qualità motore): score v2, verifica email, pulizia split-brain
-- =====================================================
-- 1. score_version: distingue i lead con il vecchio "health score" (v1,
--    alto = sito sano) da quelli con il nuovo "opportunity score" (v2,
--    alto = migliore opportunità). Il frontend usa un helper unico
--    (lib/utils/opportunity.ts) che normalizza entrambe le versioni.
-- 2. email_confidence: tier di verifica dell'email del lead
--    ('verified' | 'probable' | 'unverified').
-- 3. DROP di get_available_leads_for_user: zero chiamanti nel codice e
--    ordinava score DESC mentre l'API ordina ASC (split-brain).

BEGIN;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS score_version INT NOT NULL DEFAULT 1;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS email_confidence TEXT
  CHECK (email_confidence IS NULL OR email_confidence IN ('verified', 'probable', 'unverified'));

COMMENT ON COLUMN public.leads.score_version IS
  'v1 = health score legacy (alto=sito sano); v2 = opportunity score (alto=migliore opportunità)';

CREATE INDEX IF NOT EXISTS idx_leads_score_version ON public.leads(score_version);

-- Funzione morta con ordinamento invertito rispetto all'API (mai chiamata dal codice)
DROP FUNCTION IF EXISTS public.get_available_leads_for_user(UUID, INT, INT);
DROP FUNCTION IF EXISTS public.get_available_leads_for_user(UUID);

-- Grant della nuova colonna al client (il paywall a colonne è fail-closed
-- per le colonne aggiunte dopo la migrazione phase1_paywall)
GRANT SELECT (score_version) ON public.leads TO authenticated;

COMMIT;
