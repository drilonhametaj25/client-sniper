-- Ottimizzazione Performance Database Supabase
-- Questo file crea indici per migliorare le performance delle query più frequenti
-- Posizionato nella root del progetto per facilità di manutenzione

-- ⚡ INDICI PER TABELLA LEADS (query più frequenti)

-- Indice composto per filtraggio comune: categoria + score + città
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_category_score_city 
ON public.leads (category, score, city);

-- Indice per ricerca testuale su business_name (più veloce di ILIKE)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_business_name_gin 
ON public.leads USING gin (business_name gin_trgm_ops);

-- Indice per ricerca su città
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_city_gin 
ON public.leads USING gin (city gin_trgm_ops);

-- Indice per needed_roles (array overlap)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_needed_roles_gin 
ON public.leads USING gin (needed_roles);

-- Indice per ordinamento efficiente (score + created_at)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_score_created_at 
ON public.leads (score ASC, created_at DESC);

-- Indice per filtraggio assigned_to (importante per security)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_assigned_to 
ON public.leads (assigned_to);

-- Indice composto per paginazione ottimale
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_pagination 
ON public.leads (assigned_to, category, score ASC, created_at DESC);

-- ⚡ INDICI PER TABELLA USERS (lookup frequenti)

-- Indice per lookup user rapido (già esiste di default, ma verifichiamo)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_id 
ON public.users (id);

-- Indice per email lookup (login)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
ON public.users (email);

-- ⚡ ESTENSIONI POSTGRESQL NECESSARIE

-- Abilita estensione per ricerca full-text trigram (per ILIKE veloce)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Abilita estensione per UUID (se non già presente)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ⚡ STATISTICHE E ANALISI

-- Forza PostgreSQL a raccogliere statistiche aggiornate
ANALYZE public.leads;
ANALYZE public.users;

-- Commenti per documentazione
COMMENT ON INDEX idx_leads_category_score_city IS 'Indice composto per filtri comuni: categoria, score, città';
COMMENT ON INDEX idx_leads_business_name_gin IS 'Indice GIN per ricerca veloce su nome business (trigram)';
COMMENT ON INDEX idx_leads_city_gin IS 'Indice GIN per ricerca veloce su città (trigram)';
COMMENT ON INDEX idx_leads_needed_roles_gin IS 'Indice GIN per array overlap su needed_roles';
COMMENT ON INDEX idx_leads_score_created_at IS 'Indice per ordinamento efficiente per score e data';
COMMENT ON INDEX idx_leads_assigned_to IS 'Indice per filtri di sicurezza assigned_to';
COMMENT ON INDEX idx_leads_pagination IS 'Indice ottimale per paginazione con filtri';

-- ⚡ QUERY DI VERIFICA PERFORMANCE

-- Verifica che gli indici siano stati creati
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('leads', 'users')
ORDER BY tablename, indexname;

-- Mostra statistiche tabelle
SELECT 
    schemaname,
    tablename,
    n_tup_ins as "Inserimenti",
    n_tup_upd as "Aggiornamenti", 
    n_tup_del as "Eliminazioni",
    n_live_tup as "Righe Vive",
    n_dead_tup as "Righe Morte",
    last_analyze as "Ultima Analisi"
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
AND tablename IN ('leads', 'users');
