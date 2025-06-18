const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkColumns() {
  try {
    console.log('🔍 Checking contenthistory table columns...');
    
    // Son 3 kaydı getir
    const { data, error } = await supabase
      .from('contenthistory')
      .select('id, input, translated_text, adapted_text, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) {
      console.error('❌ Error fetching records:', error);
      return;
    }

    console.log('\n📊 Recent records:');
    data.forEach((record, index) => {
      console.log(`\n${index + 1}. Record ID: ${record.id}`);
      console.log(`   Created: ${record.created_at}`);
      console.log(`   Input: ${record.input?.substring(0, 50)}...`);
      console.log(`   Translated Text: ${record.translated_text || 'NULL'}`);
      console.log(`   Adapted Text: ${record.adapted_text || 'NULL'}`);
    });

    // Yeni kolonların var olup olmadığını kontrol et
    const hasTranslatedText = data.some(record => record.translated_text !== null);
    const hasAdaptedText = data.some(record => record.adapted_text !== null);

    console.log('\n✅ Column Status:');
    console.log(`   translated_text column exists: ${data.length > 0 ? 'YES' : 'UNKNOWN'}`);
    console.log(`   adapted_text column exists: ${data.length > 0 ? 'YES' : 'UNKNOWN'}`);
    console.log(`   Records with translated_text: ${hasTranslatedText ? 'YES' : 'NO'}`);
    console.log(`   Records with adapted_text: ${hasAdaptedText ? 'YES' : 'NO'}`);

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkColumns(); 