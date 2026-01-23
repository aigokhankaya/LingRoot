/**
 * @lingroot/api-client
 * TTS API Endpoints
 * 
 * Created: 2026-01-16
 * Version: 1.0
 */

import type { AxiosInstance } from 'axios';
import type {
    ApiResponse,
    TTSRequest,
    TTSResponse,
    AsyncJobResponse,
    JobStatusResponse,
    VoiceListResponse,
    Voice,
} from '../types';

export interface TTSApi {
    // Synchronous TTS processing
    process(request: TTSRequest): Promise<TTSResponse>;

    // Asynchronous TTS processing (with job queue)
    processAsync(request: TTSRequest): Promise<AsyncJobResponse>;
    getJobStatus(jobId: string): Promise<JobStatusResponse>;
    getActiveJob(): Promise<{ success: boolean; hasActiveJob: boolean; job?: JobStatusResponse }>;

    // Voice management
    listVoices(languageCode?: string): Promise<VoiceListResponse>;
    getFilteredVoices(filters: {
        gender?: string;
        accent?: string;
        category?: string;
    }): Promise<VoiceListResponse>;

    // Podcast creation
    createPodcast(params: PodcastParams): Promise<TTSResponse>;
    createPodcastAsync(params: PodcastParams): Promise<AsyncJobResponse>;
}

export interface PodcastParams {
    topic: string;
    level: string;
    duration: number | string;
    ttsProvider?: 'n8n' | 'google';
    hostSpeakerId?: string;
    guestSpeakerId?: string;
    ttsModel?: string;
    styleType?: string;
    voiceChoice?: string;
    personalityA?: string;
    personalityB?: string;
    includeHumor?: boolean;
    includeFiller?: boolean;
}

export function createTTSApi(api: AxiosInstance): TTSApi {
    return {
        async process(request: TTSRequest): Promise<TTSResponse> {
            const response = await api.post<TTSResponse>('/api/tts/process', request, {
                timeout: 600000, // 10 minutes for long TTS processing
            });
            return response.data;
        },

        async processAsync(request: TTSRequest): Promise<AsyncJobResponse> {
            const response = await api.post<AsyncJobResponse>('/api/tts/process-async', request, {
                timeout: 30000, // 30 seconds for job creation
            });
            return response.data;
        },

        async getJobStatus(jobId: string): Promise<JobStatusResponse> {
            const response = await api.get<JobStatusResponse>(`/api/tts/job/${encodeURIComponent(jobId)}`);
            return response.data;
        },

        async getActiveJob(): Promise<{ success: boolean; hasActiveJob: boolean; job?: JobStatusResponse }> {
            try {
                const response = await api.get<{ success: boolean; hasActiveJob: boolean; job?: JobStatusResponse }>(
                    '/api/tts/job/active'
                );
                return response.data;
            } catch {
                return { success: false, hasActiveJob: false };
            }
        },

        async listVoices(languageCode?: string): Promise<VoiceListResponse> {
            const params = languageCode ? { languageCode } : {};
            const response = await api.get<VoiceListResponse>('/api/tts/voices', { params });
            return response.data;
        },

        async getFilteredVoices(filters: {
            gender?: string;
            accent?: string;
            category?: string;
        }): Promise<VoiceListResponse> {
            const response = await api.get<VoiceListResponse>('/api/tts/voices/filter', { params: filters });
            return response.data;
        },

        async createPodcast(params: PodcastParams): Promise<TTSResponse> {
            const response = await api.post<TTSResponse>('/api/tts/create-podcast', params, {
                timeout: 600000,
            });
            return response.data;
        },

        async createPodcastAsync(params: PodcastParams): Promise<AsyncJobResponse> {
            const response = await api.post<AsyncJobResponse>('/api/tts/create-podcast-async', params, {
                timeout: 30000,
            });
            return response.data;
        },
    };
}
