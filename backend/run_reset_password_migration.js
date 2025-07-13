const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase URL ve Service Key gerekli!');
  console.error('SUPABASE_URL:', supabaseUrl ? '✓ Ayarlı' : '❌ Eksik');
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✓ Ayarlı' : '❌ Eksik');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runResetPasswordMigration() {
  try {
    console.log('🚀 Reset Password Migration başlatılıyor...');
    
    // Migration dosyasını oku
    const migrationPath = path.join(__dirname, 'migrations', 'add_reset_password_expires_column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration dosyası okundu');
    console.log('🔄 Migration çalıştırılıyor...');
    
    // Migration'ı çalıştır
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error('❌ Migration hatası:', error);
      
      // Alternatif olarak direkt SQL ile dene
      console.log('🔄 Alternatif yöntem deneniyor...');
      
      const { data: altData, error: altError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (altError) {
        console.error('❌ Veritabanı bağlantı hatası:', altError);
        process.exit(1);
      }
      
      console.log('✅ Veritabanı bağlantısı başarılı');
      console.log('⚠️  Manuel olarak Supabase Dashboard\'dan sütunu ekleyin:');
      console.log('   1. https://supabase.com/dashboard');
      console.log('   2. Table Editor > users');
      console.log('   3. + New Column');
      console.log('   4. Column name: resetPasswordExpires');
      console.log('   5. Type: timestamp with time zone');
      console.log('   6. Is Nullable: ✅ Evet');
      
    } else {
      console.log('✅ Migration başarıyla tamamlandı!');
      console.log('📊 Sonuç:', data);
    }
    
    // Sütunun varlığını kontrol et
    console.log('🔍 Sütun varlığı kontrol ediliyor...');
    
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'users')
      .in('column_name', ['resetPasswordToken', 'resetPasswordExpires']);
    
    if (!columnError && columns) {
      console.log('📋 Mevcut sütunlar:');
      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (Nullable: ${col.is_nullable})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Beklenmeyen hata:', error);
    process.exit(1);
  }
}

// Migration'ı çalıştır
runResetPasswordMigration().then(() => {
  console.log('🎉 Migration işlemi tamamlandı!');
}).catch(error => {
  console.error('💥 Migration başarısız:', error);
  process.exit(1);
}); 