// İçerik işleme API endpoint'i
// Bu dosya /api/content/process URL'ine yapılan POST isteklerini işler

// Auth token kontrolü yapan yardımcı fonksiyon
function verifyToken(token) {
  // Gerçek bir uygulamada bu kısım token doğrulama işlemi yapmalıdır
  // Bu örnek sadece gösterim amaçlıdır
  return token && token.startsWith('dummy_token_');
}

// İçerik tipi doğrulama
function validateContentType(type) {
  const validTypes = ['youtube', 'spotify', 'text'];
  return validTypes.includes(type);
}

// YouTube URL doğrulama
function validateYoutubeUrl(url) {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})$/;
  return youtubeRegex.test(url);
}

// Spotify URL doğrulama
function validateSpotifyUrl(url) {
  const spotifyRegex = /^(https?:\/\/)?(open\.spotify\.com\/(track|episode|show|album)\/[a-zA-Z0-9]{22})$/;
  return spotifyRegex.test(url);
}

// Ders ID oluşturma
function generateLessonId() {
  return `lesson_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
}

// API route handler
export default async function handler(req, res) {
  // Sadece POST isteklerini kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }
  
  try {
    // Token doğrulama
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    const token = authHeader.substring(7); // 'Bearer ' kısmını çıkar
    if (!verifyToken(token)) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    
    const { type, content, url } = req.body;
    
    // Gerekli alanları kontrol et
    if (!type || !content) {
      return res.status(400).json({ 
        success: false, 
        message: 'İçerik türü ve içerik alanları gereklidir' 
      });
    }
    
    // İçerik tipi doğrulama
    if (!validateContentType(type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Geçersiz içerik türü. Desteklenen türler: youtube, spotify, text' 
      });
    }
    
    // İçerik türüne göre özel doğrulama
    if (type === 'youtube' && !validateYoutubeUrl(url)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Geçersiz YouTube URL formatı' 
      });
    }
    
    if (type === 'spotify' && !validateSpotifyUrl(url)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Geçersiz Spotify URL formatı' 
      });
    }
    
    // Gerçek bir uygulamada, bu noktada içerik işleme servisi çağrılacaktır
    // Bu örnekte, işleme başarılı olduğunu varsayıp bir ders ID'si döndürüyoruz
    
    // İçerik işleme simülasyonu (2 saniye gecikme)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Ders ID oluştur
    const lessonId = generateLessonId();
    
    // Başarılı yanıt
    return res.status(200).json({
      success: true,
      message: 'İçerik başarıyla işlendi',
      lessonId,
      processedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Content process error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası, lütfen daha sonra tekrar deneyin' 
    });
  }
} 