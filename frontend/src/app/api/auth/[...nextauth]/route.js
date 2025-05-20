import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api';

export async function GET(request) {
  const pathname = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;
  
  try {
    // Auth isteğini backend'e yönlendir
    const backendUrl = `${API_BASE_URL}/auth${pathname.replace('/api/auth', '')}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    // Backend yanıtını olduğu gibi döndür
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Auth API hatası:', error);
    return NextResponse.json(
      { success: false, message: 'Kimlik doğrulama hatası', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const pathname = request.nextUrl.pathname;
  
  try {
    // İstek body'sini JSON olarak alma
    const body = await request.json();
    
    // Auth isteğini backend'e yönlendir
    const backendUrl = `${API_BASE_URL}/auth${pathname.replace('/api/auth', '')}`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    // Backend yanıtını olduğu gibi döndür
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Auth API hatası:', error);
    return NextResponse.json(
      { success: false, message: 'Kimlik doğrulama hatası', error: error.message },
      { status: 500 }
    );
  }
} 