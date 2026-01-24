/**
 * 🎭 Onboarding Service
 * 
 * "Kahramanın Yolculuğu" onboarding akışını yönetir.
 * - Stealth Assessment (Gizli seviye tespiti)
 * - Archetype seçimi
 * - Yol haritası oluşturma
 */

const db = require('../config/db');
const logger = require('../utils/common/logger.js');
const openaiClient = require('../utils/ai/openaiClient.js');
const gamificationService = require('./gamificationService');
const questContentService = require('./questContentService');
const fs = require('fs');
const path = require('path');

class OnboardingService {
    constructor() {
        this.assessmentPrompt = null;
        this.roadmapPrompt = null;
        this.loadPrompts();
    }

    /**
     * Prompt'ları yükle
     */
    loadPrompts() {
        try {
            const assessPath = path.join(__dirname, '../prompts/liro/cefr_assessor.txt');
            const roadmapPath = path.join(__dirname, '../prompts/liro/roadmap_generator.txt');

            if (fs.existsSync(assessPath)) {
                this.assessmentPrompt = fs.readFileSync(assessPath, 'utf-8');
            }
            if (fs.existsSync(roadmapPath)) {
                this.roadmapPrompt = fs.readFileSync(roadmapPath, 'utf-8');
            }
        } catch (error) {
            logger.warn('[OnboardingService] Could not load prompts:', error.message);
        }
    }

    // ============================================
    // STEALTH ASSESSMENT (Gizli Seviye Tespiti)
    // ============================================

    /**
     * Sohbet geçmişinden CEFR seviyesi tahmin et
     * @param {Array} messages - [{role: 'user' | 'assistant', content: string}]
     * @returns {Promise<Object>} - { cefr, confidence, analysis }
     */
    async assessLevel(messages) {
        if (!messages || messages.length < 2) {
            return { cefr: 'A2', confidence: 30, analysis: 'Yeterli veri yok' };
        }

        try {
            // Sadece kullanıcı mesajlarını al
            const userMessages = messages
                .filter(m => m.role === 'user')
                .map(m => m.content)
                .join('\n---\n');

            const systemPrompt = this.assessmentPrompt || `
You are a CEFR level assessment expert. Analyze the user's English messages and determine their level.

Return ONLY a JSON object:
{
    "cefr": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
    "confidence": 0-100,
    "analysis": "Brief explanation in Turkish",
    "strengths": ["list of strengths"],
    "weaknesses": ["areas to improve"],
    "vocabularyLevel": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
    "grammarLevel": "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
}

Assessment criteria:
- A1: Basic phrases, present simple only
- A2: Simple sentences, past tense, basic connectors
- B1: Connected text, opinions, future tenses
- B2: Complex arguments, abstract topics, conditionals
- C1: Nuanced expression, idiomatic usage
- C2: Native-like fluency, subtle distinctions
`;

            const response = await openaiClient.generateChatCompletion([
                { role: 'user', content: `Analyze these user messages:\n\n${userMessages}` }
            ], {
                temperature: 0.3,
                maxTokens: 500,
                model: 'gpt-4o-mini',
                systemPrompt
            });

            const content = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(content);

            logger.info(`[Onboarding] Level assessed: ${result.cefr} (${result.confidence}% confidence)`);
            return result;

        } catch (error) {
            logger.error('[OnboardingService] Assessment failed:', error);
            return { cefr: 'B1', confidence: 50, analysis: 'Değerlendirme yapılamadı, orta seviye varsayıldı' };
        }
    }

    // ============================================
    // ARCHETYPE SELECTION
    // ============================================

    /**
     * Kullanıcı arketipini kaydet
     * @param {string} userId 
     * @param {string} archetype - 'career' | 'travel' | 'intellectual'
     */
    async setArchetype(userId, archetype) {
        const validArchetypes = ['career', 'travel', 'intellectual'];

        if (!validArchetypes.includes(archetype)) {
            throw new Error(`Invalid archetype: ${archetype}`);
        }

        await db.query(`
            UPDATE user_gamification 
            SET archetype = $1, updated_at = NOW()
            WHERE user_id = $2
        `, [archetype, userId]);

        logger.info(`[Onboarding] User ${userId} archetype set: ${archetype}`);
        return { success: true, archetype };
    }

    /**
     * Arketip detaylarını getir
     */
    getArchetypeDetails(archetype) {
        const archetypes = {
            career: {
                code: 'career',
                name: 'Kariyer Mimarı',
                nameEn: 'Career Architect',
                icon: '🏰',
                description: 'İş dünyasında global bir lider olmak istiyorsun.',
                focusAreas: ['business_english', 'presentations', 'negotiations', 'email_writing'],
                suggestedContent: ['Harvard Business Review', 'TED Talks', 'Industry Reports'],
                color: '#4F46E5' // Indigo
            },
            travel: {
                code: 'travel',
                name: 'Dünya Gezgini',
                nameEn: 'World Explorer',
                icon: '🌍',
                description: 'Sınır tanımadan dünyayı keşfetmek istiyorsun.',
                focusAreas: ['conversational', 'practical_situations', 'culture', 'storytelling'],
                suggestedContent: ['Travel Podcasts', 'Cultural Documentaries', 'Lonely Planet'],
                color: '#059669' // Emerald
            },
            intellectual: {
                code: 'intellectual',
                name: 'Entelektüel Bilge',
                nameEn: 'Intellectual Sage',
                icon: '🧠',
                description: 'Orijinal kaynaklardan beslenmek ve derinlemesine öğrenmek istiyorsun.',
                focusAreas: ['academic_reading', 'critical_thinking', 'complex_vocabulary', 'literature'],
                suggestedContent: ['The Economist', 'Scientific American', 'Classic Literature'],
                color: '#7C3AED' // Violet
            }
        };

        return archetypes[archetype] || archetypes.intellectual;
    }

    // ============================================
    // ROADMAP GENERATION
    // ============================================

    /**
     * Kişiselleştirilmiş yol haritası oluştur
     * @param {string} userId 
     * @param {string} currentCEFR 
     * @param {string} targetCEFR 
     * @param {string} archetype 
     * @param {number} weeklyMinutes - Haftalık hedef dakika
     * @param {number|null} sectorId - Kullanıcının seçtiği sektör (opsiyonel)
     */
    async generateRoadmap(userId, currentCEFR, targetCEFR, archetype, weeklyMinutes = 120, sectorId = null) {
        try {
            // Seviye farkını hesapla
            const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
            const currentIndex = cefrLevels.indexOf(currentCEFR);
            const targetIndex = cefrLevels.indexOf(targetCEFR);
            const levelDiff = targetIndex - currentIndex;

            if (levelDiff <= 0) {
                throw new Error('Target level must be higher than current level');
            }

            // Tahmini hafta hesapla (her seviye ~8-12 hafta)
            const weeksPerLevel = Math.ceil(120 / (weeklyMinutes / 7)); // Günlük 20dk varsayımı
            const totalWeeks = levelDiff * weeksPerLevel;

            // AI ile detaylı plan oluştur
            const archetypeDetails = this.getArchetypeDetails(archetype);

            // Sektör bilgisi varsa al
            let sectorContext = '';
            let sectorName = null;
            if (sectorId) {
                try {
                    const sectorService = require('./sectorService');
                    const sector = await sectorService.getSectorById(sectorId);
                    if (sector) {
                        sectorName = sector.name_en || sector.name_tr;
                        sectorContext = `
## Sector Context
User's Primary Sector: ${sectorName}
IMPORTANT: At least 40% of reading/listening content and vocabulary tasks MUST be related to ${sectorName}.
Include sector-specific terminology and professional scenarios.`;
                    }
                } catch (err) {
                    logger.warn('[Onboarding] Could not load sector info:', err.message);
                }
            }

            const planPrompt = this.roadmapPrompt || `
Create a personalized English learning roadmap.

User Profile:
- Current Level: ${currentCEFR}
- Target Level: ${targetCEFR}
- Archetype: ${archetypeDetails.name}
- Focus Areas: ${archetypeDetails.focusAreas.join(', ')}
- Weekly Study Time: ${weeklyMinutes} minutes
- Estimated Duration: ${totalWeeks} weeks
${sectorContext}

Generate a JSON roadmap with weekly milestones:
{
    "summary": "Brief motivational summary in Turkish",
    "totalWeeks": number,
    "weeklyMilestones": [
        {
            "week": 1,
            "theme": "Theme name",
            "goals": ["Goal 1", "Goal 2"],
            "tasks": [
                {"type": "listen", "title": "...", "duration": 15},
                {"type": "vocabulary", "title": "...", "wordCount": 20},
                {"type": "quiz", "title": "...", "difficulty": "easy"}
            ],
            "targetVocabulary": ["word1", "word2"],
            "milestone": "What user will achieve"
        }
    ],
    "finalMilestone": "Description of achievement at ${targetCEFR}"
}
`;

            const response = await openaiClient.generateChatCompletion([
                { role: 'user', content: planPrompt }
            ], {
                temperature: 0.7,
                maxTokens: 2000,
                model: 'gpt-4o'
            });

            const content = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
            const roadmap = JSON.parse(content);

            // Hedefi veritabanına kaydet
            await this.saveGoal(userId, {
                archetype,
                currentCEFR,
                targetCEFR,
                weeklyMinutes,
                totalWeeks,
                deadline: this.calculateDeadline(totalWeeks)
            });

            // Quest nodes oluştur
            await this.createQuestNodes(userId, roadmap);

            logger.info(`[Onboarding] Roadmap generated for user ${userId}: ${currentCEFR} → ${targetCEFR} (${totalWeeks} weeks)`);

            return {
                success: true,
                roadmap,
                archetypeDetails,
                estimatedWeeks: totalWeeks,
                dailyMinutes: Math.ceil(weeklyMinutes / 7)
            };

        } catch (error) {
            logger.error('[OnboardingService] Roadmap generation failed (using fallback):', error);

            // FALLBACK ROADMAP
            // OpenAI başarısız olursa standart bir plan ile devam et
            const fallbackRoadmap = {
                "summary": "AI planı oluşturulamadı, ancak senin için optimize edilmiş standart başarı programı hazır!",
                "totalWeeks": 8,
                "weeklyMilestones": [
                    {
                        "week": 1,
                        "theme": "Hızlı Başlangıç",
                        "goals": ["Sistemi tanı", "İlk kelimeleri öğren"],
                        "tasks": [
                            { "type": "vocabulary", "title": "Kelime Kartları (İlk 20)", "duration": 15 },
                            { "type": "listen", "title": "Başlangıç Podcasti", "duration": 10 },
                            { "type": "quiz", "title": "İlk Quiz", "difficulty": "easy" }
                        ],
                        "milestone": "Başlangıç rozetini kazan"
                    },
                    {
                        "week": 2,
                        "theme": "Ritmi Yakala",
                        "goals": ["Günlük 20dk çalışma", "Dinleme pratiği"],
                        "tasks": [
                            { "type": "listen", "title": "Günlük Haberler", "duration": 15 },
                            { "type": "vocabulary", "title": "Tema: Seyahat", "duration": 20 },
                            { "type": "quiz", "title": "Haftalık Tekrar", "difficulty": "medium" }
                        ],
                        "milestone": "3 Günlük Seri Yap"
                    },
                    {
                        "week": 3,
                        "theme": "Derinleşme",
                        "goals": ["İçerik üretimi", "Aktif dinleme"],
                        "tasks": [
                            { "type": "listen", "title": "İlgi Alanı Podcasti", "duration": 20 },
                            { "type": "vocabulary", "title": "Tema: İş Dünyası", "duration": 20 },
                            { "type": "milestone", "title": "Aylık Değerlendirme", "duration": 30 }
                        ],
                        "milestone": "İlk Ayı Tamamla"
                    }
                ],
                "finalMilestone": `Hedef: ${targetCEFR} Seviyesi`
            };

            try {
                // Hedefi kaydet
                await this.saveGoal(userId, {
                    archetype,
                    currentCEFR,
                    targetCEFR,
                    weeklyMinutes,
                    totalWeeks: 8,
                    deadline: this.calculateDeadline(8)
                });

                // Quest nodes oluştur
                await this.createQuestNodes(userId, fallbackRoadmap);

                return {
                    success: true,
                    roadmap: fallbackRoadmap,
                    archetypeDetails: this.getArchetypeDetails(archetype),
                    estimatedWeeks: 8,
                    dailyMinutes: Math.ceil(weeklyMinutes / 7)
                };

            } catch (fallbackError) {
                logger.error('[OnboardingService] Critical failure in fallback:', fallbackError);
                throw fallbackError;
            }
        }
    }

    /**
     * Hedefi veritabanına kaydet
     */
    async saveGoal(userId, goalData) {
        await db.query(`
            INSERT INTO user_goals (user_id, goal_type, archetype, target_cefr, current_cefr, weekly_minutes_goal, deadline)
            VALUES ($1, 'primary', $2, $3, $4, $5, $6)
            ON CONFLICT (user_id) WHERE goal_type = 'primary' 
            DO UPDATE SET 
                archetype = $2,
                target_cefr = $3,
                current_cefr = $4,
                weekly_minutes_goal = $5,
                deadline = $6,
                updated_at = NOW()
        `, [
            userId,
            goalData.archetype,
            goalData.targetCEFR,
            goalData.currentCEFR,
            goalData.weeklyMinutes,
            goalData.deadline
        ]);
    }

    /**
     * Quest nodes oluştur
     */
    async createQuestNodes(userId, roadmap) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            let stepOrder = 1;
            let previousNodeId = null;

            for (const week of roadmap.weeklyMilestones || []) {
                for (const task of week.tasks || []) {
                    const result = await client.query(`
                        INSERT INTO quest_nodes (
                            title, description, step_order, week_number, 
                            prerequisite_node_id, reward_xp, task_type, 
                            task_subtype, estimated_minutes, is_major_milestone
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                        RETURNING id
                    `, [
                        task.title,
                        week.milestone,
                        stepOrder,
                        week.week,
                        previousNodeId,
                        this.calculateTaskXP(task.type),
                        task.type,
                        task.type,
                        task.duration || 10,
                        false
                    ]);

                    const nodeId = result.rows[0].id;

                    // İlk birkaç görevi açık bırak
                    const status = stepOrder <= 3 ? 'unlocked' : 'locked';
                    await client.query(`
                        INSERT INTO user_quest_progress (user_id, node_id, status)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (user_id, node_id) DO NOTHING
                    `, [userId, nodeId, status]);

                    previousNodeId = nodeId;
                    stepOrder++;
                }

                // Hafta sonu milestone
                if (week.milestone) {
                    const milestoneResult = await client.query(`
                        INSERT INTO quest_nodes (
                            title, description, step_order, week_number,
                            prerequisite_node_id, reward_xp, task_type,
                            is_major_milestone, icon_emoji
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        RETURNING id
                    `, [
                        `Hafta ${week.week} Tamamlandı!`,
                        week.milestone,
                        stepOrder,
                        week.week,
                        previousNodeId,
                        200,
                        'milestone',
                        true,
                        '🏆'
                    ]);

                    previousNodeId = milestoneResult.rows[0].id;
                    stepOrder++;
                }
            }

            await client.query('COMMIT');
            logger.info(`[Onboarding] Created ${stepOrder - 1} quest nodes for user ${userId}`);

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('[OnboardingService] createQuestNodes failed:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    calculateTaskXP(taskType) {
        const xpMap = {
            listen: 100,
            vocabulary: 50,
            quiz: 75,
            reading: 100,
            speaking: 150,
            milestone: 200
        };
        return xpMap[taskType] || 50;
    }

    calculateDeadline(weeks) {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + (weeks * 7));
        return deadline.toISOString().split('T')[0];
    }

    // ============================================
    // ONBOARDING COMPLETION
    // ============================================

    /**
     * Onboarding'i tamamla
     */
    async completeOnboarding(userId, data) {
        const { archetype, assessedCEFR, targetCEFR, weeklyMinutes, sectors, positionInfo, sectorGoals } = data;

        try {
            // 1. Archetype ayarla
            await this.setArchetype(userId, archetype);

            // 2. Sektörleri kaydet (varsa) + Sektör gamification entegrasyonu
            let primarySectorId = null;
            if (sectors && Array.isArray(sectors) && sectors.length > 0) {
                const sectorService = require('./sectorService');
                let sectorGamificationService;
                try {
                    sectorGamificationService = require('./sectorGamificationService');
                } catch (e) {
                    // Service yüklenemediyse devam et
                }

                let savedCount = 0;
                for (let i = 0; i < sectors.length; i++) {
                    const sectorId = sectors[i];

                    // Sector ID validation
                    if (typeof sectorId !== 'number' || sectorId <= 0) {
                        logger.warn(`[Onboarding] Invalid sector ID format: ${sectorId}`);
                        continue;
                    }

                    // Sektörün var olup olmadığını kontrol et
                    const sector = await sectorService.getSectorById(sectorId);
                    if (!sector) {
                        logger.warn(`[Onboarding] Sector not found: ${sectorId}`);
                        continue;
                    }

                    const isPrimary = savedCount === 0; // İlk başarılı kayıt primary
                    try {
                        // Pozisyon bilgisiyle kaydet (varsa)
                        if (positionInfo && isPrimary) {
                            await sectorService.setUserSectorWithPosition(userId, sectorId, {
                                isPrimary: true,
                                jobPosition: positionInfo.jobPosition,
                                jobPositionEn: positionInfo.jobPositionEn,
                                yearsExperience: positionInfo.yearsExperience,
                                companyName: positionInfo.companyName,
                                companySize: positionInfo.companySize
                            });
                        } else {
                            await sectorService.addUserSector(userId, sectorId, isPrimary);
                        }

                        // İlk sektör için primary_sector_id kaydet
                        if (isPrimary) {
                            primarySectorId = sectorId;
                            await db.query(`
                                UPDATE user_gamification 
                                SET primary_sector_id = $1, updated_at = NOW()
                                WHERE user_id = $2
                            `, [sectorId, userId]);
                        }

                        // Sektör quest'lerini oluştur (arka planda)
                        if (sectorGamificationService) {
                            sectorGamificationService.generateSectorQuestsForUser(userId, sectorId)
                                .catch(err => logger.warn('[Onboarding] Sector quest generation failed:', err.message));

                            // Sektör daily quest'leri oluştur
                            if (isPrimary) {
                                sectorGamificationService.generateSectorDailyQuests(userId, sectorId, 2)
                                    .catch(err => logger.warn('[Onboarding] Sector daily quest failed:', err.message));
                            }
                        }

                        savedCount++;
                    } catch (sectorError) {
                        logger.warn(`[Onboarding] Could not save sector ${sectorId}:`, sectorError.message);
                    }
                }
                if (savedCount > 0) {
                    logger.info(`[Onboarding] Saved ${savedCount} sector(s) for user ${userId}`);
                }
            }

            // 3. Roadmap oluştur (sektör varsa bağlamlı)
            const roadmapResult = await this.generateRoadmap(
                userId,
                assessedCEFR,
                targetCEFR,
                archetype,
                weeklyMinutes,
                primarySectorId
            );

            // 4. Onboarding'i tamamlandı olarak işaretle
            await db.query(`
                UPDATE user_gamification 
                SET onboarding_completed = true, updated_at = NOW()
                WHERE user_id = $1
            `, [userId]);

            // 5. CEFR seviyesini users tablosuna kaydet
            await db.query(`
                UPDATE users SET cefr_level = $1 WHERE id = $2
            `, [assessedCEFR, userId]);

            // 6. İlk başarımı ver
            await gamificationService.awardAchievement(userId, 'FIRST_CONTENT');

            // 7. Başlangıç XP ver
            await gamificationService.addXP(userId, 100, 'onboarding', null, 'Yolculuğa hoş geldin!');

            // 8. Sektör tercihleri kaydet (yeni) - sectorGoals dahil
            if (primarySectorId) {
                try {
                    const goalsData = {
                        primary_goal: archetype,
                        focus_areas: sectors,
                        // Kullanıcının belirlediği sektör hedefleri
                        vocabulary_goal: sectorGoals?.vocabularyGoal || 50,     // Aylık kelime hedefi
                        content_goal: sectorGoals?.contentGoal || 5,            // Haftalık içerik hedefi
                        sector_daily_minutes: sectorGoals?.dailyMinutes || 15   // Günlük sektör çalışması
                    };

                    await db.query(`
                        INSERT INTO user_sector_preferences (
                            user_id,
                            onboarding_sector_selected,
                            sector_goals,
                            daily_sector_time_goal,
                            weekly_sector_content_goal
                        )
                        VALUES ($1, true, $2, $3, $4)
                        ON CONFLICT (user_id) DO UPDATE SET
                            onboarding_sector_selected = true,
                            sector_goals = $2,
                            daily_sector_time_goal = $3,
                            weekly_sector_content_goal = $4,
                            updated_at = NOW()
                    `, [
                        userId,
                        JSON.stringify(goalsData),
                        sectorGoals?.dailyMinutes || Math.ceil(weeklyMinutes / 7),
                        sectorGoals?.contentGoal || 5
                    ]);

                    logger.info(`[Onboarding] Sector goals saved: vocab=${goalsData.vocabulary_goal}, content=${goalsData.content_goal}/week, daily=${goalsData.sector_daily_minutes}min`);
                } catch (prefError) {
                    logger.warn('[Onboarding] Could not save sector preferences:', prefError.message);
                }
            }

            logger.info(`[Onboarding] Completed for user ${userId} (sector: ${primarySectorId || 'none'})`);

            return {
                success: true,
                ...roadmapResult,
                welcomeMessage: this.getWelcomeMessage(archetype, assessedCEFR, targetCEFR),
                selectedSectors: sectors || [],
                primarySectorId
            };

        } catch (error) {
            logger.error('[OnboardingService] completeOnboarding failed:', error);
            throw error;
        }
    }


    getWelcomeMessage(archetype, currentCEFR, targetCEFR) {
        const archetypeDetails = this.getArchetypeDetails(archetype);

        return {
            title: `Hoş geldin, ${archetypeDetails.name}! ${archetypeDetails.icon}`,
            subtitle: `${currentCEFR} → ${targetCEFR} yolculuğun başlıyor.`,
            message: `Sen bir ${archetypeDetails.name}sın. ${archetypeDetails.description} Ben Liro, bu yolculukta seninle birlikte olacağım.`,
            cta: 'İlk Göreve Başla'
        };
    }

    // ============================================
    // QUEST PROGRESS
    // ============================================

    /**
     * Kullanıcının yol haritasını getir
     * Quest'leri içerik URL'leri ile zenginleştirir
     */
    async getUserRoadmap(userId) {
        const quests = await db.query(`
            SELECT 
                qn.*,
                uqp.status,
                uqp.completed_at,
                uqp.score
            FROM quest_nodes qn
            LEFT JOIN user_quest_progress uqp ON qn.id = uqp.node_id AND uqp.user_id = $1
            ORDER BY qn.step_order
        `, [userId]);

        // İçerik bilgilerini zenginleştir
        let enrichedQuests = quests.rows;
        try {
            enrichedQuests = await questContentService.enrichQuestsWithContent(quests.rows);
        } catch (error) {
            logger.warn('[OnboardingService] Could not enrich quests with content:', error.message);
        }

        // Aktif, yakın gelecek ve kilitli olarak grupla
        const roadmap = {
            current: null,
            upcoming: [],
            completed: [],
            locked: []
        };

        for (const quest of enrichedQuests) {
            if (quest.status === 'in_progress') {
                roadmap.current = quest;
            } else if (quest.status === 'unlocked') {
                if (!roadmap.current) {
                    roadmap.current = quest;
                } else {
                    roadmap.upcoming.push(quest);
                }
            } else if (quest.status === 'completed') {
                roadmap.completed.push(quest);
            } else {
                roadmap.locked.push(quest);
            }
        }

        // Sadece ilk 2 yakın gelecek görevi göster
        roadmap.upcoming = roadmap.upcoming.slice(0, 2);

        // Kilitli görevleri sadece önizleme için sınırla
        roadmap.lockedPreview = roadmap.locked.slice(0, 3);
        roadmap.totalLocked = roadmap.locked.length;

        return roadmap;
    }

    /**
     * Görevi tamamla
     */
    async completeQuest(userId, nodeId, score = null) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Görevi tamamlandı olarak işaretle
            await client.query(`
                UPDATE user_quest_progress 
                SET status = 'completed', completed_at = NOW(), score = $3
                WHERE user_id = $1 AND node_id = $2
            `, [userId, nodeId, score]);

            // Quest bilgisini al
            const quest = await client.query(
                'SELECT * FROM quest_nodes WHERE id = $1',
                [nodeId]
            );

            if (quest.rows.length === 0) {
                throw new Error('Quest not found');
            }

            // Sonraki görevi aç
            const nextQuest = await client.query(`
                SELECT id FROM quest_nodes 
                WHERE prerequisite_node_id = $1
            `, [nodeId]);

            if (nextQuest.rows.length > 0) {
                await client.query(`
                    UPDATE user_quest_progress 
                    SET status = 'unlocked'
                    WHERE user_id = $1 AND node_id = $2 AND status = 'locked'
                `, [userId, nextQuest.rows[0].id]);
            }

            await client.query('COMMIT');

            // XP ekle
            const xpResult = await gamificationService.addXP(
                userId,
                quest.rows[0].reward_xp,
                'quest',
                nodeId.toString(),
                `Görev tamamlandı: ${quest.rows[0].title}`
            );

            return {
                success: true,
                quest: quest.rows[0],
                xpEarned: quest.rows[0].reward_xp,
                ...xpResult
            };

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('[OnboardingService] completeQuest failed:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    /**
     * Tipe göre aktif görevi tamamla
     * Örn: 'vocabulary' tipindeki 'in_progress' veya 'unlocked' (ilk sıradaki) görevi bulur ve tamamlar
     */
    async completeActiveQuestByType(userId, taskType) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. İlgili tipteki aktif görevi bul
            // Öncelik: in_progress -> unlocked (ve step order'ı en düşük olan)
            const activeQuest = await client.query(`
                SELECT qn.* 
                FROM quest_nodes qn
                JOIN user_quest_progress uqp ON qn.id = uqp.node_id
                WHERE uqp.user_id = $1 
                  AND qn.task_type = $2
                  AND uqp.status IN ('in_progress', 'unlocked')
                ORDER BY 
                  CASE WHEN uqp.status = 'in_progress' THEN 1 ELSE 2 END,
                  qn.step_order ASC
                LIMIT 1
            `, [userId, taskType]);

            if (activeQuest.rows.length === 0) {
                await client.query('ROLLBACK');
                return { success: false, message: 'Aktif görev bulunamadı' };
            }

            const quest = activeQuest.rows[0];

            // 2. Görevi tamamla (completeQuest mantığını tekrar kullanıyoruz ama transaction içinde)
            // Görevi tamamlandı olarak işaretle
            await client.query(`
                UPDATE user_quest_progress 
                SET status = 'completed', completed_at = NOW(), score = 100
                WHERE user_id = $1 AND node_id = $2
            `, [userId, quest.id]);

            // Sonraki görevi aç
            let nextQuestNodes = await client.query(`
                SELECT id FROM quest_nodes 
                WHERE prerequisite_node_id = $1
            `, [quest.id]);

            // Fallback: Prerequisite yoksa step_order'a göre sonrakini bul
            if (nextQuestNodes.rows.length === 0) {
                const currentQuestStep = quest.step_order;
                nextQuestNodes = await client.query(`
                    SELECT id FROM quest_nodes 
                    WHERE step_order > $1
                    ORDER BY step_order ASC
                    LIMIT 1
                `, [currentQuestStep]);
            }

            if (nextQuestNodes.rows.length > 0) {
                await client.query(`
                    UPDATE user_quest_progress 
                    SET status = 'unlocked'
                    WHERE user_id = $1 AND node_id = $2 AND status = 'locked'
                `, [userId, nextQuestNodes.rows[0].id]);
            }

            await client.query('COMMIT');

            // XP ekle (Transaction dışı)
            const xpResult = await gamificationService.addXP(
                userId,
                quest.reward_xp,
                'quest',
                quest.id.toString(),
                `Görev tamamlandı: ${quest.title}`
            );

            return {
                success: true,
                quest: quest,
                xpEarned: quest.reward_xp,
                ...xpResult
            };

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('[OnboardingService] completeActiveQuestByType failed:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new OnboardingService();
