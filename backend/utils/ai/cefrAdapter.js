// backend/utils/cefrAdapter.js
const OpenAI = require("openai");
require("dotenv").config(); // Ensure environment variables are loaded
const logger = require('../common/logger.js'); // Import Winston logger
const fs = require("fs");
const path = require("path");
const { logApiCost, calculateOpenAiCost } = require('../infra/costTracker.js');

// Initialize OpenAI client
// Ensure OPENAI_API_KEY is set in the environment (.env file)
let openai;
try {
    const apiKeyRaw = process.env.OPENAI_API_KEY || '';
    const apiKey = apiKeyRaw.trim().replace(/^['"]|['"]$/g, '');
    if (!apiKey) {
        logger.warn("OpenAI API key not found in environment variables (OPENAI_API_KEY). CEFR adaptation will be skipped, returning original text.");
        openai = null;
    } else {
        if (process.env.NODE_ENV === 'development') {
            logger.info(`[ENV CHECK] OpenAI key suffix: ${apiKey.slice(-6)} (len=${apiKey.length})`);
        }
        openai = new OpenAI({ apiKey });
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
async function adaptToCEFR(text, level, requestLogger, userId) {
    // Load test mock: skip real OpenAI call
    const { isLoadTestMode, getLoadTestDelay } = require('../../tests/load/mocks/mockConfig');
    if (isLoadTestMode()) {
        const { MOCK_ADAPTED_TEXT, MOCK_USAGE } = require('../../tests/load/mocks/openaiMock');
        await new Promise(r => setTimeout(r, getLoadTestDelay('openai')));
        const model = process.env.OPENAI_CEFR_MODEL || 'gpt-4-turbo';
        return { text: MOCK_ADAPTED_TEXT, usage: MOCK_USAGE, model };
    }

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
    const promptPath = path.join(__dirname, `../../prompts/legacy/${promptFile}`);
    logger.info(`[CEFR_ADAPTER] Using prompt file: ${promptFile} for level: ${level.toUpperCase()}`);
    let promptTemplate = fs.readFileSync(promptPath, "utf-8");
    // CHUNK: metni küçük parçalara böl
    const { chunkText } = require('../content/textProcessor.js');
    const chunks = chunkText(text);
    let adaptedChunks = [];
    // Track OpenAI usage across chunks (precise sum of all chunks)
    let promptTokensTotal = 0;
    let completionTokensTotal = 0;
    let totalTokensTotal = 0;
    // Use GPT-4-Turbo for CEFR adaptations (A1-C2)
    const model = process.env.OPENAI_CEFR_MODEL || "gpt-4-turbo";
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
            let adaptedText = completion.choices[0]?.message?.content?.trim();
            // Remove any leading/trailing --- markers that OpenAI might add
            adaptedText = adaptedText.replace(/^-+\s*/g, '').replace(/\s*-+$/g, '');
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
    if (logger.llmCall) {
        logger.llmCall({
            scope: 'adaptToCEFR',
            step: 'summary',
            model,
            promptName: promptFile,
            level,
            provider: 'openai',
            tokens: usage,
            note: 'cefrAdapter summary',
        });
    }
    if (userId) {
        const cost = calculateOpenAiCost(usage, model);
        logApiCost({
            userId,
            feature: 'cefr_adapt',
            provider: 'openai',
            model,
            inputQuantity: cost.promptTokens,
            outputQuantity: cost.completionTokens,
            costUsd: cost.totalCostUsd,
        }).catch(err => logger.warn('[COST] cefr_adapt log failed:', err.message));
    }
    return {
        text: merged,
        usage,
        model,
    };
}

module.exports = { adaptToCEFR };

