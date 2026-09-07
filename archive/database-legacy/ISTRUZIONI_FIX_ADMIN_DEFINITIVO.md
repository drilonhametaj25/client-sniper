# Istruzioni per Correzione Definitiva del Pannello Admin

Questo documento spiega come risolvere definitivamente il problema del pannello admin per la visualizzazione e gestione degli utenti.

## Problema

Il pannello admin presenta questi problemi:
1. Errore "column reference 'id' is ambiguous" nelle funzioni RPC
2. Possibile discrepanza nei tipi di dati restituiti (error 42804)
3. Mancata sincronizzazione tra `auth.users` e `public.users`

## Soluzione: Parte SQL (Da completare manualmente)

### 1. Accedi all'Editor SQL di Supabase

Vai su [console.supabase.com](https://console.supabase.com), seleziona il tuo progetto e apri l'Editor SQL.

### 2. Copia e incolla questo codice SQL

Ecco una versione della funzione che risolve il problema. Puoi modificarla ulteriormente se necessario:

```sql
-- Questa funzione è una versione più robusta che evita l'ambiguità delle colonne
-- e assicura la corrispondenza dei tipi di dati

-- Fase 1: Assicurati che la tabella users abbia tutti i campi necessari
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client' CHECK (role IN ('admin', 'client'));

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled'));

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Fase 2: Sincronizza gli utenti mancanti da auth.users a public.users
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

-- Fase 3: Crea la funzione RPC definitiva che risolve i problemi di ambiguità
CREATE OR REPLACE FUNCTION public.admin_get_complete_users()
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
  
  -- Questa query utilizza alias espliciti per ogni tabella e colonna
  -- per evitare qualsiasi ambiguità
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

-- Concedi esecuzione agli utenti autenticati
GRANT EXECUTE ON FUNCTION public.admin_get_complete_users() TO authenticated;

-- Aggiungi un commento per documentare la funzione
COMMENT ON FUNCTION public.admin_get_complete_users() IS 'Funzione robusta che restituisce tutti gli utenti con dettagli completi, unendo auth.users e public.users con tipi espliciti per evitare ambiguità';

-- Verifica gli utenti
SELECT 
  (SELECT COUNT(*) FROM auth.users) AS auth_users_count,
  (SELECT COUNT(*) FROM public.users) AS public_users_count,
  (
    SELECT COUNT(*)
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  ) AS missing_in_public;
```

### 3. Esegui lo script e verifica i risultati

- Controlla che non ci siano errori durante l'esecuzione
- Verifica che i conteggi degli utenti siano corretti
- Assicurati che la funzione sia stata creata correttamente

## Soluzione: Parte Frontend (Già completata)

Il codice frontend è stato aggiornato per:
1. Provare più versioni della funzione RPC per maggiore robustezza
2. Gestire fallback multipli in caso di errori
3. Fornire log dettagliati per il debug

## Verifica Finale

Dopo aver applicato entrambe le modifiche:
1. Accedi al pannello admin in `/admin/users`
2. Controlla la console del browser per verificare che non ci siano più errori
3. Conferma che tutti gli utenti vengano visualizzati correttamente
4. Verifica che le funzionalità di modifica utente funzionino

## In caso di problemi persistenti

Se continui a riscontrare problemi:
1. Controlla che la funzione SQL sia stata creata con i tipi di dati corretti
2. Verifica che l'utente abbia i permessi necessari per eseguire la funzione RPC
3. Controlla eventuali errori nella console del browser
4. Verifica che non ci siano policy di sicurezza che bloccano l'accesso alle tabelle

## Nota sulla struttura del database

Per mantenere sincronizzati `auth.users` e `public.users` in futuro, considera:
1. Impostare un trigger su `auth.users` per sincronizzare automaticamente i nuovi utenti
2. Eseguire periodicamente lo script di sincronizzazione
3. Aggiornare la funzione RPC se vengono aggiunti nuovi campi alle tabelle
