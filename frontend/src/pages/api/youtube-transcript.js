export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, model = 'large' } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  // YouTube URL validation
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)?([a-zA-Z0-9_-]{11})/;
  if (!youtubeRegex.test(url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL format' });
  }

  try {
    console.log('🔍 [API TRANSCRIPT] Starting transcript extraction...');
    console.log('🔍 [API TRANSCRIPT] URL:', url);
    console.log('🔍 [API TRANSCRIPT] Model:', model);

    // Extract video ID from URL
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/)?.[1] || 'unknown';
    console.log('🔍 [API TRANSCRIPT] Video ID:', videoId);

    // aiprojeleri.online API'sine istek gönder
    const requestBody = {
      url: url,
      model: model
    };
    
    console.log('🔍 [API TRANSCRIPT] Request body:', JSON.stringify(requestBody));
    console.log('🔍 [API TRANSCRIPT] Making request to: https://api.aiprojeleri.online/transcribe');

    const apiResponse = await fetch('https://api.aiprojeleri.online/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'LingRoot-Transcript-Client/1.0'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('🔍 [API TRANSCRIPT] API Response status:', apiResponse.status);
    console.log('🔍 [API TRANSCRIPT] API Response headers:', Object.fromEntries(apiResponse.headers.entries()));

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('🔍 [API TRANSCRIPT] API Error Response:', errorText);
      throw new Error(`API request failed: ${apiResponse.status} - ${errorText}`);
    }

    const apiData = await apiResponse.json();
    console.log('🔍 [API TRANSCRIPT] Raw API Response:', JSON.stringify(apiData, null, 2));

    // API yanıtını kontrol et
    if (!apiData) {
      throw new Error('API yanıtı boş');
    }

    if (!apiData.transcript) {
      console.error('🔍 [API TRANSCRIPT] No transcript in response. Available keys:', Object.keys(apiData));
      throw new Error('API yanıtında transcript bulunamadı');
    }

    // Demo transcript kontrolü - eğer demo içerik varsa hata ver
    if (apiData.transcript.includes('Bu bir demo transkript') || 
        apiData.transcript.includes('demo transcript') ||
        apiData.transcript.includes('demo content')) {
      console.error('🔍 [API TRANSCRIPT] Demo transcript detected!');
      throw new Error('Demo transcript alındı - gerçek API yanıtı gerekli');
    }

    console.log('🔍 [API TRANSCRIPT] Valid transcript received. Length:', apiData.transcript.length);
    console.log('🔍 [API TRANSCRIPT] Transcript preview:', apiData.transcript.substring(0, 200) + '...');

    // Processed response formatı
    const processedResponse = {
      success: true,
      videoId: videoId,
      title: apiData.title || `YouTube Video ${videoId}`,
      transcript: apiData.transcript,
      language: apiData.language || 'en',
      source: 'aiprojeleri.online',
      extractedAt: new Date().toISOString(),
      statistics: {
        wordCount: apiData.transcript.split(' ').length,
        characterCount: apiData.transcript.length,
        duration: apiData.duration || null
      }
    };

    console.log('🔍 [API TRANSCRIPT] Success! Returning processed response');
    console.log('🔍 [API TRANSCRIPT] Final response keys:', Object.keys(processedResponse));
    
    return res.status(200).json(processedResponse);

  } catch (error) {
    console.error('🔍 [API TRANSCRIPT] Error occurred:', error);
    console.error('🔍 [API TRANSCRIPT] Error message:', error.message);
    console.error('🔍 [API TRANSCRIPT] Error stack:', error.stack);
    
    // Provide specific error messages
    let errorMessage = 'Transcript alma işlemi başarısız oldu';
    if (error.message.includes('404')) {
      errorMessage = 'Video bulunamadı veya transcript mevcut değil';
    } else if (error.message.includes('403')) {
      errorMessage = 'Video erişimi kısıtlı (private video)';
    } else if (error.message.includes('500')) {
      errorMessage = 'API sunucu hatası';
    } else if (error.message.includes('fetch')) {
      errorMessage = 'API bağlantı hatası';
    } else if (error.message.includes('Demo transcript')) {
      errorMessage = 'Demo transcript alındı - gerçek API yanıtı gerekli';
    }
    
    return res.status(500).json({ 
      error: errorMessage,
      details: error.message,
      videoId: url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/)?.[1] || 'unknown'
    });
  }
} 