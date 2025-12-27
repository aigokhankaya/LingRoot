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
const logger = require('../utils/logger');

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
