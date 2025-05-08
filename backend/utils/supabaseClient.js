// Supabase istemcisi için yardımcı modül
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const logger = require("./logger"); // Import logger

// Supabase bağlantı bilgileri
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // Use SUPABASE_KEY (public anon key) for client-side or less privileged operations if needed, or SUPABASE_SERVICE_KEY for admin operations.
// Assuming this client might be used for various operations, using the service key might be intended here based on previous controller usage.
// If this is intended ONLY for client-side like operations, switch to SUPABASE_KEY.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Bağlantı bilgilerini kontrol et
if (!supabaseUrl || !supabaseServiceKey) { // Check for service key as it's used in controllers
  logger.error("UYARI: Supabase bağlantı bilgileri (URL veya Service Key) eksik. Lütfen .env dosyasını kontrol edin.");
  logger.error("SUPABASE_URL ve SUPABASE_SERVICE_KEY değerlerinin tanımlandığından emin olun.");
  // Consider throwing an error or exiting if Supabase is critical
}

// Supabase istemcisini oluştur ve dışa aktar (Using Service Key for backend operations)
const supabase = createClient(supabaseUrl, supabaseServiceKey);
logger.info("Supabase client created.");

// Bağlantıyı test et ve durumu logla (Optional: can be removed in production)
(async () => {
  try {
    // Test with a simple query that doesn't expose sensitive data
    logger.debug("Testing Supabase connection...");
    const { error } = await supabase.from("Users").select("id", { count: "exact", head: true }).limit(1);
    if (error) {
      logger.error("Supabase connection test failed:", error.message);
    } else {
      logger.info("Supabase connection test successful. Able to query 'users' table.");
    }
  } catch (err) {
    logger.error("Exception during Supabase connection test:", err);
  }
})();

module.exports = supabase;

