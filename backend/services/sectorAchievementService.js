/**
 * 🏆 Sector Achievement Service
 *
 * Genişletilmiş sektör achievement sistemi.
 * Games, Challenges, Podcasts, Roleplay için özel başarımlar.
 *
 * @author Senior Architect
 * @created 2026-01-24
 */

const db = require('../config/db');
const logger = require('../utils/common/logger.js');
const gamificationService = require('./gamificationService');

// ============================================
// ACHIEVEMENT DEFINITIONS
// ============================================

const SECTOR_ACHIEVEMENTS = {
    // ========== VOCABULARY GAME ACHIEVEMENTS ==========
    VOCAB_GAME_FIRST: {
        code: 'VOCAB_GAME_FIRST',
        title_tr: 'Oyuncu Ruhu',
        title_en: 'Gamer Spirit',
        description_tr: 'İlk kelime oyununu tamamla',
        description_en: 'Complete your first vocabulary game',
        icon_emoji: '🎮',
        xp_reward: 50,
        rarity: 'common',
        category: 'game'
    },
    VOCAB_GAME_10: {
        code: 'VOCAB_GAME_10',
        title_tr: 'Oyun Meraklısı',
        title_en: 'Game Enthusiast',
        description_tr: '10 kelime oyunu tamamla',
        description_en: 'Complete 10 vocabulary games',
        icon_emoji: '🕹️',
        xp_reward: 100,
        rarity: 'common',
        category: 'game'
    },
    VOCAB_GAME_50: {
        code: 'VOCAB_GAME_50',
        title_tr: 'Oyun Ustası',
        title_en: 'Game Master',
        description_tr: '50 kelime oyunu tamamla',
        description_en: 'Complete 50 vocabulary games',
        icon_emoji: '🎯',
        xp_reward: 250,
        rarity: 'rare',
        category: 'game'
    },
    FLASHCARD_STREAK_10: {
        code: 'FLASHCARD_STREAK_10',
        title_tr: 'Kart Sihirbazı',
        title_en: 'Card Wizard',
        description_tr: 'Flashcard oyununda 10 seri doğru yap',
        description_en: 'Get 10 correct streak in flashcard game',
        icon_emoji: '🃏',
        xp_reward: 75,
        rarity: 'common',
        category: 'game'
    },
    MATCHING_PERFECT: {
        code: 'MATCHING_PERFECT',
        title_tr: 'Mükemmel Eşleşme',
        title_en: 'Perfect Match',
        description_tr: 'Eşleştirme oyununda hatasız tamamla',
        description_en: 'Complete matching game without mistakes',
        icon_emoji: '💯',
        xp_reward: 100,
        rarity: 'rare',
        category: 'game'
    },
    FILLBLANK_MASTER: {
        code: 'FILLBLANK_MASTER',
        title_tr: 'Cümle Ustası',
        title_en: 'Sentence Master',
        description_tr: 'Boşluk doldurma oyununda 5 kez %100 yap',
        description_en: 'Get 100% in fill-in-blank game 5 times',
        icon_emoji: '✍️',
        xp_reward: 150,
        rarity: 'rare',
        category: 'game'
    },

    // ========== CHALLENGE ACHIEVEMENTS ==========
    CHALLENGE_FIRST: {
        code: 'CHALLENGE_FIRST',
        title_tr: 'Meydan Okuyucu',
        title_en: 'Challenger',
        description_tr: 'İlk challenge\'a katıl',
        description_en: 'Join your first challenge',
        icon_emoji: '⚔️',
        xp_reward: 50,
        rarity: 'common',
        category: 'challenge'
    },
    CHALLENGE_COMPLETE_FIRST: {
        code: 'CHALLENGE_COMPLETE_FIRST',
        title_tr: 'Hedef Vurdu',
        title_en: 'Target Hit',
        description_tr: 'İlk challenge\'ı tamamla',
        description_en: 'Complete your first challenge',
        icon_emoji: '🎯',
        xp_reward: 100,
        rarity: 'common',
        category: 'challenge'
    },
    CHALLENGE_TOP3: {
        code: 'CHALLENGE_TOP3',
        title_tr: 'Podyuma Çık',
        title_en: 'Podium Finish',
        description_tr: 'Bir challenge\'da ilk 3\'e gir',
        description_en: 'Finish in top 3 of a challenge',
        icon_emoji: '🥉',
        xp_reward: 200,
        rarity: 'rare',
        category: 'challenge'
    },
    CHALLENGE_CHAMPION: {
        code: 'CHALLENGE_CHAMPION',
        title_tr: 'Şampiyon',
        title_en: 'Champion',
        description_tr: 'Bir challenge\'da birinci ol',
        description_en: 'Win a challenge',
        icon_emoji: '🏆',
        xp_reward: 500,
        rarity: 'epic',
        category: 'challenge'
    },
    CHALLENGE_5_COMPLETE: {
        code: 'CHALLENGE_5_COMPLETE',
        title_tr: 'Challenge Uzmanı',
        title_en: 'Challenge Expert',
        description_tr: '5 challenge tamamla',
        description_en: 'Complete 5 challenges',
        icon_emoji: '🎖️',
        xp_reward: 300,
        rarity: 'rare',
        category: 'challenge'
    },
    CHALLENGE_DOMINATOR: {
        code: 'CHALLENGE_DOMINATOR',
        title_tr: 'Dominant Güç',
        title_en: 'Dominator',
        description_tr: '3 challenge\'da üst üste birinci ol',
        description_en: 'Win 3 challenges in a row',
        icon_emoji: '👑',
        xp_reward: 1000,
        rarity: 'legendary',
        category: 'challenge'
    },

    // ========== ROLEPLAY ACHIEVEMENTS ==========
    ROLEPLAY_PRACTICE_FIRST: {
        code: 'ROLEPLAY_PRACTICE_FIRST',
        title_tr: 'Sahne Alıcı',
        title_en: 'Stage Taker',
        description_tr: 'İlk roleplay pratiğini yap',
        description_en: 'Complete your first roleplay practice',
        icon_emoji: '🎭',
        xp_reward: 75,
        rarity: 'common',
        category: 'roleplay'
    },
    ROLEPLAY_ALL_MODES: {
        code: 'ROLEPLAY_ALL_MODES',
        title_tr: 'Çok Yönlü',
        title_en: 'Versatile',
        description_tr: 'Tüm roleplay modlarını dene (Listen, Practice, Shadow)',
        description_en: 'Try all roleplay modes',
        icon_emoji: '🌟',
        xp_reward: 100,
        rarity: 'common',
        category: 'roleplay'
    },
    ROLEPLAY_SHADOW_10: {
        code: 'ROLEPLAY_SHADOW_10',
        title_tr: 'Gölge Takipçisi',
        title_en: 'Shadow Follower',
        description_tr: '10 shadow roleplay tamamla',
        description_en: 'Complete 10 shadow roleplay sessions',
        icon_emoji: '🌑',
        xp_reward: 200,
        rarity: 'rare',
        category: 'roleplay'
    },
    ROLEPLAY_MASTER: {
        code: 'ROLEPLAY_MASTER',
        title_tr: 'Sahne Ustası',
        title_en: 'Stage Master',
        description_tr: '25 roleplay tamamla',
        description_en: 'Complete 25 roleplay sessions',
        icon_emoji: '🎬',
        xp_reward: 400,
        rarity: 'epic',
        category: 'roleplay'
    },

    // ========== PODCAST ACHIEVEMENTS ==========
    PODCAST_FIRST: {
        code: 'PODCAST_FIRST',
        title_tr: 'Dinleyici',
        title_en: 'Listener',
        description_tr: 'İlk podcast\'i tamamla',
        description_en: 'Complete your first podcast',
        icon_emoji: '🎧',
        xp_reward: 50,
        rarity: 'common',
        category: 'podcast'
    },
    PODCAST_FULL_LISTEN: {
        code: 'PODCAST_FULL_LISTEN',
        title_tr: 'Sabırlı Dinleyici',
        title_en: 'Patient Listener',
        description_tr: 'Bir podcast\'i %100 dinle',
        description_en: 'Listen to a podcast 100%',
        icon_emoji: '👂',
        xp_reward: 75,
        rarity: 'common',
        category: 'podcast'
    },
    PODCAST_QUIZ_ACE: {
        code: 'PODCAST_QUIZ_ACE',
        title_tr: 'Anlama Ustası',
        title_en: 'Comprehension Ace',
        description_tr: 'Podcast anlama sorularında %100 yap',
        description_en: 'Get 100% on podcast comprehension questions',
        icon_emoji: '🧠',
        xp_reward: 150,
        rarity: 'rare',
        category: 'podcast'
    },
    PODCAST_BINGER: {
        code: 'PODCAST_BINGER',
        title_tr: 'Podcast Tutkunu',
        title_en: 'Podcast Binger',
        description_tr: 'Bir günde 5 podcast dinle',
        description_en: 'Listen to 5 podcasts in one day',
        icon_emoji: '🎙️',
        xp_reward: 200,
        rarity: 'rare',
        category: 'podcast'
    },
    PODCAST_MARATHON: {
        code: 'PODCAST_MARATHON',
        title_tr: 'Podcast Maratoncusu',
        title_en: 'Podcast Marathon',
        description_tr: '50 podcast tamamla',
        description_en: 'Complete 50 podcasts',
        icon_emoji: '🏃',
        xp_reward: 500,
        rarity: 'epic',
        category: 'podcast'
    },

    // ========== SECTOR MASTERY ACHIEVEMENTS ==========
    SECTOR_EXPLORER: {
        code: 'SECTOR_EXPLORER',
        title_tr: 'Sektör Kaşifi',
        title_en: 'Sector Explorer',
        description_tr: 'Bir sektörde tüm içerik türlerini dene',
        description_en: 'Try all content types in a sector',
        icon_emoji: '🧭',
        xp_reward: 150,
        rarity: 'rare',
        category: 'mastery'
    },
    SECTOR_SPECIALIST: {
        code: 'SECTOR_SPECIALIST',
        title_tr: 'Sektör Uzmanı',
        title_en: 'Sector Specialist',
        description_tr: 'Bir sektörde 500+ kelime öğren',
        description_en: 'Learn 500+ words in a sector',
        icon_emoji: '🎓',
        xp_reward: 500,
        rarity: 'epic',
        category: 'mastery'
    },
    SECTOR_MASTER: {
        code: 'SECTOR_MASTER',
        title_tr: 'Sektör Ustası',
        title_en: 'Sector Master',
        description_tr: 'Bir sektördeki tüm modülleri tamamla',
        description_en: 'Complete all modules in a sector',
        icon_emoji: '🏅',
        xp_reward: 1000,
        rarity: 'legendary',
        category: 'mastery'
    },
    MULTI_SECTOR: {
        code: 'MULTI_SECTOR',
        title_tr: 'Çok Sektörlü',
        title_en: 'Multi-Sector',
        description_tr: '3 farklı sektörde aktif ol',
        description_en: 'Be active in 3 different sectors',
        icon_emoji: '🌐',
        xp_reward: 300,
        rarity: 'rare',
        category: 'mastery'
    },

    // ========== SPECIAL ACHIEVEMENTS ==========
    EARLY_BIRD: {
        code: 'EARLY_BIRD',
        title_tr: 'Erken Kuş',
        title_en: 'Early Bird',
        description_tr: 'Sabah 6-8 arası çalışma yap',
        description_en: 'Study between 6-8 AM',
        icon_emoji: '🌅',
        xp_reward: 75,
        rarity: 'common',
        category: 'special'
    },
    NIGHT_OWL: {
        code: 'NIGHT_OWL',
        title_tr: 'Gece Kuşu',
        title_en: 'Night Owl',
        description_tr: 'Gece 11-1 arası çalışma yap',
        description_en: 'Study between 11 PM - 1 AM',
        icon_emoji: '🦉',
        xp_reward: 75,
        rarity: 'common',
        category: 'special'
    },
    WEEKEND_WARRIOR: {
        code: 'WEEKEND_WARRIOR',
        title_tr: 'Hafta Sonu Savaşçısı',
        title_en: 'Weekend Warrior',
        description_tr: 'Hafta sonu 3+ saat çalış',
        description_en: 'Study 3+ hours on weekend',
        icon_emoji: '⚔️',
        xp_reward: 150,
        rarity: 'rare',
        category: 'special'
    },
    COMEBACK_KID: {
        code: 'COMEBACK_KID',
        title_tr: 'Geri Dönen',
        title_en: 'Comeback Kid',
        description_tr: '7 gün ara verdikten sonra geri dön',
        description_en: 'Return after 7 days break',
        icon_emoji: '🔙',
        xp_reward: 100,
        rarity: 'common',
        category: 'special'
    },
    PERFECTIONIST: {
        code: 'PERFECTIONIST',
        title_tr: 'Mükemmeliyetçi',
        title_en: 'Perfectionist',
        description_tr: 'Bir günde 5 kez %100 skor al',
        description_en: 'Get 100% score 5 times in one day',
        icon_emoji: '✨',
        xp_reward: 300,
        rarity: 'epic',
        category: 'special'
    },
    UNSTOPPABLE: {
        code: 'UNSTOPPABLE',
        title_tr: 'Durdurulamaz',
        title_en: 'Unstoppable',
        description_tr: '30 gün üst üste sektör çalış',
        description_en: '30 day sector study streak',
        icon_emoji: '🔥',
        xp_reward: 750,
        rarity: 'legendary',
        category: 'special'
    }
};

class SectorAchievementService {
    constructor() {
        this.achievements = SECTOR_ACHIEVEMENTS;
    }

    /**
     * Achievement tanımını getir
     */
    getAchievementDefinition(code) {
        return this.achievements[code] || null;
    }

    /**
     * Kategoriye göre achievement'ları getir
     */
    getAchievementsByCategory(category) {
        return Object.values(this.achievements).filter(a => a.category === category);
    }

    /**
     * Tüm achievement tanımlarını getir
     */
    getAllAchievementDefinitions() {
        return Object.values(this.achievements);
    }

    // ============================================
    // GAME ACHIEVEMENT CHECKS
    // ============================================

    /**
     * Kelime oyunu achievement kontrolü
     */
    async checkGameAchievements(userId, gameType, gameStats) {
        const earned = [];

        try {
            // İlk oyun
            const first = await gamificationService.awardAchievement(userId, 'VOCAB_GAME_FIRST');
            if (first) earned.push(first);

            // Oyun sayısını kontrol et
            const countResult = await db.query(`
                SELECT COUNT(*) as count FROM user_game_history
                WHERE user_id = $1
            `, [userId]);
            const gameCount = parseInt(countResult.rows[0]?.count || 0);

            if (gameCount >= 10) {
                const a = await gamificationService.awardAchievement(userId, 'VOCAB_GAME_10');
                if (a) earned.push(a);
            }
            if (gameCount >= 50) {
                const a = await gamificationService.awardAchievement(userId, 'VOCAB_GAME_50');
                if (a) earned.push(a);
            }

            // Flashcard streak
            if (gameType === 'flashcard' && gameStats.streak >= 10) {
                const a = await gamificationService.awardAchievement(userId, 'FLASHCARD_STREAK_10');
                if (a) earned.push(a);
            }

            // Matching perfect
            if (gameType === 'matching' && gameStats.mistakes === 0) {
                const a = await gamificationService.awardAchievement(userId, 'MATCHING_PERFECT');
                if (a) earned.push(a);
            }

            // Fill blank perfect count
            if (gameType === 'fillblank' && gameStats.score === 100) {
                const perfectCount = await this.getPerfectFillBlankCount(userId);
                if (perfectCount >= 5) {
                    const a = await gamificationService.awardAchievement(userId, 'FILLBLANK_MASTER');
                    if (a) earned.push(a);
                }
            }

        } catch (error) {
            logger.error('[SectorAchievement] checkGameAchievements error:', error);
        }

        return earned;
    }

    async getPerfectFillBlankCount(userId) {
        try {
            const result = await db.query(`
                SELECT COUNT(*) as count FROM user_game_history
                WHERE user_id = $1 AND game_type = 'fillblank' AND score = 100
            `, [userId]);
            return parseInt(result.rows[0]?.count || 0);
        } catch (e) {
            return 0;
        }
    }

    // ============================================
    // CHALLENGE ACHIEVEMENT CHECKS
    // ============================================

    /**
     * Challenge achievement kontrolü
     */
    async checkChallengeAchievements(userId, challengeResult) {
        const earned = [];

        try {
            // İlk katılım
            const first = await gamificationService.awardAchievement(userId, 'CHALLENGE_FIRST');
            if (first) earned.push(first);

            // Tamamlama
            if (challengeResult.completed) {
                const complete = await gamificationService.awardAchievement(userId, 'CHALLENGE_COMPLETE_FIRST');
                if (complete) earned.push(complete);

                // Tamamlama sayısı
                const completedCount = await this.getChallengeCompletedCount(userId);
                if (completedCount >= 5) {
                    const a = await gamificationService.awardAchievement(userId, 'CHALLENGE_5_COMPLETE');
                    if (a) earned.push(a);
                }
            }

            // Sıralama bazlı
            if (challengeResult.rank) {
                if (challengeResult.rank <= 3) {
                    const top3 = await gamificationService.awardAchievement(userId, 'CHALLENGE_TOP3');
                    if (top3) earned.push(top3);
                }
                if (challengeResult.rank === 1) {
                    const champ = await gamificationService.awardAchievement(userId, 'CHALLENGE_CHAMPION');
                    if (champ) earned.push(champ);

                    // Dominator kontrolü
                    const consecutiveWins = await this.getConsecutiveChallengeWins(userId);
                    if (consecutiveWins >= 3) {
                        const dom = await gamificationService.awardAchievement(userId, 'CHALLENGE_DOMINATOR');
                        if (dom) earned.push(dom);
                    }
                }
            }

        } catch (error) {
            logger.error('[SectorAchievement] checkChallengeAchievements error:', error);
        }

        return earned;
    }

    async getChallengeCompletedCount(userId) {
        try {
            const result = await db.query(`
                SELECT COUNT(*) as count FROM sector_challenge_participants
                WHERE user_id = $1 AND is_completed = true
            `, [userId]);
            return parseInt(result.rows[0]?.count || 0);
        } catch (e) {
            return 0;
        }
    }

    async getConsecutiveChallengeWins(userId) {
        try {
            const result = await db.query(`
                SELECT is_winner FROM sector_challenge_participants
                WHERE user_id = $1 AND is_completed = true
                ORDER BY completed_at DESC
                LIMIT 5
            `, [userId]);

            let consecutive = 0;
            for (const row of result.rows) {
                if (row.is_winner) {
                    consecutive++;
                } else {
                    break;
                }
            }
            return consecutive;
        } catch (e) {
            return 0;
        }
    }

    // ============================================
    // ROLEPLAY ACHIEVEMENT CHECKS
    // ============================================

    /**
     * Roleplay achievement kontrolü
     */
    async checkRoleplayAchievements(userId, roleplayStats) {
        const earned = [];

        try {
            // İlk pratik
            const first = await gamificationService.awardAchievement(userId, 'ROLEPLAY_PRACTICE_FIRST');
            if (first) earned.push(first);

            // Mod bazlı kontrol
            const modesUsed = await this.getRoleplayModesUsed(userId);
            if (modesUsed.size >= 3) {
                const a = await gamificationService.awardAchievement(userId, 'ROLEPLAY_ALL_MODES');
                if (a) earned.push(a);
            }

            // Shadow mode count
            const shadowCount = await this.getRoleplayShadowCount(userId);
            if (shadowCount >= 10) {
                const a = await gamificationService.awardAchievement(userId, 'ROLEPLAY_SHADOW_10');
                if (a) earned.push(a);
            }

            // Toplam roleplay
            const totalCount = await this.getRoleplayTotalCount(userId);
            if (totalCount >= 25) {
                const a = await gamificationService.awardAchievement(userId, 'ROLEPLAY_MASTER');
                if (a) earned.push(a);
            }

        } catch (error) {
            logger.error('[SectorAchievement] checkRoleplayAchievements error:', error);
        }

        return earned;
    }

    async getRoleplayModesUsed(userId) {
        try {
            const result = await db.query(`
                SELECT DISTINCT play_mode FROM user_roleplay_history
                WHERE user_id = $1
            `, [userId]);
            return new Set(result.rows.map(r => r.play_mode));
        } catch (e) {
            return new Set();
        }
    }

    async getRoleplayShadowCount(userId) {
        try {
            const result = await db.query(`
                SELECT COUNT(*) as count FROM user_roleplay_history
                WHERE user_id = $1 AND play_mode = 'shadow'
            `, [userId]);
            return parseInt(result.rows[0]?.count || 0);
        } catch (e) {
            return 0;
        }
    }

    async getRoleplayTotalCount(userId) {
        try {
            const result = await db.query(`
                SELECT COUNT(*) as count FROM user_roleplay_history
                WHERE user_id = $1
            `, [userId]);
            return parseInt(result.rows[0]?.count || 0);
        } catch (e) {
            return 0;
        }
    }

    // ============================================
    // PODCAST ACHIEVEMENT CHECKS
    // ============================================

    /**
     * Podcast achievement kontrolü
     */
    async checkPodcastAchievements(userId, podcastStats) {
        const earned = [];

        try {
            // İlk podcast
            const first = await gamificationService.awardAchievement(userId, 'PODCAST_FIRST');
            if (first) earned.push(first);

            // %100 dinleme
            if (podcastStats.listenedPercentage >= 100) {
                const a = await gamificationService.awardAchievement(userId, 'PODCAST_FULL_LISTEN');
                if (a) earned.push(a);
            }

            // Quiz ace
            if (podcastStats.questionsTotal > 0 &&
                podcastStats.questionsCorrect === podcastStats.questionsTotal) {
                const a = await gamificationService.awardAchievement(userId, 'PODCAST_QUIZ_ACE');
                if (a) earned.push(a);
            }

            // Günlük podcast sayısı
            const todayCount = await this.getTodayPodcastCount(userId);
            if (todayCount >= 5) {
                const a = await gamificationService.awardAchievement(userId, 'PODCAST_BINGER');
                if (a) earned.push(a);
            }

            // Toplam podcast
            const totalCount = await this.getPodcastTotalCount(userId);
            if (totalCount >= 50) {
                const a = await gamificationService.awardAchievement(userId, 'PODCAST_MARATHON');
                if (a) earned.push(a);
            }

        } catch (error) {
            logger.error('[SectorAchievement] checkPodcastAchievements error:', error);
        }

        return earned;
    }

    async getTodayPodcastCount(userId) {
        try {
            const result = await db.query(`
                SELECT COUNT(*) as count FROM user_podcast_history
                WHERE user_id = $1 AND DATE(completed_at) = CURRENT_DATE
            `, [userId]);
            return parseInt(result.rows[0]?.count || 0);
        } catch (e) {
            return 0;
        }
    }

    async getPodcastTotalCount(userId) {
        try {
            const result = await db.query(`
                SELECT COUNT(*) as count FROM user_podcast_history
                WHERE user_id = $1
            `, [userId]);
            return parseInt(result.rows[0]?.count || 0);
        } catch (e) {
            return 0;
        }
    }

    // ============================================
    // SPECIAL ACHIEVEMENT CHECKS
    // ============================================

    /**
     * Zaman bazlı achievement kontrolü
     */
    async checkTimeBasedAchievements(userId) {
        const earned = [];
        const now = new Date();
        const hour = now.getHours();

        try {
            // Early bird (6-8 AM)
            if (hour >= 6 && hour < 8) {
                const a = await gamificationService.awardAchievement(userId, 'EARLY_BIRD');
                if (a) earned.push(a);
            }

            // Night owl (23-01)
            if (hour >= 23 || hour < 1) {
                const a = await gamificationService.awardAchievement(userId, 'NIGHT_OWL');
                if (a) earned.push(a);
            }

            // Weekend warrior
            const day = now.getDay();
            if (day === 0 || day === 6) {
                const todayMinutes = await this.getTodayStudyMinutes(userId);
                if (todayMinutes >= 180) {
                    const a = await gamificationService.awardAchievement(userId, 'WEEKEND_WARRIOR');
                    if (a) earned.push(a);
                }
            }

        } catch (error) {
            logger.error('[SectorAchievement] checkTimeBasedAchievements error:', error);
        }

        return earned;
    }

    async getTodayStudyMinutes(userId) {
        try {
            const result = await db.query(`
                SELECT COALESCE(SUM(duration_minutes), 0) as total
                FROM user_study_sessions
                WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE
            `, [userId]);
            return parseInt(result.rows[0]?.total || 0);
        } catch (e) {
            return 0;
        }
    }

    /**
     * Sektör mastery kontrolü
     */
    async checkMasteryAchievements(userId, sectorId) {
        const earned = [];

        try {
            // Sector explorer - tüm içerik türlerini dene
            const contentTypes = await this.getSectorContentTypesUsed(userId, sectorId);
            if (contentTypes.size >= 5) { // article, dialogue, roleplay, podcast, quiz
                const a = await gamificationService.awardAchievement(userId, 'SECTOR_EXPLORER');
                if (a) earned.push(a);
            }

            // Sector specialist - 500+ kelime
            const vocabCount = await this.getSectorVocabularyCount(userId, sectorId);
            if (vocabCount >= 500) {
                const a = await gamificationService.awardAchievement(userId, 'SECTOR_SPECIALIST');
                if (a) earned.push(a);
            }

            // Multi sector
            const activeSectors = await this.getActiveSectorCount(userId);
            if (activeSectors >= 3) {
                const a = await gamificationService.awardAchievement(userId, 'MULTI_SECTOR');
                if (a) earned.push(a);
            }

        } catch (error) {
            logger.error('[SectorAchievement] checkMasteryAchievements error:', error);
        }

        return earned;
    }

    async getSectorContentTypesUsed(userId, sectorId) {
        try {
            const result = await db.query(`
                SELECT DISTINCT sc.content_type
                FROM user_sector_content_progress uscp
                JOIN sector_content sc ON sc.id = uscp.content_id
                WHERE uscp.user_id = $1 AND sc.sector_id = $2
            `, [userId, sectorId]);
            return new Set(result.rows.map(r => r.content_type));
        } catch (e) {
            return new Set();
        }
    }

    async getSectorVocabularyCount(userId, sectorId) {
        try {
            const result = await db.query(`
                SELECT COUNT(*) as count FROM user_sector_vocabulary
                WHERE user_id = $1 AND sector_id = $2 AND familiarity_level >= 3
            `, [userId, sectorId]);
            return parseInt(result.rows[0]?.count || 0);
        } catch (e) {
            return 0;
        }
    }

    async getActiveSectorCount(userId) {
        try {
            const result = await db.query(`
                SELECT COUNT(DISTINCT sector_id) as count FROM user_sectors
                WHERE user_id = $1
            `, [userId]);
            return parseInt(result.rows[0]?.count || 0);
        } catch (e) {
            return 0;
        }
    }

    // ============================================
    // UNIFIED CHECK
    // ============================================

    /**
     * Tüm ilgili achievement'ları kontrol et
     */
    async checkAllRelevantAchievements(userId, context) {
        const allEarned = [];

        try {
            // Game achievements
            if (context.gameType && context.gameStats) {
                const gameAchievements = await this.checkGameAchievements(userId, context.gameType, context.gameStats);
                allEarned.push(...gameAchievements);
            }

            // Challenge achievements
            if (context.challengeResult) {
                const challengeAchievements = await this.checkChallengeAchievements(userId, context.challengeResult);
                allEarned.push(...challengeAchievements);
            }

            // Roleplay achievements
            if (context.roleplayStats) {
                const roleplayAchievements = await this.checkRoleplayAchievements(userId, context.roleplayStats);
                allEarned.push(...roleplayAchievements);
            }

            // Podcast achievements
            if (context.podcastStats) {
                const podcastAchievements = await this.checkPodcastAchievements(userId, context.podcastStats);
                allEarned.push(...podcastAchievements);
            }

            // Time-based achievements
            const timeAchievements = await this.checkTimeBasedAchievements(userId);
            allEarned.push(...timeAchievements);

            // Mastery achievements
            if (context.sectorId) {
                const masteryAchievements = await this.checkMasteryAchievements(userId, context.sectorId);
                allEarned.push(...masteryAchievements);
            }

        } catch (error) {
            logger.error('[SectorAchievement] checkAllRelevantAchievements error:', error);
        }

        return allEarned;
    }
}

module.exports = new SectorAchievementService();
