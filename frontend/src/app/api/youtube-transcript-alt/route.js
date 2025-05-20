import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // İstek body'sini JSON olarak alma
    const body = await request.json();

    // İsteği doğrudan transcript servisine yönlendir (alternatif port)
    const response = await fetch('http://localhost:8051/scrape-transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Servisin yanıtını al
    const data = await response.json();

    // Yanıtı olduğu gibi aktar
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('YouTube transkript servisi hatası (alt):', error);
    return NextResponse.json(
      { error: 'Transkript servisi hatası', details: error.message },
      { status: 500 }
    );
  }
} 