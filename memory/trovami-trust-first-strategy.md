---
name: trovami-trust-first-strategy
description: Strategia di rilancio di TrovaMi (lead-gen SaaS) basata sulla fiducia e sul sistema di confidenza
metadata:
  type: project
---

TrovaMi è un lead-gen SaaS per agenzie/freelance IT: trova aziende con siti tecnicamente carenti come opportunità di vendita. Problema principale (giugno 2026): troppi falsi positivi tecnici e dati di contatto sbagliati → prodotto poco utilizzabile.

Strategia decisa con l'utente: **"fiducia prima del volume"**. Si introduce un sistema di **confidenza** su ogni segnale di analisi e una decisione published/quarantine a livello di lead. I lead a bassa confidenza vanno in **quarantena e sono nascosti del tutto** agli utenti.

Roadmap a fasi: 0) modello confidenza + schema DB, 1) reachability checker affidabile, 2) detection via network interception, 3) contatti validati + dedup fuzzy, 4) feedback loop + quarantena + ri-analisi di massa, 5) frontend orientato all'opportunità.

Stato: utenti reali in produzione da preservare (gli account), ma i dati dei lead non sono affidabili → si può ri-analizzare/ripulire in modo aggressivo. Target: freelance/piccole agenzie IT, agenzie marketing strutturate, e setter/venditori B2B (tutti e tre).

Implementazione confidenza in `services/scraping-engine/src/utils/confidence.ts`. Vedi [[trovami-feedback-working-style]].

**Bug reali trovati e risolti durante il test live (sessione 2026-06-01)** — tutti verificati a schermo su localhost:4000 (la :3000 è occupata da un altro progetto "EdiliziaMi"):
1. **Crediti a 0 dopo upgrade**: `getUserProfile` (lib/auth.ts) NON caricava `proposals_remaining` (sistema attuale), solo `credits_remaining` (legacy) → il frontend ripiegava su credits_remaining=0 e bloccava lo sblocco. Fix: aggiunto proposals_remaining/proposals_reset_date/first_proposal_used a SELECT+tipo+mapping.
2. **Preventivo PDF/JSON 500**: `@react-pdf/renderer` in package.json ma NON installato → `npm install` necessario in deploy. Anche le quotation 500 erano cache `.next` corrotta (rm -rf .next).
3. **Checkout Stripe rotto**: `plans.stripe_price_id_monthly/annual` erano NULL ("Piano non configurato") → popolati (database/fix-plans-stripe-price-ids.sql); aggiunto `allow_promotion_codes:true` + `payment_method_collection:'if_required'` a create-checkout (il coupon DRI = 100% → €0).
4. **plans.max_proposals = 0** per tutti i piani → starter 25/pro 100/agency 300 (database/fix-plans-max-proposals.sql).
5. **API leads 500 senza migration** (colonna status) → reso resiliente (lib/utils/leads-schema.ts).
6. **CRM free-user**: scheletri infiniti + 4 toast → schermata upgrade pulita.
7. Minori: badge piano "Starter_monthly"→"Starter", tour i18n (locale non passata a Joyride), doppia voce "Feedback".

DEPLOY: `npm install` obbligatorio + eseguire gli SQL in `database/` (2 migration confidence/feedback + 3 fix dati piani). Upgrade reale end-to-end richiede webhook Stripe verso il server. `.env.local` con chiavi LIVE creato per il test (da rimuovere/ruotare).

Dettaglio lead (`app/lead/[id]/page.tsx`) ripulito: rimosse le sezioni duplicate (Problemi Legacy, Conformità GDPR, Presenza Social, "Raccomandazioni per il Cliente" lista, "Riepilogo Raccomandazioni" finale), 2 blocchi grafici collassati sotto toggle `showTechCharts`. Vista raccomandazioni unica = griglia "Riepilogo Opportunità" + "Preventivo Automatico" (QuotationTab) + il summary in cima (LeadOpportunitySummary).

**Stato implementazione (sessione 2026-06-01): Fasi 0–5 codificate, NON ancora deployate.** Il deploy va fatto in blocco dall'utente. Passi obbligatori d'ordine: 1) eseguire in Supabase `database/confidence-system-migration.sql` POI `database/feedback-lead-quarantine-migration.sql` (l'API filtra `status='published'`, quindi le colonne devono esistere prima del deploy del codice); 2) `npm install` (nessuna nuova dipendenza aggiunta, ma per sicurezza); 3) deploy codice; 4) ri-analisi storica con `npm run recheck-leads --all` nello scraping-engine. File chiave nuovi: `utils/confidence.ts`, `scripts/recheck-leads.ts`, `components/LeadOpportunitySummary.tsx`, `components/ReportLeadIssueButton.tsx`. Errori TS pre-esistenti NON miei: `setUserAgent` in yelp.ts/pagine-gialle.ts, Promise types in master-analyzer.ts.

**Terminologia unificata (sessione 2026-06-01)**: scelta utente = "Crediti" + azione "Sblocca lead" (solo stringhe UI, NON i campi backend `proposals_remaining`). Applicato a dashboard, AccountStatusBar, LeadCard, SimplePricing, StepWelcome, landing. ATTENZIONE: "proposta" ha due significati — l'unità (→ crediti) e la "proposta commerciale" deliverable + le proposte-servizi del CRM (CRMKanban/CRMLeadSidebar/LeadDigitalServices), che restano "proposte". Dashboard: aggiunta microcopy "1 credito = 1 lead sbloccato" e CTA "Sblocca Lead (1 credito)". Rimane eventuale: restyling visivo profondo del layout dashboard (non fatto, file da 2300 righe, meglio con verifica a schermo).
