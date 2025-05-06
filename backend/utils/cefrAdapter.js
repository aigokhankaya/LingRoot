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
 * @returns {Promise<string|null>} The adapted text or null if an error occurs or adaptation is skipped.
 */
async function adaptToCEFR(text, level) {
    if (!openai) {
        logger.error("OpenAI client is not initialized. Skipping CEFR adaptation and returning original text.");
        return text; // Return original text if OpenAI is not available
    }

    if (!text || !text.trim()) {
        logger.warn("adaptToCEFR received empty or whitespace-only text, returning empty string.");
        return "";
    }

    // Promptu seviyeye göre dosyadan oku
    const promptPath = path.join(__dirname, `../prompts/cefr_${level.toUpperCase()}.txt`);
    let promptTemplate = fs.readFileSync(promptPath, "utf-8");
    // Değişkenleri yerleştir
    const prompt = promptTemplate.replace(/\{\{text\}\}/g, text);

    try {
        logger.info(`Sending request to OpenAI (model: gpt-4o) for CEFR level ${level} adaptation.`);
        logger.debug(`OpenAI Prompt (first 200 chars): ${prompt.substring(0, 200)}...`); // Log beginning of prompt for debugging

        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // Consider gpt-4o for potentially better adherence to complex rules
            messages: [
                { role: "system", content: "You are a CEFR-aligned English language assistant following strict formatting and content preservation rules. Preserve all paragraph breaks and sentence structures exactly." },
                { role: "user", content: prompt },
            ],
            temperature: 0.5, // Lower temperature for more deterministic output
            // max_tokens: 4000, // Consider adjusting based on input length + expected expansion
        });

        const adaptedText = completion.choices[0]?.message?.content?.trim();

        if (adaptedText) {
            logger.info("Received adapted text from OpenAI.");
            logger.debug(`Adapted text (first 100 chars): ${adaptedText.substring(0, 100)}...`);
            // Basic check for paragraph preservation (counts newline pairs)
            const originalParagraphs = (text.match(/\n\n/g) || []).length;
            const adaptedParagraphs = (adaptedText.match(/\n\n/g) || []).length;
            if (originalParagraphs !== adaptedParagraphs) {
                logger.warn(`Potential paragraph structure mismatch: Original had ${originalParagraphs} paragraph breaks, adapted has ${adaptedParagraphs}.`);
            }
            return adaptedText;
        } else {
            logger.error("OpenAI response did not contain expected content (choices[0].message.content was missing or empty).", { response: completion });
            return null; // Indicate failure
        }
    } catch (error) {
        logger.error(`An error occurred during OpenAI API call: ${error.message}`, { error });
        // Check for specific API key errors
        if (error.response && error.response.status === 401) {
            logger.error("OpenAI API key is invalid or expired. Please check the OPENAI_API_KEY environment variable.");
        }
        return null; // Indicate failure
    }
}

module.exports = { adaptToCEFR };

