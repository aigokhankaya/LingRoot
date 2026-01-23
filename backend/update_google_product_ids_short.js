const { supabase } = require('./utils/storage/supabaseClient.js');

async function updateProductIds() {
  try {
    console.log("Updating only Platinum Plan Google Play Product ID...\n");
    
    // Gold Plan stays the same: com.nsyzk.lingrootmobile.gold.monthly
    console.log("✅ Gold Plan (no change):");
    console.log("   com.nsyzk.lingrootmobile.gold.monthly (38 chars)\n");
    
    // Update Platinum Plan only
    const { data: platin, error: platinError } = await supabase
      .from("subscription_plans")
      .update({ google_product_id: 'com.nsyzk.lingroot.platinum.monthly' })
      .ilike("name", "%platin%")
      .select();
    
    if (platinError) {
      console.error("❌ Error updating Platin Plan:", platinError.message);
    } else {
      console.log("✅ Platin Plan updated:");
      console.log(`   ${platin[0]?.name}`);
      console.log(`   Google: ${platin[0]?.google_product_id}`);
    }
    
    console.log("\n✅ Product IDs:");
    console.log("   Gold:     com.nsyzk.lingrootmobile.gold.monthly (38 chars)");
    console.log("   Platinum: com.nsyzk.lingroot.platinum.monthly (38 chars)");
    
  } catch (e) {
    console.error("❌ Error:", e.message);
  }
}

updateProductIds();
