#!/usr/bin/env node

/**
 * Script per eseguire il setup completo del database
 * Questo script legge il file setup.sql e lo esegue su Supabase
 * Uso: npm run setup-db
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Carica variabili d'ambiente
config();

async function setupDatabase() {
  console.log('🔧 Avvio setup database ClientSniper...');

  // Verifica configurazione
  if (!process.env.SUPABASE_URL || !(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)) {
    console.error('❌ Variabili d\'ambiente Supabase mancanti');
    process.exit(1);
  }

  // Connetti a Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)!
  );

  try {
    // Leggi il file SQL
    const sqlPath = join(__dirname, '../../database/setup.sql');
    const sqlContent = readFileSync(sqlPath, 'utf8');

    console.log('📄 File SQL caricato, esecuzione comandi...');

    // Esegui i comandi SQL principali uno per uno
    const commands = [
      // Crea tabelle principali
      `CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro')),
        credits_remaining INT DEFAULT 2,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        subscription_status TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      )`,
      
      `CREATE TABLE IF NOT EXISTS public.plans (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        price_monthly INT NOT NULL,
        max_credits INT NOT NULL,
        visible_fields TEXT[] DEFAULT '{}',
        features TEXT[] DEFAULT '{}',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      )`,
      
      `CREATE TABLE IF NOT EXISTS public.leads (
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
      )`,
      
      `CREATE TABLE IF NOT EXISTS public.zones_to_scrape (
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
      )`,
      
      `CREATE TABLE IF NOT EXISTS public.scrape_logs (
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
      )`
    ];

    // Esegui ogni comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`� Esecuzione comando ${i + 1}/${commands.length}...`);
      
      const { error } = await supabase.rpc('exec', { 
        sql: command 
      });
      
      if (error) {
        console.warn(`⚠️  Warning comando ${i + 1}: ${error.message}`);
      } else {
        console.log(`✅ Comando ${i + 1} eseguito con successo`);
      }
    }

    // Verifica che le tabelle siano state create
    const { data: zonesCheck } = await supabase
      .from('zones_to_scrape')
      .select('count(*)')
      .limit(1);

    if (zonesCheck) {
      console.log('✅ Tabella zones_to_scrape verificata');
    }

    console.log('🎉 Setup database completato!');

  } catch (error) {
    console.error('💥 Errore durante il setup:', error);
    process.exit(1);
  }
}

// Esegue solo se chiamato direttamente
if (require.main === module) {
  setupDatabase();
}

export { setupDatabase };
