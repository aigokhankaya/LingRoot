const { pool } = require('./config/db');
const logger = require('./utils/logger');

(async () => {
  try {
    logger.info('🚀 Creating indexes for Learning Engine...');
    
    const query = `
      CREATE INDEX IF NOT EXISTS idx_contenthistory_user_created 
      ON contenthistory (user_id, created_at DESC);

      -- Optional: Index for finding content items by key faster
      CREATE INDEX IF NOT EXISTS idx_content_items_key_fast 
      ON content_items (content_key);
    `;

    await pool.query(query);
    logger.info('✅ Indexes created successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to create indexes:', error);
    process.exit(1);
  }
})();
