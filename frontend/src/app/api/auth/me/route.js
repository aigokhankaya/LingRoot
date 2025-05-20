import { NextResponse } from 'next/server';

// Me API endpoint - mock user response
export async function GET(request) {
  try {
    // Token kontrolü (gerçek uygulamada daha kapsamlı bir doğrulama yapılmalıdır)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Kimlik doğrulama hatası' },
        { status: 401 }
      );
    }

    // Demo kullanıcı yanıtı
    return NextResponse.json({
      success: true,
      user: {
        id: "123456",
        email: "user@example.com",
        role: "user",
        membershipStatus: "free",
        firstName: "Demo",
        lastName: "User"
      }
    });
  } catch (error) {
    console.error('Me API hatası:', error);
    return NextResponse.json(
      { success: false, message: 'Kimlik doğrulama hatası' },
      { status: 500 }
    );
  }
} 