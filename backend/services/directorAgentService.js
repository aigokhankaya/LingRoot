const openaiClient = require('../utils/ai/openaiClient.js');
const logger = require('../utils/common/logger.js');

/**
 * Director Agent Service
 * 
 * Responsible for analyzing the emotional tone (Mood) of content and 
 * generating appropriate instructions for various "actors" (Narrator, Chat Assistant).
 */
class DirectorAgentService {
    constructor() {
        this.validMoods = [
            'Melancholic',
            'Cheerful',
            'Suspenseful',
            'Educational',
            'Neutral',
            'Inspiring',
            'Urgent',
            'Calm'
        ];
    }

    /**
     * Analyzes the text to determine its dominant emotional tone.
     * @param {string} text - The text to analyze
     * @param {string} userId - Optional user ID for cost tracking
     * @returns {Promise<string>} - The detected mood
     */
    async analyzeMood(text, userId = null) {
        // Load test mock: skip real OpenAI call
        const { isLoadTestMode, getLoadTestDelay } = require('../tests/load/mocks/mockConfig');
        if (isLoadTestMode()) {
            await new Promise(r => setTimeout(r, getLoadTestDelay('director')));
            return 'Neutral';
        }

        // Short circuit for very short text
        if (!text || text.length < 10) return 'Neutral';

        try {
            const truncatedText = text.substring(0, 1000); // Analyze first 1000 chars is enough usually

            const prompt = `
        Analyze the following text and determine the best 'Emotional Tone' or 'Mood' for a narrator/assistant.
        Must be one of: [${this.validMoods.join(', ')}].
        
        Text: "${truncatedText}"
        
        Return ONLY the mood word. Don't add any explanation.
      `;

            const response = await openaiClient.generateChatCompletion([
                { role: 'user', content: prompt }
            ], {
                temperature: 0.3,
                maxTokens: 10,
                model: 'gpt-4o-mini', // Fast and cheap
                systemPrompt: 'You are an emotional analysis engine (Director Agent).'
            });

            // Log cost if userId provided
            if (userId && response.usage) {
                try {
                    const { calculateOpenAiCost, logApiCost } = require('../utils/infra/costTracker.js');
                    const costInfo = calculateOpenAiCost(response.usage, 'gpt-4o-mini');
                    await logApiCost({
                        userId,
                        feature: 'mood_analysis',
                        provider: 'openai',
                        model: 'gpt-4o-mini',
                        inputQuantity: response.usage.prompt_tokens || 0,
                        outputQuantity: response.usage.completion_tokens || 0,
                        costUsd: costInfo.totalCostUsd,
                        metadata: { text_length: text.length },
                    });
                } catch (costErr) {
                    logger.warn('[DirectorAgent] Failed to log mood analysis cost:', costErr?.message);
                }
            }

            let detectedMood = response.content.trim().replace(/[^a-zA-Z]/g, '');

            // Fallback if model returns something random
            if (!this.validMoods.some(m => m.toLowerCase() === detectedMood.toLowerCase())) {
                logger.warn(`[DirectorAgent] Invalid mood detected: '${detectedMood}', defaulting to Neutral.`);
                detectedMood = 'Neutral';
            }

            logger.info(`[DirectorAgent] Analysis result: ${detectedMood}`);
            return detectedMood;

        } catch (error) {
            logger.error('[DirectorAgent] Mood analysis failed:', error);
            return 'Neutral';
        }
    }

    /**
     * Generates a "System Instruction" for an LLM Persona based on the mood.
     * @param {string} mood - The detected mood
     * @param {string} personaType - 'narrator' | 'chat_assistant'
     * @returns {string} - The instruction string
     */
    generatePersonaInstruction(mood, personaType = 'narrator') {
        const m = (mood || 'Neutral').toLowerCase();

        if (personaType === 'narrator') {
            switch (m) {
                case 'melancholic': return `EMOTIONAL TONE: Melancholic. Use a slower pace, softer tone, and frequent pauses (...) to convey sadness or reflection.`;
                case 'cheerful': return `EMOTIONAL TONE: Cheerful. Use an upbeat, energetic rhythm. slightly faster pace, and bright intonation.`;
                case 'suspenseful': return `EMOTIONAL TONE: Suspenseful. Use short, punchy sentences. Lower the pitch slightly. Use silence effectively (...) to build tension.`;
                case 'inspiring': return `EMOTIONAL TONE: Inspiring. Use a confident, powerful, and rising intonation. Emphasize key verbs and nouns.`;
                case 'urgent': return `EMOTIONAL TONE: Urgent. Fast-paced, minimal pauses. Convey a sense of immediate importance.`;
                case 'calm': return `EMOTIONAL TONE: Calm. Smooth, flowing rhythm. Gentle articulation. Avoid sharp changes in pitch.`;
                default: return `EMOTIONAL TONE: Neutral/Educational. Clear, balanced, and professional delivery.`;
            }
        } else if (personaType === 'chat_assistant') {
            switch (m) {
                case 'melancholic': return `User seems to be in a reflective or sad mood. Be empathetic, patient, and deeper in your responses. Avoid being overly cheery.`;
                case 'cheerful': return `User seems happy/energetic. Match their energy! Be enthusiastic, use emojis, and keep the conversation light and fun.`;
                case 'suspenseful': return `The topic is mysterious. Use suspenseful storytelling techniques (short sentences, pauses), but ensure you provide CONCRETE DETAILS or FACTS to anchor the mystery.`;
                case 'inspiring': return `The content is motivating. Be a coach! Use encouraging language ("You can do it!", "Keep going!").`;
                default: return `Maintain a helpful, friendly, and professional assistant persona.`;
            }
        }
        return '';
    }
    /**
     * Analyzes a book chapter to extract deep metadata for audio production.
     * @param {string} text - The chapter text
     * @returns {Promise<Object>} - The analysis result { mood, narrator_tone, key_characters, summary }
     */
    async analyzeChapter(text) {
        // Load test mock: skip real OpenAI call
        const { isLoadTestMode: isLTM3, getLoadTestDelay: gLTD3 } = require('../tests/load/mocks/mockConfig');
        if (isLTM3()) {
            await new Promise(r => setTimeout(r, gLTD3('director')));
            return { mood: 'Neutral', narrator_tone: 'Clear and steady', key_characters: [], summary: 'Mock chapter analysis.' };
        }

        if (!text || text.length < 50) {
            return {
                mood: 'Neutral',
                narrator_tone: 'Clear and steady',
                key_characters: [],
                summary: 'Short content.'
            };
        }

        try {
            // Analyze a significant portion of the text (first 3000 chars) to get the scene setting
            const truncatedText = text.substring(0, 3000);

            const prompt = `
        You are an Audiobook Director. Analyze the following book chapter text to guide the voice actor and production team.

        Text Segment: "${truncatedText}..."

        Output a JSON object with the following fields:
        1. "mood": One word emotion (e.g. Suspenseful, Cheerful, Melancholic, Urgent, Calm, Mysterious).
        2. "narrator_tone": A short instruction for the narrator (e.g. "Whispering and tense", "Bright and energetic", "Deep and authoritative").
        3. "key_characters": A list of strings identifying key characters in this scene and their trait (e.g. ["Alice (Curious)", "Rabbit (Anxious)"]).
        4. "summary": A one-sentence summary of the scene.

        Return ONLY the JSON.
      `;

            const response = await openaiClient.generateChatCompletion([
                { role: 'user', content: prompt }
            ], {
                temperature: 0.3,
                maxTokens: 300,
                model: 'gpt-4o-mini',
                systemPrompt: 'You are an expert Audiobook Director. Output valid JSON only.'
            });

            const content = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(content);

            // Validate fields
            if (!result.mood) result.mood = 'Neutral';
            if (!result.narrator_tone) result.narrator_tone = 'Clear and professional';

            logger.info(`[DirectorAgent] Chapter Analysis: ${JSON.stringify(result)}`);
            return result;

        } catch (error) {
            logger.error('[DirectorAgent] Chapter analysis failed:', error);
            // Fallback
            return {
                mood: 'Neutral',
                narrator_tone: 'Balanced and clear',
                key_characters: [],
                summary: 'Analysis failed.'
            };
        }
    }
    /**
     * Suggests and saves a voice for a book at a specific CEFR level.
     * @param {Object} book - The book object (id, title, subjects)
     * @param {string} level - CEFR level (A1, A2, B1, B2, C1, C2)
     * @param {Object} currentSettings - Current voice_settings JSON
     * @returns {Promise<Object>} - The selected voice config { voice_id, style }
     */
    async suggestAndSaveBookVoice(book, level, currentSettings = {}) {
        try {
            const prompt = `
        You are an Audiobook Casting Director. Cast the perfect voice for this book at CEFR Level ${level}.
        
        Book Title: "${book.title}"
        Subjects: "${book.subjects ? book.subjects.join(', ') : 'General'}"
        Target Level: ${level} (A1=Slow/Clear, C2=Natural/Fast)

        Available Voices:
        - alloy (Neutral, Balanced)
        - echo (Male, Warm)
        - fable (Female, British, Expressive) - Good for fiction/fantasy
        - onyx (Male, Deep, Authoritative) - Good for thriller/history
        - nova (Female, Energetic) - Good for non-fiction/guides
        - shimmer (Female, Calm) - Good for romance/poetry

        Rules:
        - Lower levels (A1-A2) need clearer voices (Alloy, Nova).
        - Higher levels (B2-C2) can use more expressive/accented voices (Fable, Onyx).
        - Match voice to book genre.

        Output JSON:
        {
            "voice_id": "selected_voice_name",
            "style": "description of why"
        }
      `;

            const response = await openaiClient.generateChatCompletion([
                { role: 'user', content: prompt }
            ], {
                temperature: 0.4,
                maxTokens: 100,
                model: 'gpt-4o-mini',
                systemPrompt: 'You are an expert Casting Director. Output JSON only.'
            });

            const content = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
            const selection = JSON.parse(content);

            // Update settings
            const newSettings = { ...currentSettings };
            newSettings[level] = {
                voice_id: selection.voice_id,
                style: selection.style,
                assigned_at: new Date().toISOString()
            };

            // Persist to DB
            const { supabase } = require('../utils/storage/supabaseClient.js');
            await supabase
                .from('books')
                .update({ voice_settings: newSettings })
                .eq('id', book.id);

            logger.info(`[DirectorAgent] 🎬 Casted voice for book "${book.title}" (${level}): ${selection.voice_id}`);

            return newSettings[level];

        } catch (error) {
            logger.error('[DirectorAgent] Voice casting failed:', error);
            // Fallback default
            return { voice_id: 'alloy', style: 'Fallback default' };
        }
    }
}

module.exports = new DirectorAgentService();
