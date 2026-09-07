-- Script per aggiungere la tabella user_unlocked_leads e credit_usage_logs
-- Eseguire questo script nella dashboard di Supabase (SQL Editor)

-- Tabella per tracciare i lead sbloccati dagli utenti
CREATE TABLE IF NOT EXISTS public.user_unlocked_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lead_id) -- Un utente può sbloccare un lead solo una volta
);

-- Tabella per tracciare l'uso dei crediti (audit log)
CREATE TABLE IF NOT EXISTS public.credit_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'unlock_lead', 'monthly_recharge', 'plan_upgrade', ecc.
  credits_used INT NOT NULL DEFAULT 0,
  credits_remaining INT NOT NULL DEFAULT 0,
  details JSONB DEFAULT '{}', -- Dettagli aggiuntivi (lead_id, piano precedente, ecc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_user_unlocked_leads_user_id ON public.user_unlocked_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_leads_lead_id ON public.user_unlocked_leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_leads_unlocked_at ON public.user_unlocked_leads(unlocked_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_usage_logs_user_id ON public.credit_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_logs_action ON public.credit_usage_logs(action);
CREATE INDEX IF NOT EXISTS idx_credit_usage_logs_created_at ON public.credit_usage_logs(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE public.user_unlocked_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy per user_unlocked_leads - gli utenti possono vedere solo i propri lead sbloccati
CREATE POLICY "Users can view own unlocked leads" ON public.user_unlocked_leads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can unlock leads" ON public.user_unlocked_leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy per credit_usage_logs - gli utenti possono vedere solo i propri log
CREATE POLICY "Users can view own credit usage" ON public.credit_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage credit logs" ON public.credit_usage_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Funzione per ottenere lead disponibili per un utente (esclude quelli già sbloccati)
CREATE OR REPLACE FUNCTION get_available_leads_for_user(user_uuid UUID, page_limit INT DEFAULT 20, page_offset INT DEFAULT 0)
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
  ORDER BY l.score DESC, l.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;

-- Trigger per aggiornare updated_at nelle nuove tabelle non ce n'è bisogno perché non hanno updated_at

-- Inserisci alcuni lead di esempio se la tabella è vuota
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.leads LIMIT 1) THEN
    INSERT INTO public.leads (business_name, website_url, city, category, score, unique_key, content_hash) VALUES
    ('Ristorante Da Mario', 'https://www.damario.it', 'Milano', 'Ristorante', 75, 'google_maps_damario_milano', 'hash_damario_1'),
    ('Pizzeria Bella Napoli', 'https://www.bellanapoli.com', 'Roma', 'Pizzeria', 82, 'google_maps_bellanapoli_roma', 'hash_bellanapoli_1'),
    ('Parrucchiere Style', NULL, 'Torino', 'Parrucchiere', 65, 'google_maps_style_torino', 'hash_style_1'),
    ('Bar Centrale', 'https://www.barcentrale.it', 'Firenze', 'Bar', 58, 'google_maps_centrale_firenze', 'hash_centrale_1'),
    ('Officina Rossi', NULL, 'Bologna', 'Officina', 71, 'google_maps_rossi_bologna', 'hash_rossi_1');
  END IF;
END $$;
