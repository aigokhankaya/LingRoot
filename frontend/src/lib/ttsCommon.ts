// Ortak TTS ve altyazı oluşturma fonksiyonu
import { processTts, TtsResponseData, ProcessInputData } from './api';

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
}): Promise<TtsResponseData> {
  const payload: ProcessInputData = {
    type: 'text',
    input: narrationText,
    level,
    SesHızı: speakingRate,
    voice,
    suppressPlanAlerts: true
  };
  return await processTts(payload);
}

export async function translateAndSpeak({
  text,
  level,
  speakingRate,
  voice
}: {
  text: string;
  level: string;
  speakingRate: number;
  voice: string;
}) {
  const response = await fetch('/api/tts/translate-and-speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      level,
      speakingRate,
      voice
    })
  });

  if (!response.ok) {
    throw new Error('Failed to process text');
  }

  const result = await response.json();
  return {
    translatedText: result.translatedText,
    adaptedText: result.adaptedText,
    audio: result.audio
  };
}
