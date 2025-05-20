// Kullanıcı bilgisi proxy
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

  try {
    // Auth token'ını request header'larından al
    const authHeader = req.headers.authorization;
    console.log(`Authorization header (me endpoint): ${authHeader ? 'Mevcut' : 'Yok'}`);
    
    // Token yoksa unauthorized
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }
    
    // Demo kullanıcı bilgisi
    const demoUser = {
      id: '123456',
      email: 'demo@example.com',
      role: 'user',
      membershipStatus: 'free'
    };
    
    // Başarılı yanıt döndür
    res.status(200).json({
      success: true,
      data: {
        user: demoUser,
        // Aynı token'ı geri gönder
        token: authHeader.split(' ')[1]
      }
    });
  } catch (error) {
    console.error('Kullanıcı bilgisi hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Kullanıcı bilgisi alınamadı', 
      error: error.message 
    });
  }
} 