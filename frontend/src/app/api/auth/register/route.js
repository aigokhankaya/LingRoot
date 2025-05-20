import { NextResponse } from 'next/server';

// Register API endpoint - mock success response
export async function POST(request) {
  try {
    // İstek body'sini al
    const body = await request.json();
    console.log("Kayıt isteği:", body);
    
    // Demo kullanıcı yanıtı
    return NextResponse.json({
      success: true,
      message: "Kayıt başarılı",
      data: {
        user: {
          id: "123456",
          email: body.email,
          firstName: body.firstName,
          lastName: body.lastName,
          role: "user",
          membershipStatus: "free"
        }
      }
    });
  } catch (error) {
    console.error('Register API hatası:', error);
    return NextResponse.json(
      { success: false, message: 'Kayıt işlemi başarısız' },
      { status: 500 }
    );
  }
} 