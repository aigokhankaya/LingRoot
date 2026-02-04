/**
 * 🏢 Sector English Routes
 * 
 * Public/User routes for accessing Sector English content.
 */

const express = require('express');
const router = express.Router();
const sectorController = require('../controllers/sectorController');
const { optionalAuth, authenticate } = require('../middleware/authMiddleware');
const logger = require('../utils/common/logger');
const { setCacheHeaders } = require('../middleware/cacheHeaders');
const { redisCache } = require('../middleware/redisCache');

// ============ ROLEPLAY & PODCAST ROUTES ============
// ⚠️ Bu route'lar /:id'den ÖNCE gelmeli (statik path'ler dinamik path'lerden önce)

const sectorRoleplayService = require('../services/sectorRoleplayService');
const {
    createRoleplayScenarioSchema,
    generateRoleplayAudioSchema,
    createSectorPodcastSchema
} = require('../middleware/schemas/sectorSchemas');

// Senaryo kategorilerini listele
router.get('/scenario-categories', (req, res) => {
    try {
        const categories = sectorRoleplayService.getScenarioCategories();
        res.json({ success: true, categories });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Rol tabanlı senaryo oluştur
router.post('/roleplay/create', authenticate, async (req, res) => {
    try {
        const { error, value } = createRoleplayScenarioSchema.validate(req.body);
        if (error) {
            logger.warn(`Roleplay Validation Error: ${error.details[0].message}`);
            return res.status(400).json({ success: false, error: error.details[0].message });
        }

        const result = await sectorRoleplayService.generateRoleplayScenario({
            ...value,
            user_id: req.user.id
        });

        res.json(result);
    } catch (error) {
        logger.error('Roleplay creation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Roleplay için TTS ses oluştur (her role farklı ses)
router.post('/roleplay/:contentId/audio', authenticate, async (req, res) => {
    try {
        const { contentId } = req.params;
        const { error, value } = generateRoleplayAudioSchema.validate(req.body);
        if (error) {
            logger.warn(`Roleplay Audio Validation Error: ${error.details[0].message}`);
            return res.status(400).json({ success: false, error: error.details[0].message });
        }

        const result = await sectorRoleplayService.generateRoleplayAudio(contentId, value);
        res.json({ success: true, ...result });
    } catch (error) {
        logger.error('Roleplay audio error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Sektör podcast oluştur
router.post('/podcast/create', authenticate, async (req, res) => {
    try {
        const { error, value } = createSectorPodcastSchema.validate(req.body);
        if (error) {
            logger.warn(`Podcast Validation Error: ${error.details[0].message}`);
            return res.status(400).json({ success: false, error: error.details[0].message });
        }

        const result = await sectorRoleplayService.generateSectorPodcast({
            ...value,
            user_id: req.user.id
        });

        res.json(result);
    } catch (error) {
        logger.error('Podcast creation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ PUBLIC ROUTES ============

// Tüm sektörleri listele (Public)
router.get('/', setCacheHeaders(600), redisCache('sectors:all', 3600), optionalAuth, sectorController.getAllSectors);

// Kullanıcı istatistikleri (Auth required) - /stats must come before /:id
router.get('/stats', authenticate, sectorController.getUserSectorStats);

// ============ USER SECTOR MANAGEMENT (YENİ) ============

const sectorService = require('../services/sectorService');

// Kullanıcının sektörlerini getir (pozisyon dahil)
router.get('/user-sectors', authenticate, async (req, res) => {
    try {
        const sectors = await sectorService.getAllUserSectorsWithPosition(req.user.id);
        res.json({ success: true, data: sectors });
    } catch (error) {
        logger.error('Error getting user sectors:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Kullanıcının ana sektörünü getir (pozisyon dahil)
router.get('/user-sectors/primary', authenticate, async (req, res) => {
    try {
        const sector = await sectorService.getUserSectorWithPosition(req.user.id);
        res.json({ success: true, data: sector });
    } catch (error) {
        logger.error('Error getting primary sector:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Yeni sektör ekle veya güncelle (pozisyon dahil)
router.post('/user-sectors', authenticate, async (req, res) => {
    try {
        const {
            sector_id,
            is_primary,
            job_position,
            job_position_en,
            years_experience,
            company_name,
            company_size
        } = req.body;

        if (!sector_id) {
            return res.status(400).json({ success: false, error: 'sector_id gerekli' });
        }

        const result = await sectorService.setUserSectorWithPosition(req.user.id, sector_id, {
            isPrimary: is_primary,
            jobPosition: job_position,
            jobPositionEn: job_position_en,
            yearsExperience: years_experience,
            companyName: company_name,
            companySize: company_size
        });

        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error setting user sector:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Sektör pozisyonunu güncelle
router.put('/user-sectors/:sectorId', authenticate, async (req, res) => {
    try {
        const { sectorId } = req.params;
        const {
            job_position,
            job_position_en,
            years_experience,
            company_name,
            company_size
        } = req.body;

        const result = await sectorService.updateUserSectorPosition(req.user.id, parseInt(sectorId), {
            jobPosition: job_position,
            jobPositionEn: job_position_en,
            yearsExperience: years_experience,
            companyName: company_name,
            companySize: company_size
        });

        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error updating user sector position:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Sektör kaldır
router.delete('/user-sectors/:sectorId', authenticate, async (req, res) => {
    try {
        const { sectorId } = req.params;
        await sectorService.removeUserSector(req.user.id, parseInt(sectorId));
        res.json({ success: true, message: 'Sektör kaldırıldı' });
    } catch (error) {
        logger.error('Error removing user sector:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Sektör için pozisyon şablonlarını getir
router.get('/position-templates/:sectorId', async (req, res) => {
    try {
        const { sectorId } = req.params;
        const templates = await sectorService.getPositionTemplates(parseInt(sectorId));
        res.json({ success: true, data: templates });
    } catch (error) {
        logger.error('Error getting position templates:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ CONTENT ROUTES ============
// ⚠️ Bu route'lar da /:id'den önce gelmeli

// İçerik detayı (Public - doğrudan contentId ile erişim için)
router.get('/content/:contentId', optionalAuth, sectorController.getContentById);

// İçerik için TTS ses oluştur/getir (on-demand)
router.post('/content/:contentId/audio', optionalAuth, sectorController.generateContentAudio);

// İçerik ilerleme durumu (Auth required)
router.get('/content/:contentId/progress', authenticate, sectorController.getContentProgress);
router.post('/content/:contentId/progress', authenticate, sectorController.updateContentProgress);

// ============ VOCABULARY ROUTES ============

// Kelimeyi SRS tekrar listesine ekle (Auth required)
router.post('/vocabulary/:wordId/add-to-review', authenticate, sectorController.addVocabularyToReview);

// ============ RECOMMENDATION SYSTEM (Faz 3) ============

let sectorRecommendationService;
try {
    sectorRecommendationService = require('../services/sectorRecommendationService');
} catch (e) {
    logger.warn('[SECTOR-ROUTES] SectorRecommendationService not available: ' + e.message);
}

// Kişiselleştirilmiş içerik önerileri
router.get('/:sectorId/recommendations', authenticate, async (req, res) => {
    try {
        if (!sectorRecommendationService) {
            return res.status(500).json({ success: false, error: 'Recommendation service unavailable' });
        }
        const { sectorId } = req.params;
        const { limit, types } = req.query;

        const recommendations = await sectorRecommendationService.getRecommendations(
            req.user.id,
            parseInt(sectorId),
            {
                limit: parseInt(limit) || 5,
                contentTypes: types ? types.split(',') : null
            }
        );

        res.json({ success: true, data: recommendations });
    } catch (error) {
        logger.error('[SECTOR-ROUTES] Error getting recommendations:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Şimdi çalış - en uygun içerik
router.get('/:sectorId/next-best', authenticate, async (req, res) => {
    try {
        if (!sectorRecommendationService) {
            return res.status(500).json({ success: false, error: 'Recommendation service unavailable' });
        }
        const { sectorId } = req.params;

        const nextBest = await sectorRecommendationService.getNextBestContent(
            req.user.id,
            parseInt(sectorId)
        );

        res.json({ success: true, data: nextBest });
    } catch (error) {
        logger.error('[SECTOR-ROUTES] Error getting next best content:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Öğrenme yolu önerileri
router.get('/:sectorId/learning-path', authenticate, async (req, res) => {
    try {
        if (!sectorRecommendationService) {
            return res.status(500).json({ success: false, error: 'Recommendation service unavailable' });
        }
        const { sectorId } = req.params;
        const { maxSteps } = req.query;

        const path = await sectorRecommendationService.getLearningPath(
            req.user.id,
            parseInt(sectorId),
            { maxSteps: parseInt(maxSteps) || 5 }
        );

        res.json({ success: true, data: path });
    } catch (error) {
        logger.error('[SECTOR-ROUTES] Error getting learning path:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Kelime önerileri (review/new/mixed)
router.get('/:sectorId/vocabulary-recommendations', authenticate, async (req, res) => {
    try {
        if (!sectorRecommendationService) {
            return res.status(500).json({ success: false, error: 'Recommendation service unavailable' });
        }
        const { sectorId } = req.params;
        const { limit, mode } = req.query;

        const vocabRecs = await sectorRecommendationService.getVocabularyRecommendations(
            req.user.id,
            parseInt(sectorId),
            {
                limit: parseInt(limit) || 10,
                mode: mode || 'mixed'
            }
        );

        res.json({ success: true, data: vocabRecs });
    } catch (error) {
        logger.error('[SECTOR-ROUTES] Error getting vocabulary recommendations:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Günlük özet
router.get('/:sectorId/daily-summary', authenticate, async (req, res) => {
    try {
        if (!sectorRecommendationService) {
            return res.status(500).json({ success: false, error: 'Recommendation service unavailable' });
        }
        const { sectorId } = req.params;

        const summary = await sectorRecommendationService.getDailySummary(
            req.user.id,
            parseInt(sectorId)
        );

        res.json({ success: true, data: summary });
    } catch (error) {
        logger.error('[SECTOR-ROUTES] Error getting daily summary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Context-aware vocabulary injection
router.get('/:sectorId/content/:contentId/vocabulary-injection', authenticate, async (req, res) => {
    try {
        if (!sectorRecommendationService) {
            return res.status(500).json({ success: false, error: 'Recommendation service unavailable' });
        }
        const { sectorId, contentId } = req.params;

        const injection = await sectorRecommendationService.getVocabularyInjection(
            req.user.id,
            parseInt(sectorId),
            parseInt(contentId)
        );

        res.json({ success: true, data: injection });
    } catch (error) {
        logger.error('[SECTOR-ROUTES] Error getting vocabulary injection:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ GAMIFICATION INTEGRATION (YENİ) ============

let sectorGamificationService;
try {
    sectorGamificationService = require('../services/sectorGamificationService');
} catch (e) {
    logger.warn('[SECTOR-ROUTES] SectorGamificationService not available: ' + e.message);
}

// Sektör ilerleme özeti (Dashboard için)
router.get('/:sectorId/gamification/progress', authenticate, async (req, res) => {
    try {
        if (!sectorGamificationService) {
            return res.status(500).json({ success: false, error: 'Gamification service unavailable' });
        }
        const { sectorId } = req.params;
        const progress = await sectorGamificationService.getSectorProgressSummary(req.user.id, parseInt(sectorId));
        res.json({ success: true, data: progress });
    } catch (error) {
        logger.error('Error getting sector progress:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Tüm sektör istatistikleri
router.get('/gamification/all-stats', authenticate, async (req, res) => {
    try {
        if (!sectorGamificationService) {
            return res.status(500).json({ success: false, error: 'Gamification service unavailable' });
        }
        const stats = await sectorGamificationService.getAllSectorStats(req.user.id);
        res.json({ success: true, data: stats });
    } catch (error) {
        logger.error('Error getting all sector stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Sektör aktivitesi kaydet ve XP kazan
router.post('/:sectorId/gamification/activity', authenticate, async (req, res) => {
    try {
        if (!sectorGamificationService) {
            return res.status(500).json({ success: false, error: 'Gamification service unavailable' });
        }
        const { sectorId } = req.params;
        const { activityType, sourceId, metadata } = req.body;

        if (!activityType) {
            return res.status(400).json({ success: false, error: 'activityType gerekli' });
        }

        const result = await sectorGamificationService.addSectorXP(
            req.user.id,
            activityType,
            parseInt(sectorId),
            sourceId,
            metadata || {}
        );
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error recording sector activity:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Sektör günlük görevlerini oluştur
router.post('/:sectorId/gamification/daily-quests', authenticate, async (req, res) => {
    try {
        if (!sectorGamificationService) {
            return res.status(500).json({ success: false, error: 'Gamification service unavailable' });
        }
        const { sectorId } = req.params;
        const { count } = req.body;

        const quests = await sectorGamificationService.generateSectorDailyQuests(
            req.user.id,
            parseInt(sectorId),
            count || 2
        );
        res.json({ success: true, data: quests });
    } catch (error) {
        logger.error('Error generating sector daily quests:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bugün tekrar edilecek kelimeler (Context-Aware SRS)
router.get('/:sectorId/vocabulary/review-today', authenticate, async (req, res) => {
    try {
        if (!sectorGamificationService) {
            return res.status(500).json({ success: false, error: 'Gamification service unavailable' });
        }
        const { sectorId } = req.params;
        const { limit } = req.query;

        const words = await sectorGamificationService.getTodayReviewWords(
            req.user.id,
            parseInt(sectorId),
            parseInt(limit) || 10
        );
        res.json({ success: true, data: words });
    } catch (error) {
        logger.error('Error getting review words:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// İçerik için vocabulary injection context
router.get('/:sectorId/vocabulary/injection-context', authenticate, async (req, res) => {
    try {
        if (!sectorGamificationService) {
            return res.status(500).json({ success: false, error: 'Gamification service unavailable' });
        }
        const { sectorId } = req.params;

        const context = await sectorGamificationService.getVocabularyInjectionContext(
            req.user.id,
            parseInt(sectorId)
        );
        res.json({ success: true, data: context });
    } catch (error) {
        logger.error('Error getting vocabulary injection context:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ SECTOR CHALLENGE SYSTEM (Faz 5) ============

let sectorChallengeService;
try {
    sectorChallengeService = require('../services/sectorChallengeService');
} catch (e) {
    logger.warn('[SECTOR-ROUTES] SectorChallengeService not available: ' + e.message);
}

// Aktif sektör challenge'larını listele
router.get('/:sectorId/challenges', authenticate, async (req, res) => {
    try {
        if (!sectorChallengeService) {
            return res.status(500).json({ success: false, error: 'Challenge service unavailable' });
        }
        const { sectorId } = req.params;
        const { includeJoined } = req.query;

        const challenges = await sectorChallengeService.getActiveSectorChallenges(
            parseInt(sectorId),
            req.user.id,
            includeJoined === 'true'
        );

        res.json({ success: true, data: challenges });
    } catch (error) {
        logger.error('Error getting sector challenges:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Challenge detayı
router.get('/:sectorId/challenges/:challengeId', authenticate, async (req, res) => {
    try {
        if (!sectorChallengeService) {
            return res.status(500).json({ success: false, error: 'Challenge service unavailable' });
        }
        const { challengeId } = req.params;

        const challenge = await sectorChallengeService.getChallengeDetails(
            parseInt(challengeId),
            req.user.id
        );

        if (!challenge) {
            return res.status(404).json({ success: false, error: 'Challenge bulunamadı' });
        }

        res.json({ success: true, data: challenge });
    } catch (error) {
        logger.error('Error getting challenge details:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Kullanıcının challenge ilerlemesi
router.get('/:sectorId/challenges/:challengeId/progress', authenticate, async (req, res) => {
    try {
        if (!sectorChallengeService) {
            return res.status(500).json({ success: false, error: 'Challenge service unavailable' });
        }
        const { challengeId } = req.params;

        const progress = await sectorChallengeService.getUserChallengeProgress(
            parseInt(challengeId),
            req.user.id
        );

        res.json({ success: true, data: progress });
    } catch (error) {
        logger.error('Error getting challenge progress:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Challenge'a katıl
router.post('/:sectorId/challenges/:challengeId/join', authenticate, async (req, res) => {
    try {
        if (!sectorChallengeService) {
            return res.status(500).json({ success: false, error: 'Challenge service unavailable' });
        }
        const { challengeId } = req.params;

        const result = await sectorChallengeService.joinChallenge(
            parseInt(challengeId),
            req.user.id
        );

        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error joining challenge:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Challenge ilerlemesini güncelle
router.put('/:sectorId/challenges/:challengeId/progress', authenticate, async (req, res) => {
    try {
        if (!sectorChallengeService) {
            return res.status(500).json({ success: false, error: 'Challenge service unavailable' });
        }
        const { challengeId } = req.params;
        const { incrementBy } = req.body;

        const result = await sectorChallengeService.updateProgress(
            parseInt(challengeId),
            req.user.id,
            incrementBy || 1
        );

        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error updating challenge progress:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Challenge leaderboard
router.get('/:sectorId/challenges/:challengeId/leaderboard', authenticate, async (req, res) => {
    try {
        if (!sectorChallengeService) {
            return res.status(500).json({ success: false, error: 'Challenge service unavailable' });
        }
        const { challengeId } = req.params;
        const { limit } = req.query;

        const leaderboard = await sectorChallengeService.getLeaderboard(
            parseInt(challengeId),
            parseInt(limit) || 10
        );

        // Kullanıcının sıralaması
        const userRank = await sectorChallengeService.getUserRank(
            parseInt(challengeId),
            req.user.id
        );

        res.json({
            success: true,
            data: {
                leaderboard,
                userRank
            }
        });
    } catch (error) {
        logger.error('Error getting challenge leaderboard:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Kullanıcının challenge istatistikleri
router.get('/:sectorId/challenge-stats', authenticate, async (req, res) => {
    try {
        if (!sectorChallengeService) {
            return res.status(500).json({ success: false, error: 'Challenge service unavailable' });
        }
        const { sectorId } = req.params;

        const stats = await sectorChallengeService.getChallengeStats(
            req.user.id,
            parseInt(sectorId)
        );

        res.json({ success: true, data: stats });
    } catch (error) {
        logger.error('Error getting challenge stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ DYNAMIC SECTOR ROUTES ============
// ⚠️ Dinamik /:id route'ları en sonda olmalı!

// Tek sektör detayı (Public)
router.get('/:id', optionalAuth, sectorController.getSectorById);

// Sektör içerikleri (Public)
router.get('/:id/content', optionalAuth, sectorController.getSectorContent);

// Sektör terminolojisi (Public)
router.get('/:id/vocabulary', optionalAuth, sectorController.getSectorVocabulary);

// Sektör ilerleme durumu (Auth required)
router.get('/:id/progress', authenticate, sectorController.getSectorProgress);

// Sektör için toplu TTS oluştur (Admin - requires auth)
router.post('/:id/generate-audio', authenticate, sectorController.generateSectorAudio);

module.exports = router;



