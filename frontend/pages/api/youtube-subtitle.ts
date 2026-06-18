export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Sadece POST metodu desteklenir' });
  }

  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'Geçerli bir "url" değeri gönderin' });
    }

    const base = `https://yt-subtitle-api-na5bfjgtjq-ew.a.run.app/api/subtitle`;
    console.log('[YT SUBTITLE PROXY] POST →', base);

    // Yöntem 1'e birebir uy: Her zaman POST yap
    const response = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ url, temizle: true, dil: 'tr' })
    });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      let errBody: any = null;
      if (contentType.includes('application/json')) {
        try { errBody = await response.json(); } catch { errBody = null; }
      } else {
        try { errBody = await response.text(); } catch { errBody = ''; }
      }
      // Özel durum: Upstream NO_SUBTITLES hatası
      const noSubs = (errBody && (errBody?.detail?.error_code === 'NO_SUBTITLES' || errBody?.error_code === 'NO_SUBTITLES'));
      if (noSubs) {
        return res.status(404).json({ success: false, errorCode: 'NO_SUBTITLES', message: 'Bu videoda altyazı bulunmamaktadır', upstream: errBody });
      }
      console.error('[YT SUBTITLE PROXY] Upstream error:', response.status, response.statusText, errBody);
      return res.status(response.status).json({ success: false, error: 'Upstream API hatası', status: response.status, details: errBody });
    }

    // YALNIZCA JSON kabul et; aksi durumda reddet
    if (!contentType.includes('application/json')) {
      const bodyText = await response.text().catch(() => '');
      const preview = String(bodyText || '').slice(0, 300);
      return res.status(502).json({ success: false, error: 'Upstream JSON döndürmedi', details: preview });
    }

    const data = await response.json();
    // Upstream JSON 200 dönse bile NO_SUBTITLES olabilir
    if (data?.detail?.error_code === 'NO_SUBTITLES' || data?.error_code === 'NO_SUBTITLES') {
      return res.status(404).json({ success: false, errorCode: 'NO_SUBTITLES', message: 'Bu videoda altyazı bulunmamaktadır', upstream: data });
    }
    let subtitleText: any = (data as any)?.text ?? (data as any)?.data?.text ?? '';
    if (typeof subtitleText !== 'string') {
      subtitleText = String(subtitleText || '');
    }
    const suspectTokens = ['<!DOCTYPE html', '<html', '<script', 'window.WIZ_global_data', 'ytcfg=', 'ytInitialData'];
    const looksBad = subtitleText.trim().length === 0 || suspectTokens.some((tok) => subtitleText.includes(tok));
    if (looksBad) {
      const keys = data && typeof data === 'object' ? Object.keys(data) : [];
      return res.status(502).json({ success: false, error: 'Geçersiz yanıt: text alanı yok veya HTML/JS içeriyor', details: { keys, preview: subtitleText.slice(0, 300) } });
    }

    return res.status(200).json({ success: true, text: subtitleText });
  } catch (error: any) {
    console.error('[YT SUBTITLE PROXY] Exception:', error);
    return res.status(500).json({ success: false, error: 'Sunucu hatası', details: error?.message || String(error) });
  }
}

