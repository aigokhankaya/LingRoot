const { supabase } = require('../utils/supabaseClient');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function assignFreeTrial() {
  // Get user email from command line argument
  const userEmail = process.argv[2];
  
  if (!userEmail) {
    console.error('❌ Kullanım: node assign_free_trial_to_user.js <email>');
    process.exit(1);
  }

  console.log(`🔍 Kullanıcı aranıyor: ${userEmail}\n`);

  // Find user by email
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('*')
    .eq('email', userEmail)
    .maybeSingle();

  if (userErr) {
    console.error('❌ Kullanıcı sorgulanırken hata:', userErr);
    process.exit(1);
  }

  if (!user) {
    console.error('❌ Kullanıcı bulunamadı:', userEmail);
    process.exit(1);
  }

  console.log('✅ Kullanıcı bulundu:', {
    id: user.id,
    email: user.email,
    name: `${user.firstname} ${user.lastname}`
  });
  console.log('\n');

  // Check if user already has a subscription
  const { data: existingSub, error: subCheckErr } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (subCheckErr) {
    console.error('❌ Abonelik sorgulanırken hata:', subCheckErr);
    process.exit(1);
  }

  if (existingSub) {
    console.log('⚠️  Kullanıcının zaten bir aboneliği var:');
    console.log('   Plan ID:', existingSub.plan_id);
    console.log('   Durum:', existingSub.status);
    console.log('   Ses oluşturma sayısı:', existingSub.audio_creation_count || 0);
    console.log('\n');
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('Mevcut aboneliği silip Free Trial atamak ister misiniz? (evet/hayır): ', async (answer) => {
      readline.close();
      
      if (answer.toLowerCase() !== 'evet') {
        console.log('❌ İşlem iptal edildi');
        process.exit(0);
      }
      
      // Delete existing subscription
      const { error: deleteErr } = await supabase
        .from('subscriptions')
        .delete()
        .eq('user_id', user.id);
      
      if (deleteErr) {
        console.error('❌ Mevcut abonelik silinirken hata:', deleteErr);
        process.exit(1);
      }
      
      console.log('✅ Mevcut abonelik silindi\n');
      await assignPlan(user);
    });
  } else {
    await assignPlan(user);
  }
}

async function assignPlan(user) {
  // Get Free Trial plan
  const { data: trialPlan, error: planErr } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('name', 'Free Trial')
    .eq('is_active', true)
    .maybeSingle();

  if (planErr) {
    console.error('❌ Free Trial planı sorgulanırken hata:', planErr);
    process.exit(1);
  }

  if (!trialPlan) {
    console.error('❌ Free Trial planı bulunamadı');
    process.exit(1);
  }

  console.log('✅ Free Trial planı bulundu:', trialPlan.name);
  console.log('\n');

  // Assign Free Trial plan
  const { data: newSub, error: insertErr } = await supabase
    .from('subscriptions')
    .insert([{
      user_id: user.id,
      plan_id: trialPlan.id,
      status: 'active',
      current_period_end: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString(),
      cancel_at_period_end: false,
      audio_creation_count: 0,
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
