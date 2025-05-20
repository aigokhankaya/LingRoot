// Mock kullanıcı ilgi alanları API'si
export default function handler(req, res) {
  // CORS için OPTIONS isteğini işle
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }
  
  // GET isteği - ilgi alanlarını döndür
  if (req.method === 'GET') {
    // Token kontrolü
    const token = req.headers.authorization?.replace('Bearer ', '') || null;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Yetkilendirme başarısız: Token bulunamadı'
      });
    }
    
    // Mock ilgi alanları
    const interests = [
      'Teknoloji',
      'Bilim',
      'Tarih',
      'Müzik',
      'Spor'
    ];
    
    return res.status(200).json({
      success: true,
      data: interests
    });
  }
  
  // PUT isteği - ilgi alanlarını güncelle
  if (req.method === 'PUT') {
    // Token kontrolü
    const token = req.headers.authorization?.replace('Bearer ', '') || null;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Yetkilendirme başarısız: Token bulunamadı'
      });
    }
    
    // Gelen ilgi alanlarını al
    const { interests } = req.body;
    
    // İlgi alanları güncellenmiş gibi davran
    return res.status(200).json({
      success: true,
      message: 'İlgi alanları başarıyla güncellendi',
      data: interests
    });
  }
  
  // Desteklenmeyen HTTP metodu
  return res.status(405).json({
    success: false,
    message: 'Method Not Allowed'
  });
} 