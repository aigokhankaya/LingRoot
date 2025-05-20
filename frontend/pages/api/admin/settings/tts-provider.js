// Mock TTS provider ayarları API'si
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
    
    // Mock TTS provider ayarları
    const providerSettings = {
      provider: 'Google',
      apiKey: '***********',
      languageCodes: ['en-US', 'tr-TR', 'de-DE', 'fr-FR'],
      defaultLanguage: 'en-US',
      voices: [
        { id: 'en-US-Wavenet-A', name: 'English Female (US)', language: 'en-US' },
        { id: 'en-US-Wavenet-B', name: 'English Male (US)', language: 'en-US' },
        { id: 'tr-TR-Wavenet-A', name: 'Turkish Female', language: 'tr-TR' },
        { id: 'tr-TR-Wavenet-B', name: 'Turkish Male', language: 'tr-TR' }
      ]
    };
    
    return res.status(200).json({
      success: true,
      data: providerSettings
    });
  }
  
  // Desteklenmeyen HTTP metodu
  return res.status(405).json({
    success: false,
    message: 'Method Not Allowed'
  });
} 