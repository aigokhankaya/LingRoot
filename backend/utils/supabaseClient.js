// Supabase istemcisi için yardımcı modül
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const logger = require("./logger"); // Import logger

// Supabase bağlantı bilgileri
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const bucketName = process.env.SUPABASE_BUCKET_NAME;

// Bağlantı bilgilerini kontrol et
if (!supabaseUrl || !supabaseKey) { // Check for service key as it's used in controllers
  logger.error("UYARI: Supabase bağlantı bilgileri (URL veya Service Key) eksik. Lütfen .env dosyasını kontrol edin.");
  logger.error("SUPABASE_URL ve SUPABASE_SERVICE_KEY değerlerinin tanımlandığından emin olun.");
  // Consider throwing an error or exiting if Supabase is critical
}

// Supabase istemcisini oluştur ve dışa aktar (Using Service Key for backend operations)
const supabase = createClient(supabaseUrl, supabaseKey);
logger.info("Supabase URL:", supabaseUrl ? "✓ Mevcut" : "✗ Eksik");
logger.info("Supabase Service Key exists:", supabaseKey ? "✓ Mevcut" : "✗ Eksik");
logger.info("Supabase client initialized successfully.");

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

// Kritik Düzeltme: Supabase istemcisini modülden dışa aktar!
module.exports = { supabase, supabaseUrl, supabaseKey, bucketName };

