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
 * @param {number} maxBytes Maximum bytes per chunk (default: 5000, Google TTS limit).
 * @returns {string[]} An array of text chunks.
 */
function chunkText(text, maxBytes = 5000) {
    logger.info(`chunkText received input with length: ${text ? text.length : 0}, bytes: ${text ? Buffer.byteLength(text, 'utf-8') : 0}`);
    console.log(`[CHUNKTEXT-DEBUG] text.length: ${text ? text.length : 0}, Buffer.byteLength: ${text ? Buffer.byteLength(text, 'utf-8') : 0}, maxBytes: ${maxBytes}`);
    if (!text) {
        logger.warn("chunkText received empty or null text, returning empty array.");
        return [];
    }

    // Önce paragrafları ayır
    const paragraphs = text.split("\n\n");
    logger.debug(`Split text into ${paragraphs.length} paragraphs.`);
    
    const chunks = [];
    let currentChunk = "";
    let currentBytes = 0;

    for (let paraIndex = 0; paraIndex < paragraphs.length; paraIndex++) {
        const paragraph = paragraphs[paraIndex].trim();
        if (!paragraph) continue;

        // Paragrafı cümlelere böl
        const sentences = paragraph.split(/(?<=[.!?])(?:\s+|$)/);
        logger.debug(`Processing paragraph ${paraIndex + 1} with ${sentences.length} potential sentences.`);

        for (const sentence of sentences) {
            const trimmedSentence = sentence.trim();
            if (!trimmedSentence) continue;

            const sentenceBytes = Buffer.byteLength(trimmedSentence, "utf-8");
            const separatorBytes = currentBytes > 0 ? Buffer.byteLength(" ", "utf-8") : 0;

            // Eğer cümle tek başına maxBytes'ı aşıyorsa, cümleyi daha küçük parçalara böl
            if (sentenceBytes > maxBytes) {
                logger.warn(`Single sentence exceeds maxBytes (${sentenceBytes}/${maxBytes}). Splitting sentence: "${trimmedSentence.substring(0, 50)}..."`);
                
                // Mevcut chunk'ı kaydet
                if (currentChunk) {
                    chunks.push(currentChunk);
                    currentChunk = "";
                    currentBytes = 0;
                }

                // Cümleyi kelimelere böl
                const words = trimmedSentence.split(/\s+/);
                let tempChunk = "";
                let tempBytes = 0;

                for (const word of words) {
                    const wordBytes = Buffer.byteLength(word, "utf-8");
                    const spaceBytes = tempBytes > 0 ? Buffer.byteLength(" ", "utf-8") : 0;

                    if (tempBytes + spaceBytes + wordBytes > maxBytes) {
                        if (tempChunk) {
                            chunks.push(tempChunk);
                            tempChunk = word;
                            tempBytes = wordBytes;
                        } else {
                            // Tek kelime bile maxBytes'ı aşıyorsa, kelimeyi karakterlere böl
                            let remainingWord = word;
                            while (Buffer.byteLength(remainingWord, "utf-8") > maxBytes) {
                                let splitIndex = 0;
                                let currentSegmentBytes = 0;
                                
                                for (let i = 0; i < remainingWord.length; i++) {
                                    const charBytes = Buffer.byteLength(remainingWord[i], "utf-8");
                                    if (currentSegmentBytes + charBytes > maxBytes) break;
                                    currentSegmentBytes += charBytes;
                                    splitIndex = i + 1;
                                }
                                
                                chunks.push(remainingWord.substring(0, splitIndex));
                                remainingWord = remainingWord.substring(splitIndex);
                            }
                            
                            if (remainingWord) {
                                tempChunk = remainingWord;
                                tempBytes = Buffer.byteLength(remainingWord, "utf-8");
                            }
                        }
                    } else {
                        if (tempChunk) {
                            tempChunk += " " + word;
                            tempBytes += spaceBytes + wordBytes;
                        } else {
                            tempChunk = word;
                            tempBytes = wordBytes;
                        }
                    }
                }

                if (tempChunk) {
                    currentChunk = tempChunk;
                    currentBytes = tempBytes;
                }
            } else if (currentBytes + separatorBytes + sentenceBytes > maxBytes) {
                // Mevcut chunk dolu, yeni chunk başlat
                chunks.push(currentChunk);
                currentChunk = trimmedSentence;
                currentBytes = sentenceBytes;
            } else {
                // Mevcut chunk'a ekle
                if (currentChunk) {
                    currentChunk += " " + trimmedSentence;
                    currentBytes += separatorBytes + sentenceBytes;
                } else {
                    currentChunk = trimmedSentence;
                    currentBytes = sentenceBytes;
                }
            }
        }

        // Paragraf sonunda, eğer sonraki paragraf varsa ve yer varsa paragraf boşluğunu ekle
        if (currentChunk && paraIndex < paragraphs.length - 1) {
            const breakBytes = Buffer.byteLength("\n\n", "utf-8");
            if (currentBytes + breakBytes <= maxBytes) {
                currentChunk += "\n\n";
                currentBytes += breakBytes;
            } else {
                chunks.push(currentChunk);
                currentChunk = "\n\n";
                currentBytes = breakBytes;
            }
        }
    }

    // Son chunk'ı ekle
    if (currentChunk) {
        chunks.push(currentChunk);
    }

    // Boş chunk'ları temizle ve trim yap
    const finalChunks = chunks.map(c => c.trim()).filter(c => c);
    logger.info(`Text processing resulted in ${finalChunks.length} final chunks.`);

    // Her chunk'ın byte uzunluğunu kontrol et
    finalChunks.forEach((chunk, index) => {
        const chunkBytes = Buffer.byteLength(chunk, "utf-8");
        if (chunkBytes > maxBytes) {
            logger.warn(`Chunk ${index + 1} exceeds maxBytes (${chunkBytes}/${maxBytes}). This should not happen!`);
        }
    });

    return finalChunks;
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

module.exports = {
    cleanText: cleanTextForTTS,
    chunkText,
    chunkTextByCharLimit // Polly için karakter bazlı bölme
};

