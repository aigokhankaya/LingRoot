/**
 * 👤 User Sector Controller
 * 
 * Kullanıcı sektör tercihleri yönetimi
 */

const sectorService = require('../services/sectorService');
const gamificationService = require('../services/gamificationService');
const logger = require('../utils/common/logger.js');

/**
 * Kullanıcının sektörlerini getir
 * GET /api/user/sectors
 */
const getUserSectors = async (req, res) => {
    try {
        const userId = req.user.id;
        const sectors = await sectorService.getUserSectors(userId);

        res.json({
            success: true,
            data: sectors
        });
    } catch (error) {
        logger.error('Error in getUserSectors:', error);
        res.status(500).json({
            success: false,
            error: 'Sektörler getirilirken bir hata oluştu'
        });
    }
};

/**
 * Kullanıcıya sektör ekle
 * POST /api/user/sectors
 * Body: { sector_id: number, is_primary?: boolean }
 */
const addUserSector = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sector_id, is_primary = false } = req.body;

        if (!sector_id) {
            return res.status(400).json({
                success: false,
                error: 'sector_id gerekli'
            });
        }

        // Sektör var mı kontrol et
        const sector = await sectorService.getSectorById(sector_id);
        if (!sector) {
            return res.status(404).json({
                success: false,
                error: 'Sektör bulunamadı'
            });
        }

        const result = await sectorService.addUserSector(userId, sector_id, is_primary);

        res.json({
            success: true,
            data: result,
            message: `${sector.name_tr} sektörü eklendi`
        });
    } catch (error) {
        logger.error('Error in addUserSector:', error);
        res.status(500).json({
            success: false,
            error: 'Sektör eklenirken bir hata oluştu'
        });
    }
};

/**
 * Kullanıcıdan sektör kaldır
 * DELETE /api/user/sectors/:sectorId
 */
const removeUserSector = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sectorId } = req.params;

        await sectorService.removeUserSector(userId, parseInt(sectorId));

        res.json({
            success: true,
            message: 'Sektör kaldırıldı'
        });
    } catch (error) {
        logger.error('Error in removeUserSector:', error);
        res.status(500).json({
            success: false,
            error: 'Sektör kaldırılırken bir hata oluştu'
        });
    }
};

/**
 * Kullanıcı sektör istatistiklerini getir
 * GET /api/user/sectors/:sectorId/stats
 */
const getUserSectorStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sectorId } = req.params;

        const stats = await sectorService.getUserSectorStats(userId, parseInt(sectorId));

        if (!stats) {
            return res.status(404).json({
                success: false,
                error: 'Sektör istatistikleri bulunamadı'
            });
        }

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error in getUserSectorStats:', error);
        res.status(500).json({
            success: false,
            error: 'İstatistikler getirilirken bir hata oluştu'
        });
    }
};

/**
 * İçerik tamamlandı olarak işaretle
 * POST /api/user/sectors/content/:contentId/complete
 */
const markContentComplete = async (req, res) => {
    try {
        const userId = req.user.id;
        const { contentId } = req.params;
        const { rating } = req.body;

        // İçeriği bul
        const content = await sectorService.getContentById(contentId);
        if (!content) {
            return res.status(404).json({
                success: false,
                error: 'İçerik bulunamadı'
            });
        }

        // İlerlemeyi güncelle
        await sectorService.updateUserSectorProgress(userId, content.sector_id, 'content', 1);

        // XP ekle
        const xpAmount = content.content_type === 'dialogue' ? 30 : 25;
        const xpResult = await gamificationService.addXP(
            userId,
            xpAmount,
            'sector_content',
            contentId,
            `${content.title} içeriği tamamlandı`
        );

        // Daily quest güncelle
        await gamificationService.updateDailyQuestProgress(userId, 'listen_content', 1);

        // Sektör achievement kontrolü
        const stats = await sectorService.getUserSectorStats(userId, content.sector_id);
        const earnedAchievements = await gamificationService.checkSectorAchievements(
            userId,
            'content',
            stats?.content_completed || 1
        );

        res.json({
            success: true,
            message: 'İçerik tamamlandı',
            xp: {
                earned: xpAmount,
                ...xpResult
            },
            earnedAchievements
        });
    } catch (error) {
        logger.error('Error in markContentComplete:', error);
        res.status(500).json({
            success: false,
            error: 'İşlem sırasında bir hata oluştu'
        });
    }
};

/**
 * Sektör kelimesi öğrenildi olarak işaretle
 * POST /api/user/sectors/vocabulary/:wordId/learned
 */
const markVocabularyLearned = async (req, res) => {
    try {
        const userId = req.user.id;
        const { wordId } = req.params;
        const { sector_id } = req.body;

        if (!sector_id) {
            return res.status(400).json({
                success: false,
                error: 'sector_id gerekli'
            });
        }

        // İlerlemeyi güncelle
        await sectorService.updateUserSectorProgress(userId, sector_id, 'vocabulary', 1);

        // XP ekle
        const xpResult = await gamificationService.addXP(
            userId,
            5,
            'sector_vocabulary',
            wordId.toString(),
            'Sektör kelimesi öğrenildi'
        );

        // Daily quest güncelle
        await gamificationService.updateDailyQuestProgress(userId, 'learn_words', 1);

        // Sektör achievement kontrolü
        const stats = await sectorService.getUserSectorStats(userId, sector_id);
        const earnedAchievements = await gamificationService.checkSectorAchievements(
            userId,
            'vocabulary',
            stats?.vocabulary_learned || 1
        );

        res.json({
            success: true,
            message: 'Kelime öğrenildi olarak işaretlendi',
            xp: {
                earned: 5,
                ...xpResult
            },
            earnedAchievements
        });
    } catch (error) {
        logger.error('Error in markVocabularyLearned:', error);
        res.status(500).json({
            success: false,
            error: 'İşlem sırasında bir hata oluştu'
        });
    }
};

module.exports = {
    getUserSectors,
    addUserSector,
    removeUserSector,
    getUserSectorStats,
    markContentComplete,
    markVocabularyLearned
};
