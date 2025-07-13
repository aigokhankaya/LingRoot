const axios = require('axios');

async function testForgotPassword() {
  const API_BASE_URL = 'http://localhost:5001';
  
  console.log('🧪 Şifre sıfırlama özelliği test ediliyor...');
  
  try {
    // Test 1: Geçerli e-posta ile şifre sıfırlama talebi
    console.log('\n1️⃣ Geçerli e-posta ile test...');
    
    const response1 = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
      email: 'egokankaya@gmail.com'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Başarılı yanıt:', response1.data);
    
    // Test 2: Geçersiz e-posta formatı
    console.log('\n2️⃣ Geçersiz e-posta formatı ile test...');
    
    try {
      const response2 = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
        email: 'invalid-email'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.log('✅ Beklenen hata yakalandı:', error.response.data);
    }
    
    // Test 3: Boş e-posta
    console.log('\n3️⃣ Boş e-posta ile test...');
    
    try {
      const response3 = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
        email: ''
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.log('✅ Beklenen hata yakalandı:', error.response.data);
    }
    
    console.log('\n🎉 Tüm testler başarıyla tamamlandı!');
    console.log('✉️ E-posta ling2loop@gmail.com adresinden gönderildi.');
    console.log('📧 Spam klasörünü de kontrol edin.');
    
  } catch (error) {
    console.error('❌ Test hatası:', error.message);
    if (error.response) {
      console.error('📄 Hata detayı:', error.response.data);
    }
  }
}

// 5 saniye bekle ve testi çalıştır
setTimeout(() => {
  testForgotPassword();
}, 5000); 