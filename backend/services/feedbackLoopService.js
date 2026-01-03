/**
 * 🔄 Feedback Loop Service
 * 
 * Content ratings + completion data → Adaptive recommendations
 * 
 * Kullanıcı feedback'lerine göre:
 * - Optimal CEFR seviyesi hesaplama
 * - Tercih edilen içerik türü analizi
 * - Liro için adaptif context oluşturma
 */

const db = require('../config/db');
const logger = require('../utils/logger');
const srsService = require('./srsService');
const { withGracefulDegradation } = require('../utils/retryUtils');

class FeedbackLoopService {

    /**
     * Kullanıcının optimal CEFR seviyesini hesapla
     * (ML yerine rule-based, daha kontrol edilebilir)
     * 
     * @param {string} userId 
     * @returns {Promise<{level: string, confidence: number, reason: string}>}
     */
    async calculateOptimalLevel(userId) {
        try {
            const patterns = await db.query(`
        SELECT 
          ch.level,
          COUNT(*) as content_count,
          AVG(COALESCE(cr.rating, 0)) as avg_rating,
          AVG(COALESCE(ucp.completion_percentage, 0)) as avg_completion,
          COUNT(CASE WHEN cf.feedback_type = 'too_hard' THEN 1 END) as too_difficult_count,
          COUNT(CASE WHEN cf.feedback_type = 'too_easy' THEN 1 END) as too_easy_count,
          COUNT(CASE WHEN cf.feedback_type IN ('boring', 'too_long') THEN 1 END) as boring_count
        FROM contenthistory ch
        LEFT JOIN content_ratings cr ON cr.content_id = ch.id AND cr.user_id = $1
        LEFT JOIN content_feedback cf ON cf.content_id = ch.id AND cf.user_id = $1
        LEFT JOIN user_content_progress ucp ON ucp.content_item_id = ch.id AND ucp.user_id = $1
        WHERE ch.user_id = $1 
          AND ch.created_at > NOW() - INTERVAL '30 days'
          AND ch.level IS NOT NULL
        GROUP BY ch.level
        HAVING COUNT(*) >= 3
        ORDER BY ch.level
      `, [userId]);

            if (patterns.rows.length === 0) {
                return {
                    level: 'B1',
                    confidence: 0.5,
                    reason: 'Yeterli veri yok, varsayılan seviye'
                };
            }

            // Optimal seviyeyi bul
            let optimalLevel = 'B1';
            let maxScore = 0;
            let suggestLevelUp = false;
            let suggestLevelDown = false;

            for (const row of patterns.rows) {
                const contentCount = parseInt(row.content_count) || 0;
                const avgCompletion = parseFloat(row.avg_completion) || 0;
                const avgRating = parseFloat(row.avg_rating) || 0;
                const tooDifficultRatio = (parseInt(row.too_difficult_count) || 0) / contentCount;
                const tooEasyRatio = (parseInt(row.too_easy_count) || 0) / contentCount;
                const boringRatio = (parseInt(row.boring_count) || 0) / contentCount;

                // Success score hesapla
                const successScore =
                    (avgCompletion / 100) * 0.4 +           // Completion weight
                    ((avgRating + 1) / 2) * 0.3 +           // Rating weight (normalize -1,1 to 0,1)
                    (1 - tooDifficultRatio) * 0.2 +         // Not too difficult
                    (1 - boringRatio) * 0.1;                // Not boring

                // En iyi seviyeyi seç
                if (successScore > maxScore && tooDifficultRatio < 0.25) {
                    maxScore = successScore;
                    optimalLevel = row.level;

                    // Çok kolay mı?
                    if (tooEasyRatio > 0.3 || (avgCompletion > 90 && contentCount >= 10)) {
                        suggestLevelUp = true;
                    }

                    // Çok zor mu?
                    if (tooDifficultRatio > 0.3) {
                        suggestLevelDown = true;
                    }
                }
            }

            // Seviye ayarlaması öner
            if (suggestLevelUp && !suggestLevelDown) {
                const nextLevel = this.getNextLevel(optimalLevel);
                if (nextLevel !== optimalLevel) {
                    return {
                        level: nextLevel,
                        confidence: Math.min(0.85, maxScore),
                        reason: `${optimalLevel} seviyesinde çok başarılısın, ${nextLevel} dene!`
                    };
                }
            }

            if (suggestLevelDown && !suggestLevelUp) {
                const prevLevel = this.getPreviousLevel(optimalLevel);
                if (prevLevel !== optimalLevel) {
                    return {
                        level: prevLevel,
                        confidence: Math.min(0.75, maxScore),
                        reason: `${optimalLevel} biraz zor geliyor, ${prevLevel} ile devam edelim`
                    };
                }
            }

            return {
                level: optimalLevel,
                confidence: maxScore,
                reason: 'Mevcut performansa göre en uygun seviye'
            };

        } catch (error) {
            logger.error('[FeedbackLoop] calculateOptimalLevel error:', error);
            return { level: 'B1', confidence: 0.5, reason: 'Hesaplama hatası, varsayılan' };
        }
    }

    /**
     * Kullanıcının tercih ettiği içerik türünü bul
     * 
     * @param {string} userId 
     * @returns {Promise<Array<{type: string, preference_score: number}>>}
     */
    async getPreferredContentType(userId) {
        try {
            const result = await db.query(`
        SELECT 
          ch.input_type,
          COUNT(*) as count,
          AVG(COALESCE(cr.rating, 0)) as avg_rating,
          AVG(COALESCE(ucp.completion_percentage, 0)) as avg_completion
        FROM contenthistory ch
        LEFT JOIN content_ratings cr ON cr.content_id = ch.id AND cr.user_id = $1
        LEFT JOIN user_content_progress ucp ON ucp.content_item_id = ch.id AND ucp.user_id = $1
        WHERE ch.user_id = $1
          AND ch.input_type IS NOT NULL
        GROUP BY ch.input_type
        HAVING COUNT(*) >= 2
        ORDER BY 
          AVG(COALESCE(cr.rating, 0)) DESC, 
          AVG(COALESCE(ucp.completion_percentage, 0)) DESC
        LIMIT 5
      `, [userId]);

            return result.rows.map(r => ({
                type: r.input_type,
                count: parseInt(r.count) || 0,
                preference_score: (
                    ((parseFloat(r.avg_rating) || 0) + 1) / 2 * 0.5 +
                    (parseFloat(r.avg_completion) || 0) / 100 * 0.5
                )
            }));

        } catch (error) {
            logger.error('[FeedbackLoop] getPreferredContentType error:', error);
            return [];
        }
    }

    /**
     * Son 7 günün feedback özetini getir
     * 
     * @param {string} userId 
     * @returns {Promise<Array<{feedback_type: string, count: number}>>}
     */
    async getRecentFeedbackSummary(userId) {
        try {
            const result = await db.query(`
        SELECT 
          cf.feedback_type,
          COUNT(*) as count
        FROM content_feedback cf
        WHERE cf.user_id = $1 
          AND cf.created_at > NOW() - INTERVAL '7 days'
        GROUP BY cf.feedback_type
        ORDER BY count DESC
      `, [userId]);

            return result.rows.map(r => ({
                feedback_type: r.feedback_type,
                count: parseInt(r.count) || 0
            }));

        } catch (error) {
            logger.error('[FeedbackLoop] getRecentFeedbackSummary error:', error);
            return [];
        }
    }

    /**
     * İçerik uzunluğu tercihi analizi
     * 
     * @param {string} userId 
     * @returns {Promise<{preferred: string, reason: string}>}
     */
    async getPreferredContentLength(userId) {
        try {
            const result = await db.query(`
        SELECT 
          CASE 
            WHEN ch.audio_duration_seconds < 180 THEN 'short'
            WHEN ch.audio_duration_seconds < 600 THEN 'medium'
            ELSE 'long'
          END as length_category,
          AVG(COALESCE(ucp.completion_percentage, 0)) as avg_completion,
          COUNT(*) as count
        FROM contenthistory ch
        LEFT JOIN user_content_progress ucp ON ucp.content_item_id = ch.id AND ucp.user_id = $1
        WHERE ch.user_id = $1
          AND ch.audio_duration_seconds > 0
        GROUP BY 
          CASE 
            WHEN ch.audio_duration_seconds < 180 THEN 'short'
            WHEN ch.audio_duration_seconds < 600 THEN 'medium'
            ELSE 'long'
          END
        HAVING COUNT(*) >= 2
        ORDER BY avg_completion DESC
        LIMIT 1
      `, [userId]);

            if (result.rows.length === 0) {
                return { preferred: 'medium', reason: 'Yeterli veri yok' };
            }

            const lengthLabels = {
                'short': 'Kısa (3 dk altı)',
                'medium': 'Orta (3-10 dk)',
                'long': 'Uzun (10+ dk)'
            };

            const preferred = result.rows[0].length_category;
            return {
                preferred,
                reason: `${lengthLabels[preferred]} içerikleri daha çok tamamlıyor`
            };

        } catch (error) {
            logger.error('[FeedbackLoop] getPreferredContentLength error:', error);
            return { preferred: 'medium', reason: 'Hesaplama hatası' };
        }
    }

    /**
     * Liro için adaptif öneri context'i oluştur
     * 
     * @returns {Promise<Object>} Adaptive context
     */
    async generateAdaptiveContext(userId) {
        try {
            const [optimal, preferences, recentFeedback, lengthPreference, dueWords] = await Promise.all([
                this.calculateOptimalLevel(userId),
                this.getPreferredContentType(userId),
                this.getRecentFeedbackSummary(userId),
                this.getPreferredContentLength(userId),
                srsService.getDueWords(userId, 5) // SRS: En acil 5 kelime
            ]);

            // Uyarı mesajları oluştur
            const warnings = [];

            // "Çok zor" feedback'i varsa uyar
            const tooHardFeedback = recentFeedback.find(f => f.feedback_type === 'too_hard');
            if (tooHardFeedback && tooHardFeedback.count >= 2) {
                warnings.push(`⚠️ Son 7 günde ${tooHardFeedback.count} kez "çok zor" feedback'i verdi`);
            }

            // "Sıkıcı" feedback'i varsa uyar
            const boringFeedback = recentFeedback.find(f => f.feedback_type === 'boring');
            if (boringFeedback && boringFeedback.count >= 2) {
                warnings.push(`⚠️ Son 7 günde ${boringFeedback.count} kez "sıkıcı" feedback'i verdi - daha ilgi çekici konular öner`);
            }

            return {
                suggestedLevel: optimal.level,
                levelConfidence: optimal.confidence,
                levelReason: optimal.reason,
                preferredTypes: preferences,
                preferredLength: lengthPreference,
                recentFeedback: recentFeedback,
                dueWords: dueWords.map(w => w.word), // Sadece kelime listesi yeterli
                warnings: warnings,
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            logger.error('[FeedbackLoop] generateAdaptiveContext error:', error);
            return {
                suggestedLevel: 'B1',
                levelConfidence: 0.5,
                levelReason: 'Context oluşturulamadı',
                preferredTypes: [],
                preferredLength: { preferred: 'medium', reason: 'Varsayılan' },
                recentFeedback: [],
                dueWords: [],
                warnings: [],
                generatedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Adaptif context'i prompt formatına çevir
     * 
     * @param {Object} context - generateAdaptiveContext() çıktısı
     * @returns {string} Prompt'a eklenecek metin
     */
    formatForPrompt(context) {
        if (!context) return '';

        const sections = [];

        sections.push(`📊 ADAPTİF SEVİYE ÖNERİSİ:`);
        sections.push(`- Önerilen Seviye: ${context.suggestedLevel} (${Math.round(context.levelConfidence * 100)}% güven)`);
        sections.push(`- Neden: ${context.levelReason}`);

        if (context.preferredTypes && context.preferredTypes.length > 0) {
            const types = context.preferredTypes.map(p => p.type).join(', ');
            sections.push(`- Tercih Ettiği Formatlar: ${types}`);
        }

        if (context.preferredLength) {
            sections.push(`- Tercih Ettiği Uzunluk: ${context.preferredLength.preferred} (${context.preferredLength.reason})`);
        }

        if (context.dueWords && context.dueWords.length > 0) {
            sections.push(`- 🧠 TEKRAR: Bugün şu kelimeleri tekrar etmesi gerekiyor: ${context.dueWords.join(', ')} (Bunları cümle içinde kullan)`);
        }

        if (context.warnings && context.warnings.length > 0) {
            sections.push('');
            context.warnings.forEach(w => sections.push(w));
        }

        sections.push('');
        sections.push('⚠️ İçerik önerirken bu seviyeyi ve tercihleri dikkate al.');

        return sections.join('\n');
    }

    /**
     * Bir sonraki seviyeyi al
     */
    getNextLevel(current) {
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        const idx = levels.indexOf(current);
        return idx >= 0 && idx < levels.length - 1 ? levels[idx + 1] : current;
    }

    /**
     * Bir önceki seviyeyi al
     */
    getPreviousLevel(current) {
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        const idx = levels.indexOf(current);
        return idx > 0 ? levels[idx - 1] : current;
    }
}

module.exports = new FeedbackLoopService();
