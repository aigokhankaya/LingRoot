// backend/utils/textProcessor.js
const { decode } = require("html-entities");
const logger = require("./logger"); // Import Winston logger

// Regex to match most emojis (improved version)
// Source: https://github.com/mathiasbynens/emoji-regex
const emojiRegex = require("emoji-regex")();

/**
 * Cleans the input text for TTS compatibility by removing HTML tags, emojis,
 * unwanted characters, extra spaces, decoding HTML entities, and normalizing whitespace
 * while strictly preserving paragraph breaks (double newlines).
 * @param {string} text The input text.
 * @returns {string} The cleaned text.
 */
function cleanTextForTTS(text) {
    if (typeof text !== "string") {
        logger.warn("cleanTextForTTS received non-string input, returning empty string.");
        return ""; // Return empty string if input is not a string
    }
    logger.debug("Starting TTS cleaning...");

    // 1. Remove HTML tags - Replace with space to avoid merging words
    let cleaned = text.replace(/<[^>]*>/g, " ");
    logger.debug("After HTML tag removal (first 100): " + cleaned.substring(0, 100));

    // 2. Decode HTML entities (like &amp;, &lt;, etc.)
    cleaned = decode(cleaned);
    logger.debug("After HTML entity decoding (first 100): " + cleaned.substring(0, 100));

    // 3. Remove Emojis
    cleaned = cleaned.replace(emojiRegex, ""); // Remove emojis using the imported regex
    logger.debug("After emoji removal (first 100): " + cleaned.substring(0, 100));

    // 4. Remove specific unwanted characters and patterns problematic for TTS
    // Keep common punctuation like .,!?- but remove others
    cleaned = cleaned.replace(/[\\*#;~^`<>{}|\[\]_="\(\)]/g, ""); // Remove various symbols, keep basic punctuation
    cleaned = cleaned.replace(/\s+([,.!?:;])/g, ",1"); // Remove space before punctuation
    logger.debug("After unwanted character removal (first 100): " + cleaned.substring(0, 100));

    // 5. Normalize all types of line breaks to single newline characters
    cleaned = cleaned.replace(/\r\n|\r/g, "\n");
    logger.debug("After line break normalization (first 100): " + cleaned.substring(0, 100));

    // 6. Preserve paragraph breaks: Replace multiple consecutive newlines with a unique marker
    const paragraphMarker = "__PARAGRAPH_BREAK__";
    cleaned = cleaned.replace(/\n{2,}/g, paragraphMarker);
    logger.debug("After marking paragraph breaks (first 100): " + cleaned.substring(0, 100));

    // 7. Remove remaining single newlines (within paragraphs)
    cleaned = cleaned.replace(/\n/g, " ");
    logger.debug("After removing single newlines (first 100): " + cleaned.substring(0, 100));

    // 8. Restore paragraph breaks
    cleaned = cleaned.replace(new RegExp(paragraphMarker, "g"), "\n\n");
    logger.debug("After restoring paragraph breaks (first 100): " + cleaned.substring(0, 100));

    // 9. Normalize spaces: Replace multiple spaces with a single space
    cleaned = cleaned.replace(/ {2,}/g, " ");
    logger.debug("After space normalization (first 100): " + cleaned.substring(0, 100));

    // 10. Trim leading/trailing whitespace from the whole text
    cleaned = cleaned.trim();
    logger.debug("After final trim (first 100): " + cleaned.substring(0, 100));

    logger.info("Text cleaning for TTS completed (preserving paragraphs).");
    return cleaned;
}


/**
 * Splits text into chunks based on a maximum byte limit (UTF-8), trying to preserve sentences
 * and respecting paragraph breaks (double newlines).
 * @param {string} text The text to chunk.
 * @param {number} maxBytes Maximum bytes per chunk (default: 4500, Google TTS limit).
 * @returns {string[]} An array of text chunks.
 */
function chunkText(text, maxBytes = 3000) {
    logger.info(`chunkText received input with length: ${text?.length}, bytes: ${Buffer.byteLength(text || "", "utf-8")}`);
    if (!text) return [];

    const paragraphs = text.split("\n\n");
    const chunks = [];
    let currentChunk = "";
    let currentBytes = 0;

    for (const paragraph of paragraphs) {
        const sentences = paragraph.trim().split(/(?<=[.!?])(?:\s+|$)/);

        for (const sentence of sentences) {
            const trimmed = sentence.trim();
            if (!trimmed) continue;

            const sentenceBytes = Buffer.byteLength(trimmed, "utf-8");
            const spaceBytes = currentBytes > 0 ? 1 : 0;

            if (sentenceBytes > maxBytes) {
                const words = trimmed.split(/\s+/);
                let temp = "";
                let tempBytes = 0;

                for (const word of words) {
                    const wordBytes = Buffer.byteLength(word, "utf-8");
                    const s = temp ? 1 : 0;

                    if (tempBytes + wordBytes + s > maxBytes) {
                        chunks.push(temp);
                        temp = word;
                        tempBytes = wordBytes;
                    } else {
                        temp += (temp ? " " : "") + word;
                        tempBytes += wordBytes + s;
                    }
                }

                if (temp) {
                    chunks.push(temp);
                }

            } else if (currentBytes + sentenceBytes + spaceBytes > maxBytes) {
                chunks.push(currentChunk);
                currentChunk = trimmed;
                currentBytes = sentenceBytes;
            } else {
                currentChunk += (currentChunk ? " " : "") + trimmed;
                currentBytes += sentenceBytes + spaceBytes;
            }
        }
    }

    if (currentChunk) chunks.push(currentChunk);

    const safeChunks = [];
    for (const [i, chunk] of chunks.entries()) {
        const byteLength = Buffer.byteLength(chunk, "utf-8");
        if (byteLength > 4500) {
            logger.warn(`⚠️ Chunk ${i + 1} exceeds 4500 bytes (${byteLength}). Re-splitting...`);
            const subChunks = preChunkTextByByteLimit(chunk, 3000); // daha küçük parçala
            subChunks.forEach((sub, j) => {
                const subBytes = Buffer.byteLength(sub, "utf-8");
                if (subBytes > 4500) {
                    logger.error(`🧨 Subchunk [${i + 1}.${j + 1}] STILL exceeds 4500 bytes: ${subBytes} → truncating.`);
                    safeChunks.push(sub.slice(0, 3000)); // son çare olarak kırp
                } else {
                    safeChunks.push(sub);
                }
            });
        } else {
            safeChunks.push(chunk);
        }
    }

    logger.info(`✅ Final total safe chunks: ${safeChunks.length}`);
    return safeChunks;
}

/**
 * Splits long text into chunks based on character length,
 * for use with Amazon Polly (max 3000 characters, safe limit: 1300).
 * It preserves sentence boundaries and avoids mid-word breaks when possible.
 * @param {string} text - The input text to split.
 * @param {number} maxChars - Max character length per chunk (default 1000).
 * @returns {string[]} - An array of safe-length text chunks.
 */
function chunkTextByCharLimit(text, maxChars = 1000) {
    if (!text || typeof text !== "string") return [];
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        let end = start + maxChars;
        if (end < text.length) {
            const sentenceEnd = Math.max(
                text.lastIndexOf(".", end),
                text.lastIndexOf("!", end),
                text.lastIndexOf("?", end)
            );
            if (sentenceEnd > start && sentenceEnd - start <= maxChars) {
                end = sentenceEnd + 1;
            } else {
                const comma = text.lastIndexOf(",", end);
                const space = text.lastIndexOf(" ", end);
                if (comma > start && comma - start <= maxChars) {
                    end = comma + 1;
                } else if (space > start && space - start <= maxChars) {
                    end = space + 1;
                }
            }
        }
        let chunk = text.substring(start, end).trim();
        while (chunk.length > maxChars) {
            let splitAt = Math.max(
                chunk.lastIndexOf(".", maxChars),
                chunk.lastIndexOf("!", maxChars),
                chunk.lastIndexOf("?", maxChars)
            );
            if (splitAt > 0) {
                chunks.push(chunk.substring(0, splitAt + 1).trim());
                chunk = chunk.substring(splitAt + 1).trim();
            } else {
                splitAt = chunk.lastIndexOf(",", maxChars);
                if (splitAt > 0) {
                    chunks.push(chunk.substring(0, splitAt + 1).trim());
                    chunk = chunk.substring(splitAt + 1).trim();
                } else {
                    splitAt = chunk.lastIndexOf(" ", maxChars);
                    if (splitAt > 0) {
                        chunks.push(chunk.substring(0, splitAt + 1).trim());
                        chunk = chunk.substring(splitAt + 1).trim();
                    } else {
                        chunks.push(chunk.substring(0, maxChars).trim());
                        chunk = chunk.substring(maxChars).trim();
                    }
                }
            }
        }
        if (chunk.length > 0) {
            chunks.push(chunk);
        }
        start = end;
    }
    return chunks.filter(c => c.length > 0 && c.length <= maxChars);
}

/**
 * Roughly splits text into byte-limited parts (before sentence-level chunking).
 * Ensures each part is under a given byte limit (default 4500 for Google TTS).
 */
function preChunkTextByByteLimit(text, byteLimit = 4500) {
    const parts = [];
    let current = "";
    let currentBytes = 0;

    const words = text.split(/\s+/);
    for (const word of words) {
        const wordBytes = Buffer.byteLength(word, "utf-8");
        const spaceBytes = current ? 1 : 0;

        if (currentBytes + wordBytes + spaceBytes > byteLimit) {
            parts.push(current.trim());
            current = word;
            currentBytes = wordBytes;
        } else {
            current += (current ? " " : "") + word;
            currentBytes += wordBytes + spaceBytes;
        }
    }

    if (current) {
        parts.push(current.trim());
    }

    return parts;
}

module.exports = {
    cleanText: cleanTextForTTS,
    chunkText,
    chunkTextByCharLimit,
    preChunkTextByByteLimit
};

