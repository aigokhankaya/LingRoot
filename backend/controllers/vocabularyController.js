/**
 * 📚 Vocabulary Controller
 * 
 * Handles interaction with the SRS system:
 * - Fetching due words (Flashcards)
 * - Submitting reviews
 * - Managing vocabulary list
 */

const srsService = require('../services/srsService');
const db = require('../config/db');
const logger = require('../utils/common/logger.js');

/**
 * GET /api/vocabulary/lookup?word=xxx
 * Lookup a word in global vocabulary and check if user has it
 */
exports.lookupWord = async (req, res) => {
    try {
        const userId = req.user.id;
        const { word } = req.query;

        if (!word) {
            return res.status(400).json({ success: false, error: 'Word parameter required' });
        }

        const cleanWord = word.toLowerCase().trim();

        // 1. Look up in global vocabulary
        const vocabResult = await db.query(`
            SELECT id, word, original_word, definition, example_sentence, example_sentence_turkish, level, meanings
            FROM vocabulary
            WHERE word = $1
        `, [cleanWord]);

        if (vocabResult.rows.length === 0) {
            return res.json({
                success: true,
                found: false,
                data: null,
                hasUserWord: false
            });
        }

        const vocabData = vocabResult.rows[0];

        // 2. Check if user has this word in their collection
        const userCheck = await db.query(
            'SELECT id FROM user_vocabulary WHERE user_id = $1 AND word_id = $2',
            [userId, vocabData.id]
        );

        res.json({
            success: true,
            found: true,
            data: vocabData,
            hasUserWord: userCheck.rows.length > 0
        });
    } catch (error) {
        logger.error('[Vocabulary API] Lookup word error:', error);
        res.status(500).json({ success: false, error: 'Kelime aranamadı' });
    }
};

/**
 * GET /api/vocabulary/due
 * Get words ready for review
 */
exports.getDueWords = async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 20;

        const words = await srsService.getDueWords(userId, limit);

        res.json({
            success: true,
            data: words
        });
    } catch (error) {
        logger.error('[Vocabulary API] Get due words error:', error);
        res.status(500).json({ success: false, error: 'Kartlar getirilemedi' });
    }
};


/**
 * POST /api/vocabulary/review
 * Submit a review for a word
 */
exports.submitReview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { wordId, rating } = req.body;

        if (!wordId || rating === undefined) {
            return res.status(400).json({ success: false, error: 'WordId ve rating gerekli' });
        }

        // Rating verification (0-3)
        if (rating < 0 || rating > 3) {
            return res.status(400).json({ success: false, error: 'Rating 0-3 arasında olmalı' });
        }

        const result = await srsService.processReview(userId, wordId, rating);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[Vocabulary API] Review error:', error);
        res.status(500).json({ success: false, error: 'İnceleme kaydedilemedi' });
    }
};

/**
 * POST /api/vocabulary/add
 * Manually add a word (e.g. from content)
 */
exports.addWord = async (req, res) => {
    try {
        const userId = req.user.id;
        const { word, definition, context, level, sourceContext, type = 'word' } = req.body;

        if (!word) {
            return res.status(400).json({ success: false, error: 'İçerik gerekli' });
        }

        // Enrich the word with AI (IPA, definitions, etc.)
        let enrichedData = {};
        try {
            const wordEnrichmentService = require('../services/wordEnrichmentService');
            enrichedData = await wordEnrichmentService.enrichWord(word);
        } catch (enrichError) {
            logger.warn('[Vocabulary API] Enrichment failed, using provided data:', enrichError.message);
        }

        // Merge provided data with enriched data (user data takes priority)
        const finalDefinition = definition || enrichedData.definition_tr || enrichedData.definition_en;
        const finalExample = context || enrichedData.example_sentence;
        const ipa = enrichedData.ipa || null;
        const collocations = enrichedData.collocations ? JSON.stringify(enrichedData.collocations) : null;

        // 1. Check if word exists in global vocabulary
        let wordId;
        const vocabCheck = await db.query('SELECT id FROM vocabulary WHERE word = $1', [word.toLowerCase()]);

        if (vocabCheck.rows.length > 0) {
            wordId = vocabCheck.rows[0].id;
        } else {
            // Add to global vocabulary
            const newVocab = await db.query(`
                INSERT INTO vocabulary (word, original_word, definition, example_sentence, meanings, level)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `, [
                word.toLowerCase(),
                word,
                finalDefinition,
                finalExample,
                JSON.stringify(enrichedData.meanings || {}), // Store meanings if available
                level || (enrichedData.frequency_rank === 'common' ? 'B1' : 'B2')
            ]);
            wordId = newVocab.rows[0].id;
        }

        // 2. Add to user's list (check duplicate first via word_id)
        const userCheck = await db.query('SELECT id FROM user_vocabulary WHERE user_id = $1 AND word_id = $2', [userId, wordId]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ success: false, error: 'Bu kelime zaten listenizde' });
        }

        // 3. Insert into user_vocabulary pivot
        const result = await db.query(`
            INSERT INTO user_vocabulary (user_id, word_id, status, notes)
            VALUES ($1, $2, 'new', $3)
            RETURNING *
        `, [
            userId,
            wordId,
            JSON.stringify({ ipa, collocations: enrichedData.collocations, sourceContext })
        ]);

        // 4. 🔄 Sync to word_reviews for SRS (fire-and-forget, non-blocking)
        db.query(`
            INSERT INTO word_reviews (
                user_id, word, definition, example_sentence,
                next_review_date, interval_days, ease_factor, repetition_count, streak_correct
            ) VALUES ($1, $2, $3, $4, CURRENT_DATE, 1, 2.5, 0, 0)
            ON CONFLICT (user_id, word) DO NOTHING
        `, [
            userId,
            word.toLowerCase(),
            finalDefinition || '',
            finalExample || ''
        ])
            .then(() => logger.info(`[Vocabulary API] Word "${word}" synced to word_reviews for SRS`))
            .catch(err => logger.warn('[Vocabulary API] word_reviews sync failed:', err.message));

        // Fetch full data for response
        const fullData = await db.query(`
            SELECT uv.*, v.word, v.definition, v.example_sentence, v.level 
            FROM user_vocabulary uv
            JOIN vocabulary v ON uv.word_id = v.id
            WHERE uv.id = $1
        `, [result.rows[0].id]);

        res.json({
            success: true,
            data: {
                ...fullData.rows[0],
                ipa,
                collocations: enrichedData.collocations
            }
        });
    } catch (error) {
        logger.error('[Vocabulary API] Add word error:', error);
        res.status(500).json({ success: false, error: 'Kelime eklenemedi' });
    }
};

/**
 * GET /api/vocabulary/stats
 * Get user vocabulary statistics
 */
exports.getStats = async (req, res) => {
    try {
        const userId = req.user.id;
        // type filter removed as column does not exist yet
        let whereClause = 'user_id = $1';
        const params = [userId];

        // Get counts using is_learned (status column doesn't exist)
        const statsQuery = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN is_learned = true THEN 1 ELSE 0 END) as mastered,
                SUM(CASE WHEN is_learned = false THEN 1 ELSE 0 END) as learning,
                SUM(CASE WHEN next_review_at <= NOW() OR is_learned = false THEN 1 ELSE 0 END) as due_today
            FROM user_vocabulary
            WHERE ${whereClause}
        `, params);

        const stats = statsQuery.rows[0];

        // Calculate streak (days with reviews)
        const streakQuery = await db.query(`
            SELECT COUNT(DISTINCT DATE(last_reviewed_at)) as streak_days
            FROM user_vocabulary
            WHERE user_id = $1 
              AND last_reviewed_at >= NOW() - INTERVAL '7 days'
        `, [userId]);

        res.json({
            success: true,
            data: {
                totalWords: parseInt(stats.total) || 0,
                mastered: parseInt(stats.mastered) || 0,
                learning: parseInt(stats.learning) || 0,
                dueToday: parseInt(stats.due_today) || 0,
                streak: parseInt(streakQuery.rows[0].streak_days) || 0
            }
        });
    } catch (error) {
        logger.error('[Vocabulary API] Get stats error:', error);
        res.status(500).json({ success: false, error: 'İstatistikler yüklenemedi' });
    }
};

/**
 * GET /api/vocabulary/collection
 * Get all words in user's vocabulary (for collection view)
 */
exports.getCollection = async (req, res) => {
    try {
        const userId = req.user.id;
        logger.info(`[Vocabulary API] Fetching collection for user: ${userId}`, req.query);
        const status = req.query.status; // Optional: 'learning', 'mastered'
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;

        // Base filter
        let whereClause = 'uv.user_id = $1';
        const params = [userId];

        // Filter by learning status using is_learned column
        if (status) {
            if (status === 'learning') {
                whereClause += ` AND uv.is_learned = false`;
            } else if (status === 'mastered') {
                whereClause += ` AND uv.is_learned = true`;
            }
        }

        logger.info(`[Vocabulary API] Collection query: WHERE ${whereClause}`, params);

        const result = await db.query(`
            SELECT 
                uv.id,
                uv.word_id,
                uv.is_learned,
                uv.streak,
                uv.next_review_at,
                uv.last_reviewed_at,
                uv.created_at,
                v.word,
                v.original_word,
                v.definition,
                v.example_sentence,
                v.level,
                v.meanings
            FROM user_vocabulary uv
            JOIN vocabulary v ON uv.word_id = v.id
            WHERE ${whereClause}
            ORDER BY uv.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `, [...params, limit, offset]);

        // Map is_learned to status for frontend compatibility
        const mappedRows = result.rows.map(row => ({
            ...row,
            status: row.is_learned ? 'mastered' : 'learning'
        }));

        res.json({
            success: true,
            data: mappedRows,
            pagination: {
                limit,
                offset,
                hasMore: result.rows.length === limit
            }
        });
    } catch (error) {
        logger.error('[Vocabulary API] Get collection error:', error);
        res.status(500).json({ success: false, error: 'Koleksiyon yüklenemedi' });
    }
};

/**
 * GET /api/vocabulary/random
 * Get random words from user's collection (for practice variety)
 */
exports.getRandomWords = async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 10;
        const excludeRecent = req.query.excludeRecent === 'true'; // Exclude recently reviewed

        let whereClause = 'uv.user_id = $1';

        if (excludeRecent) {
            // Exclude words reviewed in the last 24 hours
            whereClause += ` AND (uv.last_reviewed_at IS NULL OR uv.last_reviewed_at < NOW() - INTERVAL '24 hours')`;
        }

        // Application-level random selection to avoid ORDER BY RANDOM() full-table sort
        const countResult = await db.query(`
            SELECT COUNT(*) as total
            FROM user_vocabulary uv
            JOIN vocabulary v ON uv.word_id = v.id
            WHERE ${whereClause}
        `, [userId]);

        const total = parseInt(countResult.rows[0]?.total || '0', 10);
        const randomOffset = Math.floor(Math.random() * Math.max(total - limit, 1));

        const result = await db.query(`
            SELECT
                uv.id,
                uv.word_id,
                uv.is_learned,
                uv.streak,
                uv.created_at,
                v.word,
                v.original_word,
                v.definition,
                v.example_sentence,
                v.level,
                v.meanings
            FROM user_vocabulary uv
            JOIN vocabulary v ON uv.word_id = v.id
            WHERE ${whereClause}
            OFFSET $2 LIMIT $3
        `, [userId, randomOffset, limit]);

        // Map is_learned to status for frontend compatibility
        const mappedRows = result.rows.map(row => ({
            ...row,
            status: row.is_learned ? 'mastered' : 'learning'
        }));

        res.json({
            success: true,
            data: mappedRows
        });
    } catch (error) {
        logger.error('[Vocabulary API] Get random words error:', error);
        res.status(500).json({ success: false, error: 'Kelimeler getirilemedi' });
    }
};
