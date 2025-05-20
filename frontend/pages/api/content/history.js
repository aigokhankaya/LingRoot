// Mock içerik geçmişi API'si
export default function handler(req, res) {
  // CORS için OPTIONS isteğini işle
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    // Token kontrolü
    const token = req.headers.authorization?.replace('Bearer ', '') || null;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Yetkilendirme başarısız: Token bulunamadı'
      });
    }
    
    // Mock içerik geçmişi
    const historyItems = [
      {
        id: 'mock-item-1',
        title: 'Teknoloji Haberleri',
        type: 'text',
        content: 'Bu bir örnek metindir. Teknolojik gelişmeler hakkında metin.',
        createdAt: new Date().toISOString(),
        level: 'B1'
      },
      {
        id: 'mock-item-2',
        title: 'Bilim Belgeseli',
        type: 'youtube',
        content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        level: 'B2'
      },
      {
        id: 'mock-item-3',
        title: 'Tarih Dersi',
        type: 'text',
        content: 'Tarih hakkında örnek bir içerik metni.',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        level: 'C1'
      }
    ];
    
    return res.status(200).json({
      success: true,
      data: {
        history: historyItems
      }
    });
  }
  
  // Desteklenmeyen HTTP metodu
  return res.status(405).json({
    success: false,
    message: 'Method Not Allowed'
  });
} 