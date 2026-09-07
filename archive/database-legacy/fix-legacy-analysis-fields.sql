-- Aggiornamento analisi legacy per lead esistenti
-- Aggiunge i campi legacy has_website e mobile_friendly all'analisi JSON

UPDATE leads 
SET analysis = analysis || jsonb_build_object(
  'has_website', 
  CASE 
    WHEN (analysis->>'isAccessible')::boolean = true 
      AND (analysis->>'httpStatus')::int >= 200 
      AND (analysis->>'httpStatus')::int < 400 
    THEN true 
    ELSE false 
  END,
  'mobile_friendly',
  CASE 
    WHEN (analysis->'performance'->>'isResponsive')::boolean = true 
    THEN true 
    ELSE false 
  END,
  'website_load_time',
  COALESCE((analysis->'performance'->>'loadTime')::float, 0),
  'has_tracking_pixel',
  CASE 
    WHEN (analysis->'tracking'->>'hasFacebookPixel')::boolean = true 
      OR (analysis->'tracking'->>'hasGoogleAnalytics')::boolean = true 
    THEN true 
    ELSE false 
  END,
  'gtm_installed',
  CASE 
    WHEN (analysis->'tracking'->>'hasGoogleTagManager')::boolean = true 
    THEN true 
    ELSE false 
  END,
  'has_ssl',
  CASE 
    WHEN analysis->>'finalUrl' LIKE 'https://%' 
      AND NOT (analysis->'issues'->>'httpsIssues')::boolean = true
    THEN true 
    ELSE false 
  END,
  'broken_images',
  CASE 
    WHEN (analysis->'performance'->>'brokenImages')::int > 0 
    THEN true 
    ELSE false 
  END,
  'missing_meta_tags',
  (
    SELECT jsonb_agg(tag) 
    FROM (
      SELECT 'title' as tag WHERE NOT (analysis->'seo'->>'hasTitle')::boolean
      UNION ALL
      SELECT 'description' as tag WHERE NOT (analysis->'seo'->>'hasMetaDescription')::boolean  
      UNION ALL
      SELECT 'h1' as tag WHERE NOT (analysis->'seo'->>'hasH1')::boolean
    ) tags
  )
)
WHERE analysis IS NOT NULL 
  AND origin = 'manual'
  AND (analysis->>'has_website') IS NULL;

-- Verifica risultati
SELECT 
  id,
  business_name,
  analysis->>'has_website' as has_website,
  analysis->>'mobile_friendly' as mobile_friendly,
  analysis->>'isAccessible' as is_accessible,
  analysis->'performance'->>'isResponsive' as is_responsive
FROM leads 
WHERE origin = 'manual' 
  AND analysis IS NOT NULL
LIMIT 10;
