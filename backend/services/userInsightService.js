/**
 * 🧠 User Insight Service
 * 
 * Kullanıcı tercihlerini, alışkanlıklarını ve özelliklerini
 * sohbetlerden otomatik olarak çıkarıp veritabanında saklar.
 * 
 * Bu bilgiler Liro'nun kullanıcıyı "tanımasını" sağlar.
 */

const db = require('../config/db');
const logger = require('../utils/logger');
const openaiClient = require('../utils/openaiClient');
const fs = require('fs');
const path = require('path');

class UserInsightService {
    constructor() {
        this.extractionPrompt = null;
        this.loadPrompt();
    }

    /**
     * Extraction prompt'u yükle
     */
    loadPrompt() {
        try {
            const promptPath = path.join(__dirname, '../prompts/liro/user_insight_extraction.txt');
            this.extractionPrompt = fs.readFileSync(promptPath, 'utf-8');
        } catch (error) {
            logger.error('[UserInsightService] Failed to load extraction prompt:', error);
            this.extractionPrompt = 'Analyze the conversation and extract user insights in JSON format.';
        }
    }

    /**
     * Sohbetten insight çıkar
     * @param {string} userId - Kullanıcı ID
     * @param {string} conversationId - Sohbet ID
     * @param {Array} messages - Mesaj listesi [{role, content}]
     * @returns {Promise<Array>} Çıkarılan insight'lar
     */
    async extractInsights(userId, conversationId, messages) {
        if (!messages || messages.length < 4) {
            logger.debug('[UserInsightService] Not enough messages for insight extraction');
            return [];
        }

        try {
            // Son 20 mesajı al (çok uzun context'ten kaçın)
            const recentMessages = messages.slice(-20);

            // Sohbeti formatlı string'e çevir
            const conversationText = recentMessages
                .map(m => `${m.role === 'user' ? 'Kullanıcı' : 'Asistan'}: ${m.content}`)
                .join('\n');

            // AI'dan insight çıkar
            const response = await openaiClient.generateChatCompletion([
                { role: 'user', content: `${this.extractionPrompt}\n\n---\n\n${conversationText}` }
            ], {
                temperature: 0.3,
                maxTokens: 500,
                model: 'gpt-4o-mini',
                systemPrompt: 'You are a User Insight Extraction agent. Output valid JSON only.'
            });

            // JSON parse
            const content = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(content);

            if (result.no_new_insights || !result.insights || result.insights.length === 0) {
                logger.debug('[UserInsightService] No new insights found');
                return [];
            }

            // Insight'ları kaydet
            const savedInsights = [];
            for (const insight of result.insights) {
                const saved = await this.storeInsight(
                    userId,
                    insight.type,
                    insight.value,
                    insight.confidence || 70,
                    conversationId
                );
                if (saved) savedInsights.push(saved);
            }

            logger.info(`[UserInsightService] Extracted ${savedInsights.length} new insights for user ${userId}`);
            return savedInsights;

        } catch (error) {
            logger.error('[UserInsightService] Insight extraction failed:', error);
            return [];
        }
    }

    /**
     * Insight'ı veritabanına kaydet
     * @param {string} userId 
     * @param {string} type - like, dislike, habit, goal, trait, preference
     * @param {string} value 
     * @param {number} confidence 
     * @param {string} conversationId 
     */
    async storeInsight(userId, type, value, confidence = 70, conversationId = null) {
        try {
            // Aynı insight zaten var mı kontrol et (duplicate önleme)
            const existing = await db.query(
                `SELECT id FROM user_insights 
                 WHERE user_id = $1 AND insight_type = $2 AND LOWER(insight_value) = LOWER($3)`,
                [userId, type, value]
            );

            if (existing.rows.length > 0) {
                // Var olan insight'ın confidence'ını güncelle (daha yüksekse)
                await db.query(
                    `UPDATE user_insights 
                     SET confidence = GREATEST(confidence, $1), updated_at = NOW()
                     WHERE id = $2`,
                    [confidence, existing.rows[0].id]
                );
                logger.debug(`[UserInsightService] Updated existing insight confidence: ${value}`);
                return null;
            }

            // Yeni insight ekle
            const result = await db.query(
                `INSERT INTO user_insights (user_id, insight_type, insight_value, confidence, source_conversation_id)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [userId, type, value, confidence, conversationId]
            );

            logger.info(`[UserInsightService] Stored new insight: [${type}] ${value}`);
            return result.rows[0];

        } catch (error) {
            logger.error('[UserInsightService] Failed to store insight:', error);
            return null;
        }
    }

    /**
     * Kullanıcının tüm aktif insight'larını getir
     * @param {string} userId 
     * @returns {Promise<Object>} Kategorize edilmiş insight'lar
     */
    async getInsights(userId) {
        try {
            const result = await db.query(
                `SELECT insight_type, insight_value, confidence, created_at
                 FROM user_insights
                 WHERE user_id = $1 AND is_active = true
                 ORDER BY confidence DESC, created_at DESC`,
                [userId]
            );

            // Kategorize et
            const insights = {
                likes: [],
                dislikes: [],
                habits: [],
                goals: [],
                traits: [],
                preferences: [],
            };

            for (const row of result.rows) {
                const category = `${row.insight_type}s`;
                if (insights[category]) {
                    insights[category].push({
                        value: row.insight_value,
                        confidence: row.confidence,
                    });
                }
            }

            return insights;

        } catch (error) {
            logger.error('[UserInsightService] Failed to get insights:', error);
            return {
                likes: [],
                dislikes: [],
                habits: [],
                goals: [],
                traits: [],
                preferences: [],
            };
        }
    }

    /**
     * Insight'ları prompt formatına çevir
     * @param {Object} insights - getInsights() çıktısı
     * @returns {string} Prompt'a eklenecek metin
     */
    formatForPrompt(insights) {
        if (!insights) return '';

        const sections = [];

        if (insights.likes?.length > 0) {
            sections.push(`👍 SEVDİĞİ ŞEYLER: ${insights.likes.map(i => i.value).join(', ')}`);
        }
        if (insights.dislikes?.length > 0) {
            sections.push(`👎 SEVMEDİĞİ ŞEYLER: ${insights.dislikes.map(i => i.value).join(', ')}`);
        }
        if (insights.habits?.length > 0) {
            sections.push(`🔄 ALIŞKANLIKLARI: ${insights.habits.map(i => i.value).join(', ')}`);
        }
        if (insights.goals?.length > 0) {
            sections.push(`🎯 HEDEFLERİ: ${insights.goals.map(i => i.value).join(', ')}`);
        }
        if (insights.preferences?.length > 0) {
            sections.push(`⚙️ TERCİHLERİ: ${insights.preferences.map(i => i.value).join(', ')}`);
        }
        if (insights.traits?.length > 0) {
            sections.push(`✨ KİŞİLİK ÖZELLİKLERİ: ${insights.traits.map(i => i.value).join(', ')}`);
        }

        if (sections.length === 0) return '';

        return `\n📋 KULLANICI PERSONA (Öğrenilmiş Bilgiler):\n${sections.join('\n')}\n\nBu bilgileri kullanıcıyla etkileşimlerinde dikkate al. Sevmediği şeylerden kaçın, tercihlerine uy.`;
    }

    /**
     * Bir insight'ı devre dışı bırak
     * @param {string} insightId 
     * @param {string} userId - Yetkilendirme için
     */
    async deactivateInsight(insightId, userId) {
        try {
            await db.query(
                `UPDATE user_insights SET is_active = false WHERE id = $1 AND user_id = $2`,
                [insightId, userId]
            );
            logger.info(`[UserInsightService] Deactivated insight ${insightId}`);
            return true;
        } catch (error) {
            logger.error('[UserInsightService] Failed to deactivate insight:', error);
            return false;
        }
    }

    /**
     * Kullanıcının insight istatistiklerini getir
     * @param {string} userId 
     */
    async getStats(userId) {
        try {
            const result = await db.query(
                `SELECT 
                    insight_type,
                    COUNT(*) as count,
                    AVG(confidence) as avg_confidence
                 FROM user_insights
                 WHERE user_id = $1 AND is_active = true
                 GROUP BY insight_type`,
                [userId]
            );
            return result.rows;
        } catch (error) {
            logger.error('[UserInsightService] Failed to get stats:', error);
        }
    }

    /**
     * 🔄 Content rating'den otomatik insight çıkar
     * Rating ve feedback'e göre kullanıcı tercihlerini öğren
     * 
     * @param {string} userId 
     * @param {string} contentId 
     * @param {number} rating - 1 (beğendi) veya -1 (beğenmedi)
     * @param {string} feedbackType - optional: too_easy, too_hard, boring, etc.
     */
    async processContentRating(userId, contentId, rating, feedbackType = null) {
        try {
            // 1. İçerik bilgilerini al
            const contentResult = await db.query(
                `SELECT input, input_type, level FROM contenthistory WHERE id = $1`,
                [contentId]
            );

            if (contentResult.rows.length === 0) {
                logger.debug(`[UserInsightService] Content not found: ${contentId}`);
                return;
            }

            const { input: topic, input_type, level } = contentResult.rows[0];

            if (!topic || topic.length < 3) {
                return;
            }

            // 2. Rating'e göre insight oluştur
            if (rating === 1) {
                // Beğendi → ilgi alanı olarak kaydet
                await this.storeInsight(userId, 'like', topic, 80);

                // Seviye uyumu için not al
                if (level) {
                    await this.storeInsight(
                        userId,
                        'preference',
                        `${level} seviyesinde içerik tercih ediyor`,
                        70
                    );
                }

                // Format tercihi
                if (input_type) {
                    await this.storeInsight(
                        userId,
                        'preference',
                        `${input_type} formatını seviyor`,
                        65
                    );
                }

                logger.info(`[UserInsightService] Positive rating processed: topic="${topic}", level=${level}`);

            } else if (rating === -1) {
                // Beğenmedi → neden?
                if (feedbackType === 'too_hard') {
                    await this.storeInsight(
                        userId,
                        'preference',
                        `${level} seviyesi zor geliyor`,
                        85
                    );
                    logger.info(`[UserInsightService] User finds ${level} too hard`);

                } else if (feedbackType === 'too_easy') {
                    await this.storeInsight(
                        userId,
                        'preference',
                        `${level} seviyesi kolay geliyor`,
                        85
                    );
                    logger.info(`[UserInsightService] User finds ${level} too easy`);

                } else if (feedbackType === 'boring') {
                    await this.storeInsight(userId, 'dislike', topic, 75);
                    logger.info(`[UserInsightService] User finds "${topic}" boring`);

                } else if (feedbackType === 'too_long') {
                    await this.storeInsight(
                        userId,
                        'preference',
                        'Kısa içerikler tercih ediyor',
                        70
                    );
                    logger.info(`[UserInsightService] User prefers shorter content`);

                } else if (feedbackType === 'too_short') {
                    await this.storeInsight(
                        userId,
                        'preference',
                        'Uzun içerikler tercih ediyor',
                        70
                    );
                    logger.info(`[UserInsightService] User prefers longer content`);

                } else {
                    // Genel beğenmeme
                    await this.storeInsight(userId, 'dislike', topic, 65);
                    logger.info(`[UserInsightService] User dislikes "${topic}"`);
                }
            }

        } catch (error) {
            logger.error('[UserInsightService] processContentRating error:', error);
        }
    }

    /**
     * 🎯 AKILLI ÖNERİ SİSTEMİ
     * Konu derinliğini hesapla (kullanıcı bir konuda ne kadar içerik tüketti)
     */
    async calculateTopicDepths(userId) {
        try {
            // contenthistory'den konu bazlı sayım
            const result = await db.query(
                `SELECT 
                    input as topic,
                    COUNT(*) as depth,
                    MAX(created_at) as last_interaction
                 FROM contenthistory
                 WHERE user_id = $1 AND input IS NOT NULL AND LENGTH(input) > 3
                 GROUP BY input
                 ORDER BY depth DESC
                 LIMIT 20`,
                [userId]
            );

            // topics tablosundan da ekle
            const topicsResult = await db.query(
                `SELECT title as topic, 1 as depth FROM topics WHERE user_id = $1`,
                [userId]
            );

            // Birleştir
            const depthMap = {};
            result.rows.forEach(r => {
                depthMap[r.topic] = parseInt(r.depth) || 1;
            });
            topicsResult.rows.forEach(r => {
                depthMap[r.topic] = (depthMap[r.topic] || 0) + 1;
            });

            return depthMap;
        } catch (error) {
            logger.error('[UserInsightService] Failed to calculate topic depths:', error);
            return {};
        }
    }

    /**
     * 🧠 AI-Powered Smart Suggestion Generator
     * Kullanıcının bilgi derinliğine göre akıllı öneriler üret
     */
    async generateSmartSuggestions(userId) {
        try {
            // 1. Mevcut insight'ları al
            const insights = await this.getInsights(userId);

            // 2. Konu derinliklerini hesapla
            const topicDepths = await this.calculateTopicDepths(userId);

            // 3. Son içerikleri al
            const recentContent = await db.query(
                `SELECT input, input_type FROM contenthistory 
                 WHERE user_id = $1 
                 ORDER BY created_at DESC LIMIT 10`,
                [userId]
            );

            // 4. Prompt'u yükle
            let suggestionPrompt;
            try {
                const promptPath = path.join(__dirname, '../prompts/liro/smart_suggestion_generator.txt');
                suggestionPrompt = fs.readFileSync(promptPath, 'utf-8');
            } catch (e) {
                suggestionPrompt = 'Generate 3-5 smart, specific topic suggestions based on user interests.';
            }

            // 5. AI'ya gönder
            const inputData = {
                insights: {
                    likes: insights.likes?.map(i => i.value) || [],
                    dislikes: insights.dislikes?.map(i => i.value) || [],
                    goals: insights.goals?.map(i => i.value) || [],
                    preferences: insights.preferences?.map(i => i.value) || [],
                    traits: insights.traits?.map(i => i.value) || []
                },
                topicDepths: Object.entries(topicDepths)
                    .slice(0, 15)
                    .map(([topic, depth]) => ({ topic, depth })),
                recentContent: recentContent.rows.map(r => r.input).slice(0, 10)
            };

            const response = await openaiClient.generateChatCompletion([
                { role: 'user', content: `${suggestionPrompt}\n\n## USER DATA:\n${JSON.stringify(inputData, null, 2)}` }
            ], {
                temperature: 0.7,
                maxTokens: 800,
                model: 'gpt-4o-mini'
            });

            // 6. Parse et
            const content = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(content);

            logger.info(`[UserInsightService] Generated ${parsed.suggestions?.length || 0} smart suggestions`);
            return parsed.suggestions || [];

        } catch (error) {
            logger.error('[UserInsightService] Smart suggestion generation failed:', error);
            return [];
        }
    }

    /**
     * Smart suggestion'ları prompt'a uygun formatta döndür
     */
    formatSmartSuggestionsForPrompt(suggestions) {
        if (!suggestions || suggestions.length === 0) {
            return '';
        }

        let output = '🎯 AKILLI ÖNERİLER (Kullanıcıya özel, derinlik analizi yapılmış):\n';
        suggestions.forEach((s, i) => {
            const typeEmoji = {
                'deep_cut': '🔬',
                'lateral': '🔀',
                'foundation': '📚',
                'challenge': '🚀'
            }[s.type] || '💡';

            output += `${i + 1}. ${typeEmoji} "${s.topic}"\n`;
            output += `   → Neden: ${s.reason}\n`;
            output += `   → Bağlantı: ${s.connection}\n`;
        });

        output += '\n⚠️ Bu önerileri OLDUĞU GİBİ sunma! Doğal sohbet akışına entegre et.';
        return output;
    }

    /**
     * 🔄 GERİYE DÖNÜK ANALİZ (Backfill)
     * Kullanıcının tüm geçmiş verilerini tarar ve insight'lar çıkarır.
     * - Sohbetler
     * - Oluşturulan içerikler (TTS, PDF)
     * - Kitap geçmişi
     * - Konu ağacı
     * 
     * @param {string} userId 
     * @returns {Promise<Object>} Analiz sonucu
     */
    async analyzeUserHistory(userId) {
        logger.info(`[UserInsightService] Starting backfill analysis for user ${userId}`);

        const report = {
            userId,
            analyzedAt: new Date().toISOString(),
            sources: {},
            extractedInsights: [],
            errors: []
        };

        try {
            // 1. SOHBET GEÇMİŞİ
            const chatsData = await this.gatherChatHistory(userId);
            report.sources.chats = chatsData.summary;

            // 2. İÇERİK GEÇMİŞİ (TTS, PDF)
            const contentData = await this.gatherContentHistory(userId);
            report.sources.content = contentData.summary;

            // 3. KİTAP GEÇMİŞİ
            const booksData = await this.gatherBookHistory(userId);
            report.sources.books = booksData.summary;

            // 4. KONU AĞACI
            const topicsData = await this.gatherTopicTree(userId);
            report.sources.topics = topicsData.summary;

            // 5. FAVORİLER
            const favoritesData = await this.gatherFavorites(userId);
            report.sources.favorites = favoritesData.summary;

            // 6. BİRLEŞTİR VE AI'A GÖNDER
            const activityReport = this.buildActivityReport({
                chats: chatsData,
                content: contentData,
                books: booksData,
                topics: topicsData,
                favorites: favoritesData
            });

            if (activityReport.length > 100) {
                const insights = await this.extractInsightsFromReport(userId, activityReport);
                report.extractedInsights = insights;
            } else {
                report.extractedInsights = [];
                logger.info('[UserInsightService] Not enough data for backfill analysis');
            }

            logger.info(`[UserInsightService] Backfill complete: ${report.extractedInsights.length} insights extracted`);
            return report;

        } catch (error) {
            logger.error('[UserInsightService] Backfill analysis failed:', error);
            report.errors.push(error.message);
            return report;
        }
    }

    /**
     * Sohbet geçmişini topla
     */
    async gatherChatHistory(userId) {
        try {
            const result = await db.query(
                `SELECT 
                    c.subject,
                    COUNT(m.id) as message_count,
                    MAX(m.created_at) as last_message
                 FROM conversations c
                 LEFT JOIN messages m ON c.id = m.conversation_id
                 WHERE c.user_id = $1
                 GROUP BY c.id, c.subject
                 ORDER BY last_message DESC
                 LIMIT 30`,
                [userId]
            );

            const topics = result.rows
                .filter(r => r.subject && r.subject.length > 3)
                .map(r => r.subject);

            return {
                topics,
                count: result.rows.length,
                summary: `${result.rows.length} sohbet, popüler konular: ${topics.slice(0, 5).join(', ')}`
            };
        } catch (error) {
            logger.warn('[UserInsightService] Chat history gather failed:', error.message);
            return { topics: [], count: 0, summary: 'Sohbet verisi alınamadı' };
        }
    }

    /**
     * İçerik oluşturma geçmişini topla (TÜM TÜRLER: podcast, book, chapter, topic, text, chat)
     */
    async gatherContentHistory(userId) {
        try {
            const result = await db.query(
                `SELECT 
                    input,
                    input_type,
                    level,
                    audio_duration_seconds,
                    created_at
                 FROM contenthistory
                 WHERE user_id = $1
                 ORDER BY created_at DESC
                 LIMIT 100`,
                [userId]
            );

            const rows = result.rows;

            // TÜM İÇERİK TÜRLERİNİ AYIR
            const contentByType = {
                podcast: [],
                book: [],
                chapter: [],
                topic: [],
                text: [],
                chat: [],
                other: []
            };

            rows.forEach(r => {
                const input = r.input?.trim();
                if (!input || input.length < 3) return;

                const type = r.input_type || 'other';
                if (contentByType[type]) {
                    contentByType[type].push(input);
                } else {
                    contentByType.other.push(input);
                }
            });

            // Her türden en fazla 15 tane al
            Object.keys(contentByType).forEach(key => {
                contentByType[key] = contentByType[key].slice(0, 15);
            });

            const levels = rows.map(r => r.level).filter(Boolean);
            const preferredLevel = this.findMode(levels) || 'B1';
            const audioCount = rows.filter(r => r.audio_duration_seconds > 0).length;

            return {
                count: rows.length,
                audioCount,
                preferredLevel,
                contentByType,
                podcastInputs: contentByType.podcast,
                textInputs: contentByType.text,
                summary: `${rows.length} içerik (podcast:${contentByType.podcast.length}, kitap:${contentByType.book.length}, chapter:${contentByType.chapter.length}, topic:${contentByType.topic.length})`
            };
        } catch (error) {
            logger.warn('[UserInsightService] Content history gather failed:', error.message);
            return {
                count: 0, audioCount: 0, preferredLevel: 'B1',
                contentByType: { podcast: [], book: [], chapter: [], topic: [], text: [], chat: [], other: [] },
                podcastInputs: [], textInputs: [],
                summary: 'İçerik verisi alınamadı'
            };
        }
    }

    /**
     * Kitap geçmişini topla
     */
    async gatherBookHistory(userId) {
        try {
            // `user_book_progress` tablosu
            const result = await db.query(
                `SELECT 
                    b.title,
                    b.authors as author,
                    b.subjects as genre,
                    ub.progress_percentage as progress_percent,
                    ub.last_accessed_at as last_read_at
                 FROM user_book_progress ub
                 JOIN books b ON b.id = ub.book_id
                 WHERE ub.user_id = $1
                 ORDER BY ub.last_accessed_at DESC
                 LIMIT 20`,
                [userId]
            );

            const books = result.rows;
            const genres = [...new Set(books.map(b => b.genre).filter(Boolean))];
            const authors = [...new Set(books.map(b => b.author).filter(Boolean))];

            return {
                books: books.map(b => b.title),
                genres,
                authors,
                count: books.length,
                summary: `${books.length} kitap, türler: ${genres.slice(0, 3).join(', ')}`
            };
        } catch (error) {
            logger.debug('[UserInsightService] Book history error:', error.message);
            return { books: [], genres: [], authors: [], count: 0, summary: 'Kitap verisi alınamadı' };
        }
    }

    /**
     * Konu ağacı verilerini topla (TOPICS tablosu - kullanıcının oluşturduğu konular)
     */
    async gatherTopicTree(userId) {
        try {
            // 1. ÖNCE: Kullanıcının oluşturduğu konu ağaçları (topics tablosu)
            const topicsResult = await db.query(
                `SELECT title, created_at 
                 FROM topics 
                 WHERE user_id = $1 
                 ORDER BY created_at DESC 
                 LIMIT 30`,
                [userId]
            );

            let allTopics = topicsResult.rows.map(r => r.title);

            // 2. SONRA: user_content_progress üzerinden topic_nodes (varsa ekle)
            try {
                const nodesResult = await db.query(
                    `SELECT DISTINCT tn.title
                     FROM user_content_progress ucp
                     JOIN content_items ci ON ci.id = ucp.content_item_id
                     JOIN topic_nodes tn ON tn.id = ci.topic_id
                     WHERE ucp.user_id = $1
                     LIMIT 20`,
                    [userId]
                );
                const nodeTopics = nodesResult.rows.map(r => r.title);
                allTopics = [...new Set([...allTopics, ...nodeTopics])];
            } catch (e) { /* topic_nodes bağlantısı yoksa devam */ }

            // Konu başlıklarından ana alanları çıkar (ilk kelime veya genel tema)
            const mainAreas = this.extractMainAreas(allTopics);

            return {
                topics: allTopics,
                mainAreas,
                count: allTopics.length,
                summary: `${allTopics.length} konu ağacı: ${allTopics.slice(0, 5).join(', ')}`
            };
        } catch (error) {
            logger.debug('[UserInsightService] Topic tree error:', error.message);
            return { topics: [], mainAreas: [], count: 0, summary: 'Konu ağacı verisi yok' };
        }
    }

    /**
     * Konu başlıklarından ana alanları çıkar
     */
    extractMainAreas(topics) {
        const areaKeywords = {
            'Teknoloji': ['yazılım', 'codex', 'software', 'tech', 'app'],
            'İş Dünyası': ['şirket', 'company', 'business', 'waikiki', 'marka'],
            'Tarih': ['tarih', 'history', 'savaş', 'war', 'napolyon', 'napoleon'],
            'Coğrafya': ['kıbrıs', 'bursa', 'elazığ', 'türkiye', 'city', 'köy'],
            'Kültür': ['dizi', 'film', 'müzik', 'sanat', 'art'],
            'Sürdürülebilirlik': ['sustainability', 'sürdürülebilir', 'green', 'eco']
        };

        const foundAreas = new Set();
        const lowerTopics = topics.map(t => t.toLowerCase()).join(' ');

        for (const [area, keywords] of Object.entries(areaKeywords)) {
            if (keywords.some(kw => lowerTopics.includes(kw))) {
                foundAreas.add(area);
            }
        }

        return [...foundAreas];
    }

    /**
     * Favorileri topla
     */
    async gatherFavorites(userId) {
        try {
            const result = await db.query(
                `SELECT 
                    item_type,
                    created_at 
                 FROM user_favorites 
                 WHERE user_id = $1 
                 ORDER BY created_at DESC 
                 LIMIT 20`,
                [userId]
            );
            // Not: user_favorites item_id tutuyor ama neye referans verdiği dinamik olabilir.
            // Şimdilik sadece sayı ve tip alalım.
            return {
                count: result.rows.length,
                summary: `${result.rows.length} favori öğe`
            };
        } catch (error) {
            return { count: 0, summary: '' };
        }
    }

    /**
     * Tüm verileri birleştirip AI'a gönderilecek rapor oluştur
     */
    buildActivityReport(data) {
        const lines = [];
        lines.push('KULLANICI AKTİVİTE RAPORU:');
        lines.push('');

        if (data.chats.count > 0) {
            lines.push(`📝 SOHBET GEÇMİŞİ (${data.chats.count} sohbet):`);
            lines.push(`   Konuşulan konular: ${data.chats.topics.slice(0, 10).join(', ')}`);
            lines.push('');
        }

        if (data.content.count > 0) {
            lines.push(`🎧 İÇERİK GEÇMİŞİ (${data.content.count} öğe, Seviye: ${data.content.preferredLevel}):`);

            const cbt = data.content.contentByType || {};

            if (cbt.podcast?.length > 0) {
                lines.push(`   🎙️ PODCAST'LER (${cbt.podcast.length}):`);
                cbt.podcast.forEach(p => lines.push(`      - ${p}`));
            }

            if (cbt.book?.length > 0) {
                lines.push(`   📖 KİTAP İÇERİKLERİ (${cbt.book.length}):`);
                cbt.book.forEach(b => lines.push(`      - ${b}`));
            }

            if (cbt.chapter?.length > 0) {
                lines.push(`   📑 BÖLÜMLER (${cbt.chapter.length}):`);
                cbt.chapter.forEach(c => lines.push(`      - ${c}`));
            }

            if (cbt.topic?.length > 0) {
                lines.push(`   🌳 KONU İÇERİKLERİ (${cbt.topic.length}):`);
                cbt.topic.forEach(t => lines.push(`      - ${t}`));
            }

            if (cbt.text?.length > 0) {
                lines.push(`   📝 METİN ANALİZLERİ (${cbt.text.length}):`);
                cbt.text.forEach(t => lines.push(`      - ${t}`));
            }

            if (cbt.chat?.length > 0) {
                lines.push(`   💬 SOHBET İÇERİKLERİ (${cbt.chat.length}):`);
                cbt.chat.slice(0, 10).forEach(c => lines.push(`      - ${c}`));
            }

            lines.push('');
        }

        if (data.books.count > 0) {
            lines.push(`📚 KİTAP GEÇMİŞİ (${data.books.count} kitap):`);
            lines.push(`   Kitaplar: ${data.books.books.slice(0, 5).join(', ')}`);
            lines.push(`   Türler: ${data.books.genres.join(', ')}`);
            lines.push('');
        }

        if (data.topics.topics.length > 0) {
            lines.push(`🌳 KONU AĞACI (${data.topics.count} konu):`);
            // List more topics (up to 20) to give AI better context
            lines.push(`   Konular: ${data.topics.topics.slice(0, 20).join(', ')}`);
            lines.push(`   Ana alanlar: ${data.topics.mainAreas.join(', ')}`);
            lines.push('');
        }

        if (data.favorites && data.favorites.count > 0) {
            lines.push(`❤️ FAVORİLER (${data.favorites.count} öğe):`);
            lines.push(`   Favoriler kullanıcının en çok ilgi duyduğu içeriklerdir.`);
            lines.push('');
        }

        return lines.join('\n');
    }

    /**
     * Raporu AI'a gönderip insight çıkar
     */
    async extractInsightsFromReport(userId, activityReport) {
        try {
            const prompt = `${this.extractionPrompt}

Aşağıdaki aktivite raporunu analiz et ve kullanıcı hakkında insight'lar çıkar:

${activityReport}

Özellikle şunlara dikkat et:
- Hangi konulara ilgi duyuyor (sık tekrar eden temalar)
- Hangi formatları tercih ediyor (sesli/yazılı)
- Hangi seviyede içerik tercih ediyor
- Hangi kitap türlerini okuyor
- Hangi alanlarda ilerliyor`;

            const response = await openaiClient.generateChatCompletion([
                { role: 'user', content: prompt }
            ], {
                temperature: 0.3,
                maxTokens: 800,
                model: 'gpt-4o-mini',
                systemPrompt: 'You are a User Insight Extraction agent. Output valid JSON only.'
            });

            const content = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(content);

            if (result.no_new_insights || !result.insights || result.insights.length === 0) {
                return [];
            }

            // Insight'ları kaydet
            const savedInsights = [];
            for (const insight of result.insights) {
                const saved = await this.storeInsight(
                    userId,
                    insight.type,
                    insight.value,
                    insight.confidence || 75,
                    null // backfill için conversation_id yok
                );
                if (saved) savedInsights.push(saved);
            }

            return savedInsights;

        } catch (error) {
            logger.error('[UserInsightService] Report extraction failed:', error);
            return [];
        }
    }

    /**
     * Helper: Dizideki en sık elemanı bul (Mode)
     */
    findMode(arr) {
        if (!arr || arr.length === 0) return null;
        const freq = {};
        arr.forEach(item => { freq[item] = (freq[item] || 0) + 1; });
        return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
    }
}

module.exports = new UserInsightService();
