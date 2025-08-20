#!/bin/bash

# SCRIPT DEPRECATO - Reset sostituzioni ora gestito da GitHub Actions
# Le sostituzioni vengono resettate insieme ai crediti ogni 30 giorni
# dal momento della registrazione utente, non il 1° del mese
# 
# Usa invece GitHub Actions workflow: .github/workflows/reset-credits.yml
# che gira ogni giorno e controlla gli utenti che necessitano rinnovo

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${RED}⚠️  SCRIPT DEPRECATO${NC}"
echo
echo -e "${YELLOW}Questo script non è più necessario!${NC}"
echo
echo "Il reset delle sostituzioni è ora gestito automaticamente da:"
echo "• GitHub Actions (.github/workflows/reset-credits.yml)"
echo "• API endpoint /api/cron/reset-credits"
echo "• Funzione database reset_user_replacements(user_id)"
echo
echo "Il reset avviene ogni 30 giorni dalla registrazione utente,"
echo "non il primo del mese calendario."
echo
echo -e "${GREEN}✅ Sistema automatico già attivo!${NC}"
echo
echo "Per verificare il funzionamento:"
echo "• Vai su GitHub → Actions → 'Reset Credits Daily'"
echo "• Controlla i log dell'ultima esecuzione"
echo "• Verifica che includa 'Resetting replacements for user'"
echo

exit 0
