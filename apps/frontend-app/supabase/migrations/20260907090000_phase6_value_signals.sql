-- =====================================================
-- FASE 6 (segnali di valore): rating/recensioni Google + WhatsApp
-- =====================================================
-- Lo scraper estrae da sempre rating e numero di recensioni dal profilo
-- Google Business, ma venivano scartati prima del salvataggio. Sono segnali
-- di solidità del business (un'attività con 80 recensioni può pagare) e
-- alimentano il bonus "viability" dell'opportunity score v2.
-- has_whatsapp: presenza di un canale WhatsApp (link wa.me sul sito) — per
-- le PMI italiane è un canale di contatto chiave e un pitch concreto.

BEGIN;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS reviews_count INT,
  ADD COLUMN IF NOT EXISTS has_whatsapp BOOLEAN;

COMMENT ON COLUMN public.leads.rating IS 'Rating Google Business (0-5)';
COMMENT ON COLUMN public.leads.reviews_count IS 'Numero recensioni Google Business';
COMMENT ON COLUMN public.leads.has_whatsapp IS 'Il sito espone un canale WhatsApp (wa.me)';

-- Grant al client (il paywall a colonne è fail-closed sulle nuove colonne)
GRANT SELECT (rating) ON public.leads TO authenticated;
GRANT SELECT (reviews_count) ON public.leads TO authenticated;
GRANT SELECT (has_whatsapp) ON public.leads TO authenticated;

COMMIT;
