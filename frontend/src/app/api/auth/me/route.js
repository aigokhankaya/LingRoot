import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// Me API endpoint - mock user response
export async function GET(request) {
  try {
    // Authorization header'dan token al
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // JWT secret key
    const secret = process.env.JWT_SECRET || 'lingroot-secret-key-change-in-production';
    
    // Token doğrula
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // DEVELOPMENT MOD: Eğer development modundaysak ve özellikle istenmiyorsa, gerçek veritabanı kullanmayabiliriz
    if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
      // Örnek bir kullanıcı döndür
      return NextResponse.json({
        success: true,
        message: 'User authenticated (Development Mode)',
        data: {
          user: {
            id: decoded.id || 'dev-user-id',
            name: 'Development User',
            email: decoded.email || 'dev@example.com',
            role: decoded.role || 'user',
            membershipStatus: decoded.membershipStatus || 'free'
          }
        }
      });
    }
    
    // Supabase client oluşturma
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials missing');
      return NextResponse.json({ 
        success: false, 
        message: 'Sunucu yapılandırma hatası' 
      }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Kullanıcı bilgilerini al
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();
    
    if (error || !user) {
      console.error('User fetch error:', error);
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Yanıt döndür
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'user',
          membershipStatus: user.membership_status || 'free'
        }
      }
    });
    
  } catch (error) {
    console.error('Auth /me API error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
} 