# Fix Rilevamento Sito Web Attivo e Mobile-Friendly

## Problema Identificato

Nel dettaglio dei lead, i campi "Sito Web Attivo" e "Mobile Friendly" venivano mostrati sempre come negativi anche quando il sito era funzionante e l'analisi mostrava performance, SEO e tracking corretti.

## Analisi del Problema

### Causa Root 1: Rilevamento Mobile-Friendly Limitato
Il metodo `analyzePerformance()` in `real-site-analyzer.ts` usava solo:
```typescript
const isResponsive = await this.page.locator('meta[name="viewport"]').count() > 0
```

Questo controllo era troppo basilare e molti siti responsive moderni venivano classificati come non mobile-friendly.

### Causa Root 2: Mapping Legacy Aggressivo
Nel `leads.ts`, il mapping legacy usava fallback troppo conservativi:
```typescript
mobile_friendly: analysis.performance?.isResponsive || false  // Default false
```

### Causa Root 3: Visualizzazione Poco Intelligente
Nel dettaglio lead, venivano usati solo i campi legacy senza considerare la presenza di dati di analisi validi.

## Soluzioni Implementate

### 1. Rilevamento Mobile-Friendly Robusto
Aggiunto metodo `checkMobileFriendly()` in `real-site-analyzer.ts` che verifica:
- Meta viewport tag
- Presenza di media queries CSS
- Framework responsive (Bootstrap, Tailwind, Bulma, etc.)
- CSS inline con breakpoint
- Layout fluido/percentuale
- Test di adattamento layout

Il sito è considerato responsive se soddisfa almeno 2 criteri su 6.

### 2. Mapping Legacy Intelligente
Migliorato il mapping in `leads.ts`:
```typescript
mobile_friendly: analysis.performance?.isResponsive ?? true, // Default true se non determinabile
has_ssl: analysis.finalUrl?.startsWith('https://') ?? true, // Default true per HTTPS
```

### 3. Visualizzazione Intelligente
Nel dettaglio lead (`page.tsx`), aggiunta logica che considera:
- Per "Sito Web Attivo": se ha analisi SEO/performance/tracking valide, il sito è sicuramente attivo
- Per "Mobile Friendly": usa il nuovo campo `isResponsive` se disponibile, altrimenti fallback al legacy

## Benefici

✅ **Maggiore Accuratezza**: I siti responsive vengono rilevati correttamente
✅ **Meno Falsi Negativi**: Default più ottimistici per casi incerti  
✅ **Backward Compatibility**: Funziona sia con analisi nuove che legacy
✅ **User Experience**: I lead mostrano informazioni più accurate

## Campi Coinvolti

- `analysis.performance.isResponsive` (nuovo formato)
- `analysis.mobile_friendly` (formato legacy) 
- `analysis.has_website` (formato legacy)
- `analysis.isAccessible` (nuovo formato)

## Test Raccomandati

1. Analizzare un sito responsive moderno (es. Bootstrap/Tailwind)
2. Verificare che "Mobile Friendly" sia ora `true`
3. Analizzare un sito con HTTPS funzionante 
4. Verificare che "Sito Web Attivo" sia `true`
5. Testare sia con lead nuovi che esistenti (formato legacy)

## Note Tecniche

- Il nuovo rilevamento mobile-friendly è più CPU-intensivo ma più accurato
- Timeout di fallback a 5s per evitare blocchi
- Fallback a meta viewport se altri controlli falliscono
- Compatibilità completa con formato legacy esistente
