/**
 * Topic Hierarchy API Module
 * 
 * Handles topic tree management, subtopic generation, and content creation from topics.
 * 
 * @module endpoints/topic
 */

import { AxiosInstance } from 'axios';

// Topic Types
export interface Topic {
    id: string;
    title: string;
    description?: string;
    level?: string;
    parentId?: string;
    children?: Topic[];
    progress?: number;
    isLocked?: boolean;
    is_manual?: boolean;
    mood_tag?: string;
    latest_content?: TopicContent;
    created_at?: string;
    updated_at?: string;
}

export interface TopicContent {
    mp3_url?: string;
    vtt_url?: string;
    adapted_text?: string;
    translated_text?: string;
    words?: any[];
    timepoints?: any[];
    listened_at?: string;
    is_completed?: boolean;
    progress_percentage?: number;
    last_position_seconds?: number;
    dialogue_segments?: any[];
    message?: string;
    level?: string;
}

export interface CreateTopicParams {
    title: string;
    description?: string;
    level?: string;
    mood?: string;
    language?: string;
}

export interface GenerateSubtopicsParams {
    count?: number;
    language?: string;
    angle?: string;
}

export interface AddManualSubtopicParams {
    title: string;
    description?: string;
}

export interface CreateContentFromTopicParams {
    voice?: string;
    speaking_rate?: number;
}

export interface TopicTreeResponse {
    success: boolean;
    topics: Topic[];
    total: number;
}

export interface TopicResponse {
    success: boolean;
    topic: Topic;
}

export interface SubtopicsResponse {
    success: boolean;
    subtopics: Topic[];
}

export interface TopicPathResponse {
    success: boolean;
    path: Topic[];
}

export interface TopicContentResponse {
    success: boolean;
    topic: Topic;
    suggested_input: string;
}

export interface TopicSuggestionsResponse {
    success: boolean;
    suggestions: string[];
}

export interface IncompleteListeningItem {
    id: string;
    topic_id: string;
    user_id: string;
    mp3_url: string;
    vtt_url?: string;
    adapted_text?: string;
    translated_text?: string;
    words?: any[];
    timepoints?: any[];
    progress?: number;
    progress_percentage?: number;
    last_position_seconds?: number;
    total_duration_seconds?: number;
    last_listened_at?: string;
    topics?: {
        title: string;
        level: string;
    };
}

// Topic API Interface
export interface TopicApi {
    /** Get the full topic tree for the current user */
    getTree(): Promise<TopicTreeResponse>;

    /** Create a new main topic */
    createTopic(params: CreateTopicParams): Promise<TopicResponse>;

    /** Generate AI subtopics for a given parent topic */
    generateSubtopics(topicId: string, params?: GenerateSubtopicsParams): Promise<SubtopicsResponse>;

    /** Manually add a subtopic */
    addManualSubtopic(topicId: string, params: AddManualSubtopicParams): Promise<{ success: boolean; subtopic: Topic }>;

    /** Delete a topic and all its children */
    deleteTopic(topicId: string): Promise<{ success: boolean }>;

    /** Get the path from root to a specific topic */
    getPath(topicId: string): Promise<TopicPathResponse>;

    /** Create content (TTS) from a topic */
    createContent(topicId: string, params?: CreateContentFromTopicParams): Promise<TopicContentResponse>;

    /** Mark topic audio as listened */
    markListened(mp3Url: string): Promise<{ success: boolean }>;

    /** Get topic suggestions based on a prompt */
    getSuggestions(topic: string, language?: string): Promise<TopicSuggestionsResponse>;

    /** Get incomplete listening items */
    getIncompleteListenings(): Promise<{ success: boolean; items: IncompleteListeningItem[] }>;
}

/**
 * Creates the Topic API module
 */
export function createTopicApi(api: AxiosInstance): TopicApi {
    return {
        async getTree() {
            const response = await api.get<TopicTreeResponse>('/api/topic-hierarchy/topics/tree');
            return response.data;
        },

        async createTopic(params) {
            const response = await api.post<TopicResponse>('/api/topic-hierarchy/topics', params);
            return response.data;
        },

        async generateSubtopics(topicId, params = {}) {
            const response = await api.post<SubtopicsResponse>(
                `/api/topic-hierarchy/topics/${topicId}/subtopics`,
                params
            );
            return response.data;
        },

        async addManualSubtopic(topicId, params) {
            const response = await api.post<{ success: boolean; subtopic: Topic }>(
                `/api/topic-hierarchy/topics/${topicId}/subtopics/manual`,
                params
            );
            return response.data;
        },

        async deleteTopic(topicId) {
            const response = await api.delete<{ success: boolean }>(
                `/api/topic-hierarchy/topics/${topicId}`
            );
            return response.data;
        },

        async getPath(topicId) {
            const response = await api.get<TopicPathResponse>(
                `/api/topic-hierarchy/topics/${topicId}/path`
            );
            return response.data;
        },

        async createContent(topicId, params = {}) {
            const response = await api.post<TopicContentResponse>(
                `/api/topic-hierarchy/topics/${topicId}/create-content`,
                params
            );
            return response.data;
        },

        async markListened(mp3Url) {
            const response = await api.post<{ success: boolean }>(
                '/api/topic-hierarchy/topics/mark-listened',
                { mp3_url: mp3Url }
            );
            return response.data;
        },

        async getSuggestions(topic, language = 'en') {
            const response = await api.post<TopicSuggestionsResponse>(
                '/api/topic-pipeline/suggestions',
                { topic, language }
            );
            return response.data;
        },

        async getIncompleteListenings() {
            const response = await api.get<{ success: boolean; items: IncompleteListeningItem[] }>(
                '/api/topic-hierarchy/topics/incomplete'
            );
            return response.data;
        },
    };
}
