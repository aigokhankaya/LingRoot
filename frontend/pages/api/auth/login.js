// Mock login API'si
export default function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { email, password } = req.body;
      
      // Basit bir doğrulama
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email ve şifre gereklidir'
        });
      }
      
      // Başarılı giriş - mock kullanıcı döndür
      const mockUser = {
        id: 'mock-user-id',
        email: email,
        role: 'user',
        membershipStatus: 'premium'
      };
      
      // Mock token oluştur (gerçek uygulamada JWT kullanılmalı)
      const token = 'mock-token-' + Math.random().toString(36).substring(2, 15);
      
      res.status(200).json({
        success: true,
        message: 'Giriş başarılı',
        data: {
          user: mockUser,
          token: token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Sunucu hatası: ' + error.message
      });
    }
  } else {
    // OPTIONS veya diğer metodlar için CORS desteği
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }
} 