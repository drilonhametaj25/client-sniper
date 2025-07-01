-- SCRIPT DEFINITIVO: Aggiungi colonna assigned_to senza rischi
-- Eseguire SOLO questo script nel database FRONTEND (non scraping engine)
-- SICURO: Non cancella nulla, aggiunge solo se non esiste

-- 1. Aggiungi la colonna assigned_to se non esiste (SICURO)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL;
    CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
  END IF;
END $$;

-- 2. Se la tabella è vuota, aggiungi alcuni lead di esempio
INSERT INTO public.leads (business_name, website_url, city, category, score, assigned_to) 
SELECT 
  'Esempio Azienda ' || generate_series,
  'https://www.esempio' || generate_series || '.it',
  CASE (generate_series % 5)
    WHEN 0 THEN 'Milano'
    WHEN 1 THEN 'Roma' 
    WHEN 2 THEN 'Napoli'
    WHEN 3 THEN 'Torino'
    ELSE 'Firenze'
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN 'Ristorante'
    WHEN 1 THEN 'Negozio'
    ELSE 'Servizi'
  END,
  50 + (generate_series % 50),
  NULL -- Non assegnato inizialmente
FROM generate_series(1, 50)
WHERE NOT EXISTS (SELECT 1 FROM public.leads LIMIT 1);

-- 3. Assegna 10 lead casuali a ogni utente esistente (SICURO)
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM public.users LOOP
    UPDATE public.leads 
    SET assigned_to = user_record.id 
    WHERE assigned_to IS NULL 
    AND id IN (
      SELECT id FROM public.leads 
      WHERE assigned_to IS NULL 
      ORDER BY RANDOM() 
      LIMIT 10
    );
  END LOOP;
END $$;
