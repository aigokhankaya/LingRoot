/**
 * 🏆 Sector Challenge Service
 *
 * Sektör bazlı haftalık challenge sistemi.
 * - Haftalık sektör challenge'ları oluşturma
 * - Challenge ilerleme takibi
 * - Leaderboard yönetimi
 * - Ödül dağıtımı
 *
 * @author Senior Architect
 * @created 2026-01-24
 */

const db = require('../config/db');
const logger = require('../utils/common/logger.js');
const gamificationService = require('./gamificationService');

// Challenge türleri ve hedefleri
const CHALLENGE_TEMPLATES = {
    vocabulary_master: {
        title_tr: 'Kelime Ustası',
        title_en: 'Vocabulary Master',
        description_tr: 'Bu hafta {target} sektör kelimesi öğren',
        description_en: 'Learn {target} sector words this week',
        task_type: 'sector_vocab_learn',
        icon: '📚',
        difficulty: 'medium',
        base_target: 30,
        base_xp: 200,
        bonus_xp: 100
    },
    content_champion: {
        title_tr: 'İçerik Şampiyonu',
        title_en: 'Content Champion',
        description_tr: 'Bu hafta {target} sektör içeriği tamamla',
        description_en: 'Complete {target} sector contents this week',
        task_type: 'sector_content_complete',
        icon: '🎯',
        difficulty: 'medium',
        base_target: 10,
        base_xp: 300,
        bonus_xp: 150
    },
    roleplay_expert: {
        title_tr: 'Roleplay Uzmanı',
        title_en: 'Roleplay Expert',
        description_tr: 'Bu hafta {target} iş diyaloğu tamamla',
        description_en: 'Complete {target} business dialogues this week',
        task_type: 'sector_roleplay_complete',
        icon: '🎭',
        difficulty: 'hard',
        base_target: 5,
        base_xp: 400,
        bonus_xp: 200
    },
    podcast_listener: {
        title_tr: 'Podcast Dinleyicisi',
        title_en: 'Podcast Listener',
        description_tr: 'Bu hafta {target} sektör podcast\'i dinle',
        description_en: 'Listen to {target} sector podcasts this week',
        task_type: 'sector_podcast_complete',
        icon: '🎙️',
        difficulty: 'easy',
        base_target: 5,
        base_xp: 250,
        bonus_xp: 100
    },
    streak_warrior: {
        title_tr: 'Seri Savaşçısı',
        title_en: 'Streak Warrior',
        description_tr: 'Bu hafta {target} gün üst üste sektör çalış',
        description_en: 'Study sector content for {target} consecutive days',
        task_type: 'sector_streak_days',
        icon: '🔥',
        difficulty: 'hard',
        base_target: 7,
        base_xp: 500,
        bonus_xp: 250
    },
    quiz_master: {
        title_tr: 'Quiz Ustası',
        title_en: 'Quiz Master',
        description_tr: 'Bu hafta sektör quizlerinde %{target} doğruluk oranı yakala',
        description_en: 'Achieve {target}% accuracy in sector quizzes this week',
        task_type: 'sector_quiz_accuracy',
        icon: '🧠',
        difficulty: 'hard',
        base_target: 85,
        base_xp: 350,
        bonus_xp: 175
    }
};

// Leaderboard pozisyon ödülleri
const LEADERBOARD_REWARDS = {
    1: { xp: 1000, badge: 'gold_champion', title: 'Altın Şampiyon' },
    2: { xp: 750, badge: 'silver_champion', title: 'Gümüş Şampiyon' },
    3: { xp: 500, badge: 'bronze_champion', title: 'Bronz Şampiyon' },
    top10: { xp: 250, badge: 'top_performer', title: 'Top 10' },
    top25: { xp: 100, badge: null, title: 'Top 25' }
};

class SectorChallengeService {

    /**
     * Sektör için aktif challenge'ları getir
     */
    async getActiveSectorChallenges(sectorId) {
        try {
            const result = await db.query(`
                SELECT
                    sc.*,
                    (SELECT COUNT(*) FROM sector_challenge_participants WHERE challenge_id = sc.id) as participant_count
                FROM sector_challenges sc
                WHERE sc.sector_id = $1
                    AND sc.status = 'active'
                    AND sc.end_date > NOW()
                ORDER BY sc.end_date ASC
            `, [sectorId]);

            return result.rows;
        } catch (error) {
            logger.error('[SectorChallenge] getActiveSectorChallenges failed:', error);
            return [];
        }
    }

    /**
     * Kullanıcının sektör challenge ilerlemesini getir
     */
    async getUserChallengeProgress(userId, sectorId, challengeId = null) {
        try {
            let query = `
                SELECT
                    scp.*,
                    sc.title_tr,
                    sc.title_en,
                    sc.description_tr,
                    sc.description_en,
                    sc.challenge_type,
                    sc.target_value,
                    sc.xp_reward,
                    sc.bonus_xp,
                    sc.icon,
                    sc.difficulty,
                    sc.start_date,
                    sc.end_date,
                    ROUND((scp.current_progress::float / sc.target_value) * 100) as progress_percentage
                FROM sector_challenge_participants scp
                JOIN sector_challenges sc ON scp.challenge_id = sc.id
                WHERE scp.user_id = $1
                    AND sc.sector_id = $2
                    AND sc.status = 'active'
            `;

            const params = [userId, sectorId];

            if (challengeId) {
                query += ' AND scp.challenge_id = $3';
                params.push(challengeId);
            }

            query += ' ORDER BY sc.end_date ASC';

            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            logger.error('[SectorChallenge] getUserChallengeProgress failed:', error);
            return [];
        }
    }

    /**
     * Challenge'a katıl
     */
    async joinChallenge(userId, challengeId) {
        try {
            // Zaten katılmış mı?
            const existing = await db.query(`
                SELECT 1 FROM sector_challenge_participants
                WHERE user_id = $1 AND challenge_id = $2
            `, [userId, challengeId]);

            if (existing.rows.length > 0) {
                return { success: false, message: 'Bu challenge\'a zaten katıldınız' };
            }

            // Challenge aktif mi?
            const challenge = await db.query(`
                SELECT * FROM sector_challenges
                WHERE id = $1 AND status = 'active' AND end_date > NOW()
            `, [challengeId]);

            if (challenge.rows.length === 0) {
                return { success: false, message: 'Challenge bulunamadı veya süresi dolmuş' };
            }

            // Katıl
            await db.query(`
                INSERT INTO sector_challenge_participants
                (user_id, challenge_id, current_progress, joined_at)
                VALUES ($1, $2, 0, NOW())
            `, [userId, challengeId]);

            logger.info(`[SectorChallenge] User ${userId} joined challenge ${challengeId}`);

            return {
                success: true,
                message: 'Challenge\'a başarıyla katıldınız!',
                challenge: challenge.rows[0]
            };
        } catch (error) {
            logger.error('[SectorChallenge] joinChallenge failed:', error);
            return { success: false, message: 'Katılım sırasında hata oluştu' };
        }
    }

    /**
     * Challenge ilerlemesini güncelle
     */
    async updateProgress(userId, sectorId, taskType, incrementAmount = 1) {
        try {
            // Kullanıcının bu sektördeki aktif challenge'larını bul
            const challenges = await db.query(`
                SELECT scp.*, sc.target_value, sc.xp_reward, sc.bonus_xp, sc.challenge_type
                FROM sector_challenge_participants scp
                JOIN sector_challenges sc ON scp.challenge_id = sc.id
                WHERE scp.user_id = $1
                    AND sc.sector_id = $2
                    AND sc.status = 'active'
                    AND sc.end_date > NOW()
                    AND scp.completed_at IS NULL
                    AND sc.challenge_type = $3
            `, [userId, sectorId, taskType]);

            const completedChallenges = [];

            for (const challenge of challenges.rows) {
                const newProgress = Math.min(
                    challenge.current_progress + incrementAmount,
                    challenge.target_value
                );

                const isCompleted = newProgress >= challenge.target_value;

                await db.query(`
                    UPDATE sector_challenge_participants
                    SET current_progress = $1,
                        completed_at = $2,
                        updated_at = NOW()
                    WHERE user_id = $3 AND challenge_id = $4
                `, [
                    newProgress,
                    isCompleted ? new Date() : null,
                    userId,
                    challenge.challenge_id
                ]);

                if (isCompleted) {
                    // XP ödülü ver
                    const totalXP = challenge.xp_reward + (challenge.bonus_xp || 0);
                    await gamificationService.addXP(
                        userId,
                        totalXP,
                        'challenge',
                        challenge.challenge_id,
                        `Sector Challenge: ${challenge.challenge_type}`
                    );

                    completedChallenges.push({
                        challengeId: challenge.challenge_id,
                        xpEarned: totalXP
                    });

                    logger.info(`[SectorChallenge] User ${userId} completed challenge ${challenge.challenge_id}`);
                }
            }

            return { updated: challenges.rows.length, completed: completedChallenges };
        } catch (error) {
            logger.error('[SectorChallenge] updateProgress failed:', error);
            return { updated: 0, completed: [] };
        }
    }

    /**
     * Sektör challenge leaderboard'ını getir
     */
    async getLeaderboard(challengeId, limit = 50) {
        try {
            const result = await db.query(`
                SELECT
                    scp.user_id,
                    scp.current_progress,
                    scp.completed_at,
                    u.name as user_name,
                    u.avatar_url,
                    gp.current_level,
                    RANK() OVER (ORDER BY scp.current_progress DESC, scp.completed_at ASC NULLS LAST) as rank
                FROM sector_challenge_participants scp
                JOIN users u ON scp.user_id = u.id
                LEFT JOIN gamification_profiles gp ON gp.user_id = scp.user_id
                WHERE scp.challenge_id = $1
                ORDER BY rank
                LIMIT $2
            `, [challengeId, limit]);

            return result.rows;
        } catch (error) {
            logger.error('[SectorChallenge] getLeaderboard failed:', error);
            return [];
        }
    }

    /**
     * Kullanıcının leaderboard pozisyonunu getir
     */
    async getUserRank(userId, challengeId) {
        try {
            const result = await db.query(`
                WITH ranked AS (
                    SELECT
                        user_id,
                        current_progress,
                        RANK() OVER (ORDER BY current_progress DESC, completed_at ASC NULLS LAST) as rank
                    FROM sector_challenge_participants
                    WHERE challenge_id = $1
                )
                SELECT rank, current_progress
                FROM ranked
                WHERE user_id = $2
            `, [challengeId, userId]);

            if (result.rows.length === 0) {
                return null;
            }

            // Toplam katılımcı sayısı
            const totalResult = await db.query(`
                SELECT COUNT(*) as total
                FROM sector_challenge_participants
                WHERE challenge_id = $1
            `, [challengeId]);

            return {
                rank: parseInt(result.rows[0].rank),
                progress: result.rows[0].current_progress,
                totalParticipants: parseInt(totalResult.rows[0].total)
            };
        } catch (error) {
            logger.error('[SectorChallenge] getUserRank failed:', error);
            return null;
        }
    }

    /**
     * Haftalık challenge oluştur
     */
    async createWeeklyChallenge(sectorId, templateKey, customOptions = {}) {
        try {
            const template = CHALLENGE_TEMPLATES[templateKey];
            if (!template) {
                throw new Error(`Unknown challenge template: ${templateKey}`);
            }

            // Hafta sonu tarihini hesapla (Pazar gece yarısı)
            const now = new Date();
            const endDate = new Date(now);
            endDate.setDate(now.getDate() + (7 - now.getDay()));
            endDate.setHours(23, 59, 59, 999);

            const target = customOptions.target || template.base_target;
            const xpReward = customOptions.xp || template.base_xp;
            const bonusXp = customOptions.bonus_xp || template.bonus_xp;

            const result = await db.query(`
                INSERT INTO sector_challenges (
                    sector_id,
                    challenge_type,
                    title_tr,
                    title_en,
                    description_tr,
                    description_en,
                    icon,
                    difficulty,
                    target_value,
                    xp_reward,
                    bonus_xp,
                    start_date,
                    end_date,
                    status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, 'active')
                RETURNING *
            `, [
                sectorId,
                template.task_type,
                template.title_tr,
                template.title_en,
                template.description_tr.replace('{target}', target),
                template.description_en.replace('{target}', target),
                template.icon,
                template.difficulty,
                target,
                xpReward,
                bonusXp,
                endDate
            ]);

            logger.info(`[SectorChallenge] Created weekly challenge for sector ${sectorId}: ${templateKey}`);

            return result.rows[0];
        } catch (error) {
            logger.error('[SectorChallenge] createWeeklyChallenge failed:', error);
            return null;
        }
    }

    /**
     * Süresi dolan challenge'ları sonlandır ve ödülleri dağıt
     */
    async processExpiredChallenges() {
        try {
            // Süresi dolmuş aktif challenge'ları bul
            const expired = await db.query(`
                SELECT * FROM sector_challenges
                WHERE status = 'active' AND end_date < NOW()
            `);

            for (const challenge of expired.rows) {
                // Leaderboard al ve ödülleri dağıt
                const leaderboard = await this.getLeaderboard(challenge.id, 25);

                for (const entry of leaderboard) {
                    let reward = null;

                    if (entry.rank === 1) reward = LEADERBOARD_REWARDS[1];
                    else if (entry.rank === 2) reward = LEADERBOARD_REWARDS[2];
                    else if (entry.rank === 3) reward = LEADERBOARD_REWARDS[3];
                    else if (entry.rank <= 10) reward = LEADERBOARD_REWARDS.top10;
                    else if (entry.rank <= 25) reward = LEADERBOARD_REWARDS.top25;

                    if (reward) {
                        // XP ödülü
                        await gamificationService.addXP(
                            entry.user_id,
                            reward.xp,
                            'challenge_leaderboard',
                            challenge.id,
                            `Leaderboard ${entry.rank}. sıra: ${reward.title}`
                        );

                        // Badge ödülü (varsa)
                        if (reward.badge) {
                            // Badge verme mantığı burada olacak
                        }
                    }
                }

                // Challenge'ı tamamlandı olarak işaretle
                await db.query(`
                    UPDATE sector_challenges
                    SET status = 'completed'
                    WHERE id = $1
                `, [challenge.id]);

                logger.info(`[SectorChallenge] Processed expired challenge ${challenge.id}`);
            }

            return expired.rows.length;
        } catch (error) {
            logger.error('[SectorChallenge] processExpiredChallenges failed:', error);
            return 0;
        }
    }

    /**
     * Sektör için otomatik haftalık challenge'lar oluştur
     */
    async generateWeeklyChallenges(sectorId) {
        try {
            // Rastgele 2-3 challenge seç
            const templateKeys = Object.keys(CHALLENGE_TEMPLATES);
            const shuffled = templateKeys.sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, 3);

            const challenges = [];
            for (const key of selected) {
                const challenge = await this.createWeeklyChallenge(sectorId, key);
                if (challenge) {
                    challenges.push(challenge);
                }
            }

            return challenges;
        } catch (error) {
            logger.error('[SectorChallenge] generateWeeklyChallenges failed:', error);
            return [];
        }
    }

    /**
     * Challenge özet istatistiklerini getir
     */
    async getChallengeStats(userId, sectorId) {
        try {
            const result = await db.query(`
                SELECT
                    COUNT(*) FILTER (WHERE scp.completed_at IS NOT NULL) as completed_challenges,
                    COUNT(*) as total_joined,
                    COALESCE(SUM(CASE WHEN scp.completed_at IS NOT NULL THEN sc.xp_reward + COALESCE(sc.bonus_xp, 0) ELSE 0 END), 0) as total_xp_earned,
                    MAX(CASE WHEN scp.completed_at IS NOT NULL THEN scp.completed_at END) as last_completed
                FROM sector_challenge_participants scp
                JOIN sector_challenges sc ON scp.challenge_id = sc.id
                WHERE scp.user_id = $1 AND sc.sector_id = $2
            `, [userId, sectorId]);

            // En iyi sıralama
            const bestRank = await db.query(`
                SELECT MIN(rank) as best_rank
                FROM (
                    SELECT
                        RANK() OVER (PARTITION BY scp.challenge_id ORDER BY scp.current_progress DESC) as rank
                    FROM sector_challenge_participants scp
                    JOIN sector_challenges sc ON scp.challenge_id = sc.id
                    WHERE sc.sector_id = $1
                ) ranked
                WHERE user_id = $2
            `, [sectorId, userId]);

            return {
                completedChallenges: parseInt(result.rows[0].completed_challenges) || 0,
                totalJoined: parseInt(result.rows[0].total_joined) || 0,
                totalXpEarned: parseInt(result.rows[0].total_xp_earned) || 0,
                lastCompleted: result.rows[0].last_completed,
                bestRank: bestRank.rows[0]?.best_rank || null
            };
        } catch (error) {
            logger.error('[SectorChallenge] getChallengeStats failed:', error);
            return {
                completedChallenges: 0,
                totalJoined: 0,
                totalXpEarned: 0,
                lastCompleted: null,
                bestRank: null
            };
        }
    }
}

module.exports = new SectorChallengeService();
