// Check if user exists
require('dotenv').config();
const { supabase } = require('../utils/supabaseClient');

async function checkUser(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Found ${data.length} user(s) with email: ${email}`);
  console.log(JSON.stringify(data, null, 2));
}

checkUser('mobile.android.tr@gmail.com');
