const { supabase } = require('./utils/storage/supabaseClient.js');

async function getPlanDetails() {
  try {
    console.log("Fetching Gold and Platin plan details...\n");
    
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .or("name.ilike.%gold%,name.ilike.%platin%")
      .order("price", { ascending: true });
    
    if (error) {
      console.error("❌ Error:", error.message);
      return;
    }
    
    console.log(`✅ Found ${data.length} plans:\n`);
    data.forEach(plan => {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`📦 ${plan.name}`);
      console.log(`   Product ID: ${plan.apple_product_id || '(not set)'}`);
      console.log(`   Price: ${plan.price} TRY`);
      console.log(`   Interval: ${plan.interval}`);
      console.log(`   Description: ${(plan.description || '').substring(0, 100)}...`);
      console.log(`   Active: ${plan.is_active ? 'Yes' : 'No'}`);
      console.log(`   Trial: ${plan.is_trial ? 'Yes' : 'No'}`);
      console.log("");
    });
    
    console.log("\n📋 GOOGLE PLAY CONSOLE IÇIN BİLGİLER:\n");
    data.forEach(plan => {
      console.log(`\n=== ${plan.name.toUpperCase()} ===`);
      console.log(`Ürün Kimliği: ${plan.apple_product_id}`);
      console.log(`Ad (Türkçe): ${plan.name}`);
      console.log(`Açıklama (Türkçe): ${(plan.description || '').split('|')[0]?.trim() || plan.description}`);
      console.log(`Fiyat: ${plan.price} TRY`);
      console.log(`Dönem: ${plan.interval === 'monthly' ? 'Aylık' : plan.interval}`);
    });
    
  } catch (e) {
    console.error("❌ Error:", e.message);
  }
}

getPlanDetails();
