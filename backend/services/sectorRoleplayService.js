/**
 * 🎭 Sector Roleplay Service
 * 
 * İş senaryoları ve rol tabanlı diyalog üretimi.
 * Kullanıcının seçtiği rollere göre özelleştirilmiş içerik oluşturur.
 */

const { supabase } = require('../utils/storage/supabaseClient');
const openaiClient = require('../utils/ai/openaiClient');
const { synthesizeWithOpenAI, isOpenAITTSAvailable } = require('../utils/audio/openaiTTS');
const { uploadToSupabase } = require('../utils/storage/storageUploader');
const logger = require('../utils/common/logger');
const { v4: uuidv4 } = require('uuid');
const sectorService = require('./sectorService');

// Senaryo uzunlukları (replik sayısı)
const SCENARIO_LENGTHS = {
    short: { min: 4, max: 6 },
    medium: { min: 8, max: 12 },
    long: { min: 16, max: 20 }
};

// Senaryo kategorileri
const SCENARIO_CATEGORIES = {
    crisis_management: { name_tr: 'Kriz Yönetimi', name_en: 'Crisis Management' },
    negotiation: { name_tr: 'Müzakere', name_en: 'Negotiation' },
    meeting: { name_tr: 'Toplantı', name_en: 'Meeting' },
    onboarding: { name_tr: 'İşe Alım', name_en: 'Onboarding' },
    feedback: { name_tr: 'Geri Bildirim', name_en: 'Feedback' },
    customer_service: { name_tr: 'Müşteri Hizmetleri', name_en: 'Customer Service' },
    sales_pitch: { name_tr: 'Satış Sunumu', name_en: 'Sales Pitch' },
    project_update: { name_tr: 'Proje Güncellemesi', name_en: 'Project Update' },
    general: { name_tr: 'Genel', name_en: 'General' }
};

class SectorRoleplayService {

    /**
     * Senaryo kategorilerini döndür
     */
    getScenarioCategories() {
        return Object.entries(SCENARIO_CATEGORIES).map(([id, data]) => ({
            id,
            ...data
        }));
    }

    /**
     * Rol tabanlı iş senaryosu oluştur
     * @param {Object} params - Senaryo parametreleri
     */
    async generateRoleplayScenario(params) {
        const {
            sector_id,
            scenario_category,
            cefr_level,
            length = 'medium',
            context,
            roles,
            key_vocabulary = [],
            user_id
        } = params;

        try {
            // 1. Sektör bilgilerini al
            const { data: sector, error: sectorError } = await supabase
                .from('sectors')
                .select('name_tr, name_en, code')
                .eq('id', sector_id)
                .single();

            if (sectorError || !sector) {
                throw new Error(`Sector not found: ${sector_id}`);
            }

            // 1.5 Kullanıcının pozisyon bilgisini al (kişiselleştirme için)
            let userPosition = null;
            if (user_id) {
                userPosition = await sectorService.getUserSectorWithPosition(user_id);
                // Eğer bu sektör için pozisyon yoksa, herhangi bir primary pozisyonu al
                if (!userPosition || userPosition.sector_id !== sector_id) {
                    const allSectors = await sectorService.getAllUserSectorsWithPosition(user_id);
                    userPosition = allSectors.find(s => s.sector_id === sector_id) || userPosition;
                }
                logger.debug(`[Personalization] User position: ${userPosition?.job_position_en || 'Not set'}`);
            }

            // 2. Uzunluk ayarları
            const lengthConfig = SCENARIO_LENGTHS[length] || SCENARIO_LENGTHS.medium;
            const turnCount = Math.floor(Math.random() * (lengthConfig.max - lengthConfig.min + 1)) + lengthConfig.min;

            // 3. AI ile diyalog üret
            const dialogue = await this._generateDialogueWithAI({
                sector,
                category: scenario_category,
                cefr_level,
                context,
                roles,
                turnCount,
                key_vocabulary,
                userPosition // Kişiselleştirme için pozisyon bilgisi
            });

            // 4. Veritabanına kaydet
            const contentData = {
                sector_id,
                content_type: 'business_roleplay',
                cefr_level,
                title: `${context.situation.substring(0, 50)}...`,
                title_tr: context.situation.substring(0, 80),
                description: context.goal || '',
                original_text: JSON.stringify(dialogue.turns),
                dialogue_data: {
                    scenario_type: 'business_roleplay',
                    scenario_category,
                    context,
                    roles: roles.map((role, i) => ({
                        ...role,
                        id: `role_${i + 1}`
                    })),
                    dialogue_turns: dialogue.turns,
                    key_vocabulary: dialogue.vocabulary,
                    useful_phrases: dialogue.phrases,
                    length
                },
                key_vocabulary: dialogue.vocabulary,
                tags: [scenario_category, length, 'roleplay'],
                status: 'published',
                created_by: user_id
            };

            const { data: savedContent, error: saveError } = await supabase
                .from('sector_content')
                .insert(contentData)
                .select()
                .single();

            if (saveError) {
                logger.error('Failed to save roleplay scenario:', saveError);
                throw saveError;
            }

            logger.info(`✅ Roleplay scenario created: ${savedContent.id}`);

            return {
                success: true,
                content: savedContent,
                dialogue: dialogue
            };

        } catch (error) {
            logger.error('[SectorRoleplayService] generateRoleplayScenario error:', error);
            throw error;
        }
    }

    /**
     * AI ile diyalog üret
     */
    async _generateDialogueWithAI(params) {
        const { sector, category, cefr_level, context, roles, turnCount, key_vocabulary, userPosition } = params;

        const categoryInfo = SCENARIO_CATEGORIES[category] || SCENARIO_CATEGORIES.general;

        // Kullanıcı pozisyonu için kişiselleştirme context'i
        let personalizationContext = '';
        if (userPosition && userPosition.job_position_en) {
            personalizationContext = `
PERSONALIZATION:
The learner works as a ${userPosition.job_position_en}${userPosition.years_experience ? ` with ${userPosition.years_experience} years of experience` : ''}.
Tailor the vocabulary, complexity, and situations to their professional level and role.
Make sure one of the roles or the perspective aligns with their job position when appropriate.`;
        }

        const systemPrompt = `You are a business English dialogue generator for the ${sector.name_en} industry.
Create a realistic workplace conversation for English learners at ${cefr_level} level.
${personalizationContext}

IMPORTANT RULES:
1. Generate exactly ${turnCount} dialogue turns (alternating between speakers)
2. Use professional but natural business English
3. Include industry-specific terminology for ${sector.name_en}
4. Match language complexity to ${cefr_level} CEFR level
5. Make the dialogue practical and applicable to real workplace situations
${key_vocabulary.length > 0 ? `6. Try to naturally include these words: ${key_vocabulary.join(', ')}` : ''}

OUTPUT FORMAT (JSON):
{
  "turns": [
    {
      "role_id": "role_1",
      "speaker": "Speaker Name",
      "english": "English text",
      "turkish": "Turkish translation",
      "key_phrase": true/false
    }
  ],
  "vocabulary": ["word1", "word2"],
  "phrases": ["useful phrase 1", "useful phrase 2"]
}`;

        const userPrompt = `Create a ${categoryInfo.name_en} scenario in the ${sector.name_en} industry.

CONTEXT:
- Situation: ${context.situation}
- Goal: ${context.goal || 'Resolve the situation professionally'}
- Setting: ${context.setting || 'Office'}

SPEAKERS:
- Role 1: ${roles[0].title} (${roles[0].title_en || roles[0].title})
- Role 2: ${roles[1].title} (${roles[1].title_en || roles[1].title})

Generate a natural, professional dialogue with ${turnCount} turns.`;

        try {
            const response = await openaiClient.generateChatCompletion([
                { role: 'user', content: userPrompt }
            ], {
                systemPrompt,
                temperature: 0.7,
                model: 'gpt-4o-mini',
                responseFormat: { type: 'json_object' }
            });

            const parsed = JSON.parse(response.content);
            return {
                turns: parsed.turns || [],
                vocabulary: parsed.vocabulary || [],
                phrases: parsed.phrases || []
            };

        } catch (error) {
            logger.error('[SectorRoleplayService] AI dialogue generation failed:', error);
            // Fallback: basit bir diyalog döndür
            return this._getFallbackDialogue(roles, context);
        }
    }

    /**
     * Fallback diyalog (AI başarısız olursa)
     */
    _getFallbackDialogue(roles, context) {
        return {
            turns: [
                {
                    role_id: 'role_1',
                    speaker: roles[0].title,
                    english: "I'd like to discuss the current situation.",
                    turkish: "Mevcut durumu görüşmek istiyorum.",
                    key_phrase: true
                },
                {
                    role_id: 'role_2',
                    speaker: roles[1].title,
                    english: "Of course. What would you like to know?",
                    turkish: "Tabii. Ne bilmek istersiniz?",
                    key_phrase: false
                }
            ],
            vocabulary: ['discuss', 'situation', 'current'],
            phrases: ["I'd like to discuss", "What would you like"]
        };
    }

    /**
     * Rol tabanlı TTS ses oluştur
     * Her rol için farklı ses kullanır
     */
    async generateRoleplayAudio(contentId, options = {}) {
        const {
            voice_role_1 = 'onyx',  // Erkek ses
            voice_role_2 = 'nova',  // Kadın ses
            speed = 0.9
        } = options;

        try {
            // 1. İçeriği al
            const { data: content, error } = await supabase
                .from('sector_content')
                .select('*')
                .eq('id', contentId)
                .single();

            if (error || !content) {
                throw new Error(`Content not found: ${contentId}`);
            }

            if (content.content_type !== 'business_roleplay') {
                throw new Error('Content is not a roleplay scenario');
            }

            // 2. Mevcut audio varsa döndür
            if (content.audio_url && !options.forceRegenerate) {
                return {
                    audioUrl: content.audio_url,
                    vttUrl: content.vtt_url,
                    duration: content.duration_seconds,
                    cached: true
                };
            }

            const dialogueData = content.dialogue_data;
            const turns = dialogueData?.dialogue_turns || [];

            if (turns.length === 0) {
                throw new Error('No dialogue turns found');
            }

            // 3. Her rol için ses sentezi
            const audioSegments = [];
            const voiceMap = {
                'role_1': voice_role_1,
                'role_2': voice_role_2
            };

            for (const turn of turns) {
                const voice = voiceMap[turn.role_id] || 'nova';
                const text = turn.english;

                if (!text) continue;

                logger.debug(`🎙️ Synthesizing: "${text.substring(0, 30)}..." with voice ${voice}`);

                const ttsResult = await synthesizeWithOpenAI({
                    text,
                    voice,
                    speed,
                    model: 'tts-1'
                });

                audioSegments.push({
                    audio: ttsResult.audioContent,
                    duration: ttsResult.totalDuration,
                    role: turn.role_id,
                    speaker: turn.speaker
                });
            }

            // 4. Audio'ları birleştir (basit concat - gelecekte ffmpeg ile iyileştirilebilir)
            const combinedAudio = Buffer.concat(audioSegments.map(s => s.audio));
            const totalDuration = audioSegments.reduce((sum, s) => sum + s.duration, 0);

            // 5. Supabase'e yükle
            const audioFileName = `sector-content/${contentId}/roleplay-${uuidv4()}.mp3`;
            const audioUrl = await uploadToSupabase(
                combinedAudio,
                audioFileName,
                'audio/mpeg',
                'audio'
            );

            // 6. Veritabanını güncelle
            await supabase
                .from('sector_content')
                .update({
                    audio_url: audioUrl,
                    duration_seconds: Math.round(totalDuration),
                    updated_at: new Date().toISOString()
                })
                .eq('id', contentId);

            logger.info(`✅ Roleplay audio generated: ${contentId} (${Math.round(totalDuration)}s)`);

            // 🎮 GAMIFICATION: Roleplay tamamlama XP'si
            let xpResult = null;
            if (content.created_by && content.sector_id) {
                try {
                    const sectorGamificationService = require('./sectorGamificationService');
                    xpResult = await sectorGamificationService.addSectorXP(
                        content.created_by,
                        'roleplay_complete',
                        content.sector_id,
                        contentId,
                        {}
                    );
                    logger.info(`[Gamification] Roleplay XP awarded for user ${content.created_by}`);
                } catch (gamError) {
                    logger.warn('[Gamification] Roleplay XP failed (non-blocking):', gamError.message);
                }
            }

            return {
                audioUrl,
                vttUrl: null, // Gelecekte VTT desteği eklenebilir
                duration: Math.round(totalDuration),
                segments: audioSegments.map((s, i) => ({
                    index: i,
                    role: s.role,
                    speaker: s.speaker,
                    duration: s.duration
                })),
                cached: false,
                xpResult // Gamification sonucunu ekle
            };

        } catch (error) {
            logger.error('[SectorRoleplayService] generateRoleplayAudio error:', error);
            throw error;
        }
    }

    /**
     * Sektör Podcast oluştur
     */
    async generateSectorPodcast(params) {
        const {
            sector_id,
            podcast_type,
            cefr_level,
            length = 'medium',
            topic,
            key_points,
            host_voice = 'nova',
            user_id
        } = params;

        try {
            // 1. Sektör bilgilerini al
            const { data: sector, error: sectorError } = await supabase
                .from('sectors')
                .select('name_tr, name_en, code')
                .eq('id', sector_id)
                .single();

            if (sectorError || !sector) {
                throw new Error(`Sector not found: ${sector_id}`);
            }

            // 2. Uzunluk belirleme (kelime sayısı)
            const wordLimits = {
                short: { min: 150, max: 250 },
                medium: { min: 300, max: 500 },
                long: { min: 600, max: 900 }
            };
            const wordLimit = wordLimits[length] || wordLimits.medium;

            // 3. AI ile podcast script üret
            const script = await this._generatePodcastScript({
                sector,
                podcast_type,
                cefr_level,
                topic,
                key_points,
                wordLimit
            });

            // 4. Veritabanına kaydet
            const contentData = {
                sector_id,
                content_type: 'sector_podcast',
                cefr_level,
                title: topic,
                title_tr: topic,
                description: `${podcast_type} podcast about ${topic}`,
                original_text: script.transcript,
                dialogue_data: {
                    podcast_type,
                    host: 'Professional Host',
                    topic,
                    key_points,
                    talking_points: script.talking_points,
                    vocabulary: script.vocabulary,
                    length
                },
                key_vocabulary: script.vocabulary,
                tags: [podcast_type, length, 'podcast'],
                status: 'published',
                created_by: user_id
            };

            const { data: savedContent, error: saveError } = await supabase
                .from('sector_content')
                .insert(contentData)
                .select()
                .single();

            if (saveError) {
                logger.error('Failed to save podcast:', saveError);
                throw saveError;
            }

            // 5. Audio oluştur
            let audioResult = null;
            try {
                audioResult = await this._generatePodcastAudio(savedContent.id, script.transcript, host_voice);
            } catch (audioError) {
                logger.warn('Podcast audio generation failed, continuing without audio:', audioError.message);
            }

            logger.info(`✅ Podcast created: ${savedContent.id}`);

            return {
                success: true,
                content: savedContent,
                script,
                audio: audioResult
            };

        } catch (error) {
            logger.error('[SectorRoleplayService] generateSectorPodcast error:', error);
            throw error;
        }
    }

    /**
     * AI ile podcast scripti üret
     */
    async _generatePodcastScript(params) {
        const { sector, podcast_type, cefr_level, topic, key_points, wordLimit } = params;

        const systemPrompt = `You are a professional podcast script writer for business English learners.
Create engaging, educational content about the ${sector.name_en} industry.

RULES:
1. Write for ${cefr_level} level English learners
2. Keep the script between ${wordLimit.min}-${wordLimit.max} words
3. Use clear, professional language
4. Include industry-specific vocabulary naturally
5. Make it engaging and informative

OUTPUT FORMAT (JSON):
{
  "transcript": "Full podcast script text",
  "talking_points": ["point 1", "point 2"],
  "vocabulary": ["key word 1", "key word 2"]
}`;

        const userPrompt = `Create a ${podcast_type} podcast about: ${topic}

Key points to cover:
${key_points.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Industry: ${sector.name_en}
Target level: ${cefr_level}`;

        try {
            const response = await openaiClient.generateChatCompletion([
                { role: 'user', content: userPrompt }
            ], {
                systemPrompt,
                temperature: 0.7,
                model: 'gpt-4o-mini',
                responseFormat: { type: 'json_object' }
            });

            return JSON.parse(response.content);

        } catch (error) {
            logger.error('[SectorRoleplayService] Podcast script generation failed:', error);
            return {
                transcript: `Welcome to our ${sector.name_en} industry podcast. Today we're discussing ${topic}. ${key_points.join('. ')}`,
                talking_points: key_points,
                vocabulary: []
            };
        }
    }

    /**
     * Podcast için TTS ses oluştur
     */
    async _generatePodcastAudio(contentId, transcript, voice) {
        if (!isOpenAITTSAvailable()) {
            throw new Error('OpenAI TTS is not available');
        }

        const ttsResult = await synthesizeWithOpenAI({
            text: transcript,
            voice,
            speed: 0.95,
            model: 'tts-1'
        });

        const audioFileName = `sector-content/${contentId}/podcast-${uuidv4()}.mp3`;
        const audioUrl = await uploadToSupabase(
            ttsResult.audioContent,
            audioFileName,
            'audio/mpeg',
            'audio'
        );

        // Veritabanını güncelle
        await supabase
            .from('sector_content')
            .update({
                audio_url: audioUrl,
                duration_seconds: Math.round(ttsResult.totalDuration),
                updated_at: new Date().toISOString()
            })
            .eq('id', contentId);

        return {
            audioUrl,
            duration: Math.round(ttsResult.totalDuration)
        };
    }
}

module.exports = new SectorRoleplayService();
