/**
 * 🏢 Sector Controller
 * 
 * Sektör İngilizcesi - Kullanıcı endpoint'leri
 */

const sectorService = require('../services/sectorService');
const logger = require('../utils/common/logger.js');

/**
 * Tüm aktif sektörleri listele
 * GET /api/sectors
 */
const getAllSectors = async (req, res) => {
    try {
        const sectors = await sectorService.getAllSectors(false);
        res.json({
            success: true,
            data: sectors
        });
    } catch (error) {
        logger.error('Error in getAllSectors:', error);
        res.status(500).json({
            success: false,
            error: 'Sektörler getirilirken bir hata oluştu'
        });
    }
};

/**
 * Sektör detayı getir
 * GET /api/sectors/:id
 */
const getSectorById = async (req, res) => {
    try {
        const { id } = req.params;
        const sector = await sectorService.getSectorById(parseInt(id));

        if (!sector) {
            return res.status(404).json({
                success: false,
                error: 'Sektör bulunamadı'
            });
        }

        res.json({
            success: true,
            data: sector
        });
    } catch (error) {
        logger.error('Error in getSectorById:', error);
        res.status(500).json({
            success: false,
            error: 'Sektör getirilirken bir hata oluştu'
        });
    }
};

/**
 * Sektör içeriklerini getir
 * GET /api/sectors/:id/content
 */
const getSectorContent = async (req, res) => {
    try {
        const { id } = req.params;
        const { page, limit, level, type, sort, order } = req.query;

        const options = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            cefrLevel: level || null,
            contentType: type || null,
            status: 'published',
            sortBy: sort || 'created_at',
            sortOrder: order || 'DESC'
        };

        const result = await sectorService.getSectorContent(parseInt(id), options);

        res.json({
            success: true,
            data: result.items,
            pagination: result.pagination
        });
    } catch (error) {
        logger.error('Error in getSectorContent:', error);
        res.status(500).json({
            success: false,
            error: 'İçerikler getirilirken bir hata oluştu'
        });
    }
};

/**
 * Sektör terminolojisini getir
 * GET /api/sectors/:id/vocabulary
 */
const getSectorVocabulary = async (req, res) => {
    try {
        const { id } = req.params;
        const { page, limit, level, category } = req.query;

        const options = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 50,
            cefrLevel: level || null,
            category: category || null
        };

        const result = await sectorService.getSectorVocabulary(parseInt(id), options);

        res.json({
            success: true,
            data: result.items,
            pagination: result.pagination
        });
    } catch (error) {
        logger.error('Error in getSectorVocabulary:', error);
        res.status(500).json({
            success: false,
            error: 'Terminoloji getirilirken bir hata oluştu'
        });
    }
};

/**
 * Tek içerik detayı getir
 * GET /api/sectors/content/:contentId
 */
const getContentById = async (req, res) => {
    try {
        const { contentId } = req.params;
        const content = await sectorService.getContentById(contentId);

        if (!content) {
            return res.status(404).json({
                success: false,
                error: 'İçerik bulunamadı'
            });
        }

        res.json({
            success: true,
            data: content
        });
    } catch (error) {
        logger.error('Error in getContentById:', error);
        res.status(500).json({
            success: false,
            error: 'İçerik getirilirken bir hata oluştu'
        });
    }
};

/**
 * İçerik için TTS ses oluştur (on-demand)
 * POST /api/sectors/content/:contentId/audio
 */
const generateContentAudio = async (req, res) => {
    try {
        const { contentId } = req.params;
        const { voice, speed, forceRegenerate } = req.body;

        // Lazy load TTS service to avoid startup issues
        const sectorContentTTSService = require('../services/sectorContentTTSService');

        const result = await sectorContentTTSService.getOrGenerateAudio(contentId, {
            voice: voice || 'nova',
            speed: speed || 0.9,
            forceRegenerate: forceRegenerate || false
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('Error generating content audio:', error);
        res.status(500).json({
            success: false,
            error: 'Ses oluşturulurken bir hata oluştu'
        });
    }
};

/**
 * Sektör için toplu TTS oluştur (admin)
 * POST /api/sectors/:id/generate-audio
 */
const generateSectorAudio = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit, voice, speed } = req.body;

        const sectorContentTTSService = require('../services/sectorContentTTSService');

        const results = await sectorContentTTSService.generateAudioForSector(parseInt(id), {
            limit: limit || 10,
            voice: voice || 'nova',
            speed: speed || 0.9
        });

        res.json({
            success: true,
            data: {
                processed: results.length,
                results
            }
        });
    } catch (error) {
        logger.error('Error generating sector audio:', error);
        res.status(500).json({
            success: false,
            error: 'Sektör sesleri oluşturulurken bir hata oluştu'
        });
    }
};

// ============ PROGRESS TRACKING ============

/**
 * Get user's progress for a content
 * GET /api/sectors/content/:contentId/progress
 */
const getContentProgress = async (req, res) => {
    try {
        const { contentId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Giriş yapmanız gerekiyor'
            });
        }

        const sectorProgressService = require('../services/sectorProgressService');
        const progress = await sectorProgressService.getContentProgress(userId, contentId);

        res.json({
            success: true,
            data: progress
        });
    } catch (error) {
        logger.error('Error getting content progress:', error);
        res.status(500).json({
            success: false,
            error: 'İlerleme bilgisi alınırken hata oluştu'
        });
    }
};

/**
 * Update user's progress for a content
 * POST /api/sectors/content/:contentId/progress
 */
const updateContentProgress = async (req, res) => {
    try {
        const { contentId } = req.params;
        const userId = req.user?.id;
        const { status, progress_percentage, last_position_seconds, rating } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Giriş yapmanız gerekiyor'
            });
        }

        const sectorProgressService = require('../services/sectorProgressService');
        const progress = await sectorProgressService.updateProgress(userId, contentId, {
            status,
            progress_percentage,
            last_position_seconds,
            rating
        });

        res.json({
            success: true,
            data: progress
        });
    } catch (error) {
        logger.error('Error updating content progress:', error);
        res.status(500).json({
            success: false,
            error: 'İlerleme güncellenirken hata oluştu'
        });
    }
};

/**
 * Get user's progress for a sector
 * GET /api/sectors/:id/progress
 */
const getSectorProgress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Giriş yapmanız gerekiyor'
            });
        }

        const sectorProgressService = require('../services/sectorProgressService');
        const progress = await sectorProgressService.getSectorProgress(userId, parseInt(id));

        res.json({
            success: true,
            data: progress
        });
    } catch (error) {
        logger.error('Error getting sector progress:', error);
        res.status(500).json({
            success: false,
            error: 'Sektör ilerleme bilgisi alınırken hata oluştu'
        });
    }
};

/**
 * Get user's overall stats
 * GET /api/sectors/stats
 */
const getUserSectorStats = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Giriş yapmanız gerekiyor'
            });
        }

        const sectorProgressService = require('../services/sectorProgressService');
        const stats = await sectorProgressService.getUserStats(userId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error getting user sector stats:', error);
        res.status(500).json({
            success: false,
            error: 'İstatistikler alınırken hata oluştu'
        });
    }
};

/**
 * Sektör kelimesini SRS tekrar listesine ekle
 * POST /api/sectors/vocabulary/:wordId/add-to-review
 */
const addVocabularyToReview = async (req, res) => {
    try {
        const { wordId } = req.params;
        const userId = req.user?.id;
        const { quality = 3 } = req.body; // Initial quality (0-5), default 3 = first time seen

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Giriş yapmanız gerekiyor'
            });
        }

        // Get vocabulary details from sector_vocabulary
        const { supabase } = require('../utils/storage/supabaseClient');
        const { data: vocab, error: vocabError } = await supabase
            .from('sector_vocabulary')
            .select('word, definition_tr, definition_en, example_sentence, sector_id')
            .eq('id', wordId)
            .single();

        if (vocabError || !vocab) {
            return res.status(404).json({
                success: false,
                error: 'Kelime bulunamadı'
            });
        }

        // Add to SRS using existing service
        const srsService = require('../services/srsService');
        const result = await srsService.reviewWord(
            userId,
            vocab.word,
            vocab.definition_tr,
            quality,
            vocab.definition_en || vocab.definition_tr,
            vocab.example_sentence,
            `sector_${vocab.sector_id}`
        );

        res.json({
            success: true,
            data: {
                word: vocab.word,
                next_review: result.next_review_date,
                message: 'Kelime tekrar listesine eklendi'
            }
        });
    } catch (error) {
        logger.error('Error adding vocabulary to review:', error);
        res.status(500).json({
            success: false,
            error: 'Kelime eklenirken hata oluştu'
        });
    }
};

/**
 * İçeriği tamamla ve XP kazan
 * POST /api/sectors/content/:contentId/complete
 */
const completeContent = async (req, res) => {
    try {
        const { contentId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Giriş yapmanız gerekiyor'
            });
        }

        // Get content details to find sector_id
        const content = await sectorService.getContentById(contentId);
        if (!content) {
            return res.status(404).json({
                success: false,
                error: 'İçerik bulunamadı'
            });
        }

        // Check if already completed
        const sectorProgressService = require('../services/sectorProgressService');
        const existingProgress = await sectorProgressService.getContentProgress(userId, contentId);
        const wasAlreadyCompleted = existingProgress?.status === 'completed';

        // Mark content as completed in progress (this also adds XP via sectorGamificationService)
        const progress = await sectorProgressService.updateProgress(userId, contentId, {
            status: 'completed',
            progress_percentage: 100
        });

        // Get XP result for response
        let xpResult = { xpAdded: 0, leveledUp: false };

        // Only add XP and update daily quest if not already completed
        if (!wasAlreadyCompleted) {
            const gamificationService = require('../services/gamificationService');

            // Update daily quest progress for 'complete_content'
            await gamificationService.updateDailyQuestProgress(userId, 'complete_content', 1);

            // Update streak
            try {
                await gamificationService.updateStreak(userId);
            } catch (streakError) {
                logger.warn('Streak update failed (non-blocking):', streakError.message);
            }

            // Check sector achievements
            try {
                const { supabase } = require('../utils/storage/supabaseClient');
                const { data: stats } = await supabase
                    .from('user_sector_content_progress')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('status', 'completed');

                const totalCompleted = stats?.length || 0;
                const achievements = await gamificationService.checkSectorAchievements(userId, 'content', totalCompleted);

                // Estimate XP based on content type (sectorGamificationService adds the actual XP)
                const xpRewards = gamificationService.xpRewards;
                if (content.content_type === 'business_roleplay') {
                    xpResult.xpAdded = xpRewards.SECTOR_DIALOGUE_COMPLETE || 60;
                } else if (content.content_type === 'sector_podcast') {
                    xpResult.xpAdded = xpRewards.SECTOR_PODCAST_COMPLETE || 80;
                } else {
                    xpResult.xpAdded = xpRewards.SECTOR_CONTENT_COMPLETE || 50;
                }
            } catch (achievementError) {
                logger.warn('Sector achievement check failed:', achievementError.message);
                xpResult.xpAdded = 50; // Default XP
            }

            logger.info(`[SECTOR] User ${userId} completed content ${contentId}, earned ~${xpResult.xpAdded} XP`);
        } else {
            logger.info(`[SECTOR] User ${userId} already completed content ${contentId}, no XP awarded`);
        }

        res.json({
            success: true,
            data: {
                progress,
                xp: xpResult,
                alreadyCompleted: wasAlreadyCompleted
            }
        });
    } catch (error) {
        logger.error('Error completing content:', error);
        res.status(500).json({
            success: false,
            error: 'İçerik tamamlanırken hata oluştu'
        });
    }
};

module.exports = {
    getAllSectors,
    getSectorById,
    getSectorContent,
    getSectorVocabulary,
    getContentById,
    generateContentAudio,
    generateSectorAudio,
    getContentProgress,
    updateContentProgress,
    getSectorProgress,
    getUserSectorStats,
    addVocabularyToReview,
    completeContent
};
