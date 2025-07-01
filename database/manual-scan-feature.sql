-- Aggiunta del campo 'origin' per distinguere i lead da scraping automatico vs inserimento manuale
-- Eseguire in Supabase SQL Editor

-- 1. Aggiungi la colonna origin alla tabella leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'scraping' CHECK (origin IN ('scraping', 'manual'));

-- 2. Aggiorna leads esistenti per avere origin='scraping'
UPDATE public.leads 
SET origin = 'scraping' 
WHERE origin IS NULL;

-- 3. Aggiungi commento per documentazione
COMMENT ON COLUMN public.leads.origin IS 'Origine del lead: scraping automatico o inserimento manuale';

-- 4. Crea indice per performance su ricerche filtrate per origin
CREATE INDEX IF NOT EXISTS idx_leads_origin ON public.leads(origin);

-- 5. Aggiorna il sistema di crediti per includere manual_scan
-- (la tabella credit_usage_log esiste già, solo aggiungiamo il nuovo tipo di azione)
COMMENT ON COLUMN credit_usage_log.action IS 'Tipo di azione: lead_unlock, site_visit, manual_scan, monthly_recharge, plan_upgrade, etc.';
