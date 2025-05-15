// backend/utils/inputExtractor.js
const fs = require("fs");
const path = require("path");
const logger = require("./logger");
const { JSDOM } = require("jsdom");
const { Readability } = require("@mozilla/readability");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const OpenAI = require("openai"); // Added for topic generation
const fetch = require('node-fetch');
const { fetchYoutubeTranscript } = require('./youtubeTranscriptService');
require("dotenv").config();

// Initialize OpenAI client (similar to cefrAdapter, consider refactoring to a shared client)
let openai;
try {
    if (!process.env.OPENAI_API_KEY) {
        logger.warn("OpenAI API key not found. Topic generation will not work.");
        openai = null;
    } else {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        logger.info("OpenAI client initialized for input extraction (topic generation).");
    }
} catch (error) {
    logger.error("Failed to initialize OpenAI client for input extraction:", error);
    openai = null;
}

/**
 * OpenAI ile metni İngilizce'ye çevirir.
 * @param {string} text
 * @returns {Promise<{text: string, detectedLang: string}>}
 */
async function translateToEnglishWithOpenAI(text) {
    if (!openai) throw new Error("OpenAI client is not initialized.");
    const prompt = `Detect the language of the following text. If it is not English, translate it to English. Return only the English translation. Text:\n\n${text}`;
    logger.info({ prompt }, 'translateToEnglishWithOpenAI: Kullanılan prompt');
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "You are a translation assistant." },
            { role: "user", content: prompt }
        ],
        temperature: 0.2,
    });
    let translated = completion.choices[0]?.message?.content?.trim() || text;
    // If OpenAI returns a generic message, use the original text
    if (/^the text is already in english\.?$/i.test(translated)) {
        translated = text;
    }
    return { text: translated, detectedLang: "auto" };
}

/**
 * Fetches and extracts article content from a web link.
 * @param {string} url The URL of the web page.
 * @returns {Promise<string|null>} The extracted article text or null on error.
 */
async function extractFromWebLink(url) {
    try {
        logger.info(`Fetching content from URL: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            logger.error(`Failed to fetch URL ${url}. Status: ${response.status}`);
            return null;
        }
        const html = await response.text();
        const doc = new JSDOM(html, { url });
        const reader = new Readability(doc.window.document);
        const article = reader.parse();

        if (article && article.textContent) {
            logger.info(`Successfully extracted article from ${url}`);
            return article.textContent; // Return plain text content
        } else {
            logger.warn(`Readability could not extract main content from ${url}. Falling back to body text.`);
            // Fallback: attempt to get text from body, might be less clean
            const bodyText = doc.window.document.body.textContent;
            return bodyText || null;
        }
    } catch (error) {
        logger.error(`Error processing web link ${url}: ${error.message}`);
        return null;
    }
}

/**
 * Generates a ~15-minute, CEFR-levelled English narration for a given topic using OpenAI and a custom prompt.
 * @param {string} topic The topic to generate content for.
 * @param {string} level The CEFR level (A1, A2, B1, ...)
 * @returns {Promise<string|null>} The generated English narration or null on error.
 */
async function generateEnglishNarrationForTopic(topic, level) {
    if (!openai) {
        logger.error("OpenAI API key not found. Cannot generate narration for topic.");
        return null;
    }
    logger.info(`Generating narration for topic: ${topic} at level: ${level}`);
    // Başlığı önce İngilizceye çevir
    let topicEn = topic;
    try {
        const translationResult = await translateToEnglishWithOpenAI(topic);
        topicEn = translationResult.text;
        logger.info(`Translated topic to English: ${topicEn}`);
    } catch (err) {
        logger.warn(`Failed to translate topic to English, using original: ${err.message}`);
    }
    // Yeni prompt dosyasını kullan
    const promptPath = path.join(__dirname, "../prompts/rewrite_to_narration.txt");
    let promptTemplate = fs.readFileSync(promptPath, "utf-8");
    const prompt = promptTemplate
        .replace(/\{\{konu\}\}/g, topicEn)
        .replace(/\{\{level\}\}/g, level);

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a professional narration generator for language learners." },
                { role: "user", content: prompt },
            ],
            temperature: 0.6,
        });
        const generatedText = completion.choices[0]?.message?.content?.trim();
        if (generatedText) {
            logger.info(`Successfully generated narration for topic: ${topicEn}`);
            return generatedText;
        } else {
            logger.error(`OpenAI response did not contain content for narration topic: ${topicEn}`);
            return null;
        }
    } catch (error) {
        logger.error(`Error generating narration for topic ${topicEn} via OpenAI: ${error.message}`);
        return null;
    }
}

/**
 * Rewrites any input text (any language) into a professional English narration using OpenAI and the rewrite_to_narration.txt prompt.
 * @param {string} inputText The input text (any language)
 * @param {string} level Optional CEFR level for topic type.
 * @returns {Promise<string|null>} The English narration or null on error.
 */
async function rewriteToEnglishNarration(inputText, level = "A1") {
    if (!openai) {
        logger.error("OpenAI API key not found. Cannot rewrite narration.");
        return null;
    }
    logger.info(`Rewriting input text to English narration at level: ${level}...`);
    const promptPath = path.join(__dirname, "../prompts/rewrite_to_narration.txt");
    let promptTemplate = fs.readFileSync(promptPath, "utf-8");
    const prompt = promptTemplate
        .replace(/\{\{input_text\}\}/g, inputText)
        .replace(/\{\{level\}\}/g, level);
    logger.info({ prompt }, 'rewriteToEnglishNarration: Kullanılan prompt');
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a professional content writer for English narration." },
                { role: "user", content: prompt },
            ],
            temperature: 0.6,
        });
        const narration = completion.choices[0]?.message?.content?.trim();
        if (narration) {
            logger.info(`Successfully rewrote input to English narration.`);
            return narration;
        } else {
            logger.error(`OpenAI response did not contain narration content.`);
            return null;
        }
    } catch (error) {
        logger.error(`Error rewriting narration: ${error.message}`);
        return null;
    }
}

/**
 * Extracts text content based on the input type.
 * Supports text, topic, weblink, file (pdf, docx, txt, md, html).
 * Placeholders for youtube, spotify, book.
 * @param {string | undefined} inputData Text, URL, or topic input.
 * @param {string} inputType Type of input (
 * 'text', 'topic', 'youtube', 'weblink', 'file', 'book', 'spotify'
 * ).
 * @param {Express.Multer.File | undefined} file Uploaded file object (from multer).
 * @param {string | undefined} chapter Optional chapter info for book type.
 * @param {string} [level] Optional CEFR level for topic type.
 * @param {string} [detectedLanguage] Optional detected language for topic type.
 * @returns {Promise<string|null>} The extracted text or null on error/not implemented.
 */
async function extractTextFromInput(inputData, inputType, file, chapter, level = "A1", detectedLanguage = "en") {
    logger.info(`Extracting text for input type: ${inputType}`);

    switch (inputType) {
        case "text":
            if (typeof inputData === "string") {
                logger.info("Received plain text input. Passing directly to cleaning step.");
                return inputData;
            } else {
                logger.error("Input data is not a string for type 'text'.");
                return null;
            }

        case "topic":
            if (typeof inputData === "string") {
                return await generateEnglishNarrationForTopic(inputData, level, detectedLanguage);
            } else {
                logger.error("Input data (topic) is not a string.");
                return null;
            }

        case "weblink":
            if (typeof inputData === "string") {
                return await extractFromWebLink(inputData);
            } else {
                logger.error("Input data (URL) is not a string for type 'weblink'.");
                return null;
            }

        case "file":
            if (!file || !file.buffer) {
                logger.error("No file buffer provided for type 'file'.");
                return null;
            }
            logger.info(`Processing file: ${file.originalname} (${file.mimetype}), size: ${file.size}`);
            try {
                if (file.mimetype === "application/pdf") {
                    const data = await pdf(file.buffer);
                    logger.info(`Extracted text from PDF: ${file.originalname}`);
                    return data.text;
                } else if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                    const { value } = await mammoth.extractRawText({ buffer: file.buffer });
                    logger.info(`Extracted text from DOCX: ${file.originalname}`);
                    return value;
                } else if (file.mimetype === "text/plain" || file.mimetype === "text/markdown" || file.mimetype === "text/html") {
                    // For plain text, markdown, html - read buffer directly
                    const textContent = file.buffer.toString("utf-8");
                    logger.info(`Extracted text from ${file.mimetype}: ${file.originalname}`);
                    return textContent;
                } else {
                    logger.warn(`Unsupported file type for extraction: ${file.mimetype}`);
                    return null; // Indicate unsupported file type
                }
            } catch (error) {
                logger.error(`Failed to parse file ${file.originalname}: ${error.message}`);
                return null;
            }

        case "book":
            // Placeholder: Needs actual book content source (API, database, etc.)
            logger.warn(`Book processing ('${inputData}', chapter '${chapter}') is not fully implemented. Returning placeholder text.`);
            // For now, just return the input as text for testing the flow
            return `Content for book "${inputData}", chapter "${chapter}" would be processed here. This is placeholder text.`;

        case "youtube":
            if (typeof inputData === "string") {
                logger.info("Fetching YouTube transcript using local Playwright FastAPI service...");
                return await fetchYoutubeTranscript(inputData);
            } else {
                logger.error("Input data (YouTube URL) is not a string for type 'youtube'.");
                return null;
            }

        case "spotify":
            logger.warn(`Spotify link processing (${inputData}) is not yet implemented.`);
            return null; // Indicate not implemented

        default:
            logger.error(`Unsupported input type: ${inputType}`);
            return null;
    }
}

// Transcript temizleme fonksiyonu (örnek)
async function cleanTranscriptWithPrompt(rawTranscript) {
    if (!openai) {
        logger.error("OpenAI API key not found. Cannot clean transcript.");
        return null;
    }
    logger.info(`Cleaning transcript with prompt...`);
    const promptPath = path.join(__dirname, "../prompts/rewrite_transcript_clean.txt");
    let promptTemplate = fs.readFileSync(promptPath, "utf-8");
    const prompt = promptTemplate.replace(/\{\{transkript\}\}/g, rawTranscript);
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a transcript cleaner for TTS systems." },
                { role: "user", content: prompt },
            ],
            temperature: 0.2,
        });
        const cleaned = completion.choices[0]?.message?.content?.trim();
        if (cleaned) {
            logger.info(`Successfully cleaned transcript.`);
            return cleaned;
        } else {
            logger.error(`OpenAI response did not contain cleaned transcript.`);
            return null;
        }
    } catch (error) {
        logger.error(`Error cleaning transcript: ${error.message}`);
        return null;
    }
}

// İngilizceye çeviri fonksiyonu (örnek)
async function translateToEnglishWithPrompt(text) {
    if (!openai) throw new Error("OpenAI client is not initialized.");
    const promptPath = path.join(__dirname, "../prompts/translate_to_english.txt");
    let promptTemplate = fs.readFileSync(promptPath, "utf-8");
    const prompt = promptTemplate.replace(/\{\{metin\}\}/g, text);
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "You are a translation assistant." },
            { role: "user", content: prompt }
        ],
        temperature: 0.2,
    });
    const translated = completion.choices[0]?.message?.content?.trim() || text;
    return { text: translated, detectedLang: "auto" };
}

module.exports = {
    extractTextFromInput,
    generateEnglishNarrationForTopic,
    translateToEnglishWithOpenAI,
};

