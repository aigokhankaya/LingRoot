/**
 * 🎯 Chat Recommendation Service
 *
 * Sohbet akışında proaktif içerik önerileri sunar.
 * Doğal conversation flow içinde, zorlamadan öneri yapar.
 *
 * Trigger Sistemi:
 * 1. TOPIC_DETECTED - Kullanıcı açık konu belirtti
 * 2. IDLE_CONVERSATION - 4+ tur, yön yok
 * 3. VOCABULARY_OPPORTUNITY - İlgili kelime mention edildi
 * 4. SESSION_END - 10+ tur veya veda sinyali
 *
 * @module chatRecommendationService
 */

const db = require('../config/db');
const logger = require('../utils/common/logger.js');

class ChatRecommendationService {
    constructor() {
        // Trigger tanımları
        this.TRIGGERS = {
            TOPIC_DETECTED: {
                id: 'topic_detected',
                condition: 'Kullanıcı explicit konu belirtti',
                priority: 90,
                format: 'inline_suggestion',
                minTurns: 2,
                cooldownTurns: 5
            },
            IDLE_CONVERSATION: {
                id: 'idle_conversation',
                condition: '4+ tur, net yön yok',
                priority: 70,
                format: 'gentle_prompt',
                minTurns: 4,
                cooldownTurns: 6
            },
            VOCABULARY_OPPORTUNITY: {
                id: 'vocabulary_opportunity',
                condition: 'İlgili kelime mention edildi',
                priority: 60,
                format: 'contextual_offer',
                minTurns: 2,
                cooldownTurns: 8
            },
            SESSION_END: {
                id: 'session_end',
                condition: '10+ tur veya veda sinyali',
                priority: 80,
                format: 'summary_with_cta',
                minTurns: 8,
                cooldownTurns: 0
            }
        };

        // Veda sinyalleri
        this.GOODBYE_SIGNALS = [
            'görüşürüz', 'hoşça kal', 'bye', 'güle güle', 'sonra görüşürüz',
            'iyi geceler', 'iyi günler', 'kapanıyorum', 'gitmem lazım',
            'sonra devam ederiz', 'bugünlük bu kadar', 'teşekkürler bugünlük'
        ];

        // Konu kilitleme sinyalleri
        this.TOPIC_LOCK_SIGNALS = [
            'KONU KİLİTLENDİ', 'kilitlendi', 'bu konuyu seçtim', 'bunu yapalım',
            'bu ilginç', 'bununla devam edelim', 'tamam bu olsun'
        ];

        // İçerik formatları
        this.CONTENT_FORMATS = ['podcast', 'metin', 'diyalog'];

        // Cooldown tracking (in-memory, conversation bazlı)
        this._cooldowns = new Map();
    }

    /**
     * 🔍 Sohbet durumunu analiz et ve trigger kontrol et
     * @param {string} userId - Kullanıcı ID
     * @param {string} conversationId - Sohbet ID
     * @param {Array} messages - Son mesajlar [{role, content}]
     * @param {Object} context - Ek bağlam {topicLocked, currentTopic, userLevel}
     * @returns {Promise<Object|null>} Öneri objesi veya null
     */
    async checkForRecommendation(userId, conversationId, messages, context = {}) {
        try {
            const turnCount = Math.floor(messages.length / 2);
            const lastUserMessage = this._getLastUserMessage(messages);
            const lastAssistantMessage = this._getLastAssistantMessage(messages);

            // Cooldown kontrolü
            const cooldownKey = `${conversationId}`;
            const lastTriggerTurn = this._cooldowns.get(cooldownKey) || 0;

            // Trigger'ları öncelik sırasına göre kontrol et
            const triggers = Object.values(this.TRIGGERS)
                .sort((a, b) => b.priority - a.priority);

            for (const trigger of triggers) {
                // Minimum tur kontrolü
                if (turnCount < trigger.minTurns) continue;

                // Cooldown kontrolü
                if (turnCount - lastTriggerTurn < trigger.cooldownTurns) continue;

                // Trigger spesifik kontrol
                const triggered = await this._checkTrigger(
                    trigger,
                    messages,
                    lastUserMessage,
                    lastAssistantMessage,
                    context,
                    turnCount
                );

                if (triggered) {
                    // Cooldown güncelle
                    this._cooldowns.set(cooldownKey, turnCount);

                    // Öneri oluştur
                    const recommendation = await this._generateRecommendation(
                        trigger,
                        userId,
                        context,
                        lastUserMessage
                    );

                    if (recommendation) {
                        // Etkileşimi kaydet
                        await this._logRecommendation(userId, conversationId, trigger.id, recommendation);
                        return recommendation;
                    }
                }
            }

            return null;

        } catch (error) {
            logger.error('[ChatRecommendationService] Check failed:', error);
            return null;
        }
    }

    /**
     * Trigger koşulunu kontrol et
     */
    async _checkTrigger(trigger, messages, lastUserMsg, lastAssistantMsg, context, turnCount) {
        switch (trigger.id) {
            case 'topic_detected':
                return this._checkTopicDetected(lastAssistantMsg, context);

            case 'idle_conversation':
                return this._checkIdleConversation(messages, context, turnCount);

            case 'vocabulary_opportunity':
                return this._checkVocabularyOpportunity(lastUserMsg, context);

            case 'session_end':
                return this._checkSessionEnd(lastUserMsg, turnCount);

            default:
                return false;
        }
    }

    /**
     * Konu tespit edildi mi?
     */
    _checkTopicDetected(assistantMsg, context) {
        if (!assistantMsg) return false;

        // Konu kilitlendiyse
        if (context.topicLocked) return true;

        // Asistan mesajında konu kilitleme sinyali var mı
        const hasLockSignal = this.TOPIC_LOCK_SIGNALS.some(signal =>
            assistantMsg.toLowerCase().includes(signal.toLowerCase())
        );

        return hasLockSignal;
    }

    /**
     * Sohbet yön bekliyor mu?
     */
    _checkIdleConversation(messages, context, turnCount) {
        // Konu kilitlendiyse idle değil
        if (context.topicLocked || context.currentTopic) return false;

        // 4+ tur olmalı
        if (turnCount < 4) return false;

        // Son 4 mesajda soru mu sorulmuş
        const recentMessages = messages.slice(-8);
        const questionCount = recentMessages.filter(m =>
            m.role === 'assistant' && m.content.includes('?')
        ).length;

        // Çok fazla soru = yön yok
        return questionCount >= 3;
    }

    /**
     * Kelime öğrenme fırsatı var mı?
     */
    _checkVocabularyOpportunity(userMsg, context) {
        if (!userMsg) return false;

        // İngilizce kelime soruldu mu
        const vocabPatterns = [
            /ne demek/i,
            /anlamı ne/i,
            /nasıl söylenir/i,
            /kelime.*öğren/i,
            /vocabulary/i,
            /word.*mean/i
        ];

        return vocabPatterns.some(pattern => pattern.test(userMsg));
    }

    /**
     * Oturum sonu mu?
     */
    _checkSessionEnd(userMsg, turnCount) {
        if (!userMsg) return false;

        // 10+ tur ve veda sinyali
        if (turnCount >= 10) {
            return this.GOODBYE_SIGNALS.some(signal =>
                userMsg.toLowerCase().includes(signal)
            );
        }

        // 8+ turda güçlü veda
        if (turnCount >= 8) {
            const strongGoodbyes = ['görüşürüz', 'bye', 'güle güle', 'iyi geceler'];
            return strongGoodbyes.some(signal =>
                userMsg.toLowerCase().includes(signal)
            );
        }

        return false;
    }

    /**
     * 📝 Öneri oluştur
     */
    async _generateRecommendation(trigger, userId, context, userMessage) {
        const format = trigger.format;
        const topic = context.currentTopic || this._extractTopicFromMessage(userMessage);

        // Format'a göre öneri metni
        const templates = {
            inline_suggestion: {
                text: `Bu arada, "${topic || 'bu konu'}" hakkında senin için içerik hazırlayabilirim 🎧`,
                cta: 'İçerik Oluştur',
                dismissText: 'Şimdi değil'
            },
            gentle_prompt: {
                text: `Hmm, aklıma bir şey geldi... Konuştuklarımızdan ilgini çekebilecek bir içerik hazırlasam nasıl olur?`,
                cta: 'Görmek isterim',
                dismissText: 'Sohbete devam edelim'
            },
            contextual_offer: {
                text: `"${topic || 'Bu kelime'}" demişken, bununla ilgili hızlı bir kelime pratiği yapmak ister misin?`,
                cta: 'Pratik Yap',
                dismissText: 'Geç',
                type: 'vocabulary'
            },
            summary_with_cta: {
                text: `Bugün harika konuştuk! 🌟 Konuştuklarımızdan hangisini içeriğe dönüştürelim?`,
                cta: 'İçerik Seç',
                dismissText: 'Belki sonra',
                showTopicList: true
            }
        };

        const template = templates[format];
        if (!template) return null;

        return {
            type: 'recommendation',
            trigger: trigger.id,
            format: format,
            topic: topic,
            ...template,
            suggestedFormats: this.CONTENT_FORMATS,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Mesajdan konu çıkar (basit)
     */
    _extractTopicFromMessage(message) {
        if (!message) return null;

        // Konu kilitleme paternleri
        const patterns = [
            /(?:hakkında|konusunda|üzerine)\s+(.+?)(?:\s+konuş|$)/i,
            /(.+?)\s+(?:ilginç|güzel|harika)/i,
            /(.+?)\s+(?:istiyorum|isterim|konuşalım)/i
        ];

        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
                return match[1].trim().substring(0, 50);
            }
        }

        return null;
    }

    /**
     * Son kullanıcı mesajını al
     */
    _getLastUserMessage(messages) {
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                return messages[i].content;
            }
        }
        return null;
    }

    /**
     * Son asistan mesajını al
     */
    _getLastAssistantMessage(messages) {
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'assistant') {
                return messages[i].content;
            }
        }
        return null;
    }

    /**
     * 📊 Öneri etkileşimini logla
     */
    async _logRecommendation(userId, conversationId, triggerId, recommendation) {
        try {
            await db.query(
                `INSERT INTO recommendation_interactions
                 (user_id, conversation_id, trigger_type, recommendation_data, shown_at)
                 VALUES ($1, $2, $3, $4, NOW())
                 ON CONFLICT DO NOTHING`,
                [userId, conversationId, triggerId, JSON.stringify(recommendation)]
            );
        } catch (error) {
            // Tablo yoksa sessizce geç
            logger.debug('[ChatRecommendationService] Log failed:', error.message);
        }
    }

    /**
     * 📊 Öneri kabul/red kaydet
     */
    async recordInteraction(userId, conversationId, triggerId, accepted, selectedFormat = null) {
        try {
            await db.query(
                `UPDATE recommendation_interactions
                 SET accepted = $1, selected_format = $2, responded_at = NOW()
                 WHERE user_id = $3 AND conversation_id = $4 AND trigger_type = $5
                 AND responded_at IS NULL`,
                [accepted, selectedFormat, userId, conversationId, triggerId]
            );

            logger.info(`[ChatRecommendationService] Interaction recorded: ${triggerId} - ${accepted ? 'accepted' : 'dismissed'}`);
            return true;
        } catch (error) {
            logger.debug('[ChatRecommendationService] Record interaction failed:', error.message);
            return false;
        }
    }

    /**
     * 🧹 Eski cooldown'ları temizle
     */
    cleanupCooldowns() {
        // 1 saatten eski cooldown'ları temizle
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        for (const [key, value] of this._cooldowns.entries()) {
            if (typeof value === 'object' && value.timestamp < oneHourAgo) {
                this._cooldowns.delete(key);
            }
        }
    }

    /**
     * 📋 Öneriyi prompt'a inject edilecek formata çevir
     */
    formatRecommendationForPrompt(recommendation) {
        if (!recommendation) return '';

        return `
💡 PROACTIVE RECOMMENDATION TRIGGERED:
- Trigger: ${recommendation.trigger}
- Topic: ${recommendation.topic || 'Genel'}
- Suggested Action: ${recommendation.cta}

Eğer kullanıcı kabul ederse, içerik oluşturma akışına yönlendir.
Kabul etmezse, normal sohbete devam et - zorla!
`;
    }
}

module.exports = new ChatRecommendationService();
