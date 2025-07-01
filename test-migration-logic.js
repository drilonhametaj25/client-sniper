/**
 * Script di test per simulare la migrazione del database
 * Verifica la logica di deduplicazione senza modificare i dati reali
 * 
 * Uso: node test-migration-logic.js
 */

const fs = require('fs');
const path = require('path');

// Simulazione dati di test
const testLeads = [
  {
    id: '1',
    business_name: 'Pizzeria Mario',
    city: 'Milano',
    website_url: 'https://pizzeriamario.it',
    source: 'google_maps',
    unique_key: 'gmaps_1234',
    created_at: '2024-01-01'
  },
  {
    id: '2', 
    business_name: 'Pizzeria Mario',
    city: 'Milano',
    website_url: 'https://www.pizzeriamario.it',
    source: 'manual_scan',
    unique_key: 'manual_5678',
    created_at: '2024-01-02'
  },
  {
    id: '3',
    business_name: 'Pizza Mario',
    city: 'Milano', 
    phone: '+39 02 1234567',
    source: 'pagine_gialle',
    unique_key: 'pg_9999',
    created_at: '2024-01-03'
  },
  {
    id: '4',
    business_name: 'Ristorante Giuseppe',
    city: 'Roma',
    website_url: 'https://giuseppe.com',
    source: 'google_maps',
    unique_key: 'gmaps_4444',
    created_at: '2024-01-04'
  }
];

function generateUniversalKey(business_name, city) {
  const key = 'universal_' + 
    (business_name + '_' + (city || 'unknown'))
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_');
  return key;
}

function normalizeWebsiteDomain(url) {
  if (!url) return null;
  const match = url.match(/https?:\/\/(?:www\.)?([^\/]+)/);
  return match ? match[1] : null;
}

function normalizePhone(phone) {
  if (!phone) return null;
  return phone.replace(/[^\d]/g, '');
}

function testMigrationLogic() {
  console.log('🔄 Simulazione migrazione unified lead deduplication...\n');
  
  // Step 1: Genera nuove unique_key
  console.log('1️⃣  Generazione unique_key universali:');
  const leadsWithNewKeys = testLeads.map(lead => {
    const newKey = generateUniversalKey(lead.business_name, lead.city);
    console.log(`   ${lead.id}: ${lead.unique_key} → ${newKey}`);
    return { ...lead, new_unique_key: newKey };
  });
  
  // Step 2: Identifica duplicati
  console.log('\n2️⃣  Identificazione duplicati:');
  const keyGroups = {};
  leadsWithNewKeys.forEach(lead => {
    if (!keyGroups[lead.new_unique_key]) {
      keyGroups[lead.new_unique_key] = [];
    }
    keyGroups[lead.new_unique_key].push(lead);
  });
  
  const duplicateGroups = Object.entries(keyGroups).filter(([key, leads]) => leads.length > 1);
  
  if (duplicateGroups.length === 0) {
    console.log('   ✅ Nessun duplicato trovato');
  } else {
    duplicateGroups.forEach(([key, leads]) => {
      console.log(`   🔍 Duplicati per key "${key}":`);
      leads.forEach(lead => {
        console.log(`      - ID: ${lead.id}, Source: ${lead.source}, Created: ${lead.created_at}`);
      });
    });
  }
  
  // Step 3: Simula merge
  console.log('\n3️⃣  Simulazione merge duplicati:');
  const mergedLeads = [];
  const mergeLog = [];
  
  Object.entries(keyGroups).forEach(([key, leads]) => {
    if (leads.length === 1) {
      // Nessun duplicato, mantieni il lead
      mergedLeads.push({
        ...leads[0],
        sources: [leads[0].source]
      });
    } else {
      // Ha duplicati, fai merge
      const sortedLeads = leads.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const primaryLead = sortedLeads[0];
      const duplicateLeads = sortedLeads.slice(1);
      
      // Merge dei dati
      const mergedLead = {
        ...primaryLead,
        sources: leads.map(l => l.source),
        website_url: leads.find(l => l.website_url)?.website_url || primaryLead.website_url,
        phone: leads.find(l => l.phone)?.phone || primaryLead.phone,
        email: leads.find(l => l.email)?.email || primaryLead.email,
        score: Math.max(...leads.map(l => l.score || 0))
      };
      
      mergedLeads.push(mergedLead);
      
      mergeLog.push({
        primary_id: primaryLead.id,
        merged_ids: duplicateLeads.map(l => l.id),
        key: key
      });
      
      console.log(`   🔄 Merged ${duplicateLeads.length} duplicates into lead ${primaryLead.id}`);
      console.log(`      Sources: ${mergedLead.sources.join(', ')}`);
    }
  });
  
  // Step 4: Test advanced matching
  console.log('\n4️⃣  Test matching avanzato (cross-source):');
  
  for (let i = 0; i < mergedLeads.length; i++) {
    for (let j = i + 1; j < mergedLeads.length; j++) {
      const lead1 = mergedLeads[i];
      const lead2 = mergedLeads[j];
      
      // Test match per dominio
      const domain1 = normalizeWebsiteDomain(lead1.website_url);
      const domain2 = normalizeWebsiteDomain(lead2.website_url);
      
      if (domain1 && domain2 && domain1 === domain2) {
        console.log(`   🌐 Website match: ${lead1.id} ↔ ${lead2.id} (${domain1})`);
      }
      
      // Test match per telefono
      const phone1 = normalizePhone(lead1.phone);
      const phone2 = normalizePhone(lead2.phone);
      
      if (phone1 && phone2 && phone1 === phone2) {
        console.log(`   📞 Phone match: ${lead1.id} ↔ ${lead2.id} (${phone1})`);
      }
      
      // Test similarità nome (semplificata)
      if (lead1.city === lead2.city) {
        const name1 = lead1.business_name.toLowerCase();
        const name2 = lead2.business_name.toLowerCase();
        
        // Calcolo similarità semplice (Jaccard)
        const words1 = new Set(name1.split(/\s+/));
        const words2 = new Set(name2.split(/\s+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        const similarity = intersection.size / union.size;
        
        if (similarity > 0.6) {
          console.log(`   📝 Name similarity: ${lead1.id} ↔ ${lead2.id} (${(similarity * 100).toFixed(1)}%)`);
        }
      }
    }
  }
  
  // Step 5: Statistiche finali
  console.log('\n5️⃣  Statistiche finali:');
  console.log(`   📊 Lead originali: ${testLeads.length}`);
  console.log(`   📊 Lead dopo merge: ${mergedLeads.length}`);
  console.log(`   📊 Operazioni di merge: ${mergeLog.length}`);
  console.log(`   📊 Lead con fonti multiple: ${mergedLeads.filter(l => l.sources.length > 1).length}`);
  
  const sourceStats = {};
  mergedLeads.forEach(lead => {
    lead.sources.forEach(source => {
      sourceStats[source] = (sourceStats[source] || 0) + 1;
    });
  });
  
  console.log('\n   📈 Statistiche per fonte:');
  Object.entries(sourceStats).forEach(([source, count]) => {
    console.log(`      ${source}: ${count} leads`);
  });
  
  return {
    originalCount: testLeads.length,
    finalCount: mergedLeads.length,
    mergedCount: mergeLog.length,
    mergedLeads,
    mergeLog
  };
}

// Esegui il test
if (require.main === module) {
  const result = testMigrationLogic();
  
  console.log('\n✅ Test completato con successo!');
  console.log('\n💡 Per applicare la migrazione reale:');
  console.log('   psql -d your_database -f database/unified-lead-deduplication.sql');
}

module.exports = { testMigrationLogic };
