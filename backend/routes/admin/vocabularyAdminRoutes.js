/**
 * Vocabulary Admin Routes
 *
 * Admin panel kelime yönetimi ve AI üretim route'ları
 */

const express = require('express');
const router = express.Router();
const vocabularyAdminController = require('../../controllers/vocabularyAdminController');
const { authenticate, authorizeAdmin } = require('../../middleware/auth');
const { validateBody, validateQuery } = require('../../middleware/validation');
const Joi = require('joi');

// ========================================
// VALIDATION SCHEMAS
// ========================================

const topicQuerySchema = Joi.object({
    type: Joi.string().valid('sector', 'travel', 'intellectual'),
    active: Joi.string().valid('true', 'false', 'all')
});

const vocabularyQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(200).default(50),
    level: Joi.string().valid('A1', 'A2', 'B1', 'B2', 'C1', 'C2'),
    category: Joi.string().max(100)
});

const generateSchema = Joi.object({
    targetCount: Joi.number().integer().min(25).max(500).default(200)
});

const importVocabularySchema = Joi.object({
    words: Joi.array().items(
        Joi.object({
            word: Joi.string().max(100).required(),
            pronunciation: Joi.string().max(150).allow('', null),
            definition_en: Joi.string().max(1000).required(),
            definition_tr: Joi.string().max(1000).required(),
            example_sentence: Joi.string().allow('', null),
            example_sentence_tr: Joi.string().allow('', null),
            category: Joi.string().max(100).allow('', null),
            cefr_level: Joi.string().valid('A1', 'A2', 'B1', 'B2', 'C1', 'C2'),
            frequency_rank: Joi.number().integer().min(1)
        })
    ).min(1).max(500).required()
});

const jobsQuerySchema = Joi.object({
    topic_id: Joi.number().integer().positive(),
    limit: Joi.number().integer().min(1).max(100).default(20)
});

// ========================================
// MIDDLEWARE
// ========================================

// Tüm endpoint'ler admin auth gerektirir
router.use(authenticate);
router.use(authorizeAdmin);

// ========================================
// TOPIC ROUTES
// ========================================

/**
 * @route GET /api/admin/vocabulary/topics
 * @desc Tüm konuları listele (sector + travel + intellectual)
 * @query type - 'sector' | 'travel' | 'intellectual' (opsiyonel)
 * @query active - 'true' | 'false' | 'all' (opsiyonel, default: true)
 */
router.get('/topics', validateQuery(topicQuerySchema), vocabularyAdminController.getAllTopics);

/**
 * @route GET /api/admin/vocabulary/topics/:id
 * @desc Tek konu detay + kelime istatistikleri
 */
router.get('/topics/:id', vocabularyAdminController.getTopicDetails);

/**
 * @route GET /api/admin/vocabulary/topics/:id/words
 * @desc Konuya ait kelimeler (pagination)
 * @query page - Sayfa numarası (default: 1)
 * @query limit - Sayfa başına kelime (default: 50, max: 200)
 * @query level - CEFR seviyesi filtresi
 * @query category - Kategori filtresi
 */
router.get('/topics/:id/words', validateQuery(vocabularyQuerySchema), vocabularyAdminController.getTopicVocabulary);

/**
 * @route POST /api/admin/vocabulary/topics/:id/generate
 * @desc AI ile kelime üretimi başlat
 * @body targetCount - Hedef kelime sayısı (default: 200, min: 25, max: 500)
 */
router.post('/topics/:id/generate', validateBody(generateSchema), vocabularyAdminController.startGeneration);

/**
 * @route POST /api/admin/vocabulary/topics/:id/import
 * @desc Manuel JSON import
 * @body words - Kelime dizisi
 */
router.post('/topics/:id/import', validateBody(importVocabularySchema), vocabularyAdminController.importVocabulary);

// ========================================
// JOB ROUTES
// ========================================

/**
 * @route GET /api/admin/vocabulary/jobs
 * @desc Son işleri listele
 * @query topic_id - Konu ID'si (opsiyonel)
 * @query limit - Max iş sayısı (default: 20)
 */
router.get('/jobs', validateQuery(jobsQuerySchema), vocabularyAdminController.getRecentJobs);

/**
 * @route GET /api/admin/vocabulary/jobs/:jobId
 * @desc Üretim işi durumu
 */
router.get('/jobs/:jobId', vocabularyAdminController.getJobStatus);

/**
 * @route DELETE /api/admin/vocabulary/jobs/:jobId
 * @desc Üretim işini iptal et
 */
router.delete('/jobs/:jobId', vocabularyAdminController.cancelJob);

module.exports = router;
