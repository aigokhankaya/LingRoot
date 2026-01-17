/**
 * Run the chat tables migration
 * Creates conversations and messages tables for AI chat
 */

const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const logger = require('../utils/common/logger.js');

async function runChatMigration() {
  try {
    logger.info('🚀 Starting chat tables migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../migrations/create_chat_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Execute the migration
    await db.query(migrationSQL);
    
    logger.info('✅ Chat tables migration completed successfully');
    logger.info('📊 Created tables: conversations, messages');
    logger.info('📊 Created indexes for performance');
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Chat tables migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runChatMigration();
}

module.exports = { runChatMigration };
