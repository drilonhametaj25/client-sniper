-- ============================================================================
-- BOOTSTRAP DEL REGISTRO MIGRAZIONI (da eseguire UNA VOLTA SOLA)
-- ============================================================================
-- Crea public.schema_migrations e ci registra le migrazioni GIA' applicate,
-- cosi' il workflow .github/workflows/migrate.yml applichera' d'ora in poi solo
-- i file nuovi, esattamente una volta ciascuno.
--
-- Le migrazioni vecchie vengono marcate SOLO SE gli oggetti che creano esistono
-- davvero nel database: se una non fosse mai stata applicata, resta fuori dal
-- registro e sara' il workflow ad applicarla al primo giro.
--
-- Rieseguibile senza danni (ON CONFLICT DO NOTHING).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version     TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.schema_migrations IS
  'Registro delle migrazioni SQL applicate. Gestito da .github/workflows/migrate.yml. Non modificare a mano.';

-- Migrazioni storiche: marcate come applicate solo se i loro oggetti esistono
INSERT INTO public.schema_migrations (version)
SELECT v FROM (VALUES
  ('20260107_new_features',        'saved_searches'),
  ('20260123_outreach_emails',     'outreach_emails'),
  ('20260124_credit_packs',        'credit_packs'),
  ('20260124_team_management',     'teams'),
  ('20260125_in_app_notifications','in_app_notifications'),
  ('20260125_onboarding_matching', 'user_profiles')
) AS m(v, tabella)
WHERE to_regclass('public.' || m.tabella) IS NOT NULL
ON CONFLICT (version) DO NOTHING;

-- Migrazioni di settembre 2026: marcate come applicate solo se il loro effetto
-- e' verificabile nello schema (cioe' se il blocco corrispondente e' andato a
-- buon fine poco sopra, quando questo file viene eseguito in coda a quelli).
INSERT INTO public.schema_migrations (version)
SELECT v FROM (VALUES
  ('20260906090000_phase1_paywall'),
  ('20260906090100_phase1_credits'),
  ('20260906090200_phase4_engine_quality'),
  ('20260907090000_phase6_value_signals'),
  ('20260907090100_phase5_park_pro'),
  ('20260907090200_phase7_indexes')
) AS m(v)
WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'consume_credit')
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'score_version'
  )
ON CONFLICT (version) DO NOTHING;

-- Esito
SELECT version, applied_at
FROM public.schema_migrations
ORDER BY version;
