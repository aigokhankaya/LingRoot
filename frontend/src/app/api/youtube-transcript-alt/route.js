import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // İstek body'sini al
    const body = await request.json();
    const { url, language_code } = body;
    console.log(`YouTube transkript isteği (App Router Alt): ${url}, dil: ${language_code}`);
    
    // Demo transkript içeriği
    const demoTranscript = `Bu bir alternatif demo transkript içeriğidir (App Router).
YouTube videosu: ${url}
Dil: ${language_code}

Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Proin euismod, nunc in aliquam ultrices, nisi enim aliquam ipsum,
vitae luctus nisl nunc in lectus. Donec auctor, nisl eget aliquam
ultrices, nisi enim aliquam ipsum, vitae luctus nisl nunc in lectus.

Proin euismod, nunc in aliquam ultrices, nisi enim aliquam ipsum,
vitae luctus nisl nunc in lectus. Donec auctor, nisl eget aliquam
ultrices, nisi enim aliquam ipsum, vitae luctus nisl nunc in lectus.`;
    
    // Başarılı yanıt döndür
    return NextResponse.json({ transcript: demoTranscript });
  } catch (error) {
    console.error('YouTube transkript servisi hatası (App Router Alt):', error);
    return NextResponse.json(
      { error: 'Transkript servisi hatası', details: error.message },
      { status: 500 }
    );
  }
} 