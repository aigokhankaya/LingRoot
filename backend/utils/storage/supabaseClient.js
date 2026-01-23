// Supabase istemcisi için yardımcı modül
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const logger = require('../common/logger.js'); // Import logger

// Supabase bağlantı bilgileri
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY 
  || process.env.SUPABASE_SERVICE_ROLE_KEY 
  || process.env.SUPABASE_KEY
  || process.env.SUPABASE_ANON_KEY;
const bucketName = process.env.SUPABASE_BUCKET_NAME;

// Attempt to create client only if configuration is present
let supabase = null;
if (!supabaseUrl || !supabaseKey) {
  logger.warn("Supabase configuration missing. Define SUPABASE_URL and SUPABASE_SERVICE_KEY in backend/.env");
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    logger.info("Supabase client initialized successfully.");
    logger.debug("Supabase URL: " + supabaseUrl);
    logger.debug("Supabase Key length: " + (supabaseKey ? supabaseKey.length : 0));

    // Optional connection test
    (async () => {
      try {
        logger.debug("Testing Supabase connection...");
        const { data, error } = await supabase
          .from("user_interests")
          .select("id", { count: "exact", head: true })
          .limit(1);
        if (error) {
          logger.error("Supabase connection test failed:", error.message);
        } else {
          logger.info("Supabase connection test successful.");
        }
      } catch (err) {
        logger.error("Exception during Supabase connection test:", err);
      }
    })();
  } catch (clientErr) {
    logger.error("Failed to initialize Supabase client:", clientErr);
    supabase = null;
  }
}

// Export the Supabase client and connection information
module.exports = { supabase, supabaseUrl, supabaseKey, bucketName };

