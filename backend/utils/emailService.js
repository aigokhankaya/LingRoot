const nodemailer = require('nodemailer');
const logger = require('./logger');
require('dotenv').config();

// MOCK EMAIL MODE - Test için
const MOCK_EMAIL_MODE = process.env.MOCK_EMAIL_MODE === 'true';

// Mail transporteri oluştur
const createTransporter = () => {
  if (MOCK_EMAIL_MODE) {
    // Mock transporter - gerçekte e-posta göndermez
    return {
      sendMail: async (mailOptions) => {
        console.log('🧪 MOCK EMAIL GÖNDERILDI:');
        console.log('📧 To:', mailOptions.to);
        console.log('📋 Subject:', mailOptions.subject);
        console.log('📄 HTML Preview:', mailOptions.html.substring(0, 200) + '...');
        return { 
          messageId: 'mock-' + Date.now(),
          response: 'Mock email sent successfully'
        };
      },
      verify: async () => {
        console.log('✅ Mock email transporter verified');
        return true;
      }
    };
  }
  
  // Gmail SMTP kullanıyoruz (ücretsiz ve güvenilir)
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'lingroot.app@gmail.com',
      pass: process.env.EMAIL_PASSWORD || 'your-app-password-here'
    }
  });
};

// Hoşgeldin mail taslağı
const generateWelcomeEmailHTML = (userFirstName, userEmail) => {
  return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LingRoot'a Hoş Geldiniz! 🎉</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 10px;
        }
        .welcome-title {
            color: #2d3748;
            font-size: 24px;
            margin: 20px 0;
        }
        .content {
            margin: 20px 0;
        }
        .feature-list {
            list-style: none;
            padding: 0;
            margin: 20px 0;
        }
        .feature-item {
            display: flex;
            align-items: center;
            margin: 15px 0;
            padding: 15px;
            background: #f7fafc;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .feature-icon {
            font-size: 20px;
            margin-right: 15px;
            width: 30px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #718096;
            font-size: 14px;
        }
        .social-links {
            margin: 20px 0;
        }
        .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: #667eea;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎯 LingRoot</div>
            <h1 class="welcome-title">Hoş Geldiniz ${userFirstName}! 🎉</h1>
        </div>
        
        <div class="content">
            <p>Merhaba <strong>${userFirstName}</strong>,</p>
            
            <p>LingRoot ailesine katıldığınız için çok mutluyuz! Artık sevdiğiniz içeriklerle İngilizce öğrenme yolculuğunuza başlayabilirsiniz.</p>
            
            <h3>🚀 Hemen başlamak için:</h3>
            
            <ul class="feature-list">
                <li class="feature-item">
                    <span class="feature-icon">🎬</span>
                    <div>
                        <strong>İçeriğinizi Seçin:</strong><br>
                        YouTube videosu, podcast, blog yazısı... Sevdiğiniz herhangi bir içeriği linkleyebilirsiniz.
                    </div>
                </li>
                <li class="feature-item">
                    <span class="feature-icon">📊</span>
                    <div>
                        <strong>Seviyenizi Belirleyin:</strong><br>
                        A1'den C2'ye kadar. İçerik otomatik olarak anlayabileceğiniz İngilizceye çevrilir.
                    </div>
                </li>
                <li class="feature-item">
                    <span class="feature-icon">🎧</span>
                    <div>
                        <strong>Dinle ve Öğren:</strong><br>
                        AI ile seslendirilmiş, altyazılı içeriklerle pasif öğrenme deneyimi yaşayın.
                    </div>
                </li>
            </ul>
            
            <div style="text-align: center;">
                <a href="https://lingroot.com/dashboard" class="cta-button">
                    🎯 Hemen Başla
                </a>
            </div>
            
            <h3>💡 İpucu:</h3>
            <p style="background: #fff5cd; padding: 15px; border-radius: 8px; border-left: 4px solid #f6d55c;">
                <strong>Günlük rutininizi değiştirmeyin!</strong> Zaten dinlediğiniz podcast'leri, izlediğiniz videoları LingRoot ile seviyenize uygun hale getirin. Yürüyüş yaparken, spor yaparken, araçta... Her yerde öğrenin!
            </p>
            
            <p>Herhangi bir sorunuz varsa, bize <a href="mailto:destek@lingroot.com">destek@lingroot.com</a> adresinden ulaşabilirsiniz.</p>
            
            <p>İyi öğrenmeler! 🌟</p>
            
            <p><strong>LingRoot Ekibi</strong></p>
        </div>
        
        <div class="footer">
            <div class="social-links">
                <a href="https://lingroot.com/about">Hakkımızda</a> |
                <a href="https://lingroot.com/blog">Blog</a> |
                <a href="https://lingroot.com/contact">İletişim</a>
            </div>
            <p>© 2024 LingRoot. Tüm hakları saklıdır.</p>
            <p style="font-size: 12px; color: #a0aec0;">
                Bu mail ${userEmail} adresine gönderilmiştir.<br>
                Eğer bu maili almak istemiyorsanız, <a href="https://lingroot.com/unsubscribe">buradan</a> abonelikten çıkabilirsiniz.
            </p>
        </div>
    </div>
</body>
</html>`;
};

// Hoşgeldin mail text versiyonu (HTML desteklemeyen mail istemcileri için)
const generateWelcomeEmailText = (userFirstName, userEmail) => {
  return `
Hoş Geldiniz ${userFirstName}! 🎉

Merhaba ${userFirstName},

LingRoot ailesine katıldığınız için çok mutluyuz! Artık sevdiğiniz içeriklerle İngilizce öğrenme yolculuğunuza başlayabilirsiniz.

🚀 HEMEN BAŞLAMAK İÇİN:

🎬 İçeriğinizi Seçin:
YouTube videosu, podcast, blog yazısı... Sevdiğiniz herhangi bir içeriği linkleyebilirsiniz.

📊 Seviyenizi Belirleyin:
A1'den C2'ye kadar. İçerik otomatik olarak anlayabileceğiniz İngilizceye çevrilir.

🎧 Dinle ve Öğren:
AI ile seslendirilmiş, altyazılı içeriklerle pasif öğrenme deneyimi yaşayın.

💡 İPUCU:
Günlük rutininizi değiştirmeyin! Zaten dinlediğiniz podcast'leri, izlediğiniz videoları LingRoot ile seviyenize uygun hale getirin.

Dashboard'a gitmek için: https://lingroot.com/dashboard

Herhangi bir sorunuz varsa, destek@lingroot.com adresinden bize ulaşabilirsiniz.

İyi öğrenmeler! 🌟

LingRoot Ekibi

---
© 2024 LingRoot. Tüm hakları saklıdır.
Bu mail ${userEmail} adresine gönderilmiştir.
`;
};

// Hoşgeldin maili gönder
const sendWelcomeEmail = async (userEmail, userFirstName) => {
  try {
    const transporter = createTransporter();
    
    // Mail seçenekleri
    const mailOptions = {
      from: {
        name: 'LingRoot',
        address: process.env.EMAIL_USER || 'lingroot.app@gmail.com'
      },
      to: userEmail,
      subject: `🎉 ${userFirstName}, LingRoot'a Hoş Geldiniz! İngilizce yolculuğunuz başlasın`,
      text: generateWelcomeEmailText(userFirstName, userEmail),
      html: generateWelcomeEmailHTML(userFirstName, userEmail),
      // Mail önceliği
      priority: 'normal',
      // Gönderen bilgileri
      headers: {
        'X-Mailer': 'LingRoot Email Service',
        'X-Priority': '3'
      }
    };
    
    // Mail gönder
    logger.info(`[EMAIL] Hoşgeldin maili gönderiliyor: ${userEmail}`);
    const result = await transporter.sendMail(mailOptions);
    
    logger.info(`[EMAIL] ✅ Hoşgeldin maili başarıyla gönderildi: ${userEmail}`, {
      messageId: result.messageId,
      response: result.response
    });
    
    return {
      success: true,
      messageId: result.messageId,
      message: 'Hoşgeldin maili başarıyla gönderildi'
    };
    
  } catch (error) {
    logger.error(`[EMAIL] ❌ Hoşgeldin maili gönderilemedi: ${userEmail}`, error);
    
    return {
      success: false,
      error: error.message,
      message: 'Hoşgeldin maili gönderilemedi'
    };
  }
};

// Mail bağlantısını test et
const testEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    logger.info('[EMAIL] ✅ Mail servisi bağlantısı başarılı');
    return true;
  } catch (error) {
    logger.error('[EMAIL] ❌ Mail servisi bağlantı hatası:', error);
    return false;
  }
};

// Genel mail gönderme fonksiyonu (gelecekte farklı mail tipleri için)
const sendEmail = async (to, subject, textContent, htmlContent) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: 'LingRoot',
        address: process.env.EMAIL_USER || 'lingroot.app@gmail.com'
      },
      to,
      subject,
      text: textContent,
      html: htmlContent
    };
    
    const result = await transporter.sendMail(mailOptions);
    logger.info(`[EMAIL] ✅ Mail başarıyla gönderildi: ${to}`);
    
    return {
      success: true,
      messageId: result.messageId
    };
    
  } catch (error) {
    logger.error(`[EMAIL] ❌ Mail gönderilemedi: ${to}`, error);
    
    return {
      success: false,
      error: error.message
    };
  }
};

// Şifre sıfırlama e-posta şablonu
const generatePasswordResetEmailHTML = (userFirstName, resetLink) => {
  return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Şifre Sıfırlama - LingRoot</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 10px;
        }
        .reset-title {
            color: #2d3748;
            font-size: 24px;
            margin: 20px 0;
        }
        .content {
            margin: 20px 0;
        }
        .warning-box {
            background: #fef5e7;
            border: 1px solid #f6d55c;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #718096;
            font-size: 14px;
        }
        .security-note {
            background: #edf2f7;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🔒 LingRoot</div>
            <h1 class="reset-title">Şifre Sıfırlama Talebi</h1>
        </div>
        
        <div class="content">
            <p>Merhaba <strong>${userFirstName}</strong>,</p>
            
            <p>Hesabınız için şifre sıfırlama talebinde bulundunuz. Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
            
            <div class="warning-box">
                <h3>⏰ Önemli Bilgi</h3>
                <p>Bu bağlantı <strong>1 saat süreyle</strong> geçerlidir. Süre dolmadan önce şifrenizi sıfırlamanız gerekir.</p>
            </div>
            
            <p>Yeni şifrenizi belirlemek için aşağıdaki butona tıklayın:</p>
            
            <div style="text-align: center;">
                <a href="${resetLink}" class="cta-button">
                    🔑 Şifremi Sıfırla
                </a>
            </div>
            
            <p style="font-size: 14px; color: #718096; text-align: center;">
                Eğer buton çalışmıyorsa, aşağıdaki bağlantıyı kopyalayıp tarayıcınıza yapıştırın:<br>
                <span style="word-break: break-all;">${resetLink}</span>
            </p>
            
            <div class="security-note">
                <h4>🛡️ Güvenlik İpuçları</h4>
                <ul>
                    <li>Şifrenizi kimseyle paylaşmayın</li>
                    <li>Güçlü bir şifre kullanın (en az 8 karakter, büyük-küçük harf, rakam)</li>
                    <li>Düzenli olarak şifrenizi değiştirin</li>
                </ul>
            </div>
            
            <p>Herhangi bir sorunuz varsa, bize <a href="mailto:destek@lingroot.com">destek@lingroot.com</a> adresinden ulaşabilirsiniz.</p>
            
            <p><strong>LingRoot Güvenlik Ekibi</strong></p>
        </div>
        
        <div class="footer">
            <p>© 2024 LingRoot. Tüm hakları saklıdır.</p>
            <p style="font-size: 12px; color: #a0aec0;">
                Bu güvenlik e-postası otomatik olarak gönderilmiştir.
            </p>
        </div>
    </div>
</body>
</html>`;
};

// Şifre sıfırlama e-posta text versiyonu
const generatePasswordResetEmailText = (userFirstName, resetLink) => {
  return `
Şifre Sıfırlama Talebi - LingRoot

Merhaba ${userFirstName},

Hesabınız için şifre sıfırlama talebinde bulundunuz. Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.

⏰ ÖNEMLİ BİLGİ:
Bu bağlantı 1 saat süreyle geçerlidir. Süre dolmadan önce şifrenizi sıfırlamanız gerekir.

Yeni şifrenizi belirlemek için aşağıdaki bağlantıya tıklayın:
${resetLink}

🛡️ GÜVENLİK İPUÇLARI:
- Şifrenizi kimseyle paylaşmayın
- Güçlü bir şifre kullanın (en az 8 karakter, büyük-küçük harf, rakam)
- Düzenli olarak şifrenizi değiştirin

Herhangi bir sorunuz varsa, bize destek@lingroot.com adresinden ulaşabilirsiniz.

LingRoot Güvenlik Ekibi

© 2024 LingRoot. Tüm hakları saklıdır.
Bu güvenlik e-postası otomatik olarak gönderilmiştir.
`;
};

// Şifre sıfırlama e-postası gönderme fonksiyonu
const sendPasswordResetEmail = async (userEmail, userFirstName, resetToken) => {
  try {
    const resetLink = `${process.env.FRONTEND_URL || 'https://lingroot.com'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"LingRoot Güvenlik" <${process.env.EMAIL_USER || 'lingroot.app@gmail.com'}>`,
      to: userEmail,
      subject: '🔒 Şifre Sıfırlama Talebi - LingRoot',
      text: generatePasswordResetEmailText(userFirstName, resetLink),
      html: generatePasswordResetEmailHTML(userFirstName, resetLink)
    };

    const transporter = createTransporter();
    const result = await transporter.sendMail(mailOptions);
    
    logger.info(`Password reset email sent successfully to ${userEmail}`, {
      messageId: result.messageId,
      response: result.response
    });
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    logger.error('Failed to send password reset email:', {
      error: error.message,
      stack: error.stack,
      recipient: userEmail
    });
    throw error;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendEmail,
  testEmailConnection,
  generateWelcomeEmailHTML,
  generateWelcomeEmailText,
  sendPasswordResetEmail
}; 