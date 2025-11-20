const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  try {
    console.log('🔄 Starting TOPIC HIERARCHY migration...');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Database URL exists:', !!process.env.DATABASE_URL);

    // Test database connection
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful:', testResult.rows[0].now);

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '20251120_create_topic_hierarchy.sql');
    console.log('📖 Reading migration file from:', migrationPath);

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Migration file size:', migrationSQL.length, 'characters');

    // Run migration
    console.log('🚀 Executing TOPIC HIERARCHY migration...');
    await pool.query(migrationSQL);
    console.log('✅ Topic hierarchy migration completed successfully!');

    // Verify tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('topics', 'topic_contents')
      ORDER BY table_name
    `);

    console.log('📋 Created tables:', tablesResult.rows.map(r => r.table_name));

    const topicCount = await pool.query('SELECT COUNT(*) FROM topics');
    console.log(`🌳 Total topics rows: ${topicCount.rows[0].count}`);

    const contentCount = await pool.query('SELECT COUNT(*) FROM topic_contents');
    console.log(`🔊 Total topic_contents rows: ${contentCount.rows[0].count}`);

    console.log('🎉 Topic hierarchy migration finished successfully!');
  } catch (error) {
    console.error('❌ Topic hierarchy migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔚 Database connection closed.');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
