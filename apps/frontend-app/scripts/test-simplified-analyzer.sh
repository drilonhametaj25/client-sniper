#!/bin/bash

# Script per testare l'analisi semplificata in locale
# Esegue un'analisi manuale forzando l'uso di SimplifiedSiteAnalyzer

# Colori
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "  ____ _ _            _   ____        _                 "
echo " / ___| (_) ___ _ __ | |_/ ___| _ __ (_)_ __   ___ _ __ "
echo "| |   | | |/ _ \ '_ \| __\___ \| '_ \| | '_ \ / _ \ '__|"
echo "| |___| | |  __/ | | | |_ ___) | | | | | |_) |  __/ |   "
echo " \____|_|_|\___|_| |_|\__|____/|_| |_|_| .__/ \___|_|   "
echo "                                      |_|              "
echo -e "${NC}"
echo -e "${YELLOW}Test SimplifiedSiteAnalyzer${NC}\n"

# Verifica le variabili d'ambiente necessarie
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo -e "${RED}Errore: Variabili d'ambiente Supabase mancanti${NC}"
  echo "Assicurati che NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY siano impostate"
  exit 1
fi

# Verifica che sia fornito un URL
if [ -z "$1" ]; then
  echo -e "${YELLOW}Utilizzo: $0 <url>${NC}"
  echo "Esempio: $0 https://example.com"
  exit 1
fi

URL=$1

# Ottieni token di accesso (richiede login)
echo -e "${BLUE}Verifica credenziali Supabase...${NC}"

TOKEN=$(npx supabase-cli auth token 2>/dev/null)
if [ $? -ne 0 ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}Errore: Impossibile ottenere token Supabase${NC}"
  echo "Esegui prima 'npx supabase login'"
  exit 1
fi

echo -e "${GREEN}✅ Credenziali Supabase OK${NC}"

# Simula ambiente serverless
echo -e "${BLUE}Simulazione ambiente serverless...${NC}"
export VERCEL=1

# Esegui analisi manuale
echo -e "${BLUE}Esecuzione analisi per: ${YELLOW}$URL${NC}"

curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"url\":\"$URL\"}" \
  http://localhost:3000/api/tools/manual-scan > response.json

# Verifica il risultato
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Analisi completata${NC}"
  echo -e "${BLUE}Dettagli salvati in response.json${NC}"
  
  # Estrai il tipo di analisi
  ANALYSIS_TYPE=$(cat response.json | grep -o '"isSimplifiedAnalysis":true' || echo "full")
  
  if [[ "$ANALYSIS_TYPE" == *"true"* ]]; then
    echo -e "${YELLOW}⚡ Analisi semplificata eseguita correttamente${NC}"
  else
    echo -e "${RED}⚠️ L'analisi non è stata rilevata come semplificata${NC}"
  fi
  
  # Mostra punteggio
  SCORE=$(cat response.json | grep -o '"overallScore":[0-9]*' | cut -d':' -f2)
  echo -e "${BLUE}Punteggio: ${YELLOW}$SCORE${NC}"
else
  echo -e "${RED}❌ Analisi fallita${NC}"
fi

# Ripristina ambiente
unset VERCEL
echo -e "\n${GREEN}Test completato!${NC}"
