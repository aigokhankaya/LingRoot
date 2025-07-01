const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");
const axios = require('axios');
require("dotenv").config();
const logger = require("../utils/logger");
const { logStep } = require('../utils/stepLogger');
const { v4: uuidv4 } = require('uuid');
const { sendWelcomeEmail, testEmailConnection } = require("../utils/emailService");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = process.env.JWT_SECRET || "lingroot-secret-key-for-development";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "lingroot-refresh-secret-key";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "30d";

logger.info('Supabase URL:', supabaseUrl);
logger.info('Supabase Service Key exists:', !!supabaseKey);
logger.info('JWT_SECRET exists:', !!JWT_SECRET);

const generateToken = (id, email, role, rememberMe = false) => {
  const expiresIn = rememberMe ? '30d' : '1h'; // Beni hatırla: 30 gün, Normal: 1 saat
  return jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn });
};

const generateRefreshToken = (id) =>
  jwt.sign({ id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });

exports.register = async (req, res) => {
  const requestId = uuidv4();
  let stepSequence = 1;
  try {
    logger.info(`[REGISTER] req.body:`, req.body);
    logStep({
      requestId,
      stepName: 'auth:register:start',
      stepSequence: stepSequence++,
      serviceName: 'Express',
      endpoint: '/auth/register',
      inputData: req.body
    });
    logger.info("Register request received", { body: req.body });
    const { firstName, lastName, email, phoneNumber, password } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        message: "Lütfen tüm zorunlu alanları doldurun (isim, soyisim, e-posta, telefon ve şifre)"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Geçersiz e-posta formatı" });
    }

    // Validate phone number format - daha esnek format
    // Önce telefon numarasını temizle (sadece rakam ve + işareti kalsın)
    const cleanedPhone = phoneNumber.replace(/[\s\(\)\-\.]/g, '');
    const phoneRegex = /^\+?[1-9]\d{7,14}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      return res.status(400).json({ success: false, message: "Geçersiz telefon numarası formatı. Örnek: +90 555 123 45 67" });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Şifre en az 6 karakter olmalıdır" });
    }

    // Check if email already exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select("email")
      .eq("email", email)
      .maybeSingle();
    if (fetchError) logger.error('[REGISTER] Error fetching user for register:', fetchError);

    if (existingUser) {
      return res.status(400).json({ success: false, message: "Bu e-posta adresi zaten kullanılıyor" });
    }

    // Check if phone number already exists (temizlenmiş format ile kontrol et)
    const { data: existingPhone, error: phoneFetchError } = await supabase
      .from('users')
      .select("id")
      .eq("phonenumber", cleanedPhone)
      .maybeSingle();
    if (phoneFetchError) logger.error('[REGISTER] Error fetching phone for register:', phoneFetchError);

    if (existingPhone) {
      return res.status(400).json({ success: false, message: "Bu telefon numarası zaten kullanılıyor" });
    }

    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          firstname: firstName,
          lastname: lastName,
          email,
          phonenumber: cleanedPhone, // Temizlenmiş telefon numarasını kaydet
          password: hashedPassword,
          role: "user",
          isverified: false,
          dailycontentused: 0,
          lastcontentdate: null,
          stripecustomerid: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();
    if (insertError) logger.error('[REGISTER] Error inserting new user:', insertError);

    if (insertError || !newUser?.length) {
      logger.error("User registration error:", insertError);
      return res.status(500).json({ success: false, message: "Kullanıcı kaydı sırasında bir hata oluştu" });
    }

    const token = generateToken(newUser[0].id, newUser[0].email, newUser[0].role, false);
    const refreshToken = generateRefreshToken(newUser[0].id);

    // Hoşgeldin maili gönder (async olarak, hata olursa da kayıt işlemini etkilemesin)
    try {
      await sendWelcomeEmail(newUser[0].email, newUser[0].firstname);
      logger.info(`[REGISTER] ✅ Hoşgeldin maili gönderildi: ${newUser[0].email}`);
    } catch (emailError) {
      logger.error(`[REGISTER] ❌ Hoşgeldin maili gönderilemedi: ${newUser[0].email}`, emailError);
      // Mail hatası kayıt işlemini etkilemesin, sadece logla
    }

    logStep({
      requestId,
      stepName: 'auth:register:supabase:insert',
      stepSequence: stepSequence++,
      serviceName: 'Supabase',
      endpoint: 'users',
      inputData: { email, phoneNumber },
      outputData: { userId: newUser?.[0]?.id }
    });
    logStep({
      requestId,
      stepName: 'auth:register:success',
      stepSequence: stepSequence++,
      status: 'success',
      outputData: { userId: newUser?.[0]?.id }
    });
    return res.status(201).json({
      success: true,
      message: "Kayıt başarılı",
      data: {
        user: newUser[0],
        token,
        refreshToken
      }
    });

  } catch (error) {
    logStep({
      requestId,
      stepName: 'auth:register:error',
      stepSequence: stepSequence++,
      status: 'failure',
      error
    });
    logger.error("Registration error", error);
    return res.status(500).json({ success: false, message: error.message || "Sunucu hatası" });
  }
};

exports.login = async (req, res) => {
  try {
    logger.info('[LOGIN] req.body:', req.body);
    console.log("[LOGIN] Gelen istek verisi:", req.body); // Bunu ekle
    const { email, phoneNumber, password, rememberMe } = req.body;

    // Check if logging in with email or phone
    if (!password) {
      return res.status(400).json({ success: false, message: "Lütfen şifre girin" });
    }

    if (!email && !phoneNumber) {
      return res.status(400).json({ success: false, message: "Lütfen e-posta veya telefon numarası girin" });
    }

    // Check if mock auth mode is enabled from parameters table
    try {
      const { data: paramData, error: paramError } = await supabase
        .from('parameters')
        .select('value')
        .eq('key', 'mock_auth_enabled')
        .single();

      const mockAuthEnabled = paramData?.value === 'true' || paramData?.value === true;

      if (mockAuthEnabled) {
        logger.info('[LOGIN] Mock auth mode enabled - allowing mock login for:', email || phoneNumber);
        
        const mockUser = {
          id: 'dev-user-123',
          email: email || `${phoneNumber}@mockuser.com`,
          name: 'Development User',
          role: 'user',
          membership_status: 'premium',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const token = generateToken(mockUser.id, mockUser.email, mockUser.role, rememberMe);
        const refreshToken = generateRefreshToken(mockUser.id);
        
        return res.status(200).json({
          success: true,
          message: "Giriş başarılı (Test Modu)",
          data: {
            user: mockUser,
            token,
            refreshToken
          }
        });
      }
    } catch (paramError) {
      logger.warn(`Could not check mock_auth_enabled parameter: ${paramError.message}`);
      // Continue with normal authentication if parameter check fails
    }

    // Build query for email or phone
    let query = supabase.from('users').select("*");
    if (email) {
      query = query.eq("email", email);
    } else {
      // Telefon numarasını temizle
      const cleanedPhone = phoneNumber.replace(/[\s\(\)\-\.]/g, '');
      query = query.eq("phonenumber", cleanedPhone);
    }

    const { data: user, error } = await query.single();
    if (error) logger.error('[LOGIN] Error fetching user:', error);

    if (error || !user || !(await bcrypt.compare(password, user.password))) {
      logger.warn('[LOGIN] Invalid credentials for:', email || phoneNumber);
      return res.status(401).json({ success: false, message: "Geçersiz giriş bilgileri" });
    }

    const token = generateToken(user.id, user.email, user.role, rememberMe);
    const refreshToken = generateRefreshToken(user.id);

    // Remove sensitive data before sending response
    delete user.password;
    delete user.verificationToken;
    delete user.resetPasswordToken;

    return res.status(200).json({
      success: true,
      message: "Giriş başarılı",
      data: {
        user,
        token,
        refreshToken
      }
    });

  } catch (error) {
    logger.error("Login error", error);
    return res.status(500).json({ success: false, message: error.message || "Sunucu hatası" });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const { id } = req.user;
    const { data: user, error } = await supabase
      .from('users')
      .select("*")
      .eq("id", id)
      .single();

    if (error || !user) {
      return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı" });
    }

    // Remove sensitive data
    delete user.password;
    delete user.verificationToken;
    delete user.resetPasswordToken;

    // Normalize user fields for frontend
    user.role = user.role || 'user';
    user.membershipStatus = user.membershipStatus || user.membership_status || 'free';

    return res.status(200).json({ success: true, user });
  } catch (error) {
    logger.error("Get current user error", error);
    return res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { credential, rememberMe } = req.body;
    
    if (!credential) {
      return res.status(400).json({ success: false, message: "Google credential gerekli" });
    }

    // Google credential'ı decode et
    let googleUser;
    
    // Google credential'ı decode et - her zaman gerçek credential
    // Credential'ın tipini belirle (JWT vs Access Token)
    // JWT'ler 3 bölümden oluşur: header.payload.signature
    const parts = credential.split('.');
    const isJWT = parts.length === 3;
    
    console.log('[GOOGLE_LOGIN] Gerçek Google credential analizi:');
    console.log('- Uzunluk:', credential.length);
    console.log('- Bölüm sayısı:', parts.length);
    console.log('- İlk 50 karakter:', credential.substring(0, 50));
    console.log('- JWT olarak algılandı:', isJWT);
    
      try {
        if (isJWT) {
          // JWT token decode et (One Tap durumu)
          console.log('[GOOGLE_LOGIN] JWT credential decode ediliyor...');
          const base64Url = credential.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          googleUser = JSON.parse(jsonPayload);
          console.log('[GOOGLE_LOGIN] JWT decode başarılı:', { email: googleUser.email, name: googleUser.name });
        } else {
          // Access token ile Google API'den kullanıcı bilgilerini al (OAuth popup durumu)
          console.log('[GOOGLE_LOGIN] Access token ile kullanıcı bilgileri alınıyor...');
          
          const response = await axios.get(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${credential}`);
          googleUser = response.data;
          
          // JWT formatına uygun hale getir
          googleUser.sub = googleUser.id;
          googleUser.given_name = googleUser.given_name || googleUser.name?.split(' ')[0];
          googleUser.family_name = googleUser.family_name || googleUser.name?.split(' ').slice(1).join(' ');
          
          console.log('[GOOGLE_LOGIN] Access token ile kullanıcı bilgileri başarılı:', { email: googleUser.email, name: googleUser.name });
        }
      } catch (decodeError) {
        logger.error('[GOOGLE_LOGIN] Credential decode hatası:', decodeError);
        console.log('[GOOGLE_LOGIN] Credential tipi:', isJWT ? 'JWT' : 'Access Token');
        console.log('[GOOGLE_LOGIN] Credential uzunluğu:', credential.length);
        return res.status(400).json({ success: false, message: "Geçersiz Google credential" });
      }

    const { email, name, given_name, family_name, picture } = googleUser;
    
    if (!email) {
      return res.status(400).json({ success: false, message: "Google hesabından email alınamadı" });
    }

    // Kullanıcının zaten var olup olmadığını kontrol et
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (fetchError) {
      logger.error('[GOOGLE_LOGIN] Kullanıcı sorgulama hatası:', fetchError);
      return res.status(500).json({ success: false, message: "Veritabanı hatası" });
    }

    let user;
    let isNewUser = false;
    
    if (existingUser) {
      // Mevcut kullanıcı - Google bilgilerini güncelle
      const updateData = {
        updated_at: new Date().toISOString()
      };

      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq("id", existingUser.id)
        .select()
        .single();

      if (updateError) {
        logger.error('[GOOGLE_LOGIN] Kullanıcı güncelleme hatası:', updateError);
        return res.status(500).json({ success: false, message: "Kullanıcı güncellenemedi" });
      }

      user = updatedUser;
    } else {
      // Yeni kullanıcı oluştur
      isNewUser = true;
      const newUserData = {
        firstname: given_name || name?.split(' ')[0] || 'Google',
        lastname: family_name || name?.split(' ').slice(1).join(' ') || 'User',
        email: email,
        phonenumber: null, // Google kullanıcıları için telefon numarası yok
        password: 'google-oauth', // Google kullanıcıları için placeholder şifre
        role: "user",
        isverified: true, // Google hesapları doğrulanmış sayılır
        dailycontentused: 0,
        lastcontentdate: null,
        stripecustomerid: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert([newUserData])
        .select()
        .single();

      if (createError) {
        logger.error('[GOOGLE_LOGIN] Kullanıcı oluşturma hatası:', createError);
        return res.status(500).json({ success: false, message: "Kullanıcı oluşturulamadı" });
      }

      user = createdUser;
      
      // Yeni Google kullanıcısına hoşgeldin maili gönder
      try {
        await sendWelcomeEmail(user.email, user.firstname);
        logger.info(`[GOOGLE_LOGIN] ✅ Yeni kullanıcıya hoşgeldin maili gönderildi: ${user.email}`);
      } catch (emailError) {
        logger.error(`[GOOGLE_LOGIN] ❌ Hoşgeldin maili gönderilemedi: ${user.email}`, emailError);
      }
    }

    // JWT token oluştur
    const token = generateToken(user.id, user.email, user.role, rememberMe);
    const refreshToken = generateRefreshToken(user.id);

    // Hassas verileri kaldır
    delete user.password;
    delete user.verificationToken;
    delete user.resetPasswordToken;

    return res.status(200).json({
      success: true,
      message: isNewUser ? "Google ile kayıt başarılı" : "Google ile giriş başarılı",
      data: {
        user,
        token,
        refreshToken,
        isNewUser
      }
    });

  } catch (error) {
    logger.error("Google login error", error);
    return res.status(500).json({ success: false, message: error.message || "Sunucu hatası" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber } = req.body;
    const userId = req.user.id;

    if (!firstName || !lastName) {
      return res.status(400).json({ success: false, message: "İsim ve soyisim zorunludur" });
    }

    // If phone number is being updated, check if it's already in use
    if (phoneNumber) {
      const { data: existingPhone } = await supabase
        .from('users')
        .select("id")
        .eq("phonenumber", phoneNumber)
        .maybeSingle();

      if (existingPhone) {
        return res.status(400).json({ success: false, message: "Bu telefon numarası başka bir kullanıcı tarafından kullanılıyor" });
      }
    }

    const updateData = {
      firstname: firstName,
      lastname: lastName,
      updated_at: new Date().toISOString()
    };

    if (phoneNumber) {
      updateData.phonenumber = phoneNumber;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq("id", userId)
      .select();

    if (error || !data?.length) {
      return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı" });
    }

    // Remove sensitive data
    delete data[0].password;
    delete data[0].verificationToken;
    delete data[0].resetPasswordToken;

    return res.status(200).json({ success: true, message: "Profil güncellendi", data: data[0] });
  } catch (error) {
    logger.error("Update profile error", error);
    return res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Tüm alanlar zorunlu" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Yeni şifre en az 6 karakter olmalıdır" });
    }

    const { data: user } = await supabase
      .from('users')
      .select("*")
      .eq("id", userId)
      .single();

    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ success: false, message: "Mevcut şifre yanlış" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
    const { error } = await supabase
      .from('users')
      .update({
        password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId);

    if (error) {
      return res.status(500).json({ success: false, message: "Şifre güncellenemedi" });
    }

    return res.status(200).json({ success: true, message: "Şifre başarıyla değiştirildi" });
  } catch (error) {
    logger.error("Change password error", error);
    return res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
};

exports.logout = async (req, res) => {
  try {
    return res.status(200).json({ success: true, message: "Çıkış yapıldı" });
  } catch (error) {
    logger.error("Logout error", error);
    return res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
};

exports.forgotPassword = async (req, res) => {
  return res.status(501).json({ success: false, message: "Şifre sıfırlama fonksiyonu henüz hazır değil" });
};

exports.resetPassword = async (req, res) => {
  return res.status(501).json({ success: false, message: "Şifre sıfırlama fonksiyonu henüz hazır değil" });
};

exports.verifyEmail = async (req, res) => {
  return res.status(501).json({ success: false, message: "E-posta doğrulama fonksiyonu henüz hazır değil" });
};

// SMS Login - Send verification code to phone number
exports.smsLogin = async (req, res) => {
  const requestId = uuidv4();
  let stepSequence = 1;
  
  try {
    logger.info(`[SMS_LOGIN] req.body:`, req.body);
    logStep({
      requestId,
      stepName: 'auth:sms-login:start',
      stepSequence: stepSequence++,
      serviceName: 'Express',
      endpoint: '/auth/sms-login',
      inputData: req.body
    });

    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: "Telefon numarası gerekli" });
    }

    // Validate phone number format - daha esnek format
    // Önce telefon numarasını temizle (sadece rakam ve + işareti kalsın)
    const cleanedPhone = phoneNumber.replace(/[\s\(\)\-\.]/g, '');
    const phoneRegex = /^\+?[1-9]\d{7,14}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      return res.status(400).json({ success: false, message: "Geçersiz telefon numarası formatı. Örnek: +90 555 123 45 67" });
    }

    // Check if user exists with this phone number
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select("id, firstname, lastname, email, phonenumber")
      .eq("phonenumber", phoneNumber)
      .maybeSingle();

    if (fetchError) {
      logger.error('[SMS_LOGIN] Error fetching user:', fetchError);
      return res.status(500).json({ success: false, message: "Veritabanı hatası" });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "Bu telefon numarası ile kayıtlı kullanıcı bulunamadı" });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user with verification code
    const { error: updateError } = await supabase
      .from('users')
      .update({
        verificationtoken: verificationCode,
        verificationexpires: verificationExpires.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (updateError) {
      logger.error('[SMS_LOGIN] Error updating verification code:', updateError);
      return res.status(500).json({ success: false, message: "Doğrulama kodu oluşturulamadı" });
    }

    // Send SMS (mock for now)
    try {
      await sendSMS(phoneNumber, `LingRoot doğrulama kodunuz: ${verificationCode}. Kod 10 dakika geçerlidir.`);
      logger.info(`[SMS_LOGIN] Verification code sent to: ${phoneNumber}`);
    } catch (smsError) {
      logger.error(`[SMS_LOGIN] Failed to send SMS to ${phoneNumber}:`, smsError);
      // Continue anyway for development, in production you might want to return error
      logger.warn(`[SMS_LOGIN] SMS failed but continuing for development purposes`);
    }

    logStep({
      requestId,
      stepName: 'auth:sms-login:success',
      stepSequence: stepSequence++,
      status: 'success',
      outputData: { userId: user.id, phoneNumber }
    });

    return res.status(200).json({
      success: true,
      message: "Doğrulama kodu gönderildi",
      data: {
        userId: user.id,
        message: `${phoneNumber} numarasına doğrulama kodu gönderildi`
      }
    });

  } catch (error) {
    logStep({
      requestId,
      stepName: 'auth:sms-login:error',
      stepSequence: stepSequence++,
      status: 'failure',
      error
    });
    logger.error("SMS login error", error);
    return res.status(500).json({ success: false, message: error.message || "Sunucu hatası" });
  }
};

// Verify SMS code and complete login
exports.verifySmsLogin = async (req, res) => {
  const requestId = uuidv4();
  let stepSequence = 1;

  try {
    logger.info(`[VERIFY_SMS] req.body:`, req.body);
    logStep({
      requestId,
      stepName: 'auth:verify-sms:start',
      stepSequence: stepSequence++,
      serviceName: 'Express',
      endpoint: '/auth/verify-sms',
      inputData: req.body
    });

    const { userId, verificationCode, rememberMe } = req.body;

    if (!userId || !verificationCode) {
      return res.status(400).json({ success: false, message: "Kullanıcı ID ve doğrulama kodu gerekli" });
    }

    // Get user and check verification code
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select("*")
      .eq("id", userId)
      .single();

    if (fetchError || !user) {
      logger.error('[VERIFY_SMS] Error fetching user:', fetchError);
      return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı" });
    }

    // Check if verification code matches and is not expired
    if (!user.verificationtoken || user.verificationtoken !== verificationCode) {
      logger.warn(`[VERIFY_SMS] Invalid verification code for user ${userId}`);
      return res.status(400).json({ success: false, message: "Geçersiz doğrulama kodu" });
    }

    if (!user.verificationexpires || new Date() > new Date(user.verificationexpires)) {
      logger.warn(`[VERIFY_SMS] Expired verification code for user ${userId}`);
      return res.status(400).json({ success: false, message: "Doğrulama kodu süresi dolmuş. Yeni kod talep edin." });
    }

    // Clear verification code and mark as verified
    const { error: updateError } = await supabase
      .from('users')
      .update({
        verificationtoken: null,
        verificationexpires: null,
        isverified: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId);

    if (updateError) {
      logger.error('[VERIFY_SMS] Error clearing verification code:', updateError);
      return res.status(500).json({ success: false, message: "Giriş tamamlanamadı" });
    }

    // Generate tokens
    const token = generateToken(user.id, user.email, user.role, rememberMe);
    const refreshToken = generateRefreshToken(user.id);

    // Remove sensitive data
    delete user.password;
    delete user.verificationtoken;
    delete user.resetPasswordToken;

    logStep({
      requestId,
      stepName: 'auth:verify-sms:success',
      stepSequence: stepSequence++,
      status: 'success',
      outputData: { userId: user.id }
    });

    return res.status(200).json({
      success: true,
      message: "SMS doğrulama başarılı, giriş yapıldı",
      data: {
        user,
        token,
        refreshToken
      }
    });

  } catch (error) {
    logStep({
      requestId,
      stepName: 'auth:verify-sms:error',
      stepSequence: stepSequence++,
      status: 'failure',
      error
    });
    logger.error("SMS verification error", error);
    return res.status(500).json({ success: false, message: error.message || "Sunucu hatası" });
  }
};

// Mock SMS sending function (replace with real SMS service)
async function sendSMS(phoneNumber, message) {
  // For development, just log the SMS
  logger.info(`[SMS] MOCK SMS to ${phoneNumber}: ${message}`);
  
  // In production, integrate with a real SMS provider like:
  // - Twilio
  // - Nexmo/Vonage  
  // - Turkish SMS providers (Netgsm, İleti Merkezi, etc.)
  
  // Example Twilio integration (commented out):
  /*
  const twilio = require('twilio');
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  
  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber
  });
  */
  
  // For now, just simulate success
  return Promise.resolve();
}
