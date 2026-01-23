#!/usr/bin/env node

const { supabase } = require('../utils/storage/supabaseClient.js');

async function checkEnvironment() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'environment')
      .maybeSingle();

    if (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }

    if (!data) {
      console.log('⚠️  No environment setting found in database');
      console.log('Run: node scripts/set_environment.js test');
      process.exit(1);
    }

    console.log('✅ Current environment setting:');
    console.log('   Key:', data.key);
    console.log('   Value:', data.value);
    console.log('\nThis means mobile app will use:', 
      data.value === 'test' ? 'http://localhost:5001' : 'https://lingloops-backend.onrender.com'
    );

    process.exit(0);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

checkEnvironment();
