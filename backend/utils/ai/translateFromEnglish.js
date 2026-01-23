// backend/utils/translateFromEnglish.js
const OpenAI = require("openai");
require("dotenv").config();
const logger = require('../common/logger.js');
const fs = require("fs");
const path = require("path");

// Initialize OpenAI client
let openai;
try {
    const apiKeyRaw = process.env.OPENAI_API_KEY || '';
    const apiKey = apiKeyRaw.trim().replace(/^['"]|['"]$/g, '');
    if (!apiKey) {
        logger.warn("OpenAI API key not found. Translation from English will fail.");
        openai = null;
    } else {
        openai = new OpenAI({ apiKey });
        logger.info("OpenAI client initialized for English-to-target-language translation.");
    }
} catch (error) {
    logger.error(`Failed to initialize OpenAI client: ${error.message}`);
    openai = null;
}

/**
 * Translates English text to input language while maintaining CEFR level.
 * Uses translate_from_english_{level}.txt prompts.
 * @param {string} englishText - The English text to translate
 * @param {string} inputLanguage - The input language (e.g., "Turkish", "Spanish")
 * @param {string} level - The CEFR level (A1, A2, B1, B2, C1, C2)
 * @param {object} requestLogger - Optional request logger
 * @returns {Promise<{text: string, usage: object, model: string}>} - Translated text with usage stats
 */
async function translateFromEnglish(englishText, inputLanguage, level, requestLogger) {
    if (!openai) {
        logger.error("OpenAI client is not initialized. Cannot translate.");
        throw new Error("OpenAI client not initialized");
    }
    if (!englishText || !englishText.trim()) {
        logger.warn("translateFromEnglish received empty text, returning empty string.");
        return { text: "", usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, model: "" };
    }

    // Select prompt file based on level
    const promptFile = `translate_from_english_${level.toUpperCase()}.txt`;
    const promptPath = path.join(__dirname, `../../prompts/content/${promptFile}`);

    console.log(`🎯 [TRANSLATE FROM ENGLISH] Using prompt file: ${promptFile} for ${inputLanguage} (Level: ${level})`);
    logger.info(`🎯 Translate From English - Selected prompt file: ${promptFile} for input language: ${inputLanguage} (Level: ${level})`);

    let promptTemplate;
    try {
        promptTemplate = fs.readFileSync(promptPath, "utf-8");
    } catch (error) {
        logger.error(`Failed to read prompt file ${promptFile}: ${error.message}`);
        throw new Error(`Prompt file not found: ${promptFile}`);
    }

    // Chunk text if needed
    const { chunkText } = require('../content/textProcessor.js');
    const chunks = chunkText(englishText);
    let translatedChunks = [];

    // Track OpenAI usage across chunks
    let promptTokensTotal = 0;
    let completionTokensTotal = 0;
    let totalTokensTotal = 0;

    // Use GPT-4o for translation
    const model = process.env.OPENAI_TRANSLATION_MODEL || "gpt-4o";

    for (let i = 0; i < chunks.length; i++) {
        const prompt = promptTemplate
            .replace(/\{\{input_text\}\}/g, chunks[i])
            .replace(/\{\{input_language\}\}/g, inputLanguage);

        logger.info({ promptName: promptFile, promptText: prompt }, 'translateFromEnglish: Using prompt');

        if (requestLogger) {
            requestLogger.log(`[translateFromEnglish:prompt:chunk:${i}][input]` + JSON.stringify({
                promptName: promptFile,
                promptText: prompt
            }, null, 2));
        }

        try {
            logger.info(`Sending request to OpenAI (model: ${model}) for translation to ${inputLanguage} at ${level} level.`);
            const completion = await openai.chat.completions.create({
                model,
                messages: [
                    { role: "system", content: `You are a professional translator specializing in CEFR ${level} level ${inputLanguage}.` },
                    { role: "user", content: prompt },
                ],
                temperature: 0.3,
            });

            let translatedText = completion.choices[0]?.message?.content?.trim();
            // Remove any leading/trailing markers
            translatedText = translatedText.replace(/^-+\s*/g, '').replace(/\s*-+$/g, '');

            // Accumulate usage
            if (completion.usage) {
                promptTokensTotal += completion.usage.prompt_tokens || 0;
                completionTokensTotal += completion.usage.completion_tokens || 0;
                totalTokensTotal += completion.usage.total_tokens || 0;
            }

            logger.info(`OpenAI translation response: ${translatedText.substring(0, 200)}...`);

            if (!translatedText || translatedText.length < 10) {
                logger.error("OpenAI translation failed or returned too short text. Using original chunk.");
                translatedChunks.push(chunks[i]);
            } else {
                logger.info("Received translated text from OpenAI.");
                translatedChunks.push(translatedText);
            }
        } catch (error) {
            logger.error(`Error during OpenAI API call: ${error.message}`);
            translatedChunks.push(chunks[i]); // Fallback to original
        }
    }

    const merged = translatedChunks.join('\n\n');
    const usage = {
        prompt_tokens: promptTokensTotal,
        completion_tokens: completionTokensTotal,
        total_tokens: totalTokensTotal,
    };

    if (requestLogger) {
        requestLogger.log(`[openai:usage:translateFromEnglish]` + JSON.stringify({ usage, model }));
    }

    return {
        text: merged,
        usage,
        model,
    };
}

module.exports = { translateFromEnglish };
