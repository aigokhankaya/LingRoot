/**
 * Run the topics table migration
 * Creates topics table with embedding support for RAG
 */

const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const logger = require('../utils/common/logger.js');

async function runTopicsMigration() {
  try {
    logger.info('🚀 Starting topics table migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../migrations/create_topics_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Execute the migration
    await db.query(migrationSQL);
    
    logger.info('✅ Topics table migration completed successfully');
    logger.info('📊 Created table: topics');
    logger.info('📊 Added column: conversations.suggested_topic');
    logger.info('📊 Created indexes for performance');
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Topics table migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runTopicsMigration();
}

module.exports = { runTopicsMigration };
