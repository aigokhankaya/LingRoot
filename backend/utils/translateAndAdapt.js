// backend/utils/translateAndAdapt.js
// Optimized: Single LLM call for translation + CEFR adaptation
const OpenAI = require("openai");
require("dotenv").config();
const logger = require("./logger");
const fs = require("fs");
const path = require("path");
const { chunkText } = require('./textProcessor');
const promptService = require('./promptService');

// Initialize OpenAI client
let openai;
try {
    const apiKeyRaw = process.env.OPENAI_API_KEY || '';
    const apiKey = apiKeyRaw.trim().replace(/^['"]|['"]$/g, '');
    if (!apiKey) {
        logger.warn("[TranslateAndAdapt] OpenAI API key not found.");
        openai = null;
    } else {
        openai = new OpenAI({ apiKey });
        logger.info("[TranslateAndAdapt] OpenAI client initialized.");
    }
} catch (error) {
    logger.error(`[TranslateAndAdapt] Failed to initialize OpenAI client: ${error.message}`);
    openai = null;
}

/**
 * OPTIMIZED: Translates text to English AND adapts to CEFR level in a SINGLE LLM call.
 * Replaces the old 2-step process: translateToEnglish → adaptToCEFR
 * 
 * Token savings: ~43% compared to 2 separate calls
 * 
 * @param {string} text - Source text in any language
 * @param {string} sourceLanguage - Source language (e.g., "Turkish", "Spanish")
 * @param {string} level - Target CEFR level (A1, A2, B1, B2, C1, C2)
 * @param {object} requestLogger - Optional request logger
 * @param {string} promptVariant - Optional prompt variant: 'standard' (default) or 'narrator' (for audiobook/book content)
 * @param {string} mood - Optional mood for narrator adaptation (e.g. "Melancholic", "Cheerful")
 * @returns {Promise<{text: string, usage: object, model: string}>}
 */
async function translateAndAdaptToCEFR(text, sourceLanguage, level, requestLogger, promptVariant = 'standard', mood = null) {
    if (!openai) {
        logger.error("[TranslateAndAdapt] OpenAI client not initialized.");
        throw new Error("OpenAI client not initialized");
    }

    if (!text || !text.trim()) {
        logger.warn("[TranslateAndAdapt] Empty text received.");
        return { text: "", usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, model: "" };
    }

    // Select unified prompt template based on variant
    const isNarrator = promptVariant === 'narrator';
    const templateName = isNarrator
        ? 'cefr/translate_adapt_narrator'
        : 'cefr/translate_adapt';

    // For logging compatibility
    const promptFile = templateName;

    // HYBRID MODEL STRATEGY: Use mini for simple levels, 4o for complex levels
    const isSimpleLevel = ['A1', 'A2', 'B1'].includes(level.toUpperCase());
    const model = process.env.OPENAI_TRANSLATE_ADAPT_MODEL || (isSimpleLevel ? "gpt-4o-mini" : "gpt-4o");

    console.log(`🎯 [TRANSLATE+ADAPT OPTIMIZED] Using template: ${templateName} (Level: ${level})`);
    if (mood) console.log(`🎭 [MOOD ADAPTATION] Applying emotional tone: ${mood}`);

    logger.info(`🎯 TranslateAndAdapt - Template: ${templateName} for ${sourceLanguage} → EN at ${level}${mood ? ` [Mood: ${mood}]` : ''}`);
    console.log(`🧠 [MODEL SELECTION] Level: ${level}, Variant: ${promptVariant} -> Selected Model: ${model} (${isSimpleLevel ? 'Cost Optimized' : 'Quality Optimized'})`);

    // Chunk text if needed
    const chunks = chunkText(text);
    let resultChunks = [];

    // Track usage
    let promptTokensTotal = 0;
    let completionTokensTotal = 0;
    let totalTokensTotal = 0;

    for (let i = 0; i < chunks.length; i++) {
        // Generate prompt using PromptService
        let prompt;
        try {
            prompt = promptService.getPrompt(templateName, {
                sourceLanguage,
                level: level.toUpperCase(),
                input_text: chunks[i]
            });
        } catch (error) {
            logger.error(`[TranslateAndAdapt] Prompt generation failed: ${error.message}`);
            // Fallback to simple string if template fails (failsafe)
            prompt = `Translate to English (Level ${level}):\n${chunks[i]}`;
        }

        if (requestLogger) {
            requestLogger.log(`[translateAndAdapt:prompt:chunk:${i}][input]` + JSON.stringify({
                promptName: promptFile,
                promptText: prompt.substring(0, 500) + '...'
            }, null, 2));
        }

        try {
            logger.info(`[TranslateAndAdapt] Processing chunk ${i + 1}/${chunks.length} with ${model}`);
            if (logger.llmCall) {
                logger.llmCall({
                    scope: 'translateAndAdapt',
                    step: `chunk_${i + 1}/${chunks.length}`,
                    model,
                    promptName: promptFile,
                    level,
                    provider: 'openai',
                    note: 'translate+adapt chunk',
                });
            }
            // System message varies based on variant
            let systemContent = isNarrator
                ? `You are a professional audiobook narrator and CEFR language specialist. You translate text AND adapt it to CEFR ${level} level while maintaining an engaging, storyteller-style delivery suitable for audiobook listening. Create natural rhythm, use dramatic pauses, and make the content captivating for listeners.`
                : `You are an expert translator and CEFR language specialist. You translate text AND adapt it to CEFR ${level} level in a single pass, ensuring vocabulary and grammar strictly match the target level.`;

            // Inject Mood Instruction if available
            if (isNarrator && mood && mood !== 'Neutral') {
                systemContent += `\n\nEMOTIONAL TONE INSTRUCTION: The desired tone for this section is "${mood}". Adjust your word choice, sentence structure, and punctuation to reflect this emotion (e.g., if "Melancholic", use slower pacing and softer words; if "Suspenseful", use short sentences and eliipsis).`;
            }

            const completion = await openai.chat.completions.create({
                model,
                messages: [
                    {
                        role: "system",
                        content: systemContent
                    },
                    { role: "user", content: prompt }
                ],
                temperature: isNarrator ? 0.5 : 0.4, // Slightly higher for narrator to allow creative flow
            });

            let resultText = completion.choices[0]?.message?.content?.trim() || "";
            // Clean markers
            resultText = resultText.replace(/^-+\s*/g, '').replace(/\s*-+$/g, '');

            // Accumulate usage
            if (completion.usage) {
                promptTokensTotal += completion.usage.prompt_tokens || 0;
                completionTokensTotal += completion.usage.completion_tokens || 0;
                totalTokensTotal += completion.usage.total_tokens || 0;
            }

            if (!resultText || resultText.length < 10) {
                logger.warn(`[TranslateAndAdapt] Chunk ${i + 1} result too short, using original.`);
                resultChunks.push(chunks[i]);
            } else {
                resultChunks.push(resultText);
            }

        } catch (error) {
            logger.error(`[TranslateAndAdapt] Error on chunk ${i + 1}: ${error.message}`);
            resultChunks.push(chunks[i]); // Fallback to original
        }
    }

    const merged = resultChunks.join('\n\n');
    const usage = {
        prompt_tokens: promptTokensTotal,
        completion_tokens: completionTokensTotal,
        total_tokens: totalTokensTotal,
    };

    // Log savings estimate
    const estimatedOldTokens = totalTokensTotal * 1.75; // Old method used ~75% more tokens
    const savedTokens = Math.round(estimatedOldTokens - totalTokensTotal);
    console.log(`💰 [TOKEN SAVINGS] Estimated savings: ~${savedTokens} tokens (${Math.round(savedTokens / estimatedOldTokens * 100)}%)`);

    if (logger.llmCall) {
        logger.llmCall({
            scope: 'translateAndAdapt',
            step: 'summary',
            model,
            promptName: promptFile,
            level,
            provider: 'openai',
            tokens: usage,
            note: 'translate+adapt summary',
        });
    }

    if (requestLogger) {
        requestLogger.log(`[openai:usage:translateAndAdapt]` + JSON.stringify({ usage, model, savedTokens }));
    }

    return {
        text: merged,
        usage,
        model,
    };
}

/**
 * Calculate target word count based on duration in minutes
 * Average speaking rate for language learners: ~150 WPM
 * @param {number} durationMinutes - Target duration (1.5, 5, 10, 15)
 * @returns {{min: number, max: number, target: number}}
 */
function calculateWordCountFromDuration(durationMinutes) {
    const WPM = 150; // Words per minute for clear, learner-friendly speech
    const target = Math.round(durationMinutes * WPM);
    const tolerance = 0.15; // ±15% tolerance
    return {
        min: Math.round(target * (1 - tolerance)),
        max: Math.round(target * (1 + tolerance)),
        target: target
    };
}

/**
 * OPTIMIZED: Generates bilingual content (English + target language) in a SINGLE LLM call.
 * Replaces the old 2-step process: generateEnglish → translateToTarget
 * 
 * Token savings: ~33-47% compared to 2 separate calls
 * 
 * @param {string} topic - Topic to generate content about
 * @param {string} targetLanguage - Target language for translation (e.g., "Turkish")
 * @param {string} level - CEFR level (A1, A2, B1, B2, C1, C2)
 * @param {object} requestLogger - Optional request logger
 * @param {number} targetDurationMinutes - Optional target duration in minutes (1.5, 5, 10, 15)
 * @param {string} mood - Optional mood for content generation (e.g. "Melancholic", "Cheerful")
 * @param {string[]} forbiddenOpenings - Optional list of opening sentences to avoid (for sibling variety)
 * @returns {Promise<{englishText: string, translatedText: string, usage: object, model: string}>}
 */
async function generateBilingualContent(topic, targetLanguage, level, requestLogger, targetDurationMinutes = null, mood = null, forbiddenOpenings = []) {
    if (!openai) {
        logger.error("[GenerateBilingual] OpenAI client not initialized.");
        throw new Error("OpenAI client not initialized");
    }

    if (!topic || !topic.trim()) {
        logger.warn("[GenerateBilingual] Empty topic received.");
        return {
            englishText: "",
            translatedText: "",
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            model: ""
        };
    }

    // Generate Prompt using PromptService
    // Replaces manual file reading and string replacement

    // Calculate word count based on duration if specified
    let durationOverride = '';
    if (targetDurationMinutes && targetDurationMinutes > 0) {
        const wordCount = calculateWordCountFromDuration(targetDurationMinutes);
        durationOverride = `⚠️ CRITICAL DURATION OVERRIDE:\n- Target audio duration: ${targetDurationMinutes} minutes\n- REQUIRED word count: ${wordCount.target} words per language (±15% tolerance: ${wordCount.min}-${wordCount.max} words)\n- This OVERRIDES the default "Length" requirement.\n- Generate EXACTLY this amount of content.`;
        console.log(`⏱️ [DURATION] Target: ${targetDurationMinutes} min → ${wordCount.target} words`);
    }

    let prompt;
    try {
        // Build forbidden openings string for variety enforcement
        const forbiddenStr = forbiddenOpenings && forbiddenOpenings.length > 0
            ? forbiddenOpenings.join('\n- ')
            : null;

        prompt = promptService.getPrompt('content/bilingual', {
            topic,
            targetLanguage,
            level: level.toUpperCase(),
            durationOverride,
            forbiddenOpenings: forbiddenStr
        });
    } catch (error) {
        logger.error(`[GenerateBilingual] Prompt generation failed: ${error.message}`);
        throw error;
    }

    const promptFile = 'content/bilingual'; // For logging consistency

    if (requestLogger) {
        requestLogger.log(`[generateBilingual:prompt][input]` + JSON.stringify({
            promptName: promptFile,
            topic,
            targetLanguage,
            level
        }, null, 2));
    }

    // HYBRID MODEL STRATEGY: Use mini for simple levels, 4o for complex levels.
    // For long-duration content (>= 10 minutes), prefer full gpt-4o for better instruction-following.
    const isSimpleLevel = ['A1', 'A2', 'B1'].includes(level.toUpperCase());
    const isLongDuration = targetDurationMinutes && targetDurationMinutes >= 10;
    let model = process.env.OPENAI_BILINGUAL_MODEL;
    if (!model) {
        if (isLongDuration) {
            model = "gpt-4o";
        } else {
            model = isSimpleLevel ? "gpt-4o-mini" : "gpt-4o";
        }
    }

    const modelMode = isLongDuration ? 'Long-Form Precision' : (isSimpleLevel ? 'Cost Optimized' : 'Quality Optimized');
    console.log(`🧠 [MODEL SELECTION] Level: ${level}, Duration: ${targetDurationMinutes || 'n/a'} -> Selected Model: ${model} (${modelMode})`);

    // Lower temperature for long-form generations to follow word-count constraints more strictly
    const baseTemperature = (targetDurationMinutes && targetDurationMinutes >= 10) ? 0.3 : 0.7;

    try {
        logger.info(`[GenerateBilingual] Generating bilingual content with ${model}`);
        if (logger.llmCall) {
            logger.llmCall({
                scope: 'generateBilingual',
                step: 'call',
                model,
                promptName: promptFile,
                level,
                provider: 'openai',
                note: `topic="${topic}" → EN + ${targetLanguage}`,
            });
        }

        // Build a strong system message. If duration/word-count override is present, enforce it explicitly.
        let systemMessage = `You are an expert content creator specializing in CEFR ${level} level educational materials. You create identical content in both English and ${targetLanguage}, ensuring both versions strictly match the ${level} vocabulary and grammar requirements.`;

        // Inject Mood Instruction if available
        if (mood && mood !== 'Neutral') {
            systemMessage += `\n\nEMOTIONAL TONE INSTRUCTION: The desired tone for this story/article is "${mood}". Adjust your vocabulary, sentence flow, and narrative style to reflect this emotion (e.g. "Suspenseful" -> shorter sentences, mystery; "Cheerful" -> upbeat words, energetic flow).`;
        }

        if (targetDurationMinutes && targetDurationMinutes > 0) {
            const wc = calculateWordCountFromDuration(targetDurationMinutes);
            systemMessage += ` The user prompt may include a CRITICAL DURATION OVERRIDE section specifying a REQUIRED word-count range for each language (target ≈ ${wc.target} words, allowed range ${wc.min}-${wc.max}). You MUST keep BOTH the English and ${targetLanguage} texts strictly inside this word-count range. If you reach the end of the content and are still below ${wc.min} words in either language, you MUST keep expanding with new, non-repetitive paragraphs until you are inside the range. Treat generating fewer than ${wc.min} words as a hard failure and never stop early even if the story feels complete or other instructions suggest a shorter length.`;
        }

        const completion = await openai.chat.completions.create({
            model,
            messages: [
                {
                    role: "system",
                    content: systemMessage
                },
                { role: "user", content: prompt }
            ],
            temperature: baseTemperature,
            response_format: { type: "json_object" }, // Force JSON output
        });

        const rawResponse = completion.choices[0]?.message?.content?.trim() || "{}";

        // Parse JSON response
        let parsed;
        try {
            parsed = JSON.parse(rawResponse);
        } catch (parseError) {
            logger.error(`[GenerateBilingual] JSON parse error: ${parseError.message}`);
            // Try to extract content manually
            const englishMatch = rawResponse.match(/"english_text"\s*:\s*"([^"]+)"/s);
            const translatedMatch = rawResponse.match(/"translated_text"\s*:\s*"([^"]+)"/s);
            parsed = {
                english_text: englishMatch ? englishMatch[1] : "",
                translated_text: translatedMatch ? translatedMatch[1] : ""
            };
        }

        const englishText = parsed.english_text || "";
        const translatedText = parsed.translated_text || "";

        // If duration/word-count override is active, log actual word counts vs target for calibration
        if (targetDurationMinutes && targetDurationMinutes > 0) {
            const targetWords = calculateWordCountFromDuration(targetDurationMinutes);
            const englishWordCount = englishText.split(/\s+/).filter(Boolean).length;
            const translatedWordCount = translatedText.split(/\s+/).filter(Boolean).length;
            logger.info(`[GenerateBilingual] DURATION ANALYTICS → target ${targetDurationMinutes} min ⇒ ${targetWords.target} words (${targetWords.min}-${targetWords.max}). Actual: EN=${englishWordCount} words, ${targetLanguage}=${translatedWordCount} words.`);
        }

        const usage = completion.usage ? {
            prompt_tokens: completion.usage.prompt_tokens || 0,
            completion_tokens: completion.usage.completion_tokens || 0,
            total_tokens: completion.usage.total_tokens || 0,
        } : { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

        // Log savings estimate
        const estimatedOldTokens = usage.total_tokens * 1.5; // Old method used ~50% more tokens
        const savedTokens = Math.round(estimatedOldTokens - usage.total_tokens);
        console.log(`💰 [TOKEN SAVINGS] Estimated savings: ~${savedTokens} tokens (${Math.round(savedTokens / estimatedOldTokens * 100)}%)`);

        if (logger.llmCall) {
            logger.llmCall({
                scope: 'generateBilingual',
                step: 'summary',
                model,
                promptName: promptFile,
                level,
                provider: 'openai',
                tokens: usage,
                note: 'generateBilingual summary',
            });
        }

        if (requestLogger) {
            requestLogger.log(`[openai:usage:generateBilingual]` + JSON.stringify({ usage, model, savedTokens }));
        }

        return {
            englishText,
            translatedText,
            usage,
            model,
        };

    } catch (error) {
        logger.error(`[GenerateBilingual] Error: ${error.message}`);
        throw error;
    }
}

module.exports = {
    translateAndAdaptToCEFR,
    generateBilingualContent,
    calculateWordCountFromDuration
};
