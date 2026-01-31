/**
 * 🔊 Sector Content TTS Service
 * 
 * Generates audio for sector content using TTS pipeline.
 * Stores audio URLs in sector_content table.
 */

const { supabase } = require('../utils/storage/supabaseClient');
const { synthesizeWithOpenAI, isOpenAITTSAvailable } = require('../utils/audio/openaiTTS');
const { uploadToSupabase } = require('../utils/storage/storageUploader');
const { createWordLevelVTTFromTimings } = require('../services/subtitleService');
const logger = require('../utils/common/logger');
const { v4: uuidv4 } = require('uuid');
const { logApiCost, calculateOpenAiTtsCost } = require('../utils/infra/costTracker.js');

class SectorContentTTSService {

    /**
     * Generate TTS audio for a sector content item
     * @param {string} contentId - Content UUID
     * @param {Object} options - TTS options
     * @returns {Promise<{ audioUrl: string, vttUrl: string, duration: number }>}
     */
    async generateAudioForContent(contentId, options = {}) {
        const {
            voice = 'nova',
            speed = 0.9,
            model = 'tts-1',
            forceRegenerate = false
        } = options;

        try {
            // 1. Fetch content from database
            const { data: content, error: fetchError } = await supabase
                .from('sector_content')
                .select('*')
                .eq('id', contentId)
                .single();

            if (fetchError || !content) {
                throw new Error(`Content not found: ${contentId}`);
            }

            // 2. Check if audio already exists (skip if not forcing regenerate)
            if (content.audio_url && !forceRegenerate) {
                logger.info(`Audio already exists for content ${contentId}, skipping`);
                return {
                    audioUrl: content.audio_url,
                    vttUrl: content.vtt_url,
                    duration: content.duration_seconds,
                    cached: true
                };
            }

            // 3. Extract text to synthesize
            const textToSpeak = this.extractSpeakableText(content);

            if (!textToSpeak || textToSpeak.length < 10) {
                throw new Error('No speakable text found in content');
            }

            logger.info(`🎙️ Generating TTS for sector content: ${content.title} (${textToSpeak.length} chars)`);

            // 4. Check TTS availability
            if (!isOpenAITTSAvailable()) {
                throw new Error('OpenAI TTS is not available');
            }

            // 5. Synthesize audio
            const ttsResult = await synthesizeWithOpenAI({
                text: textToSpeak,
                voice,
                speed,
                model,
                maxRetries: 3
            });

            // Log TTS cost
            if (content.created_by && textToSpeak.length > 0) {
                const ttsCost = calculateOpenAiTtsCost(textToSpeak.length, model);
                logApiCost({
                    userId: content.created_by,
                    feature: 'sector_content_tts',
                    provider: 'openai',
                    model,
                    inputQuantity: textToSpeak.length,
                    outputQuantity: 0,
                    costUsd: ttsCost,
                    metadata: { contentId, contentType: content.content_type },
                }).catch(err => logger.warn('[COST] sector_content_tts log failed:', err.message));
            }

            // 6. Upload audio to Supabase storage
            const audioFileName = `sector-content/${contentId}/${uuidv4()}.mp3`;
            const audioUrl = await uploadToSupabase(
                ttsResult.audioContent,
                audioFileName,
                'audio/mpeg',
                'audio'
            );

            // 7. Generate VTT subtitle file
            let vttUrl = null;
            if (ttsResult.wordTimings && ttsResult.wordTimings.length > 0) {
                const vttContent = createWordLevelVTTFromTimings(ttsResult.wordTimings, ttsResult.totalDuration);
                const vttFileName = `sector-content/${contentId}/${uuidv4()}.vtt`;
                vttUrl = await uploadToSupabase(
                    Buffer.from(vttContent, 'utf-8'),
                    vttFileName,
                    'text/vtt',
                    'audio'
                );
            }

            // 8. Update database with audio URLs
            const { error: updateError } = await supabase
                .from('sector_content')
                .update({
                    audio_url: audioUrl,
                    vtt_url: vttUrl,
                    duration_seconds: Math.round(ttsResult.totalDuration),
                    updated_at: new Date().toISOString()
                })
                .eq('id', contentId);

            if (updateError) {
                logger.error('Failed to update content with audio URLs:', updateError);
            }

            logger.info(`✅ TTS generated for content ${contentId}: ${Math.round(ttsResult.totalDuration)}s`);

            return {
                audioUrl,
                vttUrl,
                duration: Math.round(ttsResult.totalDuration),
                cached: false
            };

        } catch (error) {
            logger.error(`Error generating TTS for content ${contentId}:`, error);
            throw error;
        }
    }

    /**
     * Extract speakable text from content
     * Handles different content types (dialogue, article, sentences)
     */
    extractSpeakableText(content) {
        const contentType = content.content_type || 'article';
        let text = '';

        switch (contentType) {
            case 'dialogue':
                // Format dialogue for natural reading
                if (content.dialogue_data?.lines) {
                    text = content.dialogue_data.lines
                        .map(line => `${line.speaker} says: ${line.english}`)
                        .join(' ');
                } else if (content.original_text) {
                    // Parse markdown-style dialogue
                    text = content.original_text
                        .replace(/\*\*([^*]+)\*\*:/g, '$1 says:') // **Speaker:** -> Speaker says:
                        .replace(/---+/g, '') // Remove separators
                        .replace(/\|[^\n]+/g, '') // Remove table rows
                        .replace(/#[^\n]+/g, '') // Remove headers
                        .replace(/\n+/g, ' ')
                        .trim();
                }
                break;

            case 'business_roleplay':
                // Rol tabanlı iş senaryosu - her rolün repliğini birleştir
                if (content.dialogue_data?.dialogue_turns) {
                    text = content.dialogue_data.dialogue_turns
                        .map(turn => `${turn.speaker || 'Speaker'} says: ${turn.english}`)
                        .join(' ... '); // Replikleri ayrı tut
                } else {
                    try {
                        const turns = JSON.parse(content.original_text || '[]');
                        text = turns.map(t => `${t.speaker || 'Speaker'} says: ${t.english}`).join(' ... ');
                    } catch {
                        text = content.original_text || '';
                    }
                }
                break;

            case 'sector_podcast':
                // Podcast transcript'i direkt kullan
                if (content.dialogue_data?.transcript) {
                    text = content.dialogue_data.transcript;
                } else {
                    text = content.original_text || '';
                }
                break;

            case 'essential_sentences':
            case 'sentence_patterns':
                // Parse JSON array of sentences
                try {
                    const sentences = JSON.parse(content.original_text || '[]');
                    if (Array.isArray(sentences)) {
                        text = sentences.map(s => s.en || s.english || s).join('. ');
                    }
                } catch {
                    text = content.original_text || '';
                }
                break;

            case 'email_template':
                // Extract email body
                text = (content.original_text || '')
                    .replace(/Subject:[^\n]+/gi, '')
                    .replace(/```[^`]*```/g, '') // Remove code blocks
                    .replace(/\n+/g, ' ')
                    .trim();
                break;

            default:
                // Article or generic - clean markdown
                text = (content.original_text || '')
                    .replace(/```[^`]*```/g, '') // Remove code blocks
                    .replace(/\|[^\n]+/g, '') // Remove tables
                    .replace(/#[^\n]+/g, '') // Remove headers
                    .replace(/\*+/g, '') // Remove bold/italic markers
                    .replace(/---+/g, '')
                    .replace(/\n+/g, ' ')
                    .trim();
        }

        // Limit length for TTS (max ~4000 chars for reasonable audio length)
        if (text.length > 4000) {
            text = text.substring(0, 4000) + '...';
        }

        return text;
    }

    /**
     * Generate audio for all pending content in a sector
     */
    async generateAudioForSector(sectorId, options = {}) {
        const { limit = 10 } = options;

        try {
            // Get content without audio
            const { data: contents, error } = await supabase
                .from('sector_content')
                .select('id, title')
                .eq('sector_id', sectorId)
                .is('audio_url', null)
                .limit(limit);

            if (error) throw error;

            logger.info(`Found ${contents?.length || 0} contents without audio in sector ${sectorId}`);

            const results = [];
            for (const content of (contents || [])) {
                try {
                    const result = await this.generateAudioForContent(content.id, options);
                    results.push({ id: content.id, title: content.title, ...result });
                } catch (err) {
                    results.push({ id: content.id, title: content.title, error: err.message });
                }
            }

            return results;

        } catch (error) {
            logger.error(`Error generating audio for sector ${sectorId}:`, error);
            throw error;
        }
    }

    /**
     * On-demand TTS - generate audio when user views content
     * Returns existing audio or generates new one
     */
    async getOrGenerateAudio(contentId, options = {}) {
        try {
            // Check for existing audio first
            const { data: content, error } = await supabase
                .from('sector_content')
                .select('audio_url, vtt_url, duration_seconds')
                .eq('id', contentId)
                .single();

            if (error) throw error;

            if (content?.audio_url) {
                return {
                    audioUrl: content.audio_url,
                    vttUrl: content.vtt_url,
                    duration: content.duration_seconds,
                    cached: true
                };
            }

            // Generate on-demand
            return await this.generateAudioForContent(contentId, options);

        } catch (error) {
            logger.error(`Error in getOrGenerateAudio for ${contentId}:`, error);
            throw error;
        }
    }
}

module.exports = new SectorContentTTSService();
