import { getApiClientAsync } from './apiClient';
import { CEFRLevel } from '../types';
import { createPodcastAsync, getActiveTtsJob, getJobStatus, processTextToSpeechAsync } from './ttsService';

export type StartGenerationType = 'text' | 'podcast' | 'topic';
export const START_ONBOARDING_PROGRESS_EVENT = 'LingRootStartOnboardingProgressChanged';

export interface StartGenerationProgress {
  text_completed: boolean;
  podcast_completed: boolean;
  topic_completed: boolean;
  count: number;
}

const START_TEXT_VOICE = 'lr_gb_chirp3hd_sulafat';
const START_TOPIC_VOICE = 'lr_gb_chirp3hd_sulafat';

export async function getStartGenerationProgress(): Promise<StartGenerationProgress> {
  const client = await getApiClientAsync();
  const response = await client.http.get('/api/user-settings/start-progress');
  return response.data?.data;
}

export function isStartOnboardingLocked(progress: StartGenerationProgress | null | undefined): boolean {
  return !!progress && progress.count < 3;
}

export async function createStartTextAudio(input: string, level: CEFRLevel) {
  return processTextToSpeechAsync({
    type: 'text',
    input,
    level,
    voice: START_TEXT_VOICE,
    voiceName: START_TEXT_VOICE,
    startGenerationType: 'text' as any,
  } as any);
}

export async function createStartPodcastAudio(topic: string, level: CEFRLevel) {
  return createPodcastAsync({
    topic,
    level,
    duration: 2,
    ttsProvider: 'google',
    hostSpeakerId: 'Kore',
    guestSpeakerId: 'Charon',
    startGenerationType: 'podcast' as any,
  } as any);
}

export async function createStartTopicAudio(topic: string, level: CEFRLevel) {
  return processTextToSpeechAsync({
    type: 'subject' as any,
    input: topic,
    level,
    voice: START_TOPIC_VOICE,
    voiceName: START_TOPIC_VOICE,
    startGenerationType: 'topic' as any,
  } as any);
}

export async function getStartGenerationActiveJob() {
  return getActiveTtsJob();
}

export async function getStartGenerationJobStatus(jobId: string) {
  return getJobStatus(jobId);
}
