/**
 * @lingroot/api-client
 * Shared API Types for LingRoot Web and Mobile
 * 
 * Created: 2026-01-16
 * Version: 1.0
 */

// ============================================
// Common Response Types
// ============================================

export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    code?: string;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// ============================================
// Auth Types
// ============================================

export interface User {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    role: 'user' | 'admin';
    isVerified: boolean;
    createdAt: string;
    updatedAt?: string;
    locale?: string;
    phoneNumber?: string;
    avatar?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    data: {
        user: User;
        token: string;
        refreshToken: string;
    };
}

export interface RegisterRequest {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    password: string;
    locale?: string;
}

export interface RefreshTokenResponse {
    success: boolean;
    message: string;
    data: {
        token: string;
        refreshToken: string;
    };
}

// ============================================
// TTS Types
// ============================================

export type TTSInputType =
    | 'text'
    | 'youtube'
    | 'podcast'
    | 'file'
    | 'weblink'
    | 'topic'
    | 'book'
    | 'subject'
    | 'chapter';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface TTSRequest {
    type: TTSInputType;
    input?: string;
    level: CEFRLevel;
    voice?: string;
    speakingRate?: number;
    chapterId?: string;
    topicId?: string;
    targetDurationMinutes?: number;
    mood?: string;
}

export interface TTSResponse {
    success: boolean;
    message: string;
    mp3_url: string;
    vtt_url?: string;
    level: string;
    translatedText?: string;
    adaptedText?: string;
    timepoints?: WordTiming[];
    words?: string[];
    detectedMood?: string;
}

export interface WordTiming {
    word: string;
    timeSeconds: number;
    endTimeSeconds?: number;
    confidence?: number;
}

export interface AsyncJobResponse {
    success: boolean;
    jobId: string;
    message: string;
    estimatedTime: string;
}

export interface JobStatusResponse {
    success: boolean;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    result?: TTSResponse;
    error?: string;
}

// ============================================
// Voice Types
// ============================================

export type VoiceGender = 'male' | 'female';
export type VoiceAccent = 'american' | 'british' | 'australian' | 'indian';
export type VoiceQuality = 'basic' | 'premium' | 'gold' | 'platinum' | 'ultra' | 'generative';

export interface Voice {
    id: string;
    displayName: string;
    gender: VoiceGender;
    accent: VoiceAccent;
    quality: VoiceQuality;
    provider?: string;
    languageCodes?: string[];
}

export interface VoiceListResponse {
    success: boolean;
    voices: Voice[];
    defaultVoice: string;
    stats: {
        total: number;
        byGender: Record<VoiceGender, number>;
        byAccent: Record<VoiceAccent, number>;
        byQuality: Record<VoiceQuality, number>;
    };
}

// ============================================
// Content Types
// ============================================

export interface ContentHistoryItem {
    id: string;
    userId: string;
    inputType: TTSInputType;
    input: string;
    level: CEFRLevel;
    mp3Url: string;
    vttUrl?: string;
    translatedText?: string;
    adaptedText?: string;
    createdAt: string;
    isCompleted?: boolean;
    listeningProgress?: number;
}

export interface SubmitContentRequest {
    input: string;
    inputType: TTSInputType;
    level: CEFRLevel;
    mp3Url: string;
    translatedText?: string;
    adaptedText?: string;
    chapterId?: string | number;
    timepoints?: WordTiming[];
    words?: string[];
    detectedMood?: string;
    processingDurationMs?: number;
}

// ============================================
// Subscription Types
// ============================================

export interface SubscriptionPlan {
    id: string;
    name: string;
    price: number;
    currency: string;
    interval: 'month' | 'year';
    features: string[];
    limits: {
        dailyTts: number;
        dailyChat: number;
        audioStorage: number;
    };
    isActive: boolean;
}

export interface UserSubscription {
    id: string;
    planId: string;
    planName: string;
    status: 'active' | 'cancelled' | 'expired' | 'trial';
    startDate: string;
    endDate: string;
    autoRenew: boolean;
}

export interface UsageSummary {
    ttsUsedToday: number;
    ttsLimit: number;
    chatUsedToday: number;
    chatLimit: number;
    storageUsed: number;
    storageLimit: number;
    currentPlan: string;
    isUnlimited: boolean;
}

// ============================================
// Book Types
// ============================================

export interface Book {
    id: number;
    title: string;
    authors: string;
    coverUrl?: string;
    subjects?: string[];
    language?: string;
    totalChapters?: number;
}

export interface BookChapter {
    id: number;
    bookId: number;
    chapterIndex: number;
    title: string;
    text?: string;
    wordCount?: number;
    hasAudio?: boolean;
}

// ============================================
// AI Chat Types
// ============================================

export interface ChatConversation {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
}

export interface ChatMessage {
    id: string;
    conversationId: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
    audioUrl?: string;
}

export interface SendMessageRequest {
    conversationId: string;
    message: string;
    generateAudio?: boolean;
}

export interface SendMessageResponse {
    success: boolean;
    conversationId: string;
    message: ChatMessage;
    audioUrl?: string;
}

// ============================================
// Vocabulary & SRS Types
// ============================================

export interface VocabularyWord {
    id: string;
    word: string;
    definition: string;
    translation?: string;
    example?: string;
    partOfSpeech?: string;
    pronunciation?: string;
    audioUrl?: string;
}

export interface UserWord {
    id: string;
    wordId: string;
    word: string;
    mastery: number;
    nextReviewDate: string;
    reviewCount: number;
    easeFactor: number;
    interval: number;
}

export interface SRSReviewRequest {
    wordId: string;
    quality: 0 | 1 | 2 | 3 | 4 | 5;
}

export interface SRSReviewResponse {
    success: boolean;
    nextReviewDate: string;
    newInterval: number;
    newEaseFactor: number;
}

// ============================================
// Notification Types
// ============================================

export interface Notification {
    id: string;
    type: 'tts_complete' | 'podcast_complete' | 'achievement' | 'reminder' | 'system';
    title: string;
    message: string;
    data?: Record<string, unknown>;
    read: boolean;
    createdAt: string;
}

// ============================================
// Error Types
// ============================================

export interface ApiError {
    success: false;
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

export type ApiErrorCode =
    | 'INVALID_INPUT'
    | 'INVALID_CREDENTIALS'
    | 'INVALID_TOKEN'
    | 'EMAIL_NOT_VERIFIED'
    | 'EMAIL_IN_USE'
    | 'PHONE_IN_USE'
    | 'PASSWORD_TOO_SHORT'
    | 'USAGE_LIMIT_EXCEEDED'
    | 'NO_ACTIVE_PLAN'
    | 'SERVER_ERROR'
    | 'NETWORK_ERROR'
    | 'TIMEOUT';
