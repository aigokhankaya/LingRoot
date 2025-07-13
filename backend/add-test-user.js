const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addTestUser() {
  try {
    console.log('Creating test user...');
    
    // Check if user already exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select("email, phonenumber")
      .or("email.eq.test@lingroot.com,phonenumber.eq.+905551234567")
      .maybeSingle();
    
    if (existingUser) {
      console.log('Test user already exists:', existingUser);
      return;
    }
    
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          firstname: 'Test',
          lastname: 'User',
          email: 'test@lingroot.com',
          phonenumber: '+905551234567',
          password: hashedPassword,
          role: 'user',
          isverified: true,
          dailycontentused: 0,
          lastcontentdate: null,
          stripecustomerid: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();
    
    if (error) {
      console.error('Error creating test user:', error);
    } else {
      console.log('✅ Test user created successfully!');
      console.log('📧 Email: test@lingroot.com');
      console.log('📱 Phone: +905551234567');
      console.log('🔐 Password: test123');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

addTestUser(); 