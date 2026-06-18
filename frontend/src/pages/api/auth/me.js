const isDev = process.env.NODE_ENV === 'development';
const backendUrl = process.env.BACKEND_URL
  || (isDev ? 'http://localhost:5001' : 'https://lingloops-backend.onrender.com');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    const response = await fetch(`${backendUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        cookie: req.headers.cookie || '',
        authorization: req.headers.authorization || '',
        accept: 'application/json',
      },
    });

    const payload = await response.json();
    return res.status(response.status).json(payload);
  } catch (error) {
    console.error('[auth/me proxy] failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Kullanıcı bilgisi alınamadı',
    });
  }
}
