const isDev = process.env.NODE_ENV === 'development';
const backendUrl = process.env.BACKEND_URL
  || (isDev ? 'http://localhost:5001' : 'https://lingloops-backend.onrender.com');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Sadece POST metodu desteklenir' });
  }

  try {
    const response = await fetch(`${backendUrl}/api/youtube-transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
        cookie: req.headers.cookie || '',
        authorization: req.headers.authorization || '',
      },
      body: JSON.stringify({
        url: req.body?.url,
        language_code: req.body?.language_code,
      }),
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : { error: await response.text() };

    return res.status(response.status).json(payload);
  } catch (error) {
    console.error('[youtube-transcript proxy] failed:', error);
    return res.status(500).json({
      error: 'Transkript servisi hatası',
    });
  }
}
