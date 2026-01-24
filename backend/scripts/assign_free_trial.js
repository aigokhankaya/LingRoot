// Script to assign Free Trial to a specific user
// Usage: node backend/scripts/assign_free_trial.js mobile.androdi.tr@gmail.com

require('dotenv').config();
const { supabase } = require('../utils/storage/supabaseClient.js');

async function assignFreeTrial(email) {
  try {
    console.log(`🔍 Looking for user: ${email}`);

    // 1. Find user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (userError || !user) {
      console.error('❌ User not found:', userError?.message);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email} (${user.id})`);

    // 2. Get Free Trial plan
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('id, name')
      .eq('name', 'Free Trial')
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      console.error('❌ Free Trial plan not found:', planError?.message);
      process.exit(1);
    }

    console.log(`✅ Found plan: ${plan.name} (${plan.id})`);

    // 3. Check existing subscription
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id, status, audio_creation_count')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSub) {
      console.log(`📝 Updating existing subscription: ${existingSub.id}`);
      console.log(`   Current status: ${existingSub.status}`);
      console.log(`   Current audio count: ${existingSub.audio_creation_count || 0}`);

      // Update existing subscription
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          plan_id: plan.id,
          status: 'active',
          audio_creation_count: 0, // Reset to 0
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSub.id);

      if (updateError) {
        console.error('❌ Error updating subscription:', updateError.message);
        process.exit(1);
      }

      console.log('✅ Subscription updated successfully');
    } else {
      console.log('📝 Creating new subscription');

      // Create new subscription
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          status: 'active',
          audio_creation_count: 0,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('❌ Error creating subscription:', insertError.message);
        process.exit(1);
      }

      console.log('✅ Subscription created successfully');
    }

    // 4. Verify final state
    const { data: finalSub } = await supabase
      .from('subscriptions')
      .select(`
        id,
        status,
        audio_creation_count,
        current_period_start,
        current_period_end,
        plan:subscription_plans(name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    console.log('\n🎉 Free Trial assigned successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`User: ${email}`);
    console.log(`Plan: ${finalSub.plan?.name || 'Free Trial'}`);
    console.log(`Status: ${finalSub.status}`);
    console.log(`Audio Credits: ${finalSub.audio_creation_count || 0} / 3`);
    console.log(`Valid Until: ${new Date(finalSub.current_period_end).toLocaleDateString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('❌ Usage: node assign_free_trial.js <email>');
  console.error('   Example: node assign_free_trial.js mobile.androdi.tr@gmail.com');
  process.exit(1);
}

assignFreeTrial(email);
