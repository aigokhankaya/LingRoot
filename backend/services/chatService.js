/**
 * 💬 Chat Service
 * 
 * aiChatController'dan ayrıştırılan iş mantığı.
 * Controller sadece HTTP request/response ile ilgilenir,
 * tüm business logic burada.
 */

const db = require('../config/db');
const logger = require('../utils/common/logger.js');
const claudeClient = require('../utils/ai/claudeClient.js');
const openaiClient = require('../utils/ai/openaiClient.js');
const userProfileAnalyzer = require('../utils/ai/userProfileAnalyzer.js');
const liroPromptGenerator = require('../utils/ai/liroPromptGenerator.js');
const liroContentGraph = require('../utils/ai/liroContentGraph.js');
const profileCache = require('../utils/storage/profileCache.js');
const webSearchService = require('../utils/content/webSearchService.js');
const directorAgentService = require('./directorAgentService');
const conversationSummaryService = require('./conversationSummaryService');
const dynamicLevelAnalyzer = require('../utils/content/dynamicLevelAnalyzer.js');
const { extractAndStoreTopic } = require('../lib/rag');
const {
    SENDER_TYPES,
    BEGINNER_LEVELS,
    OPENAI_MODELS,
    CHAT_LIMITS,
} = require('../constants/chatConstants');

class ChatService {
    /**
     * Kullanıcı profilini al (cache destekli)
     */
    async getUserProfile(userId, forceRefresh = false) {
        // Cache kontrolü
        if (!forceRefresh) {
            const cached = profileCache.get(userId);
            if (cached) {
                return cached;
            }
        }

        // Cache miss - DB'den al
        logger.info('🧠 Generating user profile for Liro (cache miss)...');
        const profile = await userProfileAnalyzer.generateUserProfile(userId);

        // Cache'e kaydet
        profileCache.set(userId, profile);

        return profile;
    }

    /**
     * Liro system prompt'u oluştur
     */
    async buildSystemPrompt(userId, userMessage, conversationId) {
        const userProfile = await this.getUserProfile(userId);

        // Web search (gerekirse)
        let searchResultsText = '';
        try {
            if (webSearchService.shouldSearch(userMessage)) {
                logger.info('🌐 Web search triggered for:', userMessage);
                const searchResults = await webSearchService.searchWeb(userMessage);
                if (searchResults.length > 0) {
                    searchResultsText = webSearchService.formatForPrompt(searchResults);
                }
            }
        } catch (err) {
            logger.warn('Web search failed silently:', err);
        }

        // Base prompt
        let systemPrompt = liroPromptGenerator.generateSystemPrompt(userProfile, searchResultsText);

        // Content overview ekleme
        try {
            const contentOverview = await liroContentGraph.getUserOverview(userId);
            const overviewPrompt = liroContentGraph.buildOverviewPromptSection(contentOverview);
            if (overviewPrompt) {
                systemPrompt = `${systemPrompt}\n\n${overviewPrompt}`;
            }
        } catch (err) {
            logger.warn('Failed to build content overview:', err);
        }

        // Conversation summary (sonsuz hafıza)
        try {
            const existingSummary = await conversationSummaryService.getExistingSummary(conversationId);
            const summaryText = conversationSummaryService.formatSummaryForPrompt(existingSummary);
            if (summaryText) {
                systemPrompt = `${systemPrompt}\n\n${summaryText}`;
            }
        } catch (err) {
            logger.warn('Conversation summary retrieval failed:', err);
        }

        // Director Agent - Mood analysis
        try {
            const userMood = await directorAgentService.analyzeMood(userMessage);
            const moodInstruction = directorAgentService.generatePersonaInstruction(userMood, 'chat_assistant');
            systemPrompt = `${systemPrompt}\n\n${moodInstruction}`;

            // Update conversation mood (async)
            db.query(`UPDATE conversations SET current_mood = $1 WHERE id = $2`, [userMood, conversationId])
                .catch(err => logger.warn('Failed to update conversation mood', err));
        } catch (err) {
            logger.warn('Director Agent mood analysis failed:', err);
        }

        return { systemPrompt, userProfile };
    }

    /**
     * AI model seç (seviyeye göre)
     */
    selectModel(userProfile) {
        const userLevel = userProfile?.learningProgress?.experienceLevel || 'B1';
        const isAdvanced = !BEGINNER_LEVELS.includes(userLevel);
        return isAdvanced ? OPENAI_MODELS.FULL : OPENAI_MODELS.MINI;
    }

    /**
     * AI yanıtı al (OpenAI, Claude fallback)
     */
    async getAIResponse(messageHistory, systemPrompt, model, streaming = false, onChunk = null) {
        try {
            if (streaming && onChunk) {
                return await openaiClient.generateChatCompletionStream(
                    messageHistory,
                    { systemPrompt, temperature: 0.8, model },
                    onChunk
                );
            } else {
                return await openaiClient.generateChatCompletion(messageHistory, {
                    systemPrompt,
                    temperature: 0.8,
                    model,
                });
            }
        } catch (openaiError) {
            logger.error('OpenAI API error, falling back to Claude:', openaiError);

            // Claude fallback
            const content = await claudeClient.generateResponse(messageHistory, { systemPrompt });
            return { content, usage: null };
        }
    }

    /**
     * Mesaj kaydet
     */
    async saveMessage(conversationId, userId, content, senderType) {
        const dbSenderType = senderType === SENDER_TYPES.ASSISTANT ? SENDER_TYPES.ADMIN : senderType;

        const result = await db.query(
            `INSERT INTO messages (conversation_id, sender_id, sender_type, content)
       VALUES ($1, $2, $3, $4)
       RETURNING id, conversation_id, $5 as role, content, created_at`,
            [conversationId, userId, dbSenderType, content, senderType]
        );

        return result.rows[0];
    }

    /**
     * Konu kilidi algıla ve işle
     */
    async handleTopicLock(assistantContent, conversationId, userId, messageCount) {
        const topicLockMatch = assistantContent.match(/KONU KİLİTLENDİ[:\s]*\*?\*?([^*\n]+)/i);

        if (topicLockMatch) {
            const lockedTopic = topicLockMatch[1].trim();
            logger.info(`🎯 Topic Lock detected: "${lockedTopic}"`);

            await db.query(
                'UPDATE conversations SET suggested_topic = $1, updated_at = NOW() WHERE id = $2',
                [lockedTopic, conversationId]
            );

            extractAndStoreTopic(conversationId, userId).catch(err => {
                logger.error('Background topic extraction failed after lock:', err);
            });

            return lockedTopic;
        }

        // Konu kilidi yoksa, yeterli mesaj varsa arka planda konu çıkar
        if (messageCount >= CHAT_LIMITS.TOPIC_EXTRACTION_THRESHOLD) {
            extractAndStoreTopic(conversationId, userId).catch(err => {
                logger.error('Background topic extraction failed:', err);
            });
        }

        return null;
    }

    /**
     * Conversation güncelle
     */
    async updateConversationTimestamp(conversationId) {
        await db.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);
    }

    /**
     * Cache invalidate (yeni içerik oluşturulduğunda çağır)
     */
    invalidateUserCache(userId) {
        profileCache.invalidate(userId);
    }
}

module.exports = new ChatService();
