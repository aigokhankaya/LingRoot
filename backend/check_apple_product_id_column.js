const { supabase } = require('./utils/storage/supabaseClient.js');

async function checkAppleProductIdColumn() {
  try {
    console.log("Checking if apple_product_id column exists in subscription_plans table...\n");
    
    // Try to fetch plans with apple_product_id
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("id, name, price, apple_product_id")
      .limit(5);
    
    if (error) {
      console.error("❌ Error querying subscription_plans:", error.message);
      console.log("\nThe apple_product_id column likely does NOT exist in your local database.");
      console.log("You need to run the migration: add_apple_product_id_to_plans.sql");
      return;
    }
    
    console.log("✅ apple_product_id column EXISTS in subscription_plans table\n");
    console.log("Sample plans:");
    data.forEach(plan => {
      console.log(`  - ${plan.name}: apple_product_id = ${plan.apple_product_id || '(null)'}`);
    });
    
  } catch (e) {
    console.error("❌ Unexpected error:", e.message);
  }
}

checkAppleProductIdColumn();
