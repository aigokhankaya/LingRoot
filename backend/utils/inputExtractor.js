// backend/utils/inputExtractor.js
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
require("dotenv").config();
const logger = require("./logger");
const { translateFromEnglish } = require("./translateFromEnglish");
const { generateBilingualContent } = require("./translateAndAdapt");
const { Readability } = require("@mozilla/readability");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');
const { fetchYoutubeTranscript } = require('./youtubeTranscriptService');

// Initialize OpenAI client (similar to cefrAdapter, consider refactoring to a shared client)
let openai;
try {
    const apiKeyRaw = process.env.OPENAI_API_KEY || '';
    const apiKey = apiKeyRaw.trim().replace(/^['"]|['"]$/g, '');
    if (!apiKey) {
        logger.warn("OpenAI API key not found. Topic generation will not work.");
        openai = null;
    } else {
        if (process.env.NODE_ENV === 'development') {
            logger.info(`[ENV CHECK] OpenAI key suffix: ${apiKey.slice(-6)} (len=${apiKey.length})`);
        }
        openai = new OpenAI({ apiKey });
        logger.info("OpenAI client initialized for input extraction (topic generation).");
    }
} catch (error) {
    logger.error("Failed to initialize OpenAI client for input extraction:", error);
    openai = null;
}

/**
 * OpenAI ile metni İngilizce'ye çevirir.
 * @param {string} text
 * @param {string} level - CEFR level (A1-C2)
 * @returns {Promise<{text: string, detectedLang: string}>}
 */
async function translateToEnglishWithOpenAI(text, level = 'A1', requestLogger) {
    if (!openai) throw new Error("OpenAI client is not initialized.");
    const promptFile = 'translate_to_english.txt';
    const promptPath = path.join(__dirname, '../prompts/translate_to_english.txt');
    console.log(`🎯 [INPUT EXTRACTOR] Using prompt file: ${promptFile} for text translation at level ${level}`);
    logger.info(`🎯 Input Extractor - Selected prompt file: ${promptFile} for text translation at level ${level}`);
    const promptTemplate = fs.readFileSync(promptPath, 'utf-8');
    const { chunkText } = require('./textProcessor');
    const chunks = chunkText(text);
    let translatedChunks = [];
    // Allow overriding model via env in development
    const model = process.env.OPENAI_MODEL || "gpt-4o";
    // precise per-chunk usage aggregation instead of first-chunk * N approximation
    let promptTokensTotal = 0;
    let completionTokensTotal = 0;
    let totalTokensTotal = 0;
    for (let i = 0; i < chunks.length; i++) {
        const prompt = promptTemplate
            .replace(/\{\{input_text\}\}/g, chunks[i])
            .replace(/\{\{level\}\}/g, level);
        if (requestLogger) {
            requestLogger.log(`[prompt:translateToEnglishWithOpenAI:chunk:${i}][input]` + JSON.stringify({ promptName: promptFile, promptText: prompt }, null, 2));
        }
        logger.info({ promptName: promptFile, promptText: prompt }, 'translateToEnglishWithOpenAI: Kullanılan prompt');
        const completion = await openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: "You are a translation assistant specializing in educational content." },
                { role: "user", content: prompt }
            ],
            temperature: 0.3,
        });
        let translated = completion.choices[0]?.message?.content?.trim();
        // Remove any leading/trailing --- markers that OpenAI might add
        translated = translated.replace(/^-+\s*/g, '').replace(/\s*-+$/g, '');
        translatedChunks.push(translated);
        if (completion.usage) {
            promptTokensTotal += completion.usage.prompt_tokens || 0;
            completionTokensTotal += completion.usage.completion_tokens || 0;
            totalTokensTotal += completion.usage.total_tokens || 0;
        }
    }
    const textJoined = translatedChunks.join('\n\n');
    const usage = {
        prompt_tokens: promptTokensTotal,
        completion_tokens: completionTokensTotal,
        total_tokens: totalTokensTotal,
    };
    if (requestLogger) {
        requestLogger.log(`[openai:usage:translate]` + JSON.stringify({ usage, model }));
    }
    return { text: textJoined, usage, model };
}

/**
 * Fetches and extracts article content from a web link.
 * @param {string} url The URL of the web page.
 * @returns {Promise<string|null>} The extracted article text or null on error.
 */
async function extractFromWebLinkInternal(url, depth = 0) {
    try {
        if (depth > 2) {
            logger.warn(`extractFromWebLinkInternal max depth reached for URL: ${url}`);
            return null;
        }

        logger.info(`Fetching content from URL: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            logger.error(`Failed to fetch URL ${url}. Status: ${response.status}`);
            return null;
        }

        const finalUrl = response.url || url;
        const html = await response.text();
        const doc = new JSDOM(html, { url: finalUrl });
        const reader = new Readability(doc.window.document);
        const article = reader.parse();

        let text = '';
        if (article && article.textContent) {
            text = article.textContent;
        } else {
            logger.warn(`Readability could not extract main content from ${finalUrl}. Falling back to body text.`);
            const bodyText = doc.window.document.body && doc.window.document.body.textContent;
            text = bodyText || '';
        }

        let trimmed = (text || '').trim();
        if (trimmed.length >= 200) {
            logger.info(`Successfully extracted article text from ${finalUrl} (len=${trimmed.length})`);
            return trimmed;
        }

        let hostname = '';
        try {
            hostname = new URL(finalUrl).hostname.toLowerCase();
        } catch {
            hostname = '';
        }

        if (hostname.includes('news.google.com')) {
            const metaRefresh = doc.window.document.querySelector('meta[http-equiv="refresh"]');
            if (metaRefresh) {
                const content = metaRefresh.getAttribute('content') || '';
                const match = content.match(/url=(.+)$/i);
                if (match && match[1]) {
                    let redirectUrl = match[1].trim();
                    if (redirectUrl.startsWith('/')) {
                        redirectUrl = new URL(redirectUrl, finalUrl).href;
                    }
                    logger.info(`extractFromWebLinkInternal following Google News meta redirect to ${redirectUrl}`);
                    return extractFromWebLinkInternal(redirectUrl, depth + 1);
                }
            }

            const anchor = doc.window.document.querySelector('a[href^="http"]');
            if (anchor) {
                let href = anchor.getAttribute('href') || '';
                if (href && !href.includes('news.google.com')) {
                    if (href.startsWith('/')) {
                        href = new URL(href, finalUrl).href;
                    }
                    logger.info(`extractFromWebLinkInternal following Google News anchor redirect to ${href}`);
                    return extractFromWebLinkInternal(href, depth + 1);
                }
            }
        }

        if (trimmed.length > 0) {
            return trimmed;
        }

        return null;
    } catch (error) {
        logger.error(`Error processing web link ${url}: ${error.message}`);
        return null;
    }
}

async function extractFromWebLink(url) {
    return extractFromWebLinkInternal(url, 0);
}

/**
 * OPTIMIZED: Konu başlığından TEK LLM çağrısı ile ikili içerik üretir.
 * Eski yöntem (2 çağrı) yerine generateBilingualContent kullanır.
 * Token tasarrufu: ~33%
 * 
 * @returns {{englishText: string, translatedText: string}} - İngilizce içerik (TTS için) ve çevrilmiş içerik (kayıt için)
 */
async function generateNarrationForTopic(topic, level = 'A1', inputLanguage = 'Turkish', requestLogger) {
    if (!openai) {
        logger.error("OpenAI API key not found. Cannot generate narration for topic.");
        return null;
    }
    
    logger.info(`[OPTIMIZED] Generating bilingual narration for topic: ${topic} at level ${level}`);
    console.log(`🎯 [OPTIMIZED TOPIC GENERATION] Single LLM call for: "${topic}" (Level: ${level}, Lang: ${inputLanguage})`);
    
    try {
        // OPTIMIZED: Single LLM call for both English and translated content
        const result = await generateBilingualContent(topic, inputLanguage, level, requestLogger);
        
        if (!result || !result.englishText) {
            logger.error("[OPTIMIZED] Bilingual generation failed.");
            return null;
        }
        
        logger.info(`[OPTIMIZED] Generated ${result.englishText.length} chars EN + ${result.translatedText.length} chars ${inputLanguage}`);
        console.log(`✅ [OPTIMIZED COMPLETE] EN: ${result.englishText.length} chars, ${inputLanguage}: ${result.translatedText.length} chars`);
        console.log(`💰 [TOKEN SAVINGS] Used ${result.usage?.total_tokens || 'unknown'} tokens in single call`);
        
        return {
            englishText: result.englishText,
            translatedText: result.translatedText,
            usage: result.usage,
            model: result.model
        };
    } catch (error) {
        logger.error(`[OPTIMIZED] Error in bilingual generation: ${error.message}`);
        return null;
    }
}

/**
 * Girdi tipine göre metin çıkarır ve işler.
 * Topic tipi için: content_generation_*.txt promptu ile seviyeye uygun içerik üretir.
 * Text tipi için: Doğrudan metni döndürür.
 * File, weblink ve chapter tipleri için ilgili extraction fonksiyonlarını çağırır.
 */
async function extractTextFromInput(inputData, inputType, file, chapter, level = "A1", detectedLanguage = "en", requestLogger) {
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
                // content_generation prompt'u ile seviyeye uygun detaylı anlatım üret
                const inputLanguage = detectedLanguage === 'tr' || detectedLanguage === 'tr-TR' ? 'Turkish' : 'English';
                const narration = await generateNarrationForTopic(inputData, level, inputLanguage, requestLogger);
                if (!narration || !narration.englishText) {
                    logger.error("OpenAI could not generate narration from topic. User should provide a more descriptive topic.");
                    return null;
                }
                // Return object with both English (for TTS) and translated text (for display/storage)
                return narration;
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
    const promptFile = 'rewrite_transcript_clean.txt';
    const promptPath = path.join(__dirname, "../prompts/rewrite_transcript_clean.txt");
    console.log(`🎯 [INPUT EXTRACTOR] Using prompt file: ${promptFile} for transcript cleaning`);
    logger.info(`🎯 Input Extractor - Selected prompt file: ${promptFile} for transcript cleaning`);
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
    const promptFile = 'translate_to_english.txt';
    const promptPath = path.join(__dirname, "../prompts/translate_to_english.txt");
    console.log(`🎯 [INPUT EXTRACTOR] Using prompt file: ${promptFile} for text translation to English`);
    logger.info(`🎯 Input Extractor - Selected prompt file: ${promptFile} for text translation to English`);
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

async function rewriteTranscriptClean(text, requestLogger) {
    if (!openai) throw new Error("OpenAI client is not initialized.");
    const promptFile = 'rewrite_transcript_clean.txt';
    const promptPath = path.join(__dirname, '../prompts/rewrite_transcript_clean.txt');
    console.log(`🎯 [INPUT EXTRACTOR] Using prompt file: ${promptFile} for transcript cleaning`);
    logger.info(`🎯 Input Extractor - Selected prompt file: ${promptFile} for transcript cleaning`);
    const promptTemplate = fs.readFileSync(promptPath, 'utf-8');
    const prompt = promptTemplate.replace(/\{\{input_text\}\}/g, text);
    if (requestLogger) {
        requestLogger.log(`[prompt:rewriteTranscriptClean]\n${JSON.stringify({ promptName: promptFile, promptText: prompt }, null, 2)}`);
    }
    logger.info({ promptName: promptFile, promptText: prompt }, 'rewriteTranscriptClean: Kullanılan prompt');
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "You are a transcript cleaning assistant." },
            { role: "user", content: prompt }
        ],
        temperature: 0.2,
    });
    const cleaned = completion.choices[0]?.message?.content?.trim();
    if (!cleaned) {
        logger.error('rewriteTranscriptClean: OpenAI response did not contain cleaned transcript.');
        return null;
    }
    logger.info('rewriteTranscriptClean: Successfully cleaned transcript.');
    return cleaned;
}

module.exports = {
    extractTextFromInput,
    generateNarrationForTopic,
    translateToEnglishWithOpenAI,
    extractFromWebLink,
    rewriteTranscriptClean,
};
