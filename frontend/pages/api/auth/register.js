// Kullanıcı kayıt (register) API endpointi
// Bu dosya /api/auth/register URL'ine yapılan POST isteklerini işler
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

// JWT token oluşturma fonksiyonu
function generateToken(user) {
  // JWT_SECRET çevresel değişkenden alınmalı veya güvenli bir şekilde saklanmalıdır
  const secret = process.env.JWT_SECRET || 'lingroot-secret-key-change-in-production';
  
  return jwt.sign(
    { 
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      membershipStatus: user.membership_status || 'free'
    }, 
    secret,
    { expiresIn: '7d' } // Token 7 gün geçerli
  );
}

// API route handler
export default async function handler(req, res) {
  // Sadece POST isteklerini kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }
  
  try {
    const { name, email, password, phoneNumber } = req.body;
    
    // Gerekli alanları kontrol et
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'İsim, e-posta ve şifre gereklidir' 
      });
    }
    
    // Basit e-posta doğrulama
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Geçerli bir e-posta adresi giriniz' 
      });
    }
    
    // Şifre uzunluk kontrolü
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Şifre en az 6 karakter olmalıdır' 
      });
    }
    
    console.log('Registration attempt:', { name, email, password: '***', phoneNumber });
    
    // DEVELOPMENT MOD: Eğer development modundaysak ve özellikle istenmiyorsa, gerçek veritabanı kullanmayabiliriz
    if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
      // Örnek bir kullanıcı oluştur
      const mockUser = {
        id: 'dev-user-' + Date.now(),
        name: name,
        email: email,
        role: 'user',
        membership_status: 'free',
      };
      
      // Token oluştur
      const token = generateToken(mockUser);
      
      // Başarılı yanıt
      return res.status(201).json({
        success: true,
        message: 'Kayıt başarılı (Development Mode)',
        data: {
          user: {
            id: mockUser.id,
            name: mockUser.name,
            email: mockUser.email,
            role: mockUser.role,
            membershipStatus: mockUser.membership_status
          },
          token
        }
      });
    }
    
    // Supabase client oluşturma
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials missing:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseKey 
      });
      
      return res.status(500).json({ 
        success: false, 
        message: 'Sunucu yapılandırma hatası, lütfen daha sonra tekrar deneyin' 
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // E-posta adresi zaten kayıtlı mı kontrol et
    const { data: existingUser, error: queryError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();
      
    if (queryError) {
      console.error('Supabase query error:', queryError);
      return res.status(500).json({ 
        success: false, 
        message: 'Veritabanı sorgulama hatası' 
      });
    }
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu e-posta adresi zaten kayıtlı' 
      });
    }
    
    // Şifreyi hash'le
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // İsmi ayrıştır (basit yöntem, tam isim formatı bilinmediğinden)
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Kullanıcı verilerini hazırla
    const newUser = {
      name: name,
      first_name: firstName,
      last_name: lastName,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      phone_number: phoneNumber || null,
      role: 'user',
      membership_status: 'free',
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString()
    };
    
    // Kullanıcıyı veritabanına ekle
    const { data: createdUser, error: insertError } = await supabase
      .from('users')
      .insert(newUser)
      .select()
      .single();
    
    if (insertError) {
      console.error('User creation error:', insertError);
      return res.status(500).json({ 
        success: false, 
        message: 'Kullanıcı oluşturulurken bir hata oluştu' 
      });
    }
    
    // Token oluştur
    const token = generateToken(createdUser);
    
    // Başarılı yanıt
    return res.status(201).json({
      success: true,
      message: 'Kayıt başarılı',
      data: {
        user: {
          id: createdUser.id,
          name: createdUser.name,
          email: createdUser.email,
          role: createdUser.role || 'user',
          membershipStatus: createdUser.membership_status || 'free'
        },
        token
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası, lütfen daha sonra tekrar deneyin' 
    });
  }
} 