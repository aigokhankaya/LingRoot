const { supabase } = require('../utils/supabaseClient');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkAndFixFreeTrial() {
  console.log('🔍 Checking Free Trial plan...\n');

  // 1. Check if Free Trial plan exists
  const { data: trialPlan, error: planErr } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('name', 'Free Trial')
    .eq('is_active', true)
    .maybeSingle();

  if (planErr) {
    console.error('❌ Error checking Free Trial plan:', planErr);
    return;
  }

  if (!trialPlan) {
    console.log('⚠️  Free Trial plan not found. Creating it...\n');
    
    // Create Free Trial plan
    const { data: newPlan, error: createErr } = await supabase
      .from('subscription_plans')
      .insert([{
        name: 'Free Trial',
        description: 'Ücretsiz deneme paketi - 3 ses oluşturma hakkı (her biri 10 dk)',
        price: 0,
        interval: 'trial',
        features: [
          "TR: 3 ses oluşturma hakkı",
          "EN: 3 audio creation credits",
          "TR: Her ses maksimum 10 dakika",
          "EN: Each audio up to 10 minutes",
          "TR: Tüm CEFR seviyeleri",
          "EN: All CEFR levels",
          "TR: Kelime ekleme",
          "EN: Vocabulary addition"
        ],
        is_active: true,
        is_trial: true,
        trial_days: 999,
        monthly_cost_limit_usd: 0,
        openai_token_limit: 30000,
        tts_char_limit: 30000,
        apple_product_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (createErr) {
      console.error('❌ Error creating Free Trial plan:', createErr);
      return;
    }

    console.log('✅ Free Trial plan created:', newPlan);
    console.log('\n');
  } else {
    console.log('✅ Free Trial plan exists:', trialPlan);
    console.log('\n');
  }

  // 2. Find all users
  const { data: allUsers, error: usersErr } = await supabase
    .from('users')
    .select('id, email, firstname, lastname, created_at');

  if (usersErr) {
    console.error('❌ Error finding users:', usersErr);
    return;
  }

  // Get the Free Trial plan ID
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('id')
    .eq('name', 'Free Trial')
    .eq('is_active', true)
    .single();

  if (!plan) {
    console.error('❌ Free Trial plan not found');
    return;
  }

  // Check each user for existing subscription
  const usersWithoutSub = [];
  
  for (const user of allUsers) {
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!existingSub) {
      usersWithoutSub.push(user);
    }
  }

  console.log(`📊 Found ${usersWithoutSub.length} users without subscription\n`);

  if (usersWithoutSub.length > 0) {
    console.log('🔧 Assigning Free Trial plan to users without subscription...\n');

    for (const user of usersWithoutSub) {
      try {
        const { error: insertErr } = await supabase
          .from('subscriptions')
          .insert([{
            user_id: user.id,
            plan_id: plan.id,
            status: 'active',
            current_period_end: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString(),
            cancel_at_period_end: false,
            audio_creation_count: 0,
          }]);

        if (insertErr) {
          console.error(`❌ Failed to assign plan to user ${user.email}:`, insertErr);
        } else {
          console.log(`✅ Free Trial plan assigned to: ${user.email} (${user.firstname} ${user.lastname})`);
        }
      } catch (e) {
        console.error(`❌ Error assigning plan to user ${user.email}:`, e.message);
      }
    }
  } else {
    console.log('✅ All users already have subscriptions');
  }

  console.log('\n✨ Done!');
  process.exit(0);
}

checkAndFixFreeTrial().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
