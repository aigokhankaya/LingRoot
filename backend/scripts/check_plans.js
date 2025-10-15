// Script to check current subscription plans in database
const { supabase } = require('../utils/supabaseClient');

async function checkPlans() {
  try {
    console.log('🔍 Fetching subscription plans from database...\n');
    
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching plans:', error);
      return;
    }
    
    if (!plans || plans.length === 0) {
      console.log('⚠️  No active plans found in database');
      return;
    }
    
    console.log(`✅ Found ${plans.length} active plan(s):\n`);
    console.log('='.repeat(100));
    
    plans.forEach((plan, index) => {
      console.log(`\n📦 Plan ${index + 1}: ${plan.name}`);
      console.log('-'.repeat(100));
      console.log(`  ID:                    ${plan.id}`);
      console.log(`  Description:           ${plan.description || 'N/A'}`);
      console.log(`  Price:                 ₺${plan.price}`);
      console.log(`  Interval:              ${plan.interval}`);
      console.log(`  Is Trial:              ${plan.is_trial ? 'Yes' : 'No'}`);
      console.log(`  Trial Days:            ${plan.trial_days || 'N/A'}`);
      console.log('');
      console.log('  📊 LIMITS:');
      console.log(`  - Monthly Cost (USD):  ${plan.monthly_cost_limit_usd !== null ? '$' + plan.monthly_cost_limit_usd : 'Unlimited'}`);
      console.log(`  - OpenAI Tokens:       ${plan.openai_token_limit !== null ? plan.openai_token_limit.toLocaleString() : 'Unlimited'}`);
      console.log(`  - TTS Characters:      ${plan.tts_char_limit !== null ? plan.tts_char_limit.toLocaleString() : 'Unlimited'}`);
      console.log('');
      console.log('  🍎 APPLE IAP:');
      console.log(`  - Product ID:          ${plan.apple_product_id || 'Not set'}`);
      console.log('');
      console.log('  ✨ FEATURES:');
      if (plan.features && Array.isArray(plan.features)) {
        plan.features.forEach(feature => {
          console.log(`     - ${feature}`);
        });
      } else {
        console.log('     No features listed');
      }
      console.log('');
      console.log(`  📅 Created:            ${new Date(plan.created_at).toLocaleString('tr-TR')}`);
      console.log(`  📅 Updated:            ${new Date(plan.updated_at).toLocaleString('tr-TR')}`);
    });
    
    console.log('\n' + '='.repeat(100));
    console.log('\n✅ Plan check completed!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkPlans();
