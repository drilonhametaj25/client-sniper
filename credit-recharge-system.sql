-- Sistema di ricarica crediti basato su ciclo Stripe
-- Aggiunge campi per gestire il ciclo di fatturazione personalizzato per ogni utente

-- Aggiungi campi per il ciclo di fatturazione alla tabella users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS billing_cycle_start DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS credits_reset_date DATE DEFAULT (CURRENT_DATE + INTERVAL '1 month');
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_credits_used_this_cycle INT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_current_period_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Funzione per calcolare la prossima data di reset basata su Stripe
CREATE OR REPLACE FUNCTION calculate_next_reset_date_stripe(stripe_period_end TIMESTAMP WITH TIME ZONE)
RETURNS DATE AS $$
BEGIN
    -- Usa la data di fine periodo di Stripe
    RETURN stripe_period_end::DATE;
END;
$$ LANGUAGE plpgsql;

-- Funzione per ricaricare i crediti di un utente (chiamata da Stripe webhook)
CREATE OR REPLACE FUNCTION recharge_user_credits_stripe(
    user_id UUID, 
    stripe_subscription_id TEXT,
    stripe_current_period_end TIMESTAMP WITH TIME ZONE
)
RETURNS VOID AS $$
DECLARE
    user_plan TEXT;
    max_credits_for_plan INT;
BEGIN
    -- Ottieni il piano dell'utente
    SELECT plan INTO user_plan FROM public.users WHERE id = user_id;
    
    -- Ottieni i crediti massimi per il piano
    SELECT max_credits INTO max_credits_for_plan FROM public.plans WHERE name = user_plan;
    
    -- Ricarica i crediti e aggiorna le date
    UPDATE public.users 
    SET 
        credits_remaining = max_credits_for_plan,
        billing_cycle_start = CURRENT_DATE,
        credits_reset_date = calculate_next_reset_date_stripe(stripe_current_period_end),
        total_credits_used_this_cycle = 0,
        stripe_subscription_id = recharge_user_credits_stripe.stripe_subscription_id,
        stripe_current_period_end = recharge_user_credits_stripe.stripe_current_period_end,
        updated_at = NOW()
    WHERE id = user_id;
    
    -- Log della ricarica
    INSERT INTO public.credit_usage_log (user_id, action, credits_consumed, credits_remaining, created_at)
    VALUES (user_id, 'stripe_recharge', -max_credits_for_plan, max_credits_for_plan, NOW());
    
    -- Invalida i lead sbloccati del ciclo precedente (opzionale - li manteniamo per ora)
    -- DELETE FROM user_unlocked_leads WHERE user_id = recharge_user_credits_stripe.user_id;
END;
$$ LANGUAGE plpgsql;

-- Funzione per ricaricare utenti scaduti (ora basata su Stripe)
CREATE OR REPLACE FUNCTION recharge_expired_users_stripe()
RETURNS INT AS $$
DECLARE
    users_recharged INT := 0;
    user_record RECORD;
BEGIN
    -- Trova tutti gli utenti che hanno scaduto il ciclo (basato su Stripe)
    FOR user_record IN 
        SELECT id, plan, stripe_subscription_id, stripe_current_period_end 
        FROM public.users 
        WHERE stripe_current_period_end IS NOT NULL
        AND stripe_current_period_end::DATE <= CURRENT_DATE
        AND stripe_subscription_id IS NOT NULL
    LOOP
        -- Ricarica i crediti per questo utente
        PERFORM recharge_user_credits_stripe(
            user_record.id, 
            user_record.stripe_subscription_id,
            user_record.stripe_current_period_end + INTERVAL '1 month' -- Prossimo ciclo
        );
        users_recharged := users_recharged + 1;
    END LOOP;
    
    RETURN users_recharged;
END;
$$ LANGUAGE plpgsql;

-- Funzione per ottenere i giorni rimanenti al reset
CREATE OR REPLACE FUNCTION get_days_until_reset(user_id UUID)
RETURNS INT AS $$
DECLARE
    reset_date DATE;
BEGIN
    SELECT credits_reset_date INTO reset_date FROM public.users WHERE id = user_id;
    RETURN EXTRACT(DAY FROM (reset_date - CURRENT_DATE));
END;
$$ LANGUAGE plpgsql;

-- Aggiorna gli utenti esistenti con le nuove colonne
UPDATE public.users 
SET 
    billing_cycle_start = CURRENT_DATE,
    credits_reset_date = (CURRENT_DATE + INTERVAL '1 month'),
    total_credits_used_this_cycle = 0
WHERE billing_cycle_start IS NULL;

-- Commenti per documentazione
COMMENT ON COLUMN public.users.billing_cycle_start IS 'Data di inizio del ciclo di fatturazione corrente (da Stripe)';
COMMENT ON COLUMN public.users.credits_reset_date IS 'Data del prossimo reset automatico dei crediti (da Stripe)';
COMMENT ON COLUMN public.users.total_credits_used_this_cycle IS 'Totale crediti utilizzati nel ciclo corrente';
COMMENT ON COLUMN public.users.stripe_subscription_id IS 'ID abbonamento Stripe per tracciare il ciclo';
COMMENT ON COLUMN public.users.stripe_current_period_end IS 'Fine del periodo corrente da Stripe';
COMMENT ON COLUMN public.users.stripe_customer_id IS 'ID cliente Stripe per collegare pagamenti';
COMMENT ON FUNCTION recharge_user_credits_stripe(UUID, TEXT, TIMESTAMP WITH TIME ZONE) IS 'Ricarica i crediti per un utente tramite webhook Stripe';
COMMENT ON FUNCTION recharge_expired_users_stripe() IS 'Ricarica i crediti per tutti gli utenti con ciclo Stripe scaduto';
COMMENT ON FUNCTION get_days_until_reset(UUID) IS 'Restituisce i giorni rimanenti al prossimo reset crediti';
