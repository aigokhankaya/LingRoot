const { supabase } = require('../utils/storage/supabaseClient.js');
const logger = require('../utils/common/logger.js');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const appleSignin = require('apple-signin-auth');
const axios = require('axios');
const { sendRegistrationNotification } = require('../utils/notifications/registrationNotifier.js');
const { sendMail } = require('../utils/notifications/mailer.js');

// Google OAuth client for JWT verification
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// JWT secret keys
const JWT_SECRET = process.env.JWT_SECRET || "lingroot-secret-key-for-development";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "lingroot-refresh-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

/**
 * Generate access token
 */
const generateToken = (id, email, role, rememberMe = false) => {
  return jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (id) =>
  jwt.sign({ id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });

/**
 * Helper function to send verification email
 */
const sendVerificationEmail = async (email, verificationToken, firstName = '', lastName = '') => {
  try {
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error: verErr } = await supabase
      .from('users')
      .update({
        verification_token: verificationToken,
        verification_expires: verificationExpires,
        updated_at: new Date().toISOString(),
      })
      .eq('email', email);

    if (verErr) {
      logger.warn('[OAUTH_SERVICE] Failed to set verification token:', verErr);
      throw verErr;
    }

    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_FRONTEND_URL || '';
    const verifyUrl = frontendBaseUrl
      ? `${frontendBaseUrl.replace(/\/$/, '')}/verify?token=${encodeURIComponent(verificationToken)}`
      : `https://lingloops-backend.onrender.com/api/auth/verify-email/${encodeURIComponent(verificationToken)}`;

    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'LingRoot Kullanıcısı';
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

    logger.info(`[OAUTH_SERVICE] Verification email sent to ${email}`);
  } catch (error) {
    logger.error('[OAUTH_SERVICE] Failed to send verification email:', error);
    throw error;
  }
};

/**
 * Helper function to assign Free Trial plan to new user
 */
const assignFreeTrialPlan = async (userId) => {
  try {
    const { data: trialPlan, error: planErr } = await supabase
      .from('subscription_plans')
      .select('id, name, price, plantype, is_active, audio_limit, features, monthly_price, yearly_price, description, created_at')
      .eq('name', 'Free Trial')
      .eq('is_active', true)
      .maybeSingle();

    if (planErr) {
      logger.error('[OAUTH_SERVICE] Error fetching Free Trial plan:', planErr);
      return;
    }

    if (!trialPlan) {
      logger.error('[OAUTH_SERVICE] Free Trial plan not found in database');
      return;
    }

    const { data: newSub, error: subErr } = await supabase
      .from('subscriptions')
      .insert([{
        user_id: userId,
        plantype: 'Free Trial',
        stripepriceid: trialPlan.id,
        status: 'active',
        audio_creation_count: 0,
        startdate: new Date().toISOString(),
        enddate: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select();

    if (subErr) {
      logger.error(`[OAUTH_SERVICE] Error inserting subscription for user ${userId}:`, subErr);
    } else {
      logger.info(`[OAUTH_SERVICE] Free Trial plan assigned to user ${userId}`, newSub);
    }
  } catch (e) {
    logger.error('[OAUTH_SERVICE] Failed to assign Free Trial plan:', e?.message, e);
  }
};

/**
 * Google OAuth Login Service
 * @param {string} credential - Google JWT or access token
 * @param {boolean} rememberMe - Remember me flag
 * @returns {Promise<{user, token, refreshToken}>}
 */
const googleLoginService = async (credential, rememberMe = false) => {
  if (!credential) {
    throw { code: 'MISSING_CREDENTIAL', message: 'Google credential gerekli' };
  }

  let googleUser;
  const parts = credential.split('.');
  const isJWT = parts.length === 3;

  logger.debug('[GOOGLE_LOGIN_SERVICE] Credential analysis', { length: credential.length, parts: parts.length, isJWT });

  try {
    if (isJWT) {
      logger.debug('[GOOGLE_LOGIN_SERVICE] Verifying JWT credential with Google');
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      googleUser = ticket.getPayload();
      logger.info('[GOOGLE_LOGIN_SERVICE] JWT verification successful', { email: googleUser.email, name: googleUser.name });
    } else {
      logger.debug('[GOOGLE_LOGIN_SERVICE] Fetching user info with access token');
      const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${credential}` }
      });
      googleUser = response.data;

      // Normalize to JWT format
      googleUser.sub = googleUser.id;
      googleUser.given_name = googleUser.given_name || googleUser.name?.split(' ')[0];
      googleUser.family_name = googleUser.family_name || googleUser.name?.split(' ').slice(1).join(' ');

      logger.info('[GOOGLE_LOGIN_SERVICE] Access token user info received', { email: googleUser.email, name: googleUser.name });
    }
  } catch (decodeError) {
    logger.error('[GOOGLE_LOGIN_SERVICE] Credential decode error:', decodeError);
    logger.error('[GOOGLE_LOGIN_SERVICE] Credential decode failed', { type: isJWT ? 'JWT' : 'AccessToken', length: credential.length });
    throw { code: 'INVALID_CREDENTIAL', message: 'Geçersiz Google credential' };
  }

  const { email, name, given_name, family_name, picture } = googleUser;

  if (!email) {
    throw { code: 'EMAIL_REQUIRED', message: 'Google hesabından email alınamadı' };
  }

  // Check if user exists
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select("id, email, isverified, password, verificationtoken, resetpasswordtoken, firstname, lastname, created_at, updated_at")
    .eq("email", email)
    .maybeSingle();

  if (fetchError) {
    logger.error('[GOOGLE_LOGIN_SERVICE] User query error:', fetchError);
    throw { code: 'DB_ERROR', message: 'Veritabanı hatası' };
  }

  let user;

  if (existingUser) {
    // Existing user - check if verified
    if (!existingUser.isverified) {
      throw {
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email adresiniz doğrulanmamış. Lütfen email adresinize gönderilen doğrulama linkine tıklayın.'
      };
    }

    // User is active, allow login
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ updated_at: new Date().toISOString() })
      .eq("id", existingUser.id)
      .select()
      .single();

    if (updateError) {
      logger.error('[GOOGLE_LOGIN_SERVICE] User update error:', updateError);
      throw { code: 'UPDATE_FAILED', message: 'Kullanıcı güncellenemedi' };
    }

    user = updatedUser;
  } else {
    // Create new user - Google users are auto-verified and start with free trial
    const newUserData = {
      firstname: given_name || name?.split(' ')[0] || 'Google',
      lastname: family_name || name?.split(' ').slice(1).join(' ') || 'User',
      email: email,
      phonenumber: null,
      password: 'google-oauth',
      role: "user",
      isverified: true,
      verificationtoken: null,
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
      logger.error('[GOOGLE_LOGIN_SERVICE] User creation error:', createError);
      throw { code: 'CREATE_FAILED', message: 'Kullanıcı oluşturulamadı' };
    }

    user = createdUser;

    // Assign Free Trial plan
    await assignFreeTrialPlan(user.id);

    // Send registration notification
    try {
      await sendRegistrationNotification(user);
    } catch (notificationErr) {
      logger.warn('[GOOGLE_LOGIN_SERVICE] Registration notification failed:', notificationErr?.message);
    }

    logger.info(`[GOOGLE_LOGIN_SERVICE] New Google user created (auto-verified, free trial): ${email}`);
  }

  // Generate tokens
  const token = generateToken(user.id, user.email, user.role, rememberMe);
  const refreshToken = generateRefreshToken(user.id);

  // Remove sensitive data
  delete user.password;
  delete user.verificationtoken;
  delete user.resetpasswordtoken;

  // Normalize name fields
  const safeFirst = user.firstname || user.firstName || '';
  const safeLast = user.lastname || user.lastName || '';
  const safeFull = [safeFirst, safeLast].filter(Boolean).join(' ').trim();
  user.full_name = safeFull;
  user.name = safeFull;

  return { user, token, refreshToken };
};

/**
 * Facebook OAuth Login Service
 * @param {string} credential - Facebook access token
 * @param {boolean} rememberMe - Remember me flag
 * @returns {Promise<{user, token, refreshToken}>}
 */
const facebookLoginService = async (credential, rememberMe = false) => {
  if (!credential) {
    throw { code: 'MISSING_TOKEN', message: 'Facebook access token gerekli' };
  }

  let facebookUser;

  try {
    const response = await axios.get('https://graph.facebook.com/me', {
      params: { fields: 'id,name,email,first_name,last_name,picture.type(large)' },
      headers: { Authorization: `Bearer ${credential}` }
    });
    facebookUser = response.data;

    logger.info('[FACEBOOK_LOGIN_SERVICE] User info received', { email: facebookUser.email, name: facebookUser.name });
  } catch (fbError) {
    logger.error('[FACEBOOK_LOGIN_SERVICE] Facebook API error:', fbError);
    throw { code: 'INVALID_TOKEN', message: 'Geçersiz Facebook access token' };
  }

  const { email, name, first_name, last_name } = facebookUser;

  if (!email) {
    throw { code: 'EMAIL_REQUIRED', message: 'Facebook hesabından email alınamadı' };
  }

  // Check if user exists
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select("id, email, isverified, password, verificationtoken, resetpasswordtoken, created_at, updated_at")
    .eq("email", email)
    .maybeSingle();

  if (fetchError) {
    logger.error('[FACEBOOK_LOGIN_SERVICE] User query error:', fetchError);
    throw { code: 'DB_ERROR', message: 'Veritabanı hatası' };
  }

  let user;

  if (existingUser) {
    // Existing user - check if verified
    if (!existingUser.isverified) {
      throw {
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email adresiniz doğrulanmamış. Lütfen email adresinize gönderilen doğrulama linkine tıklayın.'
      };
    }

    // User is active, allow login
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ updated_at: new Date().toISOString() })
      .eq("id", existingUser.id)
      .select()
      .single();

    if (updateError) {
      logger.error('[FACEBOOK_LOGIN_SERVICE] User update error:', updateError);
      throw { code: 'UPDATE_FAILED', message: 'Kullanıcı güncellenemedi' };
    }

    user = updatedUser;
  } else {
    // Create new user - requires activation
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const newUserData = {
      firstname: first_name || name?.split(' ')[0] || 'Facebook',
      lastname: last_name || name?.split(' ').slice(1).join(' ') || 'User',
      email: email,
      phonenumber: null,
      password: 'facebook-oauth',
      role: "user",
      isverified: false, // Requires activation
      verificationtoken: verificationToken,
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
      logger.error('[FACEBOOK_LOGIN_SERVICE] User creation error:', createError);
      throw { code: 'CREATE_FAILED', message: 'Kullanıcı oluşturulamadı' };
    }

    user = createdUser;

    // Send verification email to new Facebook users
    try {
      await sendVerificationEmail(email, verificationToken, first_name || name?.split(' ')[0], last_name || name?.split(' ').slice(1).join(' '));
    } catch (emailError) {
      logger.error('[FACEBOOK_LOGIN_SERVICE] Verification email failed:', emailError);
    }

    // Send registration notification
    try {
      await sendRegistrationNotification(user);
    } catch (notificationErr) {
      logger.warn('[FACEBOOK_LOGIN_SERVICE] Registration notification failed:', notificationErr?.message);
    }

    // Return early with verification required
    throw {
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Hesabınız oluşturuldu. Lütfen email adresinize gönderilen doğrulama linkine tıklayarak hesabınızı aktifleştirin.',
      requiresVerification: true
    };
  }

  // Generate tokens
  const token = generateToken(user.id, user.email, user.role, rememberMe);
  const refreshToken = generateRefreshToken(user.id);

  // Remove sensitive data
  delete user.password;
  delete user.verificationtoken;
  delete user.resetpasswordtoken;

  return { user, token, refreshToken };
};

/**
 * Apple OAuth Login Service
 * @param {string} credential - Apple identity token
 * @param {boolean} rememberMe - Remember me flag
 * @param {string} providedEmail - Email from Apple (first login only)
 * @param {string} providedName - Name from Apple (first login only)
 * @returns {Promise<{user, token, refreshToken}>}
 */
const appleLoginService = async (credential, rememberMe = false, providedEmail = null, providedName = null) => {
  if (!credential) {
    throw { code: 'MISSING_TOKEN', message: 'Apple identity token gerekli' };
  }

  let appleUser;

  try {
    appleUser = await appleSignin.verifyIdToken(credential, {
      audience: process.env.APPLE_CLIENT_ID,
      ignoreExpiration: false,
    });

    logger.info('[APPLE_LOGIN_SERVICE] Token verification successful', { sub: appleUser.sub, email: appleUser.email });
  } catch (decodeError) {
    logger.error('[APPLE_LOGIN_SERVICE] Token verification failed:', decodeError.message);
    throw { code: 'INVALID_TOKEN', message: 'Geçersiz Apple identity token' };
  }

  // Apple provides email on first login, not on subsequent logins
  const email = appleUser.email || providedEmail;
  const appleSub = appleUser.sub;

  if (!email && !appleSub) {
    throw { code: 'EMAIL_OR_SUB_REQUIRED', message: 'Apple hesabından email veya kullanıcı ID alınamadı' };
  }

  // Find user by email
  let existingUser = null;

  if (email) {
    const { data, error: fetchError } = await supabase
      .from('users')
      .select("id, email, isverified, password, verificationtoken, resetpasswordtoken, created_at, updated_at")
      .eq("email", email)
      .maybeSingle();

    if (!fetchError) existingUser = data;
  }

  let user;

  if (existingUser) {
    // Existing user - check if verified
    if (!existingUser.isverified) {
      throw {
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email adresiniz doğrulanmamış. Lütfen email adresinize gönderilen doğrulama linkine tıklayın.'
      };
    }

    user = existingUser;
    logger.info('[APPLE_LOGIN_SERVICE] Existing user found', { id: user.id, email: user.email });
  } else {
    // Create new user
    logger.info('[APPLE_LOGIN_SERVICE] Creating new user', { providedName });

    const name = providedName || 'Apple User';
    const nameParts = name.split(' ');
    const firstname = nameParts[0] || 'Apple';
    const lastname = nameParts.slice(1).join(' ') || 'User';

    logger.debug('[APPLE_LOGIN_SERVICE] Parsed name', { firstname, lastname });

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        firstname: firstname,
        lastname: lastname,
        email: email,
        phonenumber: null,
        password: 'apple-oauth',
        role: "user",
        isverified: true,
        verificationtoken: null,
        dailycontentused: 0,
        lastcontentdate: null,
        stripecustomerid: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) {
      logger.error('[APPLE_LOGIN_SERVICE] User creation error:', insertError);
      throw { code: 'CREATE_FAILED', message: 'Kullanıcı kaydı oluşturulamadı' };
    }

    user = newUser;
    logger.info('[APPLE_LOGIN_SERVICE] New user created', { id: user.id, email: user.email });

    // Assign Free Trial plan
    await assignFreeTrialPlan(user.id);

    // Send registration notification
    try {
      await sendRegistrationNotification(user);
    } catch (notifError) {
      logger.error('[APPLE_LOGIN_SERVICE] Registration notification failed:', notifError);
    }
  }

  // Generate tokens
  const token = generateToken(user.id, user.email, user.role, rememberMe);
  const refreshToken = generateRefreshToken(user.id);

  // Remove sensitive data
  delete user.password;
  delete user.verificationtoken;
  delete user.resetpasswordtoken;

  return { user, token, refreshToken };
};

module.exports = {
  googleLoginService,
  facebookLoginService,
  appleLoginService,
  assignFreeTrialPlan,
  sendVerificationEmail
};
