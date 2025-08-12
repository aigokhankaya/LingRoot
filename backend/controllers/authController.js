const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const logger = require("../utils/logger");
const { logStep } = require('../utils/stepLogger');
const { v4: uuidv4 } = require('uuid');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = process.env.JWT_SECRET || "lingroot-secret-key-for-development";
// Make tokens effectively non-expiring by default (very long lifetime)
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "3650d"; // ~10 years
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "lingroot-refresh-secret-key";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "3650d"; // ~10 years

logger.info('Supabase URL:', supabaseUrl);
logger.info('Supabase Service Key exists:', !!supabaseKey);
logger.info('JWT_SECRET exists:', !!JWT_SECRET);

// Always issue a long-lived token based on env config
const generateToken = (id, email, role, _rememberMe = false) => {
  return jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
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

    // Validate phone number format (simple validation, can be enhanced)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({ success: false, message: "Geçersiz telefon numarası formatı" });
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

    // Check if phone number already exists
    const { data: existingPhone, error: phoneFetchError } = await supabase
      .from('users')
      .select("id")
      .eq("phonenumber", phoneNumber)
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
          phonenumber: phoneNumber,
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
    const { email, password, rememberMe } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Lütfen e-posta ve şifre girin" });
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
        logger.info('[LOGIN] Mock auth mode enabled - allowing mock login for:', email);
        
        const mockUser = {
          id: 'dev-user-123',
          email: email,
          name: 'Development User',
          role: 'user',
          membership_status: 'premium',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        mockUser.full_name = mockUser.name;
        
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

    const { data: user, error } = await supabase
      .from('users')
      .select("*")
      .eq("email", email)
      .single();
    if (error) logger.error('[LOGIN] Error fetching user:', error);

    if (error || !user || !(await bcrypt.compare(password, user.password))) {
      logger.warn('[LOGIN] Invalid credentials for email:', email);
      return res.status(401).json({ success: false, message: "Geçersiz e-posta veya şifre" });
    }

    // Build a robust full_name on backend to simplify clients
    const safeFirst = user.firstname || user.firstName || '';
    const safeLast = user.lastname || user.lastName || '';
    const safeFull = [safeFirst, safeLast].filter(Boolean).join(' ').trim();

    const token = generateToken(user.id, user.email, user.role, rememberMe);
    const refreshToken = generateRefreshToken(user.id);

    // Remove sensitive data before sending response
    delete user.password;
    delete user.verificationToken;
    delete user.resetPasswordToken;

     // Attach normalized name fields
    user.full_name = safeFull;
    user.name = safeFull;

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
    
    // Credential'ın tipini belirle (JWT vs Access Token)
    // JWT'ler 3 bölümden oluşur: header.payload.signature
    const parts = credential.split('.');
    const isJWT = parts.length === 3;
    
    console.log('[GOOGLE_LOGIN] Credential analizi:');
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
        const axios = require('axios');
        
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
      message: "Google ile giriş başarılı",
      data: {
        user,
        token,
        refreshToken
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

// 6 haneli sayısal kod üretir
function generateNumericCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;

    // Kullanıcı var/yok demeden OK dön (enum. engelle)
    if (!user) return res.json({ success: true, message: 'If the email exists, a reset code has been sent.' });

    const code = generateNumericCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 dk

    const { error: updErr } = await supabase
      .from('users')
      .update({ 
        // Use snake_case columns in production
        reset_password_token: code,
        reset_password_expires: expiresAt
      })
      .eq('id', user.id);
    if (updErr) throw updErr;

    // Mail gönder (SMTP varsa), yoksa logla
    try {
      const { sendMail } = require('../utils/mailer');
      await sendMail({
        to: email,
        subject: 'Şifre Sıfırlama Kodu',
        text: `Şifre sıfırlama kodunuz: ${code}\n\nKod 15 dakika geçerlidir.`,
      });
    } catch (mailErr) {
      logger.warn('Reset email send skipped or failed (logged instead):', mailErr?.message);
      logger.info(`[RESET-FALLBACK] Code for ${email}: ${code}`);
    }

    return res.json({ success: true, message: 'Reset code sent if email exists.' });
  } catch (e) {
    logger.error('forgotPassword error:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, code and newPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Yeni şifre en az 6 karakter olmalıdır' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, reset_password_token, reset_password_expires, resetPasswordToken, resetPasswordExpires')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    const token = user?.reset_password_token || user?.resetPasswordToken;
    const expires = user?.reset_password_expires || user?.resetPasswordExpires;
    if (!user || !token || !expires) {
      return res.status(400).json({ success: false, message: 'Geçersiz sıfırlama talebi' });
    }
    if (token !== code) {
      return res.status(400).json({ success: false, message: 'Kod geçersiz' });
    }
    if (new Date(expires).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'Kodun süresi doldu' });
    }

    const hashed = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
    const { error: updErr } = await supabase
      .from('users')
      .update({ 
        password: hashed, 
        reset_password_token: null,
        reset_password_expires: null,
        // tolerate camelCase fields if they exist
        resetPasswordToken: null,
        resetPasswordExpires: null,
        updated_at: new Date().toISOString() 
      })
      .eq('id', user.id);
    if (updErr) throw updErr;

    return res.json({ success: true, message: 'Şifre başarıyla güncellendi' });
  } catch (e) {
    logger.error('resetPassword error:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.verifyEmail = async (req, res) => {
  return res.status(501).json({ success: false, message: "E-posta doğrulama fonksiyonu henüz hazır değil" });
};

// Duplicate function removed - using the main googleLogin function above
