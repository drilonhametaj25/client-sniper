-- =====================================================
-- MIGRATION: Newsletter System per TrovaMi
-- Aggiunge campi per gestione newsletter e unsubscribe
-- =====================================================

-- 1. Aggiungi campi newsletter alla tabella users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS newsletter_subscribed BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS unsubscribe_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS newsletter_last_sent_at TIMESTAMPTZ;

-- 2. Crea indici per query efficienti
CREATE INDEX IF NOT EXISTS idx_users_newsletter_subscribed ON public.users(newsletter_subscribed);
CREATE INDEX IF NOT EXISTS idx_users_unsubscribe_token ON public.users(unsubscribe_token);

-- 3. Imposta tutti gli utenti esistenti come iscritti alla newsletter
-- con un token univoco per unsubscribe
UPDATE public.users
SET newsletter_subscribed = TRUE,
    unsubscribe_token = gen_random_uuid()
WHERE newsletter_subscribed IS NULL
   OR unsubscribe_token IS NULL;

-- 4. Commenti per documentazione
COMMENT ON COLUMN public.users.newsletter_subscribed IS 'Se l utente vuole ricevere la newsletter settimanale';
COMMENT ON COLUMN public.users.unsubscribe_token IS 'Token sicuro per link di disiscrizione';
COMMENT ON COLUMN public.users.newsletter_last_sent_at IS 'Ultima volta che la newsletter è stata inviata';

-- 5. Verifica che notification_logs supporti i nuovi tipi
-- I tipi newsletter_nuovi, newsletter_dormienti, newsletter_attivi
-- saranno usati nel campo notification_type (già TEXT)
