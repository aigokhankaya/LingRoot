const openaiClient = require('../utils/openaiClient');
const logger = require('../utils/logger');

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
                    const { calculateOpenAiCost, logApiCost } = require('../utils/costTracker');
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
}

module.exports = new DirectorAgentService();
