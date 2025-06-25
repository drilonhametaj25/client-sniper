# 🔓 Sistema Lead Unlock - Fix Doppio Consumo Crediti

Questo documento descrive l'implementazione del fix per evitare che i crediti vengano scalati multiple volte per lo stesso lead.

## 🐛 Problema Risolto

**Issue**: Gli utenti perdevano crediti ogni volta che visualizzavano i dettagli di un lead già visto in precedenza.

**Impatto**: 
- Utenti free (2 crediti) esaurivano rapidamente i crediti
- Esperienza utente pessima
- Perdita di valore del servizio

## ✅ Soluzione Implementata

### 1. Database Schema
**Tabella**: `user_unlocked_leads`
```sql
CREATE TABLE user_unlocked_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  billing_cycle_start DATE,
  UNIQUE(user_id, lead_id)
);
```

### 2. Funzioni SQL
```sql
-- Ottiene lead sbloccati per utente nel ciclo corrente
CREATE FUNCTION get_user_unlocked_leads(p_user_id UUID)
RETURNS TABLE(lead_id UUID)

-- Registra un lead come sbloccato
CREATE FUNCTION unlock_lead_for_user(p_user_id UUID, p_lead_id UUID)
RETURNS VOID
```

### 3. Frontend Logic

**File**: `apps/frontend-app/app/lead/[id]/page.tsx`

**Prima** (problema):
```typescript
const loadLeadDetails = async () => {
  // Sempre scala crediti
  if ((user.credits_remaining || 0) <= 0) {
    setError('Crediti insufficienti')
    return
  }
  
  // Carica lead
  // Scala sempre 1 credito
  await consumeCredit()
}
```

**Dopo** (fix):
```typescript
const loadLeadDetails = async () => {
  // Verifica se già sbloccato
  const { data: unlockedLeads } = await supabase
    .rpc('get_user_unlocked_leads', { p_user_id: user?.id })
  
  const isAlreadyUnlocked = unlockedLeads?.some(ul => ul.lead_id === leadId)
  
  // Verifica crediti solo se NON già sbloccato
  if (!isAlreadyUnlocked && (user.credits_remaining || 0) <= 0) {
    setError('Crediti insufficienti')
    return
  }
  
  // Carica lead
  // Scala crediti SOLO se non già sbloccato
  if (!isAlreadyUnlocked) {
    await consumeCredit()
  }
}

const consumeCredit = async () => {
  // Scala credito
  await supabase.from('users').update({ credits_remaining: currentCredits - 1 })
  
  // NUOVO: Registra lead come sbloccato
  await supabase.rpc('unlock_lead_for_user', { p_user_id: user.id, p_lead_id: leadId })
  
  // Log utilizzo
  await supabase.from('credit_usage_log').insert({...})
}
```

### 4. Dashboard Integration

**File**: `apps/frontend-app/app/dashboard/page.tsx`

La dashboard già implementa:
- Caricamento lead sbloccati all'avvio: `loadUnlockedLeads()`
- Stato `unlockedLeads` per tracciare lead accessibili
- UI differenziata per lead sbloccati vs bloccati
- Export solo dei lead sbloccati

## 🧪 Test del Sistema

### Test Manuale
```bash
# Esegui test suite
npm run test:unlock

# Test flow completo:
1. Registrati con account free (2 crediti)
2. Vai alla dashboard 
3. Clicca su un lead → crediti: 2 → 1
4. Torna alla dashboard
5. Clicca sullo stesso lead → crediti rimangono a 1 ✅
```

### Test Database
```sql
-- Verifica lead sbloccati
SELECT * FROM user_unlocked_leads WHERE user_id = '[USER_ID]';

-- Verifica uso crediti
SELECT * FROM credit_usage_log WHERE user_id = '[USER_ID]' 
  AND action = 'lead_detail_view' ORDER BY created_at DESC;

-- Dovrebbe esserci un solo record per lead in entrambe le tabelle
```

## 📊 Benefici

### Performance
- ✅ Meno richieste database (check unlock prima di scale)
- ✅ UX più fluida (no "crediti insufficienti" su lead già visti)
- ✅ Cache implicita dei lead visualizzati

### Business Logic
- ✅ Crediti utilizzati in modo equo
- ✅ Utenti possono rivedere lead acquistati
- ✅ Valore del servizio aumentato
- ✅ Retention migliorata

### Compliance
- ✅ Tracciabilità completa (audit trail)
- ✅ Log dettagliato per supporto
- ✅ Rispetto billing cycle limits

## 🔧 Implementazione Files

### Database
- `user-unlocked-leads.sql` - Schema e funzioni

### Frontend  
- `apps/frontend-app/app/lead/[id]/page.tsx` - Pagina dettaglio lead (MODIFICATO)
- `apps/frontend-app/app/dashboard/page.tsx` - Dashboard (già ok)

### Tests
- `apps/frontend-app/test-unlock-system.js` - Test suite

### Scripts
- `npm run test:unlock` - Esegue test

## 🚀 Deploy Checklist

### Pre-Deploy
- [ ] ✅ Test locali passati
- [ ] ✅ Database schema aggiornato
- [ ] ✅ Funzioni SQL testate
- [ ] ✅ Frontend logic verificata

### Deploy
- [ ] Deploy codice frontend
- [ ] Verifica funzioni SQL in produzione
- [ ] Test con utenti real-world
- [ ] Monitor log errori

### Post-Deploy
- [ ] Test flow completo
- [ ] Verifica metriche utilizzo crediti
- [ ] Check customer feedback
- [ ] Monitor performance database

## 🔍 Monitoring

### Metriche da Monitorare
```sql
-- Lead sbloccati per giorno
SELECT DATE(unlocked_at) as date, COUNT(*) as unlocked_leads
FROM user_unlocked_leads 
WHERE unlocked_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(unlocked_at)
ORDER BY date DESC;

-- Utilizzo crediti medio per utente
SELECT 
  u.plan,
  AVG(credits_consumed) as avg_credits_per_session,
  COUNT(DISTINCT u.id) as unique_users
FROM users u
JOIN credit_usage_log cul ON u.id = cul.user_id
WHERE cul.created_at >= NOW() - INTERVAL '7 days'
GROUP BY u.plan;

-- Efficienza sistema unlock
SELECT 
  COUNT(CASE WHEN action = 'lead_detail_view' THEN 1 END) as credit_uses,
  COUNT(DISTINCT metadata->>'lead_id') as unique_leads_unlocked,
  ROUND(
    COUNT(CASE WHEN action = 'lead_detail_view' THEN 1 END)::float / 
    COUNT(DISTINCT metadata->>'lead_id'), 2
  ) as ratio_credit_to_unique_leads
FROM credit_usage_log 
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND action = 'lead_detail_view';
```

### Alert Setup
- Ratio credit/unique_leads > 1.1 → Sistema unlock fallito
- Lead sbloccati = 0 per >1h → Funzioni SQL problemi
- Errori API unlock > 5% → Frontend logic bug

## 📈 Risultati Attesi

### Metriche Business
- **Retention**: +20% utenti attivi dopo 7 giorni
- **Credits Efficiency**: Ratio crediti/lead visualizzati ≈ 1.0  
- **User Satisfaction**: Meno lamentele "crediti finiti troppo presto"
- **Revenue**: Più utenti convertono a paid plans

### Metriche Tecniche
- **API Calls**: -30% chiamate duplicate per stesso lead
- **Database Load**: Meno stress su tabella users (meno updates)
- **Cache Hit Rate**: Lead sbloccati = cache implicita

---

## 🎯 Status: ✅ IMPLEMENTATO E PRONTO

Il sistema di unlock è ora completamente implementato e testato. Gli utenti non perderanno più crediti visualizzando lo stesso lead multiple volte.

**Prossimo Deploy**: Ready for Production 🚀
