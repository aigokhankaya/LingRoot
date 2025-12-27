/**
 * 🎮 Gamification Routes
 * 
 * XP, Level, Streak, Achievements ve Onboarding API'ları
 */

const express = require('express');
const router = express.Router();
const gamificationService = require('../services/gamificationService');
const onboardingService = require('../services/onboardingService');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

// Tüm route'lar authentication gerektirir
router.use(authenticate);

// ============================================
// STATS & PROFILE
// ============================================

/**
 * GET /api/gamification/stats
 * Kullanıcının tam oyunlaştırma istatistiklerini getir
 */
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.id;
        const stats = await gamificationService.getFullStats(userId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('[Gamification API] Stats error:', error);
        res.status(500).json({ success: false, error: 'İstatistikler alınamadı' });
    }
});

/**
 * GET /api/gamification/profile
 * Basit profil bilgisi (header için)
 */
router.get('/profile', async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await gamificationService.getOrCreateProfile(userId);

        res.json({
            success: true,
            data: {
                level: profile.current_level,
                xp: profile.current_xp,
                xpForNext: gamificationService.getXPForNextLevel(profile.current_level),
                streak: profile.streak_count,
                archetype: profile.archetype,
                onboardingCompleted: profile.onboarding_completed
            }
        });
    } catch (error) {
        logger.error('[Gamification API] Profile error:', error);
        res.status(500).json({ success: false, error: 'Profil alınamadı' });
    }
});

// ============================================
// XP & LEVEL
// ============================================

/**
 * POST /api/gamification/xp
 * XP ekle (Internal/Admin kullanımı için)
 */
router.post('/xp', async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, source, sourceId, description } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Geçersiz XP miktarı' });
        }

        const result = await gamificationService.addXP(userId, amount, source, sourceId, description);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[Gamification API] XP error:', error);
        res.status(500).json({ success: false, error: 'XP eklenemedi' });
    }
});

// ============================================
// STREAK
// ============================================

/**
 * POST /api/gamification/streak/checkin
 * Günlük giriş kaydı (streak güncelleme)
 */
router.post('/streak/checkin', async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await gamificationService.updateStreak(userId);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[Gamification API] Streak checkin error:', error);
        res.status(500).json({ success: false, error: 'Streak güncellenemedi' });
    }
});

/**
 * POST /api/gamification/streak/freeze
 * Streak dondur
 */
router.post('/streak/freeze', async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await gamificationService.useStreakFreeze(userId);

        res.json(result);
    } catch (error) {
        logger.error('[Gamification API] Streak freeze error:', error);
        res.status(500).json({ success: false, error: 'Streak dondurulamadı' });
    }
});

// ============================================
// ACHIEVEMENTS
// ============================================

/**
 * GET /api/gamification/achievements
 * Tüm başarımları getir
 */
router.get('/achievements', async (req, res) => {
    try {
        const userId = req.user.id;
        const achievements = await gamificationService.getAchievements(userId);

        // Kategorize et
        const grouped = {
            earned: achievements.filter(a => a.is_earned),
            available: achievements.filter(a => !a.is_earned && !a.is_hidden),
            stats: {
                earned: achievements.filter(a => a.is_earned).length,
                total: achievements.length
            }
        };

        res.json({
            success: true,
            data: grouped
        });
    } catch (error) {
        logger.error('[Gamification API] Achievements error:', error);
        res.status(500).json({ success: false, error: 'Başarımlar alınamadı' });
    }
});

// ============================================
// DAILY QUESTS
// ============================================

/**
 * GET /api/gamification/daily-quests
 * Günlük görevleri getir
 */
router.get('/daily-quests', async (req, res) => {
    try {
        const userId = req.user.id;
        const quests = await gamificationService.getDailyQuests(userId);

        res.json({
            success: true,
            data: quests
        });
    } catch (error) {
        logger.error('[Gamification API] Daily quests error:', error);
        res.status(500).json({ success: false, error: 'Günlük görevler alınamadı' });
    }
});

/**
 * POST /api/gamification/daily-quests/:questId/claim
 * Günlük görev ödülünü al
 */
router.post('/daily-quests/:questId/claim', async (req, res) => {
    try {
        const userId = req.user.id;
        const { questId } = req.params;

        const result = await gamificationService.claimDailyQuest(userId, questId);

        res.json(result);
    } catch (error) {
        logger.error('[Gamification API] Claim quest error:', error);
        res.status(500).json({ success: false, error: 'Ödül alınamadı' });
    }
});

// ============================================
// ONBOARDING
// ============================================

/**
 * POST /api/gamification/onboarding/assess
 * Sohbetten seviye tahmin et
 */
router.post('/onboarding/assess', async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ success: false, error: 'Mesaj listesi gerekli' });
        }

        const result = await onboardingService.assessLevel(messages);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[Gamification API] Assess error:', error);
        res.status(500).json({ success: false, error: 'Seviye değerlendirilemedi' });
    }
});

/**
 * GET /api/gamification/onboarding/archetypes
 * Tüm arketipleri getir
 */
router.get('/onboarding/archetypes', async (req, res) => {
    try {
        const archetypes = ['career', 'travel', 'intellectual'].map(code =>
            onboardingService.getArchetypeDetails(code)
        );

        res.json({
            success: true,
            data: archetypes
        });
    } catch (error) {
        logger.error('[Gamification API] Archetypes error:', error);
        res.status(500).json({ success: false, error: 'Arketipler alınamadı' });
    }
});

/**
 * POST /api/gamification/onboarding/complete
 * Onboarding'i tamamla ve yol haritası oluştur
 */
router.post('/onboarding/complete', async (req, res) => {
    try {
        const userId = req.user.id;
        const { archetype, assessedCEFR, targetCEFR, weeklyMinutes } = req.body;

        if (!archetype || !assessedCEFR || !targetCEFR) {
            return res.status(400).json({
                success: false,
                error: 'archetype, assessedCEFR ve targetCEFR gerekli'
            });
        }

        const result = await onboardingService.completeOnboarding(userId, {
            archetype,
            assessedCEFR,
            targetCEFR,
            weeklyMinutes: weeklyMinutes || 120
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[Gamification API] Complete onboarding error:', error);
        res.status(500).json({ success: false, error: 'Onboarding tamamlanamadı' });
    }
});

// ============================================
// ROADMAP & QUESTS
// ============================================

/**
 * GET /api/gamification/roadmap
 * Kullanıcının yol haritasını getir
 */
router.get('/roadmap', async (req, res) => {
    try {
        const userId = req.user.id;
        const roadmap = await onboardingService.getUserRoadmap(userId);

        res.json({
            success: true,
            data: roadmap
        });
    } catch (error) {
        logger.error('[Gamification API] Roadmap error:', error);
        res.status(500).json({ success: false, error: 'Yol haritası alınamadı' });
    }
});

/**
 * POST /api/gamification/quests/:nodeId/complete
 * Görevi tamamla
 */
router.post('/quests/:nodeId/complete', async (req, res) => {
    try {
        const userId = req.user.id;
        const { nodeId } = req.params;
        const { score } = req.body;

        const result = await onboardingService.completeQuest(userId, parseInt(nodeId), score);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[Gamification API] Complete quest error:', error);
        res.status(500).json({ success: false, error: 'Görev tamamlanamadı' });
    }
});

/**
 * POST /api/gamification/quests/:nodeId/start
 * Görevi başlat
 */
router.post('/quests/:nodeId/start', async (req, res) => {
    try {
        const userId = req.user.id;
        const { nodeId } = req.params;

        await require('../config/db').query(`
            UPDATE user_quest_progress 
            SET status = 'in_progress', started_at = NOW()
            WHERE user_id = $1 AND node_id = $2 AND status = 'unlocked'
        `, [userId, parseInt(nodeId)]);

        res.json({
            success: true,
            message: 'Görev başlatıldı'
        });
    } catch (error) {
        logger.error('[Gamification API] Start quest error:', error);
        res.status(500).json({ success: false, error: 'Görev başlatılamadı' });
    }
});

module.exports = router;
