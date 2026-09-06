-- =====================================================
-- FASE 1 (paywall): i contatti dei lead non sono più leggibili dal client
-- =====================================================
-- Problema risolto: la policy RLS su leads permetteva a qualsiasi utente
-- autenticato di leggere TUTTE le colonne (phone, email inclusi) con la
-- anon key dal browser → l'intero inventario era esfiltrabile gratis.
--
-- Design: privilegi a livello di COLONNA (Postgres) + vista dedicata.
-- - authenticated: può leggere leads TRANNE phone/email (il resto della UI
--   continua a funzionare: dettaglio lead, admin dashboard, analytics)
-- - anon: nessun accesso
-- - i contatti sbloccati si leggono SOLO dalla vista my_unlocked_contacts
--   (join con user_unlocked_leads filtrato su auth.uid())
-- - il service role (API server) bypassa tutto come sempre
--
-- ⚠️ Le query client con select('*') su leads smettono di funzionare
-- (SELECT * richiede il privilegio su TUTTE le colonne): il frontend è
-- stato aggiornato a select espliciti nello stesso deploy.
-- Nota: le colonne AGGIUNTE in futuro a leads saranno invisibili al client
-- finché non vengono grantate esplicitamente (fail-closed, voluto).

BEGIN;

-- 1) Azzera i grant esistenti sul client
REVOKE SELECT ON public.leads FROM anon;
REVOKE SELECT ON public.leads FROM authenticated;

-- 2) Ri-granta ad authenticated tutte le colonne TRANNE phone/email.
-- Enumerazione dinamica: robusta rispetto al drift di schema tra ambienti.
DO $$
DECLARE
  col RECORD;
BEGIN
  FOR col IN
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name NOT IN ('phone', 'email')
  LOOP
    EXECUTE format('GRANT SELECT (%I) ON public.leads TO authenticated', col.column_name);
  END LOOP;
END $$;

-- 3) Vista per i contatti sbloccati dell'utente corrente.
-- La vista gira con i privilegi del proprietario (postgres) → può leggere
-- phone/email; il WHERE su auth.uid() garantisce che ognuno veda solo i suoi.
CREATE OR REPLACE VIEW public.my_unlocked_contacts AS
  SELECT
    l.id AS lead_id,
    l.phone,
    l.email,
    uul.unlocked_at
  FROM public.leads l
  JOIN public.user_unlocked_leads uul ON uul.lead_id = l.id
  WHERE uul.user_id = auth.uid();

GRANT SELECT ON public.my_unlocked_contacts TO authenticated;

COMMENT ON VIEW public.my_unlocked_contacts IS
  'Contatti (phone/email) dei soli lead sbloccati dall''utente corrente. Unico canale client-side per leggere i contatti.';

COMMIT;
