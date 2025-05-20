import { NextResponse } from 'next/server';

// Login API endpoint - mock success response
export async function POST(request) {
  try {
    // İstek body'sini al
    const body = await request.json();
    console.log("Login isteği:", body);
    
    // Demo kullanıcı bilgileri (gerçek projede bu bilgiler backend'den gelmelidir)
    const demoUser = {
      id: "123456",
      email: body.email,
      role: "user",
      membershipStatus: "free"
    };
    
    // Demo token
    const token = "demo_token_" + Math.random().toString(36).substring(2);
    
    // Başarılı yanıt döndür
    return NextResponse.json({
      success: true,
      message: "Giriş başarılı",
      data: {
        user: demoUser,
        token: token
      }
    });
  } catch (error) {
    console.error('Login API hatası:', error);
    return NextResponse.json(
      { success: false, message: 'Giriş yapılamadı' },
      { status: 500 }
    );
  }
} 