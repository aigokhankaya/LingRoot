/**
 * 🎯 Quest Content Service
 * 
 * Quest'leri ilgili içeriklere bağlar ve yönlendirir.
 */

const db = require('../config/db');
const logger = require('../utils/common/logger.js');

class QuestContentService {

    /**
     * Quest için uygun içerik URL'i oluştur
     */
    async getContentUrlForQuest(quest) {
        const { content_type, content_filter, task_type } = quest;

        if (!content_type) {
            return this.getFallbackUrl(task_type);
        }

        switch (content_type) {
            case 'topic':
                return await this.getTopicUrl(content_filter);
            case 'word_set':
                return this.getWordSetUrl(content_filter);
            case 'quiz':
                return this.getQuizUrl(content_filter);
            default:
                return this.getFallbackUrl(task_type);
        }
    }

    /**
     * Topic içeriği için URL
     */
    async getTopicUrl(filter) {
        const { category, subcategory } = filter || {};

        if (!category) {
            return '/dashboard?tab=reading-history';
        }

        try {
            // Önce mevcut içeriklerde ara
            const result = await db.query(`
                SELECT id, slug FROM topics 
                WHERE category = $1 
                  AND ($2::text IS NULL OR subcategory = $2)
                  AND status = 'published'
                ORDER BY created_at DESC
                LIMIT 1
            `, [category, subcategory || null]);

            if (result.rows.length > 0) {
                return `/topics/${result.rows[0].slug}`;
            }
        } catch (error) {
            logger.warn('[QuestContentService] Topic query failed:', error.message);
        }

        // Yoksa içerik oluşturma sayfasına yönlendir
        return `/create?category=${category}&mode=topic`;
    }

    /**
     * Kelime seti için URL
     */
    getWordSetUrl(filter) {
        const { category, word_count } = filter || {};
        const categoryParam = category || 'general';
        const countParam = word_count || 10;
        return `/vocabulary?category=${categoryParam}&mode=learn&count=${countParam}`;
    }

    /**
     * Quiz için URL
     */
    getQuizUrl(filter) {
        const { type, category } = filter || {};
        const typeParam = type || 'vocabulary';
        const categoryParam = category || 'general';
        return `/quiz?type=${typeParam}&category=${categoryParam}`;
    }

    /**
     * Fallback URL (task tipine göre)
     */
    getFallbackUrl(taskType) {
        const urlMap = {
            vocabulary: '/vocabulary',
            listen: '/dashboard?tab=reading-history',
            quiz: '/quiz',
            speak: '/practice/speaking',
            milestone: '/dashboard',
            content: '/dashboard?tab=reading-history',
        };
        return urlMap[taskType] || '/dashboard';
    }

    /**
     * Quest detaylarını içerik bilgisiyle zenginleştir
     */
    async enrichQuestWithContent(quest) {
        try {
            const contentUrl = await this.getContentUrlForQuest(quest);

            // İçerik hazır mı kontrol et (topic ise ve gerçek bir topic URL'i dönüyorsa)
            const contentReady = quest.content_type !== 'topic' ||
                (contentUrl && contentUrl.startsWith('/topics/'));

            return {
                ...quest,
                content_url: contentUrl,
                has_content: !!quest.content_type,
                content_ready: contentReady,
            };
        } catch (error) {
            logger.error('[QuestContentService] enrichQuestWithContent failed:', error);
            return {
                ...quest,
                content_url: this.getFallbackUrl(quest.task_type),
                has_content: false,
                content_ready: true, // Fallback her zaman hazır
            };
        }
    }

    /**
     * Birden fazla quest'i zenginleştir
     */
    async enrichQuestsWithContent(quests) {
        return Promise.all(quests.map(q => this.enrichQuestWithContent(q)));
    }
}

module.exports = new QuestContentService();
