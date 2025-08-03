-- Fix per conteggio utenti in dashboard admin
-- Crea una funzione RPC per contare gli utenti da auth.users
-- Da usare nella dashboard admin quando la tabella users custom è vuota

-- Funzione per contare utenti da auth.users
CREATE OR REPLACE FUNCTION get_auth_users_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Conta tutti gli utenti dalla tabella auth.users
  RETURN (
    SELECT count(*)::INTEGER 
    FROM auth.users 
    WHERE deleted_at IS NULL
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback in caso di errore
    RETURN 0;
END;
$$;

-- Assicurati che la funzione sia accessibile agli admin
GRANT EXECUTE ON FUNCTION get_auth_users_count() TO authenticated;

-- Verifica sincronizzazione tabella users con auth.users
-- Se la tabella users è vuota, popolala con i dati da auth.users
INSERT INTO users (id, email, plan, created_at)
SELECT 
  au.id,
  au.email,
  'free' as plan,
  au.created_at
FROM auth.users au
LEFT JOIN users u ON u.id = au.id
WHERE u.id IS NULL 
  AND au.deleted_at IS NULL
ON CONFLICT (id) DO NOTHING;

-- Funzione per sincronizzare automaticamente users con auth.users
CREATE OR REPLACE FUNCTION sync_auth_users_to_users()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  -- Inserisci utenti mancanti da auth.users a users
  INSERT INTO users (id, email, plan, created_at)
  SELECT 
    au.id,
    au.email,
    'free' as plan,
    au.created_at
  FROM auth.users au
  LEFT JOIN users u ON u.id = au.id
  WHERE u.id IS NULL 
    AND au.deleted_at IS NULL
  ON CONFLICT (id) DO NOTHING;
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  
  RETURN inserted_count;
EXCEPTION
  WHEN OTHERS THEN
    RETURN 0;
END;
$$;

GRANT EXECUTE ON FUNCTION sync_auth_users_to_users() TO authenticated;

-- Test delle funzioni
SELECT get_auth_users_count() as auth_users_count;
SELECT sync_auth_users_to_users() as synced_users;
SELECT count(*) as users_table_count FROM users;
