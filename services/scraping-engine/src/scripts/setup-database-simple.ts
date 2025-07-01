#!/usr/bin/env node

/**
 * Script semplificato per il setup del database
 * Fornisce istruzioni per l'esecuzione manuale tramite dashboard Supabase
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Carica variabili d'ambiente
config();

async function setupDatabase() {
  console.log('🔧 Verifica setup database ClientSniper...');

  // Verifica configurazione
  if (!process.env.SUPABASE_URL || !(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)) {
    console.error('❌ Variabili d\'ambiente Supabase mancanti');
    process.exit(1);
  }

  // Connetti a Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // Verifichiamo se la tabella zones_to_scrape esiste già
    try {
      const { data: testZones } = await supabase
        .from('zones_to_scrape')
        .select('count(*)')
        .limit(1);
      
      if (testZones !== null) {
        console.log('✅ Database già configurato correttamente!');
        console.log('🎯 Ora puoi eseguire: npm run seed');
        return;
      }
    } catch (err) {
      console.log('🔧 Tabelle non trovate, è necessario crearle...');
    }

    // Se arriviamo qui, significa che le tabelle non esistono
    console.log('');
    console.log('📋 ISTRUZIONI PER IL SETUP:');
    console.log('');
    console.log('1. Vai al dashboard Supabase:');
    console.log('   https://app.supabase.com/project/qoguevatzujrorgmqnfo/editor');
    console.log('');
    console.log('2. Clicca su "SQL Editor"');
    console.log('');
    console.log('3. Incolla e esegui questo SQL:');
    console.log('');
    console.log('-- Tabella zone di scraping --');
    console.log(`CREATE TABLE public.zones_to_scrape (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  category TEXT NOT NULL,
  location_name TEXT NOT NULL,
  geohash TEXT,
  bounding_box JSONB,
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  score INT DEFAULT 100 CHECK (score >= 0 AND score <= 1000),
  is_scraping_now BOOLEAN DEFAULT false,
  times_scraped INT DEFAULT 0,
  total_leads_found INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(source, category, location_name)
);`);
    console.log('');
    console.log('-- Tabella leads --');
    console.log(`CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unique_key TEXT UNIQUE NOT NULL,
  content_hash TEXT NOT NULL,
  source TEXT NOT NULL,
  business_name TEXT,
  website_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  category TEXT,
  description TEXT,
  raw_data JSONB DEFAULT '{}',
  analysis JSONB DEFAULT '{}',
  score INT DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);`);
    console.log('');
    console.log('-- Tabella log scraping --');
    console.log(`CREATE TABLE public.scrape_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES zones_to_scrape(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  category TEXT NOT NULL,
  location_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  start_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INT,
  leads_found INT DEFAULT 0,
  leads_new INT DEFAULT 0,
  leads_updated INT DEFAULT 0,
  error_message TEXT,
  error_log JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);`);
    console.log('');
    console.log('4. Dopo aver eseguito il SQL, torna qui e lancia:');
    console.log('   npm run seed');
    console.log('');

  } catch (error) {
    console.error('💥 Errore durante la verifica:', error);
    process.exit(1);
  }
}

// Esegue solo se chiamato direttamente
if (require.main === module) {
  setupDatabase();
}

export { setupDatabase };
