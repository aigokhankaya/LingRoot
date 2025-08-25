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