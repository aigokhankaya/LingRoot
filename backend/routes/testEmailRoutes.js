const express = require('express');
const router = express.Router();
const { sendWelcomeEmail, testEmailConnection } = require('../utils/emailService');
const logger = require('../utils/logger');

// Test mail servisini kontrol et
router.get('/test-connection', async (req, res) => {
  try {
    const isConnected = await testEmailConnection();
    
    if (isConnected) {
      return res.status(200).json({
        success: true,
        message: 'Mail servisi bağlantısı başarılı',
        config: {
          service: 'Gmail',
          user: process.env.EMAIL_USER || 'Ayarlanmamış',
          password: process.env.EMAIL_PASSWORD ? '✓ Ayarlı' : '❌ Ayarlanmamış'
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Mail servisi bağlantısı başarısız',
        config: {
          service: 'Gmail',
          user: process.env.EMAIL_USER || 'Ayarlanmamış',
          password: process.env.EMAIL_PASSWORD ? '✓ Ayarlı' : '❌ Ayarlanmamış'
        }
      });
    }
  } catch (error) {
    logger.error('[TEST_EMAIL] Mail bağlantı testi hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Mail bağlantı testi sırasında hata oluştu',
      error: error.message
    });
  }
});

// Test hoşgeldin maili gönder
router.post('/test-welcome', async (req, res) => {
  try {
    const { email, firstName } = req.body;
    
    if (!email || !firstName) {
      return res.status(400).json({
        success: false,
        message: 'Email ve firstName gerekli'
      });
    }
    
    logger.info(`[TEST_EMAIL] Test hoşgeldin maili gönderiliyor: ${email}`);
    
    const result = await sendWelcomeEmail(email, firstName);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Test hoşgeldin maili başarıyla gönderildi',
        data: {
          email,
          firstName,
          messageId: result.messageId
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Test hoşgeldin maili gönderilemedi',
        error: result.error
      });
    }
    
  } catch (error) {
    logger.error('[TEST_EMAIL] Test mail gönderme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Test mail gönderilirken hata oluştu',
      error: error.message
    });
  }
});

// Mail şablonunu önizle (HTML)
router.get('/preview-template', async (req, res) => {
  try {
    const { generateWelcomeEmailHTML } = require('../utils/emailService');
    
    const firstName = req.query.firstName || 'Test Kullanıcı';
    const email = req.query.email || 'test@example.com';
    
    const htmlContent = generateWelcomeEmailHTML(firstName, email);
    
    // HTML içeriği direkt olarak göster
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlContent);
    
  } catch (error) {
    logger.error('[TEST_EMAIL] Mail şablonu önizleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Mail şablonu önizlenirken hata oluştu',
      error: error.message
    });
  }
});

// Mail yapılandırma durumunu kontrol et
router.get('/config-status', (req, res) => {
  try {
    const config = {
      emailUser: process.env.EMAIL_USER || null,
      emailPasswordSet: !!process.env.EMAIL_PASSWORD,
      nodeEnv: process.env.NODE_ENV || 'development',
      status: {
        emailUser: process.env.EMAIL_USER ? '✓ Ayarlı' : '❌ Ayarlanmamış',
        emailPassword: process.env.EMAIL_PASSWORD ? '✓ Ayarlı' : '❌ Ayarlanmamış',
        ready: !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD)
      },
      instructions: {
        title: 'Mail Servisi Kurulum Rehberi',
        steps: [
          '1. Gmail hesabında "2-Step Verification" aktif olmalı',
          '2. "App passwords" bölümünden LingRoot için özel şifre oluştur',
          '3. .env dosyasına şu değişkenleri ekle:',
          '   EMAIL_USER=your-gmail@gmail.com',
          '   EMAIL_PASSWORD=your-16-char-app-password',
          '4. Backend\'i yeniden başlat',
          '5. /api/test-email/test-connection ile test et'
        ]
      }
    };
    
    return res.status(200).json(config);
    
  } catch (error) {
    logger.error('[TEST_EMAIL] Config status hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Yapılandırma durumu kontrol edilirken hata oluştu',
      error: error.message
    });
  }
});

module.exports = router; 