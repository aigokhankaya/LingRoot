// Kullanıcı giriş (login) API endpointi
// Bu dosya /api/auth/login URL'ine yapılan POST isteklerini işler
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
    const { email, password } = req.body;
    
    // Gerekli alanları kontrol et
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'E-posta ve şifre gereklidir' 
      });
    }
    
    console.log('Login attempt:', { email, password: '***' });
    
    // DEVELOPMENT MOD: Herhangi bir e-posta/şifre ile giriş yapmaya izin ver
    if (process.env.NODE_ENV === 'development') {
      // Örnek bir kullanıcı oluştur
      const mockUser = {
        id: 'dev-user-123',
        email: email,
        name: 'Development User',
        role: 'user',
        membership_status: 'premium',
      };
      
      // Token oluştur
      const token = generateToken(mockUser);
      
      // Başarılı yanıt
      return res.status(200).json({
        success: true,
        message: 'Giriş başarılı (Development Mode)',
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
    
    // Gerçek ortamda buradan devam edilecek
    // Supabase client oluşturma
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        success: false, 
        message: 'Sunucu yapılandırma hatası, lütfen daha sonra tekrar deneyin' 
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Kullanıcıyı bul
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    // Supabase hatası
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Veritabanı hatası, lütfen daha sonra tekrar deneyin' 
      });
    }
    
    // Kullanıcı bulunamadı
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Geçersiz e-posta veya şifre' 
      });
    }
    
    // Şifre doğrulaması
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Geçersiz e-posta veya şifre' 
      });
    }
    
    // Token oluştur
    const token = generateToken(user);
    
    // Son login tarihini güncelle
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);
    
    // Başarılı yanıt
    return res.status(200).json({
      success: true,
      message: 'Giriş başarılı',
      data: {
        user: {
          id: user.id,
          name: user.name || user.display_name,
          email: user.email,
          role: user.role || 'user',
          membershipStatus: user.membership_status || 'free'
        },
        token
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası, lütfen daha sonra tekrar deneyin' 
    });
  }
} 