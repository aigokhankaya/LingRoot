#!/usr/bin/env node

/**
 * Script to set environment configuration in database
 * Usage: node set_environment.js [production|test]
 */

const { supabase } = require('../utils/storage/supabaseClient.js');

async function setEnvironment(env) {
  if (!env || !['production', 'test'].includes(env)) {
    console.error('❌ Invalid environment. Use "production" or "test"');
    console.log('\nUsage: node set_environment.js [production|test]');
    console.log('\nExamples:');
    console.log('  node set_environment.js production  # Use Render production URLs');
    console.log('  node set_environment.js test        # Use localhost:5001');
    process.exit(1);
  }

  try {
    console.log(`🔧 Setting environment to: ${env}`);

    // Upsert the environment setting
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'environment', value: env }, { onConflict: 'key' });

    if (error) {
      console.error('❌ Error setting environment:', error);
      process.exit(1);
    }

    console.log('✅ Environment setting updated successfully!');
    console.log(`\n📱 Mobile app will now use: ${env === 'production' ? 'https://lingloops-backend.onrender.com' : 'http://localhost:5001'}`);
    console.log('\n💡 Note: Mobile app caches this setting for 5 minutes. To force refresh:');
    console.log('   - Restart the app');
    console.log('   - Or wait 5 minutes for cache to expire');

    process.exit(0);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Get environment from command line argument
const env = process.argv[2];
setEnvironment(env);
