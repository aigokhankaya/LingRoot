const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addColumnWithRPC() {
  try {
    console.log('🚀 RPC ile resetPasswordExpires sütunu ekleniyor...');
    
    // Önce basit SQL RPC'yi dene
    const { data, error } = await supabase.rpc('exec', {
      sql: "ALTER TABLE users ADD COLUMN IF NOT EXISTS \"resetPasswordExpires\" TIMESTAMP WITH TIME ZONE;"
    });
    
    if (error) {
      console.log('⚠️  RPC exec bulunamadı, alternatif yöntem deneniyor...');
      
      // Raw SQL query ile dene
      const { data: queryData, error: queryError } = await supabase
        .from('users')
        .select('resetPasswordExpires')
        .limit(1);
        
      if (queryError && queryError.code === '42703') {
        console.log('✅ Sütun yok olduğu doğrulandı, şimdi ekliyoruz...');
        
        // PostgreSQL raw query
        const { data: sqlData, error: sqlError } = await supabase.rpc('query', {
          query: "ALTER TABLE users ADD COLUMN \"resetPasswordExpires\" TIMESTAMP WITH TIME ZONE;"
        });
        
        if (sqlError) {
          console.log('❌ RPC query de başarısız:', sqlError);
          console.log('🔧 Manuel ekleme gerekli...');
          manualInstructions();
          return;
        }
        
        console.log('✅ Sütun başarıyla eklendi!');
      } else {
        console.log('⚠️  Sütun durumu belirsiz:', queryError);
        manualInstructions();
        return;
      }
    } else {
      console.log('✅ RPC exec ile sütun eklendi!');
    }
    
    // Doğrulama
    console.log('🔍 Sütun ekleme doğrulanıyor...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('users')
      .select('resetPasswordExpires')
      .limit(1);
      
    if (verifyError) {
      console.log('❌ Doğrulama başarısız:', verifyError);
      manualInstructions();
    } else {
      console.log('✅ Sütun başarıyla eklendi ve doğrulandı!');
      console.log('🎉 Şifre sıfırlama özelliği aktif edildi!');
    }
    
  } catch (error) {
    console.error('❌ Beklenmeyen hata:', error);
    manualInstructions();
  }
}

function manualInstructions() {
  console.log('');
  console.log('📝 MANUEL EKLEME TALİMATLARI:');
  console.log('');
  console.log('1. https://supabase.com/dashboard adresine gidin');
  console.log('2. Projenizi seçin');
  console.log('3. Sol menüden "SQL Editor" seçin');
  console.log('4. Aşağıdaki SQL komutunu çalıştırın:');
  console.log('');
  console.log('   ALTER TABLE users ADD COLUMN "resetPasswordExpires" TIMESTAMP WITH TIME ZONE;');
  console.log('');
  console.log('5. "RUN" butonuna tıklayın');
  console.log('');
  console.log('VEYA Table Editor kullanarak:');
  console.log('1. Sol menüden "Table Editor" seçin');
  console.log('2. "users" tablosunu seçin');
  console.log('3. "+ New Column" butonuna tıklayın');
  console.log('4. Column name: resetPasswordExpires');
  console.log('5. Type: timestamp with time zone');
  console.log('6. Is Nullable: ✅ İşaretleyin');
  console.log('7. Save butonuna tıklayın');
  console.log('');
}

addColumnWithRPC(); 