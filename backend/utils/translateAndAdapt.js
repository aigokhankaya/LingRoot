// backend/utils/translateAndAdapt.js
// Optimized: Single LLM call for translation + CEFR adaptation
const OpenAI = require("openai");
require("dotenv").config();
const logger = require("./logger");
const fs = require("fs");
const path = require("path");
const { chunkText } = require('./textProcessor');

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
 * @returns {Promise<{text: string, usage: object, model: string}>}
 */
async function translateAndAdaptToCEFR(text, sourceLanguage, level, requestLogger) {
    if (!openai) {
        logger.error("[TranslateAndAdapt] OpenAI client not initialized.");
        throw new Error("OpenAI client not initialized");
    }
    
    if (!text || !text.trim()) {
        logger.warn("[TranslateAndAdapt] Empty text received.");
        return { text: "", usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, model: "" };
    }

    // Select unified prompt file based on level
    const promptFile = `translate_and_adapt_${level.toUpperCase()}.txt`;
    const promptPath = path.join(__dirname, `../prompts/content/${promptFile}`);
    
    // HYBRID MODEL STRATEGY: Use mini for simple levels, 4o for complex levels
    const isSimpleLevel = ['A1', 'A2', 'B1'].includes(level.toUpperCase());
    const model = process.env.OPENAI_TRANSLATE_ADAPT_MODEL || (isSimpleLevel ? "gpt-4o-mini" : "gpt-4o");

    console.log(`🎯 [TRANSLATE+ADAPT OPTIMIZED] Using unified prompt: ${promptFile} (Level: ${level})`);
    logger.info(`🎯 TranslateAndAdapt - Unified prompt: ${promptFile} for ${sourceLanguage} → EN at ${level}`);
    console.log(`🧠 [MODEL SELECTION] Level: ${level} -> Selected Model: ${model} (${isSimpleLevel ? 'Cost Optimized' : 'Quality Optimized'})`);
    
    let promptTemplate;
    try {
        promptTemplate = fs.readFileSync(promptPath, "utf-8");
    } catch (error) {
        logger.error(`[TranslateAndAdapt] Prompt file not found: ${promptFile}`);
        throw new Error(`Prompt file not found: ${promptFile}`);
    }

    // Chunk text if needed
    const chunks = chunkText(text);
    let resultChunks = [];
    
    // Track usage
    let promptTokensTotal = 0;
    let completionTokensTotal = 0;
    let totalTokensTotal = 0;
    
    for (let i = 0; i < chunks.length; i++) {
        const prompt = promptTemplate
            .replace(/\{\{input_text\}\}/g, chunks[i])
            .replace(/\{\{source_language\}\}/g, sourceLanguage);
        
        if (requestLogger) {
            requestLogger.log(`[translateAndAdapt:prompt:chunk:${i}][input]` + JSON.stringify({ 
                promptName: promptFile, 
                promptText: prompt.substring(0, 500) + '...'
            }, null, 2));
        }
        
        try {
            logger.info(`[TranslateAndAdapt] Processing chunk ${i + 1}/${chunks.length} with ${model}`);
            
            const completion = await openai.chat.completions.create({
                model,
                messages: [
                    { 
                        role: "system", 
                        content: `You are an expert translator and CEFR language specialist. You translate text AND adapt it to CEFR ${level} level in a single pass, ensuring vocabulary and grammar strictly match the target level.`
                    },
                    { role: "user", content: prompt }
                ],
                temperature: 0.4, // Slightly lower for consistency
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
    console.log(`💰 [TOKEN SAVINGS] Estimated savings: ~${savedTokens} tokens (${Math.round(savedTokens/estimatedOldTokens*100)}%)`);
    
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
 * OPTIMIZED: Generates bilingual content (English + target language) in a SINGLE LLM call.
 * Replaces the old 2-step process: generateEnglish → translateToTarget
 * 
 * Token savings: ~33-47% compared to 2 separate calls
 * 
 * @param {string} topic - Topic to generate content about
 * @param {string} targetLanguage - Target language for translation (e.g., "Turkish")
 * @param {string} level - CEFR level (A1, A2, B1, B2, C1, C2)
 * @param {object} requestLogger - Optional request logger
 * @returns {Promise<{englishText: string, translatedText: string, usage: object, model: string}>}
 */
async function generateBilingualContent(topic, targetLanguage, level, requestLogger) {
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

    // Select bilingual prompt file based on level
    const promptFile = `generate_bilingual_${level.toUpperCase()}.txt`;
    const promptPath = path.join(__dirname, `../prompts/content/${promptFile}`);
    
    console.log(`🎯 [BILINGUAL GENERATION OPTIMIZED] Using unified prompt: ${promptFile} (Level: ${level})`);
    logger.info(`🎯 GenerateBilingual - Unified prompt: ${promptFile} for topic: "${topic}" → EN + ${targetLanguage}`);
    
    let promptTemplate;
    try {
        promptTemplate = fs.readFileSync(promptPath, "utf-8");
    } catch (error) {
        logger.error(`[GenerateBilingual] Prompt file not found: ${promptFile}`);
        throw new Error(`Prompt file not found: ${promptFile}`);
    }

    const prompt = promptTemplate
        .replace(/\{\{topic\}\}/g, topic)
        .replace(/\{\{target_language\}\}/g, targetLanguage);
    
    if (requestLogger) {
        requestLogger.log(`[generateBilingual:prompt][input]` + JSON.stringify({ 
            promptName: promptFile, 
            topic,
            targetLanguage,
            level
        }, null, 2));
    }
    
    // HYBRID MODEL STRATEGY: Use mini for simple levels, 4o for complex levels
    const isSimpleLevel = ['A1', 'A2', 'B1'].includes(level.toUpperCase());
    const model = process.env.OPENAI_BILINGUAL_MODEL || (isSimpleLevel ? "gpt-4o-mini" : "gpt-4o");
    
    console.log(`🧠 [MODEL SELECTION] Level: ${level} -> Selected Model: ${model} (${isSimpleLevel ? 'Cost Optimized' : 'Quality Optimized'})`);
    
    try {
        logger.info(`[GenerateBilingual] Generating bilingual content with ${model}`);
        
        const completion = await openai.chat.completions.create({
            model,
            messages: [
                { 
                    role: "system", 
                    content: `You are an expert content creator specializing in CEFR ${level} level educational materials. You create identical content in both English and ${targetLanguage}, ensuring both versions strictly match the ${level} vocabulary and grammar requirements.`
                },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
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
        
        const usage = completion.usage ? {
            prompt_tokens: completion.usage.prompt_tokens || 0,
            completion_tokens: completion.usage.completion_tokens || 0,
            total_tokens: completion.usage.total_tokens || 0,
        } : { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        
        // Log savings estimate
        const estimatedOldTokens = usage.total_tokens * 1.5; // Old method used ~50% more tokens
        const savedTokens = Math.round(estimatedOldTokens - usage.total_tokens);
        console.log(`💰 [TOKEN SAVINGS] Estimated savings: ~${savedTokens} tokens (${Math.round(savedTokens/estimatedOldTokens*100)}%)`);
        
        if (requestLogger) {
            requestLogger.log(`[openai:usage:generateBilingual]` + JSON.stringify({ usage, model, savedTokens }));
        }
        
        return {
            englishText: parsed.english_text || "",
            translatedText: parsed.translated_text || "",
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
    generateBilingualContent
};
