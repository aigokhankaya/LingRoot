export default async function handler(req, res) {
  // Sadece POST isteklerine izin ver
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST metodu desteklenir' });
  }

  try {
    // İstek body'sini al
    const { url, language_code } = req.body;
    console.log(`YouTube transkript (alternatif) isteği: ${url}, dil: ${language_code}`);
    
    // Demo transkript içeriği
    const demoTranscript = `Bu bir alternatif demo transkript içeriğidir.
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
    return res.status(200).json({ transcript: demoTranscript });
  } catch (error) {
    console.error('YouTube transkript servisi hatası (alt):', error);
    return res.status(500).json({ error: 'Transkript servisi hatası', details: error.message });
  }
} 