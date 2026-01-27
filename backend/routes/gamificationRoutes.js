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
const logger = require('../utils/common/logger.js');
const {
    gamificationLimiter,
    xpLimiter,
    questLimiter,
    dailyQuestClaimLimiter,
    streakLimiter,
    onboardingResetLimiter
} = require('../middleware/security');

// Tüm route'lar authentication gerektirir
router.use(authenticate);

// Genel gamification rate limit
router.use(gamificationLimiter);

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

// XP sabitleri - güvenlik için
const XP_LIMITS = {
    MAX_XP_PER_REQUEST: 500,        // Tek istekte max XP
    VALID_SOURCES: ['content', 'quiz', 'streak', 'word', 'daily_quest', 'quest', 'onboarding', 'achievement', 'sector'],
    MAX_DESCRIPTION_LENGTH: 200
};

/**
 * POST /api/gamification/xp
 * XP ekle (Internal/Admin kullanımı için)
 * Rate limited + validated
 */
router.post('/xp', xpLimiter, async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, source, sourceId, description } = req.body;

        // Validation: amount kontrolü
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Geçersiz XP miktarı' });
        }

        // Güvenlik: XP üst sınırı
        if (amount > XP_LIMITS.MAX_XP_PER_REQUEST) {
            logger.warn(`[Gamification API] XP limit exceeded attempt: user=${userId}, amount=${amount}`);
            return res.status(400).json({
                success: false,
                error: `Tek seferde maksimum ${XP_LIMITS.MAX_XP_PER_REQUEST} XP eklenebilir`
            });
        }

        // Validation: source kontrolü
        if (source && !XP_LIMITS.VALID_SOURCES.includes(source)) {
            return res.status(400).json({ success: false, error: 'Geçersiz XP kaynağı' });
        }

        // Validation: description uzunluğu
        if (description && description.length > XP_LIMITS.MAX_DESCRIPTION_LENGTH) {
            return res.status(400).json({ success: false, error: 'Açıklama çok uzun' });
        }

        const result = await gamificationService.addXP(userId, amount, source || 'manual', sourceId, description);

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
 * Rate limited
 */
router.post('/streak/checkin', streakLimiter, async (req, res) => {
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
 * Rate limited - abuse prevention
 */
router.post('/streak/freeze', streakLimiter, async (req, res) => {
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
 * Rate limited - claim spam prevention
 */
router.post('/daily-quests/:questId/claim', dailyQuestClaimLimiter, async (req, res) => {
    try {
        const userId = req.user.id;
        const { questId } = req.params;

        // Validation: questId format kontrolü
        if (!questId || questId.length > 50) {
            return res.status(400).json({ success: false, error: 'Geçersiz görev ID' });
        }

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
        const {
            archetype,
            assessedCEFR,
            targetCEFR,
            weeklyMinutes,
            sectors,          // Seçilen sektör ID'leri
            positionInfo,     // Pozisyon bilgisi (career arketipi için)
            sectorGoals       // Sektör hedefleri { vocabularyGoal, contentGoal, dailyMinutes }
        } = req.body;

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
            weeklyMinutes: weeklyMinutes || 120,
            sectors: sectors || [],
            positionInfo: positionInfo || null,
            sectorGoals: sectorGoals || null
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

/**
 * POST /api/gamification/onboarding/reset
 * Onboarding'i sıfırla - yol haritası ve ilerlemeyi temizle
 * Rate limited - günde max 3 reset (abuse prevention)
 */
router.post('/onboarding/reset', onboardingResetLimiter, async (req, res) => {
    try {
        const userId = req.user.id;
        const db = require('../config/db');

        logger.warn(`[Gamification API] Onboarding reset requested for user: ${userId}`);

        // 1. user_gamification tablosunu sıfırla
        await db.query(`
            UPDATE user_gamification 
            SET 
                onboarding_completed = false,
                current_level = 1,
                total_lifetime_xp = 0,
                current_xp = 0,
                streak_count = 0,
                longest_streak = 0,
                archetype = NULL,
                current_league = 'seed',
                updated_at = NOW()
            WHERE user_id = $1
        `, [userId]);

        // 2. user_quest_progress'i sil
        await db.query('DELETE FROM user_quest_progress WHERE user_id = $1', [userId]);

        // 3. daily_quests'i sil
        await db.query('DELETE FROM daily_quests WHERE user_id = $1', [userId]);

        // 4. user_achievements'ı sil
        await db.query('DELETE FROM user_achievements WHERE user_id = $1', [userId]);

        // 5. xp_transactions'ı sil
        await db.query('DELETE FROM xp_transactions WHERE user_id = $1', [userId]);

        // 6. user_sectors'u sil
        await db.query('DELETE FROM user_sectors WHERE user_id = $1', [userId]);

        // 7. weekly_scores'u sil
        await db.query('DELETE FROM weekly_scores WHERE user_id = $1', [userId]);

        logger.info(`[Gamification API] Onboarding reset completed for user: ${userId}`);

        res.json({
            success: true,
            message: 'Yol haritası ve ilerleme sıfırlandı. Onboarding\'i tekrar yapabilirsiniz.'
        });
    } catch (error) {
        logger.error('[Gamification API] Onboarding reset error:', error);
        res.status(500).json({ success: false, error: 'Onboarding sıfırlanamadı' });
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

        // Onboarding durumunu da kontrol et
        const profile = await gamificationService.getOrCreateProfile(userId);

        res.json({
            success: true,
            data: roadmap,
            onboardingCompleted: profile?.onboarding_completed || false
        });
    } catch (error) {
        logger.error('[Gamification API] Roadmap error:', error);
        res.status(500).json({ success: false, error: 'Yol haritası alınamadı' });
    }
});

// Geçerli quest tipleri - güvenlik için whitelist
const VALID_QUEST_TYPES = ['listen', 'vocabulary', 'quiz', 'reading', 'speaking', 'milestone', 'content'];

/**
 * POST /api/gamification/quests/auto-complete
 * Belirli tipteki aktif görevi otomatik tamamla
 * Rate limited + validated
 */
router.post('/quests/auto-complete', questLimiter, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, verificationData } = req.body;

        // Validation: type kontrolü
        if (!type) {
            return res.status(400).json({ success: false, error: 'Task type required' });
        }

        // Güvenlik: Sadece geçerli quest tipleri
        if (!VALID_QUEST_TYPES.includes(type)) {
            logger.warn(`[Gamification API] Invalid quest type attempt: user=${userId}, type=${type}`);
            return res.status(400).json({ success: false, error: 'Geçersiz görev tipi' });
        }

        // Log: Auto-complete audit trail
        logger.info(`[Gamification API] Quest auto-complete: user=${userId}, type=${type}`);

        const result = await onboardingService.completeActiveQuestByType(userId, type);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[Gamification API] Auto complete quest error:', error);
        res.status(500).json({ success: false, error: 'Otomatik tamamlama başarısız' });
    }
});

/**
 * POST /api/gamification/quests/:nodeId/complete
 * Görevi tamamla
 * Rate limited + validated
 */
router.post('/quests/:nodeId/complete', questLimiter, async (req, res) => {
    try {
        const userId = req.user.id;
        const { nodeId } = req.params;
        const { score } = req.body;

        // Validation: nodeId format kontrolü
        const parsedNodeId = parseInt(nodeId);
        if (isNaN(parsedNodeId) || parsedNodeId <= 0) {
            return res.status(400).json({ success: false, error: 'Geçersiz görev ID' });
        }

        // Validation: score kontrolü (opsiyonel ama varsa geçerli olmalı)
        if (score !== undefined && score !== null) {
            if (typeof score !== 'number' || score < 0 || score > 100) {
                return res.status(400).json({ success: false, error: 'Geçersiz skor (0-100 arası olmalı)' });
            }
        }

        // Log: Quest completion audit trail
        logger.info(`[Gamification API] Quest complete: user=${userId}, nodeId=${parsedNodeId}, score=${score}`);

        const result = await onboardingService.completeQuest(userId, parsedNodeId, score);

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
 * Rate limited
 */
router.post('/quests/:nodeId/start', questLimiter, async (req, res) => {
    try {
        const userId = req.user.id;
        const { nodeId } = req.params;

        // Validation: nodeId format kontrolü
        const parsedNodeId = parseInt(nodeId);
        if (isNaN(parsedNodeId) || parsedNodeId <= 0) {
            return res.status(400).json({ success: false, error: 'Geçersiz görev ID' });
        }

        await require('../config/db').query(`
            UPDATE user_quest_progress
            SET status = 'in_progress', started_at = NOW()
            WHERE user_id = $1 AND node_id = $2 AND status = 'unlocked'
        `, [userId, parsedNodeId]);

        res.json({
            success: true,
            message: 'Görev başlatıldı'
        });
    } catch (error) {
        logger.error('[Gamification API] Start quest error:', error);
        res.status(500).json({ success: false, error: 'Görev başlatılamadı' });
    }
});

// ============================================
// LEADERBOARD
// ============================================

/**
 * GET /api/gamification/leaderboard
 * Haftalık liderlik tablosunu getir
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 30;

        const result = await gamificationService.getLeaderboard(userId, limit);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[Gamification API] Leaderboard error:', error);
        res.status(500).json({ success: false, error: 'Leaderboard alınamadı' });
    }
});

/**
 * GET /api/gamification/leagues
 * Tüm ligleri getir
 */
router.get('/leagues', async (req, res) => {
    try {
        const leagues = await gamificationService.getLeagues();

        res.json({
            success: true,
            data: leagues
        });
    } catch (error) {
        logger.error('[Gamification API] Leagues error:', error);
        res.status(500).json({ success: false, error: 'Ligler alınamadı' });
    }
});

/**
 * GET /api/gamification/my-league
 * Kullanıcının mevcut ligini getir
 */
router.get('/my-league', async (req, res) => {
    try {
        const userId = req.user.id;
        const league = await gamificationService.getUserLeague(userId);

        res.json({
            success: true,
            data: league
        });
    } catch (error) {
        logger.error('[Gamification API] My league error:', error);
        res.status(500).json({ success: false, error: 'Lig bilgisi alınamadı' });
    }
});

// ============================================
// WEEKLY CHALLENGES
// ============================================

/**
 * GET /api/gamification/challenges
 * Aktif haftalık challenge'ları getir
 */
router.get('/challenges', async (req, res) => {
    try {
        const userId = req.user.id;
        const challenges = await gamificationService.getActiveChallenges();
        const userProgress = await gamificationService.getUserChallengeProgress(userId);

        // Challenge'lara kullanıcı ilerlemesini ekle
        const challengesWithProgress = challenges.map(challenge => {
            const progress = userProgress.find(p => p.challenge_id === challenge.id);
            return {
                ...challenge,
                joined: !!progress,
                progress: progress || null
            };
        });

        res.json({
            success: true,
            data: challengesWithProgress
        });
    } catch (error) {
        logger.error('[Gamification API] Challenges error:', error);
        res.status(500).json({ success: false, error: 'Challenge\'lar alınamadı' });
    }
});

/**
 * POST /api/gamification/challenges/:id/join
 * Challenge'a katıl
 */
router.post('/challenges/:id/join', async (req, res) => {
    try {
        const userId = req.user.id;
        const challengeId = parseInt(req.params.id);

        const result = await gamificationService.joinChallenge(userId, challengeId);

        res.json(result);
    } catch (error) {
        logger.error('[Gamification API] Join challenge error:', error);
        res.status(500).json({ success: false, error: 'Challenge\'a katılınamadı' });
    }
});

/**
 * GET /api/gamification/challenges/my-progress
 * Kullanıcının tüm challenge ilerlemesini getir
 */
router.get('/challenges/my-progress', async (req, res) => {
    try {
        const userId = req.user.id;
        const progress = await gamificationService.getUserChallengeProgress(userId);

        res.json({
            success: true,
            data: progress
        });
    } catch (error) {
        logger.error('[Gamification API] Challenge progress error:', error);
        res.status(500).json({ success: false, error: 'İlerleme alınamadı' });
    }
});

// ============================================
// STREAK SOCIETY
// ============================================

/**
 * GET /api/gamification/streak-society
 * Streak Society bilgisini getir
 */
router.get('/streak-society', async (req, res) => {
    try {
        const userId = req.user.id;
        const society = await gamificationService.getStreakSociety(userId);

        res.json({
            success: true,
            data: society
        });
    } catch (error) {
        logger.error('[Gamification API] Streak society error:', error);
        res.status(500).json({ success: false, error: 'Streak Society bilgisi alınamadı' });
    }
});

module.exports = router;

