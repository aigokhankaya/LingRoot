// Ortak TTS ve altyazı oluşturma fonksiyonu
export async function generateAudioAndSubtitle({
  narrationText,
  level,
  speakingRate,
  voice
}: {
  narrationText: string;
  level: string;
  speakingRate: number;
  voice: string;
}) {
  const response = await fetch('/api/tts/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: narrationText,
      type: 'text',
      level,
      SesHızı: speakingRate,
      voice
    })
  });
  return await response.json();
} 