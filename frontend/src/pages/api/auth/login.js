// Mock login endpoint
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
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    // İstek body'sini al
    const { email, password } = req.body;
    
    // Basit doğrulama (geliştirme için)
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email ve şifre gerekli' 
      });
    }
    
    // Demo kullanıcı bilgisi
    const demoUser = {
      id: '123456',
      email: email,
      role: 'user',
      membershipStatus: 'free'
    };
    
    // Demo token (geliştirme için)
    const token = 'demo_token_' + Date.now();
    
    // Başarılı yanıt döndür
    res.status(200).json({
      success: true,
      data: {
        user: demoUser,
        token: token
      }
    });
  } catch (error) {
    console.error('Login hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Giriş yapılırken bir hata oluştu', 
      error: error.message 
    });
  }
} 