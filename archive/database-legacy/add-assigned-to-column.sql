-- Script per aggiungere la colonna assigned_to alla tabella leads
-- Eseguire questo script nella dashboard di Supabase (SQL Editor)

-- Aggiungi la colonna assigned_to se non esiste
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Indice per performance
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);

-- Commentare le righe sotto se non si vuole assegnare lead automaticamente
-- Funzione per assegnare lead casuali agli utenti quando si registrano
CREATE OR REPLACE FUNCTION assign_random_leads_to_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Assegna 20 lead casuali non ancora assegnati al nuovo utente
  UPDATE public.leads 
  SET assigned_to = NEW.id 
  WHERE assigned_to IS NULL 
  AND id IN (
    SELECT id FROM public.leads 
    WHERE assigned_to IS NULL 
    ORDER BY RANDOM() 
    LIMIT 20
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per assegnare lead automaticamente quando un utente si registra
DROP TRIGGER IF EXISTS assign_leads_on_user_creation ON public.users;
CREATE TRIGGER assign_leads_on_user_creation
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION assign_random_leads_to_user();

-- Se vuoi assegnare lead anche agli utenti esistenti che non ne hanno
DO $$
DECLARE
  user_record RECORD;
  lead_count INT;
BEGIN
  FOR user_record IN SELECT id FROM public.users LOOP
    -- Conta quanti lead ha già questo utente
    SELECT COUNT(*) INTO lead_count 
    FROM public.leads 
    WHERE assigned_to = user_record.id;
    
    -- Se ha meno di 20 lead, assegnane altri
    IF lead_count < 20 THEN
      UPDATE public.leads 
      SET assigned_to = user_record.id 
      WHERE assigned_to IS NULL 
      AND id IN (
        SELECT id FROM public.leads 
        WHERE assigned_to IS NULL 
        ORDER BY RANDOM() 
        LIMIT (20 - lead_count)
      );
    END IF;
  END LOOP;
END $$;
