-- Fix per Analytics Dashboard - Correzione operatori array
-- Script per correggere gli operatori SQL per needed_roles (TEXT[] invece di JSONB)

-- Rimuovi le viste materializzate esistenti se presenti
DROP MATERIALIZED VIEW IF EXISTS analytics_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS conversion_by_role CASCADE;
DROP MATERIALIZED VIEW IF EXISTS analytics_overview CASCADE;
DROP MATERIALIZED VIEW IF EXISTS lead_geography_aggregated CASCADE;
DROP MATERIALIZED VIEW IF EXISTS conversion_funnel_daily CASCADE;
DROP MATERIALIZED VIEW IF EXISTS roi_metrics_daily CASCADE;

-- Rimuovi trigger esistenti
DROP TRIGGER IF EXISTS refresh_analytics_on_lead_change ON leads;
DROP TRIGGER IF EXISTS refresh_analytics_on_conversion_change ON lead_conversions;
DROP TRIGGER IF EXISTS refresh_analytics_on_event_change ON analytics_events;

-- Rimuovi funzione esistente
DROP FUNCTION IF EXISTS trigger_refresh_analytics();

-- Ricrea tutto dal file principale
\i analytics-dashboard.sql

-- Popola le viste materializzate iniziali
REFRESH MATERIALIZED VIEW analytics_summary;
REFRESH MATERIALIZED VIEW conversion_by_role;
REFRESH MATERIALIZED VIEW analytics_overview;
REFRESH MATERIALIZED VIEW lead_geography_aggregated;
REFRESH MATERIALIZED VIEW conversion_funnel_daily;
REFRESH MATERIALIZED VIEW roi_metrics_daily;

-- Verifica che tutto sia stato creato correttamente
SELECT 
  schemaname,
  matviewname,
  hasindexes,
  ispopulated
FROM pg_matviews 
WHERE schemaname = 'public' 
  AND matviewname LIKE '%analytics%' 
  OR matviewname LIKE '%conversion%' 
  OR matviewname LIKE '%geography%' 
  OR matviewname LIKE '%roi%';

-- Messaggio di successo
SELECT 'Analytics Dashboard - Fix completato!' as status;
