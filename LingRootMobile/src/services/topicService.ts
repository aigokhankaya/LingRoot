/**
 * Topic Service (New API Client Wrapper)
 * 
 * This service wraps topic tree API calls
 * using the new @lingroot/api-client.
 * 
 * Created: 2026-01-16
 */

import { getApiClientAsync } from '../services/apiClient';

// Types
export interface Topic {
    id: string;
    title: string;
    description?: string;
    level?: string;
    parent_id?: string;
    children?: Topic[];
    latest_content?: {
        id: string;
        mp3_url?: string;
        duration_seconds?: number;
        level?: string;
        translated_text?: string | null;
        adapted_text?: string | null;
        timepoints?: any;
        words?: string[];
        created_at?: string;
    };
}

/**
 * Get topic tree
 */
export async function getTopicTree(): Promise<{ success: boolean; data: { topics: Topic[] } }> {
    const client = await getApiClientAsync();
    const response = await client.http.get('/api/topic-hierarchy/topics/tree');
    return response.data;
}

/**
 * Create main topic
 */
export async function createMainTopic(data: { title: string; level: string }): Promise<Topic> {
    const client = await getApiClientAsync();
    const response = await client.http.post('/api/topic-hierarchy/topics', data);
    return response.data;
}

/**
 * Delete topic and children
 */
export async function deleteTopicAndChildren(topicId: string): Promise<void> {
    const client = await getApiClientAsync();
    await client.http.delete(`/api/topic-hierarchy/topics/${topicId}`);
}

/**
 * Generate subtopics with AI
 */
export async function generateSubtopics(
    topicId: string,
    options: { count: number; language: string }
): Promise<{ success: boolean; subtopics: Topic[] }> {
    const client = await getApiClientAsync();
    const response = await client.http.post(`/api/topic-hierarchy/topics/${topicId}/subtopics`, options);
    return response.data;
}

/**
 * Add manual subtopic
 */
export async function addManualSubtopic(
    parentId: string,
    data: { title: string }
): Promise<Topic> {
    const client = await getApiClientAsync();
    const response = await client.http.post(`/api/topic-hierarchy/topics/${parentId}/subtopics/manual`, data);
    return response.data;
}

/**
 * Generate topic narration from subject
 */
export async function generateTopicNarrationFromSubject(
    subject: string,
    level: string
): Promise<{ success: boolean; data: { translated_text?: string; adapted_text?: string } }> {
    const client = await getApiClientAsync();
    const response = await client.http.post('/api/tts/generate-topic-narration', { subject, level });
    return response.data;
}
