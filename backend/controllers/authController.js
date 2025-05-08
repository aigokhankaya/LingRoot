const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const logger = require("../utils/logger");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = process.env.JWT_SECRET || "lingroot-secret-key-for-development";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "lingroot-refresh-secret-key";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "30d";

const generateToken = (id, email, role) =>
  jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const generateRefreshToken = (id) =>
  jwt.sign({ id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });

exports.register = async (req, res) => {
  try {
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
    const { data: existingUser } = await supabase
      .from('Users')
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ success: false, message: "Bu e-posta adresi zaten kullanılıyor" });
    }

    // Check if phone number already exists
    const { data: existingPhone } = await supabase
      .from("Users")
      .select("id")
      .eq("phoneNumber", phoneNumber)
      .neq("id", userId)
      .maybeSingle();

    if (existingPhone) {
      return res.status(400).json({ success: false, message: "Bu telefon numarası zaten kullanılıyor" });
    }

    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));

    const { data: newUser, error } = await supabase
      .from("Users")
      .insert([
        {
          firstName,
          lastName,
          email,
          phoneNumber,
          password: hashedPassword,
          role: "user",
          isVerified: false,
          dailyContentUsed: 0,
          lastContentDate: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (error || !newUser?.length) {
      logger.error("User registration error:", error);
      return res.status(500).json({ success: false, message: "Kullanıcı kaydı sırasında bir hata oluştu" });
    }

    const token = generateToken(newUser[0].id, newUser[0].email, newUser[0].role);
    const refreshToken = generateRefreshToken(newUser[0].id);

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
    logger.error("Registration error", error);
    return res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Lütfen e-posta ve şifre girin" });
    }

    const { data: user, error } = await supabase
      .from("Users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: "Geçersiz e-posta veya şifre" });
    }

    const token = generateToken(user.id, user.email, user.role);
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
    return res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const { id } = req.user;
    
    const { data: user, error } = await supabase
      .from("Users")
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

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    logger.error("Get current user error", error);
    return res.status(500).json({ success: false, message: "Sunucu hatası" });
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
        .from("Users")
        .select("id")
        .eq("phoneNumber", phoneNumber)
        .neq("id", userId)
        .maybeSingle();

      if (existingPhone) {
        return res.status(400).json({ success: false, message: "Bu telefon numarası başka bir kullanıcı tarafından kullanılıyor" });
      }
    }

    const updateData = {
      firstName,
      lastName,
      updated_at: new Date().toISOString()
    };

    if (phoneNumber) {
      updateData.phoneNumber = phoneNumber;
    }

    const { data, error } = await supabase
      .from("Users")
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
      .from("Users")
      .select("*")
      .eq("id", userId)
      .single();

    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ success: false, message: "Mevcut şifre yanlış" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
    const { error } = await supabase
      .from("Users")
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

exports.googleLogin = async (req, res) => {
  return res.status(501).json({ success: false, message: "Google login fonksiyonu henüz hazır değil" });
};
