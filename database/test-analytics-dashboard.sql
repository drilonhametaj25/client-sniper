-- Test Script per Analytics Dashboard
-- Verifica che le viste materializzate siano state create e popolate correttamente

-- 1. Verifica esistenza viste materializzate
SELECT 
  schemaname,
  matviewname,
  hasindexes,
  ispopulated
FROM pg_matviews 
WHERE schemaname = 'public' 
  AND (matviewname LIKE '%analytics%' 
    OR matviewname LIKE '%conversion%' 
    OR matviewname LIKE '%geography%' 
    OR matviewname LIKE '%roi%');

-- 2. Test query analytics_overview
SELECT 'Testing analytics_overview...' as test;
SELECT * FROM analytics_overview LIMIT 5;

-- 3. Test query lead_geography_aggregated
SELECT 'Testing lead_geography_aggregated...' as test;
SELECT * FROM lead_geography_aggregated LIMIT 5;

-- 4. Test query conversion_funnel_daily
SELECT 'Testing conversion_funnel_daily...' as test;
SELECT * FROM conversion_funnel_daily LIMIT 5;

-- 5. Test query roi_metrics_daily
SELECT 'Testing roi_metrics_daily...' as test;
SELECT * FROM roi_metrics_daily LIMIT 5;

-- 6. Test operatori array corretti
SELECT 'Testing needed_roles array operators...' as test;
SELECT 
  COUNT(*) as total_leads,
  COUNT(DISTINCT CASE WHEN needed_roles @> ARRAY['developer'] THEN id END) as developer_leads,
  COUNT(DISTINCT CASE WHEN needed_roles @> ARRAY['seo'] THEN id END) as seo_leads,
  COUNT(DISTINCT CASE WHEN needed_roles @> ARRAY['designer'] THEN id END) as designer_leads
FROM leads 
WHERE needed_roles IS NOT NULL;

-- 7. Verifica eventi analytics
SELECT 'Testing analytics_events...' as test;
SELECT event_type, COUNT(*) as count 
FROM analytics_events 
GROUP BY event_type 
ORDER BY count DESC;

SELECT 'Analytics Dashboard Test - Completato!' as status;
