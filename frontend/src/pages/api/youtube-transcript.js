export default async function handler(req, res) {
  // CORS ayarları ekle
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // OPTIONS isteğine yanıt ver
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Sadece POST isteklerine izin ver
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST metodu desteklenir' });
  }

  try {
    // İstek body'sini al
    const { url, language_code } = req.body;
    console.log(`YouTube transkript isteği: ${url}, dil: ${language_code}`);
    
    // Auth token'ını request header'larından al
    const authHeader = req.headers.authorization;
    console.log(`Authorization header: ${authHeader ? 'Mevcut' : 'Yok'}`);
    
    // Demo transkript içeriği - hem token hem de url bilgisi içersin
    const demoTranscript = `Bu bir demo transkript içeriğidir.
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
    
    // Authentication header'ı kopyala ve yanıta ekle
    if (authHeader) {
      res.setHeader('Authorization', authHeader);
    }
    
    // Başarılı yanıt döndür
    return res.status(200).json({ transcript: demoTranscript });
  } catch (error) {
    console.error('YouTube transkript servisi hatası:', error);
    return res.status(500).json({ error: 'Transkript servisi hatası', details: error.message });
  }
} 