# Fix Rapido per Pannello Admin

Questo file contiene istruzioni per risolvere rapidamente i problemi del pannello admin.

## Problema
Il pannello admin mostra errori:
- `column reference "id" is ambiguous`
- `42804: structure of query does not match function result type`

## Soluzione

### 1. Esegui questo script SQL in Supabase:

```sql
-- Versione robusta delle funzioni admin
-- Soluzione definitiva per "column reference id is ambiguous"

-- Step 1: Sincronizziamo gli utenti mancanti
INSERT INTO public.users (id, email, role, plan, credits_remaining, created_at)
SELECT 
  au.id, 
  au.email, 
  'client' as role, 
  'free' as plan,
  2 as credits_remaining,
  NOW() as created_at
FROM 
  auth.users au
LEFT JOIN
  public.users pu ON au.id = pu.id
WHERE 
  pu.id IS NULL;

-- Step 2: Creiamo la funzione RPC definitiva
CREATE OR REPLACE FUNCTION public.admin_get_users_complete()
RETURNS TABLE (
  id UUID, 
  email TEXT,
  role TEXT,
  plan TEXT,
  credits_remaining INTEGER,
  status TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo admin possono accedere a questa funzione
  IF NOT EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Accesso negato: solo gli amministratori possono usare questa funzione';
  END IF;
  
  -- Cast espliciti per evitare problemi di tipo
  RETURN QUERY
  SELECT 
    au.id::UUID,
    au.email::TEXT,
    COALESCE(pu.role, 'client')::TEXT,
    COALESCE(pu.plan, 'free')::TEXT,
    COALESCE(pu.credits_remaining, 0)::INTEGER,
    COALESCE(pu.status, 'active')::TEXT,
    pu.stripe_customer_id::TEXT,
    pu.stripe_subscription_id::TEXT,
    au.email_confirmed_at::TIMESTAMPTZ,
    au.created_at::TIMESTAMPTZ,
    au.last_sign_in_at::TIMESTAMPTZ
  FROM 
    auth.users au
  LEFT JOIN 
    public.users pu ON au.id = pu.id;
END;
$$;

-- Concedi permessi
GRANT EXECUTE ON FUNCTION public.admin_get_users_complete() TO authenticated;

-- Verifica che tutto funzioni
SELECT COUNT(*) FROM auth.users;
SELECT COUNT(*) FROM public.users;
```

### 2. Verifica l'implementazione

Il frontend è già stato aggiornato per:
1. Tentare automaticamente diverse funzioni RPC
2. Fornire fallback se una funzione fallisce
3. Mostrare messaggi di errore con istruzioni dettagliate

### 3. Test

1. Accedi al pannello admin in `/admin/users`
2. Verifica che tutti gli utenti siano visualizzati correttamente
3. Assicurati che le modifiche agli utenti funzionino

## Nota Importante

Se il problema persiste:
1. Controlla i log del browser per dettagli sull'errore
2. Verifica che il ruolo del tuo utente sia impostato su "admin" in public.users
3. Controlla le policy di Supabase per l'accesso alle funzioni RPC
