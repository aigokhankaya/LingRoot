const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    const adminEmail = 'enesyuzak@gmail.com';
    const adminPassword = 'test123';
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, await bcrypt.genSalt(10));
    
    // Check if admin user already exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', adminEmail)
      .single();
    
    if (existingUser) {
      console.log('Admin user already exists, updating role...');
      
      // Update existing user to admin
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ 
          role: 'admin',
          password: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('email', adminEmail)
        .select();
      
      if (updateError) {
        console.error('Error updating admin user:', updateError);
        return;
      }
      
      console.log('Admin user updated successfully:', updatedUser[0]);
    } else {
      console.log('Creating new admin user...');
      
      // Create new admin user
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            firstname: 'Enes',
            lastname: 'Yüzak',
            email: adminEmail,
            phonenumber: '+905551234567',
            password: hashedPassword,
            role: 'admin',
            isverified: true,
            dailycontentused: 0,
            lastcontentdate: null,
            stripecustomerid: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();
      
      if (insertError) {
        console.error('Error creating admin user:', insertError);
        return;
      }
      
      console.log('Admin user created successfully:', newUser[0]);
    }
    
    console.log('\nAdmin credentials:');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('Role: admin');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createAdminUser(); 