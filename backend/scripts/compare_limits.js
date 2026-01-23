// Script to compare Gold vs Platinum limits calculation
const { supabase } = require('../utils/storage/supabaseClient.js');

async function compareLimits() {
  try {
    console.log('🔍 Comparing Gold vs Platinum limit calculations...\n');
    
    // Get plans
    const { data: plans } = await supabase
      .from('subscription_plans')
      .select('*')
      .in('name', ['Gold Plan', 'Platin Plan'])
      .order('price', { ascending: true });
    
    if (!plans || plans.length < 2) {
      console.log('❌ Could not find both plans');
      return;
    }
    
    const goldPlan = plans.find(p => p.name.toLowerCase().includes('gold'));
    const platinPlan = plans.find(p => p.name.toLowerCase().includes('platin'));
    
    console.log('📦 GOLD PLAN');
    console.log('='.repeat(80));
    console.log(`Price (TRY):              ₺${goldPlan.price}`);
    console.log(`TTS Char Limit (DB):      ${goldPlan.tts_char_limit || 'NULL (Unlimited)'}`);
    console.log(`OpenAI Token Limit (DB):  ${goldPlan.openai_token_limit || 'NULL (Unlimited)'}`);
    console.log(`Monthly USD Limit (DB):   ${goldPlan.monthly_cost_limit_usd || 'NULL (Unlimited)'}`);
    console.log('');
    
    // Hesaplanan USD budget (1/3 rule)
    const usdTryRate = 40; // Varsayılan kur
    const goldUsdBudget = Number(((goldPlan.price / usdTryRate) / 3).toFixed(2));
    console.log('💰 COMPUTED USD BUDGET (1/3 rule):');
    console.log(`Formula: (₺${goldPlan.price} / ${usdTryRate}) / 3 = $${goldUsdBudget}`);
    console.log('');
    
    // Her kategori için kalan karakter hesapla
    const COST_PER_1K = {
      standard: 0.004,
      neural2: 0.016,
      wavenet: 0.004,
      studio: 0.16,
      chirp3d: 0.03,
    };
    
    console.log('📊 REMAINING CHARACTERS BY CATEGORY (if $0 used):');
    Object.entries(COST_PER_1K).forEach(([cat, cost]) => {
      const remainingChars = Math.floor((goldUsdBudget * 1000) / cost);
      const videoMinutes = Math.floor(remainingChars / 1000);
      const pages = Math.floor(remainingChars / 2000);
      console.log(`  ${cat.padEnd(10)}: ${remainingChars.toLocaleString()} chars (~${videoMinutes} min, ~${pages} pages)`);
    });
    
    console.log('\n\n📦 PLATINUM PLAN');
    console.log('='.repeat(80));
    console.log(`Price (TRY):              ₺${platinPlan.price}`);
    console.log(`TTS Char Limit (DB):      ${platinPlan.tts_char_limit || 'NULL (Unlimited)'}`);
    console.log(`OpenAI Token Limit (DB):  ${platinPlan.openai_token_limit || 'NULL (Unlimited)'}`);
    console.log(`Monthly USD Limit (DB):   ${platinPlan.monthly_cost_limit_usd || 'NULL (Unlimited)'}`);
    console.log('');
    
    const platinUsdBudget = Number(((platinPlan.price / usdTryRate) / 3).toFixed(2));
    console.log('💰 COMPUTED USD BUDGET (1/3 rule):');
    console.log(`Formula: (₺${platinPlan.price} / ${usdTryRate}) / 3 = $${platinUsdBudget}`);
    console.log('');
    
    console.log('📊 REMAINING CHARACTERS BY CATEGORY (if $0 used):');
    Object.entries(COST_PER_1K).forEach(([cat, cost]) => {
      const remainingChars = Math.floor((platinUsdBudget * 1000) / cost);
      const videoMinutes = Math.floor(remainingChars / 1000);
      const pages = Math.floor(remainingChars / 2000);
      console.log(`  ${cat.padEnd(10)}: ${remainingChars.toLocaleString()} chars (~${videoMinutes} min, ~${pages} pages)`);
    });
    
    console.log('\n\n🔍 COMPARISON');
    console.log('='.repeat(80));
    console.log(`Gold USD Budget:     $${goldUsdBudget}`);
    console.log(`Platinum USD Budget: $${platinUsdBudget}`);
    console.log(`Difference:          $${(platinUsdBudget - goldUsdBudget).toFixed(2)} (${Math.round((platinUsdBudget / goldUsdBudget - 1) * 100)}% more)`);
    console.log('');
    
    // Standard kategorisi için karşılaştırma
    const goldStandardChars = Math.floor((goldUsdBudget * 1000) / COST_PER_1K.standard);
    const platinStandardChars = Math.floor((platinUsdBudget * 1000) / COST_PER_1K.standard);
    console.log('Standard Voice Category:');
    console.log(`  Gold:     ${goldStandardChars.toLocaleString()} chars (~${Math.floor(goldStandardChars / 1000)} min)`);
    console.log(`  Platinum: ${platinStandardChars.toLocaleString()} chars (~${Math.floor(platinStandardChars / 1000)} min)`);
    console.log(`  Diff:     ${(platinStandardChars - goldStandardChars).toLocaleString()} chars (~${Math.floor((platinStandardChars - goldStandardChars) / 1000)} min more)`);
    
    console.log('\n✅ Comparison completed!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

compareLimits();
