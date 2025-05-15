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
    let promptTemplate = fs.readFileSync(promptPath, "utf-8");
    // Değişkenleri yerleştir
    const prompt = promptTemplate.replace(/\{\{input_text\}\}/g, text);
    // Hem ana loga hem de request loguna yaz
    logger.info({ promptName: promptFile, promptText: prompt }, 'adaptToCEFR: Kullanılan prompt');
    if (requestLogger) {
        requestLogger.log(`[adaptCEFR:prompt]\n${JSON.stringify({ promptName: promptFile, promptText: prompt }, null, 2)}`);
    }
    try {
        logger.info(`Sending request to OpenAI (model: gpt-4o) for CEFR level ${level} adaptation.`);
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a professional English teacher." },
                { role: "user", content: prompt },
            ],
            temperature: 0.6,
        });
        const adaptedText = completion.choices[0]?.message?.content?.trim();
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
            logger.error("OpenAI CEFR adaptation failed or returned trivial response. Returning original text.");
            return text;
        } else {
            logger.info("Received adapted text from OpenAI.");
            return adaptedText;
        }
    } catch (error) {
        logger.error(`An error occurred during OpenAI API call: ${error.message}`);
        return text;
    }
}

module.exports = { adaptToCEFR };

