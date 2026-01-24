-- =====================================================
-- MIGRATION: Credit Packs System
-- Data: 2026-01-24
-- Funzionalità: Acquisto crediti a pacchetto (one-time)
-- =====================================================

-- =====================================================
-- 1. TABELLA CREDIT PACKS (Pacchetti disponibili)
-- =====================================================

CREATE TABLE IF NOT EXISTS credit_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'eur',
  stripe_price_id TEXT,
  discount_percentage INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. INSERISCI PACCHETTI DEFAULT
-- =====================================================

INSERT INTO credit_packs (name, credits, price_cents, stripe_price_id, discount_percentage, sort_order) VALUES
  ('Micro', 5, 499, NULL, 0, 1),
  ('Small', 15, 1299, NULL, 13, 2),
  ('Medium', 50, 3999, NULL, 20, 3),
  ('Large', 100, 6999, NULL, 30, 4),
  ('XL', 250, 14999, NULL, 40, 5)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. TABELLA CREDIT PURCHASES (Storico acquisti)
-- =====================================================

CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_pack_id UUID REFERENCES credit_packs(id),
  credits_purchased INTEGER NOT NULL,
  amount_paid_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'eur',
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  status TEXT DEFAULT 'pending', -- pending, completed, failed, refunded
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- 4. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_credit_packs_active ON credit_packs(is_active);
CREATE INDEX IF NOT EXISTS idx_credit_packs_sort ON credit_packs(sort_order);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user ON credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_status ON credit_purchases(status);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_created ON credit_purchases(created_at DESC);

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE credit_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;

-- Credit packs: tutti possono leggere (sono pubblici)
CREATE POLICY "Anyone can view active credit packs" ON credit_packs
  FOR SELECT USING (is_active = true);

-- Credit purchases: utente vede solo i suoi
CREATE POLICY "Users can view own credit purchases" ON credit_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit purchases" ON credit_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 6. FUNCTION: Aggiorna credits utente dopo acquisto
-- =====================================================

CREATE OR REPLACE FUNCTION complete_credit_purchase(
  p_purchase_id UUID,
  p_stripe_payment_intent_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_purchase credit_purchases%ROWTYPE;
  v_credits INTEGER;
BEGIN
  -- Trova l'acquisto
  SELECT * INTO v_purchase FROM credit_purchases WHERE id = p_purchase_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_purchase.status != 'pending' THEN
    RETURN FALSE; -- Già processato
  END IF;

  -- Aggiorna l'acquisto
  UPDATE credit_purchases
  SET
    status = 'completed',
    stripe_payment_intent_id = COALESCE(p_stripe_payment_intent_id, stripe_payment_intent_id),
    completed_at = NOW()
  WHERE id = p_purchase_id;

  -- Aggiungi crediti all'utente
  UPDATE users
  SET
    credits_remaining = COALESCE(credits_remaining, 0) + v_purchase.credits_purchased,
    updated_at = NOW()
  WHERE id = v_purchase.user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. TRIGGER: Updated_at automatico
-- =====================================================

CREATE OR REPLACE FUNCTION update_credit_packs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_credit_packs_updated_at ON credit_packs;
CREATE TRIGGER trigger_credit_packs_updated_at
  BEFORE UPDATE ON credit_packs
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_packs_updated_at();
