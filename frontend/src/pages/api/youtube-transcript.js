export default async function handler(req, res) {
  // Sadece POST isteklerine izin ver
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST metodu desteklenir' });
  }

  try {
    // İsteği doğrudan transcript servisine yönlendir
    const response = await fetch('http://localhost:8001/scrape-transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    // Servisin yanıtını al
    const data = await response.json();

    // Yanıtı olduğu gibi aktar
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('YouTube transkript servisi hatası:', error);
    return res.status(500).json({ error: 'Transkript servisi hatası', details: error.message });
  }
} 