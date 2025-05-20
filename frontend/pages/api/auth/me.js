// Mock kullanıcı API'si
export default function handler(req, res) {
  if (req.method === 'GET') {
    // Gelen token'ı kontrol et (Bearer token formatında)
    const token = req.headers.authorization?.replace('Bearer ', '') || null;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Yetkilendirme başarısız: Token bulunamadı'
      });
    }
    
    // Mock kullanıcı bilgisi oluştur
    const user = {
      id: 'mock-user-id',
      email: 'mock-user@example.com',
      role: 'user',
      membershipStatus: 'premium'
    };
    
    return res.status(200).json({
      success: true,
      data: {
        user,
        token: token // Gelen token'ı geri gönder
      }
    });
  } else {
    // OPTIONS veya diğer metodlar için CORS desteği
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }
} 