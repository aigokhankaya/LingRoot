import { NextResponse } from 'next/server';

// Basit auth endpoint - tüm istekleri localhost:5001'e yönlendirir
export async function GET(request) {
  return NextResponse.redirect('http://localhost:5001/auth/login');
}

export async function POST(request) {
  try {
    // İstek body'sini al
    const body = await request.json();
    
    // İsteği doğrudan backend'e yönlendir
    const response = await fetch('http://localhost:5001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    // Backend yanıtını olduğu gibi döndür
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Login hatası:', error);
    return NextResponse.json(
      { success: false, message: 'Giriş yapılamadı' },
      { status: 500 }
    );
  }
} 