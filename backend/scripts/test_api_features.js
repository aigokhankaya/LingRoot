// Test script to check what API returns for mobile.android.tr@gmail.com
// Run: node backend/scripts/test_api_features.js

const { supabase } = require("../utils/supabaseClient");

async function testUserFeatures() {
  const email = 'mobile.android.tr@gmail.com';
  
  console.log('🔍 Testing API features for:', email);
  console.log('='.repeat(60));
  
  // 1. Get user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email)
    .single();
    
  if (userError || !user) {
    console.error('❌ User not found:', userError);
    return;
  }
  
  console.log('✅ User found:', user.id);
  
  // 2. Get active subscription
  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .select("stripepriceid, status, plantype")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
    
  if (subError || !subscription) {
    console.error('❌ No active subscription:', subError);
    return;
  }
  
  console.log('✅ Active subscription:', subscription.plantype);
  console.log('   Plan ID:', subscription.stripepriceid);
  
  // 3. Get plan features
  const planId = subscription.stripepriceid;
  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select("id, name, plan_features")
    .eq("id", planId)
    .single();
    
  if (planError || !plan) {
    console.error('❌ Plan not found:', planError);
    return;
  }
  
  console.log('✅ Plan found:', plan.name);
  console.log('\n📋 Plan Features:');
  console.log(JSON.stringify(plan.plan_features, null, 2));
  
  console.log('\n🏠 Homepage Features:');
  const homepageFeatures = plan.plan_features?.homepage_features || {};
  Object.entries(homepageFeatures).forEach(([key, value]) => {
    const icon = value ? '✅' : '❌';
    console.log(`   ${icon} ${key}: ${value}`);
  });
  
  console.log('\n🎤 Voice Categories:');
  const voiceCategories = plan.plan_features?.voice_categories || {};
  Object.entries(voiceCategories).forEach(([key, value]) => {
    const icon = value ? '✅' : '❌';
    console.log(`   ${icon} ${key}: ${value}`);
  });
}

testUserFeatures().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
