/**
 * Chat ve Liro ile ilgili sabit değerler
 * Magic string'ler yerine bu dosyayı kullan
 */

// Sender Types
const SENDER_TYPES = {
    USER: 'user',
    ASSISTANT: 'assistant',
    ADMIN: 'admin', // DB'de 'admin' olarak kayıtlı, frontend'de 'assistant' olarak gösteriliyor
    SYSTEM: 'system',
};

// CEFR Seviyeleri
const CEFR_LEVELS = {
    A1: 'A1',
    A2: 'A2',
    B1: 'B1',
    B2: 'B2',
    C1: 'C1',
    C2: 'C2',
};

const CEFR_LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Beginner seviyeleri (gpt-4o-mini kullanılacak)
const BEGINNER_LEVELS = ['A1', 'A2', 'B1'];

// Advanced seviyeleri (gpt-4o kullanılacak)
const ADVANCED_LEVELS = ['B2', 'C1', 'C2'];

// OpenAI Model Seçimi
const OPENAI_MODELS = {
    MINI: 'gpt-4o-mini',
    FULL: 'gpt-4o',
};

// Deneyim Seviyeleri
const EXPERIENCE_LEVELS = {
    BEGINNER: 'beginner',
    INTERMEDIATE: 'intermediate',
    ADVANCED: 'advanced',
    EXPERT: 'expert',
};

// Prompt Dosya Yolları (config'den okunmalı ancak fallback olarak burada)
const PROMPT_PATHS = {
    LIRO_PERSONALIZED: 'prompts/liro_system_personalized.txt',
    LIRO_DEFAULT: 'prompts/liro_system_default.txt',
    LIRO_DAILY: 'prompts/liro_daily_suggestions.txt',
};

// Cache Süreleri (saniye)
const CACHE_TTL = {
    USER_PROFILE: 300, // 5 dakika
    CONTENT_OVERVIEW: 180, // 3 dakika
    TOPIC_SUGGESTIONS: 600, // 10 dakika
};

// Sohbet Limitleri
const CHAT_LIMITS = {
    MAX_HISTORY_MESSAGES: 30,
    MAX_CONTEXT_MESSAGES: 15,
    SUMMARY_THRESHOLD: 20,
    TOPIC_EXTRACTION_THRESHOLD: 6,
    MAX_CONVERSATIONS_LIST: 50,
};

// Conversation Durumları
const CONVERSATION_STATUS = {
    ACTIVE: 'active',
    ARCHIVED: 'archived',
    DELETED: 'deleted',
};

// Mood Türleri (Director Agent)
const MOOD_TYPES = {
    NEUTRAL: 'Neutral',
    HAPPY: 'Happy',
    FRUSTRATED: 'Frustrated',
    CURIOUS: 'Curious',
    CONFUSED: 'Confused',
    MOTIVATED: 'Motivated',
};

module.exports = {
    SENDER_TYPES,
    CEFR_LEVELS,
    CEFR_LEVEL_ORDER,
    BEGINNER_LEVELS,
    ADVANCED_LEVELS,
    OPENAI_MODELS,
    EXPERIENCE_LEVELS,
    PROMPT_PATHS,
    CACHE_TTL,
    CHAT_LIMITS,
    CONVERSATION_STATUS,
    MOOD_TYPES,
};
