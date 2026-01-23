const { supabase } = require('./utils/storage/supabaseClient.js');
const fs = require("fs");
const path = require("path");

async function runMigration() {
  try {
    console.log("Running Google Product ID migration...\n");
    
    const sqlPath = path.join(__dirname, "migrations", "add_google_product_id_to_plans.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    
    // Split by semicolon and run each statement
    const statements = sql.split(";").filter(s => s.trim());
    
    for (const statement of statements) {
      if (!statement.trim()) continue;
      console.log(`Executing: ${statement.trim().substring(0, 80)}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
      
      if (error) {
        console.error(`❌ Error: ${error.message}`);
        // Try direct query for ALTER TABLE
        if (statement.includes('ALTER TABLE')) {
          console.log("Trying alternative approach...");
          // For Supabase, we need to use their SQL editor or direct connection
          console.log("⚠️  Please run this SQL manually in Supabase SQL Editor:");
          console.log(statement);
        }
      } else {
        console.log("✅ Success");
      }
    }
    
    // Verify the changes
    console.log("\n📋 Verifying changes...");
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("name, apple_product_id, google_product_id")
      .or("name.ilike.%gold%,name.ilike.%platin%");
    
    if (error) {
      console.error("❌ Error fetching plans:", error.message);
    } else {
      console.log("\n✅ Current Product IDs:");
      data.forEach(plan => {
        console.log(`\n${plan.name}:`);
        console.log(`  Apple:  ${plan.apple_product_id || '(not set)'}`);
        console.log(`  Google: ${plan.google_product_id || '(not set)'}`);
      });
    }
    
  } catch (e) {
    console.error("❌ Migration error:", e.message);
  }
}

runMigration();
