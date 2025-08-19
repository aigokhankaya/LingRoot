// backend/utils/cefrAdapter.js
const OpenAI = require("openai");
require("dotenv").config(); // Ensure environment variables are loaded
const logger = require("./logger"); // Import Winston logger
const fs = require("fs");
const path = require("path");

// Initialize OpenAI client
// Ensure OPENAI_API_KEY is set in the environment (.env file)
let openai;
try {
    if (!process.env.OPENAI_API_KEY) {
        logger.warn("OpenAI API key not found in environment variables (OPENAI_API_KEY). CEFR adaptation will be skipped, returning original text.");
        openai = null;
    } else {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        logger.info("OpenAI client initialized successfully.");
    }
} catch (error) {
    logger.error(`Failed to initialize OpenAI client: ${error.message}`, { stack: error.stack });
    openai = null;
}

/**
 * Adapts the input text to the specified CEFR level using OpenAI API.
 * Uses a more structured prompt based on user feedback.
 * @param {string} text The text to adapt.
 * @param {string} level The target CEFR level (e.g., "A1", "B2").
 * @param {object} requestLogger The request logger object.
 * @returns {Promise<string|null>} The adapted text or null if an error occurs or adaptation is skipped.
 */
async function adaptToCEFR(text, level, requestLogger) {
    if (!openai) {
        logger.error("OpenAI client is not initialized. Skipping CEFR adaptation and returning original text.");
        return text;
    }
    if (!text || !text.trim()) {
        logger.warn("adaptToCEFR received empty or whitespace-only text, returning empty string.");
        return "";
    }
    // Promptu seviyeye göre dosyadan oku
    const promptFile = `cefr_${level.toUpperCase()}.txt`;
    const promptPath = path.join(__dirname, `../prompts/${promptFile}`);
    console.log(`🎯 [CEFR ADAPTER] Using prompt file: ${promptFile} for level: ${level.toUpperCase()}`);
    logger.info(`🎯 CEFR Adapter - Selected prompt file: ${promptFile} for level: ${level.toUpperCase()}`);
    let promptTemplate = fs.readFileSync(promptPath, "utf-8");
    // CHUNK: metni küçük parçalara böl
    const { chunkText } = require('./textProcessor');
    const chunks = chunkText(text);
    let adaptedChunks = [];
    // Track OpenAI usage across chunks (precise sum of all chunks)
    let promptTokensTotal = 0;
    let completionTokensTotal = 0;
    let totalTokensTotal = 0;
    const model = "gpt-4o";
    for (let i = 0; i < chunks.length; i++) {
        const prompt = promptTemplate.replace(/\{\{input_text\}\}/g, chunks[i]);
        logger.info({ promptName: promptFile, promptText: prompt }, 'adaptToCEFR: Kullanılan prompt');
        if (requestLogger) {
            requestLogger.log(`[adaptCEFR:prompt:chunk:${i}][input]` + JSON.stringify({ promptName: promptFile, promptText: prompt }, null, 2));
        }
        try {
            logger.info(`Sending request to OpenAI (model: ${model}) for CEFR level ${level} adaptation.`);
            const completion = await openai.chat.completions.create({
                model,
                messages: [
                    { role: "system", content: "You are a professional English teacher." },
                    { role: "user", content: prompt },
                ],
                temperature: 0.6,
            });
            const adaptedText = completion.choices[0]?.message?.content?.trim();
            // accumulate usage
            if (completion.usage) {
                promptTokensTotal += completion.usage.prompt_tokens || 0;
                completionTokensTotal += completion.usage.completion_tokens || 0;
                totalTokensTotal += completion.usage.total_tokens || 0;
            }
            logger.info(`OpenAI CEFR raw response: ${adaptedText}`);
            if (
                !adaptedText ||
                adaptedText.toLowerCase().includes("please provide the text") ||
                adaptedText.toLowerCase().includes("i'm here to help") ||
                adaptedText.toLowerCase().includes("i can't assist") ||
                adaptedText.toLowerCase().includes("the text is english") ||
                adaptedText.toLowerCase().includes("this text is already simple") ||
                adaptedText.toLowerCase().includes("input is english")
            ) {
                logger.error("OpenAI CEFR adaptation failed or returned trivial response. Returning original text chunk.");
                adaptedChunks.push(chunks[i]);
            } else {
                logger.info("Received adapted text from OpenAI.");
                adaptedChunks.push(adaptedText);
            }
        } catch (error) {
            logger.error(`An error occurred during OpenAI API call: ${error.message}`);
            adaptedChunks.push(chunks[i]);
        }
    }
    const merged = adaptedChunks.join('\n\n');
    const usage = {
        prompt_tokens: promptTokensTotal,
        completion_tokens: completionTokensTotal,
        total_tokens: totalTokensTotal,
    };
    if (requestLogger) {
        requestLogger.log(`[openai:usage:adapt]` + JSON.stringify({ usage, model }));
    }
    return {
        text: merged,
        usage,
        model,
    };
}

module.exports = { adaptToCEFR };

