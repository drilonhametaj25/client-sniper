-- =====================================================================
-- Migration: Sistema di Confidenza dei Lead (Fase 0)
-- =====================================================================
-- Obiettivo: introdurre il concetto di "confidenza" sui lead per ridurre
-- i falsi positivi. I lead con bassa confidenza vengono messi in QUARANTENA
-- e NON mostrati agli utenti, finché non vengono ri-verificati.
--
-- Sicurezza: migration puramente ADDITIVA. Tutte le colonne hanno un default
-- che preserva il comportamento attuale (i lead esistenti restano 'published').
-- Eseguire nella dashboard di Supabase (SQL Editor).
-- =====================================================================

-- 1) Nuove colonne sulla tabella leads -------------------------------------

-- Confidenza complessiva sui dati del lead (0-100). Default 100 = comportamento attuale.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS confidence_score INT NOT NULL DEFAULT 100;

-- Stato di pubblicazione: 'published' (visibile) | 'quarantine' (nascosto, da verificare).
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';

-- Motivi della quarantena / incertezze rilevate (array leggibile per audit e UI admin).
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS quarantine_reasons JSONB DEFAULT '[]';

-- True se il lead va ri-analizzato dal nuovo motore (es. raggiungibilità incerta).
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS needs_recheck BOOLEAN NOT NULL DEFAULT false;

-- Verdetto di raggiungibilità del sito al momento dell'ultima analisi.
-- Valori: 'online' | 'offline_confirmed' | 'offline_suspected' | 'uncertain' | NULL (nessun sito).
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS reachability_verdict TEXT;

-- Quando il lead è stato verificato l'ultima volta dal motore di analisi.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;

-- Vincolo di dominio sui valori di status (idempotente).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_status_check'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_status_check
      CHECK (status IN ('published', 'quarantine'));
  END IF;
END $$;

-- 2) Indici per le query di lista (gli utenti vedono solo 'published') -------

-- Indice composito: filtriamo per status e ordiniamo per score.
CREATE INDEX IF NOT EXISTS idx_leads_status_score
  ON public.leads(status, score DESC);

-- Indice per il job di ri-analisi che pesca i lead da ricontrollare.
CREATE INDEX IF NOT EXISTS idx_leads_needs_recheck
  ON public.leads(needs_recheck)
  WHERE needs_recheck = true;

-- 3) Aggiorna la RPC dei lead disponibili per mostrare solo i pubblicati -----
--    (retrocompatibile: stessa firma, aggiunge solo il filtro status)
CREATE OR REPLACE FUNCTION get_available_leads_for_user(
  user_uuid UUID,
  page_limit INT DEFAULT 20,
  page_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  business_name TEXT,
  website_url TEXT,
  city TEXT,
  category TEXT,
  score INT,
  created_at TIMESTAMP WITH TIME ZONE,
  is_unlocked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.business_name,
    l.website_url,
    l.city,
    l.category,
    l.score,
    l.created_at,
    (ul.id IS NOT NULL) as is_unlocked
  FROM public.leads l
  LEFT JOIN public.user_unlocked_leads ul ON l.id = ul.lead_id AND ul.user_id = user_uuid
  WHERE l.status = 'published'
  ORDER BY l.score DESC, l.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;

-- =====================================================================
-- NOTA: la pulizia/ri-analisi di massa dei lead esistenti (Fase 4) viene
-- gestita da un job dedicato nello scraping-engine, non da questa migration,
-- così la migration resta non distruttiva e ripetibile.
-- =====================================================================
