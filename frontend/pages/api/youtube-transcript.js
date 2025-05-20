// YouTube transkript için fallback API
export default async function handler(req, res) {
  // CORS için OPTIONS isteğini işle
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }
  
  if (req.method === 'POST') {
    try {
      const { url, language_code } = req.body;
      
      if (!url) {
        return res.status(400).json({
          success: false,
          message: 'URL parametresi gereklidir'
        });
      }
      
      // YouTube video ID'sini çıkar
      const videoIdMatch = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/) || [];
      const videoId = videoIdMatch[1] || 'unknown';
      
      console.log(`Transcript istendi: ${videoId}, dil: ${language_code || 'auto'}`);
      
      // Mock transcript içeriği
      const mockTranscript = `
Bu videodaki örnek transcript içeriğidir (fallback).
Video ID: ${videoId}
Dil: ${language_code || 'auto'}

Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Proin euismod, nunc in aliquam ultrices, nisi enim aliquam ipsum,
vitae luctus nisl nunc in lectus. Donec auctor, nisl eget aliquam ultrices,
nisi enim aliquam ipsum, vitae luctus nisl nunc in lectus.
      `;
      
      return res.status(200).json({
        success: true,
        transcript: mockTranscript.trim(),
        video_id: videoId,
        language: language_code || 'auto'
      });
    } catch (error) {
      console.error('YouTube transcript API error:', error);
      return res.status(500).json({
        success: false,
        message: 'Transcript alınırken hata oluştu: ' + error.message
      });
    }
  }
  
  // Desteklenmeyen HTTP metodu
  return res.status(405).json({
    success: false,
    message: 'Method Not Allowed'
  });
} 