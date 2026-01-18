/**
 * User Interests API Proxy
 * 
 * Bu dosya artık mock veri döndürmek yerine backend API'sine proxy yapar.
 * Gerçek veri backend/controllers/interestController.js tarafından sağlanır.
 */

export default async function handler(req, res) {
  // CORS için OPTIONS isteğini işle
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  // Token kontrolü
  const token = req.headers.authorization || null;
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Yetkilendirme başarısız: Token bulunamadı'
    });
  }

  // Backend URL'ini belirle
  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
  const targetUrl = `${backendUrl}/api/user-interests`;

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    };

    // PUT isteği için body ekle
    if (req.method === 'PUT' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json();

    // Backend yanıtını olduğu gibi döndür
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[user-interests proxy] Backend isteği başarısız:', error.message);

    // Backend erişilemezse hata döndür (artık mock veri yok)
    return res.status(503).json({
      success: false,
      message: 'Backend servisi şu anda erişilemiyor. Lütfen daha sonra tekrar deneyin.',
      error: error.message
    });
  }
}