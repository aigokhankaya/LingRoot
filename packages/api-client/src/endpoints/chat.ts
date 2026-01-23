/**
 * @lingroot/api-client
 * Chat API Endpoints (Liro AI Assistant)
 * 
 * Created: 2026-01-16
 * Version: 1.0
 */

import type { AxiosInstance } from 'axios';
import type {
    ApiResponse,
    ChatConversation,
    ChatMessage,
    SendMessageRequest,
    SendMessageResponse,
} from '../types';

export interface ChatApi {
    // Conversations
    getConversations(): Promise<ApiResponse<ChatConversation[]>>;
    getConversation(id: string): Promise<ApiResponse<ChatConversation & { messages: ChatMessage[] }>>;
    createConversation(title?: string): Promise<ApiResponse<ChatConversation>>;
    deleteConversation(id: string): Promise<ApiResponse>;

    // Messages
    sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;
    getMessageAudio(messageId: string): Promise<ApiResponse<{ audioUrl: string }>>;

    // Liro Insights
    getInsights(): Promise<ApiResponse<{
        interests: string[];
        learningStyle: string;
        preferredTopics: string[];
        cefrProgress: Record<string, number>;
    }>>;
}

export function createChatApi(api: AxiosInstance): ChatApi {
    return {
        async getConversations(): Promise<ApiResponse<ChatConversation[]>> {
            const response = await api.get<ApiResponse<ChatConversation[]>>('/api/ai-chat/conversations');
            return response.data;
        },

        async getConversation(id: string): Promise<ApiResponse<ChatConversation & { messages: ChatMessage[] }>> {
            const response = await api.get<ApiResponse<ChatConversation & { messages: ChatMessage[] }>>(
                `/api/ai-chat/conversations/${encodeURIComponent(id)}`
            );
            return response.data;
        },

        async createConversation(title?: string): Promise<ApiResponse<ChatConversation>> {
            const response = await api.post<ApiResponse<ChatConversation>>('/api/ai-chat/conversations', { title });
            return response.data;
        },

        async deleteConversation(id: string): Promise<ApiResponse> {
            const response = await api.delete<ApiResponse>(
                `/api/ai-chat/conversations/${encodeURIComponent(id)}`
            );
            return response.data;
        },

        async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
            // Backend expects conversationId in the URL path
            if (!request.conversationId) {
                throw new Error('conversationId is required for sendMessage');
            }
            const response = await api.post<SendMessageResponse>(
                `/api/ai-chat/conversations/${encodeURIComponent(request.conversationId)}/messages`,
                { message: request.message, generateAudio: request.generateAudio },
                { timeout: 120000 } // 2 minutes for AI response
            );
            return response.data;
        },

        async getMessageAudio(messageId: string): Promise<ApiResponse<{ audioUrl: string }>> {
            const response = await api.post<ApiResponse<{ audioUrl: string }>>(
                `/api/ai-chat/tts`,
                { messageId }
            );
            return response.data;
        },

        async getInsights(): Promise<ApiResponse<{
            interests: string[];
            learningStyle: string;
            preferredTopics: string[];
            cefrProgress: Record<string, number>;
        }>> {
            const response = await api.get('/api/ai-chat/insights');
            return response.data;
        },
    };
}
