-- Migration: Add services_offered to users table
-- Permette agli utenti di specificare quali servizi offrono per il match calculation

-- Aggiungi colonna services_offered (array di text)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS services_offered TEXT[] DEFAULT '{}';

-- Commento per documentazione
COMMENT ON COLUMN public.users.services_offered IS
'Array di servizi offerti dall''utente. Valori possibili: seo, gdpr, analytics, mobile, performance, development, design, social. Usato per calcolare il match % con i lead.';

-- Indice per query su servizi (GIN per array)
CREATE INDEX IF NOT EXISTS idx_users_services_offered
ON public.users USING GIN (services_offered);

-- Aggiungi anche campi opzionali per preferenze budget
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS preferred_min_budget INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS preferred_max_budget INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.users.preferred_min_budget IS
'Budget minimo preferito per progetti (in EUR)';

COMMENT ON COLUMN public.users.preferred_max_budget IS
'Budget massimo preferito per progetti (in EUR)';

-- RLS Policy: gli utenti possono vedere e modificare solo i propri services_offered
-- (La policy esistente su users dovrebbe già coprire questo, ma aggiungiamo per sicurezza)

-- Nota: Per applicare questa migration, eseguire in Supabase SQL Editor
-- o tramite migration tool
