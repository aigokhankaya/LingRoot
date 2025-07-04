require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmailQuick() {
  console.log('🧪 E-posta sistemi hızlı test...');
  
  // Environment variables kontrol
  console.log('📋 E-posta yapılandırması:');
  console.log('EMAIL_USER:', process.env.EMAIL_USER || '❌ YOK');
  console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ VAR' : '❌ YOK');
  console.log('EMAIL_HOST:', process.env.EMAIL_HOST || '❌ YOK');
  console.log('EMAIL_PORT:', process.env.EMAIL_PORT || '❌ YOK');
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('❌ E-posta yapılandırması eksik!');
    return false;
  }
  
  try {
    // Transporter oluştur
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    console.log('🔍 SMTP bağlantısı test ediliyor...');
    
    // Bağlantıyı test et
    await transporter.verify();
    console.log('✅ SMTP bağlantısı başarılı!');
    
    // Test e-postası gönder
    console.log('📧 Test e-postası gönderiliyor...');
    
    const testEmail = {
      from: `"LingRoot Test" <${process.env.EMAIL_USER}>`,
      to: 'GOKHANBLUEE1@gmail.com', // Test e-postası
      subject: '🧪 LingRoot E-posta Test',
      text: 'Bu bir test e-postasıdır. E-posta sistemi çalışıyor!',
      html: '<p>Bu bir test e-postasıdır. <strong>E-posta sistemi çalışıyor!</strong></p>'
    };
    
    const result = await transporter.sendMail(testEmail);
    console.log('✅ Test e-postası gönderildi!');
    console.log('📄 Message ID:', result.messageId);
    
    return true;
    
  } catch (error) {
    console.error('❌ E-posta sistemi hatası:', error.message);
    console.error('🔍 Hata detayı:', error);
    return false;
  }
}

testEmailQuick().then(success => {
  if (success) {
    console.log('🎉 E-posta sistemi çalışıyor!');
  } else {
    console.log('💥 E-posta sistemi çalışmıyor!');
  }
}).catch(err => {
  console.error('💥 Test hatası:', err);
}); 