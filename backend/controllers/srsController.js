const srsService = require('../services/srsService');
const logger = require('../utils/common/logger.js');

/**
 * GET /api/srs/due
 * Bugün tekrar edilmesi gereken kelimeler
 */
const getDueWords = async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 20;

        const words = await srsService.getDueWords(userId, limit);

        return res.json({
            success: true,
            dueCount: words.length,
            words: words
        });

    } catch (error) {
        logger.error('[SRS Controller] getDueWords error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch due words' });
    }
};

/**
 * POST /api/srs/review
 * Kelime tekrar sonucunu işle (veya yeni kelime ekle)
 */
const reviewWord = async (req, res) => {
    try {
        const userId = req.user.id;
        // wordReviewId opsiyonel, word string zorunlu (yeni ekleme veya güncelleme için)
        // Eğer wordReviewId varsa onu kullanabiliriz ama şimdilik word-based gidiyoruz conflict durumları için
        const { word, wordTranslation, quality, definition, contextSentence, sourceContentId } = req.body;

        if (!word) {
            return res.status(400).json({ success: false, error: 'Word text is required' });
        }

        // Quality check (0-5)
        if (quality === undefined || quality < 0 || quality > 5) {
            return res.status(400).json({ success: false, error: 'Quality must be between 0 and 5' });
        }

        const result = await srsService.reviewWord(
            userId,
            word,
            wordTranslation,
            quality,
            definition,
            contextSentence,
            sourceContentId
        );

        return res.json({
            success: true,
            result: result
        });

    } catch (error) {
        logger.error('[SRS Controller] reviewWord error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/srs/stats
 * Kullanıcının SRS istatistiklerini getir
 */
const getStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const stats = await srsService.getStats(userId);

        return res.json({
            success: true,
            stats: stats || {}
        });

    } catch (error) {
        logger.error('[SRS Controller] getStats error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
};

/**
 * POST /api/srs/words
 * Yeni kelime ekle (ilk quality=3 ile başla - "öğrendim" varsayımı)
 */
const addWord = async (req, res) => {
    try {
        const userId = req.user.id;
        const { word, wordTranslation, contextSentence, sourceContentId } = req.body;

        if (!word) {
            return res.status(400).json({ success: false, error: 'Word is required' });
        }

        // Quality 3 = "Biliyorum" - İlk ekleme için varsayılan
        const result = await srsService.reviewWord(
            userId,
            word,
            wordTranslation,
            3, // Default quality
            '', // definition
            contextSentence,
            sourceContentId
        );

        return res.json({
            success: true,
            word: result
        });

    } catch (error) {
        logger.error('[SRS Controller] addWord error:', error);
        return res.status(500).json({ success: false, error: 'Failed to add word' });
    }
};

module.exports = {
    getDueWords,
    reviewWord,
    addWord,
    getStats
};
