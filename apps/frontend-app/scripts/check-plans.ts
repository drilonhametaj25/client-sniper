// Script per verificare e popolare la tabella plans se necessario

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkAndSetupPlans() {
  console.log('🔍 Verificando tabella plans...')

  try {
    // Verifica se esistono già i piani
    const { data: existingPlans, error: queryError } = await supabase
      .from('plans')
      .select('*')

    if (queryError) {
      console.error('❌ Errore query tabella plans:', queryError)
      console.log('📝 Probabilmente la tabella non esiste ancora')
      return
    }

    console.log('✅ Tabella plans trovata')
    console.log('📋 Piani esistenti:', existingPlans)

    // Piani che dovrebbero esistere
    const requiredPlans = [
      { name: 'free', price_monthly: 0, max_credits: 2 },
      { name: 'starter', price_monthly: 19, max_credits: 25 },
      { name: 'pro', price_monthly: 49, max_credits: 100 }
    ]

    for (const plan of requiredPlans) {
      const existingPlan = existingPlans.find(p => p.name === plan.name)
      
      if (!existingPlan) {
        console.log(`➕ Inserendo piano mancante: ${plan.name}`)
        
        const { error: insertError } = await supabase
          .from('plans')
          .insert(plan)

        if (insertError) {
          console.error(`❌ Errore inserimento piano ${plan.name}:`, insertError)
        } else {
          console.log(`✅ Piano ${plan.name} inserito con successo`)
        }
      } else {
        console.log(`✅ Piano ${plan.name} già presente:`, {
          price: existingPlan.price_monthly,
          credits: existingPlan.max_credits
        })
        
        // Controlla se ha i crediti corretti
        if (existingPlan.max_credits !== plan.max_credits) {
          console.log(`🔧 Aggiornando crediti per piano ${plan.name}: ${existingPlan.max_credits} → ${plan.max_credits}`)
          
          const { error: updateError } = await supabase
            .from('plans')
            .update({ max_credits: plan.max_credits })
            .eq('name', plan.name)

          if (updateError) {
            console.error(`❌ Errore aggiornamento crediti ${plan.name}:`, updateError)
          } else {
            console.log(`✅ Crediti aggiornati per piano ${plan.name}`)
          }
        }
      }
    }

    // Verifica finale
    const { data: finalPlans, error: finalError } = await supabase
      .from('plans')
      .select('*')
      .order('price_monthly')

    if (finalError) {
      console.error('❌ Errore verifica finale:', finalError)
    } else {
      console.log('\n🎯 PIANI FINALI:')
      finalPlans.forEach(plan => {
        console.log(`  ${plan.name}: €${plan.price_monthly}/mese - ${plan.max_credits} crediti`)
      })
    }

  } catch (error) {
    console.error('❌ Errore durante setup piani:', error)
  }
}

checkAndSetupPlans()
