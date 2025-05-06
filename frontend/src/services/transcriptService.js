export function extractVideoId(url) {
  const match = url.match(/[?&]v=([\w-]+)/);
  return match ? match[1] : '';
}

// Supadata API ile transcript alma
export async function fetchYoutubeTranscript(youtubeUrl) {
  const SUPADATA_API_KEY = process.env.NEXT_PUBLIC_SUPADATA_API_KEY || '';
  if (!SUPADATA_API_KEY) throw new Error('Supadata API anahtarı tanımlı değil.');
  const res = await fetch(`https://api.supadata.ai/v1/youtube/transcript?url=${encodeURIComponent(youtubeUrl)}`, {
    headers: {
      'x-api-key': SUPADATA_API_KEY
    }
  });
  if (!res.ok) throw new Error('Transcript alınamadı.');
  const data = await res.json();
  if (!data.content || !data.content.trim()) throw new Error('Transcript bulunamadı veya video desteklenmiyor.');
  return data.content;
}

// Eski ngrok fonksiyonu (kullanılmıyor, yedek)
async function fetchYoutubeTranscriptNgrok(youtubeUrl) {
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) throw new Error('Geçerli bir YouTube linki girin.');
  const res = await fetch(`https://7b19-2a02-...ngrok-free.app/transcript?video_id=${videoId}`);
  if (!res.ok) throw new Error('Transcript alınamadı.');
  const data = await res.json();
  return data.transcript;
} 