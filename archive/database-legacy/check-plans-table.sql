-- Script per verificare la struttura della tabella plans
-- Controlla se la colonna updated_at esiste
-- Usato per: Debug problema aggiornamento piani

-- 1. Verifica la struttura della tabella plans
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'plans' 
ORDER BY ordinal_position;

-- 2. Verifica se esistono i trigger
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table = 'plans';

-- 3. Se la colonna updated_at non esiste, aggiungila
ALTER TABLE plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();

-- 4. Se il trigger non esiste, crealo
CREATE OR REPLACE TRIGGER update_plans_updated_at 
  BEFORE UPDATE ON plans 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Verifica che tutto sia a posto
SELECT 
  name,
  updated_at,
  created_at
FROM plans 
LIMIT 5;
