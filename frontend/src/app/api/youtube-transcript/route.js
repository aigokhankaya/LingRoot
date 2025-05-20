import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
      'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
    },
  });
}

export async function POST(request) {
  try {
    // İstek body'sini al
    const body = await request.json();
    const { url, language_code } = body;
    console.log(`YouTube transkript isteği (App Router): ${url}, dil: ${language_code}`);
    
    // Auth token'ını request header'larından al
    const authHeader = request.headers.get('authorization');
    console.log(`Authorization header: ${authHeader ? 'Mevcut' : 'Yok'}`);
    
    // Demo transkript içeriği
    const demoTranscript = `Bu bir demo transkript içeriğidir (App Router).
YouTube videosu: ${url}
Dil: ${language_code}
Auth Token: ${authHeader ? 'Mevcut' : 'Yok'}

Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Proin euismod, nunc in aliquam ultrices, nisi enim aliquam ipsum,
vitae luctus nisl nunc in lectus. Donec auctor, nisl eget aliquam
ultrices, nisi enim aliquam ipsum, vitae luctus nisl nunc in lectus.

Proin euismod, nunc in aliquam ultrices, nisi enim aliquam ipsum,
vitae luctus nisl nunc in lectus. Donec auctor, nisl eget aliquam
ultrices, nisi enim aliquam ipsum, vitae luctus nisl nunc in lectus.`;
    
    // Başarılı yanıt döndür
    return NextResponse.json(
      { transcript: demoTranscript },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
          'Authorization': authHeader || '',
        }
      }
    );
  } catch (error) {
    console.error('YouTube transkript servisi hatası (App Router):', error);
    return NextResponse.json(
      { error: 'Transkript servisi hatası', details: error.message },
      { status: 500 }
    );
  }
} 