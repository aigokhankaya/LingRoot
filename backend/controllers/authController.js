const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { supabase } = require('../utils/storage/supabaseClient.js');
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const logger = require('../utils/common/logger.js');
const { logStep } = require('../utils/common/stepLogger.js');
const { v4: uuidv4 } = require('uuid');
const { sendRegistrationNotification } = require('../utils/notifications/registrationNotifier.js');
const { sendMail } = require('../utils/notifications/mailer.js');
const { googleLoginService, facebookLoginService, appleLoginService } = require('../services/oauthService.js');

// Dummy hash for constant-time comparison when user is not found (timing attack prevention)
const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

const _JWT_SECRET = process.env.JWT_SECRET;
const _JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// CRITICAL SECURITY CHECK
if (process.env.NODE_ENV === 'production') {
  if (!_JWT_SECRET || _JWT_SECRET === "lingroot-secret-key-for-development") {
    logger.error('🚨 [SECURITY_CRITICAL] JWT_SECRET is not set or using default insecure key in PRODUCTION! Exiting...');
    process.exit(1);
  }
  if (!_JWT_REFRESH_SECRET || _JWT_REFRESH_SECRET === "lingroot-refresh-secret-key") {
    logger.error('🚨 [SECURITY_CRITICAL] JWT_REFRESH_SECRET is not set or using default insecure key in PRODUCTION! Exiting...');
    process.exit(1);
  }
} else {
  // Development fallbacks
  if (!_JWT_SECRET) logger.warn('⚠️ [SECURITY_WARN] JWT_SECRET not set, using insecure dev default.');
  if (!_JWT_REFRESH_SECRET) logger.warn('⚠️ [SECURITY_WARN] JWT_REFRESH_SECRET not set, using insecure dev default.');
}

const JWT_SECRET = _JWT_SECRET || "lingroot-secret-key-for-development";
const JWT_REFRESH_SECRET = _JWT_REFRESH_SECRET || "lingroot-refresh-secret-key";

// Token expiration defaults
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";  // 15 minutes
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d"; // 7 days

// Email verification token expiry (48 hours for international timezone support)
const VERIFICATION_TOKEN_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours

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
      return res.status(400).json({ success: false, code: 'TOKEN_REQUIRED', message: 'Refresh token gerekli' });
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (e) {
      return res.status(401).json({ success: false, code: 'INVALID_TOKEN', message: 'Invalid token' });
    }

    const userId = payload && payload.id;
    if (!userId) {
      return res.status(401).json({ success: false, code: 'INVALID_TOKEN', message: 'Invalid token' });
    }

    // Ensure user still exists and is active
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, isverified')
      .eq('id', userId)
      .maybeSingle();
    if (error || !user) {
      return res.status(401).json({ success: false, code: 'INVALID_TOKEN', message: 'Invalid token' });
    }
    if (!user.isverified) {
      return res.status(403).json({ success: false, code: 'EMAIL_NOT_VERIFIED', message: 'Hesap doğrulanmamış' });
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
    // Filter password from logs for security
    const { password: _pwd, ...safeBody } = req.body;
    logger.info(`[REGISTER] req.body:`, safeBody);
    logStep({
      requestId,
      stepName: 'auth:register:start',
      stepSequence: stepSequence++,
      serviceName: 'Express',
      endpoint: '/auth/register',
      inputData: safeBody
    });
    logger.info("Register request received", { body: safeBody });
    const { firstName, lastName, email, phoneNumber, password, locale } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_INPUT',
        message: "Lütfen tüm zorunlu alanları doldurun (isim, soyisim, e-posta, telefon ve şifre)"
      });
    }

    // Sanitize and normalize inputs
    const sanitizeName = (name) => name.trim().replace(/[<>"&]/g, '');
    const sanitizedFirstName = sanitizeName(firstName);
    const sanitizedLastName = sanitizeName(lastName);
    const normalizedEmail = email.toLowerCase().trim();

    // Validate name length
    if (sanitizedFirstName.length < 2 || sanitizedLastName.length < 2) {
      return res.status(400).json({ success: false, code: 'NAME_TOO_SHORT', message: "İsim en az 2 karakter olmalıdır" });
    }
    if (sanitizedFirstName.length > 50 || sanitizedLastName.length > 50) {
      return res.status(400).json({ success: false, code: 'NAME_TOO_LONG', message: "İsim 50 karakterden uzun olamaz" });
    }

    // Validate email format and length
    if (normalizedEmail.length > 255) {
      return res.status(400).json({ success: false, code: 'EMAIL_TOO_LONG', message: "E-posta 255 karakterden uzun olamaz" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, code: 'INVALID_EMAIL', message: "Geçersiz e-posta formatı" });
    }

    // Validate phone number format (simple validation, can be enhanced)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({ success: false, code: 'INVALID_PHONE', message: "Geçersiz telefon numarası formatı" });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ success: false, code: 'PASSWORD_TOO_SHORT', message: "Şifre en az 8 karakter olmalıdır" });
    }
    if (password.length > 128) {
      return res.status(400).json({ success: false, code: 'PASSWORD_TOO_LONG', message: "Şifre 128 karakterden uzun olamaz" });
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ success: false, code: 'PASSWORD_TOO_WEAK', message: "Şifre en az 1 küçük harf, 1 büyük harf ve 1 rakam içermelidir" });
    }

    // Check if email already exists (case-insensitive)
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select("email")
      .ilike("email", normalizedEmail)
      .maybeSingle();
    if (fetchError) logger.error('[REGISTER] Error fetching user for register:', fetchError);

    if (existingUser) {
      // Check if the existing user is unverified - offer resend option
      const { data: fullUser } = await supabase
        .from('users')
        .select('isverified')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (fullUser && !fullUser.isverified) {
        return res.status(400).json({
          success: false,
          code: 'EMAIL_NOT_VERIFIED_EXISTING',
          message: "Bu e-posta adresi daha önce kaydedilmiş ancak doğrulanmamış. Aktivasyon e-postası tekrar gönderilebilir.",
          data: { can_resend: true }
        });
      }

      return res.status(400).json({ success: false, code: 'EMAIL_IN_USE', message: "Bu e-posta adresi zaten kullanılıyor" });
    }

    // Check if phone number already exists
    const { data: existingPhone, error: phoneFetchError } = await supabase
      .from('users')
      .select("id")
      .eq("phonenumber", phoneNumber)
      .maybeSingle();
    if (phoneFetchError) logger.error('[REGISTER] Error fetching phone for register:', phoneFetchError);

    if (existingPhone) {
      return res.status(400).json({ success: false, code: 'PHONE_IN_USE', message: "Bu telefon numarası zaten kullanılıyor" });
    }

    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          firstname: sanitizedFirstName,
          lastname: sanitizedLastName,
          email: normalizedEmail,
          phonenumber: phoneNumber,
          password: hashedPassword,
          role: "user",
          isverified: false,
          verificationtoken: null, // Use explicit null instead of relying on default
          dailycontentused: 0,
          lastcontentdate: null,
          stripecustomerid: null,
          locale: locale || 'tr', // Default to 'tr' if not provided
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();
    if (insertError) logger.error('[REGISTER] Error inserting new user:', insertError);

    // Handle race condition: unique constraint violation
    if (insertError?.code === '23505') {
      if (insertError.message?.includes('email')) {
        return res.status(400).json({ success: false, code: 'EMAIL_IN_USE', message: "Bu e-posta adresi zaten kullanılıyor" });
      }
      if (insertError.message?.includes('phone')) {
        return res.status(400).json({ success: false, code: 'PHONE_IN_USE', message: "Bu telefon numarası zaten kullanılıyor" });
      }
    }

    if (insertError || !newUser?.length) {
      logger.error("User registration error:", insertError);
      return res.status(500).json({ success: false, code: 'REGISTRATION_FAILED', message: "Kullanıcı kaydı sırasında bir hata oluştu" });
    }

    const token = generateToken(newUser[0].id, newUser[0].email, newUser[0].role, false);
    const refreshToken = generateRefreshToken(newUser[0].id);

    // Assign Free Trial plan (3 audio creation credits)
    try {
      const { data: trialPlan, error: planErr } = await supabase
        .from('subscription_plans')
        .select('id, name, price, plantype, is_active, audio_limit, features, monthly_price, yearly_price, description, created_at')
        .eq('name', 'Free Trial')
        .eq('is_active', true)
        .maybeSingle();

      if (planErr) {
        logger.error('[REGISTER] Error fetching Free Trial plan:', planErr);
      } else if (!trialPlan) {
        logger.error('[REGISTER] Free Trial plan not found in database');
      } else {
        const { data: newSub, error: subErr } = await supabase
          .from('subscriptions')
          .insert([
            {
              user_id: newUser[0].id,
              plantype: 'Free Trial',
              stripepriceid: trialPlan.id, // Link to subscription_plans for features
              status: 'active',
              audio_creation_count: 0,
              startdate: new Date().toISOString(),
              enddate: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
          ])
          .select();

        if (subErr) {
          logger.error(`[REGISTER] Error inserting subscription for user ${newUser[0].id}:`, subErr);
        } else {
          logger.info(`[REGISTER] Free Trial plan assigned to user ${newUser[0].id}`, newSub);
        }
      }
    } catch (e) {
      logger.error('[REGISTER] Failed to assign Free Trial plan:', e?.message, e);
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
      const verificationExpires = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS).toISOString();
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
          const { sendMail } = require('../utils/notifications/mailer.js');
          const fullName = [newUser[0].firstname, newUser[0].lastname].filter(Boolean).join(' ').trim() || 'LingRoot Kullanıcısı';
          await sendMail({
            to: newUser[0].email,
            subject: 'LingRoot Hesap Aktivasyonu',
            text: `Merhaba ${fullName},\n\nHesabınızı aktifleştirmek için aşağıdaki bağlantıya tıklayın:\n${verifyUrl}\n\nBağlantı 48 saat geçerlidir.\n\nTeşekkürler,\nLingRoot Ekibi`,
            html: `<p>Merhaba ${fullName},</p>
                   <p>Hesabınızı aktifleştirmek için aşağıdaki bağlantıya tıklayın:</p>
                   <p><a href="${verifyUrl}" target="_blank" rel="noopener noreferrer">Hesabımı Doğrula</a></p>
                   <p>Bağlantı 48 saat geçerlidir.</p>
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
    return res.status(500).json({ success: false, code: 'SERVER_ERROR', message: error.message || "Sunucu hatası" });
  }
};

exports.login = async (req, res) => {
  try {
    logger.info('[LOGIN] req.body:', req.body);
    const { email, password, rememberMe } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, code: 'INVALID_INPUT', message: "Lütfen e-posta ve şifre girin" });
    }

    // Mock auth disabled in production

    const { data: user, error } = await supabase
      .from('users')
      .select("id, email, password, role, isverified, firstname, lastname, phonenumber, stripecustomerid, default_level, cefr_level, verificationtoken, resetpasswordtoken")
      .eq("email", email)
      .single();
    if (error) logger.error('[LOGIN] Error fetching user:', error);

    // Always run bcrypt.compare to prevent timing-based user enumeration
    const hashToCompare = (error || !user) ? DUMMY_HASH : user.password;
    const isPasswordValid = await bcrypt.compare(password, hashToCompare);
    if (error || !user || !isPasswordValid) {
      logger.warn('[LOGIN] Invalid credentials for email:', email);
      // Record failed attempt only if user exists (to avoid user enumeration)
      if (user?.id) {
        await recordLoginAttempt(user.id, req, { success: false, message: 'invalid_credentials' });
      }
      return res.status(401).json({ success: false, code: 'INVALID_CREDENTIALS', message: "Geçersiz e-posta veya şifre" });
    }

    // Require verified email before allowing login
    if (!user.isverified) {
      logger.warn('[LOGIN] Unverified account tried to login:', email);
      // Optionally record attempt for diagnostics
      try { await recordLoginAttempt(user.id, req, { success: false, message: 'email_not_verified' }); } catch { }
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
    delete user.verificationtoken;
    delete user.resetpasswordtoken;

    // Attach normalized name fields
    user.full_name = safeFull;
    user.name = safeFull;

    // Derive membershipStatus from role (column doesn't exist in DB)
    user.membershipStatus = user.role === 'premium' ? 'premium' : 'free';

    // Best-effort: record successful login
    try { await recordLoginAttempt(user.id, req, { success: true, message: 'login_success' }); } catch { }

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
    return res.status(500).json({ success: false, code: 'SERVER_ERROR', message: error.message || "Sunucu hatası" });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const { id } = req.user;
    const { data: user, error } = await supabase
      .from('users')
      .select("id, email, role, isverified, firstname, lastname, phonenumber, stripecustomerid, default_level, cefr_level, created_at, updated_at")
      .eq("id", id)
      .single();

    if (error || !user) {
      return res.status(404).json({ success: false, code: 'USER_NOT_FOUND', message: "Kullanıcı bulunamadı" });
    }

    // Remove sensitive data
    delete user.password;
    delete user.verificationtoken;
    delete user.resetpasswordtoken;

    // Normalize user fields for frontend
    user.role = user.role || 'user';
    user.membershipStatus = user.role === 'premium' ? 'premium' : 'free';

    return res.status(200).json({ success: true, user });
  } catch (error) {
    logger.error("Get current user error", error);
    return res.status(500).json({ success: false, code: 'SERVER_ERROR', message: "Sunucu hatası" });
  }
};

// Facebook Login
exports.facebookLogin = async (req, res) => {
  try {
    const { credential, rememberMe } = req.body;

    const result = await facebookLoginService(credential, rememberMe);

    // Record successful login
    try {
      await recordLoginAttempt(result.user.id, req, { success: true, message: 'facebook_login_success' });
    } catch { }

    return res.status(200).json({
      success: true,
      message: "Facebook ile giriş başarılı",
      data: result
    });

  } catch (error) {
    logger.error("Facebook login error", error);

    // Handle service-layer errors
    if (error.code) {
      const statusCode = error.code === 'EMAIL_NOT_VERIFIED' ? 403 :
                        error.code === 'MISSING_TOKEN' ? 400 :
                        error.code === 'INVALID_TOKEN' ? 400 :
                        error.code === 'EMAIL_REQUIRED' ? 400 :
                        error.code === 'DB_ERROR' ? 500 :
                        error.code === 'UPDATE_FAILED' ? 500 :
                        error.code === 'CREATE_FAILED' ? 500 : 500;

      return res.status(statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }

    return res.status(500).json({ success: false, code: 'SERVER_ERROR', message: error.message || "Sunucu hatası" });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { credential, rememberMe } = req.body;

    const result = await googleLoginService(credential, rememberMe);

    // Record successful login
    try {
      await recordLoginAttempt(result.user.id, req, { success: true, message: 'google_login_success' });
    } catch { }

    return res.status(200).json({
      success: true,
      message: "Google ile giriş başarılı",
      data: result
    });

  } catch (error) {
    logger.error("Google login error", error);

    // Handle service-layer errors
    if (error.code) {
      const statusCode = error.code === 'EMAIL_NOT_VERIFIED' ? 403 :
                        error.code === 'MISSING_CREDENTIAL' ? 400 :
                        error.code === 'INVALID_CREDENTIAL' ? 400 :
                        error.code === 'EMAIL_REQUIRED' ? 400 :
                        error.code === 'DB_ERROR' ? 500 :
                        error.code === 'UPDATE_FAILED' ? 500 :
                        error.code === 'CREATE_FAILED' ? 500 : 500;

      return res.status(statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }

    return res.status(500).json({ success: false, message: error.message || "Sunucu hatası" });
  }
};

// Apple Login
exports.appleLogin = async (req, res) => {
  try {
    const { credential, rememberMe, email: providedEmail, name: providedName } = req.body;

    const result = await appleLoginService(credential, rememberMe, providedEmail, providedName);

    // Record successful login
    try {
      await recordLoginAttempt(result.user.id, req, { success: true, message: 'apple_login_success' });
    } catch { }

    return res.status(200).json({
      success: true,
      message: "Apple ile giriş başarılı",
      data: result
    });

  } catch (error) {
    logger.error("Apple login error", error);

    // Handle service-layer errors
    if (error.code) {
      const statusCode = error.code === 'EMAIL_NOT_VERIFIED' ? 403 :
                        error.code === 'MISSING_TOKEN' ? 400 :
                        error.code === 'INVALID_TOKEN' ? 400 :
                        error.code === 'EMAIL_OR_SUB_REQUIRED' ? 400 :
                        error.code === 'DB_ERROR' ? 500 :
                        error.code === 'UPDATE_FAILED' ? 500 :
                        error.code === 'CREATE_FAILED' ? 500 : 500;

      return res.status(statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }

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
    delete data[0].verificationtoken;
    delete data[0].resetpasswordtoken;

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
      .select("id, email, password, verificationtoken, resetpasswordtoken")
      .eq("id", userId)
      .single();

    // Always run bcrypt.compare to prevent timing-based user enumeration
    const hashToCompare = !user ? DUMMY_HASH : user.password;
    const isPasswordValid = await bcrypt.compare(currentPassword, hashToCompare);
    if (!user || !isPasswordValid) {
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
      return res.status(500).json({ success: false, code: 'UPDATE_FAILED', message: "Şifre güncellenemedi" });
    }

    return res.status(200).json({ success: true, message: "Şifre başarıyla değiştirildi" });
  } catch (error) {
    logger.error("Change password error", error);
    return res.status(500).json({ success: false, code: 'SERVER_ERROR', message: "Sunucu hatası" });
  }
};

/**
 * POST /api/auth/update-level
 * Update user's content level and vocabulary level
 */
exports.updateLevel = async (req, res) => {
  try {
    const { contentLevel, vocabularyLevel } = req.body;
    const userId = req.user.id;

    const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

    if (contentLevel && !validLevels.includes(contentLevel)) {
      return res.status(400).json({ success: false, message: "Geçersiz içerik seviyesi" });
    }

    if (vocabularyLevel && !validLevels.includes(vocabularyLevel)) {
      return res.status(400).json({ success: false, message: "Geçersiz kelime seviyesi" });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (contentLevel) {
      updateData.default_level = contentLevel;
    }

    if (vocabularyLevel) {
      updateData.cefr_level = vocabularyLevel;
    }

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq("id", userId);

    if (error) {
      logger.error('[UPDATE_LEVEL] Database error:', error);
      return res.status(500).json({ success: false, message: "Seviyeler güncellenemedi" });
    }

    logger.info(`[UPDATE_LEVEL] User ${userId} levels updated: content=${contentLevel}, vocabulary=${vocabularyLevel}`);

    return res.status(200).json({
      success: true,
      message: "Seviyeler başarıyla güncellendi",
      data: { contentLevel, vocabularyLevel }
    });
  } catch (error) {
    logger.error("Update level error", error);
    return res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const { getConnection, checkRedisAvailability } = require('../utils/storage/redisClient');
        if (checkRedisAvailability()) {
          const decoded = jwt.decode(token);
          const ttl = decoded && decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 900;
          if (ttl > 0) {
            const redis = getConnection();
            await redis.setex(`bl:${token}`, ttl, '1');
            logger.info('[LOGOUT] Token blacklisted', { userId: req.user?.id, ttl });
          }
        }
      } catch (blErr) {
        logger.warn('[LOGOUT] Token blacklist failed (non-blocking):', blErr.message);
      }
    }
    return res.status(200).json({ success: true, message: "Çıkış yapıldı" });
  } catch (error) {
    logger.error("Logout error", error);
    return res.status(500).json({ success: false, code: 'SERVER_ERROR', message: "Sunucu hatası" });
  }
};

// 6 haneli kriptografik olarak guvenli sayisal kod uretir
function generateNumericCode() {
  const buffer = crypto.randomBytes(4);
  const num = buffer.readUInt32BE(0) % 900000 + 100000;
  return num.toString();
}

function parseExpiryMs(expires) {
  try {
    if (!expires) return 0;
    if (expires instanceof Date) return expires.getTime();
    // Try native Date constructor first (handles ISO 8601 with various timezone offsets)
    const native = new Date(expires).getTime();
    if (!Number.isNaN(native)) return native;
    // Fallback: normalize string for edge cases
    let s = String(expires).replace(' ', 'T');
    if (!/[zZ]|[+-]\d{2}(:?\d{2})?$/.test(s)) s += 'Z';
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

    // Log reset event without exposing the code
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`[RESET-CODE] email=${email} code=${code} expires=${expiresAt}`);
    } else {
      logger.info(`[RESET-CODE] Reset code generated for email=${email} expires=${expiresAt}`);
    }

    // Mail gönder (SMTP varsa), yoksa logla
    try {
      const { sendMail } = require('../utils/notifications/mailer.js');
      await sendMail({
        to: email,
        subject: 'Şifre Sıfırlama Kodu',
        text: `Şifre sıfırlama kodunuz: ${code}\n\nKod 15 dakika geçerlidir.`,
      });
    } catch (mailErr) {
      logger.warn(`[RESET-FALLBACK] Reset email send failed for ${email}:`, mailErr?.message);
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
  // Prevent caching of verification responses (GET endpoint)
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');

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
    logger.info(`[VERIFY_EMAIL] User ${user.id} verification_expires raw: ${user.verification_expires}`);
    const expiresMs = parseExpiryMs(user.verification_expires);
    logger.info(`[VERIFY_EMAIL] User ${user.id} expiresMs: ${expiresMs}, now: ${Date.now()}`);
    if (!expiresMs) {
      logger.error(`[VERIFY_EMAIL] Cannot parse verification_expires for user ${user.id}: ${user.verification_expires}`);
      return res.status(400).json({ success: false, message: 'Doğrulama bilgisi okunamadı. Lütfen tekrar doğrulama e-postası isteyin.' });
    }
    const now = Date.now();
    if (expiresMs < now - 2 * 60 * 1000) {
      logger.warn(`[VERIFY_EMAIL] Token expired for user ${user.id}: expiresMs=${expiresMs}, now=${now}, diff=${now - expiresMs}ms, raw=${user.verification_expires}`);
      return res.status(400).json({
        success: false,
        message: 'Doğrulama bağlantısının süresi dolmuş',
        _debug: { rawExpires: user.verification_expires, expiresMs, now, diffMs: now - expiresMs },
      });
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

    // Assign Free Trial plan (3 audio creation credits) for newly verified users
    try {
      const { data: trialPlan, error: planErr } = await supabase
        .from('subscription_plans')
        .select('id, name, price, plantype, is_active, audio_limit, features, monthly_price, yearly_price, description, created_at')
        .eq('name', 'Free Trial')
        .eq('is_active', true)
        .maybeSingle();

      if (!planErr && trialPlan) {
        // Check if user already has a subscription
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existingSub) {
          // Trial süresiz - sadece 3 ses oluşturma hakkı
          const { data: newSub, error: subError } = await supabase
            .from('subscriptions')
            .insert([
              {
                user_id: user.id,
                plantype: 'Free Trial',
                stripepriceid: trialPlan.id, // Link to subscription_plans for features
                status: 'active',
                startdate: new Date().toISOString(),
                enddate: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString(),
                audio_creation_count: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
            ])
            .select();

          if (subError) {
            logger.error(`[VERIFY_EMAIL] Failed to insert subscription for user ${user.id}:`, subError);
          } else {
            logger.info(`[VERIFY_EMAIL] Free Trial plan assigned to user ${user.id}`, newSub);
          }
        }
      }
    } catch (e2) {
      logger.warn('[VERIFY_EMAIL] Failed to assign Free Trial plan:', e2?.message);
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

    // Generate new token and expiry (48 hours)
    const code = generateNumericCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS).toISOString();

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
      const { sendMail } = require('../utils/notifications/mailer.js');
      const fullName = [user.firstname, user.lastname].filter(Boolean).join(' ').trim() || 'LingRoot Kullanıcısı';
      await sendMail({
        to: email,
        subject: 'LingRoot Hesap Aktivasyonu',
        text: `Merhaba ${fullName},\n\nHesabınızı aktifleştirmek için aşağıdaki bağlantıya tıklayın:\n${verifyUrl}\n\nBağlantı 48 saat geçerlidir.\n\nTeşekkürler,\nLingRoot Ekibi`,
        html: `<p>Merhaba ${fullName},</p>
               <p>Hesabınızı aktifleştirmek için aşağıdaki bağlantıya tıklayın:</p>
               <p><a href="${verifyUrl}" target="_blank" rel="noopener noreferrer">Hesabımı Doğrula</a></p>
               <p>Bağlantı 48 saat geçerlidir.</p>
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

function parseDurationMs(duration) {
  try {
    if (typeof duration === 'number') return duration;
    if (!duration) return 3650 * 24 * 60 * 60 * 1000; // default ~10 years

    const match = String(duration).match(/^(\d+)([dhms])$/);
    if (!match) return 3650 * 24 * 60 * 60 * 1000;

    const val = parseInt(match[1], 10);
    const unit = match[2];

    if (unit === 'd') return val * 24 * 60 * 60 * 1000;
    if (unit === 'h') return val * 60 * 60 * 1000;
    if (unit === 'm') return val * 60 * 1000;
    if (unit === 's') return val * 1000;

    return val;
  } catch (e) {
    return 3650 * 24 * 60 * 60 * 1000;
  }
}
