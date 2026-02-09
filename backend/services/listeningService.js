/**
 * 🎧 Listening Service
 *
 * Dinleme kalitesi metrikleri, oturum yonetimi ve LQS hesaplama.
 * "Vanity metrics" yerine gercek dinleme kalitesini olcer.
 */

const db = require('../config/db');
const logger = require('../utils/common/logger.js');
const gamificationService = require('./gamificationService');

// LQS hesaplama sabitleri
const LQS_WEIGHTS = {
    ENGAGEMENT: 0.3,
    COMPREHENSION: 0.5,
    CONSISTENCY: 0.2
};

// XP hesaplama sabitleri
const XP_CONFIG = {
    BASE_PER_MINUTE: 10,
    MIN_MULTIPLIER: 0.5,  // LQS 0 ise 0.5x
    MAX_MULTIPLIER: 1.0,  // LQS 100 ise 1.0x
    COMPREHENSION_BONUS_THRESHOLD: 90, // %90 ustu anlama bonusu
    COMPREHENSION_BONUS_XP: 50,
    SPEED_BONUS_THRESHOLD: 1.1, // 1.1x ustu hiz bonusu
    SPEED_BONUS_XP: 25,
    WORD_TAP_BONUS_THRESHOLD: 5, // 5+ kelime tap bonusu
    WORD_TAP_BONUS_XP: 15
};

// Memory Palace room mapping
const PALACE_ROOMS = {
    encountered: 'dark_zone',       // Henuz kesfedilmemis
    familiar: 'witness_room',       // Duyunca taniyor (1-2 karsilasma)
    learning: 'learning_hall',      // SRS dongusunde (aktif ogrenme)
    known: 'knowledge_library',     // 3+ basarili tekrar
    mastered: 'golden_vault'        // Farkli context'lerde bilme
};

class ListeningService {
    constructor() {
        this.xpConfig = XP_CONFIG;
        this.lqsWeights = LQS_WEIGHTS;
    }

    // ============================================
    // SESSION MANAGEMENT
    // ============================================

    /**
     * Yeni dinleme oturumu baslat
     * @param {string} userId
     * @param {string} contentId
     * @param {string} contentType - 'podcast', 'article', 'book_chapter', 'document', 'youtube'
     * @param {number} contentDuration - Icerigin toplam suresi (saniye)
     * @returns {Promise<Object>} - Session bilgisi
     */
    async startSession(userId, contentId, contentType, contentDuration = null) {
        try {
            const result = await db.query(`
                INSERT INTO listening_sessions (
                    user_id, content_id, content_type, content_duration_seconds,
                    started_at, status
                )
                VALUES ($1, $2, $3, $4, NOW(), 'in_progress')
                RETURNING *
            `, [userId, contentId, contentType, contentDuration]);

            const session = result.rows[0];

            logger.info(`[Listening] Session started: user=${userId}, session=${session.id}, content=${contentType}`);

            return {
                sessionId: session.id,
                startedAt: session.started_at,
                contentId,
                contentType
            };
        } catch (error) {
            logger.error('[Listening] startSession failed:', error);
            throw error;
        }
    }

    /**
     * Oturuma event ekle
     * @param {string} sessionId
     * @param {string} eventType - 'pause', 'play', 'replay', 'word_tap', 'speed_change', 'subtitle_toggle', 'seek'
     * @param {Object} eventData - Event'e ozgu data
     * @returns {Promise<Object>} - Guncellenmis session
     */
    async addEvent(sessionId, eventType, eventData = {}) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Session'i kilitle ve al
            const sessionResult = await client.query(
                'SELECT * FROM listening_sessions WHERE id = $1 FOR UPDATE',
                [sessionId]
            );

            if (sessionResult.rows.length === 0) {
                await client.query('ROLLBACK');
                throw new Error('Session not found');
            }

            const session = sessionResult.rows[0];

            // Event objesi olustur
            const event = {
                type: eventType,
                time: eventData.currentTime || 0,
                timestamp: new Date().toISOString(),
                ...eventData
            };

            // Metric guncellemeleri
            const updates = {
                pause_count: session.pause_count,
                replay_count: session.replay_count,
                word_tap_count: session.word_tap_count,
                speed_change_count: session.speed_change_count,
                subtitle_toggle_count: session.subtitle_toggle_count,
                seek_count: session.seek_count || 0,
                playback_speed: session.playback_speed
            };

            switch (eventType) {
                case 'pause':
                    updates.pause_count += 1;
                    break;
                case 'replay':
                    updates.replay_count += 1;
                    break;
                case 'word_tap':
                    updates.word_tap_count += 1;
                    // Kelimeyi vocabulary tracking'e ekle
                    if (eventData.word) {
                        this.trackWordEncounter(session.user_id, eventData.word, session.content_id, session.content_type)
                            .catch(err => logger.warn('[Listening] Word tracking failed:', err.message));
                    }
                    break;
                case 'speed_change':
                    updates.speed_change_count += 1;
                    updates.playback_speed = eventData.newSpeed || session.playback_speed;
                    break;
                case 'subtitle_toggle':
                    updates.subtitle_toggle_count += 1;
                    break;
                case 'seek':
                    updates.seek_count += 1;
                    break;
            }

            // Events array'e ekle (max 100 event tutuyoruz)
            let events = session.events || [];
            events.push(event);
            if (events.length > 100) {
                events = events.slice(-100);
            }

            // Guncelle
            await client.query(`
                UPDATE listening_sessions
                SET
                    pause_count = $2,
                    replay_count = $3,
                    word_tap_count = $4,
                    speed_change_count = $5,
                    subtitle_toggle_count = $6,
                    seek_count = $7,
                    playback_speed = $8,
                    events = $9
                WHERE id = $1
            `, [
                sessionId,
                updates.pause_count,
                updates.replay_count,
                updates.word_tap_count,
                updates.speed_change_count,
                updates.subtitle_toggle_count,
                updates.seek_count,
                updates.playback_speed,
                JSON.stringify(events)
            ]);

            await client.query('COMMIT');

            return { success: true, eventType, eventCount: events.length };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('[Listening] addEvent failed:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Oturumu tamamla ve LQS hesapla
     * @param {string} sessionId
     * @param {number} comprehensionScore - Quiz sonucu (0-100)
     * @param {number} completionPercentage - Tamamlanma yuzdesi (0-100)
     * @returns {Promise<Object>} - Sonuc ve kazanilan XP
     */
    async completeSession(sessionId, comprehensionScore = null, completionPercentage = 100) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Session'i al
            const sessionResult = await client.query(
                'SELECT * FROM listening_sessions WHERE id = $1 FOR UPDATE',
                [sessionId]
            );

            if (sessionResult.rows.length === 0) {
                await client.query('ROLLBACK');
                throw new Error('Session not found');
            }

            const session = sessionResult.rows[0];

            // Sure hesapla
            const durationSeconds = Math.floor(
                (new Date() - new Date(session.started_at)) / 1000
            );

            // Engagement score hesapla
            const engagementScore = this.calculateEngagementScore(
                session.pause_count,
                session.replay_count,
                session.word_tap_count,
                session.speed_change_count,
                durationSeconds
            );

            // Streak factor al
            const profile = await gamificationService.getOrCreateProfile(session.user_id, client);
            const streakFactor = Math.min(1.0, (profile.streak_count || 0) / 30 + 0.5);

            // LQS hesapla
            const lqs = this.calculateLQS(
                engagementScore,
                comprehensionScore || 50, // Comprehension yoksa ortalama varsay
                streakFactor
            );

            // XP hesapla
            const durationMinutes = durationSeconds / 60;
            const baseXp = Math.floor(durationMinutes * XP_CONFIG.BASE_PER_MINUTE);
            const qualityMultiplier = XP_CONFIG.MIN_MULTIPLIER + (lqs / 200); // 0.5 - 1.0 arasi
            let finalXp = Math.floor(baseXp * qualityMultiplier);

            // Bonus XP'ler
            let bonuses = [];

            if (comprehensionScore && comprehensionScore >= XP_CONFIG.COMPREHENSION_BONUS_THRESHOLD) {
                finalXp += XP_CONFIG.COMPREHENSION_BONUS_XP;
                bonuses.push({ type: 'comprehension', xp: XP_CONFIG.COMPREHENSION_BONUS_XP });
            }

            if (session.playback_speed >= XP_CONFIG.SPEED_BONUS_THRESHOLD) {
                finalXp += XP_CONFIG.SPEED_BONUS_XP;
                bonuses.push({ type: 'speed', xp: XP_CONFIG.SPEED_BONUS_XP });
            }

            if (session.word_tap_count >= XP_CONFIG.WORD_TAP_BONUS_THRESHOLD) {
                finalXp += XP_CONFIG.WORD_TAP_BONUS_XP;
                bonuses.push({ type: 'word_discovery', xp: XP_CONFIG.WORD_TAP_BONUS_XP });
            }

            // Session'i guncelle
            await client.query(`
                UPDATE listening_sessions
                SET
                    ended_at = NOW(),
                    duration_seconds = $2,
                    completion_percentage = $3,
                    engagement_score = $4,
                    comprehension_score = $5,
                    listening_quality_score = $6,
                    base_xp_earned = $7,
                    quality_multiplier = $8,
                    final_xp_earned = $9,
                    status = 'completed'
                WHERE id = $1
            `, [
                sessionId,
                durationSeconds,
                completionPercentage,
                engagementScore,
                comprehensionScore,
                lqs,
                baseXp,
                qualityMultiplier,
                finalXp
            ]);

            await client.query('COMMIT');

            // User stats guncelle (non-blocking)
            this.updateUserListeningStats(session.user_id, {
                durationSeconds,
                lqs,
                engagementScore,
                comprehensionScore,
                wordTaps: session.word_tap_count,
                replays: session.replay_count,
                pauses: session.pause_count
            }).catch(err => logger.warn('[Listening] Stats update failed:', err.message));

            // XP ver (non-blocking)
            gamificationService.addXP(
                session.user_id,
                finalXp,
                'listening',
                sessionId,
                `Dinleme: ${Math.round(durationMinutes)} dk, LQS: ${lqs}`
            ).catch(err => logger.warn('[Listening] XP award failed:', err.message));

            // Daily quest ilerlemesi (non-blocking)
            gamificationService.updateDailyQuestProgress(session.user_id, 'listen_minutes', Math.floor(durationMinutes))
                .catch(() => { });

            // LQS dusukse uyari mesaji
            let warning = null;
            if (lqs < 30) {
                warning = 'Dinleme kaliteniz dusuk. Aktif dinlemeye odaklanmayi deneyin!';
            }

            // Achievement kontrol et (non-blocking)
            this.checkListeningAchievements(session.user_id, {
                lqs,
                comprehensionScore,
                playbackSpeed: session.playback_speed,
                wordTaps: session.word_tap_count,
                replays: session.replay_count
            }).catch(() => { });

            logger.info(`[Listening] Session completed: session=${sessionId}, LQS=${lqs}, XP=${finalXp}`);

            return {
                sessionId,
                durationSeconds,
                durationMinutes: Math.round(durationMinutes),
                completionPercentage,
                engagementScore,
                comprehensionScore,
                lqs,
                baseXp,
                qualityMultiplier: Math.round(qualityMultiplier * 100) / 100,
                finalXp,
                bonuses,
                warning
            };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('[Listening] completeSession failed:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Oturumu abandon et (tamamlanmadan cikis)
     */
    async abandonSession(sessionId) {
        try {
            const result = await db.query(`
                UPDATE listening_sessions
                SET status = 'abandoned', ended_at = NOW()
                WHERE id = $1 AND status = 'in_progress'
                RETURNING *
            `, [sessionId]);

            if (result.rows.length > 0) {
                logger.info(`[Listening] Session abandoned: session=${sessionId}`);
            }

            return { success: true };
        } catch (error) {
            logger.error('[Listening] abandonSession failed:', error);
            throw error;
        }
    }

    // ============================================
    // LQS CALCULATION
    // ============================================

    /**
     * Engagement score hesapla (0-100)
     * Aktif dinleme davranislarini olcer
     */
    calculateEngagementScore(pauseCount, replayCount, wordTapCount, speedChangeCount, durationSeconds) {
        const durationMinutes = Math.max(1, durationSeconds / 60);

        // Her metrik icin normalize edilmis skor (0-25 arasi)
        // Pause: dakika basina 0.5-2 pause ideal
        const pauseScore = Math.min(25, (pauseCount / durationMinutes) * 12.5);

        // Replay: Her replay degerli (max 5 per minute ideal)
        const replayScore = Math.min(25, replayCount * 5);

        // Word tap: Kelime arastirma
        const wordTapScore = Math.min(25, wordTapCount * 3);

        // Speed change: Adaptasyon gostergesi
        const speedScore = Math.min(25, speedChangeCount * 8);

        const rawScore = pauseScore + replayScore + wordTapScore + speedScore;
        return Math.min(100, Math.max(0, Math.round(rawScore)));
    }

    /**
     * LQS (Listening Quality Score) hesapla
     * LQS = (Engagement × 0.3) + (Comprehension × 0.5) + (Consistency × 0.2)
     */
    calculateLQS(engagementScore, comprehensionScore, streakFactor = 1.0) {
        const engagementComponent = (engagementScore || 50) * LQS_WEIGHTS.ENGAGEMENT;
        const comprehensionComponent = (comprehensionScore || 50) * LQS_WEIGHTS.COMPREHENSION;
        const consistencyComponent = (streakFactor * 100) * LQS_WEIGHTS.CONSISTENCY;

        const rawLQS = engagementComponent + comprehensionComponent + consistencyComponent;
        return Math.min(100, Math.max(0, Math.round(rawLQS)));
    }

    // ============================================
    // USER STATS
    // ============================================

    /**
     * Kullanicinin dinleme istatistiklerini guncelle
     */
    async updateUserListeningStats(userId, sessionData) {
        try {
            // Mevcut stats'i al veya olustur
            const existingResult = await db.query(
                'SELECT * FROM user_listening_stats WHERE user_id = $1',
                [userId]
            );

            if (existingResult.rows.length === 0) {
                // Olustur
                await db.query(`
                    INSERT INTO user_listening_stats (user_id)
                    VALUES ($1)
                    ON CONFLICT (user_id) DO NOTHING
                `, [userId]);
            }

            const isQualitySession = sessionData.lqs >= 60;

            // Stats guncelle
            await db.query(`
                UPDATE user_listening_stats
                SET
                    total_listening_seconds = total_listening_seconds + $2,
                    quality_listening_seconds = quality_listening_seconds + CASE WHEN $3 THEN $2 ELSE 0 END,
                    total_sessions = total_sessions + 1,
                    completed_sessions = completed_sessions + 1,
                    avg_engagement_score = (avg_engagement_score * total_sessions + $4) / (total_sessions + 1),
                    avg_comprehension_score = CASE
                        WHEN $5 IS NOT NULL THEN (avg_comprehension_score * total_sessions + $5) / (total_sessions + 1)
                        ELSE avg_comprehension_score
                    END,
                    avg_listening_quality_score = (avg_listening_quality_score * total_sessions + $6) / (total_sessions + 1),
                    total_pause_count = total_pause_count + $7,
                    total_replay_count = total_replay_count + $8,
                    total_word_taps = total_word_taps + $9
                WHERE user_id = $1
            `, [
                userId,
                sessionData.durationSeconds,
                isQualitySession,
                sessionData.engagementScore || 0,
                sessionData.comprehensionScore,
                sessionData.lqs,
                sessionData.pauses || 0,
                sessionData.replays || 0,
                sessionData.wordTaps || 0
            ]);

            // Gunluk trend guncelle
            await this.updateDailyTrend(userId, sessionData);

        } catch (error) {
            logger.error('[Listening] updateUserListeningStats failed:', error);
            // Hatayi yutuyoruz, kritik degil
        }
    }

    /**
     * Gunluk trend guncelle
     */
    async updateDailyTrend(userId, sessionData) {
        try {
            const today = new Date().toISOString().split('T')[0];

            // Mevcut trend'i al
            const result = await db.query(
                'SELECT daily_lqs_trend FROM user_listening_stats WHERE user_id = $1',
                [userId]
            );

            if (result.rows.length === 0) return;

            let trend = result.rows[0].daily_lqs_trend || [];

            // Bugunun verisini bul veya olustur
            const todayIndex = trend.findIndex(d => d.date === today);
            if (todayIndex >= 0) {
                // Guncelle (ortalama hesapla)
                const existing = trend[todayIndex];
                existing.sessions = (existing.sessions || 1) + 1;
                existing.avg_lqs = Math.round(
                    ((existing.avg_lqs * (existing.sessions - 1)) + sessionData.lqs) / existing.sessions
                );
                existing.minutes += Math.round(sessionData.durationSeconds / 60);
            } else {
                // Yeni gun ekle
                trend.push({
                    date: today,
                    avg_lqs: sessionData.lqs,
                    minutes: Math.round(sessionData.durationSeconds / 60),
                    sessions: 1
                });
            }

            // Son 30 gunu tut
            if (trend.length > 30) {
                trend = trend.slice(-30);
            }

            await db.query(
                'UPDATE user_listening_stats SET daily_lqs_trend = $1 WHERE user_id = $2',
                [JSON.stringify(trend), userId]
            );
        } catch (error) {
            logger.warn('[Listening] updateDailyTrend failed:', error.message);
        }
    }

    /**
     * Kullanicinin dinleme istatistiklerini getir
     */
    async getUserStats(userId) {
        try {
            // Stats
            const statsResult = await db.query(
                'SELECT * FROM user_listening_stats WHERE user_id = $1',
                [userId]
            );

            if (statsResult.rows.length === 0) {
                return {
                    totalListeningMinutes: 0,
                    qualityListeningMinutes: 0,
                    totalSessions: 0,
                    avgLQS: 0,
                    avgEngagement: 0,
                    avgComprehension: 0,
                    preferredSpeed: 1.0,
                    totalWordTaps: 0,
                    dailyTrend: [],
                    weeklyTrend: []
                };
            }

            const stats = statsResult.rows[0];

            return {
                totalListeningMinutes: Math.round(stats.total_listening_seconds / 60),
                qualityListeningMinutes: Math.round(stats.quality_listening_seconds / 60),
                totalSessions: stats.total_sessions,
                completedSessions: stats.completed_sessions,
                avgLQS: Math.round(stats.avg_listening_quality_score || 0),
                avgEngagement: Math.round(stats.avg_engagement_score || 0),
                avgComprehension: Math.round(stats.avg_comprehension_score || 0),
                preferredSpeed: stats.preferred_speed,
                maxSuccessfulSpeed: stats.max_successful_speed,
                totalWordTaps: stats.total_word_taps,
                totalReplays: stats.total_replay_count,
                estimatedListeningCEFR: stats.estimated_listening_cefr,
                dailyTrend: stats.daily_lqs_trend || [],
                weeklyTrend: stats.weekly_lqs_trend || []
            };
        } catch (error) {
            logger.error('[Listening] getUserStats failed:', error);
            throw error;
        }
    }

    /**
     * Son 7 veya 30 gunluk LQS trend'i getir
     */
    async getQualityTrend(userId, days = 7) {
        try {
            const result = await db.query(`
                SELECT
                    DATE(created_at) as date,
                    COUNT(*) as session_count,
                    ROUND(AVG(listening_quality_score), 1) as avg_lqs,
                    ROUND(AVG(engagement_score), 1) as avg_engagement,
                    ROUND(AVG(comprehension_score), 1) as avg_comprehension,
                    SUM(duration_seconds) as total_seconds
                FROM listening_sessions
                WHERE user_id = $1
                    AND status = 'completed'
                    AND created_at >= NOW() - INTERVAL '${days} days'
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `, [userId]);

            return {
                days,
                trend: result.rows.map(row => ({
                    date: row.date,
                    sessionCount: parseInt(row.session_count),
                    avgLQS: parseFloat(row.avg_lqs) || 0,
                    avgEngagement: parseFloat(row.avg_engagement) || 0,
                    avgComprehension: parseFloat(row.avg_comprehension) || 0,
                    minutes: Math.round(parseInt(row.total_seconds) / 60)
                }))
            };
        } catch (error) {
            logger.error('[Listening] getQualityTrend failed:', error);
            throw error;
        }
    }

    // ============================================
    // VOCABULARY TRACKING
    // ============================================

    /**
     * Kelime karsilasmasi kaydet (Memory Palace icin)
     */
    async trackWordEncounter(userId, word, contentId, contentType) {
        try {
            const normalizedWord = word.toLowerCase().trim();

            await db.query(`
                INSERT INTO vocabulary_mastery_extended (
                    user_id, word, status, palace_room,
                    encounter_count, unique_content_count, content_types_seen, content_ids_seen,
                    first_encountered_at, last_encountered_at
                )
                VALUES (
                    $1, $2, 'familiar', 'witness_room',
                    1, 1, ARRAY[$3]::TEXT[], ARRAY[$4]::UUID[],
                    NOW(), NOW()
                )
                ON CONFLICT (user_id, word)
                DO UPDATE SET
                    encounter_count = vocabulary_mastery_extended.encounter_count + 1,
                    unique_content_count = CASE
                        WHEN NOT ($4 = ANY(vocabulary_mastery_extended.content_ids_seen))
                        THEN vocabulary_mastery_extended.unique_content_count + 1
                        ELSE vocabulary_mastery_extended.unique_content_count
                    END,
                    content_types_seen = CASE
                        WHEN NOT ($3 = ANY(vocabulary_mastery_extended.content_types_seen))
                        THEN array_append(vocabulary_mastery_extended.content_types_seen, $3)
                        ELSE vocabulary_mastery_extended.content_types_seen
                    END,
                    content_ids_seen = CASE
                        WHEN NOT ($4 = ANY(vocabulary_mastery_extended.content_ids_seen))
                        THEN array_append(vocabulary_mastery_extended.content_ids_seen, $4)
                        ELSE vocabulary_mastery_extended.content_ids_seen
                    END,
                    last_encountered_at = NOW(),
                    -- Palace room'u unique content sayisina gore guncelle
                    palace_room = CASE
                        WHEN vocabulary_mastery_extended.status = 'mastered' THEN 'golden_vault'
                        WHEN vocabulary_mastery_extended.unique_content_count >= 3 THEN 'knowledge_library'
                        WHEN vocabulary_mastery_extended.encounter_count >= 5 THEN 'learning_hall'
                        ELSE 'witness_room'
                    END,
                    status = CASE
                        WHEN vocabulary_mastery_extended.status = 'mastered' THEN 'mastered'
                        WHEN vocabulary_mastery_extended.unique_content_count >= 3 THEN 'known'
                        WHEN vocabulary_mastery_extended.encounter_count >= 5 THEN 'learning'
                        ELSE 'familiar'
                    END
            `, [userId, normalizedWord, contentType, contentId]);

        } catch (error) {
            logger.warn('[Listening] trackWordEncounter failed:', error.message);
        }
    }

    /**
     * Memory Palace verisini getir
     */
    async getMemoryPalace(userId) {
        try {
            // Room summary
            const summaryResult = await db.query(`
                SELECT
                    palace_room,
                    COUNT(*) as word_count
                FROM vocabulary_mastery_extended
                WHERE user_id = $1
                GROUP BY palace_room
            `, [userId]);

            const roomCounts = {
                dark_zone: 0,
                witness_room: 0,
                learning_hall: 0,
                knowledge_library: 0,
                golden_vault: 0
            };

            summaryResult.rows.forEach(row => {
                roomCounts[row.palace_room] = parseInt(row.word_count);
            });

            // Review bekleyenler
            const dueResult = await db.query(`
                SELECT COUNT(*) as due_count
                FROM vocabulary_mastery_extended
                WHERE user_id = $1
                    AND next_review_date <= CURRENT_DATE
                    AND status IN ('learning', 'known')
            `, [userId]);

            // Son eklenen kelimeler
            const recentResult = await db.query(`
                SELECT word, status, palace_room, encounter_count, last_encountered_at
                FROM vocabulary_mastery_extended
                WHERE user_id = $1
                ORDER BY last_encountered_at DESC
                LIMIT 10
            `, [userId]);

            return {
                rooms: {
                    darkZone: {
                        name: 'Karanlik Bolge',
                        description: 'Henuz kesfetmedin',
                        count: roomCounts.dark_zone,
                        icon: '🌑',
                        estimatedTotal: 5000 // Varsayilan kelime havuzu
                    },
                    witnessRoom: {
                        name: 'Tanik Odasi',
                        description: 'Duyunca taniyorsun',
                        count: roomCounts.witness_room,
                        icon: '👁️'
                    },
                    learningHall: {
                        name: 'Ogrenim Salonu',
                        description: 'Aktif ogrenmede',
                        count: roomCounts.learning_hall,
                        icon: '📚',
                        dueForReview: parseInt(dueResult.rows[0]?.due_count || 0)
                    },
                    knowledgeLibrary: {
                        name: 'Bilgi Kutuphanesi',
                        description: '3+ basarili tekrar',
                        count: roomCounts.knowledge_library,
                        icon: '🏛️'
                    },
                    goldenVault: {
                        name: 'Altin Kasa',
                        description: 'Ustalasmis kelimeler',
                        count: roomCounts.golden_vault,
                        icon: '🏆'
                    }
                },
                totalWords: Object.values(roomCounts).reduce((a, b) => a + b, 0),
                recentWords: recentResult.rows.map(row => ({
                    word: row.word,
                    status: row.status,
                    room: row.palace_room,
                    encounters: row.encounter_count,
                    lastSeen: row.last_encountered_at
                }))
            };
        } catch (error) {
            logger.error('[Listening] getMemoryPalace failed:', error);
            throw error;
        }
    }

    /**
     * Bugun tekrar edilecek kelimeleri getir
     */
    async getDueReviews(userId, limit = 20) {
        try {
            const result = await db.query(`
                SELECT
                    id, word, status, palace_room,
                    encounter_count, recognition_rate,
                    srs_interval_days, srs_ease_factor,
                    last_review_result
                FROM vocabulary_mastery_extended
                WHERE user_id = $1
                    AND next_review_date <= CURRENT_DATE
                    AND status IN ('learning', 'known')
                ORDER BY next_review_date ASC, srs_ease_factor ASC
                LIMIT $2
            `, [userId, limit]);

            return result.rows;
        } catch (error) {
            logger.error('[Listening] getDueReviews failed:', error);
            throw error;
        }
    }

    /**
     * Kelime tekrar sonucunu kaydet (SRS)
     */
    async recordReviewResult(userId, word, result) {
        // result: 'again', 'hard', 'good', 'easy'
        const intervalMultipliers = {
            again: 0.5,
            hard: 0.8,
            good: 1.0,
            easy: 1.5
        };

        const easeAdjustments = {
            again: -0.2,
            hard: -0.1,
            good: 0,
            easy: 0.15
        };

        try {
            const current = await db.query(
                'SELECT * FROM vocabulary_mastery_extended WHERE user_id = $1 AND word = $2',
                [userId, word]
            );

            if (current.rows.length === 0) {
                throw new Error('Word not found');
            }

            const vocab = current.rows[0];
            let newInterval = Math.max(1, Math.round(vocab.srs_interval_days * intervalMultipliers[result]));
            let newEase = Math.max(1.3, Math.min(3.0, vocab.srs_ease_factor + easeAdjustments[result]));

            // Basarili ise interval arttir
            if (result === 'good' || result === 'easy') {
                newInterval = Math.round(newInterval * newEase);
            }

            // Recognition stats
            const newAttempts = vocab.recognition_attempts + 1;
            const newSuccesses = vocab.recognition_successes + (result !== 'again' ? 1 : 0);
            const recognitionRate = Math.round((newSuccesses / newAttempts) * 100);

            // Status ve room guncelle
            let newStatus = vocab.status;
            let newRoom = vocab.palace_room;

            if (recognitionRate >= 90 && newAttempts >= 5) {
                newStatus = 'mastered';
                newRoom = 'golden_vault';
            } else if (recognitionRate >= 70 && newAttempts >= 3) {
                newStatus = 'known';
                newRoom = 'knowledge_library';
            }

            await db.query(`
                UPDATE vocabulary_mastery_extended
                SET
                    srs_interval_days = $3,
                    srs_ease_factor = $4,
                    next_review_date = CURRENT_DATE + $3,
                    last_reviewed_at = NOW(),
                    last_review_result = $5,
                    recognition_attempts = $6,
                    recognition_successes = $7,
                    recognition_rate = $8,
                    status = $9,
                    palace_room = $10,
                    mastered_at = CASE WHEN $9 = 'mastered' AND mastered_at IS NULL THEN NOW() ELSE mastered_at END
                WHERE user_id = $1 AND word = $2
            `, [
                userId, word, newInterval, newEase, result,
                newAttempts, newSuccesses, recognitionRate,
                newStatus, newRoom
            ]);

            // Kelime tekrar XP'si
            if (result !== 'again') {
                gamificationService.addXP(userId, 3, 'word', null, `Kelime tekrar: ${word}`)
                    .catch(() => { });
                gamificationService.updateDailyQuestProgress(userId, 'review_words', 1)
                    .catch(() => { });
            }

            return {
                success: true,
                word,
                result,
                newInterval,
                nextReviewDate: new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000),
                recognitionRate,
                status: newStatus,
                room: newRoom
            };
        } catch (error) {
            logger.error('[Listening] recordReviewResult failed:', error);
            throw error;
        }
    }

    // ============================================
    // ACHIEVEMENTS
    // ============================================

    /**
     * Dinleme kalitesi achievement'larini kontrol et
     */
    async checkListeningAchievements(userId, sessionData) {
        const earned = [];

        try {
            // LQS streak kontrol
            if (sessionData.lqs >= 80) {
                const lqsStreak = await db.query(`
                    SELECT COUNT(*) as streak
                    FROM (
                        SELECT listening_quality_score
                        FROM listening_sessions
                        WHERE user_id = $1 AND status = 'completed'
                        ORDER BY created_at DESC
                        LIMIT 10
                    ) sub
                    WHERE listening_quality_score >= 80
                `, [userId]);

                if (parseInt(lqsStreak.rows[0]?.streak) >= 5) {
                    const ach = await gamificationService.awardAchievement(userId, 'FOCUSED_LISTENER_1');
                    if (ach) earned.push(ach);
                }
                if (parseInt(lqsStreak.rows[0]?.streak) >= 10) {
                    const ach = await gamificationService.awardAchievement(userId, 'DEEP_LISTENER');
                    if (ach) earned.push(ach);
                }
            }

            // Comprehension streak
            if (sessionData.comprehensionScore >= 90) {
                const compStreak = await db.query(`
                    SELECT COUNT(*) as streak
                    FROM (
                        SELECT comprehension_score
                        FROM listening_sessions
                        WHERE user_id = $1 AND status = 'completed' AND comprehension_score IS NOT NULL
                        ORDER BY created_at DESC
                        LIMIT 30
                    ) sub
                    WHERE comprehension_score >= 90
                `, [userId]);

                const streak = parseInt(compStreak.rows[0]?.streak) || 0;
                if (streak >= 3) {
                    const ach = await gamificationService.awardAchievement(userId, 'PERFECT_UNDERSTANDING_3');
                    if (ach) earned.push(ach);
                }
                if (streak >= 7) {
                    const ach = await gamificationService.awardAchievement(userId, 'PERFECT_UNDERSTANDING_7');
                    if (ach) earned.push(ach);
                }
            }

            // Speed achievements
            if (sessionData.playbackSpeed >= 1.1) {
                const ach = await gamificationService.awardAchievement(userId, 'SPEED_STARTER');
                if (ach) earned.push(ach);
            }
            if (sessionData.playbackSpeed >= 1.2) {
                // Speed demon icin 5 tane gerekli
                const speedCount = await db.query(`
                    SELECT COUNT(*) as count
                    FROM listening_sessions
                    WHERE user_id = $1 AND status = 'completed' AND playback_speed >= 1.2
                `, [userId]);

                if (parseInt(speedCount.rows[0]?.count) >= 5) {
                    const ach = await gamificationService.awardAchievement(userId, 'SPEED_DEMON');
                    if (ach) earned.push(ach);
                }
            }

            // Word tap achievements
            const totalTaps = await db.query(
                'SELECT total_word_taps FROM user_listening_stats WHERE user_id = $1',
                [userId]
            );
            const taps = parseInt(totalTaps.rows[0]?.total_word_taps) || 0;

            if (taps >= 10) {
                const ach = await gamificationService.awardAchievement(userId, 'WORD_HUNTER_10');
                if (ach) earned.push(ach);
            }
            if (taps >= 100) {
                const ach = await gamificationService.awardAchievement(userId, 'WORD_HUNTER_100');
                if (ach) earned.push(ach);
            }

            // Replay achievements
            const totalReplays = await db.query(
                'SELECT total_replay_count FROM user_listening_stats WHERE user_id = $1',
                [userId]
            );
            const replays = parseInt(totalReplays.rows[0]?.total_replay_count) || 0;

            if (replays >= 50) {
                const ach = await gamificationService.awardAchievement(userId, 'PERSISTENT_LEARNER');
                if (ach) earned.push(ach);
            }

            // Quality hours
            const qualityHours = await db.query(
                'SELECT quality_listening_seconds FROM user_listening_stats WHERE user_id = $1',
                [userId]
            );
            const hours = Math.floor((parseInt(qualityHours.rows[0]?.quality_listening_seconds) || 0) / 3600);

            if (hours >= 10) {
                const ach = await gamificationService.awardAchievement(userId, 'QUALITY_HOURS_10');
                if (ach) earned.push(ach);
            }
            if (hours >= 50) {
                const ach = await gamificationService.awardAchievement(userId, 'QUALITY_HOURS_50');
                if (ach) earned.push(ach);
            }

        } catch (error) {
            logger.warn('[Listening] checkListeningAchievements failed:', error.message);
        }

        return earned;
    }
}

module.exports = new ListeningService();
