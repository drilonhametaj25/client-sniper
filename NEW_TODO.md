# TrovaMi - TODO Sistemazioni Pagine Pubbliche

Documento per tracciare il progresso delle sistemazioni alle pagine pubbliche, SEO e nuovi tool.

---

## LEGENDA
- [ ] Da fare
- [x] Completato
- [~] In corso

---

## 1. QUICK WINS

### 1.1 Allineamento Crediti Gratuiti (5 invece di 2)
| File | Stato | Note |
|------|-------|------|
| `apps/frontend-app/app/page.tsx` (schema markup) | [x] | Completato |
| `apps/frontend-app/components/AdsLandingFAQ.tsx` | [x] | Completato |
| `apps/frontend-app/components/PlanSelector.tsx` | [x] | Completato |
| `libs/types/index.ts` | [x] | Completato |
| `apps/frontend-app/app/layout.tsx` | [x] | Completato |
| `apps/frontend-app/lib/ab-testing.ts` | [x] | Completato |
| `apps/frontend-app/lib/email-service.ts` | [x] | Completato |
| `apps/frontend-app/app/ads/*` | [x] | Completato |
| `apps/frontend-app/app/help/page.tsx` | [x] | Completato |
| `apps/frontend-app/app/terms/page.tsx` | [x] | Completato |
| `apps/frontend-app/app/settings/page.tsx` | [x] | Completato |
| `apps/frontend-app/app/blog/*` | [x] | Completato |
| Altri file | [x] | Completato (~30+ file aggiornati) |

### 1.2 P.IVA (07327360488)
| File | Stato | Note |
|------|-------|------|
| `apps/frontend-app/app/page.tsx` (footer) | [x] | Completato |
| `apps/frontend-app/app/terms/page.tsx` | [x] | Completato |
| `apps/frontend-app/app/privacy/page.tsx` | [x] | Completato |

---

## 2. HOMEPAGE IMPROVEMENTS

### 2.1 Contenuti
| Elemento | Stato | Note |
|----------|-------|------|
| Schema markup | [x] | Aggiornato a 5 lead gratuiti |
| Hero section | [x] | Testi coerenti |
| CTA buttons | [x] | Aggiornati |

### 2.2 Design/UX
| Elemento | Stato | Note |
|----------|-------|------|
| Hero section | [x] | OK |
| Features section | [x] | OK |
| Pricing section | [x] | NewPlanSelector OK |
| FAQ section | [x] | OK |
| Footer | [x] | P.IVA aggiunta |

---

## 3. NUOVI TOOL GRATUITI

### Priorità Alta
| Tool | Stato | Path | Note |
|------|-------|------|------|
| Tech Stack Detector | [x] | `/tools/tech-detector` | Completato |
| SEO Quick Checker | [x] | `/tools/seo-checker` | Completato |
| Security Quick Check | [x] | `/tools/security-check` | Completato |
| Accessibility Audit | [x] | `/tools/accessibility-check` | Completato |

### Priorità Media
| Tool | Stato | Path | Note |
|------|-------|------|------|
| Social Media Checker | [ ] | `/tools/social-checker` | Trova profili social |
| Speed Test | [ ] | `/tools/speed-test` | Richiede API esterna |

---

## 4. ARTICOLI BLOG (20 totali)

### Lead Generation (5)
| # | Titolo | Stato |
|---|--------|-------|
| 1 | Come trovare nuovi clienti per la tua web agency nel 2025 | [ ] |
| 2 | Lead generation per freelancer: guida completa | [ ] |
| 3 | Quanto costa un lead qualificato? Confronto metodi | [ ] |
| 4 | Come automatizzare la ricerca di clienti potenziali | [ ] |
| 5 | I 10 errori più comuni nella lead generation B2B | [ ] |

### Web Design & Sviluppo (5)
| # | Titolo | Stato |
|---|--------|-------|
| 6 | Come riconoscere un sito web obsoleto in 30 secondi | [ ] |
| 7 | Checklist audit tecnico sito web: 50 punti da verificare | [ ] |
| 8 | Performance web: perché la velocità fa perdere clienti | [ ] |
| 9 | SEO tecnica: i problemi più comuni dei siti italiani | [ ] |
| 10 | Mobile-first: perché il tuo cliente ne ha bisogno | [ ] |

### Marketing Digitale (5)
| # | Titolo | Stato |
|---|--------|-------|
| 11 | Come proporre un restyling a un cliente che non sa di averne bisogno | [ ] |
| 12 | Email a freddo che convertono: template per web agency | [ ] |
| 13 | Come calcolare il ROI di un nuovo sito web | [ ] |
| 14 | Pricing servizi web: come definire i prezzi giusti | [ ] |
| 15 | Case study: da lead freddo a cliente in 7 giorni | [ ] |

### Tool & Tecnologia (5)
| # | Titolo | Stato |
|---|--------|-------|
| 16 | I migliori tool per analisi competitor nel 2025 | [ ] |
| 17 | Automatizzare il prospecting: tool e strategie | [ ] |
| 18 | Come usare l'analisi tecnica per vendere servizi web | [ ] |
| 19 | GDPR e cookie: cosa devono sapere le aziende italiane | [ ] |
| 20 | Core Web Vitals: cosa sono e perché importano | [ ] |

---

## 5. DOCUMENTAZIONE

| File | Stato | Note |
|------|-------|------|
| CLAUDE.md | [x] | Aggiornato con crediti, P.IVA, tool documentati |
| NEW_TODO.md | [x] | Creato e aggiornato |

---

## PROGRESSI

### Sessione 1 - 9 Gennaio 2026
- [x] Quick wins completati (crediti 5, P.IVA)
- [x] Homepage sistemata
- [x] Documentazione aggiornata
- [x] 4 tool gratuiti creati:
  - Tech Stack Detector
  - SEO Quick Checker
  - Security Quick Check
  - Accessibility Quick Audit
- [x] 20 nuovi articoli blog creati (categoria "Web Agency"):
  - 5 articoli Lead Generation per Web Agency
  - 5 articoli Web Design & Sviluppo
  - 5 articoli Marketing e Vendita Servizi Web
  - 5 articoli Tool e Tecnologia
- [x] Tutte le date aggiornate da 2024/2025 a 2025/2026

### Prossimi step (opzionali)
- [ ] Tool priorità media (Social Checker, Speed Test)
- [ ] Contenuti completi per articoli blog (attualmente solo metadata)

---

## NOTE TECNICHE

### Prezzi Piani (corretti nel DB)
- Free: 5 crediti, €0
- Starter: 25 lead, €19/mese o €190/anno
- Pro: 100 lead, €49/mese o €490/anno
- Agency: 300 lead, €99/mese o €990/anno

### P.IVA
- Vecchia (placeholder): IT12345678901
- Nuova (corretta): 07327360488

### Tool esistente
- Public Scan: `/tools/public-scan` - 2 analisi/giorno senza login
