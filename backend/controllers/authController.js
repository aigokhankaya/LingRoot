const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { supabase } = require("../utils/supabaseClient");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const logger = require("../utils/logger");
const { logStep } = require('../utils/stepLogger');
const { v4: uuidv4 } = require('uuid');
const { sendRegistrationNotification } = require('../utils/registrationNotifier');

const JWT_SECRET = process.env.JWT_SECRET || "lingroot-secret-key-for-development";
// Make tokens effectively non-expiring by default (very long lifetime)
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "3650d"; // ~10 years
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "lingroot-refresh-secret-key";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "3650d"; // ~10 years

logger.info('JWT_SECRET exists:', !!JWT_SECRET);

// Always issue a long-lived token based on env config
const generateToken = (id, email, role, _rememberMe = false) => {
  return jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Exchange a valid refresh token for a new access token (and rotate refresh token)
exports.refreshToken = async (req, res) => {
  try {
    // Accept refresh token from Authorization header or request body for flexibility
    let refreshToken = null;
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      refreshToken = authHeader.split(' ')[1];
    }
    if (!refreshToken) {
      refreshToken = (req.body && (req.body.refreshToken || req.body.refresh_token)) || null;
    }

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token gerekli' });
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const userId = payload && payload.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Ensure user still exists and is active
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, isverified')
      .eq('id', userId)
      .maybeSingle();
    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    if (!user.isverified) {
      return res.status(403).json({ success: false, message: 'Hesap doğrulanmamış' });
    }

    const accessToken = generateToken(user.id, user.email, user.role, true);
    const newRefreshToken = generateRefreshToken(user.id);

    return res.json({
      success: true,
      message: 'Token yenilendi',
      data: {
        token: accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (err) {
    logger.error('Refresh token error:', err);
    return res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

const generateRefreshToken = (id) =>
  jwt.sign({ id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });

// Helper: record login attempt (best-effort)
async function recordLoginAttempt(userId, req, { success, message }) {
  try {
    const ipFromHeader = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
    const ip = ipFromHeader || req.ip || req.connection?.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    // If userId is falsy and your table requires it, skip to avoid errors
    if (!userId) {
      return;
    }

    logger.info('[LOGIN_HISTORY] Attempt', { userId, ip, hasUA: !!userAgent, success, message });

    const { error } = await supabase
      .from('login_history')
      .insert([
        {
          user_id: userId,
          ip,
          user_agent: userAgent,
          success: !!success,
          message: message || null,
          created_at: new Date().toISOString(),
        },
      ]);
    if (error) {
      logger.warn('[LOGIN_HISTORY] Insert failed:', error);
    } else {
      logger.info('[LOGIN_HISTORY] Insert ok');
    }
  } catch (e) {
    // Table may not exist or permission may be missing; do not fail login
    logger.warn('[LOGIN_HISTORY] Skipping write:', e?.message);
  }
}

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

    // Assign Free Trial plan (3 audio creation credits)
    try {
      const { data: trialPlan, error: planErr } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('name', 'Free Trial')
        .eq('is_active', true)
        .maybeSingle();
      
      if (!planErr && trialPlan) {
        // Trial süresiz - sadece 3 ses oluşturma hakkı
        await supabase
          .from('subscriptions')
          .insert([
            {
              user_id: newUser[0].id,
              plan_id: trialPlan.id,
              status: 'active', // Trial değil, aktif - kullanım hakkı bazlı
              current_period_end: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString(), // 1 yıl (süresiz gibi)
              cancel_at_period_end: false,
              audio_creation_count: 0, // Başlangıç sayacı
            },
          ]);
        logger.info(`[REGISTER] Free Trial plan assigned to user ${newUser[0].id}`);
      }
    } catch (e) {
      logger.warn('[REGISTER] Failed to assign Free Trial plan:', e?.message);
    }

    // Send registration notification to support team
    try {
      await sendRegistrationNotification(newUser[0]);
    } catch (notificationErr) {
      logger.warn('[REGISTER] Registration notification failed:', notificationErr?.message);
    }

    // Generate email verification token and send activation email
    try {
      const verificationCode = generateNumericCode();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error: verErr } = await supabase
        .from('users')
        .update({
          verification_token: verificationCode,
          verification_expires: verificationExpires,
          updated_at: new Date().toISOString(),
        })
        .eq('id', newUser[0].id);
      if (verErr) {
        logger.warn('[REGISTER] Failed to set verification token:', verErr);
      } else {
        // Prefer sending users to the frontend verification page
        const frontendBaseUrl = process.env.FRONTEND_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_FRONTEND_URL || '';
        const verifyUrl = frontendBaseUrl
          ? `${frontendBaseUrl.replace(/\/$/, '')}/verify?token=${encodeURIComponent(verificationCode)}`
          : `${req.protocol}://${req.get('host')}/api/auth/verify-email/${encodeURIComponent(verificationCode)}`;

        try {
          const { sendMail } = require('../utils/mailer');
          const fullName = [newUser[0].firstname, newUser[0].lastname].filter(Boolean).join(' ').trim() || 'LingRoot Kullanıcısı';
          await sendMail({
            to: newUser[0].email,
            subject: 'LingRoot Hesap Aktivasyonu',
            text: `Merhaba ${fullName},\n\nHesabınızı aktifleştirmek için aşağıdaki bağlantıya tıklayın:\n${verifyUrl}\n\nBağlantı 24 saat geçerlidir.\n\nTeşekkürler,\nLingRoot Ekibi`,
            html: `<p>Merhaba ${fullName},</p>
                   <p>Hesabınızı aktifleştirmek için aşağıdaki bağlantıya tıklayın:</p>
                   <p><a href="${verifyUrl}" target="_blank" rel="noopener noreferrer">Hesabımı Doğrula</a></p>
                   <p>Bağlantı 24 saat geçerlidir.</p>
                   <p>Teşekkürler,<br/>LingRoot Ekibi</p>`
          });
        } catch (mailErr) {
          logger.warn('[REGISTER] Activation email send failed or skipped:', mailErr?.message);
        }
      }
    } catch (e) {
      logger.warn('[REGISTER] Verification setup skipped due to error:', e?.message);
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
    const { email, password, rememberMe } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Lütfen e-posta ve şifre girin" });
    }

    // Mock auth disabled in production

    const { data: user, error } = await supabase
      .from('users')
      .select("*")
      .eq("email", email)
      .single();
    if (error) logger.error('[LOGIN] Error fetching user:', error);

    if (error || !user || !(await bcrypt.compare(password, user.password))) {
      logger.warn('[LOGIN] Invalid credentials for email:', email);
      // Record failed attempt only if user exists (to avoid user enumeration)
      if (user?.id) {
        await recordLoginAttempt(user.id, req, { success: false, message: 'invalid_credentials' });
      }
      return res.status(401).json({ success: false, message: "Geçersiz e-posta veya şifre" });
    }

    // Require verified email before allowing login
    if (!user.isverified) {
      logger.warn('[LOGIN] Unverified account tried to login:', email);
      // Optionally record attempt for diagnostics
      try { await recordLoginAttempt(user.id, req, { success: false, message: 'email_not_verified' }); } catch {}
      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Hesabınız henüz doğrulanmadı. Lütfen e-postanıza gönderilen aktivasyon bağlantısına tıklayarak hesabınızı doğrulayın.'
      });
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

    // Best-effort: record successful login
    try { await recordLoginAttempt(user.id, req, { success: true, message: 'login_success' }); } catch {}

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

// Facebook Login
exports.facebookLogin = async (req, res) => {
  try {
    const { credential, rememberMe } = req.body;
    
    if (!credential) {
      return res.status(400).json({ success: false, message: "Facebook access token gerekli" });
    }

    // Facebook Graph API'den kullanıcı bilgilerini al
    const axios = require('axios');
    let facebookUser;
    
    try {
      const response = await axios.get(
        `https://graph.facebook.com/me?fields=id,name,email,first_name,last_name,picture.type(large)&access_token=${credential}`
      );
      facebookUser = response.data;
      
      console.log('[FACEBOOK_LOGIN] Kullanıcı bilgileri alındı:', { email: facebookUser.email, name: facebookUser.name });
    } catch (fbError) {
      logger.error('[FACEBOOK_LOGIN] Facebook API hatası:', fbError);
      return res.status(400).json({ success: false, message: "Geçersiz Facebook access token" });
    }

    const { email, name, first_name, last_name } = facebookUser;
    
    if (!email) {
      return res.status(400).json({ success: false, message: "Facebook hesabından email alınamadı" });
    }

    // Kullanıcının zaten var olup olmadığını kontrol et
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (fetchError) {
      logger.error('[FACEBOOK_LOGIN] Kullanıcı sorgulama hatası:', fetchError);
      return res.status(500).json({ success: false, message: "Veritabanı hatası" });
    }

    let user;
    
    if (existingUser) {
      // Mevcut kullanıcı - email doğrulanmış mı kontrol et
      if (!existingUser.isverified) {
        return res.status(403).json({ 
          success: false, 
          message: "Email adresiniz doğrulanmamış. Lütfen email adresinize gönderilen doğrulama linkine tıklayın.",
          code: "EMAIL_NOT_VERIFIED"
        });
      }

      // Kullanıcı aktif, giriş yapabilir
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ updated_at: new Date().toISOString() })
        .eq("id", existingUser.id)
        .select()
        .single();

      if (updateError) {
        logger.error('[FACEBOOK_LOGIN] Kullanıcı güncelleme hatası:', updateError);
        return res.status(500).json({ success: false, message: "Kullanıcı güncellenemedi" });
      }

      user = updatedUser;
    } else {
      // Yeni kullanıcı oluştur
      const newUserData = {
        firstname: first_name || name?.split(' ')[0] || 'Facebook',
        lastname: last_name || name?.split(' ').slice(1).join(' ') || 'User',
        email: email,
        phonenumber: null,
        password: 'facebook-oauth',
        role: "user",
        isverified: true,
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
        logger.error('[FACEBOOK_LOGIN] Kullanıcı oluşturma hatası:', createError);
        return res.status(500).json({ success: false, message: "Kullanıcı oluşturulamadı" });
      }

      user = createdUser;
      
      // Send registration notification
      try {
        await sendRegistrationNotification(user);
      } catch (notificationErr) {
        logger.warn('[FACEBOOK_LOGIN] Registration notification failed:', notificationErr?.message);
      }
      
      // Assign Free Trial plan
      try {
        const { data: trialPlan, error: planErr } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('name', 'Free Trial')
          .eq('is_active', true)
          .maybeSingle();
        
        if (!planErr && trialPlan) {
          await supabase
            .from('subscriptions')
            .insert([
              {
                user_id: user.id,
                plan_id: trialPlan.id,
                status: 'active',
                current_period_end: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString(),
                cancel_at_period_end: false,
                audio_creation_count: 0,
              },
            ]);
          logger.info(`[FACEBOOK_LOGIN] Free Trial plan assigned to user ${user.id}`);
        }
      } catch (e2) {
        logger.warn('[FACEBOOK_LOGIN] Failed to assign Free Trial plan:', e2?.message);
      }
    }

    const token = generateToken(user.id, user.email, user.role, rememberMe);
    const refreshToken = generateRefreshToken(user.id);

    delete user.password;
    delete user.verificationToken;
    delete user.resetPasswordToken;

    try { await recordLoginAttempt(user.id, req, { success: true, message: 'facebook_login_success' }); } catch {}

    return res.status(200).json({
      success: true,
      message: "Facebook ile giriş başarılı",
      data: {
        user,
        token,
        refreshToken
      }
    });

  } catch (error) {
    logger.error("Facebook login error", error);
    return res.status(500).json({ success: false, message: error.message || "Sunucu hatası" });
  }
};

// Apple Login
exports.appleLogin = async (req, res) => {
  try {
    const { credential, rememberMe, email: providedEmail, name: providedName } = req.body;
    
    if (!credential) {
      return res.status(400).json({ success: false, message: "Apple identity token gerekli" });
    }

    // Apple identity token'ı decode et (JWT)
    let appleUser;
    
    try {
      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      appleUser = JSON.parse(jsonPayload);
      
      console.log('[APPLE_LOGIN] Token decode başarılı:', { sub: appleUser.sub, email: appleUser.email });
    } catch (decodeError) {
      logger.error('[APPLE_LOGIN] Token decode hatası:', decodeError);
      return res.status(400).json({ success: false, message: "Geçersiz Apple identity token" });
    }

    // Apple ilk girişte email veriyor, sonraki girişlerde vermiyor
    // Bu yüzden providedEmail parametresini de kontrol ediyoruz
    const email = appleUser.email || providedEmail;
    const appleSub = appleUser.sub; // Apple'ın unique user ID'si
    
    if (!email && !appleSub) {
      return res.status(400).json({ success: false, message: "Apple hesabından email veya kullanıcı ID alınamadı" });
    }

    // Kullanıcıyı email veya Apple sub ile bul
    let existingUser = null;
    
    if (email) {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select("*")
        .eq("email", email)
        .maybeSingle();
      
      if (!fetchError) existingUser = data;
    }

    let user;
    
    if (existingUser) {
      // Mevcut kullanıcı - email doğrulanmış mı kontrol et
      if (!existingUser.isverified) {
        return res.status(403).json({ 
          success: false, 
          message: "Email adresiniz doğrulanmamış. Lütfen email adresinize gönderilen doğrulama linkine tıklayın.",
          code: "EMAIL_NOT_VERIFIED"
        });
      }

      // Kullanıcı aktif, giriş yapabilir
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ updated_at: new Date().toISOString() })
        .eq("id", existingUser.id)
        .select()
        .single();

      if (updateError) {
        logger.error('[APPLE_LOGIN] Kullanıcı güncelleme hatası:', updateError);
        return res.status(500).json({ success: false, message: "Kullanıcı güncellenemedi" });
      }

      user = updatedUser;
    } else {
      // Yeni kullanıcı oluştur
      // Apple name bilgisini providedName'den al (ilk girişte mobil taraftan gönderilir)
      const firstName = providedName?.split(' ')[0] || 'Apple';
      const lastName = providedName?.split(' ').slice(1).join(' ') || 'User';
      
      const newUserData = {
        firstname: firstName,
        lastname: lastName,
        email: email || `apple_${appleSub}@lingroot.app`, // Email yoksa placeholder
        phonenumber: null,
        password: 'apple-oauth',
        role: "user",
        isverified: true,
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
        logger.error('[APPLE_LOGIN] Kullanıcı oluşturma hatası:', createError);
        return res.status(500).json({ success: false, message: "Kullanıcı oluşturulamadı" });
      }

      user = createdUser;
      
      // Send registration notification
      try {
        await sendRegistrationNotification(user);
      } catch (notificationErr) {
        logger.warn('[APPLE_LOGIN] Registration notification failed:', notificationErr?.message);
      }
      
      // Assign Free Trial plan
      try {
        const { data: trialPlan, error: planErr } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('name', 'Free Trial')
          .eq('is_active', true)
          .maybeSingle();
        
        if (!planErr && trialPlan) {
          await supabase
            .from('subscriptions')
            .insert([
              {
                user_id: user.id,
                plan_id: trialPlan.id,
                status: 'active',
                current_period_end: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString(),
                cancel_at_period_end: false,
                audio_creation_count: 0,
              },
            ]);
          logger.info(`[APPLE_LOGIN] Free Trial plan assigned to user ${user.id}`);
        }
      } catch (e2) {
        logger.warn('[APPLE_LOGIN] Failed to assign Free Trial plan:', e2?.message);
      }
    }

    const token = generateToken(user.id, user.email, user.role, rememberMe);
    const refreshToken = generateRefreshToken(user.id);

    delete user.password;
    delete user.verificationToken;
    delete user.resetPasswordToken;

    try { await recordLoginAttempt(user.id, req, { success: true, message: 'apple_login_success' }); } catch {}

    return res.status(200).json({
      success: true,
      message: "Apple ile giriş başarılı",
      data: {
        user,
        token,
        refreshToken
      }
    });

  } catch (error) {
    logger.error("Apple login error", error);
    return res.status(500).json({ success: false, message: error.message || "Sunucu hatası" });
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
      // Mevcut kullanıcı - email doğrulanmış mı kontrol et
      if (!existingUser.isverified) {
        return res.status(403).json({ 
          success: false, 
          message: "Email adresiniz doğrulanmamış. Lütfen email adresinize gönderilen doğrulama linkine tıklayın.",
          code: "EMAIL_NOT_VERIFIED"
        });
      }

      // Kullanıcı aktif, giriş yapabilir
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ updated_at: new Date().toISOString() })
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
      
      // Send registration notification to support team for new Google users
      try {
        await sendRegistrationNotification(user);
      } catch (notificationErr) {
        logger.warn('[GOOGLE_LOGIN] Registration notification failed:', notificationErr?.message);
      }
      
      // Assign Free Trial plan (3 audio creation credits) for Google new users
      try {
        const { data: trialPlan, error: planErr } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('name', 'Free Trial')
          .eq('is_active', true)
          .maybeSingle();
        
        if (!planErr && trialPlan) {
          // Trial süresiz - sadece 3 ses oluşturma hakkı
          await supabase
            .from('subscriptions')
            .insert([
              {
                user_id: user.id,
                plan_id: trialPlan.id,
                status: 'active', // Trial değil, aktif - kullanım hakkı bazlı
                current_period_end: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString(), // 1 yıl (süresiz gibi)
                cancel_at_period_end: false,
                audio_creation_count: 0, // Başlangıç sayacı
              },
            ]);
          logger.info(`[GOOGLE_LOGIN] Free Trial plan assigned to user ${user.id}`);
        }
      } catch (e2) {
        logger.warn('[GOOGLE_LOGIN] Failed to assign Free Trial plan:', e2?.message);
      }
    }

    // JWT token oluştur
    const token = generateToken(user.id, user.email, user.role, rememberMe);
    const refreshToken = generateRefreshToken(user.id);

    // Hassas verileri kaldır
    delete user.password;
    delete user.verificationToken;
    delete user.resetPasswordToken;

    // Best-effort: record successful Google login
    try { await recordLoginAttempt(user.id, req, { success: true, message: 'google_login_success' }); } catch {}

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

function parseExpiryMs(expires) {
  try {
    if (!expires) return 0;
    if (expires instanceof Date) return expires.getTime();
    let s = String(expires);
    // Normalize: replace space with T
    s = s.replace(' ', 'T');
    // If no timezone info, assume UTC
    if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) s += 'Z';
    const ms = Date.parse(s);
    return Number.isNaN(ms) ? 0 : ms;
  } catch {
    return 0;
  }
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
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 60 dk

    const { error: updErr } = await supabase
      .from('users')
      .update({ 
        // Use snake_case columns in production
        reset_password_token: code,
        reset_password_expires: expiresAt
      })
      .eq('id', user.id);
    if (updErr) throw updErr;

    // TEST LOG: Print reset code to backend logs for quick testing
    logger.info(`[RESET-CODE] email=${email} code=${code} expires=${expiresAt}`);

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
      .select('id, reset_password_token, reset_password_expires')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    const token = user?.reset_password_token;
    const expires = user?.reset_password_expires;
    if (!user || !token || !expires) {
      return res.status(400).json({ success: false, message: 'Geçersiz sıfırlama talebi' });
    }
    if (token !== code) {
      return res.status(400).json({ success: false, message: 'Kod geçersiz' });
    }
    const expiresMs = parseExpiryMs(expires);
    // Allow 2 minutes clock skew
    if (expiresMs < Date.now() - 2 * 60 * 1000) {
      return res.status(400).json({ success: false, message: 'Kodun süresi doldu' });
    }

    const hashed = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
    const { error: updErr } = await supabase
      .from('users')
      .update({ 
        password: hashed, 
        reset_password_token: null,
        reset_password_expires: null,
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
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Doğrulama tokenı gerekli' });
    }

    // Find user by verification token
    const { data: user, error } = await supabase
      .from('users')
      .select('id, verification_token, verification_expires, isverified')
      .eq('verification_token', token)
      .maybeSingle();

    if (error) {
      logger.error('[VERIFY_EMAIL] User fetch error:', error);
      return res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
    if (!user) {
      return res.status(400).json({ success: false, message: 'Geçersiz veya kullanılmış doğrulama bağlantısı' });
    }

    // Check expiry
    const expiresMs = parseExpiryMs(user.verification_expires);
    if (!expiresMs || expiresMs < Date.now() - 2 * 60 * 1000) {
      return res.status(400).json({ success: false, message: 'Doğrulama bağlantısının süresi dolmuş' });
    }

    // Update user as verified and clear token
    const { error: updErr } = await supabase
      .from('users')
      .update({
        isverified: true,
        verification_token: null,
        verification_expires: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updErr) {
      logger.error('[VERIFY_EMAIL] Update error:', updErr);
      return res.status(500).json({ success: false, message: 'Doğrulama işlemi tamamlanamadı' });
    }

    return res.json({ success: true, message: 'E-posta başarıyla doğrulandı. Artık giriş yapabilirsiniz.' });
  } catch (e) {
    logger.error('[VERIFY_EMAIL] Unexpected error:', e);
    return res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// Resend verification email for unverified users
exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, message: 'E-posta gerekli' });
    }

    // Fetch user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, firstname, lastname, isverified')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      logger.error('[RESEND_VERIFY] User fetch error:', error);
      return res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }

    // Always respond OK to avoid user enumeration, but if user exists and not verified, proceed to send
    if (!user) {
      return res.json({ success: true, message: 'Eğer e-posta sistemimizde kayıtlıysa, aktivasyon e-postası gönderildi.' });
    }

    if (user.isverified) {
      return res.json({ success: true, message: 'Hesabınız zaten doğrulanmış. Giriş yapabilirsiniz.' });
    }

    // Generate new token and expiry (e.g., 24 hours)
    const code = generateNumericCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: updErr } = await supabase
      .from('users')
      .update({
        verification_token: code,
        verification_expires: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    if (updErr) {
      logger.error('[RESEND_VERIFY] Update token error:', updErr);
      return res.status(500).json({ success: false, message: 'Aktivasyon e-postası gönderilemedi' });
    }

    // Prefer sending users to the frontend verification page
    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_FRONTEND_URL || '';
    const verifyUrl = frontendBaseUrl
      ? `${frontendBaseUrl.replace(/\/$/, '')}/verify?token=${encodeURIComponent(code)}`
      : `${req.protocol}://${req.get('host')}/api/auth/verify-email/${encodeURIComponent(code)}`;

    try {
      const { sendMail } = require('../utils/mailer');
      const fullName = [user.firstname, user.lastname].filter(Boolean).join(' ').trim() || 'LingRoot Kullanıcısı';
      await sendMail({
        to: email,
        subject: 'LingRoot Hesap Aktivasyonu',
        text: `Merhaba ${fullName},\n\nHesabınızı aktifleştirmek için aşağıdaki bağlantıya tıklayın:\n${verifyUrl}\n\nBağlantı 24 saat geçerlidir.\n\nTeşekkürler,\nLingRoot Ekibi`,
        html: `<p>Merhaba ${fullName},</p>
               <p>Hesabınızı aktifleştirmek için aşağıdaki bağlantıya tıklayın:</p>
               <p><a href="${verifyUrl}" target="_blank" rel="noopener noreferrer">Hesabımı Doğrula</a></p>
               <p>Bağlantı 24 saat geçerlidir.</p>
               <p>Teşekkürler,<br/>LingRoot Ekibi</p>`
      });
    } catch (mailErr) {
      logger.warn('[RESEND_VERIFY] Send mail failed or logged:', mailErr?.message);
    }

    return res.json({ success: true, message: 'Aktivasyon e-postası gönderildi. Lütfen e-posta kutunuzu kontrol edin.' });
  } catch (e) {
    logger.error('[RESEND_VERIFY] Unexpected error:', e);
    return res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// Duplicate function removed - using the main googleLogin function above
