/**
 * TTS Service (New API Client Wrapper)
 * 
 * This service wraps the new @lingroot/api-client TTS module
 * to provide backward-compatible functions for the existing codebase.
 * 
 * Created: 2026-01-16
 * Updated: 2026-01-16 (Migrated functions from apiService)
 */

import { getApiClientAsync } from '../services/apiClient';
import { TTSRequest, TTSResponse, APIResponse } from '../types';

// Types
export interface Voice {
    name: string;
    displayName?: string;
    gender?: string;
    accent?: string;
    category?: string;
    quality?: string;
    languageCode?: string;
    ssmlSupport?: boolean;
}

export interface TtsProviderResponse {
    provider: string;
}

/**
 * Get current TTS provider setting
 */
export async function getTtsProvider(): Promise<TtsProviderResponse> {
    const client = await getApiClientAsync();
    try {
        const response = await client.http.get('/api/tts/provider');
        return response.data;
    } catch {
        return { provider: 'amazon' };
    }
}

/**
 * Update TTS provider setting
 */
export async function updateTtsProvider(provider: string): Promise<void> {
    const client = await getApiClientAsync();
    await client.http.post('/api/admin/settings', {
        key: 'tts_provider',
        value: provider
    });
}

/**
 * Get available voices (using filter endpoint with no params to get 'all' effective voices or default set)
 */
export async function getAvailableVoices(): Promise<APIResponse> {
    const client = await getApiClientAsync();
    try {
        const response = await client.http.get('/api/tts/voices/filter');
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Ses listesi yüklenemedi');
    }
}

/**
 * Get filtered voices
 */
export async function getFilteredVoices(
    accent?: string,
    gender?: string,
    emotion?: string,
    category?: string
): Promise<APIResponse> {
    const client = await getApiClientAsync();
    const params = new URLSearchParams();
    if (accent && accent !== 'all') params.append('accent', accent);
    if (gender && gender !== 'all') params.append('gender', gender);
    if (emotion && emotion !== 'all') params.append('emotion', emotion);
    if (category && category !== 'all') params.append('category', category);

    // Construct query string
    const queryString = params.toString();
    const url = queryString ? `/api/tts/voices/filter?${queryString}` : '/api/tts/voices/filter';

    try {
        const response = await client.http.get(url);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Sesler filtrelemedi');
    }
}

/**
 * Check active TTS job status
 */
export async function getActiveTtsJob(): Promise<{ success: boolean; hasActiveJob: boolean; job?: any }> {
    const client = await getApiClientAsync();
    try {
        const response = await client.http.get('/api/tts/job/active');
        return response.data;
    } catch (error: any) {
        if (error.response && error.response.status === 404) {
            return { success: false, hasActiveJob: false };
        }
        return { success: false, hasActiveJob: false };
    }
}

/**
 * Get topic suggestions
 */
export async function getTopicSuggestions(topic: string, level?: string): Promise<any> {
    const client = await getApiClientAsync();
    const response = await client.http.post('/api/topic-pipeline/suggestions', { topic, level });
    return response.data;
}

/**
 * Save default voice setting
 */
export async function saveDefaultVoiceSetting(voiceName: string): Promise<void> {
    const client = await getApiClientAsync();
    await client.http.post('/api/users/settings', {
        key: 'default_voice',
        value: voiceName
    });
}

/**
 * Get user settings
 */
export async function getUserSettings(): Promise<any> {
    const client = await getApiClientAsync();
    const response = await client.http.get('/api/users/settings');
    return response.data;
}

/**
 * Text-to-Speech API (Sync)
 */
export async function processTextToSpeech(request: TTSRequest): Promise<TTSResponse> {
    const client = await getApiClientAsync();
    try {
        const response = await client.http.post<TTSResponse>('/api/tts/process', request, {
            timeout: 600000, // 10 minutes
        });
        return response.data;
    } catch (error: any) {
        const code = error?.response?.data?.code;
        if (code === 'USAGE_LIMIT_EXCEEDED') {
            throw new Error('Paket kullanım sınırınız aşıldı. Lütfen paket yükseltin veya sonraki dönemi bekleyin.');
        }
        if (error.code === 'ECONNABORTED') {
            throw new Error('TTS işlemi zaman aşımına uğradı. Lütfen daha kısa bir metin deneyin.');
        }
        if (error.message === 'Network Error') {
            throw new Error('Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.');
        }
        throw new Error(error.response?.data?.message || 'TTS işlemi başarısız');
    }
}

/**
 * Topic narration generation (text only, no TTS) from a short subject/topic
 */
export async function generateTopicNarrationFromSubject(
    subject: string,
    level: string
): Promise<APIResponse<{ adapted_text: string; translated_text: string; level: string }>> {
    const client = await getApiClientAsync();
    try {
        const response = await client.http.post<
            APIResponse<{ adapted_text: string; translated_text: string; level: string }>
        >('/api/tts/process', {
            input: subject,
            type: 'subject',
            level,
            no_tts: true,
        }, {
            timeout: 600000,
        });
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Metin oluşturulamadı');
    }
}

/**
 * Podcast creation API (Sync)
 */
export async function createPodcast(params: {
    topic: string;
    level: string;
    duration: number | string;
    ttsProvider?: string;
    hostSpeakerId?: string;
    guestSpeakerId?: string;
    ttsModel?: string;
    styleType?: string;
    voiceChoice?: string;
    personalityA?: string;
    personalityB?: string;
    includeHumor?: boolean;
    includeFiller?: boolean;
}): Promise<any> {
    const client = await getApiClientAsync();
    try {
        const response = await client.http.post('/api/tts/create-podcast', {
            topic: params.topic,
            level: params.level,
            duration: params.duration,
            ttsProvider: params.ttsProvider || 'n8n',
            hostSpeakerId: params.ttsProvider === 'google' ? params.hostSpeakerId : undefined,
            guestSpeakerId: params.ttsProvider === 'google' ? params.guestSpeakerId : undefined,
            ttsModel: params.ttsProvider === 'google' ? params.ttsModel : undefined,
            styleType: params.styleType,
            voiceChoice: params.voiceChoice,
            personalityA: params.personalityA,
            personalityB: params.personalityB,
            includeHumor: params.includeHumor,
            includeFiller: params.includeFiller,
        }, {
            timeout: 600000,
        });
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Podcast oluşturma işlemi başarısız');
    }
}

/**
 * Podcast creation API (Async)
 */
export async function createPodcastAsync(params: {
    topic: string;
    level: string;
    duration: number | string;
    ttsProvider?: string;
    hostSpeakerId?: string;
    guestSpeakerId?: string;
    ttsModel?: string;
    styleType?: string;
    personalityA?: string;
    personalityB?: string;
    includeHumor?: boolean;
    includeFiller?: boolean;
}): Promise<{ success: boolean; jobId: string; message: string; estimatedTime: string }> {
    const client = await getApiClientAsync();
    try {
        const response = await client.http.post('/api/tts/create-podcast-async', {
            topic: params.topic,
            level: params.level,
            duration: params.duration,
            ttsProvider: params.ttsProvider || 'google',
            hostSpeakerId: params.hostSpeakerId,
            guestSpeakerId: params.guestSpeakerId,
            ttsModel: params.ttsModel,
            styleType: params.styleType,
            personalityA: params.personalityA,
            personalityB: params.personalityB,
            includeHumor: params.includeHumor,
            includeFiller: params.includeFiller,
        }, {
            timeout: 30000,
        });
        return response.data;
    } catch (error: any) {
        const msg = error.response?.data?.message || 'Async podcast işlemi başlatılamadı';
        const err: any = new Error(msg);
        if (error.response?.data?.code) {
            err.code = error.response.data.code;
        }
        throw err;
    }
}

/**
 * Text-to-Speech API (Async)
 */
export async function processTextToSpeechAsync(request: TTSRequest): Promise<{ success: boolean; jobId: string; message: string; estimatedTime: string }> {
    const client = await getApiClientAsync();
    try {
        const response = await client.http.post('/api/tts/process-async', request, {
            timeout: 30000,
        });
        return response.data;
    } catch (error: any) {
        const msg = error.response?.data?.message || 'Async TTS işlemi başlatılamadı';
        const err: any = new Error(msg);
        if (error.response?.data?.code) {
            err.code = error.response.data.code;
        }
        throw err;
    }
}

/**
 * File Upload TTS (Async)
 */
export async function processFileToSpeechAsync(file: FormData): Promise<{ success: boolean; jobId: string; message: string; estimatedTime: string }> {
    const client = await getApiClientAsync();
    try {
        const response = await client.http.post('/api/tts/process-async', file, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            timeout: 30000,
        });
        return response.data;
    } catch (error: any) {
        const msg = error.response?.data?.message || 'Async dosya TTS işlemi başlatılamadı';
        const err: any = new Error(msg);
        if (error.response?.data?.code) {
            err.code = error.response.data.code;
        }
        throw err;
    }
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<any> {
    const client = await getApiClientAsync();
    try {
        const response = await client.http.get(`/api/tts/job/${jobId}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Job durumu alınamadı');
    }
}

/**
 * Rewrite Text to Narration
 */
export async function rewriteToNarration(inputText: string, level: string): Promise<{ success: boolean; data?: { narration_text: string } }> {
    const client = await getApiClientAsync();
    try {
        const response = await client.http.post('/api/rewrite/narration', {
            text: inputText,
            level,
        });
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Metin dönüştürülemedi');
    }
}
