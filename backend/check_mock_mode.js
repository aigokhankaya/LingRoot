const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkAndDisableMockMode() {
  try {
    console.log('🔍 Checking mock TTS mode...');
    
    // Mock TTS mode kontrol et
    const { data, error } = await supabase
      .from('parameters')
      .select('*')
      .eq('key', 'mock_tts_enabled');
    
    if (error) throw error;
    
    console.log('📊 Current mock TTS settings:', data);
    
    if (data && data.length > 0) {
      const currentValue = data[0].value;
      console.log('Current value:', currentValue, 'Type:', typeof currentValue);
      
      if (currentValue === 'true' || currentValue === true) {
        console.log('🔴 Mock TTS mode ENABLED - Disabling it...');
        
        // Mock mode'u kapat
        const { error: updateError } = await supabase
          .from('parameters')
          .update({ value: 'false' })
          .eq('key', 'mock_tts_enabled');
          
        if (updateError) throw updateError;
        console.log('✅ Mock TTS mode DISABLED successfully');
      } else {
        console.log('✅ Mock TTS mode already DISABLED');
      }
    } else {
      console.log('ℹ️ No mock_tts_enabled parameter found. Creating disabled entry...');
      
      const { error: insertError } = await supabase
        .from('parameters')
        .insert({ key: 'mock_tts_enabled', value: 'false' });
        
      if (insertError) throw insertError;
      console.log('✅ Mock TTS parameter created as DISABLED');
    }
    
    // Final verification
    const { data: finalData } = await supabase
      .from('parameters')
      .select('*')
      .eq('key', 'mock_tts_enabled');
      
    console.log('🎯 Final status:', finalData);
    
    console.log('\n🚀 Now you can test TTS with real Google TTS timing!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkAndDisableMockMode(); 