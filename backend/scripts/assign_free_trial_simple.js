const { supabase } = require('../utils/supabaseClient');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function assignFreeTrial() {
  const userEmail = process.argv[2] || 'mobile.android.tr@gmail.com';
  
  console.log(`🔍 Kullanıcı aranıyor: ${userEmail}\n`);

  // Find user
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('*')
    .eq('email', userEmail)
    .single();

  if (userErr || !user) {
    console.error('❌ Kullanıcı bulunamadı:', userEmail);
    process.exit(1);
  }

  console.log('✅ Kullanıcı bulundu:', {
    id: user.id,
    email: user.email,
    name: `${user.firstname} ${user.lastname}`
  });

  // Get Free Trial plan
  const { data: trialPlan, error: planErr } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('name', 'Free Trial')
    .eq('is_active', true)
    .single();

  if (planErr || !trialPlan) {
    console.error('❌ Free Trial planı bulunamadı');
    process.exit(1);
  }

  console.log('✅ Free Trial planı bulundu:', trialPlan.name);

  // Check existing subscriptions
  const { data: existingSubs } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id);

  if (existingSubs && existingSubs.length > 0) {
    console.log(`\n⚠️  Kullanıcının ${existingSubs.length} mevcut aboneliği var. Siliniyor...\n`);
    
    // Delete all existing subscriptions
    const { error: deleteErr } = await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', user.id);
    
    if (deleteErr) {
      console.error('❌ Mevcut abonelikler silinirken hata:', deleteErr);
      process.exit(1);
    }
    
    console.log('✅ Mevcut abonelikler silindi\n');
  }

  // Assign Free Trial
  const { data: newSub, error: insertErr } = await supabase
    .from('subscriptions')
    .insert([{
      user_id: user.id,
      plantype: 'Free Trial',
      status: 'active',
      audio_creation_count: 0,
      startdate: new Date().toISOString(),
      enddate: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select();

  if (insertErr) {
    console.error('❌ Abonelik oluşturulurken hata:', insertErr);
    process.exit(1);
  }

  console.log('✅ Free Trial planı başarıyla atandı!');
  console.log('   Kullanıcı:', user.email);
  console.log('   Plan:', trialPlan.name);
  console.log('   Durum: active');
  console.log('   Ses oluşturma hakkı: 3');
  console.log('\n✨ İşlem tamamlandı!');
  process.exit(0);
}

assignFreeTrial().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
