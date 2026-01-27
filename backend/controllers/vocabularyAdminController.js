/**
 * Vocabulary Admin Controller
 *
 * Admin panel kelime yönetimi ve AI üretim endpoint'leri
 */

const vocabularyGenerationService = require('../services/vocabularyGenerationService');
const logger = require('../utils/common/logger.js');

// ========================================
// TOPIC YÖNETİMİ
// ========================================

/**
 * Tüm konuları listele (sector + travel + intellectual)
 * GET /api/admin/vocabulary/topics
 */
const getAllTopics = async (req, res) => {
    try {
        const { type, active } = req.query;

        const options = {
            topicType: type || null,
            isActive: active === 'false' ? false : (active === 'all' ? null : true)
        };

        const topics = await vocabularyGenerationService.getAllTopics(options);

        // Group by type for easier frontend consumption
        const grouped = {
            sector: topics.filter(t => t.topic_type === 'sector'),
            travel: topics.filter(t => t.topic_type === 'travel'),
            intellectual: topics.filter(t => t.topic_type === 'intellectual')
        };

        res.json({
            success: true,
            data: {
                topics,
                grouped,
                stats: {
                    total: topics.length,
                    sector: grouped.sector.length,
                    travel: grouped.travel.length,
                    intellectual: grouped.intellectual.length,
                    totalWords: topics.reduce((sum, t) => sum + (t.actual_word_count || 0), 0)
                }
            }
        });
    } catch (error) {
        logger.error('Error in getAllTopics:', error);
        res.status(500).json({
            success: false,
            error: 'Konular getirilirken bir hata oluştu'
        });
    }
};

/**
 * Tek konu detay + kelime istatistikleri
 * GET /api/admin/vocabulary/topics/:id
 */
const getTopicDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const topic = await vocabularyGenerationService.getTopicById(parseInt(id));

        if (!topic) {
            return res.status(404).json({
                success: false,
                error: 'Konu bulunamadı'
            });
        }

        // Get recent jobs for this topic
        const recentJobs = await vocabularyGenerationService.getRecentJobs(parseInt(id), 5);

        // Get vocabulary stats
        const vocabResult = await vocabularyGenerationService.getTopicVocabulary(parseInt(id), { limit: 1 });

        res.json({
            success: true,
            data: {
                topic,
                recentJobs,
                vocabularyCount: vocabResult.pagination.total
            }
        });
    } catch (error) {
        logger.error('Error in getTopicDetails:', error);
        res.status(500).json({
            success: false,
            error: 'Konu detayları getirilirken bir hata oluştu'
        });
    }
};

/**
 * Konuya ait kelimeler (pagination)
 * GET /api/admin/vocabulary/topics/:id/words
 */
const getTopicVocabulary = async (req, res) => {
    try {
        const { id } = req.params;
        const { page, limit, level, category } = req.query;

        const options = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 50,
            cefrLevel: level || null,
            category: category || null
        };

        const result = await vocabularyGenerationService.getTopicVocabulary(parseInt(id), options);

        res.json({
            success: true,
            data: result.items,
            pagination: result.pagination
        });
    } catch (error) {
        logger.error('Error in getTopicVocabulary:', error);

        if (error.message === 'Topic not found') {
            return res.status(404).json({
                success: false,
                error: 'Konu bulunamadı'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Kelimeler getirilirken bir hata oluştu'
        });
    }
};

// ========================================
// AI KELİME ÜRETİMİ
// ========================================

/**
 * AI ile kelime üretimi başlat
 * POST /api/admin/vocabulary/topics/:id/generate
 */
const startGeneration = async (req, res) => {
    try {
        const { id } = req.params;
        const { targetCount = 200 } = req.body;
        const userId = req.user?.id || null;

        // Validate target count
        if (targetCount < 25 || targetCount > 500) {
            return res.status(400).json({
                success: false,
                error: 'targetCount 25-500 arasında olmalı'
            });
        }

        const job = await vocabularyGenerationService.generateVocabulary(
            parseInt(id),
            targetCount,
            userId
        );

        res.status(202).json({
            success: true,
            data: job,
            message: 'Kelime üretimi başlatıldı'
        });
    } catch (error) {
        logger.error('Error in startGeneration:', error);

        if (error.message === 'Topic not found') {
            return res.status(404).json({
                success: false,
                error: 'Konu bulunamadı'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Kelime üretimi başlatılırken bir hata oluştu'
        });
    }
};

/**
 * Üretim işi durumu
 * GET /api/admin/vocabulary/jobs/:jobId
 */
const getJobStatus = async (req, res) => {
    try {
        const { jobId } = req.params;

        const job = await vocabularyGenerationService.getJobById(jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'İş bulunamadı'
            });
        }

        // Parse batch_logs if it's a string
        if (typeof job.batch_logs === 'string') {
            try {
                job.batch_logs = JSON.parse(job.batch_logs);
            } catch {
                job.batch_logs = [];
            }
        }

        // Calculate progress
        const progress = job.target_count > 0
            ? Math.round((job.generated_count / job.target_count) * 100)
            : 0;

        res.json({
            success: true,
            data: {
                ...job,
                progress
            }
        });
    } catch (error) {
        logger.error('Error in getJobStatus:', error);
        res.status(500).json({
            success: false,
            error: 'İş durumu getirilirken bir hata oluştu'
        });
    }
};

/**
 * Üretim işini iptal et
 * DELETE /api/admin/vocabulary/jobs/:jobId
 */
const cancelJob = async (req, res) => {
    try {
        const { jobId } = req.params;

        const job = await vocabularyGenerationService.getJobById(jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'İş bulunamadı'
            });
        }

        if (job.status !== 'pending' && job.status !== 'in_progress') {
            return res.status(400).json({
                success: false,
                error: 'Sadece bekleyen veya devam eden işler iptal edilebilir'
            });
        }

        const cancelledJob = await vocabularyGenerationService.cancelJob(jobId);

        res.json({
            success: true,
            data: cancelledJob,
            message: 'İş iptal edildi'
        });
    } catch (error) {
        logger.error('Error in cancelJob:', error);
        res.status(500).json({
            success: false,
            error: 'İş iptal edilirken bir hata oluştu'
        });
    }
};

/**
 * Son işleri listele
 * GET /api/admin/vocabulary/jobs
 */
const getRecentJobs = async (req, res) => {
    try {
        const { topic_id, limit } = req.query;

        const jobs = await vocabularyGenerationService.getRecentJobs(
            topic_id ? parseInt(topic_id) : null,
            parseInt(limit) || 20
        );

        res.json({
            success: true,
            data: jobs
        });
    } catch (error) {
        logger.error('Error in getRecentJobs:', error);
        res.status(500).json({
            success: false,
            error: 'İşler getirilirken bir hata oluştu'
        });
    }
};

// ========================================
// MANUEL IMPORT
// ========================================

/**
 * Manuel JSON import
 * POST /api/admin/vocabulary/topics/:id/import
 */
const importVocabulary = async (req, res) => {
    try {
        const { id } = req.params;
        const { words } = req.body;

        if (!words || !Array.isArray(words) || words.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'words array gerekli'
            });
        }

        if (words.length > 500) {
            return res.status(400).json({
                success: false,
                error: 'Tek seferde en fazla 500 kelime import edilebilir'
            });
        }

        const result = await vocabularyGenerationService.importVocabulary(parseInt(id), words);

        res.json({
            success: true,
            data: result,
            message: `${result.success} kelime eklendi, ${result.failed} başarısız`
        });
    } catch (error) {
        logger.error('Error in importVocabulary:', error);

        if (error.message === 'Topic not found') {
            return res.status(404).json({
                success: false,
                error: 'Konu bulunamadı'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Kelimeler import edilirken bir hata oluştu'
        });
    }
};

// ========================================
// EXPORTS
// ========================================

module.exports = {
    // Topics
    getAllTopics,
    getTopicDetails,
    getTopicVocabulary,

    // Generation
    startGeneration,
    getJobStatus,
    cancelJob,
    getRecentJobs,

    // Import
    importVocabulary
};
