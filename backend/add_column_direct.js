const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addResetPasswordExpiresColumn() {
  try {
    console.log('🚀 resetPasswordExpires sütunu ekleniyor...');
    
    // Önce mevcut sütunları kontrol et
    console.log('🔍 Mevcut users tablosu yapısı kontrol ediliyor...');
    
    const { data: existingData, error: existingError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (existingError) {
      console.error('❌ Users tablosu erişim hatası:', existingError);
      return;
    }
    
    if (existingData && existingData.length > 0) {
      const user = existingData[0];
      console.log('📋 Mevcut sütunlar:', Object.keys(user));
      
      if (user.hasOwnProperty('resetPasswordExpires')) {
        console.log('✅ resetPasswordExpires sütunu zaten mevcut!');
        return;
      }
    }
    
    console.log('⚠️  resetPasswordExpires sütunu bulunamadı.');
    console.log('📝 Şimdi sütunu manuel olarak ekleyin:');
    console.log('');
    console.log('1. https://supabase.com/dashboard projesine gidin');
    console.log('2. Sol menüden "Table Editor" seçin');
    console.log('3. "users" tablosunu seçin');
    console.log('4. "+ New Column" butonuna tıklayın');
    console.log('5. Şu bilgileri girin:');
    console.log('   - Column name: resetPasswordExpires');
    console.log('   - Type: timestamp with time zone');
    console.log('   - Default value: (boş bırakın)');
    console.log('   - Is Nullable: ✅ İşaretleyin');
    console.log('6. "Save" butonuna tıklayın');
    console.log('');
    console.log('Sütunu ekledikten sonra backend\'i yeniden başlatın.');
    
  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

addResetPasswordExpiresColumn(); 