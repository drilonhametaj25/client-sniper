-- Migrazione per aggiungere campi profilo aziendale alla tabella users
-- Questi campi vengono usati per il branding dei PDF preventivi (private label)

-- Aggiungi campi profilo aziendale
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS company_phone TEXT,
ADD COLUMN IF NOT EXISTS company_website TEXT,
ADD COLUMN IF NOT EXISTS company_email TEXT,
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Commenti per documentazione
COMMENT ON COLUMN public.users.company_name IS 'Nome azienda/freelancer per branding PDF';
COMMENT ON COLUMN public.users.company_phone IS 'Telefono aziendale per contatti nei PDF';
COMMENT ON COLUMN public.users.company_website IS 'Sito web aziendale per branding PDF';
COMMENT ON COLUMN public.users.company_email IS 'Email di contatto aziendale (diversa dalla email di login)';
COMMENT ON COLUMN public.users.company_logo_url IS 'URL del logo aziendale per PDF';

-- Verifica aggiunta colonne
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name LIKE 'company_%';
