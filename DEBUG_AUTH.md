# 🚨 Debug Sessioni Auth - Guida Troubleshooting

## Problema: Utente Admin diventa "Free" dopo un po'

### Possibili Cause

1. **Timeout della query profilo** (risolto ✅)
2. **Fallback aggressivo al piano "free"** (risolto ✅)
3. **Errori di rete temporanei** (risolto ✅)
4. **Problemi di sincronizzazione database** 
5. **Token di sessione scaduto**
6. **Query SQL con errori**

### Come Diagnosticare

#### 1. Usa il Bottone Debug 
Nel dashboard admin c'è ora un bottone rosso "Debug Sessione":
- Clicca e controlla la console
- Verifica se tutti i dati sono presenti

#### 2. Controlla Console Browser
Cerca questi log:
```
✅ Profilo caricato: [plan] [role]
❌ Errore query users: [errore]
⚠️ Dati profilo incompleti: [dati]
🔄 Tentativo X/3 caricamento profilo...
```

#### 3. Verifica Database Manualmente
```sql
-- Controlla se l'utente esiste
SELECT * FROM users WHERE email = 'tua-email@example.com';

-- Controlla se ha ruolo admin
SELECT role, plan, credits_remaining FROM users WHERE email = 'tua-email@example.com';
```

#### 4. Controlla Supabase Auth
```sql
-- Nella tabella auth.users
SELECT id, email FROM auth.users WHERE email = 'tua-email@example.com';
```

### Correzioni Applicate

#### ✅ Fallback Aggressivo Rimosso
**Prima:**
```typescript
// Fallback automatico al piano free
const fallbackUser = {
  ...session.user,
  role: 'client' as const,
  plan: 'free' as const,
  credits_remaining: 2
}
```

**Dopo:**
```typescript
// Mantiene sessione senza assumere piano
setUser({
  ...session.user,
  role: undefined,
  plan: undefined,
  credits_remaining: undefined,
} as AuthUser)
```

#### ✅ Retry Logic Aggiunta
```typescript
const getUserProfileWithRetry = async (userId: string, retries: number)
```
- 3 tentativi invece di 1
- Delay crescente tra retry
- Verifiche di completezza dati

#### ✅ Logging Migliorato
```typescript
console.log('✅ Profilo completo assemblato:', {
  email: completeProfile.email,
  role: completeProfile.role,
  plan: completeProfile.plan,
  credits: completeProfile.credits_remaining
})
```

### Se il Problema Persiste

#### 1. Forza refresh profilo
```typescript
// Nella console browser
window.location.reload()
```

#### 2. Logout/Login completo
```typescript
// Via Supabase
await supabase.auth.signOut()
```

#### 3. Verifica RLS Policies
```sql
-- Controlla che le policy permettano la lettura
SELECT * FROM information_schema.enabled_roles;
```

#### 4. Controlla connessione Supabase
- URL corretta nel .env
- Chiavi non scadute
- Rate limiting non attivo

### Monitoring Proattivo

#### Aggiungi Alert Console
```typescript
// Nel AuthContext
if (!profile?.role || !profile?.plan) {
  console.error('🚨 ALERT: Profilo incompleto per admin!', profile)
}
```

#### Aggiungi Fallback UI
```tsx
{user?.role === undefined && (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
    ⚠️ Problemi nel caricamento profilo. <button onClick={refreshProfile}>Riprova</button>
  </div>
)}
```

### Script di Emergenza

Se l'admin non riesce più ad accedere:

```sql
-- Forza ripristino admin
UPDATE users 
SET role = 'admin', plan = 'pro', credits_remaining = 1000 
WHERE email = 'admin@clientsniper.com';
```

### Prevenzione

1. **Monitor logs** regolarmente
2. **Test sessioni lunghe** durante sviluppo  
3. **Backup automatici** del database
4. **Health checks** delle API Supabase
5. **Timeout alerts** quando query lente

Il sistema ora è molto più robusto e non dovrebbe più "degradare" gli admin a utenti free! 🛡️
