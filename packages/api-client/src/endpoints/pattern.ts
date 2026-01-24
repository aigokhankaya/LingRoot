/**
 * Pattern API Module
 * 
 * Handles daily usage patterns (idioms, expressions, proverbs) functionality.
 * 
 * @module endpoints/pattern
 */

import { AxiosInstance } from 'axios';

// Pattern Types
export interface Pattern {
    id: number;
    pattern: string;
    meaning: string;
    translation?: string;
    example_sentence: string;
    example_sentence_turkish?: string;
    level: string;
    type: 'idiom' | 'expression' | 'proverb' | 'phrasal_verb' | 'collocation';
    category?: string;
    frequency?: number;
    source?: string;
    created_at?: string;
    updated_at?: string;
}

export interface PatternMatch {
    pattern: Pattern;
    matchedText: string;
    startIndex: number;
    endIndex: number;
}

export interface PatternHistoryItem {
    id: number;
    pattern_id: number;
    user_id: string;
    content_id?: string;
    encountered_at: string;
    pattern?: Pattern;
}

export interface PatternsByLevelResponse {
    success: boolean;
    patterns: Pattern[];
    count: number;
}

export interface FindPatternsResponse {
    success: boolean;
    patterns: PatternMatch[];
    count: number;
}

export interface PatternHistoryResponse {
    success: boolean;
    patterns: PatternHistoryItem[];
    count: number;
}

// Pattern API Interface
export interface PatternApi {
    /** Get patterns by CEFR level */
    getByLevel(level: string): Promise<PatternsByLevelResponse>;

    /** Find patterns in a given text */
    findInText(text: string, level?: string): Promise<FindPatternsResponse>;

    /** Get user's pattern history */
    getHistory(): Promise<PatternHistoryResponse>;

    /** Get a specific pattern by ID */
    getById(patternId: number): Promise<{ success: boolean; pattern: Pattern }>;

    /** Record that a user has encountered a pattern */
    recordEncounter(patternId: number, contentId?: string): Promise<{ success: boolean }>;

    /** Get random patterns for daily practice */
    getDailyPatterns(level?: string, count?: number): Promise<PatternsByLevelResponse>;
}

/**
 * Creates the Pattern API module
 */
export function createPatternApi(api: AxiosInstance): PatternApi {
    return {
        async getByLevel(level) {
            const response = await api.get<PatternsByLevelResponse>(
                `/api/patterns/level/${level}`
            );
            return response.data;
        },

        async findInText(text, level) {
            const response = await api.post<FindPatternsResponse>(
                '/api/patterns/find',
                { text, level }
            );
            return response.data;
        },

        async getHistory() {
            const response = await api.get<PatternHistoryResponse>(
                '/api/patterns/history'
            );
            return response.data;
        },

        async getById(patternId) {
            const response = await api.get<{ success: boolean; pattern: Pattern }>(
                `/api/patterns/${patternId}`
            );
            return response.data;
        },

        async recordEncounter(patternId, contentId) {
            const response = await api.post<{ success: boolean }>(
                '/api/patterns/encounter',
                { patternId, contentId }
            );
            return response.data;
        },

        async getDailyPatterns(level, count = 5) {
            const params = new URLSearchParams();
            if (level) params.append('level', level);
            params.append('count', String(count));

            const response = await api.get<PatternsByLevelResponse>(
                `/api/patterns/daily?${params.toString()}`
            );
            return response.data;
        },
    };
}
