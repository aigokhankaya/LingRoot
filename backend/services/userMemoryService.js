/**
 * 🧠 User Memory Service
 *
 * Kullanıcı uzun dönem hafıza yönetimi.
 * Oturumlar arası hatırlanan bilgileri saklar ve getirir.
 *
 * Hafıza Hiyerarşisi:
 * 1. Session Memory (in-context, son 15 mesaj)
 * 2. Conversation Summary (per-conversation özet)
 * 3. Long-term Memory (cross-session, bu servis)
 *
 * @module userMemoryService
 */

const db = require('../config/db');
const logger = require('../utils/common/logger.js');
const openaiClient = require('../utils/ai/openaiClient.js');
const fs = require('fs');
const path = require('path');

class UserMemoryService {
    constructor() {
        this.extractionPrompt = null;
        this._loadPrompt();

        // Memory türleri
        this.MEMORY_TYPES = ['fact', 'event', 'preference', 'relationship', 'milestone'];

        // Kategori türleri
        this.CATEGORIES = ['personal', 'learning', 'content', 'interaction'];

        // Önem eşikleri
        this.IMPORTANCE_THRESHOLDS = {
            HIGH: 80,      // Her zaman göster
            MEDIUM: 60,    // İlgili olduğunda göster
            LOW: 40        // Nadiren göster
        };

        // Cache TTL (5 dakika)
        this.CACHE_TTL = 5 * 60 * 1000;
        this._cache = new Map();
    }

    /**
     * Extraction prompt'u yükle
     */
    _loadPrompt() {
        try {
            const promptPath = path.join(__dirname, '../prompts/liro/memory_extraction.txt');
            this.extractionPrompt = fs.readFileSync(promptPath, 'utf-8');
        } catch (error) {
            logger.warn('[UserMemoryService] Failed to load extraction prompt:', error.message);
            this.extractionPrompt = 'Extract memorable facts about the user from the conversation. Return JSON.';
        }
    }

    /**
     * 📝 Sohbetten hafıza çıkar
     * @param {string} userId - Kullanıcı ID
     * @param {string} conversationId - Sohbet ID
     * @param {Array} messages - Mesaj listesi [{role, content}]
     * @returns {Promise<Array>} Çıkarılan hafızalar
     */
    async extractMemories(userId, conversationId, messages) {
        if (!messages || messages.length < 4) {
            logger.debug('[UserMemoryService] Not enough messages for memory extraction');
            return [];
        }

        try {
            // Son 15 mesajı al
            const recentMessages = messages.slice(-15);

            // Sohbeti formatlı string'e çevir
            const conversationText = recentMessages
                .map(m => `${m.role === 'user' ? 'Kullanıcı' : 'Liro'}: ${m.content}`)
                .join('\n');

            // AI'dan memory çıkar
            const response = await openaiClient.generateChatCompletion([
                { role: 'user', content: `${this.extractionPrompt}\n\n---\n\nCONVERSATION:\n${conversationText}` }
            ], {
                temperature: 0.2,
                maxTokens: 600,
                model: 'gpt-4o-mini',
                systemPrompt: 'You are a Memory Extraction agent. Output valid JSON only.'
            });

            // JSON parse
            const content = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(content);

            if (result.no_new_insights || !result.memories || result.memories.length === 0) {
                logger.debug('[UserMemoryService] No new memories found');
                return [];
            }

            // Memory'leri kaydet
            const savedMemories = [];
            for (const memory of result.memories) {
                const saved = await this.storeMemory(
                    userId,
                    memory.type,
                    memory.category,
                    memory.content,
                    memory.importance || 60,
                    conversationId,
                    memory.expiry_hint
                );
                if (saved) savedMemories.push(saved);
            }

            // Cache'i invalidate et
            this._invalidateCache(userId);

            logger.info(`[UserMemoryService] Extracted ${savedMemories.length} memories for user ${userId}`);
            return savedMemories;

        } catch (error) {
            logger.error('[UserMemoryService] Memory extraction failed:', error);
            return [];
        }
    }

    /**
     * 💾 Hafızayı veritabanına kaydet
     */
    async storeMemory(userId, type, category, content, importance = 60, conversationId = null, expiryHint = 'permanent') {
        try {
            // Validasyon
            if (!this.MEMORY_TYPES.includes(type)) {
                logger.warn(`[UserMemoryService] Invalid memory type: ${type}`);
                type = 'fact';
            }

            if (category && !this.CATEGORIES.includes(category)) {
                logger.warn(`[UserMemoryService] Invalid category: ${category}`);
                category = 'personal';
            }

            // Duplicate kontrolü (benzer içerik)
            const existing = await db.query(
                `SELECT id, mention_count, importance FROM user_memory
                 WHERE user_id = $1 AND memory_type = $2
                 AND LOWER(content) = LOWER($3) AND is_active = true`,
                [userId, type, content]
            );

            if (existing.rows.length > 0) {
                // Var olan memory'yi güncelle
                const existingMemory = existing.rows[0];
                await db.query(
                    `UPDATE user_memory
                     SET mention_count = mention_count + 1,
                         last_referenced_at = NOW(),
                         importance = GREATEST(importance, $1)
                     WHERE id = $2`,
                    [importance, existingMemory.id]
                );
                logger.debug(`[UserMemoryService] Updated existing memory: ${content}`);
                return null; // Yeni değil, güncellendi
            }

            // Expiry hesapla
            let expiresAt = null;
            if (expiryHint === 'temporary') {
                expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 gün
            } else if (expiryHint === 'session') {
                expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat
            }

            // Yeni memory ekle
            const result = await db.query(
                `INSERT INTO user_memory
                 (user_id, memory_type, category, content, importance, source_conversation_id, expires_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [userId, type, category, content, importance, conversationId, expiresAt]
            );

            logger.info(`[UserMemoryService] Stored new memory: [${type}] ${content}`);
            return result.rows[0];

        } catch (error) {
            logger.error('[UserMemoryService] Failed to store memory:', error);
            return null;
        }
    }

    /**
     * 🔍 İlgili hafızaları getir (basit sorgu)
     * @param {string} userId - Kullanıcı ID
     * @param {number} limit - Maksimum sonuç
     * @returns {Promise<Array>} Hafıza listesi
     */
    async getMemories(userId, limit = 20) {
        try {
            // Cache kontrol
            const cacheKey = `memories_${userId}`;
            const cached = this._getFromCache(cacheKey);
            if (cached) return cached;

            const result = await db.query(
                `SELECT id, memory_type, category, content, importance,
                        first_mentioned_at, last_referenced_at, mention_count
                 FROM user_memory
                 WHERE user_id = $1 AND is_active = true
                   AND (expires_at IS NULL OR expires_at > NOW())
                 ORDER BY importance DESC, last_referenced_at DESC
                 LIMIT $2`,
                [userId, limit]
            );

            const memories = result.rows;

            // Cache'e ekle
            this._setCache(cacheKey, memories);

            return memories;

        } catch (error) {
            logger.error('[UserMemoryService] Failed to get memories:', error);
            return [];
        }
    }

    /**
     * 🔍 Bağlama göre ilgili hafızaları getir
     * @param {string} userId - Kullanıcı ID
     * @param {string} query - Arama sorgusu (konu, kelime vb.)
     * @param {number} limit - Maksimum sonuç
     * @returns {Promise<Array>} İlgili hafızalar
     */
    async retrieveRelevantMemories(userId, query, limit = 5) {
        try {
            // Basit keyword matching (embedding olmadan)
            // NOT: Embedding varsa cosine similarity kullanılabilir

            const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

            if (keywords.length === 0) {
                return this.getTopMemories(userId, limit);
            }

            // Keyword'lere göre arama
            const likeConditions = keywords.map((_, i) => `LOWER(content) LIKE $${i + 2}`).join(' OR ');
            const likeValues = keywords.map(k => `%${k}%`);

            const result = await db.query(
                `SELECT id, memory_type, category, content, importance,
                        first_mentioned_at, last_referenced_at, mention_count
                 FROM user_memory
                 WHERE user_id = $1 AND is_active = true
                   AND (expires_at IS NULL OR expires_at > NOW())
                   AND (${likeConditions})
                 ORDER BY importance DESC, last_referenced_at DESC
                 LIMIT $${keywords.length + 2}`,
                [userId, ...likeValues, limit]
            );

            // Eşleşme yoksa en önemli hafızaları getir
            if (result.rows.length === 0) {
                return this.getTopMemories(userId, limit);
            }

            // Referans sayısını artır
            for (const memory of result.rows) {
                await this.updateMemoryReference(memory.id);
            }

            return result.rows;

        } catch (error) {
            logger.error('[UserMemoryService] Failed to retrieve relevant memories:', error);
            return [];
        }
    }

    /**
     * En önemli hafızaları getir
     */
    async getTopMemories(userId, limit = 5) {
        try {
            const result = await db.query(
                `SELECT id, memory_type, category, content, importance,
                        first_mentioned_at, last_referenced_at, mention_count
                 FROM user_memory
                 WHERE user_id = $1 AND is_active = true
                   AND (expires_at IS NULL OR expires_at > NOW())
                   AND importance >= $2
                 ORDER BY importance DESC, mention_count DESC
                 LIMIT $3`,
                [userId, this.IMPORTANCE_THRESHOLDS.MEDIUM, limit]
            );
            return result.rows;
        } catch (error) {
            logger.error('[UserMemoryService] Failed to get top memories:', error);
            return [];
        }
    }

    /**
     * 📋 Hafızaları prompt formatına çevir
     * @param {Array} memories - Hafıza listesi
     * @returns {string} Prompt'a eklenecek metin
     */
    formatMemoriesForPrompt(memories) {
        if (!memories || memories.length === 0) {
            return '';
        }

        const typeEmojis = {
            'fact': '📌',
            'event': '📅',
            'preference': '⚙️',
            'relationship': '👥',
            'milestone': '🏆'
        };

        let output = '\n🧠 KULLANICI HAFIZASI (Uzun Dönem):\n';
        output += 'Aşağıdaki bilgiler önceki sohbetlerden öğrenildi. Doğal şekilde referans ver:\n\n';

        memories.forEach((m, i) => {
            const emoji = typeEmojis[m.memory_type] || '•';
            const importance = m.importance >= 80 ? '⭐' : '';
            output += `${emoji} ${m.content} ${importance}\n`;
        });

        output += '\n💡 Bu bilgileri sohbette doğal şekilde kullan. "Daha önce söylemiştin ki..." formatı yerine, bilgiyi konuya entegre et.';

        return output;
    }

    /**
     * Hafıza referansını güncelle
     */
    async updateMemoryReference(memoryId) {
        try {
            await db.query(
                `UPDATE user_memory
                 SET last_referenced_at = NOW(), mention_count = mention_count + 1
                 WHERE id = $1`,
                [memoryId]
            );
        } catch (error) {
            logger.debug('[UserMemoryService] Failed to update memory reference:', error.message);
        }
    }

    /**
     * Hafıza önemini güncelle (feedback'e göre)
     */
    async updateMemoryImportance(memoryId, adjustment) {
        try {
            await db.query(
                `UPDATE user_memory
                 SET importance = GREATEST(0, LEAST(100, importance + $1))
                 WHERE id = $2`,
                [adjustment, memoryId]
            );
        } catch (error) {
            logger.error('[UserMemoryService] Failed to update memory importance:', error);
        }
    }

    /**
     * Hafızayı devre dışı bırak
     */
    async deactivateMemory(memoryId, userId) {
        try {
            await db.query(
                `UPDATE user_memory SET is_active = false WHERE id = $1 AND user_id = $2`,
                [memoryId, userId]
            );
            this._invalidateCache(userId);
            logger.info(`[UserMemoryService] Deactivated memory ${memoryId}`);
            return true;
        } catch (error) {
            logger.error('[UserMemoryService] Failed to deactivate memory:', error);
            return false;
        }
    }

    /**
     * Kullanıcının hafıza istatistiklerini getir
     */
    async getMemoryStats(userId) {
        try {
            const result = await db.query(
                `SELECT * FROM user_memory_stats WHERE user_id = $1`,
                [userId]
            );
            return result.rows[0] || {
                total_memories: 0,
                fact_count: 0,
                preference_count: 0,
                relationship_count: 0,
                event_count: 0,
                milestone_count: 0
            };
        } catch (error) {
            logger.error('[UserMemoryService] Failed to get memory stats:', error);
            return null;
        }
    }

    /**
     * Süresi dolmuş hafızaları temizle
     */
    async cleanupExpiredMemories() {
        try {
            const result = await db.query(
                `UPDATE user_memory
                 SET is_active = false
                 WHERE expires_at IS NOT NULL AND expires_at < NOW() AND is_active = true
                 RETURNING id`
            );
            logger.info(`[UserMemoryService] Cleaned up ${result.rows.length} expired memories`);
            return result.rows.length;
        } catch (error) {
            logger.error('[UserMemoryService] Failed to cleanup expired memories:', error);
            return 0;
        }
    }

    /**
     * Benzer hafızaları birleştir (consolidation)
     */
    async consolidateMemories(userId) {
        // TODO: Implement memory consolidation using embeddings
        // - Find similar memories
        // - Merge them into one with combined context
        // - Deactivate duplicates
        logger.debug('[UserMemoryService] Memory consolidation not yet implemented');
        return 0;
    }

    // =========================================================================
    // Cache helpers
    // =========================================================================

    _getFromCache(key) {
        const cached = this._cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }
        return null;
    }

    _setCache(key, data) {
        this._cache.set(key, { data, timestamp: Date.now() });
    }

    _invalidateCache(userId) {
        this._cache.delete(`memories_${userId}`);
    }
}

module.exports = new UserMemoryService();
