-- Tabella per salvare eventi webhook di Stripe per debug e retry
-- Permette di tracciare tutti gli eventi ricevuti e gestire errori
-- Utilizzata dal webhook handler per logging e retry logic

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Aggiungi campo credits_reset_date alla tabella users per gestire reset automatico
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS credits_reset_date TIMESTAMP WITH TIME ZONE;

-- Aggiorna tutti gli utenti esistenti con data di reset (30 giorni dalla creazione account)
UPDATE public.users 
SET credits_reset_date = CASE 
  WHEN plan != 'free' AND stripe_subscription_id IS NOT NULL THEN 
    created_at + INTERVAL '30 days'
  WHEN plan != 'free' THEN 
    created_at + INTERVAL '30 days'
  ELSE 
    NULL
END
WHERE credits_reset_date IS NULL;

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_stripe_id ON public.stripe_webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type ON public.stripe_webhook_events(type);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed ON public.stripe_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_users_credits_reset_date ON public.users(credits_reset_date) WHERE credits_reset_date IS NOT NULL;

-- Funzione per calcolare prossima data di reset (30 giorni da oggi)
CREATE OR REPLACE FUNCTION calculate_next_reset_date(input_date TIMESTAMP WITH TIME ZONE)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calcola 30 giorni dalla data fornita
  RETURN date_trunc('day', input_date) + INTERVAL '30 days';
END;
$$;

-- Trigger per aggiornare updated_at nella tabella webhook events
CREATE OR REPLACE FUNCTION update_webhook_event_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_webhook_event_timestamp
  BEFORE UPDATE ON public.stripe_webhook_events
  FOR EACH ROW EXECUTE FUNCTION update_webhook_event_timestamp();

-- Policy RLS per stripe_webhook_events (solo admin)
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_events_admin_only ON public.stripe_webhook_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
