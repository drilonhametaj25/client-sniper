-- Aggiunge supporto per dark/light mode agli utenti
-- Questo script aggiunge il campo preferred_theme alla tabella users
-- per salvare le preferenze di tema degli utenti registrati

-- Aggiunta colonna preferred_theme alla tabella users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS preferred_theme TEXT DEFAULT 'system' CHECK (preferred_theme IN ('light', 'dark', 'system'));

-- Indice per performance (opzionale)
CREATE INDEX IF NOT EXISTS idx_users_preferred_theme ON public.users(preferred_theme);

-- Funzione RPC per aggiornare le preferenze tema dell'utente
CREATE OR REPLACE FUNCTION public.update_user_theme_preference(
  new_theme TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Controllo autenticazione
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Devi essere loggato per salvare le preferenze tema';
  END IF;
  
  -- Validazione tema
  IF new_theme NOT IN ('light', 'dark', 'system') THEN
    RAISE EXCEPTION 'Tema non valido. Usa: light, dark, system';
  END IF;
  
  -- Aggiorna preferenza tema
  UPDATE public.users
  SET preferred_theme = new_theme
  WHERE id = current_user_id;
  
  -- Verifica se è stato aggiornato
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utente non trovato';
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Preferenza tema aggiornata con successo',
    'theme', new_theme
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Concedi permessi per la funzione
GRANT EXECUTE ON FUNCTION public.update_user_theme_preference TO authenticated;

-- Commenti per documentazione
COMMENT ON COLUMN public.users.preferred_theme IS 'Preferenza tema utente: light, dark, system';
COMMENT ON FUNCTION public.update_user_theme_preference IS 'Aggiorna la preferenza tema di un utente autenticato';
