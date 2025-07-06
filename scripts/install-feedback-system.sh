#!/bin/bash

# Script per installare il sistema di feedback su Supabase
# Questo script esegue il file feedback-system.sql sul database Supabase
# Da eseguire: ./install-feedback-system.sh

set -e

echo "🚀 Installazione sistema feedback TrovaMi..."

# Verifica che il file SQL esista
if [ ! -f "database/feedback-system.sql" ]; then
    echo "❌ File database/feedback-system.sql non trovato!"
    exit 1
fi

echo "📂 File SQL trovato: database/feedback-system.sql"

# Verifica variabili di ambiente per Supabase
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ Variabile SUPABASE_DB_URL non impostata!"
    echo "💡 Impostala con: export SUPABASE_DB_URL='postgresql://postgres:[password]@[host]:5432/postgres'"
    exit 1
fi

echo "🔍 Connessione al database Supabase..."

# Esegui il file SQL
psql "$SUPABASE_DB_URL" -f database/feedback-system.sql

if [ $? -eq 0 ]; then
    echo "✅ Sistema feedback installato con successo!"
    echo ""
    echo "📋 Sono state create:"
    echo "   - Tabella feedback_reports"
    echo "   - Indici per performance"
    echo "   - Policy RLS per sicurezza"
    echo "   - Funzioni RPC per API"
    echo ""
    echo "🎯 Ora puoi utilizzare il sistema feedback nell'applicazione!"
else
    echo "❌ Errore durante l'installazione!"
    exit 1
fi
