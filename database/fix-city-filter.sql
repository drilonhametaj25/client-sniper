-- SISTEMA DEFINITIVO per il filtro città nel dashboard
-- Questo script crea una funzione RPC che bypassa la RLS policy
-- per mostrare TUTTE le città disponibili nel filtro dropdown

-- Funzione per ottenere tutte le città disponibili (bypassa RLS)
CREATE OR REPLACE FUNCTION get_all_available_cities()
RETURNS TABLE(city TEXT)
LANGUAGE SQL
SECURITY DEFINER -- Importante: esegue con permessi del proprietario della funzione
SET search_path = public
AS $$
  SELECT DISTINCT l.city
  FROM public.leads l
  WHERE l.city IS NOT NULL 
    AND l.city != ''
  ORDER BY l.city;
$$;

-- Commento per documentare la funzione
COMMENT ON FUNCTION get_all_available_cities() IS 'Restituisce tutte le città disponibili nel database per il filtro dashboard, bypassando le RLS policies';

-- Test della funzione (decommentare per testare)
-- SELECT * FROM get_all_available_cities() LIMIT 10;
