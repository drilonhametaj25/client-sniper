# Archivio SQL legacy (pre-settembre 2026)

Questi 68 file venivano incollati A MANO nell'editor SQL di Supabase, senza
ledger delle migrazioni: nessuno sapeva con certezza cosa fosse applicato in
produzione (il codice faceva runtime-probing delle colonne per scoprirlo).

Da settembre 2026 le migrazioni vivono in `apps/frontend-app/supabase/migrations/`
con nome timestampato e vanno applicate in ordine. Questi file restano solo
come riferimento storico: NON eseguirli.

File ancora utili come riferimento:
- `proposals-system-migration.sql` — fonte originale della RPC consume_proposal
  (sostituita da consume_credit nella migrazione phase1_credits)
- `confidence-system-migration.sql` — sistema di quarantena/confidenza
- `setup.sql` — schema iniziale
